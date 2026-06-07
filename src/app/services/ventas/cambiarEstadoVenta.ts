import { supabase }                          from "../../utils/supabase/client";
import { VentaEstado, CambioEstadoResult }   from "./types";
import { eventBus }                          from "../../events/eventBus";
import { registerAllHandlers }               from "../../events/registerHandlers";

registerAllHandlers();

const TRANSICIONES_VALIDAS: Record<VentaEstado, VentaEstado[]> = {
  pendiente:  ["pagado",     "cancelado"],
  pagado:     ["preparando", "cancelado"],
  preparando: ["enviado",    "cancelado"],
  enviado:    ["entregado"],
  entregado:  [],
  cancelado:  [],
};

const EVENT_MAP: Partial<Record<VentaEstado, keyof typeof import("../../events/types").EventPayloadMap>> = {
  pagado:     "venta_pagada",
  preparando: "venta_preparando",
  enviado:    "venta_enviada",
  entregado:  "venta_entregada",
  cancelado:  "venta_cancelada",
};

export async function cambiarEstadoVenta(
  ventaId:     string,
  nuevoEstado: VentaEstado
): Promise<CambioEstadoResult> {
  try {
    // 1. Obtener venta actual
    const { data: venta, error: fetchErr } = await supabase
      .from("ventas")
      .select("estado, vendedor_id, comprador_id, articulo_id, monto, moneda")
      .eq("id", ventaId)
      .single();

    if (fetchErr || !venta)
      throw new Error(`Venta ${ventaId} no encontrada`);

    const estadoActual = venta.estado as VentaEstado;

    // 2. Validar transición
    if (!TRANSICIONES_VALIDAS[estadoActual].includes(nuevoEstado))
      throw new Error(`Transición inválida: ${estadoActual} → ${nuevoEstado}`);

    // 3. Actualizar en DB
    const { error: updateErr } = await supabase
      .from("ventas")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", ventaId);

    if (updateErr) throw updateErr;

    // 4. Emitir evento — handlers corren en paralelo, fallos aislados
    const eventName = EVENT_MAP[nuevoEstado];
    if (eventName) {
      const results = await eventBus.emit(eventName as any, {
        ventaId,
        vendedorId:  venta.vendedor_id,
        compradorId: venta.comprador_id,
        articuloId:  venta.articulo_id,
        monto:       venta.monto,
        moneda:      venta.moneda,
      });

      const fallidos = results.filter(r => !r.ok);
      if (fallidos.length > 0) {
        console.warn(`[cambiarEstadoVenta] ${fallidos.length} handler(s) fallaron:`,
          fallidos.map(f => `${f.modulo}: ${f.error}`).join(", "));
      }
    }

    console.info(`[cambiarEstadoVenta] ${ventaId}: ${estadoActual} → ${nuevoEstado}`);
    return { ok: true, estado: nuevoEstado };

  } catch (e: any) {
    console.error("[cambiarEstadoVenta]", e.message);
    return { ok: false, estado: "pendiente", error: e.message };
  }
}



