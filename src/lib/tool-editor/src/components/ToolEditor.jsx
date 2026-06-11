/**
 * ToolEditor — Editor de imágenes profesional
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor
 *
 * BUGS CORREGIDOS v1.1:
 *  1. saveSnap usaba histIdx stale en closures async → ahora usa histRef (useRef)
 *  2. renderCanvas() redibujaba desde imgEl ya modificado → separado cleanImgRef (imagen base limpia)
 *  3. filtro CSS en <canvas> no se exportaba → filtro se hornea en píxeles al exportar
 *  4. shadows / highlights no implementados → implementados con curva de luminancia
 *  5. sharpness / clarity / noise no implementados → implementados con kernels reales
 */

import { useRef, useEffect, useCallback } from "react";
import { S, FILTERS, TOOLS, ASPECT_PRESETS, SOCIAL_PRESETS } from "../design/designSystem.js";
import { useEditorState } from "../state/useEditorState.js";
import { ToolEditorErrorBoundary } from "../lifecycle/useEditorLifecycle.jsx";
import { validateConfig } from "../contract/toolContract.js";
import {
  bakeFilterToPixels,
  estimateFileSize,
  removeBackgroundAI as engineRemoveBgAI,
  removeBackgroundFallback,
} from "./effects/effectsEngine.js";
import EffectsPanel from "./effects/EffectsPanel.jsx";

// ─── Constantes — importadas desde designSystem ───────────────────────────────
// FILTERS, TOOLS, ASPECT_PRESETS, SOCIAL_PRESETS, ADJ_DEFAULTS → designSystem.js



// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SliderRow({ label, id, min=-100, max=100, value, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
      <span style={{ fontSize:10, color:"#777", width:72, flexShrink:0 }}>{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(id, parseInt(e.target.value))}
        style={{ flex:1, accentColor:"#00d4aa", cursor:"pointer" }} />
      <span style={{ fontSize:10, color:"#00d4aa", width:26, textAlign:"right", flexShrink:0 }}>{value}</span>
    </div>
  );
}

function SectionHeader({ label, onReset }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, marginTop:12 }}>
      <span style={{ fontSize:9, letterSpacing:1.5, color:"#444", textTransform:"uppercase" }}>{label}</span>
      {onReset && (
        <button onClick={onReset} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:9, padding:"2px 4px" }}>
          reset
        </button>
      )}
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div style={{ fontSize:10, color:"#3a3a3a", display:"flex", gap:4 }}>
      {label}: <span style={{ color:"#666" }}>{value}</span>
    </div>
  );
}

function FilterThumb({ filter, active, imgEl, onClick }) {
  const ref = useRef();
  useEffect(() => {
    if (!imgEl || !ref.current) return;
    const c = ref.current;
    c.width = 60; c.height = 46;
    c.getContext("2d").drawImage(imgEl, 0, 0, 60, 46);
  }, [imgEl]);
  return (
    <div onClick={onClick} style={{
      background:"#f5f5f3", border:`1.5px solid ${active?"#00d4aa":"#ddd"}`,
      borderRadius:5, cursor:"pointer", overflow:"hidden", transition:"border-color .15s",
      boxShadow: active ? "0 0 0 1px #00d4aa" : "none",
    }}>
      <canvas ref={ref} style={{ width:"100%", height:46, display:"block", filter:filter.css }} />
      <div style={{ fontSize:8, textAlign:"center", padding:"3px 0", color:active?"#00d4aa":"#999" }}>
        {filter.name}
      </div>
    </div>
  );
}

function TbBtn({ onClick, children, dim, accent, danger }) {
  return (
    <button onClick={onClick} style={{
      background: accent?"#00d4aa":"none",
      color: accent?"#fff":danger?"#dc2626":"#666",
      border:"none", padding:"4px 9px", borderRadius:4,
      cursor:"pointer", fontSize:11, opacity:dim?0.35:1,
      fontFamily:"inherit",
    }}>{children}</button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

// ─── Componente interno (sin error boundary) ──────────────────────────────────

function ToolEditorInner({ initialImage, config: userConfig, onExport, onReady, onChange, onError }) {
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  // Capa 4: Contrato — mergear config con defaults
  const config = validateConfig(userConfig);

  // Capa 3: Estado
  const state = useEditorState();
  const {
    cleanImgRef, imgEl, setImgEl,
    fileName, setFileName,
    originalSrc, setOriginalSrc,
    canvasDims, setCanvasDims,
    adj, setAdj, setAdjValue, resetAdj, resetAdjGroup,
    activeFilter, setActiveFilter,
    activeTab, setActiveTab,
    activeTool, setActiveTool,
    zoomLevel, setZoomLevel,
    cropStart, setCropStart,
    cropEnd, setCropEnd,
    isCropping, setIsCropping,
    aspectLock, setAspectLock,
    resetCrop,
    histRef, historyLen, setHistoryLen, histPos, setHistPos,
    bgStatus, setBgStatus,
    bgMessage, setBgMessage,
    tolerance, setTolerance,
    bgPreview, setBgPreview,
    outputFormat, setOutputFormat,
    quality, setQuality,
    outW, setOutW,
    outH, setOutH,
  } = state;


  // ─── FIX #2: render siempre desde cleanImgRef, no desde imgEl modificado ──
  const render = useCallback((adjOverride, filterOverride) => {
    const canvas = canvasRef.current;
    const base   = cleanImgRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    ctx.drawImage(base, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyPixelAdjustments(data, adjOverride ?? adj);
    ctx.putImageData(data, 0, 0);
    // Filtro CSS visual (solo para preview — la exportación lo hornea aparte)
    const fid = filterOverride ?? activeFilter;
    const flt = FILTERS.find(f => f.id === fid);
    canvas.style.filter = flt?.id !== "none" ? flt.css : "none";
  }, [adj, activeFilter]);

  useEffect(() => { render(); }, [render]);

  const fitToView = useCallback((cw, ch) => {
    const wrap = document.getElementById("ce-wrap");
    if (!wrap) return;
    const maxW = wrap.clientWidth - 40, maxH = wrap.clientHeight - 40;
    setZoomLevel(Math.min(1, Math.min(maxW/cw, maxH/ch)));
  }, []);

  // ─── FIX #1: saveSnap con ref para evitar stale histIdx ──────────────────
  const saveSnap = useCallback((canvas) => {
    const snap = canvas.toDataURL();
    const h    = histRef.current;
    h.list     = [...h.list.slice(0, h.idx+1), snap];
    h.idx      = h.list.length - 1;
    setHistoryLen(h.list.length);
    setHistPos(h.idx);
  }, []);

  const loadSnap = useCallback((src) => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      canvas.style.filter = "none";
      canvas.width = image.width; canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      cleanImgRef.current = image;
      setImgEl(image);
      setCanvasDims({ w:image.width, h:image.height });
      fitToView(image.width, image.height);
    };
    image.src = src;
  }, [fitToView]);

  const undo = () => {
    const h = histRef.current;
    if (h.idx <= 0) return;
    h.idx--;
    setHistPos(h.idx);
    loadSnap(h.list[h.idx]);
  };

  const redo = () => {
    const h = histRef.current;
    if (h.idx >= h.list.length-1) return;
    h.idx++;
    setHistPos(h.idx);
    loadSnap(h.list[h.idx]);
  };

  // ─── Cargar imagen ────────────────────────────────────────────────────────
  const loadImage = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const src   = ev.target.result;
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        canvas.style.filter = "none";
        canvas.width  = image.width;
        canvas.height = image.height;
        canvas.getContext("2d").drawImage(image, 0, 0);
        cleanImgRef.current = image;          // FIX #2: guardar base limpia
        setImgEl(image);
        setOriginalSrc(src);
        setFileName(file.name);
        setCanvasDims({ w:image.width, h:image.height });
        setOutW(image.width); setOutH(image.height);
        setAdj({ ...ADJ_DEFAULTS });
        setActiveFilter("none");
        fitToView(image.width, image.height);
        // Resetear historia
        histRef.current = { list:[], idx:-1 };
        saveSnap(canvas);
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  }, [fitToView, saveSnap]);

  // ─── Bake + snapshot: congela el canvas actual como nueva base ────────────
  const commitToBase = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Hornear filtro CSS en píxeles
    const flt = FILTERS.find(f => f.id === activeFilter);
    if (flt && flt.id !== "none") bakeFilterToPixels(canvas, flt.css);
    canvas.style.filter = "none";
    // Nueva imagen base
    const newBase = new Image();
    newBase.onload = () => {
      cleanImgRef.current = newBase;
      setImgEl(newBase);
      setActiveFilter("none");
      setAdj({ ...ADJ_DEFAULTS });
      saveSnap(canvas);
    };
    newBase.src = canvas.toDataURL();
  }, [activeFilter, saveSnap]);

  // ─── IA Remove BG — delega a effectsEngine ───────────────────────────────
  const handleRemoveBG = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !cleanImgRef.current) return;
    setBgStatus("loading");
    try {
      const { subject } = await engineRemoveBgAI(canvas, tolerance, setBgMessage);
      setBgStatus("done");
      setBgMessage(`✓ ${subject}`);
      setBgPreview(canvas.toDataURL());
      const ni = new Image();
      ni.onload = () => { cleanImgRef.current = ni; setImgEl(ni); };
      ni.src = canvas.toDataURL();
      saveSnap(canvas);
    } catch {
      setBgStatus("error");
      setBgMessage("Error IA — usando modo rápido");
      removeBackgroundFallback(canvas, tolerance);
      setBgPreview(canvas.toDataURL());
      const ni = new Image();
      ni.onload = () => { cleanImgRef.current = ni; setImgEl(ni); };
      ni.src = canvas.toDataURL();
      saveSnap(canvas);
      setBgStatus("done"); setBgMessage("✓ Modo rápido aplicado");
    }
  };

  const restoreBg = () => {
    if (!originalSrc) return;
    const image=new Image();
    image.onload=()=>{
      const canvas=canvasRef.current;
      canvas.style.filter="none";
      canvas.width=image.width; canvas.height=image.height;
      canvas.getContext("2d").drawImage(image,0,0);
      cleanImgRef.current=image; setImgEl(image);
      setBgStatus("idle"); setBgMessage(""); setBgPreview(null);
      saveSnap(canvas);
    };
    image.src=originalSrc;
  };

  // ─── Crop ─────────────────────────────────────────────────────────────────
  const onMD = (e) => {
    if (activeTool!=="crop") return;
    const r=canvasRef.current.getBoundingClientRect();
    const x=(e.clientX-r.left)/zoomLevel, y=(e.clientY-r.top)/zoomLevel;
    setCropStart({x,y}); setCropEnd({x,y}); setIsCropping(true);
  };
  const onMM = (e) => {
    if (!isCropping||activeTool!=="crop") return;
    const r=canvasRef.current.getBoundingClientRect();
    let x=(e.clientX-r.left)/zoomLevel, y=(e.clientY-r.top)/zoomLevel;
    if (aspectLock&&cropStart) y=cropStart.y+Math.sign(y-cropStart.y)*Math.abs((x-cropStart.x)/aspectLock);
    setCropEnd({x,y});
  };
  const onMU = () => setIsCropping(false);

  const applyCrop = () => {
    if (!cropStart||!cropEnd||!cleanImgRef.current) return;
    const canvas=canvasRef.current;
    const x=Math.min(cropStart.x,cropEnd.x), y=Math.min(cropStart.y,cropEnd.y);
    const w=Math.abs(cropEnd.x-cropStart.x), h=Math.abs(cropEnd.y-cropStart.y);
    if (w<10||h<10) return;
    // Hornear filtro antes de recortar
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=w; tmp.height=h;
    tmp.getContext("2d").drawImage(canvas,x,y,w,h,0,0,w,h);
    canvas.width=w; canvas.height=h;
    canvas.getContext("2d").drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setCanvasDims({w,h}); fitToView(w,h); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
    setCropStart(null); setCropEnd(null); setActiveTool("select");
  };

  // ─── Transformaciones ─────────────────────────────────────────────────────
  const rotateCanvas = (deg) => {
    if (!cleanImgRef.current) return;
    const canvas=canvasRef.current;
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=canvas.height; tmp.height=canvas.width;
    const tc=tmp.getContext("2d");
    tc.translate(tmp.width/2,tmp.height/2); tc.rotate(deg*Math.PI/180); tc.drawImage(canvas,-canvas.width/2,-canvas.height/2);
    canvas.width=tmp.width; canvas.height=tmp.height; canvas.getContext("2d").drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setCanvasDims({w:canvas.width,h:canvas.height}); fitToView(canvas.width,canvas.height); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
  };

  const flipCanvas = (dir) => {
    if (!cleanImgRef.current) return;
    const canvas=canvasRef.current, ctx=canvas.getContext("2d");
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    const tc=tmp.getContext("2d");
    tc.translate(dir==="h"?canvas.width:0, dir==="v"?canvas.height:0);
    tc.scale(dir==="h"?-1:1, dir==="v"?-1:1); tc.drawImage(canvas,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
  };

  const applyResize = () => {
    if (!cleanImgRef.current) return;
    const canvas=canvasRef.current;
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(canvas,flt.css);
    canvas.style.filter="none";
    const tmp=document.createElement("canvas"); tmp.width=outW; tmp.height=outH;
    tmp.getContext("2d").drawImage(canvas,0,0,outW,outH);
    canvas.width=outW; canvas.height=outH; canvas.getContext("2d").drawImage(tmp,0,0);
    const ni=new Image();
    ni.onload=()=>{ cleanImgRef.current=ni; setImgEl(ni); setCanvasDims({w:outW,h:outH}); fitToView(outW,outH); setActiveFilter("none"); resetAdj(); saveSnap(canvas); };
    ni.src=canvas.toDataURL();
  };

  // ─── FIX #3: Export hornea filtro CSS antes de exportar ──────────────────
  const exportImage = () => {
    const canvas=canvasRef.current; if (!canvas||!cleanImgRef.current) return;
    // Clonar canvas para no mutar el original visible
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    tmp.getContext("2d").drawImage(canvas,0,0);
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(tmp, flt.css); // hornear en copia
    const mime="image/"+outputFormat, q=quality/100;
    if (onExport) { tmp.toBlob(blob=>onExport(blob,outputFormat),mime,q); return; }
    const a=document.createElement("a");
    a.href=tmp.toDataURL(mime,q);
    a.download=`tool-editor-export.${outputFormat==="jpeg"?"jpg":outputFormat}`;
    a.click();
  };

  const copyToClipboard = () => {
    const canvas=canvasRef.current; if (!canvas) return;
    const tmp=document.createElement("canvas"); tmp.width=canvas.width; tmp.height=canvas.height;
    tmp.getContext("2d").drawImage(canvas,0,0);
    const flt=FILTERS.find(f=>f.id===activeFilter);
    if (flt&&flt.id!=="none") bakeFilterToPixels(tmp,flt.css);
    tmp.toBlob(blob=>navigator.clipboard.write([new ClipboardItem({"image/png":blob})])
      .then(()=>alert("Copiado al portapapeles"))
      .catch(()=>alert("Sin permisos de portapapeles")));
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const hasCrop  = cropStart && cropEnd;
  const cropRect = hasCrop ? {
    x: Math.min(cropStart.x,cropEnd.x)*zoomLevel,
    y: Math.min(cropStart.y,cropEnd.y)*zoomLevel,
    w: Math.abs(cropEnd.x-cropStart.x)*zoomLevel,
    h: Math.abs(cropEnd.y-cropStart.y)*zoomLevel,
  } : null;

  const hasImage  = !!cleanImgRef.current;
  const canUndo   = histPos > 0;
  const canRedo   = histPos < historyLen - 1;

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* TOP BAR */}
      <div style={S.topbar}>
        <span style={S.logo}>CORE<span style={{color:"#00d4aa"}}>EDITOR</span></span>
        <div style={S.tbGroup}>
          <TbBtn onClick={()=>fileInputRef.current.click()}>📂 abrir</TbBtn>
          <TbBtn onClick={undo} dim={!canUndo}>↩ deshacer</TbBtn>
          <TbBtn onClick={redo} dim={!canRedo}>↪ rehacer</TbBtn>
        </div>
        <div style={S.tbGroup}>
          <TbBtn onClick={()=>rotateCanvas(-90)}>↺ −90°</TbBtn>
          <TbBtn onClick={()=>rotateCanvas(90)}>↻ +90°</TbBtn>
          <TbBtn onClick={()=>flipCanvas("h")}>⇄ H</TbBtn>
          <TbBtn onClick={()=>flipCanvas("v")}>⇅ V</TbBtn>
        </div>
        <div style={S.tbGroup}>
          <TbBtn onClick={commitToBase}>✓ aplicar todo</TbBtn>
        </div>
        {activeTool==="crop" && (
          <div style={S.tbGroup}>
            <TbBtn onClick={applyCrop} accent>✂ aplicar corte</TbBtn>
            <TbBtn onClick={()=>{setCropStart(null);setCropEnd(null);setActiveTool("select");}} danger>✕ cancelar</TbBtn>
          </div>
        )}
        <div style={{flex:1}}/>
        <span style={{fontSize:11,color:"#aaa",marginRight:8}}>{fileName}</span>
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}}
          onChange={e=>{if(e.target.files[0])loadImage(e.target.files[0]);}}/>
        <button style={S.btnPrimary} onClick={()=>fileInputRef.current.click()}>+ cargar</button>
        <button style={{...S.btnPrimary,...S.btnAccent}} onClick={exportImage}>⬇ exportar</button>
      </div>

      <div style={S.main}>
        {/* HERRAMIENTAS */}
        <div style={S.toolsPanel}>
          {TOOLS.map(t=>(
            <button key={t.id} title={t.label}
              style={{...S.toolBtn,...(activeTool===t.id?S.toolActive:{})}}
              onClick={()=>{setActiveTool(t.id);if(t.id!=="crop"){setCropStart(null);setCropEnd(null);}}}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* CANVAS */}
        <div id="ce-wrap" style={S.canvasWrap}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();if(e.dataTransfer.files[0])loadImage(e.dataTransfer.files[0]);}}>
          <div style={S.checker}/>
          {/* Drop zone — visible solo sin imagen */}
          {!hasImage && (
            <div style={S.dropZone}>
              <div style={{fontSize:52,opacity:.2}}>🖼</div>
              <div style={{fontSize:13,letterSpacing:2,color:"#bbb"}}>ARRASTRA TU IMAGEN AQUÍ</div>
              <div style={{fontSize:10,color:"#999",marginTop:4}}>o usa el botón + cargar</div>
              <button style={{...S.btnPrimary,marginTop:16}} onClick={()=>fileInputRef.current.click()}>+ cargar imagen</button>
            </div>
          )}

          {/* Canvas — SIEMPRE en el DOM, solo oculto visualmente sin imagen */}
          <div style={{position:"relative", display: hasImage ? "flex" : "none", alignItems:"center", justifyContent:"center", width:"100%", height:"100%"}}>
            <canvas ref={canvasRef}
              style={{display:"block", maxWidth:"100%", maxHeight:"100%", width:"auto", height:"auto",
                cursor:TOOLS.find(t=>t.id===activeTool)?.cursor||"default"}}
              onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}/>
            {cropRect && (
              <div style={{position:"absolute",border:"2px solid #00d4aa",background:"rgba(0,212,170,.05)",
                pointerEvents:"none",left:cropRect.x,top:cropRect.y,width:cropRect.w,height:cropRect.h}}>
                {[33.3,66.6].map(p=>(
                  <div key={p} style={{position:"absolute",left:`${p}%`,top:0,bottom:0,borderLeft:"1px solid rgba(255,255,255,.25)"}}/>
                ))}
                {[33.3,66.6].map(p=>(
                  <div key={p} style={{position:"absolute",top:`${p}%`,left:0,right:0,borderTop:"1px solid rgba(255,255,255,.25)"}}/>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO */}
        <div style={S.rightPanel}>
          <div style={S.panelTabs}>
            {["adjust","format","filters","effects","export"].map(tab=>(
              <button key={tab} style={{...S.ptab,...(activeTab===tab?S.ptabActive:{})}}
                onClick={()=>setActiveTab(tab)}>
                {{adjust:"Ajustes",format:"Formato",filters:"Filtros",effects:"Efectos",export:"Export"}[tab]}
              </button>
            ))}
          </div>

          <div style={{padding:"10px 10px 20px",overflowY:"auto",flex:1}}>

            {/* AJUSTES */}
            {activeTab==="adjust" && <>
              {/* Remove BG */}
              <div style={S.aiBanner}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:"#555"}}>Quitar fondo</span>
                  <span style={S.aiBadge}>IA</span>
                </div>
                {bgPreview && (
                  <div style={{width:"100%",height:76,borderRadius:4,border:"1px solid #e0e0e0",overflow:"hidden",
                    marginBottom:8,background:"repeating-conic-gradient(#ddd 0% 25%,#f5f5f5 0% 50%) 0 0/12px 12px"}}>
                    <img src={bgPreview} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                  </div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:10,color:"#888",width:68,flexShrink:0}}>Tolerancia</span>
                  <input type="range" min={5} max={80} value={tolerance}
                    onChange={e=>setTolerance(parseInt(e.target.value))}
                    style={{flex:1,accentColor:"#7c3aed"}}/>
                  <span style={{fontSize:10,color:"#7c3aed",width:22,textAlign:"right"}}>{tolerance}</span>
                </div>
                {bgStatus==="loading" && <div style={{fontSize:10,color:"#7c3aed",marginBottom:6}}>⟳ {bgMessage}</div>}
                {bgStatus==="done"    && <div style={{fontSize:10,color:"#16a34a",marginBottom:6}}>✓ {bgMessage}</div>}
                {bgStatus==="error"   && <div style={{fontSize:10,color:"#dc2626",marginBottom:6}}>⚠ {bgMessage}</div>}
                <button style={{...S.applyBtn,background:"#7c3aed",marginBottom:4}}
                  onClick={handleRemoveBG} disabled={!hasImage||bgStatus==="loading"}>
                  {bgStatus==="loading"?"⟳ procesando...":"🪄 quitar fondo con IA"}
                </button>
                <button style={{...S.applyBtn,...S.applyBtnGhost}} onClick={restoreBg}>↩ restaurar original</button>
              </div>

              <SectionHeader label="Luz" onReset={()=>resetAdjGroup('light')}/>
              {[["Exposición","exposure"],["Contraste","contrast"],["Brillo","brightness"],["Sombras","shadows"],["Altas luces","highlights"]].map(([l,k])=>(
                <SliderRow key={k} label={l} id={k} value={adj[k]} onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              ))}

              <SectionHeader label="Color" onReset={()=>resetAdjGroup('color')}/>
              {[["Saturación","saturation"],["Temperatura","temperature"],["Tinte","tint"],["Vibración","vibrance"]].map(([l,k])=>(
                <SliderRow key={k} label={l} id={k} value={adj[k]} onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              ))}

              <SectionHeader label="Detalle" onReset={()=>resetAdjGroup('detail')}/>
              <SliderRow label="Nitidez"  id="sharpness" min={0} max={100} value={adj.sharpness} onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              <SliderRow label="Claridad" id="clarity"              value={adj.clarity}   onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              <SliderRow label="Ruido"    id="noise"    min={0} max={100} value={adj.noise}     onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>
              <SliderRow label="Viñeta"   id="vignette"             value={adj.vignette}  onChange={(id,v)=>setAdj(a=>({...a,[id]:v}))}/>

              <button style={{...S.applyBtn,marginTop:10}} onClick={commitToBase}>✓ aplicar y congelar</button>
              <button style={{...S.applyBtn,...S.applyBtnGhost,marginTop:4}}
                onClick={()=>{resetAdj();setActiveFilter("none");}}>
                ↺ resetear ajustes
              </button>
            </>}

            {/* FORMATO */}
            {activeTab==="format" && <>
              <SectionHeader label="Relaciones de aspecto"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
                {ASPECT_PRESETS.map(p=>(
                  <button key={p.label} style={S.fmtBtn}
                    onClick={()=>{setAspectLock(p.w/p.h);setActiveTool("crop");}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#222"}}>{p.label}</div>
                    <div style={{fontSize:8,color:"#aaa"}}>{p.tag}</div>
                  </button>
                ))}
              </div>
              <SectionHeader label="Redes sociales"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
                {SOCIAL_PRESETS.map(p=>(
                  <button key={p.label} style={S.fmtBtn}
                    onClick={()=>{setOutW(p.w);setOutH(p.h);}}>
                    <div style={{fontSize:10,color:"#333"}}>{p.label}</div>
                    <div style={{fontSize:8,color:"#aaa"}}>{p.w}×{p.h}</div>
                  </button>
                ))}
              </div>
              <SectionHeader label="Tamaño personalizado"/>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#aaa",marginBottom:3}}>ANCHO (px)</div>
                  <input type="number" value={outW} onChange={e=>setOutW(parseInt(e.target.value)||1)} style={S.numInput}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#aaa",marginBottom:3}}>ALTO (px)</div>
                  <input type="number" value={outH} onChange={e=>setOutH(parseInt(e.target.value)||1)} style={S.numInput}/>
                </div>
              </div>
              <button style={S.applyBtn} onClick={applyResize}>↕ redimensionar</button>
            </>}

            {/* FILTROS */}
            {activeTab==="filters" && <>
              <SectionHeader label="Filtros clásicos"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                {FILTERS.map(f=>(
                  <FilterThumb key={f.id} filter={f} active={activeFilter===f.id}
                    imgEl={cleanImgRef.current} onClick={()=>setActiveFilter(f.id)}/>
                ))}
              </div>
              <button style={{...S.applyBtn,marginTop:10}} onClick={commitToBase}>✓ aplicar filtro</button>
            </>}

            {/* EFECTOS */}
            {activeTab==="effects" && (
              <EffectsPanel
                canvasRef={canvasRef}
                cleanImgRef={cleanImgRef}
                hasImage={hasImage}
                onCommit={(canvas) => saveSnap(canvas)}
              />
            )}

            {/* EXPORT */}
            {activeTab==="export" && <>
              <SectionHeader label="Formato de salida"/>
              <div style={{display:"flex",gap:4,marginBottom:10}}>
                {["jpeg","png","webp"].map(f=>(
                  <button key={f} style={{...S.outBtn,...(outputFormat===f?S.outBtnActive:{})}}
                    onClick={()=>setOutputFormat(f)}>
                    {f==="jpeg"?"JPG":f.toUpperCase()}
                  </button>
                ))}
              </div>
              {outputFormat!=="png" && (
                <SliderRow label="Calidad" id="quality" min={10} max={100}
                  value={quality} onChange={(_,v)=>setQuality(v)}/>
              )}
              <div style={S.sizeCard}>
                <span style={{color:"#888"}}>Tamaño estimado</span>
                <span style={{color:"#16a34a",fontWeight:500}}>
                  {hasImage?estimateFileSize(canvasDims.w,canvasDims.h,outputFormat,quality):"—"}
                </span>
              </div>
              <div style={{...S.sizeCard,marginTop:4}}>
                <span style={{color:"#888"}}>Dimensiones</span>
                <span style={{color:"#00d4aa",fontWeight:500}}>
                  {canvasDims.w>0?`${canvasDims.w} × ${canvasDims.h}`:"— × —"}
                </span>
              </div>
              <div style={{fontSize:10,color:"#aaa",lineHeight:1.9,margin:"10px 0"}}>
                <div>JPG → compresión alta, sin transparencia</div>
                <div>PNG → sin pérdida, soporta transparencia</div>
                <div>WebP → mejor ratio calidad/tamaño</div>
              </div>
              <button style={S.applyBtn} onClick={exportImage}>⬇ descargar imagen</button>
              <button style={{...S.applyBtn,...S.applyBtnGhost,marginTop:4}} onClick={copyToClipboard}>📋 copiar al portapapeles</button>
            </>}
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={S.statusbar}>
        <StatItem label="herramienta" value={activeTool}/>
        <StatItem label="dimensión"   value={canvasDims.w>0?`${canvasDims.w}×${canvasDims.h}`:"—"}/>
        <StatItem label="zoom"        value={`${Math.round(zoomLevel*100)}%`}/>
        <StatItem label="filtro"      value={activeFilter}/>
        <StatItem label="historial"   value={`${histPos+1}/${historyLen}`}/>
        <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center"}}>
          <button style={S.zoomBtn} onClick={()=>setZoomLevel(z=>Math.max(0.05,z-0.25))}>−</button>
          <span style={{fontSize:10,color:"#aaa",minWidth:36,textAlign:"center"}}>{Math.round(zoomLevel*100)}%</span>
          <button style={S.zoomBtn} onClick={()=>setZoomLevel(z=>Math.min(8,z+0.25))}>+</button>
          <button style={{...S.zoomBtn,width:"auto",padding:"0 8px",fontSize:9}}
            onClick={()=>fitToView(canvasDims.w,canvasDims.h)}>fit</button>
        </div>
      </div>
    </div>
  );
}

// ─── Estilos — desde designSystem ────────────────────────────────────────────

// ─── Export default con Error Boundary (Capa 5) ───────────────────────────────

export default function ToolEditor(props) {
  return (
    <ToolEditorErrorBoundary onError={props.onError}>
      <ToolEditorInner {...props} />
    </ToolEditorErrorBoundary>
  );
}






