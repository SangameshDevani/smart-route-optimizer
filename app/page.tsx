"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { LiveMap } from "@/components/live-map"
import { RoutePanel } from "@/components/route-panel"
import { TrafficAlerts } from "@/components/traffic-alerts"
import { NavigationModal } from "@/components/navigation-modal"
import type { TravelMode, RoutePreference } from "@/components/route-preferences"
import {
  getRoutes,
  getTrafficUpdates,
  getDepartureRecommendations,
  simulateTrafficChange,
  type Route,
  type TrafficUpdate,
  type DepartureRecommendation,
} from "@/lib/route-data"

interface Location {
  id: string
  name: string
  address: string
  type: "recent" | "saved" | "search"
}

export default function SmartRouteOptimizer() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [trafficUpdates, setTrafficUpdates] = useState<TrafficUpdate[]>([])
  const [departureRecs, setDepartureRecs] = useState<DepartureRecommendation[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Location state
  const [origin, setOrigin] = useState<Location>({
    id: "current",
    name: "Current Location",
    address: "Using GPS",
    type: "recent",
  })
  const [destination, setDestination] = useState<Location>({
    id: "work",
    name: "Downtown Office",
    address: "456 Business Park, Tech District",
    type: "saved",
  })

  // Preferences state
  const [travelMode, setTravelMode] = useState<TravelMode>("car")
  const [routePreference, setRoutePreference] = useState<RoutePreference>("fastest")
  const [avoidTolls, setAvoidTolls] = useState(false)
  const [avoidHighways, setAvoidHighways] = useState(false)

  // Initialize data
  useEffect(() => {
    const initialRoutes = getRoutes()
    setRoutes(initialRoutes)
    setSelectedRoute(initialRoutes[0])
    setTrafficUpdates(getTrafficUpdates())
    setDepartureRecs(getDepartureRecommendations())
  }, [])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRoutes((currentRoutes) => {
        const updatedRoutes = currentRoutes.map((route) => simulateTrafficChange(route))
        setSelectedRoute((current) => {
          if (current) {
            const updated = updatedRoutes.find((r) => r.id === current.id)
            return updated || current
          }
          return current
        })
        return updatedRoutes
      })
      setLastUpdated(new Date())
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  // Recalculate routes when preferences change
  useEffect(() => {
    if (routes.length === 0) return
    
    setIsAnalyzing(true)
    const timer = setTimeout(() => {
      setRoutes((currentRoutes) => {
        return currentRoutes.map((route) => {
          let scoreModifier = 0
          
          if (routePreference === "fastest") {
            scoreModifier = route.id === "fastest" ? 10 : route.id === "shortest" ? -5 : -10
          } else if (routePreference === "shortest") {
            scoreModifier = route.id === "shortest" ? 10 : route.id === "fastest" ? -5 : -10
          } else if (routePreference === "eco") {
            scoreModifier = route.id === "scenic" ? 10 : route.id === "fastest" ? -10 : 0
          }
          
          if (avoidHighways && route.id === "fastest") {
            scoreModifier -= 20
          }
          
          return {
            ...route,
            aiScore: Math.max(0, Math.min(100, route.aiScore + scoreModifier)),
          }
        })
      })
      setIsAnalyzing(false)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [routePreference, avoidTolls, avoidHighways, routes.length])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    setIsAnalyzing(true)

    setTimeout(() => {
      setRoutes(getRoutes())
      setTrafficUpdates(getTrafficUpdates())
      setDepartureRecs(getDepartureRecommendations())
      setLastUpdated(new Date())
      setIsRefreshing(false)

      setTimeout(() => {
        setIsAnalyzing(false)
      }, 500)
    }, 1000)
  }, [])

  const handleRouteSelect = useCallback((route: Route) => {
    setSelectedRoute(route)
  }, [])

  const handleDismissAlert = useCallback((id: string) => {
    setTrafficUpdates((current) => current.filter((u) => u.id !== id))
  }, [])

  const handleStartNavigation = useCallback(() => {
    if (selectedRoute) {
      setIsNavigating(true)
    }
  }, [selectedRoute])

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Route Panel */}
        <aside className="hidden w-80 flex-shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar lg:block xl:w-96">
          <RoutePanel
            routes={routes}
            selectedRoute={selectedRoute}
            onRouteSelect={handleRouteSelect}
            departureRecommendations={departureRecs}
            isAnalyzing={isAnalyzing}
            origin={origin}
            destination={destination}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
            routePreference={routePreference}
            onRoutePreferenceChange={setRoutePreference}
            avoidTolls={avoidTolls}
            onAvoidTollsChange={setAvoidTolls}
            avoidHighways={avoidHighways}
            onAvoidHighwaysChange={setAvoidHighways}
            onStartNavigation={handleStartNavigation}
          />
        </aside>

        {/* Main Map Area */}
        <main className="relative flex-1">
          <TrafficAlerts updates={trafficUpdates} onDismiss={handleDismissAlert} />
          <LiveMap
            routes={routes}
            selectedRouteId={selectedRoute?.id || null}
            onRouteSelect={(routeId) => {
              const route = routes.find(r => r.id === routeId)
              if (route) handleRouteSelect(route)
            }}
            origin={origin.name}
            destination={destination.name}
            isNavigating={isNavigating}
            travelMode={travelMode}
          />

          {/* Mobile Route Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-card p-4 shadow-lg lg:hidden">
            {selectedRoute && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedRoute.color }}
                    />
                    <span className="font-medium text-foreground">{selectedRoute.name}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRoute.duration} min | {selectedRoute.distance} km
                  </p>
                </div>
                <button 
                  onClick={handleStartNavigation}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Start
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Navigation Modal */}
      {selectedRoute && (
        <NavigationModal
          isOpen={isNavigating}
          onClose={() => setIsNavigating(false)}
          route={selectedRoute}
          origin={origin.name}
          destination={destination.name}
        />
      )}
    </div>
  )
}
