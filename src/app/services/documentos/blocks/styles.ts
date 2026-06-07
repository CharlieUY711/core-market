import { FormatoDocumento } from "../types";

export function baseStyles(color: string, formato: FormatoDocumento): string {
  const pageSize  = formato === "etiqueta" ? "100mm 150mm" : formato === "a5" ? "A5" : "A4";
  const margin    = formato === "etiqueta" ? "0" : "15mm";
  const fontSize  = formato === "etiqueta" ? "10px" : "12px";

  return `
    @page { size: ${pageSize}; margin: ${margin}; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111; background: #fff;
      font-size: ${fontSize};
      ${formato === "etiqueta" ? "width:100mm;height:150mm;padding:6mm;" : ""}
    }
    .doc-accent   { color: ${color}; }
    .doc-badge    { display:inline-block; padding:2px 8px; border-radius:20px;
                    background:${color}; color:#fff; font-size:0.7em; font-weight:700; }
    .doc-label    { font-size:0.68em; font-weight:700; text-transform:uppercase;
                    letter-spacing:.07em; color:#888; margin-bottom:2px; }
    .doc-divider  { border:none; border-top:1px solid #ddd; margin:10px 0; }
    .doc-dash     { border:none; border-top:1px dashed #ccc; margin:8px 0; }
    .doc-section  { margin-bottom:12px; }
    .doc-grid2    { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    table.doc-table { width:100%; border-collapse:collapse; }
    table.doc-table th {
      background:${color}; color:#fff; padding:5px 8px;
      font-size:0.78em; text-align:left;
    }
    table.doc-table td { padding:5px 8px; border-bottom:1px solid #eee; font-size:0.82em; }
    table.doc-table tr:last-child td { border-bottom:none; }
    table.doc-table .total-row td {
      font-weight:700; border-top:2px solid ${color};
      background:#fafafa; font-size:0.9em;
    }
    .doc-footer {
      margin-top:20px; font-size:0.72em; color:#aaa; text-align:center;
      border-top:1px solid #eee; padding-top:8px;
    }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  `;
}



