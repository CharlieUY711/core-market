import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPayPalToken(): Promise<string> {
  const clientId     = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const base         = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id requerido" }), { status: 400, headers: corsHeaders });

    // Obtener orden
    const { data: orden, error: ordenError } = await supabase
      .from("ordenes")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .eq("estado", "pendiente")
      .single();

    if (ordenError || !orden) return new Response(JSON.stringify({ error: "Orden no encontrada" }), { status: 404, headers: corsHeaders });

    // Idempotencia — si ya tiene paypal_order_id retornar
    if (orden.paypal_order_id) {
      return new Response(JSON.stringify({ paypal_order_id: orden.paypal_order_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const total    = orden.moneda === "USD" ? Number(orden.total_usd) : Number(orden.total_uyu);
    const currency = orden.moneda === "USD" ? "USD" : "UYU";
    const base     = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
    const appUrl   = Deno.env.get("APP_URL") || "https://market.oddy.com.uy";

    const token = await getPayPalToken();

    // Crear orden en PayPal
    const ppRes = await fetch(`${base}/v2/checkout/orders`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: order_id,
          amount: { currency_code: currency, value: total.toFixed(2) },
          description: `Orden ODDY #${order_id.substring(0, 8).toUpperCase()}`,
        }],
        application_context: {
          return_url: `${appUrl}/orden/${order_id}?status=success&gateway=paypal`,
          cancel_url: `${appUrl}/orden/${order_id}?status=failure&gateway=paypal`,
        },
      }),
    });

    const ppData = await ppRes.json();
    if (!ppRes.ok) throw new Error(ppData.message || "Error creando orden PayPal");

    // Guardar paypal_order_id en la orden
    await supabase.from("ordenes")
      .update({ paypal_order_id: ppData.id })
      .eq("id", order_id);

    const approveLink = ppData.links?.find((l: any) => l.rel === "approve")?.href;

    await supabase.rpc("log_event", {
      p_event_type:  "paypal_order_created",
      p_entity_type: "order",
      p_entity_id:   order_id,
      p_payload:     { paypal_order_id: ppData.id },
    });

    return new Response(JSON.stringify({ paypal_order_id: ppData.id, approve_url: approveLink }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[create-paypal-order] Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: corsHeaders });
  }
});




