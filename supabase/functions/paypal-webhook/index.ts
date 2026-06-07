import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  try {
    if (req.method !== "POST") return new Response("ok", { status: 200 });

    const body = await req.json().catch(() => ({}));
    const eventId = body.id;

    if (!eventId) return new Response("ok", { status: 200 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotencia
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id, processed")
      .eq("payment_id", eventId)
      .eq("event_type", "paypal_webhook")
      .single();

    if (existing?.processed) return new Response("ok", { status: 200 });

    // Registrar evento
    await supabase.from("webhook_events").upsert({
      payment_id: eventId,
      event_type: "paypal_webhook",
      payload:    body,
      processed:  false,
    }, { onConflict: "payment_id" });

    // Solo procesar CHECKOUT.ORDER.APPROVED o PAYMENT.CAPTURE.COMPLETED
    if (!["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"].includes(body.event_type)) {
      return new Response("ok", { status: 200 });
    }

    const ppOrderId = body.resource?.id || body.resource?.supplementary_data?.related_ids?.order_id;
    if (!ppOrderId) return new Response("ok", { status: 200 });

    // Si es APPROVED → capturar pago
    const base  = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
    const token = await getPayPalToken();

    if (body.event_type === "CHECKOUT.ORDER.APPROVED") {
      await fetch(`${base}/v2/checkout/orders/${ppOrderId}/capture`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      return new Response("ok", { status: 200 });
    }

    // PAYMENT.CAPTURE.COMPLETED → confirmar orden
    const orderId = body.resource?.purchase_units?.[0]?.reference_id
      || body.resource?.supplementary_data?.related_ids?.order_id;

    if (!orderId) return new Response("ok", { status: 200 });

    // Buscar orden interna
    const { data: orden } = await supabase
      .from("ordenes")
      .select("id, payment_status")
      .eq("id", orderId)
      .single();

    if (!orden || orden.payment_status === "paid") {
      await supabase.from("webhook_events")
        .update({ processed: true })
        .eq("payment_id", eventId);
      return new Response("ok", { status: 200 });
    }

    // Confirmar pago via RPC
    const { error: rpcError } = await supabase.rpc("confirmar_pago", {
      p_order_id:   orderId,
      p_payment_id: ppOrderId,
      p_payload:    body,
    });

    if (rpcError) {
      console.error("[paypal-webhook] Error RPC confirmar_pago:", rpcError);
    } else {
      await supabase.rpc("log_event", {
        p_event_type:  "paypal_payment_confirmed",
        p_entity_type: "order",
        p_entity_id:   orderId,
        p_payload:     { paypal_order_id: ppOrderId, event_type: body.event_type },
      });
    }

    // Marcar procesado
    await supabase.from("webhook_events")
      .update({ processed: true })
      .eq("payment_id", eventId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[paypal-webhook] Error:", error);
    return new Response("ok", { status: 200 });
  }
});




