import { ItemDoc } from "../types";
import { fmtMonto, calcTotal } from "./utils";

export function blockItemsTable(items: ItemDoc[], moneda = "UYU"): string {
  if (!items.length) return `<div style="color:#aaa;font-size:0.85em;padding:8px 0">Sin artículos</div>`;

  const rows = items.map(i => {
    const sub  = i.cantidad * i.precioUnit;
    const desc = i.descuento ? sub * (i.descuento / 100) : 0;
    const net  = sub - desc;
    return `<tr>
      <td>
        <div style="font-weight:600">${i.descripcion}</div>
        ${i.sku ? `<div style="font-size:0.75em;color:#999">SKU: ${i.sku}</div>` : ""}
      </td>
      <td style="text-align:center">${i.cantidad}</td>
      <td style="text-align:right">${fmtMonto(i.precioUnit, i.moneda || moneda)}</td>
      ${i.descuento ? `<td style="text-align:center;color:#e55">${i.descuento}%</td>` : `<td style="text-align:center;color:#ccc">—</td>`}
      <td style="text-align:right;font-weight:600">${fmtMonto(net, i.moneda || moneda)}</td>
    </tr>`;
  }).join("");

  const total = calcTotal(items);

  return `
    <table class="doc-table">
      <thead><tr>
        <th>Descripción</th>
        <th style="text-align:center;width:50px">Cant.</th>
        <th style="text-align:right;width:90px">Precio unit.</th>
        <th style="text-align:center;width:60px">Desc.</th>
        <th style="text-align:right;width:90px">Subtotal</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="4" style="text-align:right">TOTAL</td>
          <td style="text-align:right">${fmtMonto(total, moneda)}</td>
        </tr>
      </tbody>
    </table>`;
}



