/**
 * src/app/admin/pages/AdminML.tsx
 *
 * Módulo ML & MercadoPago — rediseñado con design tokens de CORE Market.
 * Incluye sección de integraciones MP con gestión de preferencias y pagos.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL     = `${SUPABASE_URL}/functions/v1`;

// ── Design Tokens (inline, consistentes con brand.css / theme.css) ────────────
const T = {
  // Brand
  primary:       "#1A4F9C",
  primaryDark:   "#0D2B55",
  primaryLight:  "rgba(26,79,156,.1)",
  accent:        "#C9A84C",
  accentDark:    "#A8893C",
  accentLight:   "rgba(201,168,76,.1)",
  // Semánticos
  success:       "#1D9E75",
  successBg:     "rgba(29,158,117,.1)",
  warning:       "#C9A84C",
  warningBg:     "rgba(201,168,76,.1)",
  danger:        "#C0392B",
  dangerBg:      "rgba(192,57,43,.1)",
  info:          "#2E6FC4",
  // Fondo / superficie
  bgMain:        "#F2F5FA",
  bgDark:        "#081C38",
  bgCard:        "#ffffff",
  // Texto
  textDark:      "#0D2B55",
  textBody:      "#4A4A4A",
  textMuted:     "#7A7A7A",
  textLight:     "#ffffff",
  // Bordes
  border:        "#C8D5E8",
  borderLight:   "#E8EDF5",
  // Radios
  radiusSm:      "4px",
  radiusMd:      "8px",
  radiusLg:      "12px",
  radiusPill:    "999px",
  // Sombras
  shadowCard:    "0 2px 8px rgba(13,43,85,.08)",
  shadowMd:      "0 2px 8px rgba(13,43,85,.09)",
  shadowLg:      "0 8px 24px rgba(13,43,85,.14)",
  // Tipografía
  fontBase:      "Calibri, 'Segoe UI', system-ui, sans-serif",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Credential {
  id: string; name: string;
  platform: "MercadoLibre" | "MercadoPago";
  siteId: string; storeId: string | null; isGlobal: boolean;
  nickname?: string; sellerId?: string; expiresAt: string;
  isExpired: boolean; expiringSoon: boolean;
}

interface MLProduct {
  id: string; nombre: string; ml_item_id: string; ml_status: string;
  sync_status: string; stock: number; precio: number;
  ml_last_sync: string | null; ml_permalink?: string;
}

// ── Helpers API ───────────────────────────────────────────────────────────────

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`;
}

async function callOAuth(
  method: "GET" | "POST" | "DELETE",
  params: Record<string, string>,
  body?: object,
) {
  const url = new URL(`${FUNCTIONS_URL}/ml-oauth`);
  if (method === "GET") Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: await getAuthHeader(), "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify({ ...params, ...body }) : undefined,
  });
  return res.json();
}

async function callMlSync(body: Record<string, unknown>) {
  const res = await fetch(`${FUNCTIONS_URL}/ml-sync`, {
    method: "POST",
    headers: { Authorization: await getAuthHeader(), "Content-Type": "application/json" },
    body:   JSON.stringify(body),
  });
  return res.json();
}

// ── Componente principal ──────────────────────────────────────────────────────

type TabId = "ml-publicados" | "ml-cola" | "ml-errores" | "mp-pagos";

export default function AdminML() {
  const [tab,           setTab]           = useState<TabId>("ml-publicados");
  const [products,      setProducts]      = useState<MLProduct[]>([]);
  const [errors,        setErrors]        = useState<any[]>([]);
  const [queue,         setQueue]         = useState<any[]>([]);
  const [creds,         setCreds]         = useState<Credential[]>([]);
  const [mpPayments,    setMpPayments]    = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [credsLoading,  setCredsLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving,        setSaving]        = useState<string | null>(null);
  const [msg,           setMsg]           = useState<{ text: string; type: "ok" | "err" | "warn" } | null>(null);

  const notify = (text: string, type: "ok" | "err" | "warn" = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Cargar datos ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const [p, e, q, pay] = await Promise.all([
      supabase.from("admin_products").select("*")
        .not("ml_item_id", "is", null)
        .order("ml_last_sync", { ascending: false }),
      supabase.from("admin_ml_errors").select("*"),
      supabase.from("ml_sync_queue").select("*")
        .in("status", ["pending", "error"])
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("orders")
        .select("id, total, currency, payment_status, source, created_at, ml_order_id")
        .eq("source", "mercadopago")
        .order("created_at", { ascending: false }).limit(20),
    ]);
    setProducts(p.data || []);
    setErrors(e.data || []);
    setQueue(q.data || []);
    setMpPayments(pay.data || []);
    setLoading(false);
  }, []);

  const loadCreds = useCallback(async () => {
    setCredsLoading(true);
    try {
      const data = await callOAuth("GET", { action: "status" });
      if (data.ok) setCreds(data.credentials ?? []);
    } catch { /* silencioso */ }
    setCredsLoading(false);
  }, []);

  useEffect(() => { load(); loadCreds(); }, []);

  // Helpers de credenciales
  const mlCreds = creds.filter(c => c.platform === "MercadoLibre");
  const mpCreds = creds.filter(c => c.platform === "MercadoPago");
  const getCred = (platform: string, siteId: string) =>
    creds.find(c => c.platform === platform && c.siteId === siteId);

  // ── Acciones OAuth ──────────────────────────────────────────────────────────

  const handleConnect = async (platform: "MercadoLibre" | "MercadoPago", siteId = "MLU") => {
    const { data: { session } } = await supabase.auth.getSession();
    const token  = session?.access_token ?? SUPABASE_ANON_KEY;
    const params = new URLSearchParams({ action: "connect", platform, site_id: siteId });
    window.location.href = `${FUNCTIONS_URL}/ml-oauth?${params}&token=${token}`;
  };

  const handleRefresh = async (cred: Credential) => {
    const key = `${cred.platform}_${cred.siteId}`;
    setActionLoading(key);
    try {
      const data = await callOAuth("POST", { action: "refresh" }, {
        platform: cred.platform, site_id: cred.siteId, store_id: cred.storeId,
      });
      if (data.ok) { notify("Token renovado ✓"); await loadCreds(); }
      else notify(data.error ?? "Error al renovar", "err");
    } catch { notify("Error de conexión", "err"); }
    setActionLoading(null);
  };

  const handleDisconnect = async (cred: Credential) => {
    if (!confirm(`¿Desconectar ${cred.platform} ${cred.siteId}? Esto eliminará las credenciales del vault.`)) return;
    const key = `${cred.platform}_${cred.siteId}`;
    setActionLoading(key);
    try {
      await callOAuth("DELETE", { action: "disconnect" }, {
        platform: cred.platform, site_id: cred.siteId, store_id: cred.storeId,
      });
      notify("Cuenta desconectada");
      await loadCreds();
    } catch { notify("Error al desconectar", "err"); }
    setActionLoading(null);
  };

  // ── Acciones de Sync ML ─────────────────────────────────────────────────────

  const handleSyncItem = async (productId: string) => {
    setSaving(productId);
    try {
      const data = await callMlSync({ action: "sync_item", product_id: productId });
      if (data.ok) {
        const warns = data.warnings?.length ? ` (${data.warnings.join("; ")})` : "";
        notify(`Sincronizado ✓${warns}`, data.warnings?.length ? "warn" : "ok");
        await load();
      } else notify(data.error ?? "Error en sync", "err");
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  const handleSyncAll = async () => {
    setSaving("all");
    try {
      const data = await callMlSync({ action: "sync_all" });
      if (data.ok) { notify(`${data.enqueued} productos encolados ✓`); await load(); }
      else notify(data.error ?? "Error", "err");
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  const handleProcessQueue = async () => {
    setSaving("queue");
    try {
      const data = await callMlSync({ action: "process_queue" });
      if (data.ok) {
        notify(`Procesados: ${data.processed} ✓ | Errores: ${data.errors}`, data.errors > 0 ? "warn" : "ok");
        await load();
      } else notify(data.error ?? "Error", "err");
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  const handleSetStatus = async (productId: string, status: "active" | "paused") => {
    setSaving(`status_${productId}`);
    try {
      const data = await callMlSync({ action: "sync_status", product_id: productId, status });
      if (data.ok) { notify(`Estado → "${status}" ✓`); await load(); }
      else notify(data.error ?? "Error", "err");
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  const handleRetry = async (productId: string) => {
    setSaving(productId);
    try {
      await supabase.from("ml_sync_queue")
        .update({ status: "pending", retries: 0, updated_at: new Date().toISOString() })
        .eq("product_id", productId).eq("status", "error");
      notify("Reintento encolado ✓");
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  // ── Tabs ────────────────────────────────────────────────────────────────────

  const TABS: { id: TabId; label: string; section: "ml" | "mp" }[] = [
    { id: "ml-publicados",    label: `Publicados (${products.length})`,   section: "ml" },
    { id: "ml-cola",          label: `Cola (${queue.filter(q => q.status === "pending").length})`, section: "ml" },
    { id: "ml-errores",       label: `Errores (${errors.length})`,        section: "ml" },
    { id: "mp-pagos",         label: `Pagos (${mpPayments.length})`,      section: "mp" },
  ];

  const mlTab = tab.startsWith("ml-");
  const mpTab = tab.startsWith("mp-");

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: T.fontBase, display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: T.bgCard, borderRadius: T.radiusLg,
        boxShadow: T.shadowCard, marginBottom: 16,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }}>

        {/* Título + acciones globales */}
        <div style={{
          padding: "20px 24px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.textDark, letterSpacing: "-0.3px" }}>
              MercadoLibre & MercadoPago
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMuted }}>
              Gestión de integraciones, publicaciones y sincronización
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn label={saving === "all" ? "Encolando…" : "Sync Todo"}
              variant="primary" disabled={saving === "all"} onClick={handleSyncAll} />
            <Btn label={saving === "queue" ? "Procesando…" : "Procesar Cola"}
              variant="secondary" disabled={saving === "queue"} onClick={handleProcessQueue} />
            <Btn label="Actualizar" variant="ghost" disabled={false}
              onClick={() => { load(); loadCreds(); }} />
          </div>
        </div>

        {/* Toast de notificación */}
        {msg && (
          <div style={{
            padding: "10px 24px", fontSize: 12, fontWeight: 600,
            background: msg.type === "ok" ? T.successBg : msg.type === "warn" ? T.warningBg : T.dangerBg,
            color: msg.type === "ok" ? T.success : msg.type === "warn" ? T.warning : T.danger,
            borderBottom: `1px solid ${T.borderLight}`,
          }}>
            {msg.type === "ok" ? "✓" : msg.type === "warn" ? "⚠" : "✕"} {msg.text}
          </div>
        )}

        {/* KPIs */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          {[
            { label: "Cuentas conectadas", value: creds.length,                                     accent: T.success  },
            { label: "Publicados en ML",   value: products.length,                                  accent: T.accent   },
            { label: "Errores de sync",    value: errors.length,                                    accent: T.danger   },
            { label: "Cola pendiente",     value: queue.filter(q => q.status === "pending").length, accent: T.primary  },
          ].map((k, i) => (
            <div key={k.label} style={{
              padding: "16px 24px",
              borderLeft: i > 0 ? `1px solid ${T.borderLight}` : "none",
            }}>
              <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.value > 0 && k.label !== "Publicados en ML" && k.label !== "Cuentas conectadas" ? k.accent : T.textDark }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Cuentas conectadas + tabs ─────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>

          {/* ── MercadoLibre ── */}
          <div style={{ flex: 1, borderRight: `1px solid ${T.border}` }}>
            <div style={{
              padding: "12px 20px 0",
              background: mlTab ? T.bgMain : "transparent",
              borderBottom: mlTab ? `2px solid ${T.accent}` : "2px solid transparent",
            }}>
              {/* Fila única: logo + nombre + status + botones */}
              {credsLoading ? (
                <div style={{ fontSize: 11, color: T.textMuted, padding: "8px 0 10px" }}>Cargando…</div>
              ) : mlCreds.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <img src="/ML_logo.png" alt="ML" style={{ width: 20, height: 20, objectFit: "contain" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>MercadoLibre</span>
                  <button onClick={() => handleConnect("MercadoLibre", "MLU")} style={{
                    marginLeft: "auto", padding: "4px 10px", background: T.accent, color: "#fff",
                    border: "none", borderRadius: T.radiusSm, cursor: "pointer",
                    fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                  }}>+ Conectar</button>
                </div>
              ) : mlCreds.map(cred => {
                const diffMs   = new Date(cred.expiresAt).getTime() - Date.now();
                const diffHrs  = Math.max(0, Math.floor(diffMs / 3_600_000));
                const diffDays = Math.floor(diffHrs / 24);
                const expiryLabel = cred.isExpired ? "Vencido" : diffDays > 1 ? `Vence en ${diffDays}d` : diffHrs > 0 ? `Vence en ${diffHrs}h` : "Vence pronto";
                const statusColor = cred.isExpired ? T.danger : cred.expiringSoon ? T.warning : T.success;
                const isLoading   = actionLoading === `${cred.platform}_${cred.siteId}`;
                return (
                  <div key={cred.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <img src="/ML_logo.png" alt="ML" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textDark }}>
                      {cred.nickname || cred.siteId}
                    </span>
                    {cred.isGlobal && <span style={{ fontSize: 9, fontWeight: 700, color: T.primary, background: T.primaryLight, padding: "1px 5px", borderRadius: T.radiusPill }}>Global</span>}
                    <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>● {expiryLabel}</span>
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                      <button onClick={() => handleRefresh(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.primary }}>↺</button>
                      <button onClick={() => handleDisconnect(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.danger}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.danger }}>✕</button>
                    </div>
                  </div>
                );
              })}
              {/* Tabs ML */}
              <div style={{ display: "flex", gap: 0 }}>
                {TABS.filter(t => t.section === "ml").map(t => (
                  <TabBtn key={t.id} label={t.label} active={tab === t.id}
                    onClick={() => setTab(t.id)}
                    hasAlert={t.id === "ml-errores" && errors.length > 0} />
                ))}
              </div>
            </div>
          </div>

          {/* ── MercadoPago ── */}
          <div style={{ flex: 1 }}>
            <div style={{
              padding: "12px 20px 0",
              background: mpTab ? T.bgMain : "transparent",
              borderBottom: mpTab ? `2px solid #009EE3` : "2px solid transparent",
            }}>
              {/* Fila única: logo + nombre + status + botones */}
              {credsLoading ? (
                <div style={{ fontSize: 11, color: T.textMuted, padding: "8px 0 10px" }}>Cargando…</div>
              ) : mpCreds.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <img src="/MP_logo.png" alt="MP" style={{ width: 20, height: 20, objectFit: "contain" }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>MercadoPago</span>
                  <button onClick={() => handleConnect("MercadoPago", "MLU")} style={{
                    marginLeft: "auto", padding: "4px 10px", background: "#009EE3", color: "#fff",
                    border: "none", borderRadius: T.radiusSm, cursor: "pointer",
                    fontWeight: 700, fontSize: 10, textTransform: "uppercase",
                  }}>+ Conectar</button>
                </div>
              ) : mpCreds.map(cred => {
                const diffMs   = new Date(cred.expiresAt).getTime() - Date.now();
                const diffHrs  = Math.max(0, Math.floor(diffMs / 3_600_000));
                const diffDays = Math.floor(diffHrs / 24);
                const expiryLabel = cred.isExpired ? "Vencido" : diffDays > 1 ? `Vence en ${diffDays}d` : diffHrs > 0 ? `Vence en ${diffHrs}h` : "Vence pronto";
                const statusColor = cred.isExpired ? T.danger : cred.expiringSoon ? T.warning : T.success;
                const isLoading   = actionLoading === `${cred.platform}_${cred.siteId}`;
                return (
                  <div key={cred.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <img src="/MP_logo.png" alt="MP" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textDark }}>
                      {cred.nickname || cred.siteId}
                    </span>
                    {cred.isGlobal && <span style={{ fontSize: 9, fontWeight: 700, color: "#009EE3", background: "rgba(0,158,227,.1)", padding: "1px 5px", borderRadius: T.radiusPill }}>Global</span>}
                    <span style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>● {expiryLabel}</span>
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                      <button onClick={() => handleRefresh(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, cursor: "pointer", color: "#009EE3" }}>↺</button>
                      <button onClick={() => handleDisconnect(cred)} disabled={isLoading} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "transparent", border: `1px solid ${T.danger}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.danger }}>✕</button>
                    </div>
                  </div>
                );
              })}
              {/* Tabs MP */}
              <div style={{ display: "flex", gap: 0 }}>
                {TABS.filter(t => t.section === "mp").map(t => (
                  <TabBtn key={t.id} label={t.label} active={tab === t.id}
                    accentColor="#009EE3"
                    onClick={() => setTab(t.id)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ML — PUBLICADOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "ml-publicados" && (
        <Card>
          <TableHeader cols={["Producto", "ML Item ID", "Estado", "Stock", "Sync", "Último sync", "Acciones"]} />
          <tbody>
            {loading ? (
              <LoadingRow colSpan={7} />
            ) : products.length === 0 ? (
              <EmptyRow colSpan={7} text="Sin productos publicados en ML" />
            ) : products.map((p, idx) => (
              <tr key={p.id} style={{
                borderBottom: `1px solid ${T.borderLight}`,
                background: idx % 2 === 0 ? T.bgCard : T.bgMain,
              }}>
                <td style={tdStyle({ maxWidth: 180 })}>{p.nombre}</td>
                <td style={{ padding: "10px 16px" }}>
                  <a href={`https://articulo.mercadolibre.com.uy/${p.ml_item_id}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: T.primary, textDecoration: "none" }}>
                    {p.ml_item_id} ↗
                  </a>
                </td>
                <td style={{ padding: "10px 16px" }}><MLStatusBadge status={p.ml_status} /></td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700,
                  color: p.stock === 0 ? T.danger : T.textDark }}>{p.stock}</td>
                <td style={{ padding: "10px 16px" }}><SyncBadge status={p.sync_status} /></td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: T.textMuted }}>
                  {p.ml_last_sync
                    ? new Date(p.ml_last_sync).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn label="↺ Sync" variant="primary" size="xs"
                      disabled={saving === p.id} onClick={() => handleSyncItem(p.id)} />
                    {p.ml_status === "active"
                      ? <Btn label="⏸ Pausar" variant="ghost" size="xs"
                          disabled={saving === `status_${p.id}`}
                          onClick={() => handleSetStatus(p.id, "paused")} />
                      : p.ml_status === "paused"
                      ? <Btn label="▶ Activar" variant="success" size="xs"
                          disabled={saving === `status_${p.id}`}
                          onClick={() => handleSetStatus(p.id, "active")} />
                      : null}
                    {p.sync_status === "error" && (
                      <Btn label="🔁 Reintentar" variant="danger" size="xs"
                        disabled={saving === p.id} onClick={() => handleRetry(p.id)} />
                    )}
                    {saving === p.id && <span style={{ fontSize: 11, color: T.textMuted, lineHeight: "24px" }}>⏳</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ML — COLA
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "ml-cola" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn label={saving === "queue" ? "Procesando…" : "▶ Procesar ahora"}
              variant="primary" disabled={saving === "queue"} onClick={handleProcessQueue} />
          </div>
          <Card>
            <TableHeader cols={["Producto ID", "Acción", "Estado", "Reintentos", "Creado"]} />
            <tbody>
              {queue.length === 0 ? (
                <EmptyRow colSpan={5} text="Cola vacía ✓" success />
              ) : queue.map((q, idx) => (
                <tr key={q.id} style={{
                  borderBottom: `1px solid ${T.borderLight}`,
                  background: idx % 2 === 0 ? T.bgCard : T.bgMain,
                }}>
                  <td style={{ padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: T.textMuted }}>
                    {q.product_id?.substring(0, 12)}…
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: T.textDark }}>{q.action}</td>
                  <td style={{ padding: "10px 16px" }}><SyncBadge status={q.status} /></td>
                  <td style={{ padding: "10px 16px", fontSize: 13,
                    color: q.retries >= 3 ? T.danger : T.textBody, fontWeight: q.retries >= 3 ? 700 : 400 }}>
                    {q.retries}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: T.textMuted }}>
                    {new Date(q.created_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ML — ERRORES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "ml-errores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {errors.length === 0 ? (
            <div style={{
              padding: "3rem", textAlign: "center", color: T.success,
              fontWeight: 700, fontSize: 14,
              background: T.bgCard, borderRadius: T.radiusLg,
              border: `1px solid ${T.border}`, boxShadow: T.shadowCard,
            }}>
              ✓ Sin errores de sincronización
            </div>
          ) : errors.map(e => (
            <div key={e.product_id} style={{
              background: T.bgCard, borderRadius: T.radiusMd,
              border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.danger}`,
              padding: "14px 20px", boxShadow: T.shadowCard,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.textDark }}>{e.product_name}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  ML ID: <code style={{ fontFamily: "'Courier New', monospace" }}>{e.ml_item_id || "—"}</code>
                  {" · "}Reintentos: {e.retries}{" · "}{e.queue_action}
                </div>
              </div>
              <Btn label="🔁 Reintentar" variant="danger" size="sm"
                disabled={saving === e.product_id} onClick={() => handleRetry(e.product_id)} />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MP — PAGOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "mp-pagos" && (
        <Card>
          <TableHeader cols={["Orden ID", "Total", "Estado pago", "Fuente", "Fecha"]} />
          <tbody>
            {loading ? (
              <LoadingRow colSpan={5} />
            ) : mpPayments.length === 0 ? (
              <EmptyRow colSpan={5} text="Sin pagos registrados via MercadoPago" />
            ) : mpPayments.map((pay, idx) => (
              <tr key={pay.id} style={{
                borderBottom: `1px solid ${T.borderLight}`,
                background: idx % 2 === 0 ? T.bgCard : T.bgMain,
              }}>
                <td style={{ padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 11, color: T.textMuted }}>
                  {pay.id?.substring(0, 14)}…
                </td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: T.textDark }}>
                  {pay.currency} {Number(pay.total).toLocaleString("es-UY")}
                </td>
                <td style={{ padding: "10px 16px" }}><PayStatusBadge status={pay.payment_status} /></td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: T.textMuted }}>{pay.source}</td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: T.textMuted }}>
                  {new Date(pay.created_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </Card>
      )}

    </div>
  );
}

// ── Componentes UI ────────────────────────────────────────────────────────────

function CredCard({ cred, loading, onRefresh, onDisconnect, accentColor }: {
  cred: Credential; loading: boolean;
  onRefresh: () => void; onDisconnect: () => void;
  accentColor?: string;
}) {
  const isML   = cred.platform === "MercadoLibre";
  const accent = accentColor ?? (isML ? T.accent : "#009EE3");
  const icon   = isML ? "🟡" : "💙";

  const diffMs   = new Date(cred.expiresAt).getTime() - Date.now();
  const diffHrs  = Math.max(0, Math.floor(diffMs / 3_600_000));
  const diffDays = Math.floor(diffHrs / 24);
  const expiryLabel = cred.isExpired ? "Vencido"
    : diffDays > 1 ? `Vence en ${diffDays} días`
    : diffHrs > 0  ? `Vence en ${diffHrs}h`
    : "Vence pronto";

  const statusColor = cred.isExpired ? T.danger : cred.expiringSoon ? T.warning : T.success;
  const statusDot   = cred.isExpired ? "●" : cred.expiringSoon ? "●" : "●";

  return (
    <div style={{
      background: T.bgCard, borderRadius: T.radiusMd, boxShadow: T.shadowCard,
      border: `1px solid ${T.border}`, borderLeft: `3px solid ${accent}`,
      padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: T.textDark }}>{cred.platform}</span>
          <span style={{
            padding: "1px 7px", borderRadius: T.radiusPill,
            fontSize: 10, fontWeight: 700, background: T.primaryLight, color: T.primary,
          }}>{cred.siteId}</span>
          {cred.isGlobal && (
            <span style={{
              padding: "1px 7px", borderRadius: T.radiusPill,
              fontSize: 10, fontWeight: 700, background: T.primaryLight, color: T.primary,
            }}>Global</span>
          )}
        </div>
        {cred.nickname && (
          <div style={{ fontSize: 12, color: T.textMuted }}>
            Cuenta: <strong style={{ color: T.textDark }}>{cred.nickname}</strong>
            {cred.sellerId && <span style={{ color: T.textMuted }}> · ID {cred.sellerId}</span>}
          </div>
        )}
      </div>

      <div style={{ textAlign: "right", minWidth: 120 }}>
        <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Estado</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: statusColor, display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
          <span style={{ color: statusColor }}>{statusDot}</span> {expiryLabel}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Btn label="↺ Renovar"   variant="secondary" size="sm" disabled={loading} onClick={onRefresh} />
        <Btn label="Desconectar" variant="danger"    size="sm" disabled={loading} onClick={onDisconnect} />
      </div>
    </div>
  );
}

function EmptyCard({ icon, platform, siteId, label, accentColor, onConnect }: {
  icon: string; platform: string; siteId: string;
  label?: string; accentColor?: string; onConnect: () => void;
}) {
  const accent = accentColor ?? T.accent;
  return (
    <div style={{
      background: T.bgCard, borderRadius: T.radiusMd, border: `2px dashed ${T.border}`,
      padding: "14px 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.textDark }}>
            {platform} <span style={{ color: T.textMuted, fontWeight: 400 }}>{siteId}</span>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted }}>Sin cuenta conectada</div>
        </div>
      </div>
      <button onClick={onConnect} style={{
        padding: "6px 16px", background: accent, color: "#fff",
        border: "none", borderRadius: T.radiusSm, cursor: "pointer",
        fontWeight: 700, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        + Conectar
      </button>
    </div>
  );
}

function TabBtn({ label, active, accentColor, hasAlert, onClick }: {
  label: string; active: boolean; accentColor?: string;
  hasAlert?: boolean; onClick: () => void;
}) {
  const accent = accentColor ?? T.accent;
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px 10px", background: "none", border: "none",
      borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
      marginBottom: "-2px", cursor: "pointer",
      fontWeight: active ? 700 : 500, fontSize: 12,
      color: active ? accent : T.textMuted,
      transition: "all 0.12s",
      position: "relative",
    }}>
      {label}
      {hasAlert && (
        <span style={{
          position: "absolute", top: 4, right: 2, width: 6, height: 6,
          borderRadius: "50%", background: T.danger,
        }} />
      )}
    </button>
  );
}

function Btn({ label, variant = "secondary", size = "md", disabled, onClick }: {
  label: string; variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md"; disabled: boolean; onClick: () => void;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: T.primary,  color: "#fff",    border: "none" },
    secondary: { background: "transparent", color: T.primary, border: `1px solid ${T.border}` },
    ghost:     { background: "transparent", color: T.textMuted, border: `1px solid ${T.border}` },
    danger:    { background: "transparent", color: T.danger, border: `1px solid ${T.danger}` },
    success:   { background: "transparent", color: T.success, border: `1px solid ${T.success}` },
  };
  const padding = size === "xs" ? "3px 8px" : size === "sm" ? "5px 12px" : "7px 16px";
  const fontSize = size === "xs" ? 10 : size === "sm" ? 11 : 11;

  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding, fontSize, fontWeight: 600, letterSpacing: "0.06em",
      textTransform: "uppercase", borderRadius: T.radiusSm,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.12s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: T.bgCard, borderRadius: T.radiusMd, border: `1px solid ${T.border}`,
      boxShadow: T.shadowCard, overflow: "hidden",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: T.primaryDark }}>
        {cols.map(c => (
          <th key={c} style={{
            padding: "10px 16px", textAlign: "left",
            fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.75)",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function LoadingRow({ colSpan = 5 }: { colSpan?: number }) {
  return (
    <tr><td colSpan={colSpan} style={{ padding: "2.5rem", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
      Cargando…
    </td></tr>
  );
}

function EmptyRow({ colSpan, text, success }: { colSpan: number; text: string; success?: boolean }) {
  return (
    <tr><td colSpan={colSpan} style={{
      padding: "2.5rem", textAlign: "center", fontSize: 13,
      color: success ? T.success : T.textMuted, fontWeight: success ? 700 : 400,
    }}>
      {success ? "✓ " : ""}{text}
    </td></tr>
  );
}

function SectionNote({ text }: { text: string }) {
  return <p style={{ margin: "0 0 4px", fontSize: 12, color: T.textMuted }}>{text}</p>;
}

function InfoNote({ text, color }: { text: string; color?: string }) {
  const c = color ?? T.primary;
  return (
    <div style={{
      padding: "10px 16px", borderRadius: T.radiusMd,
      background: `${c}11`, border: `1px solid ${c}33`,
      fontSize: 12, color: c,
    }}>
      💡 {text}
    </div>
  );
}

function tdStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.textDark,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    ...extra,
  };
}

function MLStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active: [T.successBg, T.success],
    paused: [T.warningBg, T.warning],
    closed: [T.dangerBg,  T.danger],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", T.textMuted];
  return (
    <span style={{ padding: "2px 9px", borderRadius: T.radiusPill, fontSize: 10, fontWeight: 700, background: bg, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {status || "—"}
    </span>
  );
}

function SyncBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    synced:  [T.successBg, T.success, "Sync ✓"],
    error:   [T.dangerBg,  T.danger,  "Error ✕"],
    pending: [T.warningBg, T.warning, "Pendiente"],
    done:    [T.successBg, T.success, "Done ✓"],
  };
  const [bg, color, label] = map[status] ?? ["#f1f5f9", T.textMuted, status || "—"];
  return (
    <span style={{ padding: "2px 9px", borderRadius: T.radiusPill, fontSize: 10, fontWeight: 700, background: bg, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}
    </span>
  );
}

function PayStatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid:     [T.successBg, T.success],
    pending:  [T.warningBg, T.warning],
    refunded: [T.primaryLight, T.primary],
    failed:   [T.dangerBg, T.danger],
  };
  const [bg, color] = map[status] ?? ["#f1f5f9", T.textMuted];
  return (
    <span style={{ padding: "2px 9px", borderRadius: T.radiusPill, fontSize: 10, fontWeight: 700, background: bg, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {status || "—"}
    </span>
  );
}
