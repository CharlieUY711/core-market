export function wrapHTML(title: string, styles: string, body: string, autoPrint = false): string {
  const printScript = autoPrint
    ? `<script>window.onload=()=>setTimeout(()=>window.print(),800);</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>${styles}</style>
${printScript}
</head>
<body>${body}</body>
</html>`;
}



