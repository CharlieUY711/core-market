import { Producto, ProductoInput, AtributoDefinicion, ValidacionResult, ValidacionError } from "./types";

export function validarProductoAntesPublicar(
  producto: Partial<ProductoInput>,
  atributosDefinicion: AtributoDefinicion[] = []
): ValidacionResult {
  const errores: ValidacionError[] = [];

  const err = (campo: string, mensaje: string) =>
    errores.push({ campo, mensaje });

  // ── Paso 1: Información básica ─────────────────────
  if (!producto.nombre?.trim())
    err("nombre", "El nombre es obligatorio");
  else if (producto.nombre.trim().length < 4)
    err("nombre", "El nombre debe tener al menos 4 caracteres");
  else if (producto.nombre.trim().length > 120)
    err("nombre", "El nombre no puede superar 120 caracteres");

  if (!producto.descripcion?.trim())
    err("descripcion", "La descripción es obligatoria");
  else if (producto.descripcion.trim().length < 20)
    err("descripcion", "La descripción debe tener al menos 20 caracteres");

  // ── Paso 2: Tipo y condición ───────────────────────
  if (!producto.tipo)
    err("tipo", "El tipo de publicación es obligatorio");

  if (producto.tipo === "secondhand" && !producto.condicion)
    err("condicion", "La condición es obligatoria para artículos de segunda mano");

  // ── Paso 3: Imágenes ───────────────────────────────
  if (!producto.imagen_principal && (!producto.imagenes || producto.imagenes.length === 0))
    err("imagenes", "Se requiere al menos una imagen");

  // ── Paso 4: Precio ─────────────────────────────────
  if (producto.precio === undefined || producto.precio === null)
    err("precio", "El precio es obligatorio");
  else if (isNaN(Number(producto.precio)) || Number(producto.precio) <= 0)
    err("precio", "El precio debe ser mayor a 0");

  if (producto.precio_original !== undefined && producto.precio_original !== null) {
    if (Number(producto.precio_original) < Number(producto.precio))
      err("precio_original", "El precio original debe ser mayor o igual al precio actual");
  }

  if (!producto.moneda)
    err("moneda", "La moneda es obligatoria");

  // ── Paso 5: Categoría ──────────────────────────────
  if (!producto.departamento_id)
    err("departamento_id", "El departamento es obligatorio");

  // ── Paso 5: Stock ──────────────────────────────────
  if (!producto.stock_ilimitado) {
    if (producto.stock === undefined || producto.stock === null)
      err("stock", "El stock es obligatorio");
    else if (producto.stock < 0)
      err("stock", "El stock no puede ser negativo");
    else if (producto.stock === 0)
      err("stock", "El artículo no puede publicarse con stock 0. Usá 'Pausar' o 'Sin stock'");
  }

  // ── Paso 5: Logística ──────────────────────────────
  if (producto.envio_tipo === "meli_like" || producto.envio_tipo === "custom") {
    if (!producto.peso_kg || producto.peso_kg <= 0)
      err("peso_kg", `El peso es obligatorio para envío tipo "${producto.envio_tipo}"`);
  }

  if (producto.envio_tipo === "custom" && !producto.envio_gratis) {
    if (!producto.costo_envio || producto.costo_envio <= 0)
      err("costo_envio", "El costo de envío es obligatorio para envío custom");
  }

  // ── Atributos requeridos por categoría ─────────────
  if (atributosDefinicion.length > 0) {
    const requeridos = atributosDefinicion.filter(a => a.requerido);
    for (const attr of requeridos) {
      const val = producto.atributos?.[attr.clave];
      const vacio = val === undefined || val === null || val === "" ||
        (Array.isArray(val) && val.length === 0);
      if (vacio)
        err(`atributos.${attr.clave}`, `El atributo "${attr.nombre}" es obligatorio para esta categoría`);
    }
  }

  // ── Garantía ───────────────────────────────────────
  if (producto.garantia_tipo && producto.garantia_tipo !== "sin_garantia") {
    if (!producto.garantia_meses || producto.garantia_meses <= 0)
      err("garantia_meses", "Especificá los meses de garantía");
  }

  return { ok: errores.length === 0, errores };
}

export function validarBorrador(producto: Partial<ProductoInput>): ValidacionResult {
  const errores: ValidacionError[] = [];
  if (!producto.nombre?.trim())
    errores.push({ campo: "nombre", mensaje: "El nombre es obligatorio para guardar borrador" });
  if (!producto.tipo)
    errores.push({ campo: "tipo", mensaje: "El tipo es obligatorio" });
  return { ok: errores.length === 0, errores };
}



