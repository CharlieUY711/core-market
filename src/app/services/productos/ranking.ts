import { supabase } from "../../utils/supabase/client";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface MetricasProducto {
  ctr:             number;
  conversion_rate: number;
  precio_score:    number;
  stock_score:     number;
  freshness_score: number;
  tipo_boost:      number;
}

export interface RankingScore {
  score:   number;
  metricas: MetricasProducto;
  cold_boost: number;
}

export interface ProductoRankeado {
  id:               string;
  nombre:           string;
  tipo:             "market" | "secondhand";
  precio:           number;
  precio_original?: number;
  descuento_pct?:   number;
  moneda:           string;
  imagen_principal?: string;
  condicion?:       string;
  envio_gratis:     boolean;
  rating_promedio?: number;
  ranking_score:    number;
  ctr:              number;
  conversion_rate:  number;
  freshness_score:  number;
  stock:            number;
  vendedor_id:      string;
  slug?:            string;
}

export interface QueryRankingParams {
  categoriaId?:  string;
  tipo?:         "market" | "secondhand";
  moneda?:       string;
  precioMin?:    number;
  precioMax?:    number;
  limit?:        number;
  offset?:       number;
}

// ── Cálculo de métricas en cliente (espejo del SQL) ──────────────────────────
// Útil para preview/debug antes de guardar en DB

export function calcularMetricasCliente(p: {
  impresiones:    number;
  clicks:         number;
  ventas_count:   number;
  precio:         number;
  precioPromCat?: number;
  stock:          number;
  stock_ilimitado: boolean;
  published_at?:  string;
  created_at:     string;
  tipo:           string;
}): MetricasProducto {

  // CTR
  const ctr = p.impresiones > 0
    ? Math.min(p.clicks / p.impresiones, 1.0)
    : 0;

  // Conversion rate
  const conversion_rate = p.clicks > 0
    ? Math.min(p.ventas_count / p.clicks, 1.0)
    : 0;

  // Precio score
  let precio_score = 0;
  if (p.precioPromCat && p.precioPromCat > 0 && p.precio > 0) {
    precio_score = Math.min(p.precioPromCat / p.precio, 2.0) / 2.0;
  }

  // Stock score
  let stock_score = 0;
  if (p.stock_ilimitado)   stock_score = 1.0;
  else if (p.stock > 5)    stock_score = 1.0;
  else if (p.stock > 0)    stock_score = 0.7;

  // Freshness score
  const ref   = p.published_at || p.created_at;
  const dias  = (Date.now() - new Date(ref).getTime()) / 86400000;
  let freshness_score = 0.2;
  if      (dias <= 7)  freshness_score = 1.0;
  else if (dias <= 30) freshness_score = 0.7;
  else if (dias <= 90) freshness_score = 0.4;

  // Tipo boost
  const tipo_boost = p.tipo === "secondhand" ? 1.1 : 1.0;

  return { ctr, conversion_rate, precio_score, stock_score, freshness_score, tipo_boost };
}

export function calcularRankingCliente(p: {
  impresiones:    number;
  clicks:         number;
  ventas_count:   number;
  precio:         number;
  precioPromCat?: number;
  stock:          number;
  stock_ilimitado: boolean;
  published_at?:  string;
  created_at:     string;
  tipo:           string;
  rating_promedio?: number;
  margen?:        number;
}): RankingScore {

  const m         = calcularMetricasCliente(p);
  const rating    = Math.min((p.rating_promedio ?? 0) / 5.0, 1.0);
  const margen    = Math.min(p.margen ?? 0, 1.0);
  const cold_boost = p.ventas_count < 5
    ? 0.2 * (1.0 - p.ventas_count / 5.0)
    : 0;

  const score = Math.min(Math.max(
    (m.ctr             * 0.25) +
    (m.conversion_rate * 0.30) +
    (rating            * 0.15) +
    (m.precio_score    * 0.10) +
    (m.stock_score     * 0.05) +
    (m.freshness_score * 0.05) +
    (m.tipo_boost      * 0.05) +
    (margen            * 0.05) +
    cold_boost,
  0), 1);

  return { score, metricas: m, cold_boost };
}

// ── Queries Supabase ─────────────────────────────────────────────────────────

export async function getProductosRankeados(
  params: QueryRankingParams = {}
): Promise<{ data: ProductoRankeado[]; error: string | null }> {
  const {
    categoriaId, tipo, moneda,
    precioMin, precioMax,
    limit = 50, offset = 0,
  } = params;

  const { data, error } = await supabase.rpc("get_productos_rankeados", {
    p_categoria_id: categoriaId ?? null,
    p_tipo:         tipo        ?? null,
    p_moneda:       moneda      ?? null,
    p_precio_min:   precioMin   ?? null,
    p_precio_max:   precioMax   ?? null,
    p_limit:        limit,
    p_offset:       offset,
  });

  if (error) {
    console.error("[getProductosRankeados]", error.message);
    return { data: [], error: error.message };
  }

  return { data: data as ProductoRankeado[], error: null };
}

// ── Registrar eventos (impresión / click / venta) ────────────────────────────

export async function registrarImpresion(productoId: string): Promise<void> {
  await supabase.rpc("registrar_evento_producto", {
    p_producto_id: productoId,
    p_evento:      "impresion",
  });
}

export async function registrarClick(productoId: string): Promise<void> {
  await supabase.rpc("registrar_evento_producto", {
    p_producto_id: productoId,
    p_evento:      "click",
  });
}

export async function registrarVenta(productoId: string): Promise<void> {
  await supabase.rpc("registrar_evento_producto", {
    p_producto_id: productoId,
    p_evento:      "venta",
  });
}

// ── Recalcular batch (desde admin) ───────────────────────────────────────────

export async function recalcularRankingBatch(horas = 24, limit = 1000): Promise<number> {
  const { data, error } = await supabase.rpc("recalcular_ranking_batch", {
    p_horas: horas,
    p_limit: limit,
  });
  if (error) { console.error("[recalcularRankingBatch]", error.message); return 0; }
  return data as number;
}

// ── Hook React ───────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

export function useProductosRankeados(params: QueryRankingParams = {}) {
  const [productos, setProductos] = useState<ProductoRankeado[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await getProductosRankeados(params);
    setProductos(data);
    if (err) setError(err);
    setLoading(false);
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { productos, loading, error, refetch: fetch };
}



