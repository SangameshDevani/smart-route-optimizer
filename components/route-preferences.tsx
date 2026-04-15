"use client"

import { useState } from "react"
import { Car, Bike, Train, Footprints, Leaf, Zap, Clock, Route, ChevronDown, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TravelMode = "car" | "transit" | "bike" | "walk"
export type RoutePreference = "fastest" | "shortest" | "eco" | "balanced"

interface RoutePreferencesProps {
  travelMode: TravelMode
  onTravelModeChange: (mode: TravelMode) => void
  preference: RoutePreference
  onPreferenceChange: (pref: RoutePreference) => void
  avoidTolls: boolean
  onAvoidTollsChange: (avoid: boolean) => void
  avoidHighways: boolean
  onAvoidHighwaysChange: (avoid: boolean) => void
}

const travelModes = [
  { id: "car" as TravelMode, icon: Car, label: "Drive" },
  { id: "transit" as TravelMode, icon: Train, label: "Transit" },
  { id: "bike" as TravelMode, icon: Bike, label: "Bike" },
  { id: "walk" as TravelMode, icon: Footprints, label: "Walk" },
]

const preferences = [
  { id: "fastest" as RoutePreference, icon: Zap, label: "Fastest", desc: "Minimize travel time" },
  { id: "shortest" as RoutePreference, icon: Route, label: "Shortest", desc: "Minimize distance" },
  { id: "eco" as RoutePreference, icon: Leaf, label: "Eco", desc: "Lower emissions" },
  { id: "balanced" as RoutePreference, icon: Clock, label: "Balanced", desc: "Best overall" },
]

export function RoutePreferences({
  travelMode,
  onTravelModeChange,
  preference,
  onPreferenceChange,
  avoidTolls,
  onAvoidTollsChange,
  avoidHighways,
  onAvoidHighwaysChange,
}: RoutePreferencesProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30">
      {/* Travel Mode Selector */}
      <div className="flex border-b border-sidebar-border">
        {travelModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onTravelModeChange(mode.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
              travelMode === mode.id
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <mode.icon className="h-5 w-5" />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Route Preference */}
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {preferences.map((pref) => (
            <button
              key={pref.id}
              onClick={() => onPreferenceChange(pref.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-all",
                preference === pref.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-border"
              )}
            >
              <pref.icon className="h-4 w-4" />
              <span>{pref.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between border-t border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Route Options
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </button>

      {/* Advanced Options */}
      {isExpanded && (
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-sidebar-foreground">Avoid tolls</span>
            <button
              onClick={() => onAvoidTollsChange(!avoidTolls)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                avoidTolls ? "bg-sidebar-primary" : "bg-sidebar-border"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  avoidTolls ? "left-[18px]" : "left-0.5"
                )}
              />
            </button>
          </label>
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-sidebar-foreground">Avoid highways</span>
            <button
              onClick={() => onAvoidHighwaysChange(!avoidHighways)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                avoidHighways ? "bg-sidebar-primary" : "bg-sidebar-border"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  avoidHighways ? "left-[18px]" : "left-0.5"
                )}
              />
            </button>
          </label>
        </div>
      )}
    </div>
  )
}
