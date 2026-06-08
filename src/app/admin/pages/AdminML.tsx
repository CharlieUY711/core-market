import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../utils/supabase/client";

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL     = `${SUPABASE_URL}/functions/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Credential {
  id:           string;
  name:         string;
  platform:     "MercadoLibre" | "MercadoPago";
  siteId:       string;
  storeId:      string | null;
  isGlobal:     boolean;
  nickname?:    string;
  sellerId?:    string;
  expiresAt:    string;
  isExpired:    boolean;
  expiringSoon: boolean;
}

// ── Helpers API ───────────────────────────────────────────────────────────────

async function callOAuth(method: "GET" | "POST" | "DELETE", params: Record<string, string>, body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const url = new URL(`${FUNCTIONS_URL}/ml-oauth`);
  if (method === "GET") Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify({ ...params, ...body }) : undefined,
  });
  return res.json();
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function CredentialCard({ cred, onRefresh, onDisconnect, loading }: {
  cred: Credential;
  onRefresh: () => void;
  onDisconnect: () => void;
  loading: boolean;
}) {
  const isML = cred.platform === "MercadoLibre";
  const accent = isML ? "#F59E0B" : "#009EE3";
  const icon   = isML ? "🟡" : "💙";

  const expiresDate = new Date(cred.expiresAt);
  const diffMs      = expiresDate.getTime() - Date.now();
  const diffHrs     = Math.max(0, Math.floor(diffMs / 3_600_000));
  const diffDays    = Math.floor(diffHrs / 24);

  const expiryLabel = cred.isExpired
    ? "Vencido"
    : diffDays > 1
    ? `Vence en ${diffDays} días`
    : diffHrs > 0
    ? `Vence en ${diffHrs}h`
    : "Vence pronto";

  const statusColor = cred.isExpired ? "#EF4444" : cred.expiringSoon ? "#F59E0B" : "#10B981";
  const statusDot   = cred.isExpired ? "🔴" : cred.expiringSoon ? "🟡" : "🟢";

  return (
    <div style={{
      background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem",
      border: `1px solid #E5E7EB`, borderLeft: `4px solid ${accent}`,
      display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
    }}>
      {/* Icono + nombre */}
      <div style={{ flex: 1, minWidth: "180px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "1.1rem" }}>{icon}</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111" }}>{cred.platform}</span>
          <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700,
            background: "#F3F4F6", color: "#6B7280" }}>{cred.siteId}</span>
          {cred.isGlobal && (
            <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 700,
              background: "#EFF6FF", color: "#3B82F6" }}>Global</span>
          )}
        </div>
        {cred.nickname && (
          <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
            Cuenta: <strong style={{ color: "#374151" }}>{cred.nickname}</strong>
            {cred.sellerId && <span style={{ color: "#9CA3AF" }}> · ID {cred.sellerId}</span>}
          </div>
        )}
      </div>

      {/* Estado de expiración */}
      <div style={{ textAlign: "center", minWidth: "110px" }}>
        <div style={{ fontSize: "0.7rem", color: "#9CA3AF", marginBottom: "2px" }}>Estado</div>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: statusColor }}>
          {statusDot} {expiryLabel}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <ActionBtn
          label="↺ Renovar"
          color="#3B82F6"
          disabled={loading}
          onClick={onRefresh}
        />
        <ActionBtn
          label="Desconectar"
          color="#EF4444"
          disabled={loading}
          onClick={onDisconnect}
        />
      </div>
    </div>
  );
}

function ConnectCard({ platform, siteId, onConnect }: {
  platform: "MercadoLibre" | "MercadoPago";
  siteId: string;
  onConnect: () => void;
}) {
  const isML  = platform === "MercadoLibre";
  const accent = isML ? "#F59E0B" : "#009EE3";
  const icon   = isML ? "🟡" : "💙";

  return (
    <div style={{
      background: "#FAFAFA", borderRadius: "12px", padding: "1.25rem 1.5rem",
      border: "2px dashed #E5E7EB", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: "1rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#374151" }}>
            {platform} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>{siteId}</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Sin cuenta conectada</div>
        </div>
      </div>
      <button onClick={onConnect} style={{
        padding: "0.5rem 1.25rem", background: accent, color: "#fff",
        border: "none", borderRadius: "8px", cursor: "pointer",
        fontWeight: 700, fontSize: "0.82rem",
      }}>
        + Conectar
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminML() {
  const [tab,      setTab]      = useState<"integraciones" | "productos" | "cola" | "errores">("integraciones");
  const [products, setProducts] = useState<any[]>([]);
  const [errors,   setErrors]   = useState<any[]>([]);
  const [queue,    setQueue]    = useState<any[]>([]);
  const [creds,    setCreds]    = useState<Credential[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [credsLoading, setCredsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [msg,      setMsg]      = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const notify = (text: string, type: "ok" | "err") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  // Cargar datos ML
  const load = useCallback(async () => {
    setLoading(true);
    const [p, e, q] = await Promise.all([
      supabase.from("admin_products").select("*").not("ml_item_id", "is", null).order("ml_last_sync", { ascending: false }),
      supabase.from("admin_ml_errors").select("*"),
      supabase.from("ml_sync_queue").select("*").in("status", ["pending", "error"]).order("created_at", { ascending: false }).limit(20),
    ]);
    setProducts(p.data || []);
    setErrors(e.data || []);
    setQueue(q.data || []);
    setLoading(false);
  }, []);

  // Cargar credenciales del vault
  const loadCreds = useCallback(async () => {
    setCredsLoading(true);
    try {
      const data = await callOAuth("GET", { action: "status" });
      if (data.ok) setCreds(data.credentials ?? []);
    } catch { /* silencioso */ }
    setCredsLoading(false);
  }, []);

  useEffect(() => { load(); loadCreds(); }, []);

  // Conectar cuenta → redirige a ML/MP OAuth
  const handleConnect = (platform: "MercadoLibre" | "MercadoPago", siteId = "MLU") => {
    const params = new URLSearchParams({ action: "connect", platform, site_id: siteId });
    window.location.href = `${FUNCTIONS_URL}/ml-oauth?${params}`;
  };

  // Renovar token manualmente
  const handleRefresh = async (cred: Credential) => {
    const key = `${cred.platform}_${cred.siteId}`;
    setActionLoading(key);
    try {
      const data = await callOAuth("POST", { action: "refresh" }, {
        platform: cred.platform, site_id: cred.siteId, store_id: cred.storeId,
      });
      if (data.ok) { notify("Token renovado ✓", "ok"); await loadCreds(); }
      else notify(data.error ?? "Error al renovar", "err");
    } catch { notify("Error de conexión", "err"); }
    setActionLoading(null);
  };

  // Desconectar cuenta
  const handleDisconnect = async (cred: Credential) => {
    if (!confirm(`¿Desconectar ${cred.platform} ${cred.siteId}? Esto eliminará las credenciales del vault.`)) return;
    const key = `${cred.platform}_${cred.siteId}`;
    setActionLoading(key);
    try {
      await callOAuth("DELETE", { action: "disconnect" }, {
        platform: cred.platform, site_id: cred.siteId, store_id: cred.storeId,
      });
      notify("Cuenta desconectada", "ok");
      await loadCreds();
    } catch { notify("Error al desconectar", "err"); }
    setActionLoading(null);
  };

  const handleSyncStock = async (productId: string) => {
    setSaving(productId);
    try {
      const { error } = await supabase.rpc("admin_publish_ml", { p_product_id: productId });
      if (error) throw error;
      notify("Stock encolado para sync ✓", "ok");
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  const handleRetry = async (productId: string) => {
    setSaving(productId);
    try {
      await supabase.from("ml_sync_queue")
        .update({ status: "pending", retries: 0 })
        .eq("product_id", productId).eq("status", "error");
      notify("Reintento encolado ✓", "ok");
      await load();
    } catch (err: any) { notify(err.message || "Error", "err"); }
    finally { setSaving(null); }
  };

  // Plataformas que deberían estar conectadas
  const PLATFORMS: { platform: "MercadoLibre" | "MercadoPago"; siteId: string }[] = [
    { platform: "MercadoLibre", siteId: "MLU" },
    { platform: "MercadoPago",  siteId: "MLU" },
  ];

  const isConnected = (platform: string, siteId: string) =>
    creds.some(c => c.platform === platform && c.siteId === siteId);

  const getCred = (platform: string, siteId: string) =>
    creds.find(c => c.platform === platform && c.siteId === siteId);

  const TABS = [
    { id: "integraciones", label: "🔌 Integraciones" },
    { id: "productos",     label: `📦 Publicados (${products.length})` },
    { id: "cola",          label: `⏳ Cola (${queue.filter(q => q.status === "pending").length})` },
    { id: "errores",       label: `❌ Errores (${errors.length})` },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#111" }}>
            🟡 MercadoLibre & MercadoPago
          </h2>
          <div style={{ fontSize: "0.78rem", color: "#9CA3AF", marginTop: "2px" }}>
            Gestión de integraciones, publicaciones y sincronización
          </div>
        </div>
        <button onClick={() => { load(); loadCreds(); }}
          style={{ padding: "0.5rem 1rem", background: "#F3F4F6", border: "1px solid #E5E7EB",
            borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          ↺ Actualizar
        </button>
      </div>

      {/* Notificación */}
      {msg && (
        <div style={{ padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600,
          background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2",
          color: msg.type === "ok" ? "#166534" : "#dc2626",
          border: `1px solid ${msg.type === "ok" ? "#6BB87A" : "#ef4444"}` }}>
          {msg.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {[
          { label: "Cuentas conectadas", value: creds.length,                                  color: "#10B981" },
          { label: "Publicados en ML",   value: products.length,                               color: "#F59E0B" },
          { label: "Errores de sync",    value: errors.length,                                 color: "#EF4444" },
          { label: "Cola pendiente",     value: queue.filter(q => q.status === "pending").length, color: "#3B82F6" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", borderLeft: `4px solid ${k.color}` }}>
            <div style={{ color: "#6B7280", fontSize: "0.75rem" }}>{k.label}</div>
            <div style={{ fontWeight: 800, fontSize: "1.75rem", color: "#111" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "2px solid #E5E7EB", paddingBottom: "0" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: "0.6rem 1.1rem", background: "none", border: "none",
              borderBottom: tab === t.id ? "2px solid #F59E0B" : "2px solid transparent",
              marginBottom: "-2px", cursor: "pointer", fontWeight: tab === t.id ? 700 : 500,
              fontSize: "0.82rem", color: tab === t.id ? "#F59E0B" : "#6B7280",
              transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: INTEGRACIONES ─────────────────────────────────────── */}
      {tab === "integraciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
            Cuentas conectadas al vault. Las tiendas sin cuenta propia usan la cuenta global del marketplace.
          </div>

          {credsLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9CA3AF" }}>Cargando credenciales...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {PLATFORMS.map(({ platform, siteId }) => {
                const cred = getCred(platform, siteId);
                const key  = `${platform}_${siteId}`;
                return cred
                  ? <CredentialCard key={key} cred={cred}
                      loading={actionLoading === key}
                      onRefresh={() => handleRefresh(cred)}
                      onDisconnect={() => handleDisconnect(cred)} />
                  : <ConnectCard key={key} platform={platform} siteId={siteId}
                      onConnect={() => handleConnect(platform, siteId)} />;
              })}
            </div>
          )}

          {/* Nota sobre refresh token */}
          {creds.some(c => !c.isExpired) && (
            <div style={{ padding: "0.875rem 1rem", borderRadius: "8px", background: "#EFF6FF",
              border: "1px solid #BFDBFE", fontSize: "0.78rem", color: "#1D4ED8" }}>
              💡 Los tokens de MercadoLibre vencen cada 6 horas y se renuevan automáticamente.
              Los de MercadoPago duran 180 días. Si hay problemas, usá "Renovar" para forzar la actualización.
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PRODUCTOS ────────────────────────────────────────── */}
      {tab === "productos" && (
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Producto", "ML Item ID", "ML Status", "Stock", "Sync", "Último sync", "Acciones"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.73rem",
                    fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Cargando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Sin productos publicados en ML</td></tr>
              ) : products.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.875rem", color: "#111",
                    maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#6B7280" }}>{p.ml_item_id}</td>
                  <td style={{ padding: "0.75rem 1rem" }}><MLStatusBadge status={p.ml_status} /></td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: p.stock === 0 ? "#EF4444" : "#111" }}>{p.stock}</td>
                  <td style={{ padding: "0.75rem 1rem" }}><SyncBadge status={p.sync_status} /></td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#9CA3AF" }}>
                    {p.ml_last_sync ? new Date(p.ml_last_sync).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <ActionBtn label="Sync stock" color="#3B82F6" disabled={saving === p.id} onClick={() => handleSyncStock(p.id)} />
                      {p.sync_status === "error" && (
                        <ActionBtn label="Reintentar" color="#EF4444" disabled={saving === p.id} onClick={() => handleRetry(p.id)} />
                      )}
                      {saving === p.id && <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>⏳</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: COLA ─────────────────────────────────────────────── */}
      {tab === "cola" && (
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Producto ID", "Acción", "Estado", "Reintentos", "Creado"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.73rem",
                    fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#9CA3AF" }}>Cola vacía ✓</td></tr>
              ) : queue.map((q, idx) => (
                <tr key={q.id} style={{ borderBottom: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#6B7280" }}>{q.product_id?.substring(0, 12)}...</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>{q.action}</td>
                  <td style={{ padding: "0.75rem 1rem" }}><SyncBadge status={q.status} /></td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem",
                    color: q.retries >= 3 ? "#EF4444" : "#444", fontWeight: q.retries >= 3 ? 700 : 400 }}>{q.retries}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#9CA3AF" }}>
                    {new Date(q.created_at).toLocaleString("es-UY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: ERRORES ──────────────────────────────────────────── */}
      {tab === "errores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {errors.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#10B981", fontWeight: 700 }}>
              ✓ Sin errores de sincronización
            </div>
          ) : errors.map(e => (
            <div key={e.product_id} style={{ background: "#fff", borderRadius: "10px", padding: "1rem 1.5rem",
              borderLeft: "4px solid #EF4444", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#111" }}>{e.product_name}</div>
                <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
                  ML ID: {e.ml_item_id || "—"} · Retries: {e.retries} · {e.queue_action}
                </div>
              </div>
              <ActionBtn label="Reintentar" color="#EF4444" disabled={saving === e.product_id} onClick={() => handleRetry(e.product_id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Badges & botones ──────────────────────────────────────────────────────────

function MLStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: "#f0fdf4", color: "#166534" },
    paused: { bg: "#fffbeb", color: "#92400e" },
    closed: { bg: "#fef2f2", color: "#dc2626" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#9CA3AF" };
  return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>🟡 {status || "—"}</span>;
}

function SyncBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    synced:  { bg: "#f0fdf4", color: "#166534", label: "✓ Sync" },
    error:   { bg: "#fef2f2", color: "#dc2626", label: "✕ Error" },
    pending: { bg: "#fffbeb", color: "#92400e", label: "⏳ Pendiente" },
    done:    { bg: "#f0fdf4", color: "#166534", label: "✓ Done" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#9CA3AF", label: status || "—" };
  return <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function ActionBtn({ label, color, disabled, onClick }: {
  label: string; color: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "4px 10px", background: "transparent", color, border: `1px solid ${color}`,
        borderRadius: "6px", cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "0.75rem", fontWeight: 600, opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  );
}
