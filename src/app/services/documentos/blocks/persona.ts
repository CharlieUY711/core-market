import { PersonaDoc } from "../types";

export function blockPersona(label: string, p?: PersonaDoc): string {
  if (!p) return `<div><div class="doc-label">${label}</div><div style="color:#aaa;font-size:0.85em">—</div></div>`;
  return `
    <div>
      <div class="doc-label">${label}</div>
      <div style="font-weight:700;font-size:1em;line-height:1.3">${p.nombre}</div>
      ${p.direccion ? `<div style="font-size:0.85em;color:#333">${p.direccion}</div>` : ""}
      ${p.ciudad    ? `<div style="font-size:0.85em;color:#333">${p.ciudad}</div>` : ""}
      ${p.telefono  ? `<div style="font-size:0.8em;color:#555">Tel: ${p.telefono}</div>` : ""}
      ${p.email     ? `<div style="font-size:0.8em;color:#555">${p.email}</div>` : ""}
      ${p.docId     ? `<div style="font-size:0.75em;color:#999">Doc: ${p.docId}</div>` : ""}
    </div>`;
}



