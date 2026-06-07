import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { product_id } = await req.json();
    if (!product_id) return new Response(JSON.stringify({ error: "product_id requerido" }), { status: 400, headers: corsHeaders });

    // 1. Obtener producto
    const { data: producto, error: prodError } = await supabase
      .from("productos_market")
      .select("*, departamento_nombre")
      .eq("id", product_id)
      .single();

    if (prodError || !producto) return new Response(JSON.stringify({ error: "Producto no encontrado" }), { status: 404, headers: corsHeaders });

    // 2. Validar stock
    if (!producto.stock || producto.stock <= 0) {
      return new Response(JSON.stringify({ error: "Stock insuficiente para publicar" }), { status: 400, headers: corsHeaders });
    }

    // 3. Obtener precio desde product_prices (price_ml fallback price_oddy fallback precio)
    const { data: prices } = await supabase
      .from("product_prices")
      .select("price_ml, price_oddy")
      .eq("product_id", product_id)
      .single();

    const precio = prices?.price_ml ?? prices?.price_oddy ?? producto.precio;
    if (!precio) return new Response(JSON.stringify({ error: "Precio no configurado" }), { status: 400, headers: corsHeaders });

    // 4. Obtener categoría ML
    const { data: catMap, error: catError } = await supabase
      .from("ml_category_mapping")
      .select("ml_category_id")
      .eq("oddy_category", producto.departamento_nombre)
      .single();

    if (catError || !catMap) {
      return new Response(JSON.stringify({ error: `Categoría "${producto.departamento_nombre}" no mapeada a ML` }), { status: 400, headers: corsHeaders });
    }

    // 5. Validar imágenes
    const imagenes = [producto.imagen_principal].filter(Boolean);
    if (imagenes.length === 0) return new Response(JSON.stringify({ error: "Se requiere al menos una imagen" }), { status: 400, headers: corsHeaders });

    // 6. Construir payload ML
    const mlPayload = {
      title:              producto.nombre,
      category_id:        catMap.ml_category_id,
      price:              Number(precio),
      currency_id:        "UYU",
      available_quantity: producto.stock,
      buying_mode:        "buy_it_now",
      condition:          "new",
      listing_type_id:    "gold_special",
      pictures:           imagenes.map(url => ({ source: url })),
      description: {
        plain_text: producto.descripcion || producto.nombre,
      },
    };

    // 7. Llamar API de ML
    const mlToken = Deno.env.get("ML_ACCESS_TOKEN")!;
    const mlRes = await fetch("https://api.mercadolibre.com/items", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${mlToken}`,
      },
      body: JSON.stringify(mlPayload),
    });

    const mlData = await mlRes.json();

    if (!mlRes.ok) {
      // Guardar error
      await supabase.from("productos_market")
        .update({ sync_status: "error", ml_last_sync: new Date().toISOString() })
        .eq("id", product_id);

      await supabase.from("ml_listings").insert({
        product_id,
        ml_item_id:   "error",
        status:       "error",
        price:        precio,
        last_sync:    new Date().toISOString(),
        raw_response: mlData,
      });

      await supabase.rpc("log_event", {
        p_event_type:  "ml_publish_error",
        p_entity_type: "product",
        p_entity_id:   product_id,
        p_payload:     { error: mlData },
      });

      return new Response(JSON.stringify({ error: mlData.message || "Error en ML" }), { status: 400, headers: corsHeaders });
    }

    // 8. Guardar resultado exitoso
    await supabase.from("productos_market")
      .update({
        ml_item_id:   mlData.id,
        ml_status:    mlData.status,
        ml_last_sync: new Date().toISOString(),
        sync_status:  "synced",
      })
      .eq("id", product_id);

    await supabase.from("ml_listings").insert({
      product_id,
      ml_item_id:   mlData.id,
      status:       mlData.status,
      price:        precio,
      last_sync:    new Date().toISOString(),
      raw_response: mlData,
    });

    await supabase.rpc("log_event", {
      p_event_type:  "ml_published",
      p_entity_type: "product",
      p_entity_id:   product_id,
      p_payload:     { ml_item_id: mlData.id, status: mlData.status },
    });

    return new Response(JSON.stringify({ ok: true, ml_item_id: mlData.id, status: mlData.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: corsHeaders });
  }
});




