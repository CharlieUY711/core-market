export type ProductoTipo       = "market" | "secondhand";
export type ProductoStatus     = "draft" | "active" | "paused" | "inactive" | "deleted";
export type ProductoMoneda     = "UYU" | "USD" | "EUR";
export type ProductoCondicion  = "Nuevo"|"Excelente"|"Muy bueno"|"Bueno"|"Regular"|"Para reparar";
export type EnvioTipo          = "meli_like" | "custom" | "retiro" | "pickup";
export type FormatoVenta       = "unidad" | "pack" | "lote";
export type GarantiaTipo       = "vendedor" | "fabrica" | "sin_garantia";
export type AtributoTipo       = "string" | "number" | "enum" | "boolean" | "range";

export interface MediaItem {
  url:       string;
  path?:     string;
  bucket?:   string;
  width?:    number;
  height?:   number;
  orden?:    number;
  principal?: boolean;
}

export interface VideoItem {
  url:          string;
  path?:        string;
  bucket?:      string;
  duracion_seg?: number;
  thumbnail?:   string;
  orden?:       number;
}

export interface InfoRegulatoria {
  codigo_arancelario?: string;
  pais_origen?:        string;
  requiere_factura?:   boolean;
  num_registro?:       string;
  advertencias?:       string[];
}

export interface AtributosProducto {
  [clave: string]: string | number | boolean | string[] | null;
}

export interface Producto {
  id:                  string;
  tipo:                ProductoTipo;
  status:              ProductoStatus;
  vendedor_id:         string;

  nombre:              string;
  descripcion?:        string;
  descripcion_html?:   string;
  slug?:               string;

  precio:              number;
  precio_original?:    number;
  descuento_pct?:      number;
  moneda:              ProductoMoneda;
  permite_descuento:   boolean;

  imagen_principal?:   string;
  imagenes:            MediaItem[];
  videos:              VideoItem[];

  departamento_id?:    string;
  departamento_nombre?: string;
  categoria_id?:       string;
  categoria_nombre?:   string;
  subcategoria_id?:    string;

  atributos:           AtributosProducto;
  condicion?:          ProductoCondicion;

  stock:               number;
  stock_ilimitado:     boolean;
  sku?:                string;

  peso_kg?:            number;
  alto_cm?:            number;
  ancho_cm?:           number;
  largo_cm?:           number;

  envio_tipo:          EnvioTipo;
  costo_envio?:        number;
  envio_gratis:        boolean;
  retiro_persona:      boolean;

  formato_venta:       FormatoVenta;
  cantidad_por_pack:   number;

  info_regulatoria:    InfoRegulatoria;
  garantia_tipo?:      GarantiaTipo;
  garantia_meses?:     number;

  visitas:             number;
  favoritos:           number;
  rating_promedio?:    number;
  rating_count:        number;

  created_at:          string;
  updated_at:          string;
  published_at?:       string;
  deleted_at?:         string;
}

export type ProductoInput = Omit<Producto,
  "id" | "descuento_pct" | "visitas" | "favoritos" | "rating_promedio" |
  "rating_count" | "created_at" | "updated_at" | "deleted_at"
> & { id?: string };

export interface AtributoDefinicion {
  id:           string;
  categoria_id: string;
  nombre:       string;
  clave:        string;
  tipo:         AtributoTipo;
  requerido:    boolean;
  opciones?:    string[];
  unidad?:      string;
  placeholder?: string;
  orden:        number;
}

export interface ValidacionError {
  campo:   string;
  mensaje: string;
}

export interface ValidacionResult {
  ok:      boolean;
  errores: ValidacionError[];
}



