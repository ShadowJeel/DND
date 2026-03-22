"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, ArrowRight, Plus, Clock, RotateCcw, MapPin, Package } from "lucide-react"
import useSWR from "swr"
import { getInquiriesByBuyerId, getOffersByInquiryId, softDeleteOffer, activateBidding, closeInquiry, softDeleteInquiry } from "@/lib/store"
import { toast } from "sonner"
import { formatOptionLabel } from "@/lib/utils"

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
  const { data: inquiries, isLoading, mutate } = useSWR(
    user ? `buyer-inquiries-${user.id}` : null,
    () => getInquiriesByBuyerId(user!.id),
    { refreshInterval: 5000 }
  )

  const [rebidDialogState, setRebidDialogState] = useState<{ isOpen: boolean, inquiryId: string | null, days: string }>({
    isOpen: false,
    inquiryId: null,
    days: "3"
  })

  const openRebidDialog = (inqId: string) => {
    setRebidDialogState({ isOpen: true, inquiryId: inqId, days: "3" })
  }

  const handleConfirmRebid = async () => {
    if (!rebidDialogState.inquiryId) return
    const days = parseInt(rebidDialogState.days)
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter a valid number of days.")
      return
    }

    try {
      const offers = await getOffersByInquiryId(rebidDialogState.inquiryId)
      const acceptedOffer = offers.find((o: any) => o.status === "accepted")
      if (acceptedOffer) {
        await softDeleteOffer(acceptedOffer.id)
      }
      await activateBidding(rebidDialogState.inquiryId, days)
      mutate()
      toast.success(`Bidding resumed for ${days} days.`)
      setRebidDialogState({ isOpen: false, inquiryId: null, days: "3" })
    } catch (error) {
      toast.error("Failed to resume bidding")
    }
  }

  const handleClose = async (inqId: string) => {
    try {
      await closeInquiry(inqId)
      mutate()
      toast.success("Inquiry closed successfully.")
    } catch (error) {
      toast.error("Failed to close inquiry")
    }
  }

  const handleDelete = async (inqId: string) => {
    if (!confirm("Are you sure you want to delete this closed inquiry? This action cannot be undone.")) return
    try {
      await softDeleteInquiry(inqId, user!.id)
      mutate()
      toast.success("Inquiry deleted successfully.")
    } catch (error) {
      toast.error("Failed to delete inquiry.")
    }
  }

  const activeInquiries = Array.isArray(inquiries) ? inquiries.filter(inq => inq.status !== "closed") : []
  const closedInquiries = Array.isArray(inquiries) ? inquiries.filter(inq => inq.status === "closed") : []

  const renderInquiryCard = (inq: any, isClosedTab: boolean) => (
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
        <div className="mb-4 flex flex-col gap-3">
          {inq.items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-sm border border-border/50">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Package className="h-4 w-4 text-primary" />
                {item.product} {item.sub_product && <span className="text-muted-foreground font-normal">({item.sub_product})</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground">
                {Object.entries(item.options || {}).map(([k, v]) => {
                  const valStr = Array.isArray(v) ? v.join(", ") : String(v);
                  if (!valStr || valStr === 'undefined') return null;
                  return <span key={k} className="text-xs bg-background shadow-sm border border-border/50 px-2 py-1 rounded-md text-foreground/80"><span className="font-medium text-foreground">{formatOptionLabel(k)}:</span> {valStr}</span>
                })}
                {item.paymentTerms && (
                  <span className="text-xs bg-background shadow-sm border border-border/50 px-2 py-1 rounded-md text-foreground/80"><span className="font-medium text-foreground">Payment:</span> {item.paymentTerms} Days</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {(inq.state || inq.district) && (
          <div className="mb-4 flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/10">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Delivery Location:</span>
              {[inq.district, inq.state].filter(Boolean).join(", ")}
              {inq.pinCode ? ` - ${inq.pinCode}` : ""}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{inq.items.length} item(s)</span>
          <div className="flex flex-wrap items-center gap-2">
            {!isClosedTab && (
              <Button size="sm" variant="destructive" className="gap-1.5 opacity-90 hover:opacity-100" onClick={() => handleClose(inq.id)}>
                Stop Bidding
              </Button>
            )}
            {isClosedTab && (!inq.rebidCount || inq.rebidCount < 1) && (
              <div className="flex flex-col items-center gap-0.5">
                <Button size="sm" variant="outline" className="gap-1.5 text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20" onClick={() => openRebidDialog(inq.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Re-bid
                </Button>
                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">(Chances: 1/1 remaining)</span>
              </div>
            )}
            {isClosedTab && inq.rebidCount >= 1 && (
              <div className="flex flex-col items-center gap-0.5">
                <Button size="sm" variant="outline" disabled className="gap-1.5" title="Re-bid limit reached">
                  <RotateCcw className="h-3.5 w-3.5" /> Re-bid Limit Reached
                </Button>
                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5">(Chances: 0/1 remaining)</span>
              </div>
            )}
            {isClosedTab && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inq.id)}>
                Delete
              </Button>
            )}
            <Link href={`/dashboard/offers?inquiryId=${inq.id}`}>
              <Button size="sm" variant={isClosedTab ? "ghost" : "outline"} className="gap-1 bg-transparent border-input">
                View Offers <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-0">
      <div className="mb-4 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6 grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="active">Active Bids ({activeInquiries.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed Bids ({closedInquiries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0 space-y-4">
            {activeInquiries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border rounded-xl bg-card">No active inquiries.</div>
            ) : (
              activeInquiries.map((inq: any) => renderInquiryCard(inq, false))
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-0 space-y-4">
            {closedInquiries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border rounded-xl bg-card">No closed inquiries.</div>
            ) : (
              closedInquiries.map((inq: any) => renderInquiryCard(inq, true))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Re-bid Config Dialog */}
      <Dialog open={rebidDialogState.isOpen} onOpenChange={(open) => setRebidDialogState(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Bidding</DialogTitle>
            <DialogDescription>
              Specify how many days you would like to keep the bidding open for this inquiry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rebid-days">Bidding Duration (Days)</Label>
            <Input
              id="rebid-days"
              type="number"
              min="1"
              value={rebidDialogState.days}
              onChange={(e) => setRebidDialogState(prev => ({ ...prev, days: e.target.value }))}
              placeholder="e.g., 3"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRebidDialogState(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
            <Button onClick={handleConfirmRebid}>Confirm Re-bid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
