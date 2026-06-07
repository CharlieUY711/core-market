import { supabase }          from "../../utils/supabase/client";
import { TipoDocumento, DocumentoData, RenderOptions, DocumentoResult } from "./types";
import { documentRegistry }  from "./engine/registry";
import { buildContext }       from "./engine/context";

// ── Auto-registro de todos los templates ─────────────────────────────────────
import { ticketTemplate }       from "./templates/ticket";
import { remitoTemplate }       from "./templates/remito";
import { etiquetaEnvioTemplate } from "./templates/etiquetaEnvio";
import { acuseReciboTemplate }  from "./templates/acuseRecibo";

documentRegistry.register(ticketTemplate);
documentRegistry.register(remitoTemplate);
documentRegistry.register(etiquetaEnvioTemplate);
documentRegistry.register(acuseReciboTemplate);

// ── API pública ───────────────────────────────────────────────────────────────

export function generarDocumentoHTML(
  tipo: TipoDocumento,
  data: DocumentoData,
  opts?: RenderOptions
): string {
  const template = documentRegistry.get(tipo);
  const ctx      = buildContext(data, { ...opts, formato: opts?.formato || template.formato });
  return template.render(ctx);
}

export async function generarYSubirDocumento(
  tipo: TipoDocumento,
  data: DocumentoData,
  opts?: RenderOptions
): Promise<DocumentoResult> {
  const result: DocumentoResult = { ok: false, tipo, ventaId: data.id };
  try {
    const template = documentRegistry.get(tipo);
    const ctx      = buildContext(data, { ...opts, formato: opts?.formato || template.formato });
    const html     = template.render(ctx);
    const blob     = new Blob([html], { type: "text/html; charset=utf-8" });
    const path     = `documentos/${tipo}_${data.id}_${Date.now()}.html`;

    const { error: upErr } = await supabase.storage
      .from("biblioteca")
      .upload(path, blob, { upsert: false, contentType: "text/html" });
    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabase.storage.from("biblioteca").getPublicUrl(path);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase.from("media_library").insert({
      user_id:   user?.id,
      bucket:    "biblioteca",
      path,
      tipo:      "documento",
      nombre:    `${tipo}_${data.id.slice(0,8)}.html`,
      categoria: "documento",
      etiquetas: [tipo, `venta_${data.id}`],
      status:    "ready",
    });
    if (dbErr) console.warn(`[generarYSubirDocumento] media_library warning:`, dbErr.message);

    if (ctx.opts.autoPrint && typeof window !== "undefined") {
      const win = window.open(publicUrl, "_blank");
      if (win) setTimeout(() => win.print(), 900);
    }

    return { ...result, ok: true, url: publicUrl, path };

  } catch (e: any) {
    console.error(`[generarYSubirDocumento] ${tipo}:`, e.message);
    return { ...result, error: e.message };
  }
}

export function previewDocumento(
  tipo: TipoDocumento,
  data: DocumentoData,
  opts?: RenderOptions
): void {
  const html = generarDocumentoHTML(tipo, data, opts);
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win && opts?.autoPrint) {
    setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 900);
  }
}

// ── Para agregar templates desde fuera del módulo ─────────────────────────────
export { documentRegistry } from "./engine/registry";
export type { DocumentTemplate } from "./types";



