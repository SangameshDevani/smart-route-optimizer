"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Layers, Minus, Plus, Navigation, LocateFixed, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Route } from "@/lib/route-data"

interface LiveMapProps {
  routes: Route[]
  selectedRouteId: string | null
  onRouteSelect: (routeId: string) => void
  origin: string
  destination: string
  isNavigating?: boolean
  travelMode?: "car" | "transit" | "bike" | "walk"
}

// City coordinates database
const LOCATION_COORDS: Record<string, [number, number]> = {
  "Current Location": [12.9716, 77.5946],
  "Home": [12.9352, 77.6245],
  "Work": [12.9698, 77.7500],
  "Downtown": [12.9716, 77.5946],
  "Tech Park": [12.9698, 77.7500],
  "Airport": [13.1989, 77.7068],
  "Central Station": [12.9791, 77.5724],
  "Mall of India": [12.9925, 77.6967],
  "University Campus": [13.0219, 77.5671],
  "Medical Center": [12.9343, 77.6101],
  "Sports Complex": [12.9656, 77.5495],
  "City Center": [12.9716, 77.5946],
  "Business District": [12.9352, 77.6101],
  "Downtown Office": [12.9698, 77.7500],
}

function getCoords(location: string): [number, number] {
  return LOCATION_COORDS[location] || [12.9716, 77.5946]
}

// OSRM profile for each travel mode
function getOsrmProfile(mode: string): string {
  switch (mode) {
    case "bike": return "cycling"
    case "walk": return "foot"
    default: return "driving"  // car and transit both use driving
  }
}

// Route display config
const ROUTE_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  fastest: { color: "#3b82f6", glow: "#93c5fd", label: "Highway Express" },
  shortest: { color: "#f59e0b", glow: "#fcd34d", label: "Direct Route" },
  scenic:   { color: "#22c55e", glow: "#86efac", label: "Riverside Drive" },
}

interface OsrmRoute {
  geometry: { coordinates: [number, number][] }
  duration: number
  distance: number
  legs: Array<{ steps: Array<{ maneuver: { location: [number, number] } }> }>
}

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
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Layer[]>([])
  const routeLinesRef = useRef<L.Layer[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [showTraffic, setShowTraffic] = useState(true)
  const [showAlternatives, setShowAlternatives] = useState(true)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [realRoutes, setRealRoutes] = useState<Array<{ id: string; coords: [number, number][] }>>([])

  // Get user's actual GPS location on mount
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(coords)
          LOCATION_COORDS["Current Location"] = coords
        },
        (error) => {
          console.log("Geolocation error:", error.message)
          setLocationError("Location access denied")
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    }
  }, [])

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainer.current || mapRef.current) return
    // Guard against React strict-mode double-invoke
    if ((mapContainer.current as any)._leaflet_id) return

    const initMap = async () => {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      if (!mapContainer.current || (mapContainer.current as any)._leaflet_id) return

      const originCoords = getCoords(origin)
      const destCoords = getCoords(destination)
      const centerLat = (originCoords[0] + destCoords[0]) / 2
      const centerLng = (originCoords[1] + destCoords[1]) / 2

      const map = L.map(mapContainer.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: false,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      // Clear Leaflet's internal flag so React Strict Mode second-mount works
      if (mapContainer.current) {
        delete (mapContainer.current as any)._leaflet_id
      }
      setMapReady(false)
    }
  }, [])

  // Fetch real road geometry from OSRM for each route pair
  const fetchRealRoutes = useCallback(async (originName: string, destName: string, mode: string) => {
    const originCoords = getCoords(originName)
    const destCoords = getCoords(destName)

    // Don't fetch if same location
    if (originCoords[0] === destCoords[0] && originCoords[1] === destCoords[1]) return

    setIsLoadingRoutes(true)
    setRouteError(null)

    const profile = getOsrmProfile(mode)
    // OSRM uses lng,lat order
    const start = `${originCoords[1]},${originCoords[0]}`
    const end   = `${destCoords[1]},${destCoords[0]}`

    try {
      // Request up to 3 alternative routes
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start};${end}?overview=full&geometries=geojson&alternatives=3`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`OSRM responded with ${res.status}`)
      const data = await res.json()

      if (!data.routes || data.routes.length === 0) {
        throw new Error("No routes found")
      }

      const routeIds = ["fastest", "shortest", "scenic"]
      const fetched = (data.routes as OsrmRoute[]).slice(0, 3).map((r, i) => ({
        id: routeIds[i] || `route-${i}`,
        // GeoJSON coords are [lng, lat] — flip to [lat, lng] for Leaflet
        coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      }))

      setRealRoutes(fetched)
    } catch (err) {
      console.error("OSRM fetch failed:", err)
      setRouteError("Could not load road routes — showing estimated paths")
      // Fallback: generate simple multi-point paths
      setRealRoutes(generateFallbackRoutes(originCoords, destCoords))
    } finally {
      setIsLoadingRoutes(false)
    }
  }, [])

  useEffect(() => {
    fetchRealRoutes(origin, destination, travelMode)
  }, [origin, destination, travelMode, fetchRealRoutes])

  // Draw routes on map whenever real route data or selection changes
  useEffect(() => {
    if (!mapRef.current || !mapReady || realRoutes.length === 0) return

    const drawRoutes = async () => {
      const L = (await import("leaflet")).default

      // Remove old layers
      markersRef.current.forEach(l => l.remove())
      markersRef.current = []
      routeLinesRef.current.forEach(l => l.remove())
      routeLinesRef.current = []

      const originCoords = getCoords(origin)
      const destCoords = getCoords(destination)

      // --- Draw routes (unselected first, then selected on top) ---
      const routesToDraw = showAlternatives
        ? [...realRoutes.filter(r => r.id !== selectedRouteId), ...realRoutes.filter(r => r.id === selectedRouteId)]
        : realRoutes.filter(r => r.id === selectedRouteId)

      routesToDraw.forEach((realRoute) => {
        const appRoute = routes.find(r => r.id === realRoute.id)
        if (!appRoute) return

        const isSelected = realRoute.id === selectedRouteId
        const cfg = ROUTE_CONFIG[realRoute.id] || { color: "#6b7280", glow: "#9ca3af", label: realRoute.id }

        // Glow effect for selected route
        if (isSelected) {
          const glow = L.polyline(realRoute.coords, {
            color: cfg.glow,
            weight: 16,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapRef.current!)
          routeLinesRef.current.push(glow)
        }

        // Main route line
        const polyline = L.polyline(realRoute.coords, {
          color: isSelected ? cfg.color : "#94a3b8",
          weight: isSelected ? 7 : 4,
          opacity: isSelected ? 1 : 0.65,
          lineCap: "round",
          lineJoin: "round",
          dashArray: isSelected ? undefined : "10, 8",
        }).addTo(mapRef.current!)

        // Click to select
        polyline.on("click", () => onRouteSelect(realRoute.id))

        // Hover interactions
        polyline.on("mouseover", (e) => {
          if (!isSelected) {
            e.target.setStyle({ color: cfg.color, weight: 6, opacity: 0.9 })
          }
          e.target.bindTooltip(
            `<div style="font-weight:700;margin-bottom:2px">${cfg.label}</div>
             <div style="color:#94a3b8;font-size:12px">${appRoute.duration} min · ${appRoute.distance} km · ${appRoute.trafficLevel} traffic</div>`,
            { permanent: false, direction: "top", className: "route-tooltip" }
          ).openTooltip()
        })
        polyline.on("mouseout", (e) => {
          if (!isSelected) {
            e.target.setStyle({ color: "#94a3b8", weight: 4, opacity: 0.65 })
          }
        })

        routeLinesRef.current.push(polyline)

        // Traffic congestion dot on selected route midpoint
        if (showTraffic && isSelected && appRoute.trafficLevel !== "low") {
          const midIdx = Math.floor(realRoute.coords.length / 2)
          const mid = realRoute.coords[midIdx]
          const trafficColor = appRoute.trafficLevel === "high" ? "#ef4444" : "#f59e0b"
          const dot = L.circleMarker(mid, {
            radius: 10,
            fillColor: trafficColor,
            color: "white",
            weight: 2.5,
            fillOpacity: 0.95,
          }).addTo(mapRef.current!)
          dot.bindTooltip(
            `${appRoute.trafficLevel === "high" ? "Heavy" : "Moderate"} traffic`,
            { direction: "top" }
          )
          routeLinesRef.current.push(dot)
        }
      })

      // --- Origin marker ---
      const originIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:38px;height:38px;
          background:linear-gradient(135deg,#22c55e,#16a34a);
          border-radius:50%;border:3px solid white;
          box-shadow:0 4px 14px rgba(34,197,94,0.5);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="5"/></svg>
        </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      })
      const originMarker = L.marker(originCoords, { icon: originIcon })
        .addTo(mapRef.current!)
        .bindPopup(`<div style="font-weight:700;padding:4px 2px">📍 ${origin}</div>`)
      markersRef.current.push(originMarker)

      // --- Destination marker (teardrop pin) ---
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:38px;height:50px;position:relative">
          <div style="
            width:38px;height:38px;
            background:linear-gradient(135deg,#ef4444,#dc2626);
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 4px 14px rgba(239,68,68,0.5);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="transform:rotate(45deg);position:absolute;top:7px;left:7px">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>`,
        iconSize: [38, 50],
        iconAnchor: [19, 50],
      })
      const destMarker = L.marker(destCoords, { icon: destIcon })
        .addTo(mapRef.current!)
        .bindPopup(`<div style="font-weight:700;padding:4px 2px">🏁 ${destination}</div>`)
      markersRef.current.push(destMarker)

      // --- User GPS location marker ---
      if (userLocation) {
        const userIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:48px;height:48px">
            <div style="
              position:absolute;inset:0;
              background:rgba(59,130,246,0.25);
              border-radius:50%;
              animation:osrm-pulse 2s ease-out infinite;
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:22px;height:22px;
              background:linear-gradient(135deg,#3b82f6,#1d4ed8);
              border:3.5px solid white;
              border-radius:50%;
              box-shadow:0 4px 12px rgba(59,130,246,0.6);
            "></div>
          </div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        })
        const userMarker = L.marker(userLocation, { icon: userIcon, zIndexOffset: 1000 })
          .addTo(mapRef.current!)
          .bindPopup('<div style="font-weight:700;padding:4px 2px">📡 Your Location</div>')
        markersRef.current.push(userMarker)
      }

      // Fit map to show full route
      const allCoords: [number, number][] = [originCoords, destCoords]
      const selectedReal = realRoutes.find(r => r.id === selectedRouteId)
      if (selectedReal && selectedReal.coords.length > 0) {
        // Fit to selected route bounds specifically
        const bounds = L.latLngBounds(selectedReal.coords)
        mapRef.current!.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 })
      } else {
        mapRef.current!.fitBounds(L.latLngBounds(allCoords), { padding: [80, 80] })
      }
    }

    drawRoutes()
  }, [realRoutes, selectedRouteId, mapReady, showTraffic, showAlternatives, userLocation, origin, destination, routes, onRouteSelect])

  // Fallback geometric routes when OSRM unavailable
  function generateFallbackRoutes(
    originCoords: [number, number],
    destCoords: [number, number]
  ): Array<{ id: string; coords: [number, number][] }> {
    const routeIds = ["fastest", "shortest", "scenic"]
    const offsets = [0.018, -0.012, -0.030]

    return routeIds.map((id, i) => {
      const amp = offsets[i]
      const dLat = destCoords[0] - originCoords[0]
      const dLng = destCoords[1] - originCoords[1]
      const perpLat = -dLng / Math.sqrt(dLat * dLat + dLng * dLng)
      const perpLng =  dLat / Math.sqrt(dLat * dLat + dLng * dLng)
      const pts: [number, number][] = []
      for (let s = 0; s <= 30; s++) {
        const t = s / 30
        const curve = Math.sin(t * Math.PI) * amp
        pts.push([
          originCoords[0] + dLat * t + perpLat * curve,
          originCoords[1] + dLng * t + perpLng * curve,
        ])
      }
      return { id, coords: pts }
    })
  }

  const handleZoomIn = () => mapRef.current?.zoomIn()
  const handleZoomOut = () => mapRef.current?.zoomOut()

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude]
          setUserLocation(coords)
          mapRef.current?.setView(coords, 15)
        },
        () => {
          setUserLocation([12.9716, 77.5946])
        }
      )
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Map Controls — zoom */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="rounded-none border-b border-border">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="rounded-none">
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={handleLocateUser} className="bg-card shadow-lg" title="Go to my location">
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer Controls */}
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
          <div className="mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Layers</span>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowTraffic(!showTraffic)}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors",
                showTraffic ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Traffic
            </button>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className={cn(
                "rounded px-2 py-1 text-left text-xs transition-colors",
                showAlternatives ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Alt Routes
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="mb-2 text-xs font-semibold text-foreground">Routes</div>
        <div className="flex flex-col gap-1.5">
          {Object.entries(ROUTE_CONFIG).map(([id, cfg]) => (
            <div
              key={id}
              onClick={() => onRouteSelect(id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted",
                selectedRouteId === id && "bg-muted"
              )}
            >
              <div
                className="h-2 w-8 rounded-full shadow-sm"
                style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }}
              />
              <span className="text-xs text-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-2">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-slate-400" style={{ borderTop: "2px dashed #94a3b8" }} />
            <span className="text-xs text-muted-foreground">Alternative</span>
          </div>
        </div>
      </div>

      {/* Navigation Active banner */}
      {isNavigating && (
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
          <Navigation className="h-4 w-4 animate-pulse" />
          Navigation Active
        </div>
      )}

      {/* Route loading spinner */}
      {isLoadingRoutes && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading road routes…</span>
        </div>
      )}

      {/* Route error notice */}
      {routeError && !isLoadingRoutes && (
        <div className="absolute bottom-4 right-4 max-w-xs rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 shadow-lg">
          <span className="text-xs text-amber-600">{routeError}</span>
        </div>
      )}

      {/* GPS active / error */}
      {userLocation && !isLoadingRoutes && !routeError && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">GPS Active</span>
        </div>
      )}
      {locationError && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span className="text-xs text-destructive">{locationError}</span>
        </div>
      )}

      {/* Map loading */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading map…</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes osrm-pulse {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-container { font-family: inherit; }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content { margin: 12px 14px; }
        .route-tooltip {
          background: #1e293b;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 8px 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          font-size: 13px;
        }
        .route-tooltip::before { border-top-color: #1e293b !important; }
        .leaflet-interactive { cursor: pointer; }
      `}</style>
    </div>
  )
}
