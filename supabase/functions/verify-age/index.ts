import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { user_id } = await req.json()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  )

  await supabase
    .from("profiles")
    .update({ age_verified: true })
    .eq("id", user_id)

  return new Response(JSON.stringify({ ok: true }))
})




