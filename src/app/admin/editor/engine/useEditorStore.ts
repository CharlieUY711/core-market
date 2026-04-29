import { create } from "zustand";

export interface EditorState {
  brightness: number; contrast: number; exposure: number;
  saturation: number; temperature: number; tint: number;
  sharpness: number; blur: number;
  rotation: number; fineRotation: number;
  flipH: boolean; flipV: boolean;
  zoom: number; filter: string;
  src: HTMLImageElement | null;
  originalDataUrl: string | null;
  originalName: string;
  versionCount: number;
  bgRemoved: boolean; offsetX: number; offsetY: number; scaleX: number; scaleY: number;
  bgColor: string;
  aspectRatio: string | null;
  activeTool: string | null;
  history: { label: string; snap: string }[];
  histIdx: number;
}

export interface EditorActions {
  set: (key: keyof EditorState, value: any) => void;
  setSrc: (img: HTMLImageElement, dataUrl: string, name?: string) => void;
  saveHistory: (label: string) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  bumpVersion: (img: HTMLImageElement, dataUrl: string) => void;
}

const DEFAULTS = {
  brightness:0, contrast:0, exposure:0, saturation:0, temperature:0, tint:0,
  sharpness:0, blur:0, rotation:0, fineRotation:0, flipH:false, flipV:false,
  zoom:1, filter:"none", bgRemoved:false, bgColor:"transparent", aspectRatio:null, activeTool:null, offsetX:0, offsetY:0, scaleX:1, scaleY:1, history:[], histIdx:-1
};

export const useEditorStore = create<EditorState & EditorActions>((s, g) => ({
  ...DEFAULTS,
  src: null, originalDataUrl: null, originalName: "imagen", versionCount: 0,

  set: (key, value) => s({ [key]: value } as any),

  setSrc: (img, dataUrl, name = "imagen") => {
    s({ ...DEFAULTS, src: img, originalDataUrl: dataUrl, originalName: name, versionCount: 0 });
    setTimeout(() => g().saveHistory("Imagen cargada"), 0);
  },

  bumpVersion: (img, dataUrl) => {
    const count = g().versionCount + 1;
    s({ ...DEFAULTS, src: img, originalDataUrl: dataUrl, versionCount: count });
    setTimeout(() => g().saveHistory(`Version V${count} grabada`), 0);
  },

  saveHistory: (label) => {
    const state = g();
    const snap = JSON.stringify({
      brightness:state.brightness, contrast:state.contrast, exposure:state.exposure,
      saturation:state.saturation, temperature:state.temperature, tint:state.tint,
      sharpness:state.sharpness, blur:state.blur, rotation:state.rotation,
      fineRotation:state.fineRotation, flipH:state.flipH, flipV:state.flipV,
      zoom:state.zoom, filter:state.filter, bgColor:state.bgColor, aspectRatio:state.aspectRatio
    });
    let hist = state.history.slice(0, state.histIdx + 1);
    hist = [...hist, { label, snap }].slice(-20);
    s({ history: hist, histIdx: hist.length - 1 });
  },

  undo: () => {
    const { histIdx, history } = g();
    if (histIdx <= 0) return;
    const snap = JSON.parse(history[histIdx - 1].snap);
    s({ ...snap, histIdx: histIdx - 1 });
  },

  redo: () => {
    const { histIdx, history } = g();
    if (histIdx >= history.length - 1) return;
    const snap = JSON.parse(history[histIdx + 1].snap);
    s({ ...snap, histIdx: histIdx + 1 });
  },

  reset: () => {
    s({ brightness:0, contrast:0, exposure:0, saturation:0, temperature:0, tint:0,
        sharpness:0, blur:0, rotation:0, fineRotation:0, flipH:false, flipV:false,
        zoom:1, filter:"none", bgColor:"transparent", aspectRatio:null, activeTool:null });
    setTimeout(() => g().saveHistory("Reset"), 0);
  }
}));
