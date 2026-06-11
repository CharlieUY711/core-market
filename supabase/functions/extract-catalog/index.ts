// ─────────────────────────────────────────────────────────────────────────────
// extract-catalog — convierte UN chunk de texto (de un PDF) en filas de producto
// usando Claude. El cliente orquesta el troceado y llama una vez por chunk, así
// cada invocación es corta y no choca con el límite de tiempo de Edge Functions.
//
// Deploy:  supabase functions deploy extract-catalog
// Secrets: supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
//          (opcional) supabase secrets set EXTRACT_MODEL="claude-sonnet-4-6"
// ─────────────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const DEFAULT_FIELDS = [
  "nombre", "descripcion", "marca", "codigo", "numero_parte",
  "ean", "modelo", "precio", "precio_original", "moneda",
  "stock", "imagenes", "categoria",
];

function buildSystem(fields: string[]): string {
  return [
    "Sos un extractor de catálogos de productos. Recibís texto crudo extraído de un PDF",
    "(puede traer ruido: encabezados, horarios de tienda, texto de marketing).",
    "Devolvé EXCLUSIVAMENTE un array JSON válido, sin texto antes ni después, sin ```.",
    "Cada elemento es un producto, con EXACTAMENTE estas claves:",
    JSON.stringify(fields) + ".",
    "Reglas:",
    "- Si un dato no aparece en el texto, poné null. NUNCA lo inventes.",
    "- NUNCA inventes precios: si no hay precio explícito, precio = null.",
    "- Ignorá todo lo que no sea un producto (promos genéricas, direcciones, horarios).",
    "- 'codigo' es el código/SKU del proveedor; 'numero_parte' es el MPN del fabricante;",
    "  'ean'/'gtin' es el código de barras; 'modelo' es el modelo comercial.",
    "- Si no hay productos en este fragmento, devolvé [].",
  ].join("\n");
}

function parseJsonArray(text: string): any[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Recorta a los límites del array por si el modelo agregó algo.
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  try {
    const parsed = JSON.parse(t);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "No autorizado" }, 401);

    // ── Input ──
    const { chunk, fields } = await req.json();
    if (!chunk || typeof chunk !== "string") {
      return json({ error: "Se requiere 'chunk' (texto)." }, 400);
    }
    const targetFields: string[] =
      Array.isArray(fields) && fields.length ? fields : DEFAULT_FIELDS;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "Falta ANTHROPIC_API_KEY en los secrets de la función." }, 500);
    }
    const model = Deno.env.get("EXTRACT_MODEL") ?? DEFAULT_MODEL;

    // ── Llamada a Claude ──
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: buildSystem(targetFields),
        messages: [{ role: "user", content: chunk }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({ error: `Anthropic ${resp.status}: ${detail.slice(0, 300)}` }, 200);
    }

    const data = await resp.json();
    const textOut = (data.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");

    const rows = parseJsonArray(textOut);

    return json({ rows, count: rows.length }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return json({ error: msg }, 200);
  }

  function json(obj: unknown, status: number) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
