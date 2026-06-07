import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") || "noreply@market.oddy.com.uy";

function templateOrdenCreada(payload: any): { subject: string; html: string } {
  return {
    subject: `✅ Tu orden #${payload.order_id?.substring(0, 8).toUpperCase()} fue recibida`,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #FF6835; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">¡Orden recibida! 🎉</h1>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 12px 12px;">
          <p style="color: #444;">Hola, tu orden fue recibida correctamente.</p>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #888; font-size: 0.85rem;">Número de orden</p>
            <p style="margin: 4px 0 0; font-weight: 700; color: #222;">#${payload.order_id?.substring(0, 8).toUpperCase()}</p>
          </div>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #888; font-size: 0.85rem;">Total</p>
            <p style="margin: 4px 0 0; font-weight: 700; color: #FF6835; font-size: 1.25rem;">$U ${payload.total?.toLocaleString('es-UY')}</p>
          </div>
          <p style="color: #888; font-size: 0.85rem;">Procesaremos tu pago a la brevedad.</p>
          <a href="https://market.oddy.com.uy/orden/${payload.order_id}" style="display: inline-block; background: #FF6835; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 16px;">
            Ver mi orden
          </a>
        </div>
      </div>
    `,
  };
}

function templatePagoConfirmado(payload: any): { subject: string; html: string } {
  return {
    subject: `💳 Pago confirmado — Orden #${payload.order_id?.substring(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #6BB87A; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">¡Pago confirmado! ✅</h1>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 12px 12px;">
          <p style="color: #444;">Tu pago fue procesado exitosamente.</p>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #6BB87A;">
            <p style="margin: 0; color: #166534; font-weight: 700;">Orden #${payload.order_id?.substring(0, 8).toUpperCase()} — PAGADA</p>
          </div>
          <a href="https://market.oddy.com.uy/orden/${payload.order_id}" style="display: inline-block; background: #6BB87A; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 16px;">
            Ver mi orden
          </a>
        </div>
      </div>
    `,
  };
}

function templateProductoVendido(payload: any): { subject: string; html: string } {
  return {
    subject: `🎉 Tu producto "${payload.product_name}" fue vendido`,
    html: `
      <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #FF6835; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">¡Vendiste un producto! 🎉</h1>
        </div>
        <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 12px 12px;">
          <p style="color: #444;">Tu publicación fue comprada exitosamente.</p>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #888; font-size: 0.85rem;">Producto</p>
            <p style="margin: 4px 0 0; font-weight: 700; color: #222;">${payload.product_name}</p>
          </div>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #888; font-size: 0.85rem;">Precio de venta</p>
            <p style="margin: 4px 0 0; font-weight: 700; color: #FF6835;">$U ${payload.price?.toLocaleString('es-UY')}</p>
          </div>
          <a href="https://market.oddy.com.uy/dashboard/publicaciones" style="display: inline-block; background: #FF6835; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 16px;">
            Ver mis ventas
          </a>
        </div>
      </div>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { user_id, type, payload } = await req.json();
    if (!user_id || !type) {
      return new Response(JSON.stringify({ error: "user_id y type requeridos" }), { status: 400, headers: corsHeaders });
    }

    // Obtener email del usuario
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id);
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404, headers: corsHeaders });
    }

    // Seleccionar template
    let template: { subject: string; html: string };
    if (type === "orden_creada")       template = templateOrdenCreada(payload);
    else if (type === "pago_confirmado") template = templatePagoConfirmado(payload);
    else if (type === "producto_vendido") template = templateProductoVendido(payload);
    else return new Response(JSON.stringify({ error: "Tipo de email inválido" }), { status: 400, headers: corsHeaders });

    // Enviar via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [user.email],
        subject: template.subject,
        html:    template.html,
      }),
    });

    const resendData = await resendRes.json();

    // Loggear en audit
    await supabase.rpc("log_event", {
      p_event_type:  resendRes.ok ? "email_sent" : "email_error",
      p_entity_type: "user",
      p_entity_id:   user_id,
      p_payload:     { type, email: user.email, resend_id: resendData.id, error: resendData.message },
    });

    if (!resendRes.ok) {
      console.error("[send-email] Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Error enviando email" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[send-email] Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: corsHeaders });
  }
});




