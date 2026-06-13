import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "../../../utils/supabase/client";
import SelectorMediaArticulo from "../components/SelectorMediaArticulo";

interface Depto  { id: string; nombre: string; }
interface Cat    { id: string; nombre: string; departamento_id: string; }
interface SubCat { id: string; nombre: string; categoria_id: string; }

const ACCENT = "#FF7A00";
const BLUE   = "#0F3460";
const GREEN  = "#1DC878";

const CONDICIONES = ["Nuevo","Excelente","Muy bueno","Bueno","Regular","Para reparar"];
const MONEDAS     = ["UYU","USD","EUR"];
const DISPONIBILIDADES = [
  { id:"inmediata",    label:"Inmediata",     desc:"Disponible para envío hoy" },
  { id:"bajo_pedido",  label:"Bajo pedido",   desc:"Se consigue en 3-5 días" },
  { id:"agotado",      label:"Sin stock",     desc:"Pausar publicación" },
];

const STEPS = [
  { id:1, label:"Tipo",       icon:"🏷" },
  { id:2, label:"Información",icon:"📝" },
  { id:3, label:"Imágenes",   icon:"🖼" },
  { id:4, label:"Precio",     icon:"💰" },
  { id:5, label:"Detalles",   icon:"⚙️" },
  { id:6, label:"Revisión",   icon:"✅" },
];

export default function AdminArticulos() {
  const { isAdmin } = useOutletContext<any>() || {};
  const navigate    = useNavigate();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]   = useState<{text:string;ok:boolean}|null>(null);

  // Catálogo
  const [deptos,  setDeptos]  = useState<Depto[]>([]);
  const [cats,    setCats]    = useState<Cat[]>([]);
  const [subcats, setSubcats] = useState<SubCat[]>([]);

  // PASO 1: Tipo
  const [tipo, setTipo] = useState<"market"|"secondhand">("market");

  // PASO 2: Información
  const [nombre,      setNombre]      = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [condicion,   setCondicion]   = useState("Nuevo");

  // PASO 3: Media
  const [imagenes,  setImagenes]  = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // PASO 4: Precio
  const [precio,      setPrecio]      = useState("");
  const [precioOrig,  setPrecioOrig]  = useState("");
  const [moneda,      setMoneda]      = useState("UYU");
  const descuento = precio && precioOrig && parseFloat(precioOrig) > parseFloat(precio)
    ? Math.round((1 - parseFloat(precio) / parseFloat(precioOrig)) * 100)
    : null;

  // PASO 5: Detalles
  const [deptoId,       setDeptoId]       = useState("");
  const [catId,         setCatId]         = useState("");
  const [subcatId,      setSubcatId]      = useState("");
  const [stock,         setStock]         = useState("1");
  const [disponibilidad,setDisponibilidad] = useState("inmediata");
  const [publicarComo,  setPublicarComo]  = useState<"active"|"draft">("active");

  const filteredCats = cats.filter(c => c.departamento_id === deptoId);
  const filteredSubs = subcats.filter(s => s.categoria_id === catId);

  const notify = (text: string, ok = true) => {
    setToast({text, ok});
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      supabase.from("departamentos").select("id, nombre").eq("activo", true).order("orden"),
      supabase.from("categorias").select("id, nombre, departamento_id").eq("activo", true).order("orden"),
      supabase.from("subcategorias").select("id, nombre, categoria_id").eq("activo", true).order("orden"),
    ]).then(([d, c, s]) => {
      setDeptos(d.data || []);
      setCats(c.data || []);
      setSubcats(s.data || []);
    });
  }, []);

  const canNext = (): boolean => {
    if (step === 1) return true;
    if (step === 2) return nombre.trim().length > 0 && descripcion.trim().length > 0;
    if (step === 3) return imagenes.length > 0;
    if (step === 4) return precio.length > 0 && parseFloat(precio) > 0;
    if (step === 5) return true; // departamento opcional temporalmente
    return true;
  };

  const handlePublicar = async () => {
    setLoading(true);
    try {
      const tabla = "articulos";
      const depto = deptos.find(d => d.id === deptoId);
      const authResp = await supabase.auth.getUser();
      const userId = authResp.data?.user?.id;
      if (!userId) throw new Error("Sesión expirada, iniciá sesión nuevamente");
      const { error } = await supabase.from(tabla).insert({
        vendedor_id:         userId,
        tipo, 
        nombre: nombre.trim(), 
        descripcion:         descripcion.trim(),
        precio:              parseFloat(precio),
        precio_original:     precioOrig ? parseFloat(precioOrig) : null,
        moneda,
        stock:               parseInt(stock) || 1,
        imagen_principal:    imagenes[0] || null,
        imagenes:            imagenes.length > 0 ? imagenes.map((url: string, i: number) => ({ url, orden: i, principal: i === 0 })) : [],
        videos:              videoUrls.length > 0 ? videoUrls.map((url: string, i: number) => ({ url, orden: i })) : [],
        departamento_id:     deptoId || null,
        departamento_nombre: depto?.nombre || null,
        condicion:           tipo === "secondhand" ? condicion : null,
        status:              publicarComo === "draft" ? "draft" : disponibilidad === "agotado" ? "inactive" : "active",
        published_at:        publicarComo === "active" ? new Date().toISOString() : null,
      });
      if (error) throw error;
      notify(publicarComo === "draft" ? "Guardado como borrador — podés publicarlo cuando quieras" : "¡Listo! Tu artículo ya está publicado en Charlie Market");
      setTimeout(() => navigate("/admin/catalog"), 1500);
    } catch (e: any) {
      notify(e.message || "Algo salió mal. Intentá de nuevo en un momento", false);
    } finally {
      setLoading(false);
    }
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"0.6rem 0.75rem", border:"1.5px solid #E5E7EB",
    borderRadius:"8px", fontSize:"0.875rem", outline:"none",
    boxSizing:"border-box", fontFamily:"DM Sans, sans-serif", background:"#fff",
  };
  const lbl: React.CSSProperties = {
    fontSize:"0.75rem", fontWeight:700, color:"#374151", marginBottom:"4px", display:"block",
  };
  const card: React.CSSProperties = {
    background:"#fff", borderRadius:14, padding:"1.5rem",
    border:"1px solid #F3F4F6", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ maxWidth:760, margin:"0 auto", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:"10px", fontWeight:600, fontSize:"0.875rem",
          background: toast.ok ? "#f0fdf4" : "#fef2f2",
          color: toast.ok ? "#166534" : "#dc2626",
          border:`1px solid ${toast.ok ? "#6BB87A" : "#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Stepper */}
      <div style={{ ...card, padding:"1rem 1.5rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:0 }}>
          {STEPS.map((s, i) => {
            const done    = step > s.id;
            const active  = step === s.id;
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center", flex: i < STEPS.length-1 ? 1 : 0 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", cursor: done ? "pointer" : "default" }}
                  onClick={() => done && setStep(s.id)}>
                  <div style={{
                    width:32, height:32, borderRadius:"50%", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:"14px",
                    background: done ? GREEN : active ? ACCENT : "#F3F4F6",
                    color: done || active ? "#fff" : "#9CA3AF",
                    fontWeight:700, transition:"all .2s",
                    border: active ? `2px solid ${ACCENT}` : "none",
                  }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <span style={{ fontSize:"10px", fontWeight: active ? 700 : 400,
                    color: active ? ACCENT : done ? GREEN : "#9CA3AF", whiteSpace:"nowrap" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex:1, height:2, background: done ? GREEN : "#E5E7EB",
                    margin:"0 4px", marginBottom:"18px", transition:"background .2s" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenido del paso */}
      <div style={card}>

        {/* PASO 1: Tipo */}
        {step === 1 && (
          <div>
            <h2 style={{ margin:"0 0 0.5rem", fontSize:"1.1rem", fontWeight:800, color:"#111" }}>¿Qué vas a publicar?</h2>
            <p style={{ color:"#6B7280", fontSize:"0.875rem", marginBottom:"1.5rem" }}>
              Elegí el tipo de publicación para tu artículo.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
              {([
                { id:"market",     icon:"🛍", title:"Market",      desc:"Producto nuevo, precio fijo, stock ilimitado" },
                { id:"secondhand", icon:"♻️", title:"Second Hand", desc:"Artículo usado, negociable, unidad única" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTipo(t.id)} style={{
                  padding:"1.5rem", borderRadius:12, textAlign:"left",
                  border:`2px solid ${tipo===t.id ? ACCENT : "#E5E7EB"}`,
                  background: tipo===t.id ? "rgba(255,122,0,0.04)" : "#fff",
                  cursor:"pointer", transition:"all .15s",
                }}>
                  <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>{t.icon}</div>
                  <div style={{ fontWeight:800, fontSize:"1rem", color: tipo===t.id ? ACCENT : "#111", marginBottom:"4px" }}>{t.title}</div>
                  <div style={{ fontSize:"0.8rem", color:"#6B7280", lineHeight:1.4 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: Información */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Información del artículo</h2>
            <div>
              <label style={lbl}>Nombre *</label>
              <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: iPhone 14 Pro 256GB Negro" />
            </div>
            <div>
              <label style={lbl}>Descripción *</label>
              <textarea style={{ ...inp, minHeight:100, resize:"vertical" }}
                value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Describí el artículo con detalle: características, uso, accesorios incluidos..." />
              <div style={{ fontSize:"11px", color:"#9CA3AF", textAlign:"right", marginTop:"3px" }}>
                {descripcion.length} / 2000
              </div>
            </div>
            {tipo === "secondhand" && (
              <div>
                <label style={lbl}>Condición *</label>
                <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                  {CONDICIONES.map(c => (
                    <button key={c} onClick={() => setCondicion(c)} style={{
                      padding:"0.4rem 0.75rem", borderRadius:8, fontSize:"0.8rem",
                      border:`1.5px solid ${condicion===c ? ACCENT : "#E5E7EB"}`,
                      background: condicion===c ? "rgba(255,122,0,0.08)" : "#fff",
                      color: condicion===c ? ACCENT : "#6B7280",
                      fontWeight: condicion===c ? 700 : 400, cursor:"pointer",
                    }}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: Imágenes */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div>
              <h2 style={{ margin:"0 0 4px", fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Imágenes y videos</h2>
              <p style={{ color:"#6B7280", fontSize:"0.875rem", margin:0 }}>
                Seleccioná desde tu Biblioteca. La primera imagen es la principal.
              </p>
            </div>
            <SelectorMediaArticulo
              imagenes={imagenes}
              videos={videoUrls}
              onChangeImagenes={setImagenes}
              onChangeVideos={setVideoUrls}
            />
            {imagenes.length === 0 && (
              <div style={{ padding:"0.75rem", background:"#FFFBEB", border:"1px solid #FDE68A",
                borderRadius:8, fontSize:"0.8rem", color:"#92400E" }}>
                ⚠ Al menos una imagen es obligatoria para publicar.
              </div>
            )}
          </div>
        )}

        {/* PASO 4: Precio */}
        {step === 4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Precio</h2>
            <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 1fr", gap:"1rem" }}>
              <div>
                <label style={lbl}>Moneda</label>
                <select style={inp} value={moneda} onChange={e => setMoneda(e.target.value)}>
                  {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Precio *</label>
                <input style={inp} type="number" value={precio}
                  onChange={e => setPrecio(e.target.value)} placeholder="0" min="0" />
              </div>
              <div>
                <label style={lbl}>Precio original <span style={{ fontWeight:400, color:"#9CA3AF" }}>(sin descuento)</span></label>
                <input style={inp} type="number" value={precioOrig}
                  onChange={e => setPrecioOrig(e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
            {descuento && (
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.75rem 1rem",
                background:"#f0fdf4", border:"1px solid #6BB87A", borderRadius:8 }}>
                <span style={{ fontSize:"1.25rem" }}>🏷</span>
                <span style={{ fontWeight:700, color:"#166534", fontSize:"0.9rem" }}>
                  Descuento del {descuento}% calculado automáticamente
                </span>
              </div>
            )}
            {precio && (
              <div style={{ padding:"1rem", background:"#F9FAFB", borderRadius:8, border:"1px solid #E5E7EB" }}>
                <div style={{ fontSize:"0.8rem", color:"#6B7280", marginBottom:"4px" }}>Vista previa del precio</div>
                {precioOrig && parseFloat(precioOrig) > parseFloat(precio) && (
                  <div style={{ fontSize:"0.9rem", color:"#9CA3AF", textDecoration:"line-through" }}>
                    {moneda} {parseFloat(precioOrig).toLocaleString("es-UY")}
                  </div>
                )}
                <div style={{ fontSize:"1.5rem", fontWeight:900, color:ACCENT }}>
                  {moneda} {parseFloat(precio || "0").toLocaleString("es-UY")}
                </div>
                {descuento && (
                  <div style={{ display:"inline-block", background:ACCENT, color:"#fff",
                    fontSize:"0.75rem", fontWeight:700, padding:"2px 8px", borderRadius:20, marginTop:"4px" }}>
                    -{descuento}% OFF
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 5: Detalles */}
        {step === 5 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Detalles y disponibilidad</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
              <div>
                <label style={lbl}>Departamento *</label>
                <select style={inp} value={deptoId}
                  onChange={e => { setDeptoId(e.target.value); setCatId(""); setSubcatId(""); }}>
                  <option value="">Seleccionar...</option>
                  {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={catId}
                  onChange={e => { setCatId(e.target.value); setSubcatId(""); }}
                  disabled={!deptoId}>
                  <option value="">Seleccionar...</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {filteredSubs.length > 0 && (
                <div>
                  <label style={lbl}>Subcategoría</label>
                  <select style={inp} value={subcatId}
                    onChange={e => setSubcatId(e.target.value)} disabled={!catId}>
                    <option value="">Seleccionar...</option>
                    {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={lbl}>Stock</label>
                <input style={inp} type="number" value={stock}
                  onChange={e => setStock(e.target.value)} min="0" />
              </div>
            </div>
            <div>
              <label style={lbl}>Disponibilidad</label>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {DISPONIBILIDADES.map(d => (
                  <button key={d.id} onClick={() => setDisponibilidad(d.id)} style={{
                    flex:1, padding:"0.75rem", borderRadius:8, textAlign:"left",
                    border:`1.5px solid ${disponibilidad===d.id ? BLUE : "#E5E7EB"}`,
                    background: disponibilidad===d.id ? "rgba(15,52,96,0.06)" : "#fff",
                    cursor:"pointer",
                  }}>
                    <div style={{ fontWeight:700, fontSize:"0.8rem",
                      color: disponibilidad===d.id ? BLUE : "#374151" }}>{d.label}</div>
                    <div style={{ fontSize:"0.72rem", color:"#9CA3AF", marginTop:"2px" }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Publicar como</label>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {([
                  { id:"active", label:"Publicar ahora", icon:"🚀", color:GREEN },
                  { id:"draft",  label:"Guardar borrador", icon:"📋", color:"#6B7280" },
                ] as const).map(p => (
                  <button key={p.id} onClick={() => setPublicarComo(p.id)} style={{
                    flex:1, padding:"0.75rem", borderRadius:8,
                    border:`1.5px solid ${publicarComo===p.id ? p.color : "#E5E7EB"}`,
                    background: publicarComo===p.id ? `${p.color}12` : "#fff",
                    cursor:"pointer", display:"flex", alignItems:"center", gap:"0.5rem",
                  }}>
                    <span style={{ fontSize:"16px" }}>{p.icon}</span>
                    <span style={{ fontWeight:700, fontSize:"0.85rem",
                      color: publicarComo===p.id ? p.color : "#374151" }}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PASO 6: Revisión */}
        {step === 6 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:"#111" }}>Revisión final</h2>

            {/* Preview imagen */}
            {imagenes.length > 0 && (
              <div style={{ display:"flex", gap:"0.5rem" }}>
                {imagenes.slice(0,5).map((url,i) => (
                  <img key={i} src={`${url}?width=100`} alt=""
                    style={{ width:60, height:60, objectFit:"cover", borderRadius:8,
                      border: i===0 ? `2px solid ${ACCENT}` : "1px solid #E5E7EB" }} />
                ))}
                {imagenes.length > 5 && (
                  <div style={{ width:60, height:60, borderRadius:8, background:"#F3F4F6",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"0.8rem", color:"#6B7280", fontWeight:700 }}>
                    +{imagenes.length-5}
                  </div>
                )}
              </div>
            )}

            {/* Resumen */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
              {[
                { label:"Tipo",          value: tipo === "market" ? "🛍 Market" : "♻️ Second Hand" },
                { label:"Nombre",        value: nombre },
                { label:"Precio",        value: `${moneda} ${parseFloat(precio||"0").toLocaleString("es-UY")}${descuento ? ` (-${descuento}%)` : ""}` },
                { label:"Categoría",     value: [deptos.find(d=>d.id===deptoId)?.nombre, cats.find(c=>c.id===catId)?.nombre].filter(Boolean).join(" › ") || "—" },
                { label:"Imágenes",      value: `${imagenes.length} imagen(es) · ${videoUrls.length} video(s)` },
                { label:"Stock",         value: stock },
                { label:"Disponibilidad",value: DISPONIBILIDADES.find(d=>d.id===disponibilidad)?.label || "—" },
                { label:"Publicar como", value: publicarComo === "active" ? "🚀 Publicar ahora" : "📋 Borrador" },
                ...(tipo==="secondhand" ? [{ label:"Condición", value: condicion }] : []),
              ].map(row => (
                <div key={row.label} style={{ padding:"0.65rem 0.85rem", background:"#F9FAFB",
                  borderRadius:8, border:"1px solid #E5E7EB" }}>
                  <div style={{ fontSize:"0.7rem", color:"#9CA3AF", fontWeight:700,
                    textTransform:"uppercase", letterSpacing:".05em", marginBottom:"2px" }}>{row.label}</div>
                  <div style={{ fontSize:"0.875rem", color:"#111", fontWeight:600 }}>{row.value || "—"}</div>
                </div>
              ))}
            </div>

            {/* Descripción preview */}
            {descripcion && (
              <div style={{ padding:"0.75rem", background:"#F9FAFB", borderRadius:8, border:"1px solid #E5E7EB" }}>
                <div style={{ fontSize:"0.7rem", color:"#9CA3AF", fontWeight:700,
                  textTransform:"uppercase", marginBottom:"4px" }}>Descripción</div>
                <div style={{ fontSize:"0.875rem", color:"#374151", lineHeight:1.5 }}>{descripcion}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navegación */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button
          onClick={() => step > 1 ? setStep(s => s-1) : navigate("/admin/catalog")}
          style={{ padding:"0.65rem 1.25rem", background:"transparent",
            border:"1.5px solid #E5E7EB", borderRadius:10,
            color:"#6B7280", cursor:"pointer", fontSize:"0.875rem" }}>
          {step === 1 ? "← Cancelar" : "← Anterior"}
        </button>

        <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
          <span style={{ fontSize:"0.8rem", color:"#9CA3AF" }}>Paso {step} de {STEPS.length}</span>
          {step < 6 ? (
            <button
              onClick={() => canNext() && setStep(s => s+1)}
              disabled={!canNext()}
              style={{ padding:"0.65rem 1.5rem", background: canNext() ? ACCENT : "#E5E7EB",
                color: canNext() ? "#fff" : "#9CA3AF", border:"none",
                borderRadius:10, fontWeight:700, fontSize:"0.875rem",
                cursor: canNext() ? "pointer" : "not-allowed", transition:"all .15s" }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handlePublicar} disabled={loading} style={{
              padding:"0.65rem 1.75rem",
              background: loading ? "#ccc" : publicarComo === "draft" ? BLUE : GREEN,
              color:"#fff", border:"none", borderRadius:10, fontWeight:800,
              fontSize:"0.95rem", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Guardando..." : publicarComo === "draft" ? "💾 Guardar borrador" : "🚀 Publicar artículo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



