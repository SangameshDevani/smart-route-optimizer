"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapPin, Navigation, Search, X, Clock, Star, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type G = typeof window & { google: any }

interface Location {
  id: string
  name: string
  address: string
  type: "recent" | "saved" | "search"
  coordinates?: { lat: number; lng: number }
}

interface LocationSearchProps {
  label: string
  value: string
  onChange: (location: Location) => void
  placeholder?: string
  variant: "origin" | "destination"
}

// Saved / recent fallback list (shown when dropdown opens with no query)
const SAVED_LOCATIONS: Location[] = [
  { id: "1", name: "Home",            address: "Indiranagar, Bangalore",           type: "saved",  coordinates: { lat: 12.9352, lng: 77.6245 } },
  { id: "2", name: "Work",            address: "Whitefield Tech Park, Bangalore",  type: "saved",  coordinates: { lat: 12.9698, lng: 77.7500 } },
  { id: "3", name: "Central Station", address: "Majestic, Bangalore",              type: "recent", coordinates: { lat: 12.9791, lng: 77.5724 } },
  { id: "4", name: "Airport",         address: "Kempegowda International Airport", type: "recent", coordinates: { lat: 13.1989, lng: 77.7068 } },
]

export function LocationSearch({ label, value, onChange, placeholder, variant }: LocationSearchProps) {
  const [isOpen,           setIsOpen]           = useState(false)
  const [searchQuery,      setSearchQuery]      = useState("")
  const [predictions,      setPredictions]      = useState<Location[]>([])
  const [isSearching,      setIsSearching]      = useState(false)
  const [googleReady,      setGoogleReady]      = useState(false)

  const inputRef        = useRef<HTMLInputElement>(null)
  const containerRef    = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<any>(null)
  const sessionTokenRef = useRef<any>(null)

  // Poll until Google Maps JS API is ready
  useEffect(() => {
    const poll = setInterval(() => {
      if ((window as G).google?.maps?.places) {
        setGoogleReady(true)
        clearInterval(poll)
      }
    }, 200)
    return () => clearInterval(poll)
  }, [])

  // Click outside to close
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // Initialize Places AutocompleteService once Google is ready
  useEffect(() => {
    if (!googleReady) return
    const G = (window as G).google.maps.places
    autocompleteRef.current = new G.AutocompleteService()
    sessionTokenRef.current = new G.AutocompleteSessionToken()
  }, [googleReady])

  // Fetch predictions from Google Places as user types
  const fetchPredictions = useCallback((query: string) => {
    if (!query || query.length < 2 || !autocompleteRef.current) {
      setPredictions([])
      return
    }
    setIsSearching(true)
    autocompleteRef.current.getPlacePredictions(
      {
        input:              query,
        sessionToken:       sessionTokenRef.current,
        componentRestrictions: { country: "in" },
        types:              ["geocode", "establishment"],
      },
      (results: any[], status: string) => {
        setIsSearching(false)
        if (status !== "OK" || !results) { setPredictions([]); return }
        setPredictions(
          results.slice(0, 6).map((p) => ({
            id:      p.place_id,
            name:    p.structured_formatting?.main_text    || p.description,
            address: p.structured_formatting?.secondary_text || "",
            type:    "search" as const,
          }))
        )
      }
    )
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchPredictions(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, fetchPredictions])

  // When selection is made, resolve place_id → coordinates using PlacesService
  const handleSelect = useCallback((location: Location) => {
    if (!location.coordinates && location.id && googleReady) {
      // Resolve coordinates via PlacesService
      const G     = (window as G).google.maps
      const dummy = document.createElement("div")
      const svc   = new G.places.PlacesService(dummy)
      svc.getDetails(
        { placeId: location.id, fields: ["geometry", "name", "formatted_address"], sessionToken: sessionTokenRef.current },
        (place: any, status: string) => {
          // Refresh session token after completed session
          sessionTokenRef.current = new G.places.AutocompleteSessionToken()
          if (status === "OK" && place?.geometry?.location) {
            onChange({
              ...location,
              name:        place.name || location.name,
              address:     place.formatted_address || location.address,
              coordinates: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            })
          } else {
            onChange(location)
          }
        }
      )
    } else {
      onChange(location)
    }
    setSearchQuery("")
    setIsOpen(false)
    setPredictions([])
  }, [googleReady, onChange])

  const handleCurrentLocation = () => {
    onChange({ id: "current", name: "Current Location", address: "Using GPS", type: "recent" })
    setIsOpen(false)
  }

  const displayList: Location[] = searchQuery.length >= 2 ? predictions : SAVED_LOCATIONS

  return (
    <div ref={containerRef} className="relative">
      {/* Input row */}
      <div className={cn(
        "flex items-center gap-3 rounded-xl border bg-sidebar-accent/50 p-3 transition-all",
        isOpen ? "border-sidebar-primary ring-1 ring-sidebar-primary/30" : "border-sidebar-border",
        "hover:border-sidebar-primary/50"
      )}>
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          variant === "origin" ? "bg-primary" : "bg-accent"
        )}>
          {variant === "origin"
            ? <Navigation className="h-4 w-4 text-primary-foreground" />
            : <MapPin className="h-4 w-4 text-accent-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-sidebar-foreground/60">{label}</div>
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : value}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder || "Search any place in India…"}
            className="w-full bg-transparent text-sm font-medium text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/40"
            autoComplete="off"
          />
        </div>

        {isSearching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sidebar-foreground/40" />}
        {value && !isOpen && (
          <button
            onClick={() => { onChange({ id: "", name: "", address: "", type: "recent" }); setIsOpen(true); inputRef.current?.focus() }}
            className="rounded-full p-1 transition-colors hover:bg-sidebar-border"
          >
            <X className="h-4 w-4 text-sidebar-foreground/60" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-sidebar-border bg-sidebar shadow-2xl">
          {/* Current location button (origin only) */}
          {variant === "origin" && (
            <button
              onClick={handleCurrentLocation}
              className="flex w-full items-center gap-3 border-b border-sidebar-border p-3 text-left transition-colors hover:bg-sidebar-accent"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                <Navigation className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-sidebar-foreground">Use current location</div>
                <div className="text-xs text-sidebar-foreground/60">Via GPS</div>
              </div>
            </button>
          )}

          {/* Powered by Google label */}
          {googleReady && searchQuery.length >= 2 && (
            <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-1.5">
              <span className="text-xs text-sidebar-foreground/40">
                {predictions.length > 0 ? `${predictions.length} results` : "No results"}
              </span>
              <span className="text-[10px] text-sidebar-foreground/30">Powered by Google</span>
            </div>
          )}

          {/* Location list */}
          {displayList.length > 0 && (
            <>
              {searchQuery.length < 2 && (
                <div className="px-3 py-2 text-xs font-medium text-sidebar-foreground/50">Saved &amp; Recent</div>
              )}
              {displayList.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelect(loc)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-border">
                    {loc.type === "saved"
                      ? <Star   className="h-4 w-4 text-amber-500" />
                      : loc.type === "recent"
                        ? <Clock  className="h-4 w-4 text-sidebar-foreground/60" />
                        : <Search className="h-4 w-4 text-sidebar-foreground/60" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-sidebar-foreground">{loc.name}</div>
                    {loc.address && (
                      <div className="truncate text-xs text-sidebar-foreground/60">{loc.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Empty state when typing */}
          {searchQuery.length >= 2 && !isSearching && predictions.length === 0 && (
            <div className="p-6 text-center text-sm text-sidebar-foreground/40">
              No results for &quot;{searchQuery}&quot;
            </div>
          )}

          {/* Prompt to type */}
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <div className="p-4 text-center text-xs text-sidebar-foreground/40">Type at least 2 characters to search</div>
          )}
        </div>
      )}
    </div>
  )
}
