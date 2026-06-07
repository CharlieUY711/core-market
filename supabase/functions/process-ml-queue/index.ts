import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_RETRIES = 3;

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const mlToken = Deno.env.get("ML_ACCESS_TOKEN")!;
  let processed = 0;
  let errors = 0;

  try {
    // 1. Obtener items pendientes (max 50 por ejecución)
    const { data: items, error: queueError } = await supabase
      .from("ml_sync_queue")
      .select("id, product_id, action, retries")
      .eq("status", "pending")
      .lt("retries", MAX_RETRIES)
      .order("created_at", { ascending: true })
      .limit(50);

    if (queueError) throw queueError;
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "Cola vacía" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[process-ml-queue] Procesando ${items.length} items`);

    for (const item of items) {
      try {
        // 2. Obtener datos del producto
        const { data: producto } = await supabase
          .from("productos_market")
          .select("id, ml_item_id, stock, precio")
          .eq("id", item.product_id)
          .single();

        if (!producto?.ml_item_id) {
          await supabase.from("ml_sync_queue")
            .update({ status: "error", updated_at: new Date().toISOString() })
            .eq("id", item.id);
          errors++;
          continue;
        }

        let mlRes: Response;

        if (item.action === "update_stock") {
          // 3. Llamar API ML — actualizar stock
          mlRes = await fetch(`https://api.mercadolibre.com/items/${producto.ml_item_id}`, {
            method: "PUT",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${mlToken}`,
            },
            body: JSON.stringify({ available_quantity: producto.stock }),
          });

        } else if (item.action === "update_price") {
          const { data: prices } = await supabase
            .from("product_prices")
            .select("price_ml, price_oddy")
            .eq("product_id", item.product_id)
            .single();

          const precio = prices?.price_ml ?? prices?.price_oddy ?? producto.precio;
          mlRes = await fetch(`https://api.mercadolibre.com/items/${producto.ml_item_id}`, {
            method: "PUT",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${mlToken}`,
            },
            body: JSON.stringify({ price: precio }),
          });

        } else if (item.action === "update_status") {
          const mlStatus = producto.stock === 0 ? "paused" : "active";
          mlRes = await fetch(`https://api.mercadolibre.com/items/${producto.ml_item_id}`, {
            method: "PUT",
            headers: {
              "Content-Type":  "application/json",
              "Authorization": `Bearer ${mlToken}`,
            },
            body: JSON.stringify({ status: mlStatus }),
          });
        } else {
          await supabase.from("ml_sync_queue")
            .update({ status: "error", updated_at: new Date().toISOString() })
            .eq("id", item.id);
          continue;
        }

        const mlData = await mlRes.json();

        if (mlRes.ok) {
          // 4. Marcar como done
          await supabase.from("ml_sync_queue")
            .update({ status: "done", updated_at: new Date().toISOString() })
            .eq("id", item.id);

          // Actualizar ml_last_sync en producto
          await supabase.from("productos_market")
            .update({ ml_last_sync: new Date().toISOString(), sync_status: "synced" })
            .eq("id", item.product_id);

          await supabase.rpc("log_event", {
            p_event_type:  "ml_stock_synced",
            p_entity_type: "product",
            p_entity_id:   item.product_id,
            p_payload:     { action: item.action, ml_item_id: producto.ml_item_id },
          });

          processed++;

        } else {
          // 5. Retry automático
          const newRetries = (item.retries || 0) + 1;
          const newStatus  = newRetries >= MAX_RETRIES ? "error" : "pending";

          await supabase.from("ml_sync_queue")
            .update({ status: newStatus, retries: newRetries, updated_at: new Date().toISOString() })
            .eq("id", item.id);

          await supabase.from("productos_market")
            .update({ sync_status: "error" })
            .eq("id", item.product_id);

          await supabase.rpc("log_event", {
            p_event_type:  "ml_sync_error",
            p_entity_type: "product",
            p_entity_id:   item.product_id,
            p_payload:     { action: item.action, error: mlData, retries: newRetries },
          });

          errors++;
        }

      } catch (itemError) {
        console.error("[process-ml-queue] Error en item:", item.id, itemError);
        await supabase.from("ml_sync_queue")
          .update({ retries: (item.retries || 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        errors++;
      }
    }

    console.log(`[process-ml-queue] Done. Procesados: ${processed}, Errores: ${errors}`);

    return new Response(JSON.stringify({ ok: true, processed, errors }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[process-ml-queue] Error fatal:", error);
    return new Response(JSON.stringify({ ok: false, error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});




