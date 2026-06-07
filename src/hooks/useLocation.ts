export async function fetchNearby(lat, lng) {
  const res = await fetch('/functions/v1/get-near-products', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, radius_km: 10 })
  })

  return res.json()
}




