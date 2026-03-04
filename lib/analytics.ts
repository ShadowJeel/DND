// Analytics and reporting functions for DND Purchase
import { db } from "./firebase"
import { collection, query, where, getDocs, orderBy, limit, getCountFromServer } from "firebase/firestore"

export interface SalesMetrics {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  growthRate: number
}

export interface TimeSeriesData {
  date: string
  sales: number
  orders: number
}

export interface ProductAnalytics {
  product: string
  totalSales: number
  totalOrders: number
  averagePrice: number
}

export interface BuyerAnalytics {
  buyerId: string
  buyerName: string
  totalSpent: number
  totalOrders: number
  lastOrderDate: string
}

export interface SellerAnalytics {
  sellerId: string
  sellerName: string
  totalRevenue: number
  totalOrders: number
  averagePrice: number
  winRate: number
}

export type TimePeriod = "today" | "week" | "month" | "year"

// Helper to get date range for time period
function getDateRange(period: TimePeriod): [Date, Date] {
  const now = new Date()
  const start = new Date()

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0)
      break
    case "week":
      start.setDate(now.getDate() - 7)
      break
    case "month":
      start.setMonth(now.getMonth() - 1)
      break
    case "year":
      start.setFullYear(now.getFullYear() - 1)
      break
  }

  return [start, now]
}

// Helper to chunk arrays
function chunkArray(array: any[], size: number) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

// Get sales metrics for a specific time period
export async function getSalesMetrics(period: TimePeriod, userId?: string, role?: string): Promise<SalesMetrics> {
  const [startDate, endDate] = getDateRange(period)

  let offersQuery = query(
    collection(db, "offers"),
    where("status", "==", "accepted"),
    where("created_at", ">=", startDate.toISOString()),
    where("created_at", "<=", endDate.toISOString())
  )

  if (userId && role === "seller") {
    offersQuery = query(offersQuery, where("seller_id", "==", userId))
  }

  const offersSnap = await getDocs(offersQuery)
  let offers = offersSnap.docs.map(doc => doc.data() as any)

  if (userId && role === "buyer" && offers.length > 0) {
    // Filter offers by checking their inquiries
    const inquiryIds = [...new Set(offers.map(o => o.inquiry_id))]
    const buyerInquiries = new Set()

    for (const chunk of chunkArray(inquiryIds, 10)) {
      const q = query(collection(db, "inquiries"), where("id", "in", chunk), where("buyer_id", "==", userId))
      const snap = await getDocs(q)
      snap.docs.forEach(d => buyerInquiries.add(d.data().id))
    }

    offers = offers.filter(o => buyerInquiries.has(o.inquiry_id))
  }

  const totalSales = offers.reduce((sum, o) => sum + (o.price_per_ton || 0), 0)
  const uniqueInquiries = new Set(offers.map((o: any) => o.inquiry_id))
  const totalOrders = uniqueInquiries.size

  // Calculate previous period for growth rate
  const [prevStartDate, prevEndDate] = getDateRange(period)
  prevStartDate.setTime(prevStartDate.getTime() - (endDate.getTime() - startDate.getTime()))
  prevEndDate.setTime(prevStartDate.getTime() + (endDate.getTime() - startDate.getTime()))

  let prevQuery = query(
    collection(db, "offers"),
    where("status", "==", "accepted"),
    where("created_at", ">=", prevStartDate.toISOString()),
    where("created_at", "<=", prevEndDate.toISOString())
  )

  if (userId && role === "seller") {
    prevQuery = query(prevQuery, where("seller_id", "==", userId))
  }

  const prevSnap = await getDocs(prevQuery)
  let prevOffers = prevSnap.docs.map(doc => doc.data() as any)

  if (userId && role === "buyer" && prevOffers.length > 0) {
    const prevInqIds = [...new Set(prevOffers.map(o => o.inquiry_id))]
    const prevBuyerInqs = new Set()

    for (const chunk of chunkArray(prevInqIds, 10)) {
      const q = query(collection(db, "inquiries"), where("id", "in", chunk), where("buyer_id", "==", userId))
      const snap = await getDocs(q)
      snap.docs.forEach(d => prevBuyerInqs.add(d.data().id))
    }
    prevOffers = prevOffers.filter(o => prevBuyerInqs.has(o.inquiry_id))
  }

  const prevTotalSales = prevOffers.reduce((sum, o) => sum + (o.price_per_ton || 0), 0)
  const growthRate = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0

  return {
    totalSales,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    growthRate: Math.round(growthRate * 10) / 10,
  }
}

// Get time series data for charts
export async function getTimeSeriesData(period: TimePeriod, userId?: string, role?: string): Promise<TimeSeriesData[]> {
  const [startDate, endDate] = getDateRange(period)

  let offersQuery = query(
    collection(db, "offers"),
    where("status", "==", "accepted"),
    where("created_at", ">=", startDate.toISOString()),
    where("created_at", "<=", endDate.toISOString())
  )

  if (userId && role === "seller") {
    offersQuery = query(offersQuery, where("seller_id", "==", userId))
  }

  const offersSnap = await getDocs(offersQuery)
  // Re-order in memory
  let offers = offersSnap.docs.map(doc => doc.data() as any).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (userId && role === "buyer" && offers.length > 0) {
    const inquiryIds = [...new Set(offers.map(o => o.inquiry_id))]
    const buyerInquiries = new Set()

    for (const chunk of chunkArray(inquiryIds, 10)) {
      const q = query(collection(db, "inquiries"), where("id", "in", chunk), where("buyer_id", "==", userId))
      const snap = await getDocs(q)
      snap.docs.forEach(d => buyerInquiries.add(d.data().id))
    }

    offers = offers.filter(o => buyerInquiries.has(o.inquiry_id))
  }

  // Group data by time period
  const groupedData = new Map<string, { sales: number; orders: Set<string> }>()

  offers.forEach((offer: any) => {
    const date = new Date(offer.created_at)
    let key = ""

    switch (period) {
      case "today":
        key = `${date.getHours()}:00`
        break
      case "week":
      case "month":
        key = date.toISOString().split("T")[0]
        break
      case "year":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        break
    }

    if (!groupedData.has(key)) {
      groupedData.set(key, { sales: 0, orders: new Set() })
    }

    const group = groupedData.get(key)!
    group.sales += offer.price_per_ton || 0
    group.orders.add(offer.inquiry_id)
  })

  return Array.from(groupedData.entries()).map(([date, data]) => ({
    date,
    sales: data.sales,
    orders: data.orders.size,
  }))
}

// Get product analytics
export async function getProductAnalytics(period: TimePeriod, userId?: string, role?: string): Promise<ProductAnalytics[]> {
  const [startDate, endDate] = getDateRange(period)

  let offersQuery = query(
    collection(db, "offers"),
    where("status", "==", "accepted"),
    where("created_at", ">=", startDate.toISOString()),
    where("created_at", "<=", endDate.toISOString())
  )

  if (userId && role === "seller") {
    offersQuery = query(offersQuery, where("seller_id", "==", userId))
  }

  const offersSnap = await getDocs(offersQuery)
  let offers = offersSnap.docs.map(doc => doc.data() as any)

  // Need inquiry items to map the product name
  if (offers.length > 0) {
    const inquiryIds = [...new Set(offers.map(o => o.inquiry_id))]
    const inqItemProductMap = new Map<string, string>()
    const buyerInquiries = new Set()

    for (const chunk of chunkArray(inquiryIds, 10)) {
      const itemsQ = query(collection(db, "inquiry_items"), where("inquiry_id", "in", chunk))
      const itemsSnap = await getDocs(itemsQ)
      itemsSnap.docs.forEach(d => inqItemProductMap.set(d.data().inquiry_id, d.data().product))

      if (userId && role === "buyer") {
        const inqQ = query(collection(db, "inquiries"), where("id", "in", chunk), where("buyer_id", "==", userId))
        const inqSnap = await getDocs(inqQ)
        inqSnap.docs.forEach(d => buyerInquiries.add(d.data().id))
      }
    }

    if (userId && role === "buyer") {
      offers = offers.filter(o => buyerInquiries.has(o.inquiry_id))
    }

    // Attach product name
    offers = offers.map(o => ({ ...o, product: inqItemProductMap.get(o.inquiry_id) || "Unknown" }))
  }

  // Group by product
  const productMap = new Map<string, { sales: number; orders: Set<string>; prices: number[] }>()

  offers.forEach((offer: any) => {
    const product = offer.product

    if (!productMap.has(product)) {
      productMap.set(product, { sales: 0, orders: new Set(), prices: [] })
    }

    const prod = productMap.get(product)!
    prod.sales += offer.price_per_ton || 0
    prod.orders.add(offer.inquiry_id)
    prod.prices.push(offer.price_per_ton || 0)
  })

  return Array.from(productMap.entries())
    .map(([product, data]) => ({
      product,
      totalSales: data.sales,
      totalOrders: data.orders.size,
      averagePrice: data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10)
}

// Get buyer analytics (for seller view)
export async function getBuyerAnalytics(period: TimePeriod, sellerId?: string): Promise<BuyerAnalytics[]> {
  const [startDate, endDate] = getDateRange(period)

  let offersQuery = query(
    collection(db, "offers"),
    where("status", "==", "accepted"),
    where("created_at", ">=", startDate.toISOString()),
    where("created_at", "<=", endDate.toISOString())
  )

  if (sellerId) {
    offersQuery = query(offersQuery, where("seller_id", "==", sellerId))
  }

  const offersSnap = await getDocs(offersQuery)
  let offers = offersSnap.docs.map(doc => doc.data() as any)

  if (offers.length > 0) {
    const inquiryIds = [...new Set(offers.map(o => o.inquiry_id))]
    const inquiryBuyerMap = new Map<string, { buyer_id: string, buyer_name: string }>()

    for (const chunk of chunkArray(inquiryIds, 10)) {
      const q = query(collection(db, "inquiries"), where("id", "in", chunk))
      const snap = await getDocs(q)
      snap.docs.forEach(d => {
        const data = d.data() as any
        inquiryBuyerMap.set(data.id, { buyer_id: data.buyer_id, buyer_name: data.buyer_name || "Unknown" })
      })
    }

    offers = offers.map(o => {
      const bData = inquiryBuyerMap.get(o.inquiry_id)
      return { ...o, buyer_id: bData?.buyer_id, buyer_name: bData?.buyer_name }
    })
  }

  // Group by buyer
  const buyerMap = new Map<string, { name: string; spent: number; orders: Set<string>; lastDate: string }>()

  offers.forEach((offer: any) => {
    if (!offer.buyer_id) return
    const buyerId = offer.buyer_id
    const buyerName = offer.buyer_name

    if (!buyerMap.has(buyerId)) {
      buyerMap.set(buyerId, { name: buyerName, spent: 0, orders: new Set(), lastDate: offer.created_at })
    }

    const buyer = buyerMap.get(buyerId)!
    buyer.spent += offer.price_per_ton || 0
    buyer.orders.add(offer.inquiry_id)
    if (offer.created_at > buyer.lastDate) {
      buyer.lastDate = offer.created_at
    }
  })

  return Array.from(buyerMap.entries())
    .map(([buyerId, data]) => ({
      buyerId,
      buyerName: data.name,
      totalSpent: data.spent,
      totalOrders: data.orders.size,
      lastOrderDate: data.lastDate,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
}

// Get seller analytics (for buyer view)
export async function getSellerAnalytics(period: TimePeriod, buyerId?: string): Promise<SellerAnalytics[]> {
  const [startDate, endDate] = getDateRange(period)

  let offersQuery = query(
    collection(db, "offers"),
    where("created_at", ">=", startDate.toISOString()),
    where("created_at", "<=", endDate.toISOString())
  )

  const offersSnap = await getDocs(offersQuery)
  let offers = offersSnap.docs.map(doc => doc.data() as any)

  if (buyerId && offers.length > 0) {
    const inquiryIds = [...new Set(offers.map(o => o.inquiry_id))]
    const buyerInquiries = new Set()

    for (const chunk of chunkArray(inquiryIds, 10)) {
      const q = query(collection(db, "inquiries"), where("id", "in", chunk), where("buyer_id", "==", buyerId))
      const snap = await getDocs(q)
      snap.docs.forEach(d => buyerInquiries.add(d.data().id))
    }

    offers = offers.filter(o => buyerInquiries.has(o.inquiry_id))
  }

  // Group by seller
  const sellerMap = new Map<string, { name: string; revenue: number; orders: Set<string>; totalOffers: number; prices: number[] }>()

  offers.forEach((offer: any) => {
    const sellerId = offer.seller_id
    const sellerName = offer.seller_name

    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, { name: sellerName, revenue: 0, orders: new Set(), totalOffers: 0, prices: [] })
    }

    const seller = sellerMap.get(sellerId)!
    seller.totalOffers++
    seller.prices.push(offer.price_per_ton || 0)

    if (offer.status === "accepted") {
      seller.revenue += offer.price_per_ton || 0
      seller.orders.add(offer.inquiry_id)
    }
  })

  return Array.from(sellerMap.entries())
    .map(([sellerId, data]) => ({
      sellerId,
      sellerName: data.name,
      totalRevenue: data.revenue,
      totalOrders: data.orders.size,
      averagePrice: data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0,
      winRate: data.totalOffers > 0 ? (data.orders.size / data.totalOffers) * 100 : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
}

// Get real-time stats (last 5 minutes activity)
export async function getRealtimeStats() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const queries = [
    getCountFromServer(query(collection(db, "inquiries"), where("created_at", ">=", fiveMinutesAgo))),
    getCountFromServer(query(collection(db, "offers"), where("created_at", ">=", fiveMinutesAgo))),
    getCountFromServer(query(collection(db, "offers"), where("status", "==", "accepted"), where("created_at", ">=", fiveMinutesAgo))),
  ]

  const [inquiriesSnap, offersSnap, acceptedSnap] = await Promise.all(queries)

  return {
    newInquiries: inquiriesSnap.data().count,
    newOffers: offersSnap.data().count,
    newAccepted: acceptedSnap.data().count,
    timestamp: new Date().toISOString(),
  }
}
