export interface Route {
  id: string
  name: string
  duration: number // in minutes
  distance: number // in km
  trafficLevel: "low" | "medium" | "high"
  congestionPoints: number
  fuelEstimate: number // in liters
  co2Estimate: number // in kg
  color: string
  aiScore: number // 0-100, AI recommendation score
  highlights: string[]
}

export interface TrafficUpdate {
  id: string
  type: "accident" | "construction" | "event" | "weather"
  location: string
  impact: "low" | "medium" | "high"
  message: string
  timestamp: Date
}

export interface DepartureRecommendation {
  time: string
  savings: number // minutes saved
  confidence: number // percentage
  reason: string
}

// Simulated route data
export function getRoutes(): Route[] {
  return [
    {
      id: "fastest",
      name: "Highway Express",
      duration: 24,
      distance: 12.5,
      trafficLevel: "low",
      congestionPoints: 1,
      fuelEstimate: 1.2,
      co2Estimate: 2.8,
      color: "#3b82f6",
      aiScore: 92,
      highlights: ["Avoids downtown congestion", "Uses express lanes", "Real-time signal optimization"],
    },
    {
      id: "shortest",
      name: "Direct Route",
      duration: 32,
      distance: 8.2,
      trafficLevel: "high",
      congestionPoints: 3,
      fuelEstimate: 0.9,
      co2Estimate: 2.1,
      color: "#f59e0b",
      aiScore: 65,
      highlights: ["Shortest distance", "Multiple traffic lights", "Passes through busy area"],
    },
    {
      id: "scenic",
      name: "Riverside Drive",
      duration: 38,
      distance: 14.8,
      trafficLevel: "low",
      congestionPoints: 0,
      fuelEstimate: 1.4,
      co2Estimate: 3.2,
      color: "#22c55e",
      aiScore: 78,
      highlights: ["No congestion", "Scenic views", "Lower stress route"],
    },
  ]
}

// Simulated real-time traffic updates
export function getTrafficUpdates(): TrafficUpdate[] {
  return [
    {
      id: "1",
      type: "accident",
      location: "Main St & 5th Ave",
      impact: "high",
      message: "Multi-vehicle accident causing 15+ min delays",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: "2",
      type: "construction",
      location: "Highway 101 Exit 23",
      impact: "medium",
      message: "Lane closure until 6 PM",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "3",
      type: "event",
      location: "Downtown Arena",
      impact: "medium",
      message: "Concert ending at 10 PM - expect heavy traffic",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
    },
  ]
}

// AI-powered departure recommendations
export function getDepartureRecommendations(): DepartureRecommendation[] {
  const now = new Date()
  const currentHour = now.getHours()
  
  return [
    {
      time: formatTime(currentHour, 0),
      savings: 0,
      confidence: 85,
      reason: "Current conditions",
    },
    {
      time: formatTime(currentHour, 15),
      savings: 8,
      confidence: 92,
      reason: "Traffic clearing after rush hour peak",
    },
    {
      time: formatTime(currentHour, 30),
      savings: 12,
      confidence: 88,
      reason: "Optimal window before evening rush",
    },
    {
      time: formatTime(currentHour + 1, 0),
      savings: 5,
      confidence: 75,
      reason: "Moderate improvement expected",
    },
  ]
}

function formatTime(hour: number, minutes: number): string {
  const h = hour % 24
  const period = h >= 12 ? "PM" : "AM"
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`
}

// Simulate real-time data updates
export function simulateTrafficChange(route: Route): Route {
  const trafficLevels: Array<"low" | "medium" | "high"> = ["low", "medium", "high"]
  const randomChange = Math.random()
  
  if (randomChange > 0.8) {
    const currentIndex = trafficLevels.indexOf(route.trafficLevel)
    const newIndex = Math.min(trafficLevels.length - 1, Math.max(0, currentIndex + (Math.random() > 0.5 ? 1 : -1)))
    const durationChange = (newIndex - currentIndex) * 5
    
    return {
      ...route,
      trafficLevel: trafficLevels[newIndex],
      duration: Math.max(route.duration + durationChange, 10),
      aiScore: Math.max(0, Math.min(100, route.aiScore + (newIndex < currentIndex ? 5 : -5))),
    }
  }
  
  return route
}
