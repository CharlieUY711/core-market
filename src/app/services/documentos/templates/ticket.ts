import { DocumentoData, RenderOptions } from "../types";
import {
  DEFAULT_EMPRESA, fmtFecha, fmtMonto, qrImgTag,
  baseStyles, headerBlock, personaBlock, itemsTable, footerBlock, wrapHTML
} from "../renderers/baseHTML";

export function renderTicket(data: DocumentoData, opts: RenderOptions = {}): string {
  const empresa = { ...DEFAULT_EMPRESA, ...data.empresa };
  const color   = opts.colorPrimary || empresa.color || "#FF7A00";
  const fecha   = fmtFecha(data.fecha);
  const moneda  = data.moneda || "UYU";

  const body = `
    ${headerBlock(empresa, "Ticket de Compra", data.id, fecha)}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="section">
      ${personaBlock("Comprador", data.comprador)}
      ${personaBlock("Vendedor",  data.vendedor)}
    </div>

    <hr class="divider"/>

    <div class="section">
      <div class="label">Detalle</div>
      ${data.items?.length ? itemsTable(data.items, moneda)
        : data.monto ? `<div style="font-size:1.1em;font-weight:700;color:${color}">${fmtMonto(data.monto, moneda)}</div>`
        : ""}
    </div>

    ${data.notas ? `<div class="section"><div class="label">Notas</div><div>${data.notas}</div></div>` : ""}

    <hr class="divider"/>

    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <span class="badge">PAGADO</span>
        <div style="margin-top:6px;font-size:0.78em;color:#888">Ref: ${data.id.slice(0,16).toUpperCase()}</div>
        ${data.trackingCode ? `<div style="font-size:0.78em;color:#555">Tracking: ${data.trackingCode}</div>` : ""}
      </div>
      ${data.qrData ? qrImgTag(data.qrData, 80) : ""}
    </div>

    ${footerBlock(empresa)}
  `;

  return wrapHTML("Ticket de Compra", baseStyles(color, "a4"), body, opts.autoPrint);
}