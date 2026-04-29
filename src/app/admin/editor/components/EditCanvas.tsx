import { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "../engine/useEditorStore";
import { buildCSSFilter } from "../engine/filters";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRender?: () => void;
}

type Zone = "center"|"corner-tl"|"corner-tr"|"corner-bl"|"corner-br"|"side-l"|"side-r"|"side-t"|"side-b"|null;

function getZone(x: number, y: number, w: number, h: number): Zone {
  const e = 0.15;
  const fx = x/w, fy = y/h;
  const cx = fx < e || fx > 1-e;
  const cy = fy < e || fy > 1-e;
  if (cx && cy) {
    if (fx < 0.5 && fy < 0.5) return "corner-tl";
    if (fx > 0.5 && fy < 0.5) return "corner-tr";
    if (fx < 0.5 && fy > 0.5) return "corner-bl";
    return "corner-br";
  }
  if (fx < e) return "side-l";
  if (fx > 1-e) return "side-r";
  if (fy < e) return "side-t";
  if (fy > 1-e) return "side-b";
  return "center";
}

const CURSORS: Record<string, string> = {
  "center":"move","corner-tl":"nw-resize","corner-tr":"ne-resize",
  "corner-bl":"sw-resize","corner-br":"se-resize",
  "side-l":"ew-resize","side-r":"ew-resize","side-t":"ns-resize","side-b":"ns-resize"
};

const LABELS: Record<string, string> = {
  "center":"✥ Mover","corner-tl":"⤡ Escalar","corner-tr":"⤡ Escalar",
  "corner-bl":"⤡ Escalar","corner-br":"⤡ Escalar",
  "side-l":"↔ Ancho","side-r":"↔ Ancho","side-t":"↕ Alto","side-b":"↕ Alto"
};

export default function EditCanvas({ canvasRef, onRender }: Props) {
  const store   = useEditorStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number | null>(null);
  const [zone, setZone]       = useState<Zone>(null);
  const [tipPos, setTipPos]   = useState({ x:0, y:0 });
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
          const ia = srcW/srcH, ta = rw/rh;
          if (ia > ta) srcW = Math.round(srcH * ta);
          else srcH = Math.round(srcW / ta);
        }
      }
      const rW  = srcW * cos + srcH * sin;
      const rH  = srcW * sin + srcH * cos;
      const maxW = w.clientWidth - 24, maxH = w.clientHeight - 24;
      const baseScale = Math.min(maxW/rW, maxH/rH, 1);
      const sx = baseScale * store.zoom * store.scaleX;
      const sy = baseScale * store.zoom * store.scaleY;

      c.width  = Math.round(rW * Math.max(sx, sy));
      c.height = Math.round(rH * Math.max(sx, sy));

      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);

      // Clip circular
      if (store.aspectRatio === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c.width/2 + store.offsetX, c.height/2 + store.offsetY, c.width/2-2, c.height/2-2, 0, 0, Math.PI*2);
        ctx.clip();
      }

      // Fondo
      if (store.bgColor && store.bgColor !== "transparent") {
        ctx.fillStyle = store.bgColor;
        ctx.fillRect(0, 0, c.width, c.height);
      }

      ctx.save();
      ctx.translate(c.width/2 + store.offsetX, c.height/2 + store.offsetY);
      if (store.flipH) ctx.scale(-1, 1);
      if (store.flipV) ctx.scale(1, -1);
      ctx.rotate(store.rotation * Math.PI / 180 + r);
      ctx.filter = buildCSSFilter(store);
      ctx.drawImage(src,
        (src.width-srcW)/2, (src.height-srcH)/2, srcW, srcH,
        -srcW*sx/2, -srcH*sy/2, srcW*sx, srcH*sy
      );
      ctx.restore();
      if (store.aspectRatio === "circle") ctx.restore();

      // Handles de zona
      if (zone) {
        ctx.strokeStyle = "#FF7A00";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]);
        ctx.strokeRect(8, 8, c.width-16, c.height-16);
        ctx.setLineDash([]);
        const handles = [
          [0,0],[0.5,0],[1,0],
          [0,0.5],[1,0.5],
          [0,1],[0.5,1],[1,1]
        ];
        handles.forEach(([hx,hy]) => {
          ctx.fillStyle = zone?.startsWith("corner") && (hx===0||hx===1) && (hy===0||hy===1) ? "#FF7A00" : "#fff";
          ctx.strokeStyle = "#FF7A00";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.rect(8 + hx*(c.width-20)-4, 8 + hy*(c.height-20)-4, 8, 8);
          ctx.fill();
          ctx.stroke();
        });
      }

      // Overlay selección
      if (store.activeTool === "select-rect") {
        ctx.strokeStyle = "#FF7A00"; ctx.lineWidth = 1.5;
        ctx.setLineDash([5,3]);
        ctx.strokeRect(c.width*0.15, c.height*0.15, c.width*0.7, c.height*0.7);
        ctx.setLineDash([]);
      }
      if (store.activeTool === "select-circ") {
        ctx.strokeStyle = "#FF7A00"; ctx.lineWidth = 1.5;
        ctx.setLineDash([5,3]);
        ctx.beginPath();
        ctx.ellipse(c.width/2, c.height/2, c.width*0.35, c.height*0.35, 0, 0, Math.PI*2);
        ctx.stroke(); ctx.setLineDash([]);
      }

      if (onRender) onRender();
    });
  }, [store, zone, canvasRef, onRender]);

  useEffect(() => { render(); }, [
    store.src, store.brightness, store.contrast, store.exposure,
    store.saturation, store.temperature, store.tint, store.sharpness,
    store.blur, store.rotation, store.fineRotation,
    store.flipH, store.flipV, store.zoom, store.scaleX, store.scaleY,
    store.offsetX, store.offsetY, store.bgColor, store.aspectRatio,
    store.activeTool, zone, render
  ]);

  const getCanvasPos = (e: React.MouseEvent) => {
    const c = canvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX-rect.left, y: e.clientY-rect.top, w: rect.width, h: rect.height };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.src) return;
    const pos = getCanvasPos(e);
    if (!pos || pos.x < 0 || pos.y < 0 || pos.x > pos.w || pos.y > pos.h) {
      if (!isDragging.current) setZone(null); return;
    }
    const z = getZone(pos.x, pos.y, pos.w, pos.h);
    if (!isDragging.current) { setZone(z); setTipPos({ x: pos.x+14, y: pos.y-22 }); }

    // Drag activo
    if (isDragging.current && zone) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      const SENS = 0.005;

      if (zone === "center") {
        store.set("offsetX", store.offsetX + dx);
        store.set("offsetY", store.offsetY + dy);
      } else if (zone?.startsWith("corner")) {
        const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * SENS;
        store.set("scaleX", Math.max(0.1, store.scaleX + delta));
        store.set("scaleY", Math.max(0.1, store.scaleY + delta));
      } else if (zone === "side-l" || zone === "side-r") {
        const dir = zone === "side-r" ? 1 : -1;
        store.set("scaleX", Math.max(0.1, store.scaleX + dx * dir * SENS * 2));
      } else if (zone === "side-t" || zone === "side-b") {
        const dir = zone === "side-b" ? 1 : -1;
        store.set("scaleY", Math.max(0.1, store.scaleY + dy * dir * SENS * 2));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!store.src || !zone) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
      store.saveHistory("Transformación");
    }
  };

  const cursor = store.src && zone ? (CURSORS[zone] || "crosshair") : store.activeTool ? "crosshair" : "default";

  return (
    <div ref={wrapRef}
      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:"12px", position:"relative", cursor, userSelect:"none" }}
      onMouseMove={handleMouseMove}
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
      {zone && store.src && LABELS[zone] && (
        <div style={{
          position:"absolute", left: tipPos.x, top: tipPos.y,
          background:"rgba(0,0,0,.7)", color:"#fff",
          fontSize:"10px", padding:"3px 8px", borderRadius:"4px",
          pointerEvents:"none", whiteSpace:"nowrap", zIndex:10
        }}>{LABELS[zone]}</div>
      )}
    </div>
  );
}