import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../utils/supabase/client";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/?login=true&redirect=/dashboard"); return; }
        setUser(user);

        const { data, error: dbError } = await supabase
          .from("ordenes")
          .select("id, total_uyu, total_usd, moneda, estado, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (dbError) throw dbError;
        setOrdenes(data || []);
      } catch (err) {
        setError("Error cargando tus órdenes");
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const formatTotal = (orden) => {
    const total = orden.moneda === "USD" ? orden.total_usd : orden.total_uyu;
    const simbolo = orden.moneda === "USD" ? "U$S" : "$U";
    return `${simbolo} ${Number(total).toLocaleString("es-UY")}`;
  };

  const estadoColor = (estado) => {
    if (estado === "pagado") return { bg: "#f0fdf4", color: "#166534", label: "✅ Pagado" };
    if (estado === "pendiente") return { bg: "#fffbeb", color: "#92400e", label: "⏳ Pendiente" };
    return { bg: "#f1f5f9", color: "#475569", label: estado };
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#666" }}>
      Cargando...
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontSize: "3rem" }}>❌</div>
      <h2 style={{ color: "#dc2626" }}>{error}</h2>
      <Link to="/" style={{ color: "#FF6835", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ background: "#FF6835", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#fff", fontWeight: 600 }}>← Volver</Link>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>Mis órdenes</h1>
        <div style={{ color: "#fff", fontSize: "0.85rem", opacity: 0.8 }}>{user?.email}</div>
      </header>

      <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
        {ordenes.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
            <h2 style={{ color: "#444", margin: "0 0 0.5rem 0" }}>No tenés órdenes aún</h2>
            <p style={{ color: "#888", margin: "0 0 1.5rem 0" }}>Cuando realices una compra aparecerá aquí</p>
            <Link to="/" style={{ padding: "0.75rem 1.5rem", background: "#FF6835", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: 700 }}>
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {ordenes.map(orden => {
              const est = estadoColor(orden.estado);
              return (
                <div key={orden.id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#222" }}>
                      #{orden.id.substring(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#aaa" }}>
                      {new Date(orden.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#222" }}>
                    {formatTotal(orden)}
                  </div>
                  <div style={{ padding: "4px 12px", borderRadius: "20px", background: est.bg, color: est.color, fontSize: "0.8rem", fontWeight: 600 }}>
                    {est.label}
                  </div>
                  <button onClick={() => navigate(`/orden/${orden.id}`)} style={{ padding: "0.5rem 1rem", background: "#FF6835", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                    Ver detalle
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



