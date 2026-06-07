import { DocumentTemplate, RenderContext } from "../types";
import { baseStyles }      from "../blocks/styles";
import { blockHeader }     from "../blocks/header";
import { blockPersona }    from "../blocks/persona";
import { blockItemsTable } from "../blocks/items";
import { blockFooter, blockFirma } from "../blocks/footer";
import { blockQR }         from "../blocks/qr";
import { wrapHTML }        from "../blocks/wrap";

export const remitoTemplate: DocumentTemplate = {
  tipo:    "remito",
  label:   "Remito de Entrega",
  formato: "a4",
  descripcion: "Constancia de entrega para vendedor y comprador",

  render({ data, opts, empresa, color, fecha }: RenderContext): string {
    const moneda = data.moneda || "UYU";
    const body = `
      ${blockHeader(empresa, "Remito de Entrega", data.id, fecha, color)}

      <div class="doc-grid2 doc-section">
        ${blockPersona("Destinatario", data.comprador)}
        ${blockPersona("Remitente",    data.vendedor)}
      </div>

      <hr class="doc-divider"/>

      <div class="doc-section">
        <div class="doc-label">Artículos incluidos</div>
        ${data.items?.length ? blockItemsTable(data.items, moneda) : "<div style='color:#aaa'>Ver ticket de compra.</div>"}
      </div>

      ${data.notas ? `<div class="doc-section"><div class="doc-label">Observaciones</div><div style="font-size:0.85em;color:#555">${data.notas}</div></div>` : ""}

      <hr class="doc-divider"/>

      <div class="doc-grid2" style="margin-top:16px">
        ${blockFirma("Firma receptor")}
        <div style="text-align:right">
          ${data.qrData ? blockQR(data.qrData, data.id, 75) : ""}
        </div>
      </div>

      ${blockFooter(empresa)}`;

    return wrapHTML("Remito", baseStyles(color, opts.formato), body, opts.autoPrint);
  }
};



