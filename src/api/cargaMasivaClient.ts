// ─────────────────────────────────────────────────────────────────────────────
// CORE Market — Carga Masiva (cliente)
//
//   • CSV  → papaparse (client-side)
//   • PDF  → pdfjs-dist extrae el texto (client-side) → opcional: estructurar con IA
//   • URL  → Edge Function "import-proxy" (server-side, sin CORS)
//   • IA   → Edge Function "extract-catalog" (Claude) trocea el texto en filas
//
// Las libs pesadas se cargan con import() dinámico.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "@/utils/supabase/client";

export interface CargaMasivaResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

const PREVIEW_CHARS = 4000;

// Campos destino que le pedimos al extractor LLM.
const TARGET_KEYS = [
  "nombre", "descripcion", "marca", "codigo", "numero_parte",
  "ean", "modelo", "precio", "precio_original", "moneda",
  "stock", "imagenes", "categoria",
];

// ── CSV ──────────────────────────────────────────────────────────────────────
export async function importCatalogFromCsv(
  file: File
): Promise<CargaMasivaResult> {
  try {
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
        rows,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `No se pudo procesar el CSV: ${err.message}` : "No se pudo procesar el CSV.",
    };
  }
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function importCatalogFromPdf(
  file: File
): Promise<CargaMasivaResult> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
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
        content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n";
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
        text: cleaned, // texto completo, para el extractor IA
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `No se pudo procesar el PDF: ${err.message}` : "No se pudo procesar el PDF.",
    };
  }
}

// ── URL (vía Edge Function proxy) ────────────────────────────────────────────
export async function importCatalogFromUrl(
  url: string
): Promise<CargaMasivaResult> {
  try {
    const { data, error } = await supabase.functions.invoke("import-proxy", {
      body: { url },
    });
    if (error) return { success: false, error: `Proxy: ${error.message}` };
    if (!data?.ok) {
      return { success: false, error: data?.error ?? "No se pudo acceder a la URL." };
    }

    const contentType: string = data.contentType ?? "";
    const body: string = data.body ?? "";

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
        text: body, // texto completo, por si se quiere estructurar con IA
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `No se pudo importar desde la URL: ${err.message}` : "No se pudo importar desde la URL.",
    };
  }
}

// ── Extracción con IA (texto → filas estructuradas) ──────────────────────────
const CHUNK_SIZE = 8000;
const MAX_CHUNKS = 30;

function chunkText(text: string): string[] {
  // Corta en límites "Modelo" para no partir productos; agrupa hasta CHUNK_SIZE.
  const parts = text.split(/(?=\bModelo\b)/g);
  const chunks: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > CHUNK_SIZE && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur += p;
    }
  }
  if (cur.trim()) chunks.push(cur);

  // Fallback: un solo bloque gigante sin "Modelo" → corte fijo.
  if (chunks.length === 1 && chunks[0].length > CHUNK_SIZE) {
    const big = chunks[0];
    chunks.length = 0;
    for (let i = 0; i < big.length; i += CHUNK_SIZE) chunks.push(big.slice(i, i + CHUNK_SIZE));
  }
  return chunks.slice(0, MAX_CHUNKS);
}

export async function extractCatalogFromText(
  text: string,
  onProgress?: (done: number, total: number) => void
): Promise<CargaMasivaResult> {
  try {
    if (!text || !text.trim()) {
      return { success: false, error: "No hay texto para estructurar." };
    }
    const chunks = chunkText(text);
    const all: Record<string, any>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase.functions.invoke("extract-catalog", {
        body: { chunk: chunks[i], fields: TARGET_KEYS },
      });
      if (error) return { success: false, error: `Extracción: ${error.message}` };
      if (data?.error) return { success: false, error: data.error };
      if (Array.isArray(data?.rows)) all.push(...data.rows);
      onProgress?.(i + 1, chunks.length);
    }

    // Dedupe por identificador disponible.
    const seen = new Set<string>();
    const deduped = all.filter((r) => {
      const k = String(
        r.codigo || r.ean || r.numero_parte || r.modelo || r.nombre || JSON.stringify(r)
      ).trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Columnas presentes (en el orden de TARGET_KEYS).
    const present = new Set<string>();
    deduped.forEach((r) => Object.keys(r).forEach((k) => present.add(k)));
    const columns = TARGET_KEYS.filter((k) => present.has(k));

    // Normaliza a Record<string,string> para la grilla (objetos/arrays → JSON).
    const rows = deduped.map((r) => {
      const o: Record<string, string> = {};
      for (const c of columns) {
        const v = r[c];
        o[c] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      }
      return o;
    });

    return {
      success: true,
      data: {
        source: "pdf-llm",
        columns,
        rows,
        rowCount: rows.length,
        chunks: chunks.length,
        truncated: chunks.length >= MAX_CHUNKS,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `No se pudo estructurar: ${err.message}` : "No se pudo estructurar el contenido.",
    };
  }
}
