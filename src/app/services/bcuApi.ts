/* =====================================================
   BCU API — Tipo de cambio oficial Uruguay
   ===================================================== */

export interface TipoCambio {
  fecha: string;
  compra: number;
  venta: number;
}

let cache: { data: TipoCambio; timestamp: number } | null = null;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

export async function getTipoCambioUSD(): Promise<TipoCambio> {
  // Retornar cache si es reciente
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  try {
    const res = await fetch(
      "https://cotizaciones.bcu.gub.uy/wscotizaciones/rest/cotizacion/ultimas/1?moneda=2222&tipo=2",
      { headers: { Accept: "application/json" } }
    );

    if (!res.ok) throw new Error("BCU no disponible");

    const json = await res.json();
    const item = json?.cotizaciones?.[0];

    const data: TipoCambio = {
      fecha: item?.fecha || new Date().toISOString(),
      compra: parseFloat(item?.compra || "42"),
      venta: parseFloat(item?.venta || "44"),
    };

    cache = { data, timestamp: Date.now() };
    return data;
  } catch (err) {
    console.warn("BCU API error, usando fallback:", err);
    // Fallback hardcodeado si la API falla
    return { fecha: new Date().toISOString(), compra: 42, venta: 44 };
  }
}

export function convertirUYUaUSD(monto: number, tipoCambio: TipoCambio): number {
  return Math.round((monto / tipoCambio.venta) * 100) / 100;
}

export function convertirUSDaUYU(monto: number, tipoCambio: TipoCambio): number {
  return Math.round(monto * tipoCambio.venta);
}

export function formatearPrecio(monto: number, moneda: "UYU" | "USD"): string {
  if (moneda === "USD") {
    return "U$S " + monto.toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return "$U " + Math.round(monto).toLocaleString("es-UY");
}




