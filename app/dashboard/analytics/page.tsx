"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import {
  Activity,
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type TimePeriod = "today" | "week" | "month" | "year"

interface SalesMetrics {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  growthRate: number
}

interface TimeSeriesData {
  date: string
  sales: number
  orders: number
}

interface ProductAnalytics {
  product: string
  totalSales: number
  totalOrders: number
  averagePrice: number
}

interface RealtimeStats {
  newInquiries: number
  newOffers: number
  newAccepted: number
  timestamp: string
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"]

const PERIOD_LABELS = {
  today: "Today",
  week: "Last 7 Days",
  month: "Last 30 Days",
  year: "Last Year",
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<TimePeriod>("month")
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([])
  const [products, setProducts] = useState<ProductAnalytics[]>([])
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchAnalytics = useCallback(async () => {
    if (!user) return

    try {
      // Fetch overview data
      const overviewRes = await fetch(
        `/api/analytics?type=overview&period=${period}&userId=${user.id}&role=${user.role}`
      )
      const overviewData = await overviewRes.json()
      setMetrics(overviewData.metrics || null)
      setTimeSeries(Array.isArray(overviewData.timeSeries) ? overviewData.timeSeries : [])

      // Fetch product analytics
      const productsRes = await fetch(
        `/api/analytics?type=products&period=${period}&userId=${user.id}&role=${user.role}`
      )
      const productsData = await productsRes.json()
      setProducts(Array.isArray(productsData.products) ? productsData.products : [])

      setLastUpdate(new Date())
    } catch (error) {
      logger.error("Failed to fetch analytics", { error: (error as Error)?.message })
    } finally {
      setLoading(false)
    }
  }, [user, period])

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics?type=realtime")
      const data = await res.json()
      setRealtimeStats(data.realtime || null)
    } catch (error) {
      logger.error("Failed to fetch realtime stats", { error: (error as Error)?.message })
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Real-time updates every 5 seconds
  useEffect(() => {
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 5000)
    return () => clearInterval(interval)
  }, [fetchRealtime])

  // Auto-refresh analytics every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [fetchAnalytics])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-IN").format(value)
  }

  // Compact formatter for chart axes
  const formatChartCurrency = (value: number) => {
    if (value === 0) return "₹0"

    const absValue = Math.abs(value)
    const sign = value < 0 ? "-" : ""

    if (absValue >= 10000000) {
      // Crores
      return `${sign}₹${(absValue / 10000000).toFixed(1)}Cr`
    } else if (absValue >= 100000) {
      // Lakhs
      return `${sign}₹${(absValue / 100000).toFixed(1)}L`
    } else if (absValue >= 1000) {
      // Thousands
      return `${sign}₹${(absValue / 1000).toFixed(1)}K`
    }
    return `${sign}₹${absValue.toFixed(0)}`
  }

  // Compact formatter for chart axes without currency symbol
  const formatChartNumber = (value: number) => {
    if (value === 0) return "0"

    const absValue = Math.abs(value)
    const sign = value < 0 ? "-" : ""

    if (absValue >= 10000000) {
      return `${sign}${(absValue / 10000000).toFixed(1)}Cr`
    } else if (absValue >= 100000) {
      return `${sign}${(absValue / 100000).toFixed(1)}L`
    } else if (absValue >= 1000) {
      return `${sign}${(absValue / 1000).toFixed(1)}K`
    }
    return `${sign}${absValue.toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const pieChartData = products.map((p) => ({
    name: p.product,
    value: p.totalSales,
  }))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real-time insights and data analysis • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAnalytics()}>
            <Activity className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {/* Real-time Stats Banner */}
      {realtimeStats && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center gap-6 p-4">
            <Activity className="h-5 w-5 animate-pulse text-emerald-600" />
            <div className="flex flex-1 flex-wrap gap-4 text-sm">
              <div>
                <span className="font-medium text-emerald-900">Live Activity (Last 5 min):</span>
              </div>
              <div className="flex gap-4">
                <span className="text-emerald-700">
                  <strong>{realtimeStats.newInquiries}</strong> New Inquiries
                </span>
                <span className="text-emerald-700">
                  <strong>{realtimeStats.newOffers}</strong> New Offers
                </span>
                <span className="text-emerald-700">
                  <strong>{realtimeStats.newAccepted}</strong> Accepted
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.totalSales || 0)}</div>
            <p className="flex items-center text-xs text-muted-foreground">
              {metrics && metrics.growthRate >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">+{metrics.growthRate}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">{metrics?.growthRate}%</span>
                </>
              )}
              <span className="ml-1">from previous period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics?.totalOrders || 0)}</div>
            <p className="text-xs text-muted-foreground">Completed transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.averageOrderValue || 0)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>


      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Sales Trend</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Over Time</CardTitle>
              <CardDescription>Revenue trend for {PERIOD_LABELS[period].toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis width={80} tickFormatter={(value) => formatChartCurrency(value)} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    name="Sales"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Distribution</CardTitle>
                <CardDescription>Sales by product category</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>By revenue</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" angle={-45} textAnchor="end" height={100} />
                    <YAxis width={80} tickFormatter={(value) => formatChartCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="totalSales" fill="#10B981" name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Product Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">Product</th>
                      <th className="pb-2 text-right font-medium">Sales</th>
                      <th className="pb-2 text-right font-medium">Orders</th>

                      <th className="pb-2 text-right font-medium">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3 font-medium">{product.product}</td>
                        <td className="py-3 text-right">{formatCurrency(product.totalSales)}</td>
                        <td className="py-3 text-right">{product.totalOrders}</td>

                        <td className="py-3 text-right">{formatCurrency(product.averagePrice)}/ton</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Over Time</CardTitle>
              <CardDescription>Number of completed transactions</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis width={60} tickFormatter={(value) => formatChartNumber(value)} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Orders"
                    dot={{ fill: "#10B981" }}
                  />

                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
