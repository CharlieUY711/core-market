import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ML_TOKEN = Deno.env.get("ML_ACCESS_TOKEN")

serve(async (req) => {
  try {
    const body = await req.json()

    const event_id = body.id || body.resource
    const topic = body.topic
    const resource = body.resource

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 🔒 IDEMPOTENCIA
    const { data: existing } = await supabase
      .from("ml_webhook_events")
      .select("id")
      .eq("event_id", event_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ status: "ignored_duplicate" }))
    }

    await supabase.from("ml_webhook_events").insert({
      event_id,
      topic,
      resource
    })

    // 🔽 SOLO PROCESAMOS ÓRDENES
    if (topic !== "orders_v2") {
      return new Response(JSON.stringify({ status: "ignored_topic" }))
    }

    // 🔽 OBTENER ORDEN DE ML
    const mlRes = await fetch(
      `https://api.mercadolibre.com${resource}`,
      {
        headers: {
          Authorization: `Bearer ${ML_TOKEN}`
        }
      }
    )

    const order = await mlRes.json()

    const ml_item_id = order.order_items[0].item.id
    const quantity = order.order_items[0].quantity
    const price = order.order_items[0].unit_price

    // 🔽 BUSCAR PRODUCTO LOCAL
    const { data: product } = await supabase
      .from("products")
      .select("id, stock")
      .eq("ml_item_id", ml_item_id)
      .single()

    if (!product) {
      return new Response(JSON.stringify({ error: "product_not_found" }), { status: 400 })
    }

    // 🔽 CREAR ORDEN INTERNA
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: null,
        total: price * quantity,
        currency: "UYU",
        payment_status: "paid",
        source: "mercadolibre"
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 🔽 ITEM
    await supabase.from("order_items").insert({
      order_id: newOrder.id,
      product_id: product.id,
      quantity,
      price
    })

    // 🔽 STOCK (ATÓMICO)
    const { error: stockError } = await supabase.rpc("descontar_stock", {
      p_product_id: product.id,
      p_quantity: quantity
    })

    if (stockError) throw stockError

    // 🔽 MARCAR EVENTO COMO PROCESADO
    await supabase
      .from("ml_webhook_events")
      .update({ processed: true })
      .eq("event_id", event_id)

    return new Response(JSON.stringify({ status: "processed" }))

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})



