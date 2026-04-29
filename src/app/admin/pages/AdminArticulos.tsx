import { useState, useEffect } from "react";
import SelectorMediaArticulo from "../components/SelectorMediaArticulo";
import { useOutletContext, useNavigate } from "react-router";
import { supabase } from "../../../utils/supabase/client";

interface Depto  { id: string; nombre: string; }
interface Cat    { id: string; nombre: string; departamento_id: string; }
interface SubCat { id: string; nombre: string; categoria_id: string; }

const ACCENT = "#FF7A00";

export default function AdminArticulos() {
  const { isAdmin } = useOutletContext<any>() || {};
  const navigate = useNavigate();

  const [deptos,   setDeptos]   = useState<Depto[]>([]);
  const [cats,     setCats]     = useState<Cat[]>([]);
  const [subcats,  setSubcats]  = useState<SubCat[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState<{text:string;ok:boolean}|null>(null);

  // Form state
  const [nombre,       setNombre]       = useState("");
  const [descripcion,  setDescripcion]  = useState("");
  const [precio,       setPrecio]       = useState("");
  const [precioOrig,   setPrecioOrig]   = useState("");
  const [stock,        setStock]        = useState("1");
  const [imagenUrl,    setImagenUrl]    = useState("");
  const [deptoId,      setDeptoId]      = useState("");
  const [catId,        setCatId]        = useState("");
  const [subcatId,     setSubcatId]     = useState("");
  const [tipo,         setTipo]         = useState<"market"|"secondhand">("market");
  const [activo,       setActivo]       = useState(true);
  const [imagenes,     setImagenes]     = useState<string[]>([]);
  const [videoUrls,    setVideoUrls]    = useState<string[]>([]);

  const notify = (text: string, ok = true) => {
    setToast({text, ok});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      const [d, c, s] = await Promise.all([
        supabase.from("departamentos").select("id, nombre").eq("activo", true).order("orden"),
        supabase.from("categorias").select("id, nombre, departamento_id").eq("activo", true).order("orden"),
        supabase.from("subcategorias").select("id, nombre, categoria_id").eq("activo", true).order("orden"),
      ]);
      setDeptos(d.data || []);
      setCats(c.data || []);
      setSubcats(s.data || []);
    };
    load();
  }, []);

  const filteredCats   = cats.filter(c => c.departamento_id === deptoId);
  const filteredSubs   = subcats.filter(s => s.categoria_id === catId);

  const handleSubmit = async () => {
    if (!nombre.trim() || !precio || !deptoId) {
      notify("Nombre, precio y departamento son obligatorios", false);
      return;
    }
    setLoading(true);
    try {
      const tabla = tipo === "market" ? "productos_market" : "productos_secondhand";
      const depto = deptos.find(d => d.id === deptoId);
      const cat   = cats.find(c => c.id === catId);

      const { error } = await supabase.from(tabla).insert({
        nombre:              nombre.trim(),
        descripcion:         descripcion.trim(),
        precio:              parseFloat(precio),
        precio_original:     precioOrig ? parseFloat(precioOrig) : null,
        stock:               parseInt(stock) || 1,
        imagen_principal:    imagenes[0] || imagenUrl.trim() || null,
        imagenes:            imagenes.length > 0 ? imagenes : null,
        videos:              videoUrls.length > 0 ? videoUrls : null,
        departamento_id:     deptoId || null,
        departamento_nombre: depto?.nombre || null,
        status:              activo ? "active" : "inactive",
        published_date:      new Date().toISOString(),
      });



      if (error) throw error;
      notify("✅ Artículo publicado");
      // Reset form
      setNombre(""); setDescripcion(""); setPrecio(""); setPrecioOrig("");
      setStock("1"); setImagenUrl(""); setDeptoId(""); setCatId(""); setSubcatId("");
      setImagenes([]); setVideoUrls([]);
    } catch (e: any) {
      notify(e.message || "Error al guardar", false);
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "0.6rem 0.75rem", border: "1.5px solid #E5E7EB",
    borderRadius: "8px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
    fontFamily: "DM Sans, sans-serif",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px", display: "block",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:"10px", fontWeight:600, fontSize:"0.875rem",
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#dc2626",
          border: `1px solid ${toast.ok ? "#6BB87A" : "#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      <div style={{ background:"#fff", borderRadius:14, padding:"1.5rem", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", border:"1px solid #F3F4F6" }}>
        <h2 style={{ margin:"0 0 1.25rem", fontSize:"1.1rem", fontWeight:800, color:"#111" }}>
          Nuevo artículo
        </h2>

        {/* Tipo */}
        <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.25rem" }}>
          {(["market","secondhand"] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)} style={{
              flex:1, padding:"0.55rem", borderRadius:8, border:`2px solid ${tipo===t ? ACCENT : "#E5E7EB"}`,
              background: tipo===t ? `rgba(255,122,0,0.08)` : "#fff",
              color: tipo===t ? ACCENT : "#6B7280", fontWeight:700, cursor:"pointer", fontSize:"0.85rem",
            }}>
              {t === "market" ? "🛍 Market" : "♻️ Second Hand"}
            </button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>

          {/* Nombre */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Nombre *</label>
            <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del artículo" />
          </div>

          {/* Descripción */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Descripción</label>
            <textarea style={{ ...inp, minHeight:80, resize:"vertical" }} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción del artículo" />
          </div>

          {/* Precio */}
          <div>
            <label style={lbl}>Precio *</label>
            <input style={inp} type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0" />
          </div>

          {/* Precio original */}
          <div>
            <label style={lbl}>Precio original (opcional)</label>
            <input style={inp} type="number" value={precioOrig} onChange={e => setPrecioOrig(e.target.value)} placeholder="0" />
          </div>

          {/* Stock */}
          <div>
            <label style={lbl}>Stock</label>
            <input style={inp} type="number" value={stock} onChange={e => setStock(e.target.value)} min="0" />
          </div>

          {/* Imagen URL */}
          <div>
            <label style={lbl}>URL de imagen principal</label>
            <input style={inp} value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://..." />
          </div>

          {/* Departamento */}
          <div>
            <label style={lbl}>Departamento *</label>
            <select style={inp} value={deptoId} onChange={e => { setDeptoId(e.target.value); setCatId(""); setSubcatId(""); }}>
              <option value="">Seleccionar...</option>
              {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label style={lbl}>Categoría</label>
            <select style={inp} value={catId} onChange={e => { setCatId(e.target.value); setSubcatId(""); }} disabled={!deptoId}>
              <option value="">Seleccionar...</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Subcategoría */}
          {filteredSubs.length > 0 && (
            <div>
              <label style={lbl}>Subcategoría</label>
              <select style={inp} value={subcatId} onChange={e => setSubcatId(e.target.value)} disabled={!catId}>
                <option value="">Seleccionar...</option>
                {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Activo */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <input type="checkbox" id="activo" checked={activo} onChange={e => setActivo(e.target.checked)}
              style={{ width:16, height:16, accentColor: ACCENT }} />
            <label htmlFor="activo" style={{ ...lbl, margin:0, cursor:"pointer" }}>Publicar activo</label>
          </div>

        </div>

        {/* Preview imagen */}
        {imagenUrl && (
          <div style={{ marginTop:"1rem" }}>
            <label style={lbl}>Preview</label>
            <img src={imagenUrl} alt="preview" style={{ width:120, height:120, objectFit:"cover", borderRadius:8, border:"1.5px solid #E5E7EB" }} />
          </div>
        )}

        {/* Botón */}
        <div style={{ marginTop:"1.5rem", display:"flex", gap:"0.75rem" }}>
          <button onClick={handleSubmit} disabled={loading} style={{
            flex:1, padding:"0.7rem", background: loading ? "#ccc" : ACCENT,
            color:"#fff", border:"none", borderRadius:10, fontWeight:800,
            fontSize:"0.95rem", cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Guardando..." : "Publicar artículo"}
          </button>
          <button onClick={() => navigate("/admin/catalog")} style={{
            padding:"0.7rem 1.25rem", background:"transparent", border:"1.5px solid #E5E7EB",
            borderRadius:10, color:"#6B7280", cursor:"pointer", fontSize:"0.875rem",
          }}>
            Ver catálogo
          </button>
        </div>
      </div>
    </div>
  );
}
