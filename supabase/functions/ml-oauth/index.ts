/**
 * supabase/functions/ml-oauth/index.ts
 * Self-contained — sin imports locales ni externos problemáticos.
 * Lee y escribe directamente en api_vault via Supabase client.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ML_API = 'https://api.mercadolibre.com'
const MP_API = 'https://api.mercadopago.com'
const TABLE  = 'api_vault'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function bodyField(req: Request, field: string): Promise<string | null> {
  try { const b = await req.clone().json(); return b?.[field] ?? null }
  catch { return null }
}

function getSecrets(platform: string, siteId: string) {
  const key    = `ML_SECRETS_${platform.toUpperCase().replace(/\s/g, '')}_${siteId}`
  const envVal = Deno.env.get(key)
  if (!envVal) throw new Error(`Env var ${key} no configurada en Supabase Secrets`)
  const [appId, clientSecret] = envVal.split(':')
  if (!appId || !clientSecret) throw new Error(`Formato inválido en ${key}: debe ser "appId:clientSecret"`)
  return { appId, clientSecret }
}

async function vaultResolve(supabase: any, platform: string, siteId: string, storeId: string | null, appId: string) {
  if (storeId) {
    const { data } = await supabase.from(TABLE).select('*')
      .eq('platform', platform).eq('type', 'oauth')
      .eq('tenant_id', storeId).contains('tags', [appId, siteId])
      .maybeSingle()
    if (data) return data
  }
  const { data } = await supabase.from(TABLE).select('*')
    .eq('platform', platform).eq('type', 'oauth')
    .is('tenant_id', null).contains('tags', [appId, siteId])
    .maybeSingle()
  return data ?? null
}

async function vaultSave(
  supabase: any, platform: string, siteId: string,
  storeId: string | null, value: Record<string, unknown>,
  appId: string, nickname?: string
) {
  const tags      = [appId, siteId, ...(storeId ? [`store:${storeId}`] : [])]
  const name      = `${platform} ${siteId}${nickname ? ` · ${nickname}` : storeId ? ` · Tienda ${storeId}` : ' · Global'}`
  const expiresAt = new Date(value.expiresAt as number).toISOString()
  const existing  = await vaultResolve(supabase, platform, siteId, storeId, appId)

  if (existing) {
    const { data, error } = await supabase.from(TABLE)
      .update({ value: JSON.stringify(value), name, tags, expires_at: expiresAt })
      .eq('id', existing.id).select().single()
    if (error) throw error
    return data
  }

  // Para INSERT necesitamos un user_id válido — tomamos el primer usuario del sistema
  const { data: firstUser } = await supabase
    .from('profiles').select('id').limit(1).single()
    .catch(() => ({ data: null }))

  const userId = firstUser?.id ?? value.sellerId

  const { data, error } = await supabase.from(TABLE).insert({
    user_id: userId, tenant_id: storeId,
    name, platform, type: 'oauth',
    value: JSON.stringify(value),
    env: 'production', tags,
    expires_at: expiresAt,
  }).select().single()
  if (error) throw error
  return data
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

const url     = new URL(req.url)
const action  = url.searchParams.get('action') ?? (await _bodyField(req, 'action'))

// Aceptar token desde query param (para redirects del browser en action=connect)
const queryToken = url.searchParams.get('token')
if (queryToken) {
  req = new Request(req.url, {
    method:  req.method,
    headers: new Headers({ ...Object.fromEntries(req.headers), 'Authorization': `Bearer ${queryToken}` }),
    body:    req.body,
  })
}

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const appId    = Deno.env.get('APP_ID') ?? 'core-market'
  const adminUrl = Deno.env.get('ADMIN_PANEL_URL') ?? 'https://market.core.com.uy/admin'

  // action=connect no requiere auth — solo genera URL de redirección
  const requiresAuth = action !== 'connect'
  if (requiresAuth) {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return _json({ code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' }, 401)
    }
  }

  try {    switch (action) {

      case 'status': {
        const { data: entries, error } = await supabase.from(TABLE)
          .select('id, name, platform, tenant_id, tags, expires_at, value')
          .eq('type', 'oauth').contains('tags', [appId])

        if (error) throw error

        const now = Date.now()
        const credentials = (entries ?? []).map((e: any) => {
          let parsed: any = {}
          try { parsed = JSON.parse(e.value) } catch {}
          const exp = new Date(e.expires_at).getTime()
          return {
            id:           e.id,
            name:         e.name,
            platform:     e.platform,
            siteId:       (e.tags ?? []).find((t: string) => /^ML[A-Z]|^MC[A-Z]/.test(t)) ?? 'MLU',
            storeId:      e.tenant_id,
            isGlobal:     e.tenant_id === null,
            nickname:     parsed.nickname,
            sellerId:     parsed.sellerId,
            expiresAt:    e.expires_at,
            isExpired:    exp < now,
            expiringSoon: exp > now && exp - now < 5 * 60 * 1000,
          }
        })
        return json({ ok: true, credentials })
      }

      case 'connect': {
        const platform    = url.searchParams.get('platform') ?? 'MercadoLibre'
        const siteId      = url.searchParams.get('site_id')  ?? 'MLU'
        const storeId     = url.searchParams.get('store_id') ?? null
        const redirectUri = Deno.env.get('ML_OAUTH_REDIRECT_URI')!
        const { appId: mlAppId } = getSecrets(platform, siteId)
        const state   = btoa(JSON.stringify({ storeId, platform, siteId, appId }))
        const apiBase = platform === 'MercadoPago' ? MP_API : ML_API
        const authUrl = new URL(`${apiBase}/authorization`)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('client_id',     mlAppId)
        authUrl.searchParams.set('redirect_uri',  redirectUri)
        authUrl.searchParams.set('state',         state)
        return Response.redirect(authUrl.toString(), 302)
      }

      case 'callback': {
        const code     = url.searchParams.get('code')
        const rawState = url.searchParams.get('state')
        if (!code || !rawState) return Response.redirect(`${adminUrl}?ml_error=missing_params`, 302)
        let state: any
        try { state = JSON.parse(atob(rawState)) }
        catch { return Response.redirect(`${adminUrl}?ml_error=invalid_state`, 302) }
        const { storeId, platform, siteId } = state
        const redirectUri = Deno.env.get('ML_OAUTH_REDIRECT_URI')!
        const { appId: mlAppId, clientSecret } = getSecrets(platform, siteId)
        const apiBase = platform === 'MercadoPago' ? MP_API : ML_API
        const tokenRes = await fetch(`${apiBase}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: mlAppId, client_secret: clientSecret,
            code, redirect_uri: redirectUri,
          }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok) return Response.redirect(`${adminUrl}?ml_error=${encodeURIComponent(tokenData.message ?? 'token_error')}`, 302)
        let nickname = ''
        try {
          const uRes = await fetch(`${apiBase}/users/me`, { headers: { Authorization: `Bearer ${tokenData.access_token}` } })
          if (uRes.ok) { const u = await uRes.json(); nickname = u.nickname ?? '' }
        } catch {}
        const defaultExpiry = platform === 'MercadoPago' ? 15_552_000 : 21_600
        const expiresAt = Date.now() + (tokenData.expires_in ?? defaultExpiry) * 1000
        await vaultSave(supabase, platform, siteId, storeId, {
          accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token,
          expiresAt, appId: mlAppId, nickname, sellerId: tokenData.user_id,
          publicKey: tokenData.public_key,
        }, appId, nickname)
        const params = new URLSearchParams({ ml_connected: 'true', platform, site: siteId, seller: nickname, store: storeId ?? 'global' })
        return Response.redirect(`${adminUrl}?${params}`, 302)
      }

      case 'refresh': {
        const body     = await req.json().catch(() => ({}))
        const platform = body.platform ?? 'MercadoLibre'
        const siteId   = body.site_id  ?? 'MLU'
        const storeId  = body.store_id ?? null
        const entry    = await vaultResolve(supabase, platform, siteId, storeId, appId)
        if (!entry) return json({ error: `Sin credencial para ${platform}/${siteId}` }, 404)
        const value = JSON.parse(entry.value)
        const { appId: mlAppId, clientSecret } = getSecrets(platform, siteId)
        const apiBase = platform === 'MercadoPago' ? MP_API : ML_API
        const tokenRes = await fetch(`${apiBase}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: mlAppId, client_secret: clientSecret,
            refresh_token: value.refreshToken,
          }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok) return json({ error: tokenData.message }, 400)
        const expiresAt = Date.now() + (tokenData.expires_in ?? 21_600) * 1000
        await vaultSave(supabase, platform, siteId, storeId, {
          ...value, accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token ?? value.refreshToken, expiresAt,
        }, appId, value.nickname)
        return json({ ok: true, platform, siteId, storeId, expiresIn: tokenData.expires_in })
      }

      case 'disconnect': {
        const body     = await req.json().catch(() => ({}))
        const platform = body.platform ?? 'MercadoLibre'
        const siteId   = body.site_id  ?? 'MLU'
        const storeId  = body.store_id ?? null
        const entry    = await vaultResolve(supabase, platform, siteId, storeId, appId)
        if (entry) await supabase.from(TABLE).delete().eq('id', entry.id)
        return json({ ok: true, disconnected: { platform, siteId, storeId } })
      }

      default:
        return json({ error: `Acción desconocida: "${action}"` }, 400)
    }

  } catch (err: any) {
    console.error('[ml-oauth]', err.message)
    return json({ ok: false, error: err.message }, 500)
  }
})
