"use client"

import { Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "./ui/badge"

interface CountdownTimerProps {
  deadline: string
  compact?: boolean
}

export function CountdownTimer({ deadline, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    expired: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(deadline).getTime()
      const difference = end - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, expired: false })
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  if (timeLeft.expired) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Bidding Expired
      </Badge>
    )
  }

  if (compact) {
    return (
      <Badge variant="outline" className="gap-1 border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]">
        <Clock className="h-3 w-3" />
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-4">
      <Clock className="h-5 w-5 text-[hsl(var(--warning))]" />
      <div className="flex-1">
        <div className="text-xs font-medium text-muted-foreground">Time Remaining</div>
        <div className="mt-1 flex gap-3 text-sm font-semibold text-foreground">
          <span className="flex flex-col items-center">
            <span className="text-2xl text-[hsl(var(--warning))]">{timeLeft.days}</span>
            <span className="text-xs text-muted-foreground">Days</span>
          </span>
          <span className="text-2xl text-muted-foreground">:</span>
          <span className="flex flex-col items-center">
            <span className="text-2xl text-[hsl(var(--warning))]">{String(timeLeft.hours).padStart(2, "0")}</span>
            <span className="text-xs text-muted-foreground">Hours</span>
          </span>
          <span className="text-2xl text-muted-foreground">:</span>
          <span className="flex flex-col items-center">
            <span className="text-2xl text-[hsl(var(--warning))]">{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span className="text-xs text-muted-foreground">Minutes</span>
          </span>
          <span className="text-2xl text-muted-foreground">:</span>
          <span className="flex flex-col items-center">
            <span className="text-2xl text-[hsl(var(--warning))]">{String(timeLeft.seconds).padStart(2, "0")}</span>
            <span className="text-xs text-muted-foreground">Seconds</span>
          </span>
        </div>
      </div>
    </div>
  )
}
