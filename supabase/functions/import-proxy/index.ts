// ─────────────────────────────────────────────────────────────────────────────
// import-proxy — trae el contenido de una URL desde el servidor (sin CORS).
// Guardarraíles: requiere usuario autenticado + bloqueo SSRF + allowlist opcional.
//
// Deploy:  supabase functions deploy import-proxy
// (opcional) supabase secrets set PROXY_ALLOWED_HOSTS="proveedor1.com,proveedor2.com"
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const TIMEOUT_MS = 15000;

// Bloquea hosts internos / privados (anti-SSRF).
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;

  // IPv6 loopback / link-local
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;

  // IPv4 en rangos privados / loopback / link-local / metadata
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 127) return true;                    // loopback
    if (a === 10) return true;                      // privada
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;        // link-local / metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // privada
    if (a === 192 && b === 168) return true;        // privada
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: usuario válido ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, error: "No autorizado" }, 401);
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, error: "No autorizado" }, 401);
    }

    // ── Validación de URL ──
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ ok: false, error: "Se requiere una URL." }, 400);
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return json({ ok: false, error: "URL inválida." }, 400);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return json({ ok: false, error: "Sólo se permiten URLs http/https." }, 400);
    }
    if (isBlockedHost(parsed.hostname)) {
      return json({ ok: false, error: "Host no permitido." }, 403);
    }

    // Allowlist opcional (si está seteada, sólo esos dominios pasan).
    const allow = (Deno.env.get("PROXY_ALLOWED_HOSTS") ?? "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (allow.length && !allow.some((d) => parsed.hostname.toLowerCase().endsWith(d))) {
      return json({ ok: false, error: `Dominio fuera de la allowlist (${parsed.hostname}).` }, 403);
    }

    // ── Fetch server-side con timeout ──
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": "CORE-Market-Import/1.0" },
      });
    } finally {
      clearTimeout(t);
    }

    if (!res.ok) {
      return json({ ok: false, error: `El servidor respondió ${res.status} ${res.statusText}.` }, 200);
    }

    // Límite de tamaño.
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return json({ ok: false, error: "El archivo excede el límite de 8 MB." }, 200);
    }
    const body = new TextDecoder().decode(buf);

    return json({
      ok: true,
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      length: body.length,
      body,
    }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return json({ ok: false, error: msg }, 200);
  }

  function json(obj: unknown, status: number) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
