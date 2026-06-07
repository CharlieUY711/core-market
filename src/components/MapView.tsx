import { useEffect, useRef } from "react"

export default function MapView({ products }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return

    const map = new google.maps.Map(ref.current, {
      center: { lat: -34.9, lng: -56.2 },
      zoom: 12
    })

    products.forEach(p => {
      if (!p.latitude || !p.longitude) return

      new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map
      })
    })
  }, [products])

  return <div ref={ref} style={{ height: 400 }} />
}


