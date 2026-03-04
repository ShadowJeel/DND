import {
    getBuyerAnalytics,
    getProductAnalytics,
    getRealtimeStats,
    getSalesMetrics,
    getSellerAnalytics,
    getTimeSeriesData,
    type TimePeriod,
} from "@/lib/analytics"
import { logger } from "@/lib/logger"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get("period") as TimePeriod) || "month"
  const userId = searchParams.get("userId")
  const role = searchParams.get("role")
  const type = searchParams.get("type") || "overview"

  try {
    switch (type) {
      case "overview":
        const metrics = await getSalesMetrics(period, userId || undefined, role || undefined)
        const timeSeries = await getTimeSeriesData(period, userId || undefined, role || undefined)
        return NextResponse.json({ metrics, timeSeries })

      case "products":
        const products = await getProductAnalytics(period, userId || undefined, role || undefined)
        return NextResponse.json({ products })

      case "buyers":
        const buyers = await getBuyerAnalytics(period, userId || undefined)
        return NextResponse.json({ buyers })

      case "sellers":
        const sellers = await getSellerAnalytics(period, userId || undefined)
        return NextResponse.json({ sellers })

      case "realtime":
        const realtime = await getRealtimeStats()
        return NextResponse.json({ realtime })

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
  } catch (error) {
    logger.error("Analytics error", { error: (error as Error)?.message })
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
