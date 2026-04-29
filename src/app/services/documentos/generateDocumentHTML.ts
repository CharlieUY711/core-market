import { TipoDocumento, DocumentoData, RenderOptions } from "./types";
import { renderTicket }        from "./templates/ticket";
import { renderRemito }        from "./templates/remito";
import { renderEtiquetaEnvio } from "./templates/etiquetaEnvio";
import { renderAcuseRecibo }   from "./templates/acuseRecibo";
import { supabase }            from "../../utils/supabase/client";

// ── Función principal ────────────────────────────────────────────────────────
export function generarDocumentoHTML(
  tipo:  TipoDocumento,
  data:  DocumentoData,
  opts?: RenderOptions
): string {
  switch (tipo) {
    case "ticket":        return renderTicket(data, opts);
    case "remito":        return renderRemito(data, opts);
    case "etiqueta_envio":return renderEtiquetaEnvio(data, opts);
    case "acuse_recibo":  return renderAcuseRecibo(data, opts);
    default:              throw new Error(`Tipo de documento desconocido: ${tipo}`);
  }
}

// ── Subir a Supabase Storage ─────────────────────────────────────────────────
export async function generarYSubirDocumento(
  tipo:  TipoDocumento,
  data:  DocumentoData,
  opts?: RenderOptions
): Promise<string | null> {
  try {
    const html  = generarDocumentoHTML(tipo, data, opts);
    const blob  = new Blob([html], { type: "text/html; charset=utf-8" });
    const path  = `documentos/${tipo}_${data.id}_${Date.now()}.html`;

    const { error } = await supabase.storage
      .from("biblioteca")
      .upload(path, blob, { upsert: false, contentType: "text/html" });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from("biblioteca").getPublicUrl(path);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("media_library").insert({
      user_id:   user?.id,
      bucket:    "biblioteca",
      path,
      tipo:      "documento",
      nombre:    `${tipo}_${data.id.slice(0,8)}.html`,
      categoria: "documento",
      etiquetas: [tipo, `venta_${data.id}`],
      status:    "ready",
    });

    if (opts?.autoPrint && typeof window !== "undefined") {
      const win = window.open(publicUrl, "_blank");
      if (win) setTimeout(() => win.print(), 900);
    }

    return publicUrl;
  } catch (e) {
    console.error(`[generarYSubirDocumento] ${tipo}:`, e);
    return null;
  }
}

// ── Preview inline (sin subir) ───────────────────────────────────────────────
export function previewDocumento(tipo: TipoDocumento, data: DocumentoData, opts?: RenderOptions): void {
  const html = generarDocumentoHTML(tipo, data, opts);
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win && opts?.autoPrint) setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 900);
}