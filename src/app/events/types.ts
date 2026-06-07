export interface VentaEventPayload {
  ventaId:     string;
  vendedorId?: string;
  compradorId?: string;
  articuloId?: string;
  monto?:      number;
  moneda?:     string;
}

export interface ProductoEventPayload {
  productoId:  string;
  vendedorId?: string;
  tipo?:       string;
}

export type EventPayloadMap = {
  venta_pagada:     VentaEventPayload;
  venta_preparando: VentaEventPayload;
  venta_enviada:    VentaEventPayload;
  venta_entregada:  VentaEventPayload;
  venta_cancelada:  VentaEventPayload;
  producto_publicado: ProductoEventPayload;
  producto_pausado:   ProductoEventPayload;
};

export type EventName = keyof EventPayloadMap;



