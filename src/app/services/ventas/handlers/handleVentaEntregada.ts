import { supabase }               from "../../../utils/supabase/client";
import { generarYSubirDocumento } from "../../documentos/generateDocumentHTML";
import { DocumentoData }          from "../../documentos/types";

export async function handleVentaEntregada(ventaId: string): Promise<void> {
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

  if (fetchErr || !venta) throw new Error(`[handleVentaEntregada] Venta ${ventaId} no encontrada`);

  const c = venta.comprador as any;
  const v = venta.vendedor  as any;
  const a = venta.articulo  as any;

  const data: DocumentoData = {
    id:      ventaId,
    fecha:   new Date().toISOString(),
    moneda:  venta.moneda || "UYU",
    monto:   venta.monto,
    qrData:  `https://charliemarket.com.uy/orden/${ventaId}`,
    notas:   "Artículo recibido conforme. Gracias por usar Charlie Market.",
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

  const acuseUrl = await generarYSubirDocumento("acuse_recibo", data, { autoPrint: false });

  if (!acuseUrl) throw new Error(`[handleVentaEntregada] Error generando acuse para venta ${ventaId}`);

  const { error: updateErr } = await supabase
    .from("ventas")
    .update({
      acuse_url:    acuseUrl,
      entregado_en: new Date().toISOString(),
      cerrado_en:   new Date().toISOString(),
    })
    .eq("id", ventaId);

  if (updateErr) throw new Error(`[handleVentaEntregada] Error actualizando venta: ${updateErr.message}`);

  // Disparar review pendiente
  const { error: reviewErr } = await supabase
    .from("reviews")
    .insert({
      venta_id:     ventaId,
      comprador_id: c?.id,
      vendedor_id:  v?.id,
      articulo_id:  a?.id,
      status:       "pendiente",
    });

  if (reviewErr && !reviewErr.message.includes("duplicate")) {
    console.warn(`[handleVentaEntregada] Review insert warning: ${reviewErr.message}`);
  }

  console.log(`[handleVentaEntregada] ✓ acuse generado: ${acuseUrl}`);
}



