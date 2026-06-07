// ── Tipos base ───────────────────────────────────────────────────────────────

export type TipoDocumento =
  | "ticket"
  | "remito"
  | "etiqueta_envio"
  | "acuse_recibo"
  | string; // extensible sin romper tipos existentes

export type FormatoDocumento = "a4" | "etiqueta" | "a5";

export interface EmpresaConfig {
  nombre:     string;
  logoUrl?:   string;
  slogan?:    string;
  direccion?: string;
  telefono?:  string;
  email?:     string;
  web?:       string;
  rut?:       string;
  colorPrimary?: string;
  colorSecondary?: string;
}

export interface PersonaDoc {
  id?:       string;
  nombre:    string;
  email?:    string;
  telefono?: string;
  direccion?: string;
  ciudad?:   string;
  pais?:     string;
  docId?:    string;
}

export interface ItemDoc {
  id?:          string;
  descripcion:  string;
  sku?:         string;
  cantidad:     number;
  precioUnit:   number;
  descuento?:   number; // porcentaje 0-100
  moneda?:      string;
}

export interface DocumentoData {
  id:            string;
  fecha?:        string;
  empresa?:      EmpresaConfig;
  comprador?:    PersonaDoc;
  vendedor?:     PersonaDoc;
  items?:        ItemDoc[];
  notas?:        string;
  qrData?:       string;
  trackingCode?: string;
  monto?:        number;
  moneda?:       string;
  meta?:         Record<string, unknown>; // datos extra por tipo
}

export interface RenderOptions {
  formato?:      FormatoDocumento;
  autoPrint?:    boolean;
  colorPrimary?: string;
  colorSecondary?: string;
  locale?:       string;
}

export interface RenderContext {
  data:    DocumentoData;
  opts:    Required<RenderOptions>;
  empresa: EmpresaConfig;
  color:   string;
  fecha:   string;
}

// ── Interfaz que todo template debe implementar ───────────────────────────────
export interface DocumentTemplate {
  tipo:        TipoDocumento;
  label:       string;
  formato:     FormatoDocumento;
  descripcion?: string;
  render(ctx: RenderContext): string;
}

// ── Resultado de subida ───────────────────────────────────────────────────────
export interface DocumentoResult {
  ok:        boolean;
  url?:      string;
  path?:     string;
  tipo:      TipoDocumento;
  ventaId:   string;
  error?:    string;
}



