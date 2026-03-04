"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ArrowRight, Plus, Clock } from "lucide-react"
import useSWR from "swr"
import { getInquiriesByBuyerId } from "@/lib/store"

function statusColor(status: string) {
  switch (status) {
    case "open": return "bg-primary/10 text-primary border-primary/20"
    case "bidding": return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20"
    case "closed": return "bg-muted text-muted-foreground border-border"
    default: return ""
  }
}

export default function InquiriesPage() {
  const { user } = useAuth()
  const { data: inquiries, isLoading } = useSWR(
    user ? `buyer-inquiries-${user.id}` : null,
    () => getInquiriesByBuyerId(user!.id),
    { refreshInterval: 5000 }
  )

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">My Inquiries</h2>
          <p className="mt-1 text-muted-foreground">Track and manage all your procurement inquiries.</p>
        </div>
        <Link href="/dashboard/inquiry/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Inquiry
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading inquiries...</div>
      ) : !Array.isArray(inquiries) || inquiries.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No inquiries yet. Create your first inquiry to get started.</p>
            <Link href="/dashboard/inquiry/new">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Create Inquiry</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {inquiries.map((inq: { id: string; status: string; items: { product: string }[]; createdAt: string }) => (
            <Card key={inq.id} className="border-border transition-all hover:border-primary/20">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">{inq.id}</CardTitle>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(inq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                <Badge className={`border ${statusColor(inq.status)}`}>{inq.status.toUpperCase()}</Badge>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  {inq.items.map((item: { product: string }, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                      {item.product}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{inq.items.length} item(s)</span>
                  <Link href={`/dashboard/offers?inquiryId=${inq.id}`}>
                    <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                      View Offers <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
