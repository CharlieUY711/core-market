import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCarrito, vaciarCarrito } from "../services/carritoApi";
import { getTipoCambioUSD, formatearPrecio, convertirUYUaUSD, convertirUSDaUYU } from "../services/bcuApi";
import { supabase } from "../../utils/supabase/client";
import { useRequireAuth } from "../hooks/useRequireAuth";

const CREAR_ORDEN_URL = `${import.meta.env.VITE_API_URL}/crear-orden`;
const CREATE_PREF_URL = `${import.meta.env.VITE_API_URL}/create_preference`;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState([]);
  const [tipoCambio, setTipoCambio] = useState(null);
  const [monedaPago, setMonedaPago] = useState("UYU");
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [step, setStep] = useState("form");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [totalBackend, setTotalBackend] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      try {
        const [carritoData, tc] = await Promise.all([getCarrito(), getTipoCambioUSD()]);
        setItems(carritoData);
        setTipoCambio(tc);
        const totalUYU = carritoData.filter(i => (i.moneda || "UYU") === "UYU").reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
        const totalUSD = carritoData.filter(i => (i.moneda || "UYU") === "USD").reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
        setMonedaPago(totalUSD * (tc?.venta || 44) > totalUYU ? "USD" : "UYU");
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) setEmail(user.email);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [authLoading]);

  const calcularTotalUYU = () => {
    if (!tipoCambio) return 0;
    return items.reduce((s, i) => {
      const precio = (i.moneda || "UYU") === "USD" ? convertirUSDaUYU(i.precio_unitario, tipoCambio) : i.precio_unitario;
      return s + precio * i.cantidad;
    }, 0);
  };

  const calcularTotalUSD = () => {
    if (!tipoCambio) return 0;
    return items.reduce((s, i) => {
      const precio = (i.moneda || "UYU") === "UYU" ? convertirUYUaUSD(i.precio_unitario, tipoCambio) : i.precio_unitario;
      return s + precio * i.cantidad;
    }, 0);
  };

  const totalLocal = monedaPago === "UYU" ? calcularTotalUYU() : calcularTotalUSD();
  const totalConIvaLocal = totalLocal * 1.22;

  const handleConfirmar = async () => {
    if (!nombre || !email) { alert("Completá nombre y email"); return; }
    setStep("confirming");
    setErrorMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CREAR_ORDEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ items: items.map(i => ({ product_id: i.producto_id, quantity: i.cantidad })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando orden");
      setTotalBackend(data.total);
      setOrderId(data.order_id);
      setStep("confirmed");
    } catch (err) {
      setErrorMsg(err.message || "Error inesperado");
      setStep("error");
    }
  };

  const handlePagar = async () => {
    setPayLoading(true);
    setPayError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CREATE_PREF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en MercadoPago");
      window.location.href = data.init_point;
    } catch (err) {
      setPayError(err.message || "Error al iniciar el pago");
      setPayLoading(false);
    }
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#666" }}>
      Cargando...
    </div>
  );

  if (items.length === 0) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontSize: "3rem" }}>🛒</div>
      <h2>Tu carrito está vacío</h2>
      <Link to="/" style={{ color: "#FF6835", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "DM Sans, sans-serif" }}>
      <header style={{ background: "#FF6835", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#fff", fontWeight: 600 }}>← Volver</Link>
        <h1 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>Checkout</h1>
        <div style={{ width: 80 }} />
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem", display: "grid", gridTemplateColumns: "1fr 420px", gap: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700 }}>Moneda de pago</h2>
            {tipoCambio && <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#888" }}>BCU: U$S 1 = $U {tipoCambio.venta.toLocaleString("es-UY")}</p>}
            <div style={{ display: "flex", gap: "1rem" }}>
              {["UYU", "USD"].map(m => (
                <button key={m} onClick={() => setMonedaPago(m)} disabled={step !== "form"} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", border: monedaPago === m ? "2px solid #FF6835" : "2px solid #E5E7EB", background: monedaPago === m ? "#FFF3EF" : "#fff", color: monedaPago === m ? "#FF6835" : "#666" }}>
                  {m === "UYU" ? "$U Pesos" : "U$S Dólares"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700 }}>Tus datos</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Nombre completo *", value: nombre, set: setNombre, type: "text", placeholder: "Juan García" },
                { label: "Email *", value: email, set: setEmail, type: "email", placeholder: "juan@email.com" },
                { label: "Teléfono", value: telefono, set: setTelefono, type: "tel", placeholder: "099 123 456" },
                { label: "Dirección", value: direccion, set: setDireccion, type: "text", placeholder: "Av. 18 de Julio 1234" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem" }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} disabled={step !== "form"} style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid #E5E7EB", fontSize: "1rem", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#FF6835"} onBlur={e => e.target.style.borderColor = "#E5E7EB"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position: "sticky", top: "2rem", height: "fit-content" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700 }}>Resumen</h2>

            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: "0.9rem" }}>
                <span>Subtotal estimado</span>
                <span style={{ textDecoration: step === "confirmed" ? "line-through" : "none", color: step === "confirmed" ? "#bbb" : undefined }}>
                  {formatearPrecio(totalConIvaLocal, monedaPago)}
                </span>
              </div>
              {step === "confirmed" && totalBackend !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 800, color: "#222", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "2px solid #E5E7EB" }}>
                  <span>Total confirmado</span>
                  <span style={{ color: "#FF6835" }}>{formatearPrecio(totalBackend, monedaPago)}</span>
                </div>
              )}
              {step === "form" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: 800, color: "#222", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "2px solid #E5E7EB" }}>
                  <span>Total estimado</span>
                  <span style={{ color: "#FF6835" }}>{formatearPrecio(totalConIvaLocal, monedaPago)}</span>
                </div>
              )}
            </div>

            {step === "form" && (
              <button onClick={handleConfirmar} style={{ width: "100%", padding: "1rem", marginTop: "1.25rem", background: "#FF6835", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
                Confirmar pedido
              </button>
            )}
            {step === "confirming" && (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "#666" }}>⏳ Confirmando total...</div>
            )}
            {step === "confirmed" && (
              <>
                <div style={{ background: "#f0fdf4", border: "1px solid #6BB87A", borderRadius: "8px", padding: "0.75rem", marginTop: "1rem", fontSize: "0.85rem", color: "#166534", textAlign: "center" }}>
                  ✅ Total verificado por el servidor
                </div>
                {payError && <div style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", padding: "0.75rem", marginTop: "0.5rem", fontSize: "0.85rem", color: "#dc2626", textAlign: "center" }}>{payError}</div>}
                <button onClick={handlePagar} disabled={payLoading} style={{ width: "100%", padding: "1rem", marginTop: "1rem", background: payLoading ? "#ccc" : "#6BB87A", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, cursor: payLoading ? "not-allowed" : "pointer" }}>
                  {payLoading ? "Iniciando pago..." : `Ir al pago · ${formatearPrecio(totalBackend, monedaPago)}`}
                </button>
              </>
            )}
            {step === "error" && (
              <>
                <div style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", padding: "0.75rem", marginTop: "1rem", fontSize: "0.85rem", color: "#dc2626", textAlign: "center" }}>❌ {errorMsg}</div>
                <button onClick={() => setStep("form")} style={{ width: "100%", padding: "1rem", marginTop: "1rem", background: "#fff", color: "#FF6835", border: "2px solid #FF6835", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Reintentar</button>
              </>
            )}

            <Link to="/carrito" style={{ display: "block", textAlign: "center", color: "#888", textDecoration: "none", fontSize: "0.85rem", marginTop: "0.75rem" }}>← Volver al carrito</Link>
          </div>
        </div>
      </div>
    </div>
  );
}



