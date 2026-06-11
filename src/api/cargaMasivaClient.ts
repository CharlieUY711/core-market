// ─────────────────────────────────────────────────────────────────────────────
// CORE Market — Carga Masiva (cliente)
//
// Parseo 100% client-side. core-market es un SPA de Vite (sin serverless),
// así que la importación se resuelve en el navegador:
//   • CSV  → papaparse
//   • PDF  → pdfjs-dist (extracción de texto)
//   • URL  → fetch best-effort (limitado por CORS del sitio destino)
//
// Las libs se cargan con import() dinámico para no engordar el bundle principal.
// ─────────────────────────────────────────────────────────────────────────────

export interface CargaMasivaResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Máximo de filas a devolver en el preview (el resto se cuenta pero no se vuelca).
const PREVIEW_ROWS = 50;
// Máximo de caracteres de texto de PDF a devolver en el preview.
const PREVIEW_CHARS = 4000;

// ── CSV ──────────────────────────────────────────────────────────────────────
export async function importCatalogFromCsv(
  file: File
): Promise<CargaMasivaResult> {
  try {
    // papaparse no trae tipos propios y @types/papaparse no está en el repo,
    // por eso lo tipamos de forma laxa.
    const Papa = (await import("papaparse")).default as any;

    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h: string) => h.trim(),
    });

    const rows: Record<string, string>[] = parsed.data ?? [];
    const columns: string[] = parsed.meta?.fields ?? [];
    const errors = (parsed.errors ?? []).map((e: any) => e.message);

    return {
      success: true,
      data: {
        source: "csv",
        fileName: file.name,
        sizeKB: +(file.size / 1024).toFixed(1),
        rowCount: rows.length,
        columns,
        parseWarnings: errors.length ? errors.slice(0, 10) : undefined,
        rows, // dataset completo: el componente decide cuánto mostrar
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `No se pudo procesar el CSV: ${err.message}`
          : "No se pudo procesar el CSV.",
    };
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function importCatalogFromPdf(
  file: File
): Promise<CargaMasivaResult> {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Worker resuelto por Vite (se empaqueta junto al build).
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText +=
        content.items
          .map((it: any) => ("str" in it ? it.str : ""))
          .join(" ") + "\n";
    }

    const cleaned = fullText.replace(/\s+/g, " ").trim();

    return {
      success: true,
      data: {
        source: "pdf",
        fileName: file.name,
        sizeKB: +(file.size / 1024).toFixed(1),
        pageCount: pdf.numPages,
        textLength: cleaned.length,
        preview: cleaned.slice(0, PREVIEW_CHARS),
        previewTruncated: cleaned.length > PREVIEW_CHARS,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `No se pudo procesar el PDF: ${err.message}`
          : "No se pudo procesar el PDF.",
    };
  }
}

// ── URL ──────────────────────────────────────────────────────────────────────
// Best-effort: el fetch al sitio del proveedor depende de que ese sitio
// habilite CORS. Si no lo hace, el navegador bloquea la respuesta y se informa
// con un error claro (ese caso requeriría un proxy/backend — opción B).
export async function importCatalogFromUrl(
  url: string
): Promise<CargaMasivaResult> {
  try {
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      return {
        success: false,
        error: `El servidor respondió ${res.status} ${res.statusText}.`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();

    // Si es CSV, lo parseamos con el mismo pipeline.
    if (contentType.includes("csv") || url.toLowerCase().endsWith(".csv")) {
      const Papa = (await import("papaparse")).default as any;
      const parsed = Papa.parse(body, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h: string) => h.trim(),
      });
      const rows: Record<string, string>[] = parsed.data ?? [];
      return {
        success: true,
        data: {
          source: "url",
          contentKind: "csv",
          url,
          contentType,
          rowCount: rows.length,
          columns: parsed.meta?.fields ?? [],
          rows,
        },
      };
    }

    // Cualquier otro tipo: devolvemos metadatos + snippet para inspección.
    return {
      success: true,
      data: {
        source: "url",
        contentKind: contentType.includes("html") ? "html" : "text",
        url,
        contentType,
        length: body.length,
        preview: body.slice(0, PREVIEW_CHARS),
        previewTruncated: body.length > PREVIEW_CHARS,
      },
    };
  } catch (err) {
    const isCors =
      err instanceof TypeError && /fetch|load failed|network/i.test(err.message);
    return {
      success: false,
      error: isCors
        ? "No se pudo acceder a la URL (probablemente bloqueada por CORS del sitio destino). Importar por URL desde un dominio externo suele requerir un proxy/backend."
        : err instanceof Error
        ? `No se pudo importar desde la URL: ${err.message}`
        : "No se pudo importar desde la URL.",
    };
  }
}
