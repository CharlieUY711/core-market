import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "../engine/useEditorStore";
import { buildCSSFilter } from "../engine/filters";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRender?: () => void;
}

type Zone = "center"|"corner-tl"|"corner-tr"|"corner-bl"|"corner-br"|"side-l"|"side-r"|"side-t"|"side-b"|null;

function getZone(x: number, y: number, w: number, h: number): Zone {
  const edgeSize = 0.15;
  const fx = x / w, fy = y / h;
  const inCornerX = fx < edgeSize || fx > 1 - edgeSize;
  const inCornerY = fy < edgeSize || fy > 1 - edgeSize;
  if (inCornerX && inCornerY) {
    if (fx < 0.5 && fy < 0.5) return "corner-tl";
    if (fx > 0.5 && fy < 0.5) return "corner-tr";
    if (fx < 0.5 && fy > 0.5) return "corner-bl";
    return "corner-br";
  }
  if (fx < edgeSize) return "side-l";
  if (fx > 1 - edgeSize) return "side-r";
  if (fy < edgeSize) return "side-t";
  if (fy > 1 - edgeSize) return "side-b";
  return "center";
}

function getCursor(zone: Zone): string {
  switch(zone) {
    case "center":    return "move";
    case "corner-tl": return "nw-resize";
    case "corner-tr": return "ne-resize";
    case "corner-bl": return "sw-resize";
    case "corner-br": return "se-resize";
    case "side-l":
    case "side-r":    return "ew-resize";
    case "side-t":
    case "side-b":    return "ns-resize";
    default:          return "crosshair";
  }
}

function getZoneLabel(zone: Zone): string {
  switch(zone) {
    case "center":    return "✥ Mover";
    case "corner-tl":
    case "corner-tr":
    case "corner-bl":
    case "corner-br": return "⤡ Escalar";
    case "side-l":
    case "side-r":    return "↔ Ancho";
    case "side-t":
    case "side-b":    return "↕ Alto";
    default:          return "";
  }
}

export default function EditCanvas({ canvasRef, onRender }: Props) {
  const store   = useEditorStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number | null>(null);
  const [zone, setZone] = useState<Zone>(null);
  const [tooltip, setTooltip] = useState({ x:0, y:0, label:"" });
  const isDragging = useRef(false);
  const dragStart  = useRef({ x:0, y:0 });

  const render = useCallback(() => {
    const src = store.src;
    const c   = canvasRef.current;
    const w   = wrapRef.current;
    if (!src || !c || !w) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const r   = store.fineRotation * Math.PI / 180;
      const cos = Math.abs(Math.cos(r)), sin = Math.abs(Math.sin(r));

      let srcW = src.width, srcH = src.height;
      if (store.aspectRatio && store.aspectRatio !== "circle") {
        const [rw, rh] = store.aspectRatio.split(":").map(Number);
        if (rw > 0 && rh > 0) {
          const imgAspect = srcW / srcH;
          const targetAspect = rw / rh;
          if (imgAspect > targetAspect) srcW = Math.round(srcH * targetAspect);
          else srcH = Math.round(srcW / targetAspect);
        }
      }

      const rW  = srcW * cos + srcH * sin;
      const rH  = srcW * sin + srcH * cos;
      const maxW = w.clientWidth - 24, maxH = w.clientHeight - 24;
      const scale = Math.min(maxW / rW, maxH / rH, 1) * store.zoom;
      c.width  = Math.round(rW * scale);
      c.height = Math.round(rH * scale);

      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);

      if (store.aspectRatio === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c.width/2, c.height/2, c.width/2-2, c.height/2-2, 0, 0, Math.PI*2);
        ctx.clip();
      }

      if (store.bgColor && store.bgColor !== "transparent") {
        ctx.fillStyle = store.bgColor;
        ctx.fillRect(0, 0, c.width, c.height);
      }

      ctx.save();
      ctx.translate(c.width/2, c.height/2);
      if (store.flipH) ctx.scale(-1, 1);
      if (store.flipV) ctx.scale(1, -1);
      ctx.rotate(store.rotation * Math.PI / 180 + r);
      ctx.filter = buildCSSFilter(store);
      ctx.drawImage(src,
        (src.width - srcW)/2, (src.height - srcH)/2, srcW, srcH,
        -srcW*scale/2, -srcH*scale/2, srcW*scale, srcH*scale
      );
      ctx.restore();
      if (store.aspectRatio === "circle") ctx.restore();

      // Overlay zona activa
      if (zone && zone !== "center") {
        ctx.strokeStyle = "#FF7A00";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        const m = 8;
        if (zone.startsWith("corner")) {
          const x = zone.includes("r") ? c.width - m*4 : m;
          const y = zone.includes("b") ? c.height - m*4 : m;
          ctx.strokeRect(x, y, m*4, m*4);
        } else if (zone === "side-l" || zone === "side-r") {
          const x = zone === "side-l" ? m : c.width - m*2;
          ctx.strokeRect(x, c.height*0.25, m, c.height*0.5);
        } else {
          const y = zone === "side-t" ? m : c.height - m*2;
          ctx.strokeRect(c.width*0.25, y, c.width*0.5, m);
        }
        ctx.setLineDash([]);
      }

      // Overlay herramienta de selección
      if (store.activeTool === "select-rect") {
        ctx.strokeStyle = "#FF7A00";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(c.width*0.15, c.height*0.15, c.width*0.7, c.height*0.7);
        ctx.setLineDash([]);
        [[0.15,0.15],[0.85,0.15],[0.15,0.85],[0.85,0.85]].forEach(([fx,fy]) => {
          ctx.fillStyle = "#FF7A00";
          ctx.fillRect(c.width*fx-4, c.height*fy-4, 8, 8);
        });
      }
      if (store.activeTool === "select-circ") {
        ctx.strokeStyle = "#FF7A00";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.ellipse(c.width/2, c.height/2, c.width*0.35, c.height*0.35, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (onRender) onRender();
    });
  }, [store, zone, canvasRef, onRender]);

  useEffect(() => { render(); }, [
    store.src, store.brightness, store.contrast, store.exposure,
    store.saturation, store.temperature, store.tint, store.sharpness,
    store.blur, store.rotation, store.fineRotation,
    store.flipH, store.flipV, store.zoom,
    store.bgColor, store.aspectRatio, store.activeTool, zone, render
  ]);

  const getCanvasPos = (e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.src) return;
    const pos = getCanvasPos(e);
    if (!pos || pos.x < 0 || pos.y < 0 || pos.x > pos.w || pos.y > pos.h) {
      setZone(null); return;
    }
    const z = getZone(pos.x, pos.y, pos.w, pos.h);
    setZone(z);
    setTooltip({ x: e.nativeEvent.offsetX + 12, y: e.nativeEvent.offsetY - 20, label: getZoneLabel(z) });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.src || !zone) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !store.src) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (zone === "center") {
      // mover — por ahora solo zoom como feedback visual
    } else if (zone?.startsWith("corner")) {
      const newZoom = Math.max(0.1, Math.min(5, store.zoom + (dx + dy) * 0.005));
      store.set("zoom", newZoom);
    } else if (zone === "side-l" || zone === "side-r") {
      const newZoom = Math.max(0.1, Math.min(5, store.zoom + dx * 0.005));
      store.set("zoom", newZoom);
    } else if (zone === "side-t" || zone === "side-b") {
      const newZoom = Math.max(0.1, Math.min(5, store.zoom + dy * 0.005));
      store.set("zoom", newZoom);
    }
  };

  const handleMouseUp = () => { isDragging.current = false; };

  const cursor = store.src && zone ? getCursor(zone) : store.activeTool ? "crosshair" : "default";

  return (
    <div ref={wrapRef}
      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:"12px", position:"relative", cursor }}
      onMouseMove={e => { handleMouseMove(e); handleMouseDrag(e); }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setZone(null); isDragging.current = false; }}
    >
      <canvas ref={canvasRef}
        style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:"6px", display: store.src ? "block" : "none" }}
      />
      {!store.src && (
        <div style={{ color:"#bbb", fontSize:"12px", textAlign:"center", position:"absolute" }}>
          <div style={{ fontSize:"32px", marginBottom:"8px" }}>✏️</div>
          Carga una imagen para editar
        </div>
      )}
      {zone && tooltip.label && store.src && (
        <div style={{
          position:"absolute", left: tooltip.x, top: tooltip.y,
          background:"rgba(0,0,0,0.7)", color:"#fff",
          fontSize:"10px", padding:"3px 8px", borderRadius:"4px",
          pointerEvents:"none", whiteSpace:"nowrap"
        }}>{tooltip.label}</div>
      )}
    </div>
  );
}