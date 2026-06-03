import { EmpresaConfig } from "../types";

export const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre:    "Charlie Market",
  color:     "#FF7A00",
  web:       "charliemarket.com.uy",
  email:     "soporte@core.lat",
};

export function fmtFecha(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("es-UY", { day:"2-digit", month:"2-digit", year:"numeric" });
}

export function fmtMonto(n: number, moneda = "UYU"): string {
  return `${moneda} ${n.toLocaleString("es-UY", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
}

export function qrImgTag(data: string, size = 100): string {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  return `<img src="${url}" alt="QR" width="${size}" height="${size}" style="display:block"/>`;
}

export function baseStyles(color: string, formato: "a4"|"etiqueta"): string {
  const pageSize = formato === "etiqueta" ? "100mm 150mm" : "A4";
  return `
    @page { size: ${pageSize}; margin: ${formato==="etiqueta"?"6mm":"15mm"}; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff;
           font-size: ${formato==="etiqueta"?"10px":"12px"}; }
    .accent   { color: ${color}; }
    .label    { font-size: 0.72em; font-weight: 700; text-transform: uppercase;
                letter-spacing: .06em; color: #888; margin-bottom: 2px; }
    .section  { margin-bottom: 14px; }
    .divider  { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
    .dash-div { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
    table     { width: 100%; border-collapse: collapse; }
    th        { background: ${color}; color: #fff; padding: 5px 8px; font-size: 0.8em; text-align: left; }
    td        { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 0.85em; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 700; border-top: 2px solid ${color}; background: #fafafa; }
    .badge    { display: inline-block; padding: 2px 8px; border-radius: 20px;
                background: ${color}; color: #fff; font-size: 0.7em; font-weight: 700; }
    .footer   { margin-top: 20px; font-size: 0.75em; color: #aaa; text-align: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

export function headerBlock(empresa: EmpresaConfig, docLabel: string, docId: string, fecha: string): string {
  const color = empresa.color || "#FF7A00";
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;
                border-bottom:2px solid ${color};padding-bottom:10px;margin-bottom:14px">
      <div>
        ${empresa.logoUrl
          ? `<img src="${empresa.logoUrl}" alt="${empresa.nombre}" style="height:40px;margin-bottom:4px"/>`
          : `<div style="font-size:1.6em;font-weight:900;color:${color}">${empresa.nombre}</div>`}
        ${empresa.web ? `<div style="font-size:0.75em;color:#888">${empresa.web}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:1.1em;font-weight:700;color:${color};text-transform:uppercase">${docLabel}</div>
        <div style="font-size:0.8em;color:#555;margin-top:3px"># ${docId.toUpperCase().slice(0,10)}</div>
        <div style="font-size:0.78em;color:#888">${fecha}</div>
      </div>
    </div>`;
}

export function personaBlock(label: string, p?: { nombre:string; direccion?:string; ciudad?:string; telefono?:string; email?:string; docId?:string }): string {
  if (!p) return "";
  return `
    <div>
      <div class="label">${label}</div>
      <div style="font-weight:700;font-size:1em">${p.nombre}</div>
      ${p.direccion ? `<div>${p.direccion}</div>` : ""}
      ${p.ciudad    ? `<div>${p.ciudad}</div>`    : ""}
      ${p.telefono  ? `<div style="color:#555">Tel: ${p.telefono}</div>`  : ""}
      ${p.email     ? `<div style="color:#555">${p.email}</div>`          : ""}
      ${p.docId     ? `<div style="color:#888;font-size:0.85em">Doc: ${p.docId}</div>` : ""}
    </div>`;
}

export function itemsTable(items: {descripcion:string;cantidad:number;precioUnit:number;moneda?:string}[], moneda="UYU"): string {
  const rows = items.map(i => {
    const sub = i.cantidad * i.precioUnit;
    return `<tr>
      <td>${i.descripcion}</td>
      <td style="text-align:center">${i.cantidad}</td>
      <td style="text-align:right">${fmtMonto(i.precioUnit, i.moneda||moneda)}</td>
      <td style="text-align:right">${fmtMonto(sub, i.moneda||moneda)}</td>
    </tr>`;
  }).join("");
  const total = items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);
  return `
    <table>
      <thead><tr>
        <th>Descripción</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">Precio unit.</th>
        <th style="text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3" style="text-align:right">TOTAL</td>
          <td style="text-align:right">${fmtMonto(total, moneda)}</td>
        </tr>
      </tbody>
    </table>`;
}

export function footerBlock(empresa: EmpresaConfig): string {
  return `
    <div class="footer">
      ${empresa.nombre} · ${empresa.email||""} · ${empresa.telefono||""}<br/>
      Documento generado el ${fmtFecha()} — charliemarket.com.uy
    </div>`;
}

export function wrapHTML(title: string, styles: string, body: string, autoPrint = false): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>${styles}</style>
${autoPrint ? `<script>window.onload=()=>setTimeout(()=>window.print(),800)</script>` : ""}
</head>
<body>${body}</body>
</html>`;
}
