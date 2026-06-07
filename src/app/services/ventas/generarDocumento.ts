import { supabase } from "../../utils/supabase/client";

export type TipoDocumento = "ticket" | "remito" | "etiqueta_envio" | "acuse_recibo";

export async function generarDocumento(
  ventaId: string,
  tipo: TipoDocumento,
  contenido: Record<string, unknown>
): Promise<string | null> {
  try {
    const json    = JSON.stringify({ ventaId, tipo, contenido, generadoEn: new Date().toISOString() });
    const blob    = new Blob([json], { type: "application/json" });
    const path    = `documentos/${tipo}_${ventaId}_${Date.now()}.json`;

    const { error: upErr } = await supabase.storage.from("biblioteca").upload(path, blob, { upsert: false });
    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabase.storage.from("biblioteca").getPublicUrl(path);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("media_library").insert({
      user_id:   user?.id,
      bucket:    "biblioteca",
      path,
      tipo:      "documento",
      nombre:    `${tipo}_${ventaId}.json`,
      categoria: "documento",
      etiquetas: [tipo, `venta_${ventaId}`],
      status:    "ready",
    });

    return publicUrl;
  } catch (e) {
    console.error(`[generarDocumento] ${tipo}:`, e);
    return null;
  }
}



