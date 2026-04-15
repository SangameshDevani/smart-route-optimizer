"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Construction, Calendar, CloudRain, X, ChevronDown, ChevronUp } from "lucide-react"
import type { TrafficUpdate } from "@/lib/route-data"
import { cn } from "@/lib/utils"

interface TrafficAlertsProps {
  updates: TrafficUpdate[]
  onDismiss?: (id: string) => void
}

function AlertCard({ update, onDismiss, index }: { update: TrafficUpdate; onDismiss?: (id: string) => void; index: number }) {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 120)
    return () => clearTimeout(timer)
  }, [index])

  const getIcon = (type: TrafficUpdate["type"]) => {
    switch (type) {
      case "accident": return AlertTriangle
      case "construction": return Construction
      case "event": return Calendar
      case "weather": return CloudRain
      default: return AlertTriangle
    }
  }

  const getTimeAgo = (timestamp: Date) => {
    const minutes = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  const Icon = getIcon(update.type)

  const impactColors = {
    high: {
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-500",
      label: "text-red-500",
      dot: "bg-red-500",
    },
    medium: {
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-500",
      label: "text-amber-500",
      dot: "bg-amber-500",
    },
    low: {
      border: "border-blue-500/40",
      bg: "bg-blue-500/10",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-500",
      label: "text-blue-500",
      dot: "bg-blue-500",
    },
  }
  const c = impactColors[update.impact]

  return (
    <div
      className={cn(
        "group flex flex-col gap-0 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-500 overflow-hidden",
        c.border,
        c.bg,
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      )}
      style={{ transitionDelay: visible ? "0ms" : `${index * 120}ms` }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5", c.iconBg)}>
          <Icon className={cn("h-4 w-4", c.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", c.dot)} />
              <span className={cn("text-xs font-semibold uppercase tracking-wide", c.label)}>
                {update.type}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{getTimeAgo(update.timestamp)}</span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-foreground">{update.location}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-full p-1 transition-colors hover:bg-foreground/10"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {onDismiss && (
            <button
              onClick={() => {
                setVisible(false)
                setTimeout(() => onDismiss(update.id), 300)
              }}
              className="rounded-full p-1 opacity-0 transition-opacity hover:bg-foreground/10 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable message */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <p className="px-3 pb-3 text-xs text-muted-foreground">{update.message}</p>
      </div>
    </div>
  )
}

export function TrafficAlerts({ updates, onDismiss }: TrafficAlertsProps) {
  if (updates.length === 0) return null

  return (
    <div className="absolute left-4 top-4 z-10 flex max-w-xs flex-col gap-2">
      {updates.slice(0, 3).map((update, i) => (
        <AlertCard key={update.id} update={update} onDismiss={onDismiss} index={i} />
      ))}
    </div>
  )
}
