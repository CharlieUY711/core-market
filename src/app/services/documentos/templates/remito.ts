import { DocumentoData, RenderOptions } from "../types";
import {
  DEFAULT_EMPRESA, fmtFecha, fmtMonto, qrImgTag,
  baseStyles, headerBlock, personaBlock, itemsTable, footerBlock, wrapHTML
} from "../renderers/baseHTML";

export function renderRemito(data: DocumentoData, opts: RenderOptions = {}): string {
  const empresa = { ...DEFAULT_EMPRESA, ...data.empresa };
  const color   = opts.colorPrimary || empresa.color || "#FF7A00";
  const fecha   = fmtFecha(data.fecha);
  const moneda  = data.moneda || "UYU";

  const body = `
    ${headerBlock(empresa, "Remito de Entrega", data.id, fecha)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="section">
      ${personaBlock("Destinatario", data.comprador)}
      ${personaBlock("Remitente",    data.vendedor)}
    </div>

    <hr class="divider"/>

    <div class="section">
      <div class="label">Artículos incluidos</div>
      ${data.items?.length ? itemsTable(data.items, moneda) : "<div>Ver detalle en ticket de compra.</div>"}
    </div>

    <hr class="divider"/>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px">
      <div>
        <div class="label">Firma receptor</div>
        <div style="border-bottom:1px solid #333;margin-top:36px;margin-bottom:4px"></div>
        <div style="font-size:0.78em;color:#888">Aclaración y fecha</div>
      </div>
      <div style="text-align:right">
        ${data.qrData ? qrImgTag(data.qrData, 75) : ""}
        <div style="font-size:0.75em;color:#888;margin-top:4px">${data.id.slice(0,14).toUpperCase()}</div>
      </div>
    </div>

    ${footerBlock(empresa)}
  `;

  return wrapHTML("Remito", baseStyles(color, "a4"), body, opts.autoPrint);
}