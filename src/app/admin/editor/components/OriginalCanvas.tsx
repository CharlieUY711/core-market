import { useEffect, useRef } from "react";
import { useEditorStore } from "../engine/useEditorStore";

export default function OriginalCanvas() {
  const store     = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const draw = () => {
    const src = store.originalSrc;
    const c   = canvasRef.current;
    const w   = wrapRef.current;
    if (!src || !c || !w) return;
    requestAnimationFrame(() => {
      const maxW  = w.clientWidth  - 24;
      const maxH  = w.clientHeight - 24;
      if (!maxW || !maxH) return;
      const scale = Math.min(maxW / src.width, maxH / src.height, 1);
      c.width  = Math.round(src.width  * scale);
      c.height = Math.round(src.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.filter = "none";
      ctx.drawImage(src, 0, 0, c.width, c.height);
    });
  };

  useEffect(() => { draw(); }, [store.originalSrc, store.versionCount]);

  const loadFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => store.setSrc(img, f.name);
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(f);
  };

  return (
    <div ref={wrapRef}
      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:"12px", position:"relative" }}
      onDragOver={e => { e.preventDefault(); e.currentTarget.style.outline = "2px dashed #FF7A00"; }}
      onDragLeave={e => { e.currentTarget.style.outline = ""; }}
      onDrop={e => { e.preventDefault(); e.currentTarget.style.outline = ""; const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) loadFile(f); }}
    >
      <canvas
        ref={canvasRef}
        style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:"6px", display: store.originalSrc ? "block" : "none" }}
      />
      {!store.originalSrc && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"12px", color:"#888", cursor:"pointer", position:"absolute" }}
          onClick={() => document.getElementById("emi-file-input")?.click()}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <path d="m8 12 4-4 4 4M12 8v8"/>
          </svg>
          <p style={{ fontSize:"13px", textAlign:"center", lineHeight:1.6 }}>
            Arrastra o hace click<br/>para cargar una imagen
          </p>
          <button
            style={{ background:"#FF7A00", color:"#fff", border:"none", borderRadius:"8px", padding:"8px 20px", fontSize:"13px", fontWeight:500, cursor:"pointer" }}
            onClick={e => { e.stopPropagation(); document.getElementById("emi-file-input")?.click(); }}>
            Subir imagen
          </button>
        </div>
      )}
      {store.versionCount > 0 && (
        <div style={{ position:"absolute", top:"8px", right:"8px", background:"#1DC878", color:"#fff", fontSize:"10px", fontWeight:700, padding:"2px 8px", borderRadius:"20px" }}>
          V{store.versionCount}
        </div>
      )}
      <input id="emi-file-input" type="file" accept="image/*" style={{ display:"none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
    </div>
  );
}