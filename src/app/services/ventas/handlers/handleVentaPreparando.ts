import { supabase }               from "../../../utils/supabase/client";
import { generarYSubirDocumento } from "../../documentos/generateDocumentHTML";
import { DocumentoData }          from "../../documentos/types";

export async function handleVentaPreparando(ventaId: string): Promise<void> {
  const { data: venta, error: fetchErr } = await supabase
    .from("ventas")
    .select(`
      id, monto, moneda,
      comprador:comprador_id ( id, nombre, email, direccion, ciudad, telefono ),
      vendedor:vendedor_id   ( id, nombre, email, direccion ),
      articulo:articulo_id   ( id, nombre, precio )
    `)
    .eq("id", ventaId)
    .single();

  if (fetchErr || !venta) throw new Error(`[handleVentaPreparando] Venta ${ventaId} no encontrada`);

  const c = venta.comprador as any;
  const v = venta.vendedor  as any;
  const a = venta.articulo  as any;

  const data: DocumentoData = {
    id:      ventaId,
    fecha:   new Date().toISOString(),
    moneda:  venta.moneda || "UYU",
    monto:   venta.monto,
    qrData:  `https://charliemarket.com.uy/orden/${ventaId}`,
    comprador: {
      nombre:    c?.nombre || c?.email || "Comprador",
      direccion: c?.direccion,
      ciudad:    c?.ciudad,
      telefono:  c?.telefono,
      email:     c?.email,
    },
    vendedor: {
      nombre:    v?.nombre || v?.email || "Vendedor",
      direccion: v?.direccion,
      email:     v?.email,
    },
    items: a ? [{
      descripcion: a.nombre,
      cantidad:    1,
      precioUnit:  a.precio || venta.monto || 0,
    }] : [],
  };

  const remitoUrl = await generarYSubirDocumento("remito", data, { autoPrint: false });

  if (!remitoUrl) throw new Error(`[handleVentaPreparando] Error generando remito para venta ${ventaId}`);

  const { error: updateErr } = await supabase
    .from("ventas")
    .update({
      remito_url:    remitoUrl,
      preparando_en: new Date().toISOString(),
    })
    .eq("id", ventaId);

  if (updateErr) throw new Error(`[handleVentaPreparando] Error actualizando venta: ${updateErr.message}`);

  console.log(`[handleVentaPreparando] ✓ remito generado: ${remitoUrl}`);
}



