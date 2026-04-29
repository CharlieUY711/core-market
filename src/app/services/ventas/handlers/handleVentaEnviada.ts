import { supabase }                    from "../../../utils/supabase/client";
import { generarEtiquetaEnvioHTML }    from "../generarEtiquetaEnvioHTML";

export async function handleVentaEnviada(ventaId: string): Promise<void> {
  const { data: venta } = await supabase
    .from("ventas")
    .select("*, comprador:comprador_id(*), vendedor:vendedor_id(*), articulo:articulo_id(*)")
    .eq("id", ventaId)
    .single();
  if (!venta) throw new Error("Venta no encontrada");

  const etiquetaUrl = await generarEtiquetaEnvioHTML({
    ventaId,
    compradorNombre: venta.comprador?.nombre || venta.comprador?.email || "Comprador",
    compradorDir:    venta.comprador?.direccion || "Sin dirección",
    compradorCiudad: venta.comprador?.ciudad,
    compradorTel:    venta.comprador?.telefono,
    vendedorNombre:  venta.vendedor?.nombre || venta.vendedor?.email || "Vendedor",
    vendedorDir:     venta.vendedor?.direccion,
    productoNombre:  venta.articulo?.nombre || "Artículo",
    productoId:      venta.articulo_id,
    monto:           venta.monto,
  });

  await supabase.from("ventas").update({
    etiqueta_url: etiquetaUrl,
    enviado_en:   new Date().toISOString(),
  }).eq("id", ventaId);

  // Abrir etiqueta para impresión si estamos en browser
  if (etiquetaUrl && typeof window !== "undefined") {
    const win = window.open(etiquetaUrl, "_blank");
    if (win) setTimeout(() => win.print(), 1200);
  }

  console.log(`[handleVentaEnviada] etiqueta HTML: ${etiquetaUrl}`);
}