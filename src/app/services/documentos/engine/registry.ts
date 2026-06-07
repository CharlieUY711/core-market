import { DocumentTemplate, TipoDocumento } from "../types";

class DocumentRegistry {
  private templates: Map<TipoDocumento, DocumentTemplate> = new Map();

  register(template: DocumentTemplate): void {
    if (this.templates.has(template.tipo)) {
      console.warn(`[DocumentRegistry] Sobreescribiendo template: ${template.tipo}`);
    }
    this.templates.set(template.tipo, template);
  }

  get(tipo: TipoDocumento): DocumentTemplate {
    const t = this.templates.get(tipo);
    if (!t) throw new Error(`[DocumentRegistry] Template no registrado: "${tipo}". Registrados: ${this.list().join(", ")}`);
    return t;
  }

  has(tipo: TipoDocumento): boolean {
    return this.templates.has(tipo);
  }

  list(): TipoDocumento[] {
    return Array.from(this.templates.keys());
  }

  // Para debug / admin
  describe(): { tipo: TipoDocumento; label: string; formato: string }[] {
    return Array.from(this.templates.values()).map(t => ({
      tipo:    t.tipo,
      label:   t.label,
      formato: t.formato,
    }));
  }
}

// Singleton global
export const documentRegistry = new DocumentRegistry();



