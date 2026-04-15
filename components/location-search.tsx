"use client"

import { useState, useRef, useEffect } from "react"
import { MapPin, Navigation, Search, X, Clock, Star } from "lucide-react"
import { cn } from "@/lib/utils"

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

const recentLocations: Location[] = [
  { id: "1", name: "Home", address: "Indiranagar, Bangalore", type: "saved", coordinates: { lat: 12.9352, lng: 77.6245 } },
  { id: "2", name: "Work", address: "Whitefield Tech Park, Bangalore", type: "saved", coordinates: { lat: 12.9698, lng: 77.7500 } },
  { id: "3", name: "Central Station", address: "Majestic, Bangalore", type: "recent", coordinates: { lat: 12.9791, lng: 77.5724 } },
  { id: "4", name: "Mall of India", address: "Koramangala, Bangalore", type: "recent", coordinates: { lat: 12.9925, lng: 77.6967 } },
]

const searchResults: Location[] = [
  { id: "s1", name: "Downtown", address: "MG Road, Bangalore", type: "search", coordinates: { lat: 12.9716, lng: 77.5946 } },
  { id: "s2", name: "Airport", address: "Kempegowda International Airport", type: "search", coordinates: { lat: 13.1989, lng: 77.7068 } },
  { id: "s3", name: "University Campus", address: "Bangalore University, Jnanabharathi", type: "search", coordinates: { lat: 13.0219, lng: 77.5671 } },
  { id: "s4", name: "Sports Complex", address: "Kanteerava Stadium, Bangalore", type: "search", coordinates: { lat: 12.9656, lng: 77.5495 } },
  { id: "s5", name: "Medical Center", address: "Victoria Hospital, Bangalore", type: "search", coordinates: { lat: 12.9343, lng: 77.6101 } },
  { id: "s6", name: "Tech Park", address: "Electronic City, Bangalore", type: "search", coordinates: { lat: 12.8456, lng: 77.6603 } },
  { id: "s7", name: "City Center", address: "Cubbon Park Area, Bangalore", type: "search", coordinates: { lat: 12.9763, lng: 77.5929 } },
  { id: "s8", name: "Business District", address: "UB City, Vittal Mallya Road", type: "search", coordinates: { lat: 12.9716, lng: 77.5965 } },
]

export function LocationSearch({ label, value, onChange, placeholder, variant }: LocationSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredResults, setFilteredResults] = useState<Location[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery.length > 0) {
      const results = searchResults.filter(
        (loc) =>
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredResults(results)
    } else {
      setFilteredResults([])
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (location: Location) => {
    onChange(location)
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleUseCurrentLocation = () => {
    onChange({
      id: "current",
      name: "Current Location",
      address: "Using GPS",
      type: "recent",
    })
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-sidebar-accent/50 p-3 transition-all",
          isOpen ? "border-sidebar-primary ring-1 ring-sidebar-primary/30" : "border-sidebar-border",
          "hover:border-sidebar-primary/50"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            variant === "origin" ? "bg-primary" : "bg-accent"
          )}
        >
          {variant === "origin" ? (
            <Navigation className="h-4 w-4 text-primary-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-accent-foreground" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs text-sidebar-foreground/60">{label}</div>
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : value}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder || "Search location..."}
            className="w-full bg-transparent text-sm font-medium text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/40"
          />
        </div>
        {value && !isOpen && (
          <button
            onClick={() => {
              onChange({ id: "", name: "", address: "", type: "recent" })
              setIsOpen(true)
              inputRef.current?.focus()
            }}
            className="rounded-full p-1 hover:bg-sidebar-border"
          >
            <X className="h-4 w-4 text-sidebar-foreground/60" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-sidebar-border bg-sidebar shadow-xl">
          {/* Use Current Location */}
          {variant === "origin" && (
            <button
              onClick={handleUseCurrentLocation}
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

          {/* Search Results */}
          {filteredResults.length > 0 && (
            <div className="border-b border-sidebar-border">
              <div className="px-3 py-2 text-xs font-medium text-sidebar-foreground/50">Search Results</div>
              {filteredResults.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelect(location)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-border">
                    <Search className="h-4 w-4 text-sidebar-foreground/60" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-sidebar-foreground">{location.name}</div>
                    <div className="text-xs text-sidebar-foreground/60">{location.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent & Saved */}
          {searchQuery.length === 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-sidebar-foreground/50">Saved & Recent</div>
              {recentLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelect(location)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-border">
                    {location.type === "saved" ? (
                      <Star className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-sidebar-foreground/60" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-sidebar-foreground">{location.name}</div>
                    <div className="text-xs text-sidebar-foreground/60">{location.address}</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
