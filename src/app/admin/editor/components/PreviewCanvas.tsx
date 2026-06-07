import { useEffect, useRef } from "react";
import { useEditorStore } from "../engine/useEditorStore";

interface Props { sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>; }

export default function PreviewCanvas({ sourceCanvasRef }: Props) {
  const store   = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const sync = () => {
    const src = sourceCanvasRef.current;
    const dst = canvasRef.current;
    const w   = wrapRef.current;
    if (!src || !dst || !w || !store.src) return;
    const maxW = w.clientWidth  - 8;
    const maxH = w.clientHeight - 8;
    const scale = Math.min(maxW / src.width, maxH / src.height, 1);
    dst.width  = Math.round(src.width  * scale);
    dst.height = Math.round(src.height * scale);
    const ctx = dst.getContext("2d")!;
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0, dst.width, dst.height);
  };

  useEffect(() => {
    const id = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(id);
  });

  return (
    <div ref={wrapRef} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      {!store.src ? (
        <div style={{ color:"#555", fontSize:"12px", textAlign:"center" }}>
          <div style={{ fontSize:"28px", marginBottom:"8px" }}>👁</div>
          El preview aparece aquí<br/>en tiempo real
        </div>
      ) : (
        <canvas ref={canvasRef} style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
      )}
    </div>
  );
}


