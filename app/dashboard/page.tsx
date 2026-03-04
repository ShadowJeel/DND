"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { Clock, FileText, ShoppingCart, Tag, TrendingUp } from "lucide-react"
import useSWR from "swr"
import { getInquiriesByBuyerId, getOffersBySellerId, getOpenInquiries } from "@/lib/store"

export default function DashboardOverview() {
  const { user } = useAuth()
  const isBuyer = user?.role === "buyer" || user?.role === "both"
  const isSeller = user?.role === "seller" || user?.role === "both"

  const { data: buyerInquiries } = useSWR(
    isBuyer && user ? `inquiries-${user.id}` : null,
    () => getInquiriesByBuyerId(user!.id)
  )
  const { data: sellerOffers } = useSWR(
    isSeller && user ? `offers-${user.id}` : null,
    () => getOffersBySellerId(user!.id)
  )
  const { data: openInquiries } = useSWR(
    isSeller ? `open-inquiries` : null,
    () => getOpenInquiries()
  )

  const inquiryCount = Array.isArray(buyerInquiries) ? buyerInquiries.length : 0
  const offerCount = Array.isArray(sellerOffers) ? sellerOffers.length : 0
  const openInquiryCount = Array.isArray(openInquiries) ? openInquiries.length : 0
  const activeBidsCount = Array.isArray(sellerOffers) ? sellerOffers.filter((o: any) => o.status === "pending").length : 0

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Welcome back, {user?.name}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {"Here's an overview of your activity on DND Purchase."}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isBuyer && (
          <>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">My Inquiries</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{inquiryCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">Total inquiries created</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Inquiries</CardTitle>
                <ShoppingCart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Array.isArray(buyerInquiries) ? buyerInquiries.filter((i: { status: string }) => i.status !== "closed").length : 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Awaiting offers</p>
              </CardContent>
            </Card>
          </>
        )}
        {isSeller && (
          <>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Opportunities</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{openInquiryCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">Open inquiries available</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Bids</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{activeBidsCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">Bids pending review</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Offers Submitted</CardTitle>
                <Tag className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{offerCount}</div>
                <p className="mt-1 text-xs text-muted-foreground">Total offers made</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Acceptance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {offerCount > 0
                    ? `${Math.round((sellerOffers.filter((o: { status: string }) => o.status === "accepted").length / offerCount) * 100)}%`
                    : "N/A"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Offers accepted</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
