import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("[reconcile-stock] Iniciando reconciliación...");

    const { data, error } = await supabase.rpc("reconcile_stock");

    if (error) {
      console.error("[reconcile-stock] Error RPC:", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[reconcile-stock] Resultado:", JSON.stringify(data));

    return new Response(JSON.stringify({ ok: true, result: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[reconcile-stock] Error inesperado:", err);
    return new Response(JSON.stringify({ ok: false, error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});




