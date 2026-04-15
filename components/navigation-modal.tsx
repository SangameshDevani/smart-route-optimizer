"use client"

import { useEffect, useState, useRef } from "react"
import { X, Navigation, Volume2, VolumeX, MapPin, Clock, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react"
import type { Route } from "@/lib/route-data"
import { cn } from "@/lib/utils"

interface NavigationModalProps {
  isOpen: boolean
  onClose: () => void
  route: Route
  origin: string
  destination: string
}

interface NavigationStep {
  instruction: string
  distance: string
  time: string
  icon: "straight" | "left" | "right" | "arrive"
}

const mockSteps: NavigationStep[] = [
  { instruction: "Head north on Oak Street", distance: "0.3 km", time: "1 min", icon: "straight" },
  { instruction: "Turn right onto Main Avenue", distance: "1.2 km", time: "3 min", icon: "right" },
  { instruction: "Continue onto Highway Express", distance: "8.5 km", time: "12 min", icon: "straight" },
  { instruction: "Take exit 23 toward Downtown", distance: "0.8 km", time: "2 min", icon: "right" },
  { instruction: "Turn left onto Business Park Drive", distance: "1.4 km", time: "4 min", icon: "left" },
  { instruction: "Arrive at destination on the right", distance: "0.3 km", time: "2 min", icon: "arrive" },
]

function DirectionIcon({ icon }: { icon: NavigationStep["icon"] }) {
  const cls = "h-8 w-8 text-primary-foreground"
  if (icon === "left") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
  if (icon === "right") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
  if (icon === "arrive") return <MapPin className={cn(cls, "text-accent-foreground")} />
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

export function NavigationModal({ isOpen, onClose, route, origin, destination }: NavigationModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [eta, setEta] = useState(route.duration)
  const [visible, setVisible] = useState(false)
  const [speed, setSpeed] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setProgress(0)
      setEta(route.duration)
      setCompletedSteps(new Set())
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen, route.duration])

  useEffect(() => {
    if (!isOpen) return

    // Animate speed
    const targetSpeed = Math.floor(40 + Math.random() * 30)
    let s = 0
    const speedInterval = setInterval(() => {
      s += 3
      if (s >= targetSpeed) { clearInterval(speedInterval); return }
      setSpeed(s)
    }, 50)

    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 100 / (route.duration * 60), 100)
        setEta(route.duration * (1 - next / 100))

        const stepProgress = Math.floor((next / 100) * mockSteps.length)
        const newStep = Math.min(stepProgress, mockSteps.length - 1)
        setCurrentStep((prev) => {
          if (newStep > prev) {
            setCompletedSteps((cs) => new Set([...cs, prev]))
          }
          return newStep
        })

        // Randomly vary speed
        setSpeed(Math.floor(40 + Math.random() * 30))

        return next
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(speedInterval)
    }
  }, [isOpen, route.duration])

  if (!isOpen) return null

  const currentInstruction = mockSteps[currentStep]
  const isArriving = currentStep === mockSteps.length - 1 && progress > 90

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
      visible ? "bg-black/80 backdrop-blur-sm" : "bg-black/0"
    )}>
      <div className={cn(
        "relative w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl transition-all duration-300",
        visible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
      )}>

        {/* Header */}
        <div className={cn(
          "flex items-center justify-between border-b border-border p-4 text-primary-foreground transition-colors duration-1000",
          isArriving ? "bg-accent" : "bg-primary"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              {isArriving
                ? <CheckCircle2 className="h-5 w-5 animate-bounce" />
                : <Navigation className="h-5 w-5 animate-pulse" />
              }
            </div>
            <div>
              <div className="text-lg font-semibold">{isArriving ? "Almost there!" : "Navigating"}</div>
              <div className="text-sm opacity-80">{route.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Speed indicator */}
            <div className="hidden flex-col items-center rounded-lg bg-white/10 px-2 py-1 sm:flex">
              <span className="text-lg font-bold leading-none">{speed}</span>
              <span className="text-[10px] opacity-70">km/h</span>
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className="rounded-full p-2 transition-colors hover:bg-white/20">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Current Instruction */}
        <div className="bg-muted p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
              currentInstruction.icon === "arrive" ? "bg-accent" : "bg-primary"
            )}>
              <DirectionIcon icon={currentInstruction.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                key={currentStep}
                className="animate-in slide-in-from-right-4 text-xl font-semibold text-foreground duration-300"
              >
                {currentInstruction.instruction}
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{currentInstruction.distance}</span>
                <span>•</span>
                <span>{currentInstruction.time}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{origin}</span>
              <span>{destination}</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))"
                }}
              />
              {/* Moving dot on progress bar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white shadow transition-all duration-1000"
                style={{ left: `calc(${progress}% - 7px)` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums text-foreground">{Math.ceil(eta)}</div>
            <div className="text-xs text-muted-foreground">min remaining</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {((route.distance * (100 - progress)) / 100).toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">km to go</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {new Date(Date.now() + eta * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-muted-foreground">ETA</div>
          </div>
        </div>

        {/* Upcoming Steps */}
        <div className="max-h-48 overflow-y-auto p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming</div>
          <div className="space-y-2">
            {mockSteps.map((step, i) => {
              const isDone = completedSteps.has(i)
              const isCurrent = i === currentStep
              if (i < currentStep && !isDone) return null
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300",
                    isCurrent ? "bg-primary/10 border border-primary/20" : isDone ? "opacity-40" : "bg-muted"
                  )}
                >
                  {isDone
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    : <ChevronRight className={cn("h-4 w-4 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} />
                  }
                  <div className={cn("flex-1 text-sm", isCurrent ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {step.instruction}
                  </div>
                  <span className="text-xs text-muted-foreground">{step.distance}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
          >
            End Navigation
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-white transition-all hover:bg-destructive/90 active:scale-95">
            <AlertTriangle className="h-4 w-4" />
            Report
          </button>
        </div>
      </div>
    </div>
  )
}
