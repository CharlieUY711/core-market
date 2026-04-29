import { useRef, useState } from "react";
import { useEditorStore } from "./engine/useEditorStore";
import EditCanvas     from "./components/EditCanvas";
import OriginalCanvas from "./components/OriginalCanvas";
import AdjustPanel    from "./components/AdjustPanel";
import TransformPanel from "./components/TransformPanel";
import EffectsPanel   from "./components/EffectsPanel";
import HistoryPanel   from "./components/HistoryPanel";
import { supabase }   from "../../../utils/supabase/client";

const ACCENT = "#FF7A00";
const BLUE   = "#0F3460";
const GREEN  = "#1DC878";

type Tab = "adjust" | "transform" | "effects";

export default function EditorPage() {
  const store = useEditorStore();
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<Tab>("adjust");
  const [renderCount, setRenderCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const navBtn = (t: Tab, label: string, color: string) => (
    <button onClick={() => setTab(t)} style={{
      flex:1, padding:"7px 4px", background:"none", border:"none",
      borderBottom: tab === t ? `2px solid ${color}` : "2px solid transparent",
      color: tab === t ? color : "#9CA3AF",
      fontSize:"11px", fontWeight: tab === t ? 600 : 400,
      cursor:"pointer", transition:"all .12s"
    }}>{label}</button>
  );

  const topBtn = (label: string, onClick: () => void, color = ACCENT, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"5px 14px", background:"none",
      border:`1.5px solid ${disabled ? "#E5E7EB" : color}`, borderRadius:"7px",
      color: disabled ? "#ccc" : color, fontSize:"12px", fontWeight:500,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>{label}</button>
  );

  const handleGrabar = async () => {
    const canvas = editCanvasRef.current;
    if (!canvas || !store.src) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const folder = user?.id || "public";
      const vNum   = store.versionCount + 1;
      const baseName = store.originalName.replace(/\.[^.]+$/, "");
      const fileName = `${baseName}_V${vNum}.png`;
      const path     = `${folder}/${fileName}`;

      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/png", 0.92));
      const { error } = await supabase.storage.from("biblioteca").upload(path, blob, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("biblioteca").getPublicUrl(path);

      const newImg = new Image();
      newImg.onload = () => {
        store.bumpVersion(newImg);
        setSaveMsg(`Grabado como ${fileName}`);
        setTimeout(() => setSaveMsg(""), 3000);
      };
      newImg.src = publicUrl + "?t=" + Date.now();
    } catch(e: any) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 110px)", minHeight:"500px", fontFamily:"DM Sans, sans-serif" }}>

      {/* Barra superior */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px", background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:"12px", marginBottom:"6px", gap:"8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ fontWeight:700, fontSize:"13px", color:BLUE }}>Editor</span>
          <span style={{ width:"1px", height:"18px", background:"#E5E7EB" }} />
          {topBtn("Subir imagen", () => document.getElementById("emi-file-input")?.click(), ACCENT)}
          {topBtn("Undo", () => store.undo(), BLUE, !store.src)}
          {topBtn("Redo", () => store.redo(), BLUE, !store.src)}
          {topBtn("Reset", () => store.reset(), "#9CA3AF", !store.src)}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          {store.src && <span style={{ fontSize:"11px", color:"#9CA3AF" }}>{store.src.width}x{store.src.height}px</span>}
          {store.versionCount > 0 && <span style={{ fontSize:"10px", color:GREEN, fontWeight:600 }}>V{store.versionCount}</span>}
          {(["+ ","- ","Fit"]).map((l,i) => (
            <button key={i} onClick={() => {
              if(i===0) store.set("zoom",Math.min(store.zoom*1.25,5));
              else if(i===1) store.set("zoom",Math.max(store.zoom/1.25,.1));
              else store.set("zoom",1);
            }} style={{ padding:"3px 7px", border:"0.5px solid #E5E7EB", borderRadius:"5px", background:"#fff", color:"#6B7280", fontSize:"11px", cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Cuerpo: Original | Controles | Editado */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 210px 1fr", flex:1, overflow:"hidden", gap:"6px" }}>

        {/* Canvas Original */}
        <div style={{ display:"flex", flexDirection:"column", background:"#F4F5F7", border:"1.5px solid #E5E7EB", borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ height:"30px", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid #E5E7EB", background:"#fff", flexShrink:0 }}>
            <span style={{ fontSize:"10px", fontWeight:600, color:"#6B7280", padding:"2px 10px", border:"1px solid #E5E7EB", borderRadius:"20px" }}>Original</span>
          </div>
          <OriginalCanvas />
        </div>

        {/* Panel controles central */}
        <div style={{ background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:"12px", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ display:"flex", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
            {navBtn("adjust","Ajustes",ACCENT)}
            {navBtn("transform","Forma",BLUE)}
            {navBtn("effects","FX",GREEN)}
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {tab==="adjust"    && <AdjustPanel />}
            {tab==="transform" && <TransformPanel />}
            {tab==="effects"   && <EffectsPanel />}
          </div>
          <div style={{ borderTop:"1px solid #F3F4F6", flexShrink:0 }}>
            <HistoryPanel />
          </div>
        </div>

        {/* Canvas Editado */}
        <div style={{ display:"flex", flexDirection:"column", background:"#F4F5F7", border:`1.5px solid ${ACCENT}`, borderRadius:"12px", overflow:"hidden" }}>
          <div style={{ height:"30px", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 10px", borderBottom:"1px solid #E5E7EB", background:"#fff", flexShrink:0 }}>
            <span style={{ fontSize:"10px", fontWeight:600, background:ACCENT, color:"#fff", padding:"2px 10px", borderRadius:"20px" }}>Editado</span>
            <span style={{ fontSize:"10px", color:"#9CA3AF" }}>zoom {Math.round(store.zoom*100)}%</span>
          </div>
          <EditCanvas canvasRef={editCanvasRef} onRender={() => setRenderCount(n => n+1)} />
          {/* Barra inferior con Grabar */}
          <div style={{ height:"40px", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 10px", borderTop:"1px solid #E5E7EB", background:"#fff", flexShrink:0 }}>
            <span style={{ fontSize:"10px", color: saveMsg.startsWith("Error") ? "#EF4444" : GREEN }}>
              {saveMsg || (store.src ? `render #${renderCount}` : "")}
            </span>
            <button
              onClick={handleGrabar}
              disabled={saving || !store.src}
              style={{
                padding:"5px 16px", background: store.src ? GREEN : "#ccc",
                color:"#fff", border:"none", borderRadius:"7px",
                fontSize:"12px", fontWeight:600,
                cursor: store.src ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Grabando..." : store.versionCount > 0 ? `Grabar V${store.versionCount + 1}` : "Grabar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}