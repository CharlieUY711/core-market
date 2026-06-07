import { supabase }               from "../../../utils/supabase/client";
import { generarYSubirDocumento } from "../../documentos/generateDocumentHTML";
import { DocumentoData }          from "../../documentos/types";

export async function handleVentaEnviada(ventaId: string): Promise<void> {
  const { data: venta, error: fetchErr } = await supabase
    .from("ventas")
    .select(`
      id, monto, moneda, tracking_code,
      comprador:comprador_id ( id, nombre, email, direccion, ciudad, telefono ),
      vendedor:vendedor_id   ( id, nombre, email, direccion ),
      articulo:articulo_id   ( id, nombre, precio )
    `)
    .eq("id", ventaId)
    .single();

  if (fetchErr || !venta) throw new Error(`[handleVentaEnviada] Venta ${ventaId} no encontrada`);

  const c = venta.comprador as any;
  const v = venta.vendedor  as any;
  const a = venta.articulo  as any;

  const data: DocumentoData = {
    id:           ventaId,
    fecha:        new Date().toISOString(),
    moneda:       venta.moneda || "UYU",
    monto:        venta.monto,
    trackingCode: (venta as any).tracking_code,
    qrData:       `https://charliemarket.com.uy/orden/${ventaId}__${c?.id || ""}`,
    comprador: {
      nombre:    c?.nombre || c?.email || "Comprador",
      direccion: c?.direccion || "Sin dirección",
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

  // etiqueta abre print automáticamente
  const etiquetaUrl = await generarYSubirDocumento("etiqueta_envio", data, {
    formato:   "etiqueta",
    autoPrint: true,
  });

  if (!etiquetaUrl) throw new Error(`[handleVentaEnviada] Error generando etiqueta para venta ${ventaId}`);

  const { error: updateErr } = await supabase
    .from("ventas")
    .update({
      etiqueta_url: etiquetaUrl,
      enviado_en:   new Date().toISOString(),
    })
    .eq("id", ventaId);

  if (updateErr) throw new Error(`[handleVentaEnviada] Error actualizando venta: ${updateErr.message}`);

  console.log(`[handleVentaEnviada] ✓ etiqueta generada y enviada a impresora: ${etiquetaUrl}`);
}



