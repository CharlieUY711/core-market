import { DocumentoData, RenderOptions } from "../types";
import {
  DEFAULT_EMPRESA, fmtFecha, fmtMonto, qrImgTag,
  baseStyles, wrapHTML
} from "../renderers/baseHTML";

export function renderEtiquetaEnvio(data: DocumentoData, opts: RenderOptions = {}): string {
  const empresa = { ...DEFAULT_EMPRESA, ...data.empresa };
  const color   = opts.colorPrimary || empresa.color || "#FF7A00";
  const fecha   = fmtFecha(data.fecha);
  const c       = data.comprador;
  const v       = data.vendedor;
  const item    = data.items?.[0];

  const body = `
    <div style="border:2px solid #111;padding:8px;height:calc(100% - 4px)">

      <div style="display:flex;justify-content:space-between;align-items:center;
                  border-bottom:1.5px solid #111;padding-bottom:5px;margin-bottom:7px">
        <div style="font-size:1.1em;font-weight:900;color:${color}">${empresa.nombre}</div>
        <div style="font-size:0.72em;color:#666">${fecha} · #${data.id.slice(0,8).toUpperCase()}</div>
      </div>

      <div style="display:flex;gap:8px">
        <div style="flex:1">
          <div style="font-size:0.65em;font-weight:700;text-transform:uppercase;color:#aaa;margin-bottom:1px">Destinatario</div>
          <div style="font-size:1em;font-weight:900;line-height:1.2">${c?.nombre || "—"}</div>
          ${c?.direccion ? `<div style="font-size:0.85em;color:#222">${c.direccion}</div>` : ""}
          ${c?.ciudad    ? `<div style="font-size:0.85em;color:#222">${c.ciudad}</div>`    : ""}
          ${c?.telefono  ? `<div style="font-size:0.78em;color:#666">Tel: ${c.telefono}</div>` : ""}

          <div style="border-top:1px dashed #ccc;margin:5px 0"></div>

          <div style="font-size:0.65em;font-weight:700;text-transform:uppercase;color:#aaa;margin-bottom:1px">Remitente</div>
          <div style="font-size:0.85em;color:#333">${v?.nombre || "—"}</div>
          ${v?.direccion ? `<div style="font-size:0.78em;color:#666">${v.direccion}</div>` : ""}

          <div style="border-top:1px dashed #ccc;margin:5px 0"></div>

          <div style="font-size:0.65em;font-weight:700;text-transform:uppercase;color:#aaa;margin-bottom:1px">Producto</div>
          <div style="font-size:0.85em;font-weight:700">${item?.descripcion || "Artículo"}</div>
          ${data.monto ? `<div style="font-size:0.8em;font-weight:700;color:${color}">${fmtMonto(data.monto, data.moneda)}</div>` : ""}
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
          ${qrImgTag(data.qrData || `https://market.oddy.com.uy/orden/${data.id}`, 80)}
          <div style="font-size:0.6em;color:#aaa;text-align:center;max-width:85px;word-break:break-all">${data.id}</div>
        </div>
      </div>

      <div style="border-top:1.5px solid #111;margin-top:6px;padding-top:5px;
                  display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:monospace;font-size:0.85em;letter-spacing:2px">||| ${data.id.slice(0,12).toUpperCase()} |||</div>
        ${data.trackingCode ? `<div style="font-size:0.75em;color:#555">Track: ${data.trackingCode}</div>` : ""}
      </div>
    </div>
  `;

  return wrapHTML("Etiqueta de Envío", baseStyles(color, "etiqueta"), body, opts.autoPrint);
}