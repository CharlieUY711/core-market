import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit simple en memoria (por instancia)
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT    = 30;   // max requests
const RATE_WINDOW   = 60000; // 1 minuto en ms

function checkRateLimit(key: string): boolean {
  const now  = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const VALID_EVENTS = [
  "view_product",
  "add_to_cart",
  "checkout_started",
  "purchase_completed",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader
        ? { global: { headers: { Authorization: authHeader } } }
        : {}
    );

    // Obtener usuario (puede ser null para anon)
    const { data: { user } } = await userClient.auth.getUser();

    // Rate limit por user_id o IP
    const ip       = req.headers.get("x-forwarded-for") || "unknown";
    const rateKey  = user?.id || ip;

    if (!checkRateLimit(rateKey)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: corsHeaders,
      });
    }

    // Parsear body
    const { event_type, metadata } = await req.json();

    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type requerido" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!VALID_EVENTS.includes(event_type)) {
      return new Response(JSON.stringify({ error: "event_type inválido" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Insertar evento via service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.rpc("track_event", {
      p_user_id:    user?.id ?? null,
      p_event_type: event_type,
      p_metadata:   metadata || {},
    });

    if (error) {
      console.error("[track-event] Error RPC:", error.message);
      return new Response(JSON.stringify({ error: "Error interno" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[track-event] Error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});




