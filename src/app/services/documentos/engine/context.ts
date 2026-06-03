import { DocumentoData, RenderContext, RenderOptions, EmpresaConfig } from "../types";

export const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre:       "Charlie Market",
  web:          "charliemarket.com.uy",
  email:        "soporte@core.lat",
  colorPrimary: "#FF7A00",
};

export const DEFAULT_OPTS: Required<RenderOptions> = {
  formato:        "a4",
  autoPrint:      false,
  colorPrimary:   "#FF7A00",
  colorSecondary: "#0F3460",
  locale:         "es-UY",
};

export function buildContext(
  data: DocumentoData,
  opts?: RenderOptions
): RenderContext {
  const merged = { ...DEFAULT_OPTS, ...opts };
  const empresa = { ...DEFAULT_EMPRESA, ...data.empresa };
  const color   = merged.colorPrimary || empresa.colorPrimary || "#FF7A00";
  const fecha   = data.fecha
    ? new Date(data.fecha).toLocaleDateString(merged.locale, { day:"2-digit", month:"2-digit", year:"numeric" })
    : new Date().toLocaleDateString(merged.locale, { day:"2-digit", month:"2-digit", year:"numeric" });

  return { data, opts: merged, empresa, color, fecha };
}
