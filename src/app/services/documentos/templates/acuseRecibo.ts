import { DocumentTemplate, RenderContext } from "../types";
import { baseStyles }      from "../blocks/styles";
import { blockHeader }     from "../blocks/header";
import { blockPersona }    from "../blocks/persona";
import { blockFooter, blockFirma } from "../blocks/footer";
import { blockQR }         from "../blocks/qr";
import { wrapHTML }        from "../blocks/wrap";

export const acuseReciboTemplate: DocumentTemplate = {
  tipo:    "acuse_recibo",
  label:   "Acuse de Recibo",
  formato: "a4",
  descripcion: "Confirmación de entrega firmada por el receptor",

  render({ data, opts, empresa, color, fecha }: RenderContext): string {
    const item = data.items?.[0];
    const body = `
      ${blockHeader(empresa, "Acuse de Recibo", data.id, fecha, color)}

      <div style="background:#f0fdf4;border:1.5px solid #6BB87A;border-radius:6px;
                  padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
        <div style="font-size:1.3em">✅</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:0.95em">Entrega confirmada</div>
          <div style="font-size:0.78em;color:#166534">${fecha}</div>
        </div>
      </div>

      <div class="doc-grid2 doc-section">
        ${blockPersona("Receptor",  data.comprador)}
        ${blockPersona("Vendedor",  data.vendedor)}
      </div>

      <hr class="doc-divider"/>

      ${item ? `
      <div class="doc-section">
        <div class="doc-label">Artículo recibido</div>
        <div style="font-weight:700;font-size:1em">${item.descripcion}</div>
        ${item.sku ? `<div style="font-size:0.8em;color:#888">SKU: ${item.sku}</div>` : ""}
      </div>` : ""}

      ${data.notas ? `<div class="doc-section"><div class="doc-label">Observaciones</div><div style="font-size:0.85em;color:#555">${data.notas}</div></div>` : ""}

      <hr class="doc-divider"/>

      <div class="doc-grid2" style="margin-top:16px">
        ${blockFirma("Firma del receptor")}
        <div style="text-align:right">
          ${data.qrData ? blockQR(data.qrData, data.id, 75) : ""}
        </div>
      </div>

      ${blockFooter(empresa)}`;

    return wrapHTML("Acuse de Recibo", baseStyles(color, opts.formato), body, opts.autoPrint);
  }
};



