import { DocumentTemplate, RenderContext } from "../types";
import { baseStyles }    from "../blocks/styles";
import { blockHeader }   from "../blocks/header";
import { blockPersona }  from "../blocks/persona";
import { blockItemsTable } from "../blocks/items";
import { blockFooter }   from "../blocks/footer";
import { blockQR }       from "../blocks/qr";
import { wrapHTML }      from "../blocks/wrap";
import { fmtMonto }      from "../blocks/utils";

export const ticketTemplate: DocumentTemplate = {
  tipo:    "ticket",
  label:   "Ticket de Compra",
  formato: "a4",
  descripcion: "Comprobante de pago para el comprador",

  render({ data, opts, empresa, color, fecha }: RenderContext): string {
    const moneda = data.moneda || "UYU";
    const body = `
      ${blockHeader(empresa, "Ticket de Compra", data.id, fecha, color)}

      <div class="doc-grid2 doc-section">
        ${blockPersona("Comprador", data.comprador)}
        ${blockPersona("Vendedor",  data.vendedor)}
      </div>

      <hr class="doc-divider"/>

      <div class="doc-section">
        <div class="doc-label">Detalle de compra</div>
        ${data.items?.length
          ? blockItemsTable(data.items, moneda)
          : data.monto
            ? `<div style="font-size:1.2em;font-weight:800;color:${color};margin-top:6px">${fmtMonto(data.monto, moneda)}</div>`
            : ""}
      </div>

      ${data.notas ? `<div class="doc-section"><div class="doc-label">Notas</div><div style="font-size:0.85em;color:#555">${data.notas}</div></div>` : ""}

      <hr class="doc-divider"/>

      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <span class="doc-badge">PAGADO</span>
          <div style="margin-top:6px;font-size:0.75em;color:#888">Ref: ${data.id.replace(/-/g,"").slice(0,16).toUpperCase()}</div>
          ${data.trackingCode ? `<div style="font-size:0.75em;color:#555">Tracking: ${data.trackingCode}</div>` : ""}
        </div>
        ${data.qrData ? blockQR(data.qrData, data.id, 75) : ""}
      </div>

      ${blockFooter(empresa)}`;

    return wrapHTML("Ticket de Compra", baseStyles(color, opts.formato), body, opts.autoPrint);
  }
};



