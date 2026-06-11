/**
 * EffectsPanel — Panel de efectos para ToolEditor
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor\src\components\effects\EffectsPanel.jsx
 *
 * Efectos disponibles (en orden de prioridad):
 *  1. Blur gaussiano
 *  2. Tilt-shift
 *  3. Pixelado global
 *  4. Pixelado de región (censurar)
 *  5. Marca de agua visible (texto + logo)
 *  6. Marca de agua invisible (esteganografía LSB)
 *
 * Props:
 *  canvasRef     — ref al canvas principal
 *  cleanImgRef   — ref a la imagen base limpia
 *  hasImage      — boolean
 *  onCommit      — función para guardar snapshot después de aplicar
 */

import { useState, useRef } from "react";
import {
  applyGaussianBlur,
  applyTiltShift,
  applyPixelate,
  applyPixelateRegion,
  applyWatermarkVisible,
  applyWatermarkLogo,
  applyWatermarkInvisible,
  readWatermarkInvisible,
} from "./effectsEngine.js";

// ─── Estilos locales ──────────────────────────────────────────────────────────

const E = {
  section:      { border:"1px solid #e0ddd5", borderRadius:6, marginBottom:10, overflow:"hidden" },
  sectionHead:  { display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"8px 10px", background:"#f5f5f3", cursor:"pointer",
                  userSelect:"none" },
  sectionTitle: { fontSize:11, fontWeight:500, color:"#333", display:"flex", alignItems:"center", gap:6 },
  sectionBody:  { padding:"10px 10px 12px" },
  row:          { display:"flex", alignItems:"center", gap:6, marginBottom:6 },
  label:        { fontSize:10, color:"#777", width:80, flexShrink:0 },
  slider:       { flex:1, accentColor:"#00d4aa", cursor:"pointer" },
  value:        { fontSize:10, color:"#00d4aa", width:28, textAlign:"right", flexShrink:0 },
  applyBtn:     { width:"100%", background:"#111", color:"#fff", border:"none",
                  borderRadius:4, padding:"6px", cursor:"pointer", fontSize:11,
                  fontFamily:"inherit", marginTop:4 },
  ghostBtn:     { width:"100%", background:"#f5f5f3", color:"#888",
                  border:"1px solid #e0ddd5", borderRadius:4, padding:"6px",
                  cursor:"pointer", fontSize:11, fontFamily:"inherit", marginTop:4 },
  select:       { flex:1, fontSize:11, padding:"4px 6px", borderRadius:4,
                  border:"1px solid #e0ddd5", background:"#f5f5f3",
                  color:"#333", cursor:"pointer" },
  input:        { flex:1, fontSize:11, padding:"4px 6px", borderRadius:4,
                  border:"1px solid #e0ddd5", background:"#f5f5f3",
                  color:"#333", fontFamily:"inherit" },
  colorInput:   { width:32, height:28, border:"1px solid #e0ddd5",
                  borderRadius:4, cursor:"pointer", padding:2 },
  statusOk:     { fontSize:10, color:"#16a34a", marginTop:4 },
  statusErr:    { fontSize:10, color:"#dc2626", marginTop:4 },
  statusInfo:   { fontSize:10, color:"#7c3aed", marginTop:4 },
  badge:        { fontSize:8, background:"#f3e8ff", color:"#7c3aed",
                  border:"1px solid #d8b4fe", padding:"1px 5px", borderRadius:3 },
  note:         { fontSize:10, color:"#aaa", lineHeight:1.6, marginTop:6 },
  divider:      { height:1, background:"#e0ddd5", margin:"8px 0" },
  regionBox:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:6 },
  numInput:     { width:"100%", fontSize:10, padding:"3px 5px", borderRadius:3,
                  border:"1px solid #e0ddd5", background:"#f5f5f3",
                  color:"#333", fontFamily:"inherit" },
};

// ─── Componente helper ────────────────────────────────────────────────────────

function SliderE({ label, min, max, value, onChange, step=1 }) {
  return (
    <div style={E.row}>
      <span style={E.label}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={E.slider} />
      <span style={E.value}>{value}</span>
    </div>
  );
}

function Section({ title, icon, badge, children, defaultOpen=false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={E.section}>
      <div style={E.sectionHead} onClick={() => setOpen(o => !o)}>
        <div style={E.sectionTitle}>
          <span>{icon}</span>
          <span>{title}</span>
          {badge && <span style={E.badge}>{badge}</span>}
        </div>
        <span style={{ fontSize:10, color:"#aaa" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={E.sectionBody}>{children}</div>}
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export default function EffectsPanel({ canvasRef, cleanImgRef, hasImage, onCommit }) {

  // ── Blur ────────────────────────────────────────────────────────────────────
  const [blurRadius,    setBlurRadius]    = useState(8);
  const [blurStatus,    setBlurStatus]    = useState("");

  // ── Tilt-shift ──────────────────────────────────────────────────────────────
  const [tsFocusY,      setTsFocusY]      = useState(0.5);
  const [tsStrength,    setTsStrength]    = useState(20);
  const [tsBand,        setTsBand]        = useState(0.15);
  const [tsStatus,      setTsStatus]      = useState("");

  // ── Pixelado global ─────────────────────────────────────────────────────────
  const [pxBlock,       setPxBlock]       = useState(12);
  const [pxStatus,      setPxStatus]      = useState("");

  // ── Pixelado región ─────────────────────────────────────────────────────────
  const [prX,           setPrX]           = useState(0);
  const [prY,           setPrY]           = useState(0);
  const [prW,           setPrW]           = useState(200);
  const [prH,           setPrH]           = useState(200);
  const [prBlock,       setPrBlock]       = useState(16);
  const [prStatus,      setPrStatus]      = useState("");

  // ── Watermark visible ────────────────────────────────────────────────────────
  const [wmText,        setWmText]        = useState("© ToolEditor");
  const [wmPosition,    setWmPosition]    = useState("bottomRight");
  const [wmOpacity,     setWmOpacity]     = useState(35);
  const [wmColor,       setWmColor]       = useState("#ffffff");
  const [wmRotation,    setWmRotation]    = useState(-35);
  const [wmMode,        setWmMode]        = useState("tile");
  const [wmFontSize,    setWmFontSize]    = useState(0);
  const [wmLogoFile,    setWmLogoFile]    = useState(null);
  const [wmLogoScale,   setWmLogoScale]   = useState(15);
  const [wmStatus,      setWmStatus]      = useState("");
  const wmLogoRef = useRef();

  // ── Watermark invisible ──────────────────────────────────────────────────────
  const [wiMessage,     setWiMessage]     = useState("");
  const [wiKey,         setWiKey]         = useState("");
  const [wiReadKey,     setWiReadKey]     = useState("");
  const [wiResult,      setWiResult]      = useState("");
  const [wiStatus,      setWiStatus]      = useState("");

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getCanvas = () => canvasRef?.current;

  const withCanvas = (fn, setStatus) => {
    if (!hasImage) { setStatus("Cargá una imagen primero"); return; }
    const canvas = getCanvas();
    if (!canvas)  { setStatus("Error: canvas no disponible"); return; }
    fn(canvas);
  };

  const commit = (canvas, msg, setStatus) => {
    // Actualizar cleanImgRef con el resultado
    const ni = new Image();
    ni.onload = () => { if (cleanImgRef) cleanImgRef.current = ni; };
    ni.src = canvas.toDataURL();
    if (onCommit) onCommit(canvas);
    setStatus(msg);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleBlur = () => withCanvas(canvas => {
    setBlurStatus("⟳ aplicando...");
    setTimeout(() => {
      applyGaussianBlur(canvas, blurRadius);
      commit(canvas, "✓ Blur aplicado", setBlurStatus);
    }, 10);
  }, setBlurStatus);

  const handleTiltShift = () => withCanvas(canvas => {
    setTsStatus("⟳ aplicando...");
    setTimeout(() => {
      applyTiltShift(canvas, tsFocusY, tsStrength, tsBand);
      commit(canvas, "✓ Tilt-shift aplicado", setTsStatus);
    }, 10);
  }, setTsStatus);

  const handlePixelate = () => withCanvas(canvas => {
    applyPixelate(canvas, pxBlock);
    commit(canvas, "✓ Pixelado aplicado", setPxStatus);
  }, setPxStatus);

  const handlePixelateRegion = () => withCanvas(canvas => {
    applyPixelateRegion(canvas, prX, prY, prW, prH, prBlock);
    commit(canvas, `✓ Región (${prW}×${prH}) pixelada`, setPrStatus);
  }, setPrStatus);

  const handleWatermarkText = () => withCanvas(canvas => {
    applyWatermarkVisible(canvas, {
      text:      wmText,
      position:  wmMode === "tile" ? "tile" : wmPosition,
      opacity:   wmOpacity / 100,
      color:     wmColor,
      rotation:  wmRotation,
      fontSize:  wmFontSize,
    });
    commit(canvas, "✓ Marca de agua aplicada", setWmStatus);
  }, setWmStatus);

  const handleWatermarkLogo = () => {
    if (!hasImage)    { setWmStatus("Cargá una imagen primero"); return; }
    if (!wmLogoFile)  { setWmStatus("Seleccioná un logo primero"); return; }
    const canvas = getCanvas();
    const logoImg = new Image();
    logoImg.onload = () => {
      applyWatermarkLogo(canvas, logoImg, {
        position: wmPosition,
        opacity:  wmOpacity / 100,
        scale:    wmLogoScale / 100,
      });
      commit(canvas, "✓ Logo aplicado", setWmStatus);
    };
    logoImg.src = URL.createObjectURL(wmLogoFile);
  };

  const handleWatermarkInvisible = () => withCanvas(canvas => {
    if (!wiMessage) { setWiStatus("Escribí un mensaje para ocultar"); return; }
    const result = applyWatermarkInvisible(canvas, wiMessage, wiKey);
    if (result.ok) {
      commit(canvas, `✓ Mensaje oculto (${result.used}/${result.capacity} bytes)`, setWiStatus);
    } else {
      setWiStatus(`⚠ ${result.error}`);
    }
  }, setWiStatus);

  const handleReadInvisible = () => withCanvas(canvas => {
    const result = readWatermarkInvisible(canvas, wiReadKey);
    if (result.ok) {
      setWiResult(result.message);
      setWiStatus("✓ Mensaje encontrado");
    } else {
      setWiResult("");
      setWiStatus(`⚠ ${result.error}`);
    }
  }, setWiStatus);

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div>

      {/* 1. BLUR GAUSSIANO */}
      <Section title="Blur gaussiano" icon="〜" defaultOpen={true}>
        <SliderE label="Radio" min={1} max={80} value={blurRadius} onChange={setBlurRadius} />
        <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>
          Mayor radio = más desenfoque. Recomendado 5-20 para suavizar, 40+ para fondo.
        </div>
        <button style={E.applyBtn} onClick={handleBlur}>〜 aplicar blur</button>
        {blurStatus && <div style={blurStatus.startsWith("✓") ? E.statusOk : E.statusErr}>{blurStatus}</div>}
      </Section>

      {/* 2. TILT-SHIFT */}
      <Section title="Tilt-shift" icon="◉">
        <SliderE label="Foco Y" min={0} max={1} step={0.01} value={tsFocusY} onChange={setTsFocusY} />
        <SliderE label="Intensidad" min={1} max={60} value={tsStrength} onChange={setTsStrength} />
        <SliderE label="Banda nítida" min={0.03} max={0.5} step={0.01} value={tsBand} onChange={setTsBand} />
        <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>
          Foco Y 0.0 = arriba, 1.0 = abajo. Simula lente de gran angular.
        </div>
        <button style={E.applyBtn} onClick={handleTiltShift}>◉ aplicar tilt-shift</button>
        {tsStatus && <div style={tsStatus.startsWith("✓") ? E.statusOk : E.statusErr}>{tsStatus}</div>}
      </Section>

      {/* 3. PIXELADO GLOBAL */}
      <Section title="Pixelado" icon="⊞">
        <SliderE label="Tamaño bloque" min={2} max={64} value={pxBlock} onChange={setPxBlock} />
        <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>
          Bloque 2 = sutil. Bloque 32+ = efecto 8-bit notorio.
        </div>
        <button style={E.applyBtn} onClick={handlePixelate}>⊞ pixelar imagen</button>
        {pxStatus && <div style={pxStatus.startsWith("✓") ? E.statusOk : E.statusErr}>{pxStatus}</div>}
      </Section>

      {/* 4. PIXELADO DE REGIÓN */}
      <Section title="Censurar región" icon="▩">
        <div style={{ fontSize:10, color:"#777", marginBottom:6 }}>
          Coordenadas en píxeles del canvas original
        </div>
        <div style={E.regionBox}>
          <div>
            <div style={{ fontSize:9, color:"#aaa", marginBottom:2 }}>X</div>
            <input type="number" value={prX} onChange={e=>setPrX(parseInt(e.target.value)||0)} style={E.numInput}/>
          </div>
          <div>
            <div style={{ fontSize:9, color:"#aaa", marginBottom:2 }}>Y</div>
            <input type="number" value={prY} onChange={e=>setPrY(parseInt(e.target.value)||0)} style={E.numInput}/>
          </div>
          <div>
            <div style={{ fontSize:9, color:"#aaa", marginBottom:2 }}>Ancho</div>
            <input type="number" value={prW} onChange={e=>setPrW(parseInt(e.target.value)||1)} style={E.numInput}/>
          </div>
          <div>
            <div style={{ fontSize:9, color:"#aaa", marginBottom:2 }}>Alto</div>
            <input type="number" value={prH} onChange={e=>setPrH(parseInt(e.target.value)||1)} style={E.numInput}/>
          </div>
        </div>
        <SliderE label="Tamaño bloque" min={4} max={64} value={prBlock} onChange={setPrBlock} />
        <button style={E.applyBtn} onClick={handlePixelateRegion}>▩ censurar región</button>
        {prStatus && <div style={prStatus.startsWith("✓") ? E.statusOk : E.statusErr}>{prStatus}</div>}
      </Section>

      {/* 5. MARCA DE AGUA VISIBLE */}
      <Section title="Marca de agua visible" icon="©">

        {/* Modo */}
        <div style={E.row}>
          <span style={E.label}>Modo</span>
          <select value={wmMode} onChange={e=>setWmMode(e.target.value)} style={E.select}>
            <option value="tile">Mosaico diagonal</option>
            <option value="corner">Esquina fija</option>
            <option value="logo">Logo / imagen</option>
          </select>
        </div>

        {wmMode !== "logo" && <>
          {/* Texto */}
          <div style={E.row}>
            <span style={E.label}>Texto</span>
            <input type="text" value={wmText} onChange={e=>setWmText(e.target.value)} style={E.input} placeholder="© Tu marca"/>
          </div>

          {/* Posición (solo en modo corner) */}
          {wmMode === "corner" && (
            <div style={E.row}>
              <span style={E.label}>Posición</span>
              <select value={wmPosition} onChange={e=>setWmPosition(e.target.value)} style={E.select}>
                <option value="bottomRight">Abajo derecha</option>
                <option value="bottomLeft">Abajo izquierda</option>
                <option value="topRight">Arriba derecha</option>
                <option value="topLeft">Arriba izquierda</option>
                <option value="center">Centro</option>
              </select>
            </div>
          )}

          {/* Color */}
          <div style={E.row}>
            <span style={E.label}>Color</span>
            <input type="color" value={wmColor} onChange={e=>setWmColor(e.target.value)} style={E.colorInput}/>
            <span style={{ fontSize:10, color:"#aaa", marginLeft:4 }}>{wmColor}</span>
          </div>

          {/* Opacidad */}
          <SliderE label="Opacidad" min={5} max={100} value={wmOpacity} onChange={setWmOpacity} />

          {/* Rotación (solo tile/corner) */}
          <SliderE label="Rotación" min={-90} max={90} value={wmRotation} onChange={setWmRotation} />

          {/* Tamaño fuente */}
          <SliderE label="Tamaño" min={0} max={200} value={wmFontSize} onChange={setWmFontSize} />
          <div style={{ fontSize:10, color:"#aaa", marginBottom:4 }}>Tamaño 0 = automático (~3% del lado menor)</div>

          <button style={E.applyBtn} onClick={handleWatermarkText}>© aplicar marca de texto</button>
        </>}

        {wmMode === "logo" && <>
          {/* Logo file */}
          <div style={E.row}>
            <span style={E.label}>Logo</span>
            <input ref={wmLogoRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e => setWmLogoFile(e.target.files[0])}/>
            <button style={{ ...E.input, cursor:"pointer", textAlign:"left" }}
              onClick={() => wmLogoRef.current.click()}>
              {wmLogoFile ? wmLogoFile.name : "seleccionar archivo..."}
            </button>
          </div>

          {/* Posición logo */}
          <div style={E.row}>
            <span style={E.label}>Posición</span>
            <select value={wmPosition} onChange={e=>setWmPosition(e.target.value)} style={E.select}>
              <option value="bottomRight">Abajo derecha</option>
              <option value="bottomLeft">Abajo izquierda</option>
              <option value="topRight">Arriba derecha</option>
              <option value="topLeft">Arriba izquierda</option>
              <option value="center">Centro</option>
            </select>
          </div>

          <SliderE label="Opacidad" min={5} max={100} value={wmOpacity} onChange={setWmOpacity} />
          <SliderE label="Escala %" min={3} max={50} value={wmLogoScale} onChange={setWmLogoScale} />
          <button style={E.applyBtn} onClick={handleWatermarkLogo}>© aplicar logo</button>
        </>}

        {wmStatus && <div style={wmStatus.startsWith("✓") ? E.statusOk : E.statusErr}>{wmStatus}</div>}
      </Section>

      {/* 6. MARCA DE AGUA INVISIBLE */}
      <Section title="Marca de agua invisible" icon="🔒" badge="LSB">
        <div style={{ fontSize:10, color:"#7c3aed", marginBottom:8, lineHeight:1.6 }}>
          Oculta un mensaje en los bits menos significativos de los píxeles.
          Invisible al ojo humano. Sobrevive compresión PNG. No sobrevive JPEG.
        </div>

        <div style={E.divider}/>
        <div style={{ fontSize:9, letterSpacing:1, color:"#aaa", textTransform:"uppercase", marginBottom:6 }}>Codificar</div>

        {/* Mensaje */}
        <div style={{ marginBottom:6 }}>
          <div style={{ fontSize:10, color:"#777", marginBottom:3 }}>Mensaje a ocultar</div>
          <textarea value={wiMessage} onChange={e=>setWiMessage(e.target.value)}
            rows={3} placeholder="Texto, metadatos, ID de autor..."
            style={{ ...E.input, width:"100%", resize:"vertical", lineHeight:1.5 }}/>
        </div>

        {/* Clave */}
        <div style={E.row}>
          <span style={E.label}>Clave XOR</span>
          <input type="password" value={wiKey} onChange={e=>setWiKey(e.target.value)}
            placeholder="opcional pero recomendada" style={E.input}/>
        </div>

        <button style={{ ...E.applyBtn, background:"#7c3aed" }} onClick={handleWatermarkInvisible}>
          🔒 ocultar mensaje
        </button>

        <div style={E.divider}/>
        <div style={{ fontSize:9, letterSpacing:1, color:"#aaa", textTransform:"uppercase", marginBottom:6 }}>Decodificar</div>

        {/* Clave lectura */}
        <div style={E.row}>
          <span style={E.label}>Clave XOR</span>
          <input type="password" value={wiReadKey} onChange={e=>setWiReadKey(e.target.value)}
            placeholder="misma clave usada al codificar" style={E.input}/>
        </div>

        <button style={E.ghostBtn} onClick={handleReadInvisible}>
          🔍 leer mensaje oculto
        </button>

        {wiResult && (
          <div style={{ marginTop:8, background:"#f0fdf4", border:"1px solid #bbf7d0",
            borderRadius:4, padding:"6px 8px", fontSize:11, color:"#15803d",
            wordBreak:"break-all", lineHeight:1.6 }}>
            <div style={{ fontSize:9, color:"#16a34a", marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Mensaje encontrado</div>
            {wiResult}
          </div>
        )}

        {wiStatus && (
          <div style={wiStatus.startsWith("✓") ? E.statusOk : wiStatus.startsWith("⚠") ? E.statusErr : E.statusInfo}>
            {wiStatus}
          </div>
        )}

        <div style={E.note}>
          ⚠ Exportar como PNG para preservar la marca invisible. JPEG destruye los LSB al comprimir.
        </div>
      </Section>

    </div>
  );
}
