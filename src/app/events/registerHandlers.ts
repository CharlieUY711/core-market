import { eventBus }                from "./eventBus";
import { handleVentaPagada }       from "../services/ventas/handlers/handleVentaPagada";
import { handleVentaPreparando }   from "../services/ventas/handlers/handleVentaPreparando";
import { handleVentaEnviada }      from "../services/ventas/handlers/handleVentaEnviada";
import { handleVentaEntregada }    from "../services/ventas/handlers/handleVentaEntregada";

let registered = false;

export function registerAllHandlers(): void {
  if (registered) return;
  registered = true;

  // ── Módulo: Documentos ────────────────────────────────────────────────────
  eventBus.on("venta_pagada",
    ({ ventaId }) => handleVentaPagada(ventaId),
    "documentos.ticket"
  );

  eventBus.on("venta_preparando",
    ({ ventaId }) => handleVentaPreparando(ventaId),
    "documentos.remito"
  );

  eventBus.on("venta_enviada",
    ({ ventaId }) => handleVentaEnviada(ventaId),
    "documentos.etiqueta"
  );

  eventBus.on("venta_entregada",
    ({ ventaId }) => handleVentaEntregada(ventaId),
    "documentos.acuse"
  );

  // ── Módulo: Reputación (futuro — descomenta cuando exista) ────────────────
  // eventBus.on("venta_entregada",
  //   ({ ventaId, vendedorId, compradorId }) => calcularScoreVendedor({ ventaId, vendedorId, compradorId }),
  //   "reputacion.score_vendedor"
  // );
  // eventBus.on("venta_entregada",
  //   ({ ventaId }) => dispararNotificacionReview(ventaId),
  //   "reputacion.notif_review"
  // );

  // ── Módulo: Notificaciones (futuro) ───────────────────────────────────────
  // eventBus.on("venta_pagada",     ({ ventaId }) => notificarVendedor(ventaId, "pagado"),     "notif.vendedor");
  // eventBus.on("venta_enviada",    ({ ventaId }) => notificarComprador(ventaId, "enviado"),   "notif.comprador");
  // eventBus.on("venta_entregada",  ({ ventaId }) => notificarAmbos(ventaId, "entregado"),     "notif.ambos");

  // ── Módulo: Analytics (futuro) ────────────────────────────────────────────
  // eventBus.on("venta_pagada",     (p) => trackConversion(p), "analytics.conversion");
  // eventBus.on("producto_publicado",(p) => indexarProducto(p), "analytics.index");

  console.info("[EventBus] Handlers registrados:", eventBus.describe());
}



