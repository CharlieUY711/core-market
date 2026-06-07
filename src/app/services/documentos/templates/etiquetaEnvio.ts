import { DocumentTemplate, RenderContext } from "../types";
import { baseStyles } from "../blocks/styles";
import { blockQR }    from "../blocks/qr";
import { wrapHTML }   from "../blocks/wrap";
import { shortId, fmtMonto } from "../blocks/utils";

export const etiquetaEnvioTemplate: DocumentTemplate = {
  tipo:    "etiqueta_envio",
  label:   "Etiqueta de Envío",
  formato: "etiqueta",
  descripcion: "Etiqueta logística 100x150mm para impresión térmica",

  render({ data, opts, empresa, color, fecha }: RenderContext): string {
    const c    = data.comprador;
    const v    = data.vendedor;
    const item = data.items?.[0];
    const sid  = shortId(data.id);
    const qr   = data.qrData || `https://charliemarket.com.uy/orden/${data.id}`;

    const body = `
      <div style="border:2px solid #000;padding:4mm;height:calc(100vh - 12mm);display:flex;flex-direction:column">

        <div style="display:flex;justify-content:space-between;align-items:center;
                    border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:3mm">
          <div style="font-size:13px;font-weight:900;letter-spacing:-0.5px">${empresa.nombre.toUpperCase()}</div>
          <div style="font-size:7px;color:#444;text-align:right;line-height:1.5">${fecha}<br/>#${sid}</div>
        </div>

        <div style="display:flex;gap:3mm;flex:1">
          <div style="flex:1;display:flex;flex-direction:column;gap:2.5mm">

            <div>
              <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:1px">Destinatario</div>
              <div style="font-size:12px;font-weight:900;line-height:1.2">${(c?.nombre || "—").toUpperCase()}</div>
              ${c?.direccion ? `<div style="font-size:9px;line-height:1.4">${c.direccion}</div>` : ""}
              ${c?.ciudad    ? `<div style="font-size:9px">${c.ciudad}</div>` : ""}
              ${c?.telefono  ? `<div style="font-size:8px;color:#555">Tel: ${c.telefono}</div>` : ""}
            </div>

            <hr style="border:none;border-top:1px dashed #aaa"/>

            <div>
              <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:1px">Remitente</div>
              <div style="font-size:9px;font-weight:700">${v?.nombre || "—"}</div>
              ${v?.direccion ? `<div style="font-size:8px;color:#555">${v.direccion}</div>` : ""}
            </div>

            <hr style="border:none;border-top:1px dashed #aaa"/>

            <div>
              <div style="font-size:6.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777;margin-bottom:1px">Producto</div>
              <div style="font-size:9px;font-weight:700">${item?.descripcion || "Artículo"}</div>
              <div style="font-size:7.5px;color:#777">ID: ${data.id.slice(0,14)}</div>
            </div>

          </div>

          <div style="display:flex;flex-direction:column;align-items:center;gap:2mm;flex-shrink:0">
            ${blockQR(qr, data.id, 80)}
          </div>
        </div>

        <div style="border-top:2px solid #000;margin-top:3mm;padding-top:2.5mm;
                    display:flex;justify-content:space-between;align-items:center">
          <div style="font-family:monospace;font-size:10px;letter-spacing:2px;font-weight:700">||| ${sid} |||</div>
          ${data.monto ? `<div style="font-size:9px;font-weight:700">${fmtMonto(data.monto, data.moneda)}</div>` : ""}
          ${data.trackingCode ? `<div style="font-size:7.5px;color:#555">Track: ${data.trackingCode}</div>` : ""}
        </div>
      </div>`;

    return wrapHTML("Etiqueta de Envío", baseStyles("#000", "etiqueta"), body, opts.autoPrint);
  }
};



