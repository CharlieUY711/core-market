import { useNavigate, useSearchParams, Link } from "react-router-dom";

export default function FailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("external_reference");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1.5rem", backgroundColor: "#fef2f2", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ fontSize: "4rem" }}>❌</div>
      <h1 style={{ margin: 0, color: "#dc2626", fontSize: "1.75rem", fontWeight: 800 }}>El pago fue rechazado</h1>
      <p style={{ margin: 0, color: "#888", fontSize: "1rem" }}>No se pudo procesar tu pago. Podés intentarlo nuevamente.</p>
      <button onClick={() => navigate("/checkout")} style={{ padding: "0.75rem 2rem", background: "#FF6835", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
        Volver al checkout
      </button>
      <Link to="/" style={{ color: "#FF6835", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>← Volver a la tienda</Link>
    </div>
  );
}



