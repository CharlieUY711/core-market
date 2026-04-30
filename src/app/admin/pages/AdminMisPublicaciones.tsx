import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../../utils/supabase/client";

const ACCENT = "#FF7A00";
const BLUE   = "#0F3460";
const GREEN  = "#1DC878";

interface Articulo {
  id: string;
  nombre: string;
  tipo: "market" | "secondhand";
  status: string;
  precio: number;
  moneda: string;
  imagen_principal?: string;
  stock: number;
  condicion?: string;
  departamento_nombre?: string;
  created_at: string;
  published_at?: string;
  ranking_score?: number;
  clicks?: number;
  impresiones?: number;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: "Activo",   bg: "#dcfce7", color: "#166534" },
  draft:    { label: "Borrador", bg: "#F3F4F6", color: "#6B7280" },
  paused:   { label: "Pausado",  bg: "#fef9c3", color: "#854d0e" },
  inactive: { label: "Inactivo", bg: "#fee2e2", color: "#991b1b" },
};

export default function AdminMisPublicaciones() {
  const navigate = useNavigate();
  const [articulos, setArticulos]   = useState<Articulo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"all"|"market"|"secondhand">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"draft"|"paused">("all");
  const [toast, setToast]           = useState<{ text: string; ok: boolean } | null>(null);

  const notify = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("articulos")
      .select("id,nombre,tipo,status,precio,moneda,imagen_principal,stock,condicion,departamento_nombre,created_at,published_at,ranking_score,clicks,impresiones")
      .eq("vendedor_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!error) setArticulos(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cambiarStatus = async (id: string, nuevoStatus: string) => {
    const { error } = await supabase.from("articulos").update({ status: nuevoStatus }).eq("id", id);
    if (!error) {
      setArticulos(prev => prev.map(a => a.id === id ? { ...a, status: nuevoStatus } : a));
      notify("Estado actualizado");
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este artículo?")) return;
    await supabase.from("articulos").update({ deleted_at: new Date().toISOString(), status: "deleted" }).eq("id", id);
    setArticulos(prev => prev.filter(a => a.id !== id));
    notify("Artículo eliminado");
  };

  const filtered = articulos.filter(a => {
    const matchTipo   = filter === "all" || a.tipo === filter;
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchTipo && matchStatus;
  });

  const stats = {
    total:    articulos.length,
    activos:  articulos.filter(a => a.status === "active").length,
    borradores: articulos.filter(a => a.status === "draft").length,
    clicks:   articulos.reduce((s, a) => s + (a.clicks || 0), 0),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {toast && (
        <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
          padding: "0.75rem 1.25rem", borderRadius: 10, fontWeight: 600, fontSize: "0.875rem",
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#dc2626",
          border: `1px solid ${toast.ok ? "#6BB87A" : "#ef4444"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111", margin: 0 }}>Mis Publicaciones</h1>
          <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: "2px 0 0" }}>
            Gestioná tus artículos de Market y Second Hand
          </p>
        </div>
        <button onClick={() => navigate("/admin/catalog/articulos")} style={{
          padding: "0.6rem 1.25rem", background: ACCENT, color: "#fff",
          border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.875rem",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          + Nuevo artículo
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem" }}>
        {[
          { label: "Total",      value: stats.total,      color: BLUE },
          { label: "Activos",    value: stats.activos,    color: GREEN },
          { label: "Borradores", value: stats.borradores, color: "#F59E0B" },
          { label: "Clicks",     value: stats.clicks,     color: ACCENT },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "0.875rem 1rem",
            border: "1px solid #F3F4F6", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all","market","secondhand"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "0.4rem 0.75rem", borderRadius: 8, fontSize: "0.8rem",
              border: `1.5px solid ${filter===f ? ACCENT : "#E5E7EB"}`,
              background: filter===f ? "rgba(255,122,0,.08)" : "#fff",
              color: filter===f ? ACCENT : "#6B7280",
              fontWeight: filter===f ? 700 : 400, cursor: "pointer",
            }}>
              {f==="all"?"Todos":f==="market"?"🛍 Market":"♻️ Second Hand"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["all","active","draft","paused"] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} style={{
              padding: "0.4rem 0.75rem", borderRadius: 8, fontSize: "0.8rem",
              border: `1.5px solid ${filterStatus===f ? BLUE : "#E5E7EB"}`,
              background: filterStatus===f ? "rgba(15,52,96,.08)" : "#fff",
              color: filterStatus===f ? BLUE : "#6B7280",
              fontWeight: filterStatus===f ? 700 : 400, cursor: "pointer",
            }}>
              {f==="all"?"Todos los estados":STATUS_CFG[f]?.label||f}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#9CA3AF" }}>
          {filtered.length} artículo(s)
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#fff", borderRadius: 14,
          border: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📦</div>
          <div style={{ fontWeight: 700, color: "#374151", marginBottom: "0.25rem" }}>Sin publicaciones</div>
          <div style={{ color: "#9CA3AF", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Publicá tu primer artículo para empezar a vender
          </div>
          <button onClick={() => navigate("/admin/catalog/articulos")} style={{
            padding: "0.6rem 1.25rem", background: ACCENT, color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
          }}>+ Nuevo artículo</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filtered.map(a => {
            const cfg = STATUS_CFG[a.status] || STATUS_CFG.draft;
            const ctr = a.impresiones ? Math.round((a.clicks||0) / a.impresiones * 100) : 0;
            return (
              <div key={a.id} style={{ background: "#fff", borderRadius: 12,
                border: "1px solid #F3F4F6", padding: "0.875rem 1rem",
                display: "flex", alignItems: "center", gap: "1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>

                {/* Imagen */}
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden",
                  background: "#F9FAFB", flexShrink: 0 }}>
                  {a.imagen_principal ? (
                    <img src={a.imagen_principal} alt={a.nombre}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                      {a.tipo === "secondhand" ? "♻️" : "🛍"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.nombre}
                    </span>
                    <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: 20,
                      background: cfg.bg, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                    {a.tipo === "secondhand" && (
                      <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: 20,
                        background: "rgba(29,200,120,.1)", color: "#16a061", fontWeight: 700 }}>
                        ♻️ SH
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#6B7280", display: "flex", gap: "0.75rem" }}>
                    <span style={{ fontWeight: 700, color: ACCENT }}>
                      {a.moneda} {Number(a.precio).toLocaleString("es-UY")}
                    </span>
                    {a.departamento_nombre && <span>{a.departamento_nombre}</span>}
                    {a.condicion && <span>{a.condicion}</span>}
                    <span>Stock: {a.stock}</span>
                    <span>👁 {a.impresiones||0} · 🖱 {a.clicks||0} · CTR {ctr}%</span>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {a.status !== "active" && (
                    <button onClick={() => cambiarStatus(a.id, "active")} style={{
                      padding: "0.35rem 0.75rem", background: "none",
                      border: `1.5px solid ${GREEN}`, borderRadius: 7,
                      color: GREEN, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                    }}>Activar</button>
                  )}
                  {a.status === "active" && (
                    <button onClick={() => cambiarStatus(a.id, "paused")} style={{
                      padding: "0.35rem 0.75rem", background: "none",
                      border: "1.5px solid #F59E0B", borderRadius: 7,
                      color: "#854d0e", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                    }}>Pausar</button>
                  )}
                  <button onClick={() => eliminar(a.id)} style={{
                    padding: "0.35rem 0.75rem", background: "none",
                    border: "1.5px solid #EF4444", borderRadius: 7,
                    color: "#EF4444", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  }}>Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}