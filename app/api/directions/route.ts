import { NextRequest, NextResponse } from "next/server"

const DIRECTIONS_KEY = process.env.GOOGLE_DIRECTIONS_KEY!

const MODE_MAP: Record<string, string> = {
  car: "driving", transit: "transit", bike: "bicycling", walk: "walking",
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const originLat  = searchParams.get("originLat")
  const originLng  = searchParams.get("originLng")
  const destLat    = searchParams.get("destLat")
  const destLng    = searchParams.get("destLng")
  const mode       = searchParams.get("mode") || "car"

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const travelMode = MODE_MAP[mode] || "driving"
  const url = `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&mode=${travelMode}` +
    `&alternatives=true` +
    `&key=${DIRECTIONS_KEY}`

  try {
    const res  = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: data.status, message: data.error_message },
        { status: 400 }
      )
    }

    // Extract route paths from overview_polyline steps
    const routes = data.routes.slice(0, 3).map((route: any, i: number) => {
      const coords: [number, number][] = []
      route.legs.forEach((leg: any) => {
        leg.steps.forEach((step: any) => {
          // Decode the polyline for this step
          const decoded = decodePolyline(step.polyline.points)
          coords.push(...decoded)
        })
      })
      return {
        index:    i,
        coords,                         // [[lat, lng], ...]
        duration: route.legs[0].duration.value,
        distance: route.legs[0].distance.value,
        summary:  route.summary,
      }
    })

    return NextResponse.json({ routes }, { status: 200 })
  } catch (err: any) {
    console.error("Directions proxy error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Google's polyline decoder
function decodePolyline(encoded: string): [number, number][] {
  const result: [number, number][] = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let shift = 0, b = 0, result_ = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result_ |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += (result_ & 1 ? ~(result_ >> 1) : result_ >> 1)

    shift = 0; result_ = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result_ |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += (result_ & 1 ? ~(result_ >> 1) : result_ >> 1)

    result.push([lat / 1e5, lng / 1e5])
  }
  return result
}
