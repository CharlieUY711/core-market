import { qrUrl, shortId } from "./utils";

export function blockQR(data: string, ventaId: string, size = 80): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <img src="${qrUrl(data, size)}" alt="QR" width="${size}" height="${size}" style="display:block"/>
      <div style="font-size:0.65em;color:#aaa;text-align:center;max-width:${size+10}px;word-break:break-all">
        ${shortId(ventaId, 14)}
      </div>
    </div>`;
}



