import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function DashboardOrdenes() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("ordenes").select("id, total_uyu, total_usd, moneda, estado, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setOrdenes(data || []); setLoading(false); });
  }, [user]);

  const formatTotal = (o) => {
    const total = o.moneda === "USD" ? o.total_usd : o.total_uyu;
    return `${o.moneda === "USD" ? "U$S" : "$U"} ${Number(total).toLocaleString("es-UY")}`;
  };

  if (loading) return <div style={{ padding: "2rem", color: "#666" }}>Cargando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#222" }}>Mis órdenes</h2>
      {ordenes.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>📦</div>
          <p style={{ color: "#888", margin: "0.5rem 0 0 0" }}>No tenés órdenes aún</p>
        </div>
      ) : ordenes.map(o => (
        <div key={o.id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#222" }}>#{o.id.substring(0, 8).toUpperCase()}</div>
            <div style={{ fontSize: "0.8rem", color: "#aaa" }}>{new Date(o.created_at).toLocaleDateString("es-UY")}</div>
          </div>
          <div style={{ fontWeight: 800, color: "#222" }}>{formatTotal(o)}</div>
          <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, background: o.estado === "pagado" ? "#f0fdf4" : "#fffbeb", color: o.estado === "pagado" ? "#166534" : "#92400e" }}>
            {o.estado === "pagado" ? "✅ Pagado" : "⏳ Pendiente"}
          </div>
          <button onClick={() => navigate(`/orden/${o.id}`)} style={{ padding: "0.5rem 1rem", background: "#FF6835", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
            Ver detalle
          </button>
        </div>
      ))}
    </div>
  );
}



