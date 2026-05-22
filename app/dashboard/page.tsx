"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  Package,
  ShoppingCart,
  Tag,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Eye,
  Send,
  Trophy,
  Activity,
} from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { getInquiriesByBuyerId, getOffersBySellerId, getOpenInquiries } from "@/lib/store"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export default function DashboardOverview() {
  const { user, allUsers } = useAuth()
  const isBuyer = user?.role === "buyer" || user?.role === "both"
  const isSeller = user?.role === "seller" || user?.role === "both"

  const { data: buyerInquiries } = useSWR(
    isBuyer && user ? `inquiries-${user.id}` : null,
    () => getInquiriesByBuyerId(user!.id),
    { refreshInterval: 10000 }
  )
  const { data: sellerOffers } = useSWR(
    isSeller && user ? `offers-${user.id}` : null,
    () => getOffersBySellerId(user!.id),
    { refreshInterval: 10000 }
  )
  const { data: openInquiries } = useSWR(
    isSeller ? `open-inquiries` : null,
    () => getOpenInquiries(),
    { refreshInterval: 10000 }
  )

  // ── Buyer Stats ──
  const buyerStats = useMemo(() => {
    if (!Array.isArray(buyerInquiries)) return null
    const total = buyerInquiries.length
    const active = buyerInquiries.filter((i: any) => i.status === "active" || i.status === "open").length
    const bidding = buyerInquiries.filter((i: any) => i.status === "bidding").length
    const closed = buyerInquiries.filter((i: any) => i.status === "closed").length
    const deleted = buyerInquiries.filter((i: any) => i.status === "deleted").length
    const totalOffers = buyerInquiries.reduce((sum: number, i: any) => sum + (i.offersCount || 0), 0)

    // Recent inquiries (last 5)
    const recent = buyerInquiries.slice(0, 5)

    return { total, active, bidding, closed, deleted, totalOffers, recent }
  }, [buyerInquiries])

  // ── Seller Stats ──
  const sellerStats = useMemo(() => {
    if (!Array.isArray(sellerOffers)) return null
    const total = sellerOffers.length
    const pending = sellerOffers.filter((o: any) => o.status === "pending").length
    const accepted = sellerOffers.filter((o: any) => o.status === "accepted").length
    const rejected = sellerOffers.filter((o: any) => o.status === "rejected" || o.status === "disqualified").length
    const activeInquiryOffers = sellerOffers.filter((o: any) => o.inquiryStatus === "active").length
    const biddingOffers = sellerOffers.filter((o: any) => o.inquiryStatus === "bidding" || o.inquiryStatus === "closed").length
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0
    const rank1Count = sellerOffers.filter((o: any) => o.rank === 1).length

    // Recent offers (last 5)
    const recent = sellerOffers.slice(0, 5)

    return { total, pending, accepted, rejected, activeInquiryOffers, biddingOffers, rate, rank1Count, recent }
  }, [sellerOffers])

  // ── Filtered Open Opportunities (same logic as New Inquiries page) ──
  const openInquiryCount = useMemo(() => {
    if (!Array.isArray(openInquiries) || !user) return 0

    const currentUserBuyerId = allUsers?.find(u => u.role === "buyer" && u.email === user.email)?.id

    return openInquiries.filter((inq: any) => {
      // Exclude own inquiries
      if (currentUserBuyerId && inq.buyerId === currentUserBuyerId) return false

      // Product category match & filter already quoted
      const sellerCategories = user.categories || []
      const matchingItems = (inq.items || []).filter((item: any) => {
        if (!sellerCategories.includes(item.product)) return false
        if (Array.isArray(sellerOffers) && sellerOffers.some((o: any) => o.inquiryItemId === item.id)) return false
        return true
      })
      if (matchingItems.length === 0) return false

      // Location match
      if (inq.state || inq.district) {
        const sellerLocs = user.availableLocations || {}
        if (!inq.state || !sellerLocs[inq.state]) return false
        if (inq.district) {
          const sellerDistrictsForState = sellerLocs[inq.state]
          if (sellerDistrictsForState.length > 0 && !sellerDistrictsForState.includes(inq.district)) return false
        }
      }

      // Product options match
      const sellerOptionsData = user.sellerProductOptions || {}
      const hasValidOptionMatch = matchingItems.some((item: any) => {
        let sellerVariants = sellerOptionsData[item.product] || []
        if (!Array.isArray(sellerVariants)) {
          if (typeof sellerVariants === 'object' && Object.keys(sellerVariants).length > 0) {
            sellerVariants = [sellerVariants]
          } else {
            sellerVariants = []
          }
        }
        if (sellerVariants.length === 0) return true
        return sellerVariants.some((variant: any) => {
          for (const [optName, sellerVal] of Object.entries(variant)) {
            const sellerValsArr = Array.isArray(sellerVal) ? sellerVal : [sellerVal].filter(Boolean)
            if (sellerValsArr.length > 0) {
              let buyerVal = (item.options || {})[optName]
              if ((optName === "Sub-Products" || optName === "Sub-Product") && !buyerVal) buyerVal = item.sub_product
              if (buyerVal !== undefined && buyerVal !== null && String(buyerVal).trim() !== "") {
                const buyerValsArr = Array.isArray(buyerVal) ? buyerVal : [buyerVal].filter(Boolean)
                if (!buyerValsArr.some((bv: any) => sellerValsArr.includes(bv))) return false
              }
            }
          }
          return true
        })
      })
      if (!hasValidOptionMatch) return false

      return true
    }).length
  }, [openInquiries, user, allUsers, sellerOffers])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good Morning"
    if (h < 17) return "Good Afternoon"
    return "Good Evening"
  })()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-secondary/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-muted-foreground">{greeting},</p>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            {user?.name}
            {user?.verified && <BadgeCheck className="h-5 w-5 text-blue-500" />}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            {isBuyer && isSeller
              ? "Manage your inquiries and offers from one place."
              : isBuyer
              ? "Track your inquiries, review seller offers, and manage your procurement."
              : "Browse open inquiries, manage your quotes, and grow your business."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Activity className="h-3 w-3" />
              {user?.role?.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground">
              ID: {user?.userCode}
            </Badge>
          </div>
        </div>
      </div>

      {/* ══════════════ BUYER DASHBOARD ══════════════ */}
      {isBuyer && buyerStats && (
        <>
          {/* Quick Stats Row */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="My Inquiries"
              value={buyerStats.active}
              subtitle="Awaiting offers"
              icon={<Clock className="h-4 w-4" />}
              color="warning"
              href="/dashboard/inquiries?tab=current"
            />
            <StatCard
              title="In Bidding"
              value={buyerStats.bidding}
              subtitle="Competitive bidding"
              icon={<Gavel className="h-4 w-4" />}
              color="secondary"
              href="/dashboard/inquiries?tab=bidding"
            />
            <StatCard
              title="Closed"
              value={buyerStats.closed}
              subtitle="Completed"
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="success"
              href="/dashboard/inquiries?tab=closed"
            />
            <StatCard
              title="Total Inquiries"
              value={buyerStats.total}
              subtitle="All time"
              icon={<FileText className="h-4 w-4" />}
              color="primary"
              href="/dashboard/inquiries"
            />
          </div>


        </>
      )}

      {/* ══════════════ SELLER DASHBOARD ══════════════ */}
      {isSeller && sellerStats && (
        <>
          {/* Quick Stats Row */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="New Inquiry"
              value={openInquiryCount}
              subtitle="Available inquiries"
              icon={<Eye className="h-4 w-4" />}
              color="primary"
              href="/dashboard/seller/pending"
            />
            <StatCard
              title="My Offers"
              value={sellerStats.activeInquiryOffers}
              subtitle="Submitted quotes"
              icon={<Send className="h-4 w-4" />}
              color="warning"
              href="/dashboard/seller/submitted-offers"
            />
            <StatCard
              title="Active Bidding"
              value={sellerStats.biddingOffers}
              subtitle="In competitive phase"
              icon={<Gavel className="h-4 w-4" />}
              color="secondary"
              href="/dashboard/seller/my-offers?tab=current"
            />
            <StatCard
              title="Accepted"
              value={sellerStats.accepted}
              subtitle="Offers accepted"
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="success"
              href="/dashboard/seller/my-offers?tab=history"
            />
          </div>


        </>
      )}

      {/* Loading state */}
      {!buyerStats && !sellerStats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-border animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({ title, value, subtitle, icon, color, href }: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  color: "primary" | "warning" | "secondary" | "success";
  href?: string;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-500",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  }

  const cardContent = (
    <Card className={cn(
      "border-border relative overflow-hidden group transition-all duration-200",
      href ? "hover:border-primary/40 hover:scale-[1.02] cursor-pointer hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]" : "hover:border-primary/20"
    )}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={`rounded-lg p-1.5 ${colorMap[color]}`}>{icon}</div>
        </div>
        <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}



function InquiryStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active": case "open": return <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-600 dark:text-amber-400">Active</Badge>
    case "bidding": return <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">Bidding</Badge>
    case "closed": return <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Closed</Badge>
    case "deleted": return <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive">Deleted</Badge>
    default: return <Badge variant="outline" className="text-[10px] h-5">{status}</Badge>
  }
}

function OfferStatusBadge({ status, inquiryStatus }: { status: string; inquiryStatus?: string }) {
  if (status === "accepted") return <Badge className="text-[10px] h-5 border-0 bg-emerald-500 text-white">Accepted</Badge>
  if (status === "rejected" || status === "disqualified") return <Badge variant="destructive" className="text-[10px] h-5">Rejected</Badge>
  if (inquiryStatus === "deleted") return <Badge variant="outline" className="text-[10px] h-5 border-muted-foreground/30 text-muted-foreground">Deleted</Badge>
  if (inquiryStatus === "active") return <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-600 dark:text-amber-400">Submitted</Badge>
  if (inquiryStatus === "bidding") return <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary">Bidding</Badge>
  return <Badge variant="outline" className="text-[10px] h-5">{status}</Badge>
}
