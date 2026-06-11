/**
 * useEditorState — Capa 3: Estado
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor\src\state\useEditorState.js
 *
 * Custom hook que centraliza todo el estado del editor.
 * ToolEditor solo importa este hook — no declara ningún useState propio.
 *
 * Grupos de estado:
 *   imagen     — imgEl, fileName, originalSrc, canvasDims
 *   ajustes    — adj, activeFilter
 *   ui         — activeTab, activeTool, zoomLevel
 *   crop       — cropStart, cropEnd, isCropping, aspectLock
 *   historial  — histRef, historyLen, histPos
 *   removeBG   — bgStatus, bgMessage, tolerance, bgPreview
 *   export     — outputFormat, quality, outW, outH
 */

import { useState, useRef } from "react";
import { ADJ_DEFAULTS } from "../design/designSystem.js";

export function useEditorState() {

  // ── Imagen base ──────────────────────────────────────────────────────────────
  const cleanImgRef  = useRef(null);   // imagen base limpia (sin ajustes aplicados)
  const [imgEl,        setImgEl]        = useState(null);
  const [fileName,     setFileName]     = useState("sin imagen");
  const [originalSrc,  setOriginalSrc]  = useState(null);
  const [canvasDims,   setCanvasDims]   = useState({ w:0, h:0 });

  // ── Ajustes de imagen ────────────────────────────────────────────────────────
  const [adj,          setAdj]          = useState({ ...ADJ_DEFAULTS });
  const [activeFilter, setActiveFilter] = useState("none");

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState("adjust");
  const [activeTool,   setActiveTool]   = useState("select");
  const [zoomLevel,    setZoomLevel]    = useState(1);

  // ── Crop ─────────────────────────────────────────────────────────────────────
  const [cropStart,    setCropStart]    = useState(null);
  const [cropEnd,      setCropEnd]      = useState(null);
  const [isCropping,   setIsCropping]   = useState(false);
  const [aspectLock,   setAspectLock]   = useState(null);

  // ── Historial (undo/redo) ────────────────────────────────────────────────────
  // Usa ref para evitar stale closure en callbacks async (FIX #1)
  const histRef      = useRef({ list:[], idx:-1 });
  const [historyLen, setHistoryLen]     = useState(0);
  const [histPos,    setHistPos]        = useState(-1);

  // ── Remove BG ────────────────────────────────────────────────────────────────
  const [bgStatus,     setBgStatus]     = useState("idle");
  const [bgMessage,    setBgMessage]    = useState("");
  const [tolerance,    setTolerance]    = useState(30);
  const [bgPreview,    setBgPreview]    = useState(null);

  // ── Export ───────────────────────────────────────────────────────────────────
  const [outputFormat, setOutputFormat] = useState("jpeg");
  const [quality,      setQuality]      = useState(90);
  const [outW,         setOutW]         = useState(1080);
  const [outH,         setOutH]         = useState(1080);

  // ── Acciones de estado compuestas ────────────────────────────────────────────

  /** Resetea todos los ajustes a defaults */
  const resetAdj = () => setAdj({ ...ADJ_DEFAULTS });

  /** Resetea un grupo específico de ajustes */
  const resetAdjGroup = (group) => {
    const groups = {
      light:  ["exposure","contrast","brightness","shadows","highlights"],
      color:  ["saturation","temperature","tint","vibrance"],
      detail: ["sharpness","clarity","noise","vignette"],
    };
    const keys = groups[group] || [];
    setAdj(a => {
      const next = { ...a };
      keys.forEach(k => { next[k] = 0; });
      return next;
    });
  };

  /** Actualiza un ajuste individual */
  const setAdjValue = (key, value) => setAdj(a => ({ ...a, [key]: value }));

  /** Resetea estado de remove BG */
  const resetBg = () => {
    setBgStatus("idle");
    setBgMessage("");
    setBgPreview(null);
  };

  /** Resetea crop */
  const resetCrop = () => {
    setCropStart(null);
    setCropEnd(null);
    setIsCropping(false);
  };

  /** Resetea toda la imagen (nueva carga) */
  const resetImage = () => {
    setImgEl(null);
    setFileName("sin imagen");
    setOriginalSrc(null);
    setCanvasDims({ w:0, h:0 });
    setAdj({ ...ADJ_DEFAULTS });
    setActiveFilter("none");
    cleanImgRef.current = null;
    histRef.current = { list:[], idx:-1 };
    setHistoryLen(0);
    setHistPos(-1);
    resetBg();
    resetCrop();
  };

  // ── Retorno ──────────────────────────────────────────────────────────────────
  return {
    // Imagen
    cleanImgRef, imgEl, setImgEl,
    fileName, setFileName,
    originalSrc, setOriginalSrc,
    canvasDims, setCanvasDims,

    // Ajustes
    adj, setAdj, setAdjValue, resetAdj, resetAdjGroup,
    activeFilter, setActiveFilter,

    // UI
    activeTab, setActiveTab,
    activeTool, setActiveTool,
    zoomLevel, setZoomLevel,

    // Crop
    cropStart, setCropStart,
    cropEnd, setCropEnd,
    isCropping, setIsCropping,
    aspectLock, setAspectLock,
    resetCrop,

    // Historial
    histRef, historyLen, setHistoryLen, histPos, setHistPos,

    // Remove BG
    bgStatus, setBgStatus,
    bgMessage, setBgMessage,
    tolerance, setTolerance,
    bgPreview, setBgPreview,
    resetBg,

    // Export
    outputFormat, setOutputFormat,
    quality, setQuality,
    outW, setOutW,
    outH, setOutH,

    // Compuestas
    resetImage,
  };
}
