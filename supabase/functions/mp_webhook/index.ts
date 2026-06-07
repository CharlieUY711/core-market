import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    if (req.method === "GET") return new Response("ok", { status: 200 });

    const body = await req.json().catch(() => ({}));

    if (body.type !== "payment") return new Response("ok", { status: 200 });

    const paymentId = body?.data?.id;
    if (!paymentId) return new Response("ok", { status: 200 });

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN")!;

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mpToken}` },
    });

    if (!mpRes.ok) return new Response("ok", { status: 200 });

    const payment = await mpRes.json();

    if (payment.status !== "approved") return new Response("ok", { status: 200 });

    const orderId = payment.external_reference;
    if (!orderId) return new Response("ok", { status: 200 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: orden } = await supabase
      .from("ordenes")
      .select("id, estado")
      .eq("id", orderId)
      .single();

    if (!orden) return new Response("ok", { status: 200 });
    if (orden.estado === "pagado") return new Response("ok", { status: 200 });

    await supabase
      .from("ordenes")
      .update({ estado: "pagado", mp_payment_id: String(paymentId) })
      .eq("id", orderId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("ok", { status: 200 });
  }
});




