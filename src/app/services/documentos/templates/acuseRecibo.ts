import { DocumentoData, RenderOptions } from "../types";
import {
  DEFAULT_EMPRESA, fmtFecha, qrImgTag,
  baseStyles, headerBlock, personaBlock, footerBlock, wrapHTML
} from "../renderers/baseHTML";

export function renderAcuseRecibo(data: DocumentoData, opts: RenderOptions = {}): string {
  const empresa = { ...DEFAULT_EMPRESA, ...data.empresa };
  const color   = opts.colorPrimary || empresa.color || "#FF7A00";
  const fecha   = fmtFecha(data.fecha);

  const body = `
    ${headerBlock(empresa, "Acuse de Recibo", data.id, fecha)}

    <div style="background:#f0fdf4;border:1.5px solid #6BB87A;border-radius:6px;
                padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
      <span style="font-size:1.4em">✅</span>
      <div>
        <div style="font-weight:700;color:#166534">Entrega confirmada</div>
        <div style="font-size:0.8em;color:#166534">${fecha}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="section">
      ${personaBlock("Receptor",  data.comprador)}
      ${personaBlock("Vendedor",  data.vendedor)}
    </div>

    <hr class="divider"/>

    ${data.items?.[0] ? `
    <div class="section">
      <div class="label">Artículo recibido</div>
      <div style="font-weight:700;font-size:1em">${data.items[0].descripcion}</div>
    </div>` : ""}

    ${data.notas ? `<div class="section"><div class="label">Observaciones</div><div>${data.notas}</div></div>` : ""}

    <hr class="divider"/>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px">
      <div>
        <div class="label">Firma y aclaración</div>
        <div style="border-bottom:1px solid #333;margin-top:36px;margin-bottom:4px"></div>
        <div style="font-size:0.78em;color:#888">Nombre y fecha</div>
      </div>
      <div style="text-align:right">
        ${data.qrData ? qrImgTag(data.qrData, 75) : ""}
        <div style="font-size:0.75em;color:#888;margin-top:4px">Ref: ${data.id.slice(0,14).toUpperCase()}</div>
      </div>
    </div>

    ${footerBlock(empresa)}
  `;

  return wrapHTML("Acuse de Recibo", baseStyles(color, "a4"), body, opts.autoPrint);
}