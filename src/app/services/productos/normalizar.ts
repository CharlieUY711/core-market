import { ProductoInput, ProductoStatus, AtributoDefinicion } from "./types";
import { validarProductoAntesPublicar } from "./validar";

// ── Helpers ────────────────────────────────────────────────────────────────

function limpiarString(s?: string): string {
  return (s || "").trim().replace(/\s+/g, " ");
}

function generarSlug(nombre: string, id?: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const suffix = id ? `-${id.slice(0, 6)}` : `-${Date.now().toString(36)}`;
  return `${base}${suffix}`;
}

function generarSKU(nombre: string, tipo: string, vendedorId?: string): string {
  const prefix   = tipo === "secondhand" ? "SH" : "MK";
  const nameCode = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const vendorCode = (vendedorId || "").replace(/-/g, "").slice(0, 4).toUpperCase();
  const ts         = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${nameCode}-${vendorCode}-${ts}`;
}

function calcularDescuento(precio: number, precioOriginal?: number): number | undefined {
  if (!precioOriginal || precioOriginal <= 0 || precio >= precioOriginal) return undefined;
  return Math.round((1 - precio / precioOriginal) * 100);
}

function determinarStatus(
  producto: Partial<ProductoInput>,
  atributosDefinicion: AtributoDefinicion[] = []
): ProductoStatus {
  if (producto.status === "deleted" || producto.status === "paused") return producto.status;
  const validacion = validarProductoAntesPublicar(producto, atributosDefinicion);
  if (!validacion.ok) return "draft";
  if (!producto.stock_ilimitado && (producto.stock ?? 0) === 0) return "inactive";
  return "active";
}

// ── Función principal ───────────────────────────────────────────────────────

export interface NormalizadorOpts {
  atributosDefinicion?: AtributoDefinicion[];
  forzarStatus?:        ProductoStatus;
  vendedorId?:          string;
}

export function normalizarProductoParaPublicacion(
  input: Partial<ProductoInput>,
  opts: NormalizadorOpts = {}
): ProductoInput {
  const { atributosDefinicion = [], forzarStatus, vendedorId } = opts;

  // Limpiar strings
  const nombre      = limpiarString(input.nombre);
  const descripcion = limpiarString(input.descripcion);
  const sku         = input.sku?.trim() || generarSKU(nombre, input.tipo || "market", vendedorId);
  const slug        = input.slug || (nombre ? generarSlug(nombre, input.id) : undefined);

  // Precio
  const precio         = Number(input.precio ?? 0);
  const precioOriginal = input.precio_original ? Number(input.precio_original) : undefined;

  // Imagen principal — primer elemento de imagenes si no está seteada
  const imagen_principal = input.imagen_principal ||
    (input.imagenes && input.imagenes.length > 0 ? input.imagenes[0].url : undefined);

  // Imagenes ordenadas — asegurar campo orden y marcar principal
  const imagenes = (input.imagenes || []).map((img, i) => ({
    ...img,
    orden:     img.orden ?? i,
    principal: i === 0,
  }));

  // Videos ordenados
  const videos = (input.videos || []).map((v, i) => ({
    ...v,
    orden: v.orden ?? i,
  }));

  // Atributos: limpiar claves con valores null/undefined
  const atributos: Record<string, any> = {};
  for (const [k, v] of Object.entries(input.atributos || {})) {
    if (v !== null && v !== undefined && v !== "") atributos[k] = v;
  }

  // Defaults de logística
  const envio_tipo    = input.envio_tipo    ?? "retiro";
  const envio_gratis  = input.envio_gratis  ?? (envio_tipo === "retiro");
  const retiro_persona = input.retiro_persona ?? (envio_tipo === "retiro");

  // Defaults de info regulatoria
  const info_regulatoria = {
    requiere_factura: false,
    ...input.info_regulatoria,
  };

  // Armar objeto normalizado
  const normalizado: ProductoInput = {
    ...input,
    tipo:             input.tipo || "market",
    nombre,
    descripcion:      descripcion || undefined,
    descripcion_html: input.descripcion_html,
    slug,
    precio,
    precio_original:  precioOriginal,
    moneda:           input.moneda || "UYU",
    permite_descuento: input.permite_descuento ?? true,
    imagen_principal,
    imagenes,
    videos,
    departamento_id:  input.departamento_id,
    departamento_nombre: limpiarString(input.departamento_nombre) || undefined,
    categoria_id:     input.categoria_id,
    categoria_nombre: limpiarString(input.categoria_nombre) || undefined,
    subcategoria_id:  input.subcategoria_id,
    atributos,
    condicion:        input.tipo === "secondhand" ? (input.condicion || "Bueno") : undefined,
    stock:            input.stock ?? 1,
    stock_ilimitado:  input.stock_ilimitado ?? false,
    sku,
    peso_kg:          input.peso_kg,
    alto_cm:          input.alto_cm,
    ancho_cm:         input.ancho_cm,
    largo_cm:         input.largo_cm,
    envio_tipo,
    costo_envio:      input.costo_envio,
    envio_gratis,
    retiro_persona,
    formato_venta:    input.formato_venta    || "unidad",
    cantidad_por_pack: input.formato_venta === "pack" ? (input.cantidad_por_pack || 2) : 1,
    info_regulatoria,
    garantia_tipo:    input.garantia_tipo,
    garantia_meses:   input.garantia_meses,
    visitas:          input.visitas   ?? 0,
    favoritos:        input.favoritos ?? 0,
    rating_count:     input.rating_count ?? 0,
    status:           forzarStatus || determinarStatus({ ...input, nombre, descripcion, imagen_principal, imagenes, precio }, atributosDefinicion),
    published_at:     input.published_at || (
      (forzarStatus === "active" || determinarStatus({ ...input, nombre, descripcion, imagen_principal, imagenes, precio }, atributosDefinicion) === "active")
        ? new Date().toISOString()
        : undefined
    ),
    vendedor_id:      input.vendedor_id || vendedorId || "",
  };

  return normalizado;
}

// ── Calcular diferencias para PATCH ────────────────────────────────────────

export function diffProducto(
  original: Partial<ProductoInput>,
  actualizado: Partial<ProductoInput>
): Partial<ProductoInput> {
  const diff: Partial<ProductoInput> = {};
  const skipKeys = new Set(["id", "created_at", "updated_at", "visitas", "favoritos", "rating_count"]);

  for (const key of Object.keys(actualizado) as (keyof ProductoInput)[]) {
    if (skipKeys.has(key)) continue;
    const valOrig = JSON.stringify(original[key]);
    const valNew  = JSON.stringify(actualizado[key]);
    if (valOrig !== valNew) (diff as any)[key] = actualizado[key];
  }

  return diff;
}



