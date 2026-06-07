export type VentaEstado =
  | "pendiente"
  | "pagado"
  | "preparando"
  | "enviado"
  | "entregado"
  | "cancelado";

export interface Venta {
  id:          string;
  estado:      VentaEstado;
  comprador_id: string;
  vendedor_id: string;
  articulo_id: string;
  monto:       number;
  created_at:  string;
  updated_at:  string;
}

export interface CambioEstadoResult {
  ok:      boolean;
  estado:  VentaEstado;
  error?:  string;
  data?:   Record<string, unknown>;
}



