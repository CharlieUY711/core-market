import { useState, useEffect, useCallback } from "react";
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
  imagenes?: any[];
  stock: number;
  condicion?: string;
  departamento_nombre?: string;
  categoria_nombre?: string;
  atributos?: Record<string, any>;
  descripcion?: string;
  rating_promedio?: number;
  rating_count?: number;
  impresiones?: number;
  clicks?: number;
  ranking_score?: number;
  created_at: string;
  published_at?: string;
  deleted_at?: string;
  baja_prevista?: string;
  sync_ml?: boolean;
  sync_meta?: boolean;
  sync_wa?: boolean;
  mkt_destacado?: boolean;
  mkt_promovido?: boolean;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  active:   { label: "Activo",   bg: "#dcfce7", color: "#166534" },
  draft:    { label: "Borrador", bg: "#F3F4F6", color: "#6B7280" },
  paused:   { label: "Pausado",  bg: "#fef9c3", color: "#854d0e" },
  inactive: { label: "Inactivo", bg: "#fee2e2", color: "#991b1b" },
  deleted:  { label: "Eliminado",bg: "#fee2e2", color: "#991b1b" },
};

const ALL_COLS = [
  { id:"depto",     label:"Departamento" },
  { id:"categoria", label:"Categoría" },
  { id:"marca",     label:"Marca" },
  { id:"ranking",   label:"Ranking" },
  { id:"ctr",       label:"CTR" },
  { id:"alta",      label:"Fecha alta" },
  { id:"baja",      label:"Baja prevista" },
  { id:"mkt1",      label:"MKT Acción 1" },
  { id:"mkt2",      label:"MKT Acción 2" },
];

function fmtFecha(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-UY", { day:"2-digit", month:"2-digit", year:"2-digit" });
}

function fmtPrecio(n: number, moneda = "UYU") {
  return moneda + " " + Number(n).toLocaleString("es-UY");
}

export default function AdminPublicaciones() {
  const navigate = useNavigate();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [filterTipo, setFilterTipo]     = useState<"all"|"market"|"secondhand">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [visibleCols, setVisibleCols]   = useState<Set<string>>(new Set(["depto","alta","baja"]));
  const [showColPicker, setShowColPicker] = useState(false);
  const [toast, setToast] = useState<{text:string;ok:boolean}|null>(null);

  const notify = (text: string, ok = true) => {
    setToast({text,ok}); setTimeout(()=>setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("articulos")
      .select("*")
      .eq("vendedor_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setArticulos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Selección
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Acciones individuales
  const cambiarStatus = async (id: string, status: string) => {
    await supabase.from("articulos").update({ status }).eq("id", id);
    setArticulos(prev => prev.map(a => a.id === id ? {...a, status} : a));
    notify("Estado actualizado");
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este artículo?")) return;
    await supabase.from("articulos").update({ deleted_at: new Date().toISOString(), status:"deleted" }).eq("id", id);
    setArticulos(prev => prev.filter(a => a.id !== id));
    notify("Eliminado");
  };

  // Acciones por lote
  const accionLote = async (accion: string) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (accion === "activar")  await supabase.from("articulos").update({ status:"active"  }).in("id", ids);
    if (accion === "pausar")   await supabase.from("articulos").update({ status:"paused"  }).in("id", ids);
    if (accion === "eliminar") {
      if (!confirm(`¿Eliminar ${ids.length} artículo(s)?`)) return;
      await supabase.from("articulos").update({ deleted_at: new Date().toISOString(), status:"deleted" }).in("id", ids);
    }
    notify("Acción aplicada a " + ids.length + " artículo(s)");
    setSelected(new Set());
    load();
  };

  const filtered = articulos.filter(a => {
    if (filterTipo !== "all" && a.tipo !== filterTipo) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total:   articulos.length,
    activos: articulos.filter(a => a.status==="active").length,
    borradores: articulos.filter(a => a.status==="draft").length,
    clicks:  articulos.reduce((s,a) => s+(a.clicks||0), 0),
  };

  const thStyle: React.CSSProperties = {
    padding:"0.5rem 0.75rem", textAlign:"left", fontSize:"11px",
    fontWeight:700, color:"#6B7280", textTransform:"uppercase",
    letterSpacing:".05em", borderBottom:"2px solid #F3F4F6",
    background:"#FAFAFA", whiteSpace:"nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding:"0.6rem 0.75rem", fontSize:"0.82rem", color:"#374151",
    borderBottom:"1px solid #F9FAFB", verticalAlign:"middle",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

      {toast && (
        <div style={{ position:"fixed", bottom:"1.5rem", right:"1.5rem", zIndex:9999,
          padding:"0.75rem 1.25rem", borderRadius:10, fontWeight:600, fontSize:"0.875rem",
          background: toast.ok?"#f0fdf4":"#fef2f2",
          color: toast.ok?"#166534":"#dc2626",
          border:`1px solid ${toast.ok?"#6BB87A":"#ef4444"}`,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:"1.25rem", fontWeight:800, color:"#111", margin:0 }}>Mis Publicaciones</h1>
          <p style={{ fontSize:"0.8rem", color:"#6B7280", margin:"2px 0 0" }}>
            Market y Second Hand · {articulos.length} artículos
          </p>
        </div>
        <button onClick={() => navigate("/admin/catalog/articulos")} style={{
          padding:"0.6rem 1.25rem", background:ACCENT, color:"#fff",
          border:"none", borderRadius:10, fontWeight:700, fontSize:"0.875rem", cursor:"pointer",
        }}>+ Nuevo artículo</button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.6rem" }}>
        {[
          { label:"Total",      value:stats.total,      color:BLUE   },
          { label:"Activos",    value:stats.activos,    color:GREEN  },
          { label:"Borradores", value:stats.borradores, color:"#F59E0B" },
          { label:"Clicks",     value:stats.clicks,     color:ACCENT },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"0.75rem 1rem",
            border:"1px solid #F3F4F6", borderLeft:`3px solid ${s.color}` }}>
            <div style={{ fontSize:"1.4rem", fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:"0.72rem", color:"#6B7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barra de herramientas */}
      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"center" }}>

        {/* Filtros tipo */}
        <div style={{ display:"flex", gap:"3px" }}>
          {(["all","market","secondhand"] as const).map(f => (
            <button key={f} onClick={() => setFilterTipo(f)} style={{
              padding:"0.35rem 0.7rem", borderRadius:7, fontSize:"0.78rem",
              border:`1.5px solid ${filterTipo===f?ACCENT:"#E5E7EB"}`,
              background: filterTipo===f?"rgba(255,122,0,.08)":"#fff",
              color: filterTipo===f?ACCENT:"#6B7280",
              fontWeight: filterTipo===f?700:400, cursor:"pointer",
            }}>
              {f==="all"?"Todos":f==="market"?"🛍 Market":"♻️ SH"}
            </button>
          ))}
        </div>

        {/* Filtros status */}
        <div style={{ display:"flex", gap:"3px" }}>
          {["all","active","draft","paused"].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} style={{
              padding:"0.35rem 0.7rem", borderRadius:7, fontSize:"0.78rem",
              border:`1.5px solid ${filterStatus===f?BLUE:"#E5E7EB"}`,
              background: filterStatus===f?"rgba(15,52,96,.08)":"#fff",
              color: filterStatus===f?BLUE:"#6B7280",
              fontWeight: filterStatus===f?700:400, cursor:"pointer",
            }}>
              {f==="all"?"Todos":STATUS_CFG[f]?.label||f}
            </button>
          ))}
        </div>

        {/* Acciones lote */}
        {selected.size > 0 && (
          <div style={{ display:"flex", gap:"4px", marginLeft:"0.5rem",
            padding:"0.3rem 0.75rem", background:"rgba(15,52,96,.06)",
            borderRadius:8, border:`1px solid ${BLUE}` }}>
            <span style={{ fontSize:"0.78rem", color:BLUE, fontWeight:700, marginRight:"4px" }}>
              {selected.size} sel.
            </span>
            {[
              { id:"activar", label:"✓ Activar",    color:GREEN  },
              { id:"pausar",  label:"⏸ Pausar",     color:"#F59E0B" },
              { id:"ml",      label:"🟡 Sync ML",   color:"#FFE600" },
              { id:"eliminar",label:"🗑 Eliminar",  color:"#EF4444" },
            ].map(ac => (
              <button key={ac.id} onClick={() => accionLote(ac.id)} style={{
                padding:"0.25rem 0.6rem", fontSize:"0.75rem", fontWeight:600,
                border:`1px solid ${ac.color}`, borderRadius:6,
                background:"#fff", color:ac.id==="ml"?"#333":ac.color, cursor:"pointer",
              }}>{ac.label}</button>
            ))}
          </div>
        )}

        {/* Selector columnas */}
        <div style={{ marginLeft:"auto", position:"relative" }}>
          <button onClick={() => setShowColPicker(p=>!p)} style={{
            padding:"0.35rem 0.75rem", border:"1.5px solid #E5E7EB",
            borderRadius:7, background:"#fff", color:"#6B7280",
            fontSize:"0.78rem", cursor:"pointer", fontWeight:600,
          }}>⚙ Columnas</button>
          {showColPicker && (
            <div style={{ position:"absolute", right:0, top:"110%", background:"#fff",
              border:"1.5px solid #E5E7EB", borderRadius:10, padding:"0.75rem",
              zIndex:100, minWidth:180, boxShadow:"0 4px 16px rgba(0,0,0,.1)" }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#6B7280", marginBottom:"0.5rem" }}>
                Columnas opcionales
              </div>
              {ALL_COLS.map(col => (
                <label key={col.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                  padding:"0.25rem 0", cursor:"pointer", fontSize:"0.82rem", color:"#374151" }}>
                  <input type="checkbox"
                    checked={visibleCols.has(col.id)}
                    onChange={() => setVisibleCols(prev => {
                      const n = new Set(prev);
                      n.has(col.id) ? n.delete(col.id) : n.add(col.id);
                      return n;
                    })}
                    style={{ accentColor:ACCENT }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #F3F4F6",
        overflow:"auto", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"3rem", color:"#9CA3AF" }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"3rem" }}>
            <div style={{ fontSize:"3rem" }}>📦</div>
            <div style={{ fontWeight:700, color:"#374151", marginTop:"0.5rem" }}>Sin publicaciones</div>
            <div style={{ color:"#9CA3AF", fontSize:"0.875rem", marginTop:"0.25rem" }}>
              Publicá tu primer artículo
            </div>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width:36 }}>
                  <input type="checkbox"
                    checked={selected.size===filtered.length && filtered.length>0}
                    onChange={toggleAll}
                    style={{ accentColor:ACCENT }}
                  />
                </th>
                <th style={{ ...thStyle, width:52 }}>Foto</th>
                <th style={thStyle}>Nombre</th>
                <th style={{ ...thStyle, width:70 }}>Tipo</th>
                <th style={{ ...thStyle, width:100 }}>Precio</th>
                <th style={{ ...thStyle, width:60 }}>Stock</th>
                <th style={{ ...thStyle, width:90 }}>Estado</th>
                <th style={{ ...thStyle, width:90, textAlign:"center" }}>Sync</th>
                {visibleCols.has("depto")     && <th style={thStyle}>Departamento</th>}
                {visibleCols.has("categoria") && <th style={thStyle}>Categoría</th>}
                {visibleCols.has("marca")     && <th style={thStyle}>Marca</th>}
                {visibleCols.has("ranking")   && <th style={{ ...thStyle, width:75 }}>Ranking</th>}
                {visibleCols.has("ctr")       && <th style={{ ...thStyle, width:60 }}>CTR</th>}
                {visibleCols.has("alta")      && <th style={{ ...thStyle, width:80 }}>Alta</th>}
                {visibleCols.has("baja")      && <th style={{ ...thStyle, width:80 }}>Baja</th>}
                {visibleCols.has("mkt1")      && <th style={{ ...thStyle, width:90 }}>MKT 1</th>}
                {visibleCols.has("mkt2")      && <th style={{ ...thStyle, width:90 }}>MKT 2</th>}
                <th style={{ ...thStyle, width:36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const cfg = STATUS_CFG[a.status] || STATUS_CFG.draft;
                const isExp = expanded.has(a.id);
                const isSel = selected.has(a.id);
                const ctr = a.impresiones ? Math.round((a.clicks||0)/a.impresiones*100) : 0;
                const marca = a.atributos?.marca || "—";
                return (
                  <>
                    <tr key={a.id} style={{
                      background: isSel ? "rgba(255,122,0,.04)" : isExp ? "#FAFAFA" : "#fff",
                      transition:"background .1s",
                    }}>
                      {/* Checkbox */}
                      <td style={tdStyle}>
                        <input type="checkbox" checked={isSel}
                          onChange={() => toggleOne(a.id)}
                          style={{ accentColor:ACCENT }}
                        />
                      </td>

                      {/* Foto */}
                      <td style={tdStyle}>
                        <div style={{ width:40, height:40, borderRadius:6, overflow:"hidden",
                          background:"#F3F4F6", flexShrink:0 }}>
                          {a.imagen_principal
                            ? <img src={a.imagen_principal + "?width=80"} alt={a.nombre}
                                style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                            : <div style={{ width:"100%", height:"100%", display:"flex",
                                alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>
                                {a.tipo==="secondhand"?"♻️":"🛍"}
                              </div>
                          }
                        </div>
                      </td>

                      {/* Nombre */}
                      <td style={{ ...tdStyle, maxWidth:200 }}>
                        <div style={{ fontWeight:600, color:"#111", overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.nombre}</div>
                        {a.condicion && (
                          <div style={{ fontSize:"10px", color:"#6B7280" }}>{a.condicion}</div>
                        )}
                      </td>

                      {/* Tipo */}
                      <td style={tdStyle}>
                        <span style={{ fontSize:"11px", padding:"2px 7px", borderRadius:20, fontWeight:700,
                          background: a.tipo==="secondhand"?"rgba(29,200,120,.1)":"rgba(255,122,0,.1)",
                          color: a.tipo==="secondhand"?GREEN:ACCENT }}>
                          {a.tipo==="secondhand"?"SH":"MKT"}
                        </span>
                      </td>

                      {/* Precio */}
                      <td style={{ ...tdStyle, fontWeight:700, color:ACCENT }}>
                        {fmtPrecio(a.precio, a.moneda)}
                      </td>

                      {/* Stock */}
                      <td style={{ ...tdStyle, textAlign:"center" }}>
                        <span style={{ color: a.stock===0?"#EF4444":a.stock<5?"#F59E0B":"#374151",
                          fontWeight: a.stock<5?700:400 }}>
                          {a.stock}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span style={{ fontSize:"11px", padding:"2px 8px", borderRadius:20,
                          background:cfg.bg, color:cfg.color, fontWeight:700 }}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Sync */}
                      <td style={{ ...tdStyle, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:"4px", justifyContent:"center" }}>
                          {[
                            { key:"sync_ml",   icon:"🟡", title:"MercadoLibre" },
                            { key:"sync_meta", icon:"🔵", title:"Meta" },
                            { key:"sync_wa",   icon:"🟢", title:"WhatsApp" },
                          ].map(s => (
                            <span key={s.key} title={s.title} style={{
                              fontSize:"14px", opacity: (a as any)[s.key] ? 1 : 0.25,
                              cursor:"pointer",
                            }}>{s.icon}</span>
                          ))}
                        </div>
                      </td>

                      {/* Columnas opcionales */}
                      {visibleCols.has("depto")     && <td style={tdStyle}>{a.departamento_nombre||"—"}</td>}
                      {visibleCols.has("categoria") && <td style={tdStyle}>{a.categoria_nombre||"—"}</td>}
                      {visibleCols.has("marca")     && <td style={tdStyle}>{marca}</td>}
                      {visibleCols.has("ranking")   && <td style={{ ...tdStyle, textAlign:"center" }}>
                        {a.ranking_score ? Number(a.ranking_score).toFixed(2) : "—"}
                      </td>}
                      {visibleCols.has("ctr")       && <td style={{ ...tdStyle, textAlign:"center" }}>{ctr}%</td>}
                      {visibleCols.has("alta")      && <td style={tdStyle}>{fmtFecha(a.published_at||a.created_at)}</td>}
                      {visibleCols.has("baja")      && <td style={tdStyle}>
                        <span style={{ color: a.baja_prevista ? "#EF4444" : "#9CA3AF" }}>
                          {fmtFecha(a.baja_prevista||a.deleted_at)}
                        </span>
                      </td>}
                      {visibleCols.has("mkt1") && <td style={{ ...tdStyle, textAlign:"center" }}>
                        <input type="checkbox" title="MKT Acción 1"
                          checked={a.mkt_destacado||false} style={{ accentColor:ACCENT }}
                          onChange={()=>{}} />
                      </td>}
                      {visibleCols.has("mkt2") && <td style={{ ...tdStyle, textAlign:"center" }}>
                        <input type="checkbox" title="MKT Acción 2"
                          checked={a.mkt_promovido||false} style={{ accentColor:ACCENT }}
                          onChange={()=>{}} />
                      </td>}

                      {/* Expandir */}
                      <td style={tdStyle}>
                        <button onClick={() => toggleExpand(a.id)} style={{
                          background:"none", border:"none", cursor:"pointer",
                          color:"#9CA3AF", fontSize:"14px", padding:"2px 4px",
                          transform: isExp?"rotate(180deg)":"rotate(0deg)",
                          transition:"transform .2s",
                        }}>▼</button>
                      </td>
                    </tr>

                    {/* Fila expandida */}
                    {isExp && (
                      <tr key={a.id+"-exp"}>
                        <td colSpan={99} style={{ padding:0, borderBottom:"2px solid #F3F4F6" }}>
                          <div style={{ padding:"1rem 1.25rem", background:"#F9FAFB",
                            display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>

                            {/* Info */}
                            <div>
                              <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#9CA3AF",
                                textTransform:"uppercase", marginBottom:"0.5rem" }}>Información</div>
                              <div style={{ fontSize:"0.82rem", color:"#374151", lineHeight:1.8 }}>
                                <div><b>ID:</b> <span style={{ fontFamily:"monospace", fontSize:"10px" }}>{a.id.slice(0,16)}</span></div>
                                <div><b>Depto:</b> {a.departamento_nombre||"—"}</div>
                                <div><b>Categoría:</b> {a.categoria_nombre||"—"}</div>
                                <div><b>Marca:</b> {marca}</div>
                                {a.condicion && <div><b>Condición:</b> {a.condicion}</div>}
                                {a.descripcion && (
                                  <div style={{ marginTop:"0.25rem", color:"#6B7280", fontSize:"0.78rem",
                                    lineHeight:1.5 }}>{a.descripcion.slice(0,200)}{a.descripcion.length>200?"…":""}</div>
                                )}
                              </div>
                            </div>

                            {/* Métricas */}
                            <div>
                              <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#9CA3AF",
                                textTransform:"uppercase", marginBottom:"0.5rem" }}>Métricas</div>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                                {[
                                  { label:"Impresiones", value: a.impresiones||0 },
                                  { label:"Clicks",      value: a.clicks||0 },
                                  { label:"CTR",         value: (a.impresiones?(((a.clicks||0)/a.impresiones)*100).toFixed(1):0)+"%"},
                                  { label:"Ranking",     value: a.ranking_score?Number(a.ranking_score).toFixed(3):"—" },
                                  { label:"Rating",      value: a.rating_promedio?Number(a.rating_promedio).toFixed(1)+" ★":"—" },
                                  { label:"Reseñas",     value: a.rating_count||0 },
                                ].map(m => (
                                  <div key={m.label} style={{ background:"#fff", borderRadius:8,
                                    padding:"0.4rem 0.6rem", border:"1px solid #E5E7EB" }}>
                                    <div style={{ fontSize:"9px", color:"#9CA3AF", textTransform:"uppercase" }}>{m.label}</div>
                                    <div style={{ fontWeight:700, color:"#374151" }}>{m.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Acciones */}
                            <div>
                              <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#9CA3AF",
                                textTransform:"uppercase", marginBottom:"0.5rem" }}>Acciones</div>
                              <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                                {a.status !== "active" && (
                                  <button onClick={() => cambiarStatus(a.id,"active")} style={{
                                    padding:"0.4rem 0.75rem", background:GREEN, color:"#fff",
                                    border:"none", borderRadius:7, fontWeight:700,
                                    fontSize:"0.8rem", cursor:"pointer", textAlign:"left",
                                  }}>✓ Activar</button>
                                )}
                                {a.status === "active" && (
                                  <button onClick={() => cambiarStatus(a.id,"paused")} style={{
                                    padding:"0.4rem 0.75rem", background:"none", color:"#854d0e",
                                    border:"1.5px solid #F59E0B", borderRadius:7, fontWeight:700,
                                    fontSize:"0.8rem", cursor:"pointer", textAlign:"left",
                                  }}>⏸ Pausar</button>
                                )}
                                {a.status === "draft" && (
                                  <button onClick={() => cambiarStatus(a.id,"active")} style={{
                                    padding:"0.4rem 0.75rem", background:ACCENT, color:"#fff",
                                    border:"none", borderRadius:7, fontWeight:700,
                                    fontSize:"0.8rem", cursor:"pointer", textAlign:"left",
                                  }}>🚀 Publicar</button>
                                )}
                                <button onClick={() => navigate("/admin/catalog/articulos?edit="+a.id)} style={{
                                  padding:"0.4rem 0.75rem", background:"none", color:BLUE,
                                  border:`1.5px solid ${BLUE}`, borderRadius:7, fontWeight:700,
                                  fontSize:"0.8rem", cursor:"pointer", textAlign:"left",
                                }}>✏ Editar</button>
                                <div style={{ display:"flex", gap:"4px", marginTop:"0.25rem" }}>
                                  {[
                                    { icon:"🟡", label:"ML",   tip:"Sync MercadoLibre" },
                                    { icon:"🔵", label:"Meta", tip:"Sync Meta" },
                                    { icon:"🟢", label:"WA",   tip:"Sync WhatsApp" },
                                  ].map(s => (
                                    <button key={s.label} title={s.tip} style={{
                                      flex:1, padding:"0.35rem", fontSize:"11px",
                                      border:"1.5px solid #E5E7EB", borderRadius:6,
                                      background:"#fff", cursor:"pointer", fontWeight:600, color:"#374151",
                                    }}>{s.icon} {s.label}</button>
                                  ))}
                                </div>
                                <button onClick={() => eliminar(a.id)} style={{
                                  padding:"0.4rem 0.75rem", background:"none", color:"#EF4444",
                                  border:"1.5px solid #EF4444", borderRadius:7, fontWeight:700,
                                  fontSize:"0.8rem", cursor:"pointer", textAlign:"left", marginTop:"0.25rem",
                                }}>🗑 Eliminar</button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}