import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get("external_reference");
    if (orderId) {
      setTimeout(() => navigate(`/orden/${orderId}?status=success`), 1500);
    }
  }, []);

  const orderId = searchParams.get("external_reference");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1.5rem", backgroundColor: "#f0fdf4", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ fontSize: "4rem" }}>🎉</div>
      <h1 style={{ margin: 0, color: "#166534", fontSize: "1.75rem", fontWeight: 800 }}>¡Pago exitoso!</h1>
      {orderId ? (
        <p style={{ margin: 0, color: "#4b7c5e", fontSize: "1rem" }}>Redirigiendo a tu orden...</p>
      ) : (
        <>
          <p style={{ margin: 0, color: "#92400e", fontSize: "1rem" }}>Pago exitoso, pero no se pudo identificar la orden.</p>
          <Link to="/" style={{ color: "#FF6835", fontWeight: 700, textDecoration: "none" }}>← Volver a la tienda</Link>
        </>
      )}
    </div>
  );
}



