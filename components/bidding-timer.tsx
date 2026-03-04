"use client"

import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useEffect, useState } from "react"

interface BiddingTimerProps {
  deadline: string
  status: "open" | "bidding" | "closed"
}

export function BiddingTimer({ deadline, status }: BiddingTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState("")
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (status !== "bidding" || !deadline) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const diff = deadlineTime - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeRemaining("Bidding Ended")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline, status])

  if (status !== "bidding" || !deadline) return null

  return (
    <Badge 
      variant="outline" 
      className={`gap-1.5 text-sm font-medium ${
        isExpired 
          ? "border-red-500 bg-red-500/10 text-red-600" 
          : "border-amber-500 bg-amber-500/10 text-amber-600"
      }`}
    >
      <Clock className="h-3.5 w-3.5" />
      {timeRemaining}
    </Badge>
  )
}
