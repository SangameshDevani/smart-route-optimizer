"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Layers, Minus, Plus, Navigation, LocateFixed, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Route } from "@/lib/route-data"

// Minimal Google Maps type shim
type GMap = any
type GLatLng = any
type GPolyline = any
type GMarker = any
type GTrafficLayer = any
type GDirectionsResult = any
type G = typeof window & { google: any }

interface LiveMapProps {
  routes: Route[]
  selectedRouteId: string | null
  onRouteSelect: (routeId: string) => void
  origin: string
  destination: string
  isNavigating?: boolean
  travelMode?: "car" | "transit" | "bike" | "walk"
}

// Bangalore location database
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  "Current Location":   { lat: 12.9716, lng: 77.5946 },
  "Home":               { lat: 12.9352, lng: 77.6245 },
  "Work":               { lat: 12.9698, lng: 77.7500 },
  "Downtown":           { lat: 12.9716, lng: 77.5946 },
  "Downtown Office":    { lat: 12.9698, lng: 77.7500 },
  "Tech Park":          { lat: 12.9698, lng: 77.7500 },
  "Airport":            { lat: 13.1989, lng: 77.7068 },
  "Central Station":    { lat: 12.9791, lng: 77.5724 },
  "Mall of India":      { lat: 12.9925, lng: 77.6967 },
  "University Campus":  { lat: 13.0219, lng: 77.5671 },
  "Medical Center":     { lat: 12.9343, lng: 77.6101 },
  "Sports Complex":     { lat: 12.9656, lng: 77.5495 },
  "City Center":        { lat: 12.9716, lng: 77.5946 },
  "Business District":  { lat: 12.9352, lng: 77.6101 },
}

function getCoords(name: string): { lat: number; lng: number } {
  return LOCATION_COORDS[name] || { lat: 12.9716, lng: 77.5946 }
}

const TRAVEL_MODE_MAP: Record<string, string> = {
  car: "DRIVING", transit: "TRANSIT", bike: "BICYCLING", walk: "WALKING",
}

const ROUTE_META = [
  { id: "fastest",  label: "Highway Express", color: "#3b82f6", glow: "#93c5fd" },
  { id: "shortest", label: "Direct Route",    color: "#f59e0b", glow: "#fcd34d" },
  { id: "scenic",   label: "Riverside Drive", color: "#22c55e", glow: "#86efac" },
]

// Clean light map style — based on Google Maps default with minor tweaks
const MAP_STYLES = [
  { featureType: "poi",             elementType: "labels",          stylers: [{ visibility: "off" }] },
  { featureType: "poi.park",        elementType: "geometry.fill",   stylers: [{ color: "#d1fae5" }] },
  { featureType: "transit.station", elementType: "labels",          stylers: [{ visibility: "off" }] },
  { featureType: "road.highway",    elementType: "geometry.fill",   stylers: [{ color: "#fde68a" }] },
  { featureType: "road.highway",    elementType: "geometry.stroke", stylers: [{ color: "#f59e0b" }] },
  { featureType: "water",           elementType: "geometry.fill",   stylers: [{ color: "#bfdbfe" }] },
  { featureType: "landscape",       elementType: "geometry.fill",   stylers: [{ color: "#f9fafb" }] },
]

export function LiveMap({
  routes,
  selectedRouteId,
  onRouteSelect,
  origin,
  destination,
  isNavigating = false,
  travelMode = "car",
}: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<GMap>(null)
  const polylinesRef  = useRef<GPolyline[]>([])
  const markersRef    = useRef<GMarker[]>([])
  const trafficRef    = useRef<GTrafficLayer>(null)
  const dirResultRef  = useRef<GDirectionsResult>(null)

  const [mapReady,        setMapReady]        = useState(false)
  const [isLoading,       setIsLoading]       = useState(false)
  const [routeError,      setRouteError]      = useState<string | null>(null)
  const [showTraffic,     setShowTraffic]     = useState(true)
  const [showAlternatives,setShowAlternatives]= useState(true)
  const [userLocation,    setUserLocation]    = useState<{ lat: number; lng: number } | null>(null)
  const [drawnRoutes,     setDrawnRoutes]     = useState<Array<{id:string; path: any[]}>>([])

  // ── GPS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(c)
        LOCATION_COORDS["Current Location"] = c
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // ── Init Google Map (poll until window.google is ready) ─────────────
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainer.current) return

    const init = () => {
      const G = (window as G).google?.maps
      if (!G || !mapContainer.current) return
      if ((mapContainer.current as any)._gmap) return

      const originC = getCoords(origin)
      const destC   = getCoords(destination)
      const center  = {
        lat: (originC.lat + destC.lat) / 2,
        lng: (originC.lng + destC.lng) / 2,
      }

      const map: GMap = new G.Map(mapContainer.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        styles: MAP_STYLES,
        mapTypeControl: false,
      })

      ;(mapContainer.current as any)._gmap = true
      mapRef.current   = map
      trafficRef.current = new G.TrafficLayer()
      if (showTraffic) trafficRef.current.setMap(map)
      setMapReady(true)
    }

    // Poll until google is loaded
    const poll = setInterval(() => {
      if ((window as G).google?.maps) { clearInterval(poll); init() }
    }, 150)

    return () => clearInterval(poll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Traffic layer toggle ────────────────────────────────────────────
  useEffect(() => {
    if (!trafficRef.current || !mapRef.current) return
    trafficRef.current.setMap(showTraffic ? mapRef.current : null)
  }, [showTraffic])

  // ── Fetch routes via Google Directions API (server-side proxy) ───────
  const fetchRoutes = useCallback(async () => {
    if (!mapReady || !mapRef.current) return

    const originC = getCoords(origin)
    const destC   = getCoords(destination)
    if (originC.lat === destC.lat && originC.lng === destC.lng) return

    setIsLoading(true)
    setRouteError(null)

    const G = (window as G).google?.maps
    if (!G) { setIsLoading(false); return }

    try {
      // First try Google Directions (server-side proxy with the Directions key)
      const params = new URLSearchParams({
        originLat: String(originC.lat), originLng: String(originC.lng),
        destLat:   String(destC.lat),   destLng:   String(destC.lng),
        mode:      travelMode,
      })
      const res  = await fetch(`/api/directions?${params}`)
      const data = await res.json()

      if (res.ok && data.routes?.length) {
        // Convert [lat, lng] pairs → Google LatLng objects
        const extracted = data.routes.map((r: any, i: number) => ({
          id:   ROUTE_META[i]?.id || `route-${i}`,
          path: r.coords.map(([lat, lng]: [number, number]) => new G.LatLng(lat, lng)),
        }))
        setDrawnRoutes(extracted)

        const sel    = extracted.find((r: any) => r.id === selectedRouteId) || extracted[0]
        const bounds = new G.LatLngBounds()
        sel.path.forEach((p: any) => bounds.extend(p))
        mapRef.current!.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 })
        return
      }
      throw new Error(data.error || "No routes")

    } catch (googleErr: any) {
      // Fallback to OSRM if Directions API fails
      console.warn("Google Directions failed, using OSRM:", googleErr.message)
      try {
        const profileMap: Record<string, string> = {
          car: "driving", transit: "driving", bike: "cycling", walk: "foot",
        }
        const profile = profileMap[travelMode] || "driving"
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${originC.lng},${originC.lat};${destC.lng},${destC.lat}?overview=full&geometries=geojson&alternatives=3`
        const osrmRes  = await fetch(osrmUrl)
        const osrmData = await osrmRes.json()

        if (!osrmData.routes?.length) throw new Error("No OSRM routes")

        const extracted = osrmData.routes.slice(0, 3).map((r: any, i: number) => ({
          id:   ROUTE_META[i]?.id || `route-${i}`,
          path: r.geometry.coordinates.map(([lng, lat]: [number, number]) => new G.LatLng(lat, lng)),
        }))
        setDrawnRoutes(extracted)

        const sel    = extracted.find((r: any) => r.id === selectedRouteId) || extracted[0]
        const bounds = new G.LatLngBounds()
        sel.path.forEach((p: any) => bounds.extend(p))
        mapRef.current!.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 })
        setRouteError("Using OSRM routing (fallback)")

      } catch (osrmErr: any) {
        setRouteError("Could not load routes")
        const fallback = generateFallbackPaths(originC, destC, G)
        setDrawnRoutes(fallback)
      }
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, travelMode, mapReady])


  // Geometric fallback when OSRM unavailable
  function generateFallbackPaths(
    oC: { lat: number; lng: number },
    dC: { lat: number; lng: number },
    G: any
  ) {
    const offsets = [0.018, -0.012, -0.032]
    return ROUTE_META.map((meta, i) => {
      const amp  = offsets[i]
      const dLat = dC.lat - oC.lat
      const dLng = dC.lng - oC.lng
      const len  = Math.sqrt(dLat * dLat + dLng * dLng) || 1
      const pLat = -dLng / len
      const pLng =  dLat / len
      const path = []
      for (let s = 0; s <= 30; s++) {
        const t = s / 30
        const curve = Math.sin(t * Math.PI) * amp
        path.push(new G.LatLng(oC.lat + dLat * t + pLat * curve, oC.lng + dLng * t + pLng * curve))
      }
      return { id: meta.id, path }
    })
  }

  useEffect(() => { fetchRoutes() }, [fetchRoutes])


  // ── Draw / redraw polylines whenever routes or selection changes ─────
  useEffect(() => {
    if (!mapRef.current || drawnRoutes.length === 0) return
    const G = (window as G).google?.maps
    if (!G) return

    // Clear old polylines & markers
    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Draw unselected routes first, then selected on top
    const ordered = [
      ...drawnRoutes.filter(r => r.id !== selectedRouteId),
      ...drawnRoutes.filter(r => r.id === selectedRouteId),
    ].filter(r => showAlternatives || r.id === selectedRouteId)

    ordered.forEach((dr) => {
      const meta      = ROUTE_META.find(m => m.id === dr.id) || ROUTE_META[0]
      const isSelected = dr.id === selectedRouteId

      // Glow line behind selected route
      if (isSelected) {
        const glow = new G.Polyline({
          path: dr.path,
          map: mapRef.current,
          strokeColor: meta.glow,
          strokeWeight: 16,
          strokeOpacity: 0.25,
          zIndex: 8,
          clickable: false,
        })
        polylinesRef.current.push(glow)
      }

      // Main route polyline
      const poly = new G.Polyline({
        path: dr.path,
        map: mapRef.current,
        strokeColor: isSelected ? meta.color : "#64748b",
        strokeWeight: isSelected ? 7 : 4,
        strokeOpacity: isSelected ? 1.0 : 0.55,
        strokeDasharray: isSelected ? undefined : "10 8",
        zIndex: isSelected ? 10 : 5,
        clickable: true,
        geodesic: true,
      })

      poly.addListener("click", () => onRouteSelect(dr.id))
      poly.addListener("mouseover", () => {
        if (!isSelected) poly.setOptions({ strokeColor: meta.color, strokeOpacity: 0.85, strokeWeight: 6 })
        const appRoute = routes.find(r => r.id === dr.id)
        // Show info window
        const iw = new G.InfoWindow({
          content: `<div style="font-family:sans-serif;padding:4px 2px">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;color:#111">${meta.label}</div>
            <div style="color:#6b7280;font-size:12px">${appRoute?.duration ?? "–"} min · ${appRoute?.distance ?? "–"} km</div>
          </div>`,
        })
        const midIdx = Math.floor(dr.path.length / 2)
        iw.setPosition(dr.path[midIdx])
        iw.open(mapRef.current)
        poly.addListener("mouseout", () => {
          if (!isSelected) poly.setOptions({ strokeColor: "#64748b", strokeOpacity: 0.55, strokeWeight: 4 })
          iw.close()
        })
      })

      polylinesRef.current.push(poly)
    })

    // ── Custom origin marker (green circle) ──────────────────────────
    const originC = getCoords(origin)
    const originMarker = new G.Marker({
      position: originC,
      map: mapRef.current,
      zIndex: 20,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="14" fill="#22c55e" stroke="white" stroke-width="3"/>
            <circle cx="20" cy="20" r="6" fill="white"/>
          </svg>
        `),
        scaledSize: new G.Size(40, 40),
        anchor: new G.Point(20, 20),
      },
    })
    originMarker.addListener("click", () => {
      new G.InfoWindow({ content: `<b>📍 ${origin}</b>` }).open(mapRef.current, originMarker)
    })
    markersRef.current.push(originMarker)

    // ── Custom destination marker (red teardrop) ─────────────────────
    const destC = getCoords(destination)
    const destMarker = new G.Marker({
      position: destC,
      map: mapRef.current,
      zIndex: 20,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.059 0 0 8.059 0 18c0 12.5 18 30 18 30S36 30.5 36 18C36 8.059 27.941 0 18 0z" fill="#ef4444"/>
            <circle cx="18" cy="18" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: new G.Size(36, 48),
        anchor: new G.Point(18, 48),
      },
    })
    destMarker.addListener("click", () => {
      new G.InfoWindow({ content: `<b>🏁 ${destination}</b>` }).open(mapRef.current, destMarker)
    })
    markersRef.current.push(destMarker)

    // ── User GPS marker ──────────────────────────────────────────────
    if (userLocation) {
      const userMarker = new G.Marker({
        position: userLocation,
        map: mapRef.current,
        zIndex: 30,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" fill="#3b82f620" stroke="none"/>
              <circle cx="24" cy="24" r="11" fill="#3b82f6" stroke="white" stroke-width="3.5"/>
              <circle cx="24" cy="24" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new G.Size(48, 48),
          anchor: new G.Point(24, 24),
        },
      })
      markersRef.current.push(userMarker)
    }
  }, [drawnRoutes, selectedRouteId, showAlternatives, userLocation, origin, destination, routes, onRouteSelect])

  // ── User-controlled zoom / locate ────────────────────────────────────
  const handleZoomIn  = () => mapRef.current?.setZoom((mapRef.current.getZoom() || 13) + 1)
  const handleZoomOut = () => mapRef.current?.setZoom((mapRef.current.getZoom() || 13) - 1)
  const handleLocate  = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserLocation(c)
      mapRef.current?.panTo(c)
      mapRef.current?.setZoom(15)
    })
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Google Map container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Zoom controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <Button variant="ghost" size="icon" onClick={handleZoomIn}  className="rounded-none border-b border-gray-100 text-gray-700 hover:bg-gray-50">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="rounded-none text-gray-700 hover:bg-gray-50">
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={handleLocate}
          className="rounded-xl border-gray-200 bg-white text-gray-700 shadow-lg hover:bg-gray-50"
          title="Go to my location">
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer toggles */}
      <div className="absolute left-4 top-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-700">Layers</span>
          </div>
          <div className="flex flex-col gap-1">
            {[
              { label: "Traffic",    val: showTraffic,      set: setShowTraffic },
              { label: "Alt Routes", val: showAlternatives, set: setShowAlternatives },
            ].map(({ label, val, set }) => (
              <button key={label} onClick={() => set(!val)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                  val ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Route legend */}
      <div className="absolute bottom-4 left-4 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="mb-2 text-xs font-semibold text-gray-700">Routes</div>
        <div className="space-y-2">
          {ROUTE_META.map((meta) => (
            <div key={meta.id} onClick={() => onRouteSelect(meta.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-all hover:bg-gray-50",
                selectedRouteId === meta.id && "bg-gray-100"
              )}>
              <div className="h-2 w-8 rounded-full"
                style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}60` }} />
              <span className="text-xs text-gray-700">{meta.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-8 border-t-2 border-dashed border-gray-300" />
            <span className="text-xs text-gray-400">Alternative</span>
          </div>
        </div>
      </div>

      {/* Navigating banner */}
      {isNavigating && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xl">
          <Navigation className="h-4 w-4 animate-pulse" /> Navigating
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs text-gray-600">Loading routes…</span>
        </div>
      )}

      {/* Error notice */}
      {routeError && !isLoading && (
        <div className="absolute bottom-4 right-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg">
          <span className="text-xs text-amber-600">{routeError}</span>
        </div>
      )}

      {/* GPS status */}
      {userLocation && !isLoading && !routeError && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">GPS Active</span>
        </div>
      )}

      {/* Map loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-400">Loading map…</p>
        </div>
      )}
    </div>
  )
}
