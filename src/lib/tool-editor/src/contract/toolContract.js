/**
 * toolContract.js — Capa 4: Contrato
 * Repositorio: CharlieUY711/tool-editor
 * Path local:  C:\Core\tools\tool-editor\src\contract\toolContract.js
 *
 * Define qué entra, qué sale y qué eventos emite ToolEditor.
 *
 * Uso:
 *   import { DEFAULT_CONFIG, validateConfig, validateFile } from '../contract/toolContract.js'
 *
 * Props disponibles:
 *   <ToolEditor
 *     initialImage={file}
 *     config={config}
 *     onExport={(blob, format) => ...}
 *     onReady={() => ...}
 *     onChange={(state) => ...}
 *     onError={(err) => ...}
 *   />
 */

// ─── Config por defecto ───────────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  features: {
    adjust:           true,
    filters:          true,
    effects:          true,
    format:           true,
    export:           true,
    removeBackground: true,
    watermarkVisible: true,
    watermarkHidden:  true,
    undo:             true,
    dragAndDrop:      true,
  },
  limits: {
    maxFileSizeMB:  50,
    maxWidthPx:     8000,
    maxHeightPx:    8000,
    historySteps:   50,
  },
  export: {
    formats:         ["jpeg","png","webp"],
    defaultFormat:   "jpeg",
    defaultQuality:  90,
    allowClipboard:  true,
  },
  ui: {
    showStatusBar:   true,
    showToolsPanel:  true,
    defaultTab:      "adjust",
    defaultTool:     "select",
  },
  ai: {
    enabled:      true,
    model:        "claude-sonnet-4-20250514",
    apiEndpoint:  "https://api.anthropic.com/v1/messages",
  },
};

// ─── Errores tipificados ──────────────────────────────────────────────────────

export const ERROR_CODES = {
  FILE_TOO_LARGE:   "FILE_TOO_LARGE",
  UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
  CANVAS_ERROR:     "CANVAS_ERROR",
  AI_UNAVAILABLE:   "AI_UNAVAILABLE",
  AI_PARSE_ERROR:   "AI_PARSE_ERROR",
  EXPORT_FAILED:    "EXPORT_FAILED",
  CLIPBOARD_DENIED: "CLIPBOARD_DENIED",
};

export function makeError(code, message, detail = null) {
  return { code, message, detail, timestamp: Date.now() };
}

// ─── Deep merge de config ─────────────────────────────────────────────────────

export function validateConfig(userConfig = {}) {
  return deepMerge(DEFAULT_CONFIG, userConfig);
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] !== null && typeof override[key] === "object"
        && !Array.isArray(override[key]) && typeof base[key] === "object") {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// ─── Validación de archivo entrante ──────────────────────────────────────────

const SUPPORTED_TYPES = [
  "image/jpeg","image/png","image/webp",
  "image/gif","image/bmp","image/tiff",
];

export function validateFile(file, config = DEFAULT_CONFIG) {
  if (!file) return { ok:false, error: makeError(ERROR_CODES.FILE_TOO_LARGE,"No se proporcionó archivo") };
  if (!SUPPORTED_TYPES.includes(file.type))
    return { ok:false, error: makeError(ERROR_CODES.UNSUPPORTED_TYPE,
      `Formato no soportado: ${file.type}`) };
  const maxBytes = config.limits.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes)
    return { ok:false, error: makeError(ERROR_CODES.FILE_TOO_LARGE,
      `Archivo demasiado grande: ${(file.size/1024/1024).toFixed(1)}MB. Máximo: ${config.limits.maxFileSizeMB}MB`) };
  return { ok:true };
}

// ─── Forma del estado que recibe onChange ─────────────────────────────────────
// {
//   hasImage:     boolean
//   fileName:     string
//   dimensions:   { w: number, h: number }
//   activeFilter: string
//   outputFormat: string
//   isDirty:      boolean
//   historyPos:   number
//   historyLen:   number
// }
