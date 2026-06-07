import fetch from "node-fetch"

const URL = "https://TU_PROJECT.supabase.co/functions/v1/ml_webhook"

const TOTAL_REQUESTS = 100

async function sendEvent(i) {
  const payload = {
    id: "event_" + Math.floor(i / 2), // 🔥 duplica eventos → test idempotencia
    topic: "orders_v2",
    resource: "/orders/123456"
  }

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    console.log(i, data.status || data.error)
  } catch (err) {
    console.log(i, "ERROR", err.message)
  }
}

async function runTest() {
  console.log("🚀 Starting load test...")

  await Promise.all(
    Array.from({ length: TOTAL_REQUESTS }).map((_, i) =>
      sendEvent(i)
    )
  )

  console.log("✅ Test completed")
}

runTest()
