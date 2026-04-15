"use client"

import { useEffect, useRef, useState } from "react"
import { Layers, Minus, Plus, Locate, Eye, EyeOff } from "lucide-react"
import type { Route } from "@/lib/route-data"
import { cn } from "@/lib/utils"

interface RouteMapProps {
  selectedRoute: Route | null
  routes: Route[]
  onRouteSelect: (route: Route) => void
}

export function RouteMap({ selectedRoute, routes, onRouteSelect }: RouteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [zoom, setZoom] = useState(1)
  const [showTraffic, setShowTraffic] = useState(true)
  const [showAllRoutes, setShowAllRoutes] = useState(true)
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scaledWidth = dimensions.width
    const scaledHeight = dimensions.height

    // Clear canvas
    ctx.fillStyle = "#f0f4f8"
    ctx.fillRect(0, 0, scaledWidth, scaledHeight)

    // Apply zoom transformation
    ctx.save()
    const centerX = scaledWidth / 2
    const centerY = scaledHeight / 2
    ctx.translate(centerX, centerY)
    ctx.scale(zoom, zoom)
    ctx.translate(-centerX, -centerY)

    // Draw grid pattern (street grid simulation)
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    const gridSize = 40

    for (let x = 0; x < scaledWidth; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, scaledHeight)
      ctx.stroke()
    }

    for (let y = 0; y < scaledHeight; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(scaledWidth, y)
      ctx.stroke()
    }

    // Draw main roads
    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 8

    ctx.beginPath()
    ctx.moveTo(0, scaledHeight * 0.3)
    ctx.lineTo(scaledWidth, scaledHeight * 0.3)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, scaledHeight * 0.7)
    ctx.lineTo(scaledWidth, scaledHeight * 0.7)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(scaledWidth * 0.25, 0)
    ctx.lineTo(scaledWidth * 0.25, scaledHeight)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(scaledWidth * 0.75, 0)
    ctx.lineTo(scaledWidth * 0.75, scaledHeight)
    ctx.stroke()

    // Draw congestion zones if traffic layer is enabled
    if (showTraffic) {
      const congestionZones = [
        { x: scaledWidth * 0.4, y: scaledHeight * 0.35, radius: 50 * zoom, level: "high" },
        { x: scaledWidth * 0.6, y: scaledHeight * 0.5, radius: 35 * zoom, level: "medium" },
        { x: scaledWidth * 0.3, y: scaledHeight * 0.65, radius: 25 * zoom, level: "low" },
      ]

      congestionZones.forEach((zone) => {
        const gradient = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, zone.radius)
        if (zone.level === "high") {
          gradient.addColorStop(0, "rgba(239, 68, 68, 0.5)")
          gradient.addColorStop(1, "rgba(239, 68, 68, 0)")
        } else if (zone.level === "medium") {
          gradient.addColorStop(0, "rgba(251, 191, 36, 0.5)")
          gradient.addColorStop(1, "rgba(251, 191, 36, 0)")
        } else {
          gradient.addColorStop(0, "rgba(34, 197, 94, 0.4)")
          gradient.addColorStop(1, "rgba(34, 197, 94, 0)")
        }
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Draw routes
    const routesToDraw = showAllRoutes ? routes : routes.filter((r) => r.id === selectedRoute?.id)
    
    routesToDraw.forEach((route) => {
      const isSelected = selectedRoute?.id === route.id
      const isHovered = hoveredRoute === route.id
      const points = generateRoutePoints(route.id, { width: scaledWidth, height: scaledHeight })

      ctx.strokeStyle = isSelected || isHovered ? route.color : `${route.color}44`
      ctx.lineWidth = isSelected ? 6 : isHovered ? 5 : 3
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (!isSelected && !isHovered) {
        ctx.setLineDash([8, 4])
      } else {
        ctx.setLineDash([])
      }

      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Draw route label on hover
      if (isHovered && !isSelected) {
        const midPoint = points[Math.floor(points.length / 2)]
        ctx.fillStyle = route.color
        ctx.beginPath()
        ctx.roundRect(midPoint.x - 40, midPoint.y - 25, 80, 20, 4)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 11px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`${route.duration} min`, midPoint.x, midPoint.y - 12)
      }
    })

    // Draw start point with pulse animation
    const startX = scaledWidth * 0.1
    const startY = scaledHeight * 0.5
    
    // Outer pulse
    ctx.fillStyle = "rgba(59, 130, 246, 0.2)"
    ctx.beginPath()
    ctx.arc(startX, startY, 20, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = "#3b82f6"
    ctx.beginPath()
    ctx.arc(startX, startY, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(startX, startY, 7, 0, Math.PI * 2)
    ctx.fill()

    // Draw end point
    const endX = scaledWidth * 0.9
    const endY = scaledHeight * 0.4
    ctx.fillStyle = "#22c55e"
    ctx.beginPath()
    ctx.arc(endX, endY, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("B", endX, endY)

    // Label start point
    ctx.fillStyle = "#ffffff"
    ctx.fillText("A", startX, startY)

    ctx.restore()

  }, [dimensions, routes, selectedRoute, zoom, showTraffic, showAllRoutes, hoveredRoute])

  // Handle click on canvas to select routes
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    for (const route of routes) {
      const points = generateRoutePoints(route.id, dimensions)
      for (const point of points) {
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2)
        if (distance < 20) {
          onRouteSelect(route)
          return
        }
      }
    }
  }

  // Handle mouse move for hover effect
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    for (const route of routes) {
      const points = generateRoutePoints(route.id, dimensions)
      for (const point of points) {
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2)
        if (distance < 20) {
          setHoveredRoute(route.id)
          return
        }
      }
    }
    setHoveredRoute(null)
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.6))
  const handleLocate = () => {
    setIsLocating(true)
    setTimeout(() => {
      setZoom(1)
      setIsLocating(false)
    }, 500)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={() => setHoveredRoute(null)}
        className="cursor-pointer"
      />
      
      {/* Map Controls */}
      <div className="absolute right-4 top-20 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-2 transition-colors hover:bg-muted"
            title="Zoom in"
          >
            <Plus className="h-5 w-5 text-foreground" />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={handleZoomOut}
            className="p-2 transition-colors hover:bg-muted"
            title="Zoom out"
          >
            <Minus className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <button
          onClick={handleLocate}
          className={cn(
            "rounded-lg border border-border bg-card p-2 shadow-lg transition-colors hover:bg-muted",
            isLocating && "animate-pulse bg-primary text-primary-foreground"
          )}
          title="My location"
        >
          <Locate className="h-5 w-5" />
        </button>
      </div>

      {/* Layer Controls */}
      <div className="absolute left-4 top-20 flex flex-col gap-2">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2 shadow-lg">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Layers className="h-3.5 w-3.5" />
            Layers
          </div>
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
              showTraffic ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {showTraffic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Traffic
          </button>
          <button
            onClick={() => setShowAllRoutes(!showAllRoutes)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
              showAllRoutes ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {showAllRoutes ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            All Routes
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-lg bg-card/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="text-xs font-medium text-foreground">Traffic Conditions</div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs text-muted-foreground">Heavy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs text-muted-foreground">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Light</span>
        </div>
      </div>

      {/* Location Labels */}
      <div className="absolute left-16 top-1/2 -translate-y-1/2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-md">
        Current Location
      </div>
      <div className="absolute right-16 top-[35%] rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground shadow-md">
        Destination
      </div>

      {/* Real-time indicator */}
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        <span className="text-xs font-medium text-foreground">Live Traffic</span>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 rounded-lg bg-card/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}

function generateRoutePoints(routeId: string, dimensions: { width: number; height: number }) {
  const startX = dimensions.width * 0.1
  const startY = dimensions.height * 0.5
  const endX = dimensions.width * 0.9
  const endY = dimensions.height * 0.4

  switch (routeId) {
    case "fastest":
      return [
        { x: startX, y: startY },
        { x: dimensions.width * 0.25, y: startY },
        { x: dimensions.width * 0.25, y: dimensions.height * 0.3 },
        { x: dimensions.width * 0.5, y: dimensions.height * 0.3 },
        { x: dimensions.width * 0.75, y: dimensions.height * 0.3 },
        { x: dimensions.width * 0.75, y: endY },
        { x: endX, y: endY },
      ]
    case "shortest":
      return [
        { x: startX, y: startY },
        { x: dimensions.width * 0.3, y: startY },
        { x: dimensions.width * 0.5, y: dimensions.height * 0.45 },
        { x: dimensions.width * 0.7, y: endY },
        { x: endX, y: endY },
      ]
    case "scenic":
      return [
        { x: startX, y: startY },
        { x: dimensions.width * 0.2, y: dimensions.height * 0.7 },
        { x: dimensions.width * 0.4, y: dimensions.height * 0.75 },
        { x: dimensions.width * 0.6, y: dimensions.height * 0.6 },
        { x: dimensions.width * 0.8, y: dimensions.height * 0.5 },
        { x: endX, y: endY },
      ]
    default:
      return [
        { x: startX, y: startY },
        { x: endX, y: endY },
      ]
  }
}
