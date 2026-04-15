"use client"

import { useState, useEffect } from "react"
import { Navigation, Bell, Settings, RefreshCw, X, Sun, Moon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  lastUpdated: Date
  onRefresh: () => void
  isRefreshing: boolean
}

export function Header({ lastUpdated, onRefresh, isRefreshing }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifCount, setNotifCount] = useState(3)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--"

  const notifications = [
    { id: 1, icon: "🚨", title: "Accident ahead", desc: "Main St & 5th Ave — 15+ min delay", time: "5m ago", unread: true },
    { id: 2, icon: "🚧", title: "Construction zone", desc: "Highway 101 Exit 23 — lane closure", time: "30m ago", unread: true },
    { id: 3, icon: "🎵", title: "Event tonight", desc: "Downtown Arena — expect heavy traffic", time: "1h ago", unread: false },
  ]

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-border bg-card px-4 shadow-sm z-20">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/30">
          <Navigation className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">Smart Route Optimizer</h1>
          <p className="text-xs text-muted-foreground">Urban Mobility Intelligence</p>
        </div>
      </div>

      {/* Center — Live Clock */}
      <div className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 md:flex">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span
          suppressHydrationWarning
          className="font-mono text-xs font-medium tabular-nums text-foreground"
        >{formattedTime}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Last updated badge */}
        <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 sm:flex">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Updated {formatTimeAgo(lastUpdated)}</span>
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh data"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4 transition-transform", isRefreshing && "animate-spin")} />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          title="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setNotifCount(0)
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
                {notifCount}
              </span>
            )}
          </button>

          {/* Notifications panel */}
          {showNotifications && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                <button onClick={() => setShowNotifications(false)}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/50",
                      n.unread && "bg-primary/5"
                    )}
                  >
                    <span className="text-xl">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{n.title}</span>
                        {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/70">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-4 py-2 text-center">
                <button className="text-xs text-primary hover:underline">Mark all as read</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ago`
}
