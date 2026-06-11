/**
 * useEditorLifecycle.js — Capa 5: Ciclo de vida
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor\src\lifecycle\useEditorLifecycle.js
 *
 * Maneja:
 *   - mount:    inicialización del canvas, carga de initialImage
 *   - update:   render reactivo cuando cambian adj o filtro
 *   - unmount:  limpieza de refs, URLs, memoria
 *   - errors:   captura y reporte de errores del canvas
 */

import { useEffect, useCallback, useRef } from "react";
import { applyPixelAdjustments, bakeFilterToPixels } from "../components/effects/effectsEngine.js";
import { FILTERS } from "../design/designSystem.js";
import { validateFile, makeError, ERROR_CODES } from "../contract/toolContract.js";

export function useEditorLifecycle({
  // Refs
  canvasRef,
  cleanImgRef,
  // Estado
  adj,
  activeFilter,
  canvasDims,
  // Setters
  setImgEl,
  setFileName,
  setOriginalSrc,
  setCanvasDims,
  setOutW,
  setOutH,
  setZoomLevel,
  resetAdj,
  setActiveFilter,
  // Historia
  histRef,
  setHistoryLen,
  setHistPos,
  // Config
  config,
  // Callbacks externos
  onReady,
  onError,
  onChange,
  // Estado actual para onChange
  imgEl,
  fileName,
  outputFormat,
  historyLen,
  histPos,
}) {

  // ── Objeto URL activo — para limpiar en unmount ────────────────────────────
  const objectUrlsRef = useRef([]);

  const trackUrl = (url) => { objectUrlsRef.current.push(url); return url; };

  // ── mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (onReady) onReady();

    // Cleanup al desmontar
    return () => {
      // Revocar todos los object URLs creados
      objectUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      objectUrlsRef.current = [];

      // Limpiar canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Limpiar refs de imagen
      cleanImgRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── update: render reactivo ────────────────────────────────────────────────
  const render = useCallback((adjOverride, filterOverride) => {
    const canvas = canvasRef.current;
    const base   = cleanImgRef.current;
    if (!canvas || !base) return;

    try {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      ctx.drawImage(base, 0, 0);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyPixelAdjustments(data, adjOverride ?? adj);
      ctx.putImageData(data, 0, 0);

      const fid = filterOverride ?? activeFilter;
      const flt = FILTERS.find(f => f.id === fid);
      canvas.style.filter = flt?.id !== "none" ? flt.css : "none";
    } catch (err) {
      const toolError = makeError(ERROR_CODES.CANVAS_ERROR, "Error al renderizar canvas", err.message);
      if (onError) onError(toolError);
      else console.error("[ToolEditor] Canvas error:", err);
    }
  }, [adj, activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { render(); }, [render]);

  // ── onChange: notificar al exterior cuando cambia el estado ───────────────
  useEffect(() => {
    if (!onChange) return;
    onChange({
      hasImage:     !!imgEl,
      fileName,
      dimensions:   canvasDims,
      activeFilter,
      outputFormat,
      isDirty:      historyLen > 1,
      historyPos:   histPos,
      historyLen,
    });
  }, [imgEl, fileName, canvasDims, activeFilter, outputFormat, historyLen, histPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── fitToView ─────────────────────────────────────────────────────────────
  const fitToView = useCallback((cw, ch) => {
    const wrap = document.getElementById("ce-wrap");
    if (!wrap) return;
    const maxW = wrap.clientWidth - 40, maxH = wrap.clientHeight - 40;
    setZoomLevel(Math.min(1, Math.min(maxW/cw, maxH/ch)));
  }, [setZoomLevel]);

  // ── saveSnap ──────────────────────────────────────────────────────────────
  const saveSnap = useCallback((canvas) => {
    const snap = canvas.toDataURL();
    const h    = histRef.current;
    const max  = config?.limits?.historySteps ?? 50;
    // Limitar historial al máximo configurado
    const list = [...h.list.slice(0, h.idx+1), snap].slice(-max);
    h.list = list;
    h.idx  = list.length - 1;
    setHistoryLen(list.length);
    setHistPos(h.idx);
  }, [histRef, setHistoryLen, setHistPos, config]);

  // ── loadSnap ──────────────────────────────────────────────────────────────
  const loadSnap = useCallback((src) => {
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.filter = "none";
      canvas.width = image.width; canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      cleanImgRef.current = image;
      setImgEl(image);
      setCanvasDims({ w:image.width, h:image.height });
      fitToView(image.width, image.height);
    };
    image.src = src;
  }, [canvasRef, cleanImgRef, setImgEl, setCanvasDims, fitToView]);

  // ── loadImage ─────────────────────────────────────────────────────────────
  const loadImage = useCallback((file) => {
    // Validar archivo contra contrato
    const validation = validateFile(file, config);
    if (!validation.ok) {
      if (onError) onError(validation.error);
      else alert(validation.error.message);
      return;
    }

    const objectUrl = trackUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = ev => {
      const src   = ev.target.result;
      const image = new Image();
      image.onerror = () => {
        const err = makeError(ERROR_CODES.CANVAS_ERROR, "No se pudo cargar la imagen");
        if (onError) onError(err);
      };
      image.onload = () => {
        // Validar dimensiones
        const maxW = config?.limits?.maxWidthPx  ?? 8000;
        const maxH = config?.limits?.maxHeightPx ?? 8000;
        if (image.width > maxW || image.height > maxH) {
          const err = makeError(ERROR_CODES.FILE_TOO_LARGE,
            `Imagen demasiado grande: ${image.width}×${image.height}. Máximo: ${maxW}×${maxH}`);
          if (onError) onError(err);
          else alert(err.message);
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.style.filter = "none";
        canvas.width  = image.width;
        canvas.height = image.height;
        canvas.getContext("2d").drawImage(image, 0, 0);
        cleanImgRef.current = image;
        setImgEl(image);
        setOriginalSrc(src);
        setFileName(file.name);
        setCanvasDims({ w:image.width, h:image.height });
        setOutW(image.width);
        setOutH(image.height);
        resetAdj();
        setActiveFilter("none");
        fitToView(image.width, image.height);
        histRef.current = { list:[], idx:-1 };
        saveSnap(canvas);
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  }, [config, onError, canvasRef, cleanImgRef, setImgEl, setOriginalSrc,
      setFileName, setCanvasDims, setOutW, setOutH, resetAdj,
      setActiveFilter, fitToView, histRef, saveSnap]);

  // ── commitToBase ──────────────────────────────────────────────────────────
  const commitToBase = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const flt = FILTERS.find(f => f.id === activeFilter);
    if (flt && flt.id !== "none") bakeFilterToPixels(canvas, flt.css);
    canvas.style.filter = "none";
    const newBase = new Image();
    newBase.onload = () => {
      cleanImgRef.current = newBase;
      setImgEl(newBase);
      setActiveFilter("none");
      resetAdj();
      saveSnap(canvas);
    };
    newBase.src = canvas.toDataURL();
  }, [activeFilter, canvasRef, cleanImgRef, setImgEl, setActiveFilter, resetAdj, saveSnap]);

  return {
    render,
    fitToView,
    saveSnap,
    loadSnap,
    loadImage,
    commitToBase,
    trackUrl,
  };
}

// ─── Error Boundary (class component — React requirement) ─────────────────────

import { Component } from "react";

export class ToolEditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const toolError = makeError(ERROR_CODES.CANVAS_ERROR, error.message, info.componentStack);
    if (this.props.onError) this.props.onError(toolError);
    else console.error("[ToolEditor] Error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", height:"100vh", gap:12,
          fontFamily:"monospace", background:"#f0efea",
        }}>
          <div style={{ fontSize:32 }}>⚠</div>
          <div style={{ fontSize:14, color:"#333" }}>ToolEditor encontró un error</div>
          <div style={{ fontSize:11, color:"#888", maxWidth:400, textAlign:"center" }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError:false, error:null })}
            style={{ background:"#111", color:"#fff", border:"none", borderRadius:4,
                     padding:"6px 16px", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
            ↺ reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
