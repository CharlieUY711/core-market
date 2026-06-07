import { EmpresaConfig } from "../types";

export function blockFooter(empresa: EmpresaConfig): string {
  const parts = [empresa.nombre, empresa.email, empresa.telefono, empresa.web].filter(Boolean);
  return `
    <div class="doc-footer">
      ${parts.join(" · ")}<br/>
      Documento generado el ${new Date().toLocaleDateString("es-UY")} — charliemarket.com.uy
    </div>`;
}

export function blockFirma(label = "Firma y aclaración"): string {
  return `
    <div style="margin-top:16px">
      <div class="doc-label">${label}</div>
      <div style="border-bottom:1px solid #333;margin-top:40px;margin-bottom:4px"></div>
      <div style="font-size:0.75em;color:#aaa">Nombre completo y fecha</div>
    </div>`;
}



