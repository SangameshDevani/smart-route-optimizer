"use client"

import { useState, useEffect, useRef } from "react"
import { Clock, Fuel, Leaf, MapPin, Sparkles, TrendingDown, Zap, Navigation, ArrowUpDown, ChevronDown } from "lucide-react"
import type { Route, DepartureRecommendation } from "@/lib/route-data"
import { LocationSearch } from "@/components/location-search"
import { RoutePreferences, type TravelMode, type RoutePreference } from "@/components/route-preferences"
import { cn } from "@/lib/utils"

interface Location {
  id: string
  name: string
  address: string
  type: "recent" | "saved" | "search"
}

interface RoutePanelProps {
  routes: Route[]
  selectedRoute: Route | null
  onRouteSelect: (route: Route) => void
  departureRecommendations: DepartureRecommendation[]
  isAnalyzing: boolean
  origin: Location
  destination: Location
  onOriginChange: (loc: Location) => void
  onDestinationChange: (loc: Location) => void
  travelMode: TravelMode
  onTravelModeChange: (mode: TravelMode) => void
  routePreference: RoutePreference
  onRoutePreferenceChange: (pref: RoutePreference) => void
  avoidTolls: boolean
  onAvoidTollsChange: (avoid: boolean) => void
  avoidHighways: boolean
  onAvoidHighwaysChange: (avoid: boolean) => void
  onStartNavigation: () => void
}

function AnimatedScore({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    const duration = 600
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
      else prevValue.current = end
    }

    requestAnimationFrame(animate)
  }, [value])

  return <span>{displayed}</span>
}

export function RoutePanel({
  routes,
  selectedRoute,
  onRouteSelect,
  departureRecommendations,
  isAnalyzing,
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  travelMode,
  onTravelModeChange,
  routePreference,
  onRoutePreferenceChange,
  avoidTolls,
  onAvoidTollsChange,
  avoidHighways,
  onAvoidHighwaysChange,
  onStartNavigation,
}: RoutePanelProps) {
  const [selectedDeparture, setSelectedDeparture] = useState<number | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)

  const recommendedRoute = routes.length > 0
    ? routes.reduce((best, route) => route.aiScore > best.aiScore ? route : best, routes[0])
    : null

  const handleSwapLocations = () => {
    setSwapping(true)
    setTimeout(() => {
      const temp = origin
      onOriginChange(destination)
      onDestinationChange(temp)
      setSwapping(false)
    }, 300)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow-md shadow-sidebar-primary/30">
            <Sparkles className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">AI Route Analysis</h2>
            <p className="text-xs text-sidebar-foreground/70">Real-time optimization</p>
          </div>
        </div>
      </div>

      {/* Location Inputs */}
      <div className="border-b border-sidebar-border p-4">
        <div className="relative flex flex-col gap-2">
          <div className={cn("transition-all duration-300", swapping && "opacity-0 scale-95")}>
            <LocationSearch
              label="From"
              value={origin.name}
              onChange={onOriginChange}
              placeholder="Enter starting point..."
              variant="origin"
            />
          </div>

          <button
            onClick={handleSwapLocations}
            className={cn(
              "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sidebar-border bg-sidebar p-2 shadow-md transition-all hover:bg-sidebar-accent hover:shadow-lg hover:scale-110 active:scale-95",
              swapping && "rotate-180"
            )}
            style={{ transition: "transform 0.3s ease" }}
          >
            <ArrowUpDown className="h-4 w-4 text-sidebar-foreground" />
          </button>

          <div className={cn("transition-all duration-300", swapping && "opacity-0 scale-95")}>
            <LocationSearch
              label="To"
              value={destination.name}
              onChange={onDestinationChange}
              placeholder="Enter destination..."
              variant="destination"
            />
          </div>
        </div>
      </div>

      {/* Route Preferences */}
      <div className="border-b border-sidebar-border p-4">
        <RoutePreferences
          travelMode={travelMode}
          onTravelModeChange={onTravelModeChange}
          preference={routePreference}
          onPreferenceChange={onRoutePreferenceChange}
          avoidTolls={avoidTolls}
          onAvoidTollsChange={onAvoidTollsChange}
          avoidHighways={avoidHighways}
          onAvoidHighwaysChange={onAvoidHighwaysChange}
        />
      </div>

      {/* Routes List */}
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-sidebar-primary" />
            <h3 className="text-base font-semibold text-sidebar-foreground">Available Routes</h3>
            <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs font-medium text-sidebar-foreground">
              {routes.length}
            </span>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 rounded-full bg-sidebar-accent px-3 py-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span className="text-xs font-medium text-sidebar-foreground/80">Analyzing...</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {routes.map((route, routeIndex) => {
            const isSelected = selectedRoute?.id === route.id
            const isExpanded = expandedRoute === route.id || isSelected

            return (
              <div
                key={route.id}
                className={cn(
                  "group relative rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer overflow-hidden",
                  isSelected
                    ? "border-sidebar-primary bg-sidebar-accent shadow-lg shadow-sidebar-primary/20"
                    : "border-sidebar-border bg-sidebar hover:border-sidebar-primary/50 hover:bg-sidebar-accent/50 hover:shadow-md"
                )}
                style={{
                  animationDelay: `${routeIndex * 80}ms`,
                }}
                onClick={() => {
                  onRouteSelect(route)
                  setExpandedRoute(route.id)
                }}
              >
                {recommendedRoute && route.id === recommendedRoute.id && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-sidebar-primary via-accent to-sidebar-primary" />
                )}

                <div className="p-4">
                  {recommendedRoute && route.id === recommendedRoute.id && (
                    <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <Zap className="h-3.5 w-3.5" />
                      AI Recommended
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-4 w-4 rounded-full ring-2 ring-offset-2 ring-offset-sidebar transition-transform group-hover:scale-110"
                          style={{ backgroundColor: route.color, boxShadow: `0 0 12px ${route.color}60` }}
                        />
                        <span className="text-lg font-semibold text-sidebar-foreground">{route.name}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="flex items-center gap-1.5 rounded-lg bg-sidebar-border/50 px-2.5 py-1 text-sm font-medium text-sidebar-foreground">
                          <Clock className="h-3.5 w-3.5 text-sidebar-primary" />
                          {route.duration} min
                        </span>
                        <span className="flex items-center gap-1.5 rounded-lg bg-sidebar-border/50 px-2.5 py-1 text-sm font-medium text-sidebar-foreground">
                          <MapPin className="h-3.5 w-3.5 text-sidebar-primary" />
                          {route.distance} km
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                          route.trafficLevel === "low" && "bg-green-500/20 text-green-400",
                          route.trafficLevel === "medium" && "bg-amber-500/20 text-amber-400",
                          route.trafficLevel === "high" && "bg-red-500/20 text-red-400"
                        )}
                      >
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full animate-pulse",
                          route.trafficLevel === "low" && "bg-green-400",
                          route.trafficLevel === "medium" && "bg-amber-400",
                          route.trafficLevel === "high" && "bg-red-400"
                        )} />
                        {route.trafficLevel === "low" && "Clear"}
                        {route.trafficLevel === "medium" && "Moderate"}
                        {route.trafficLevel === "high" && "Heavy"}
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-sidebar-primary/20 px-2.5 py-1">
                        <Sparkles className="h-3.5 w-3.5 text-sidebar-primary" />
                        <span className="text-sm font-bold text-sidebar-primary tabular-nums">
                          <AnimatedScore value={route.aiScore} />%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable details */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-400 ease-in-out",
                    isExpanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="border-t border-sidebar-border px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 rounded-lg bg-sidebar-border/30 px-3 py-2">
                        <Fuel className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-medium text-sidebar-foreground">{route.fuelEstimate}L fuel</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-sidebar-border/30 px-3 py-2">
                        <Leaf className="h-4 w-4 text-green-400" />
                        <span className="text-xs font-medium text-sidebar-foreground">{route.co2Estimate}kg CO₂</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">Highlights</div>
                      <ul className="mt-1.5 space-y-1">
                        {route.highlights.map((h, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-sidebar-foreground/70"
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-primary" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Collapse toggle when expanded but not selected */}
                {isExpanded && !isSelected && (
                  <button
                    className="flex w-full items-center justify-center gap-1 border-t border-sidebar-border py-1.5 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedRoute(null)
                    }}
                  >
                    <ChevronDown className="h-3 w-3 rotate-180" /> Collapse
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Smart Departure Times */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-sidebar-primary" />
          <h3 className="text-sm font-medium text-sidebar-foreground">Smart Departure</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {departureRecommendations.map((rec, i) => (
            <button
              key={i}
              onClick={() => setSelectedDeparture(i)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-all duration-200 hover:scale-105 active:scale-95",
                selectedDeparture === i
                  ? "border-sidebar-primary bg-sidebar-primary/20 shadow-md shadow-sidebar-primary/20"
                  : rec.savings > 8
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-sidebar-border bg-sidebar"
              )}
            >
              <span className="text-xs font-semibold text-sidebar-foreground">{rec.time}</span>
              {rec.savings > 0 ? (
                <span className="text-xs text-green-400">-{rec.savings} min</span>
              ) : (
                <span className="text-xs text-sidebar-foreground/50">Now</span>
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-sidebar-foreground/60">
          {selectedDeparture !== null
            ? departureRecommendations[selectedDeparture]?.reason
            : departureRecommendations[1]?.reason || "Analyzing optimal departure times..."}
        </p>
      </div>

      {/* Start Navigation Button */}
      <div className="border-t border-sidebar-border p-4">
        <button
          onClick={onStartNavigation}
          disabled={!selectedRoute || !origin.name || !destination.name}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200",
            selectedRoute && origin.name && destination.name
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              : "cursor-not-allowed bg-sidebar-border text-sidebar-foreground/50"
          )}
        >
          <Navigation className="h-5 w-5" />
          Start Navigation
        </button>
      </div>
    </div>
  )
}
