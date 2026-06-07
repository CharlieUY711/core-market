import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items requeridos" }), { status: 400, headers: corsHeaders });
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return new Response(JSON.stringify({ error: "item invalido" }), { status: 400, headers: corsHeaders });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("crear_orden_segura", {
      p_user_id: user.id,
      p_items: items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        tipo: i.tipo || "market",
      })),
    });

    if (error) {
      console.error("RPC error:", error);
      const msg = error.message?.includes("Stock insuficiente")
        ? "Stock insuficiente para uno o más productos"
        : error.message?.includes("no encontrado")
        ? "Uno o más productos no están disponibles"
        : error.message?.includes("pausado")
        ? "Uno o más productos están pausados"
        : "Error procesando la orden";
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ order_id: data.order_id, total: data.total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});




