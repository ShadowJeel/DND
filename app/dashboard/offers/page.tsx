"use client"

import Link from "next/link"
import { BiddingTimer } from "@/components/bidding-timer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { AlertCircle, ArrowUpDown, CheckCircle, Clock, FileText, Gavel, Lock, Mail, Phone, Tag, Trash2, Trophy, RotateCcw, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import useSWR from "swr"
import { getInquiryById, getOffersByInquiryId, getInquiriesByBuyerId, acceptOffer, disqualifyOffer, closeInquiry, revertOfferToPending, activateBidding } from "@/lib/store"
import { formatOptionLabel } from "@/lib/utils"

function rankBadge(rank?: number) {
  if (!rank) return <span className="text-muted-foreground">-</span>
  if (rank === 1) return <Badge className="border-0 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"><Trophy className="mr-1 h-3 w-3" /> #{rank}</Badge>
  if (rank <= 3) return <Badge variant="outline" className="text-primary"># {rank}</Badge>
  return <Badge variant="outline">#{rank}</Badge>
}

function OffersContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const inquiryId = searchParams.get("inquiryId")
  const [sortAsc, setSortAsc] = useState(true)

  const { data: inquiry, mutate: mutateInquiry } = useSWR(
    inquiryId ? `inquiry-${inquiryId}` : null,
    () => getInquiryById(inquiryId!)
  )
  const { data: offers, mutate } = useSWR(
    inquiryId ? `offers-${inquiryId}` : null,
    () => getOffersByInquiryId(inquiryId!),
    { refreshInterval: 3000 }
  )

  // If no inquiryId, show all buyer inquiries with offers
  const { data: buyerInquiries } = useSWR(
    !inquiryId && user ? `buyer-inquiries-${user.id}` : null,
    () => getInquiriesByBuyerId(user!.id)
  )


  const handleDisqualifyOffer = async (offerId: string) => {
    // 1. Direct mutation
    await disqualifyOffer(offerId)

    // 2. Ping backend for seller rejection notification
    await fetch("/api/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disqualify", offerId }),
    })

    mutate()
    toast.success("Offer disqualified")
  }

  const handleAcceptOffer = async (offerId: string) => {
    // 1. Direct mutation
    await acceptOffer(offerId)
    // Close the inquiry natively
    if (inquiryId) await closeInquiry(inquiryId)

    // 2. Ping backend for Whatsapp notifications to buyer & seller
    await fetch("/api/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", offerId }),
    })

    mutate()
    if (mutateInquiry) mutateInquiry()
    toast.success("Offer accepted! Seller notified via Email and SMS.")
  }

  const handleRebid = async (offerId?: string) => {
    try {
      if (offerId) {
        await revertOfferToPending(offerId)
      }
      if (inquiryId) await activateBidding(inquiryId, 3)

      mutate()
      if (mutateInquiry) mutateInquiry()
      toast.success(offerId ? "Bidding resumed for 3 days. The accepted offer has been moved back to pending." : "Bidding resumed for 3 days.")
    } catch (error) {
      toast.error("Failed to resume bidding")
    }
  }

  if (!inquiryId) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold text-foreground">All Offers</h2>
          <p className="mt-1 text-muted-foreground">Select an inquiry to view its offers.</p>
        </div>
        {Array.isArray(buyerInquiries) && buyerInquiries.length > 0 ? (
          <div className="flex flex-col gap-3">
            {buyerInquiries.map((inq: { id: string; status: string; items: { product: string }[] }) => (
              <a key={inq.id} href={`/dashboard/offers?inquiryId=${inq.id}`}>
                <Card className="border-border transition-all hover:border-primary/20 cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-semibold text-foreground">{inq.id}</span>
                        <span className="ml-3 text-sm text-muted-foreground">
                          {inq.items.map((i: { product: string; sub_product?: string }) => i.sub_product ? `${i.product} (${i.sub_product})` : i.product).join(", ")}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline">{inq.status}</Badge>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-muted-foreground">No inquiries found.</p>
        )}
      </div>
    )
  }

  const sortedOffers = Array.isArray(offers)
    ? [...offers].sort((a, b) => sortAsc ? a.pricePerTon - b.pricePerTon : b.pricePerTon - a.pricePerTon)
    : []

  const hasAcceptedOffer = sortedOffers.some((o: any) => o.status === "accepted")
  const displayStatus = hasAcceptedOffer ? "closed" : inquiry?.status

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <Link href="/dashboard/inquiries" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Inquiries
        </Link>
      </div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground flex items-center gap-3">
            Offers for {inquiryId}
            {displayStatus === "bidding" && inquiry?.biddingDeadline && (
              <BiddingTimer deadline={inquiry.biddingDeadline} status={inquiry.status as "open" | "bidding" | "closed"} />
            )}
            {displayStatus === "closed" && (
              <Badge variant="outline" className="border-destructive bg-destructive/10 text-destructive gap-1.5 text-sm font-medium">
                <Clock className="h-3.5 w-3.5" />
                Bidding Ended
              </Badge>
            )}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {displayStatus === "bidding" && (
              <span className="inline-flex items-center gap-1 text-[hsl(var(--warning))]">
                <Gavel className="h-4 w-4" /> Bidding is active
              </span>
            )}
            {displayStatus === "closed" && (
              <span className="inline-flex items-center gap-1 text-[hsl(var(--destructive))]">
                <Gavel className="h-4 w-4" /> Bidding is closed
              </span>
            )}
            {displayStatus === "open" && "Review and compare seller offers below."}
          </p>
        </div>
        <div className="flex gap-2">

          <Button variant="outline" onClick={() => setSortAsc(!sortAsc)} className="gap-2">
            <ArrowUpDown className="h-4 w-4" /> {sortAsc ? "Low to High" : "High to Low"}
          </Button>
        </div>
      </div>

      {/* Inquiry items tabs with offers */}
      {inquiry && (
        <Tabs defaultValue={inquiry.items?.[0]?.id} className="w-full">
          <TabsList className="mb-6 flex w-full flex-wrap justify-start h-auto gap-2 bg-transparent p-0">
            {inquiry.items?.map((item: { id: string; product: string; sub_product?: string }) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-input bg-background px-4 py-2"
              >
                {item.product} {item.sub_product && <span className="text-[10px] opacity-70 block font-normal text-xs">({item.sub_product})</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          {inquiry.items?.map((item: { id: string; product: string }) => {
            const itemOffers = sortedOffers.filter((o: any) => o.inquiryItemId === item.id)

            return (
              <TabsContent key={item.id} value={item.id} className="mt-0">
                {itemOffers.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="flex flex-col items-center gap-3 py-16">
                      <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No offers received yet for this item.</p>
                      {displayStatus === "closed" && (inquiry.rebidCount || 0) < 1 && (
                        <div className="mt-4">
                          <Button size="sm" variant="outline" className="h-9 gap-1.5 text-sm text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20" onClick={() => handleRebid()}>
                            <RotateCcw className="h-4 w-4" /> Re-bid & Resume Bidding
                          </Button>
                        </div>
                      )}
                      {displayStatus === "closed" && (inquiry.rebidCount || 0) >= 1 && (
                        <div className="mt-4">
                          <span className="text-sm text-muted-foreground italic flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> No more re-bid chances left
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border">
                    <CardContent className="p-0">
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border">
                              <TableHead className="whitespace-nowrap text-muted-foreground">Seller</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Price/Ton</TableHead>
                              <TableHead className="text-muted-foreground">Total Est.</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Rank</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Specs</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Comments</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Document</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Contact Info</TableHead>
                              <TableHead className="whitespace-nowrap text-muted-foreground">Status</TableHead>
                              <TableHead className="whitespace-nowrap text-right text-muted-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itemOffers.map((offer: any) => (
                              <TableRow key={offer.id} className="border-border hover:bg-muted/30">
                                <TableCell className="whitespace-nowrap font-medium text-foreground">
                                  {offer.anonymizedSeller || "Unknown Seller"}
                                </TableCell>
                                <TableCell className="whitespace-nowrap font-semibold text-foreground">
                                  {"₹"}{offer.pricePerTon.toLocaleString("en-IN")}
                                </TableCell>
                                <TableCell className="whitespace-nowrap font-bold text-primary">
                                  {(() => {
                                    const requestedQuantityRaw = (item as any)?.options?.["Quantity"] || (item as any)?.options?.["Qty"] || (item as any)?.options?.["quantity"];
                                    const requestedQuantity = parseFloat(String(requestedQuantityRaw).replace(/[^\d.]/g, '')) || 1;
                                    return "₹" + (offer.pricePerTon * requestedQuantity).toLocaleString("en-IN");
                                  })()}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{rankBadge(offer.rank)}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                  {offer.sellerOptions && Object.keys(offer.sellerOptions).length > 0 ? (
                                    <div className="flex flex-col gap-1 text-xs whitespace-normal">
                                      {Object.entries(offer.sellerOptions).map(([k, v]) => {
                                        const valStr = Array.isArray(v) ? v.join(", ") : v;
                                        if (!valStr) return null;
                                        return <span key={k}><strong className="font-medium text-foreground">{formatOptionLabel(k)}:</strong> {String(valStr)}</span>
                                      })}
                                    </div>
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate text-muted-foreground whitespace-normal">{offer.comments || "-"}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {offer.pdfUrl ? (
                                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary" onClick={() => window.open(offer.pdfUrl, '_blank')}>
                                      <FileText className="h-3.5 w-3.5" /> View PDF
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {offer.status === "accepted" ? (
                                    <div className="flex flex-col text-xs">
                                      {offer.contactEmail && (
                                        <div className="flex items-center gap-1.5 text-foreground">
                                          <Mail className="h-3 w-3 text-muted-foreground" /> {offer.contactEmail}
                                        </div>
                                      )}
                                      {offer.contactPhone && (
                                        <div className="flex items-center gap-1.5 text-foreground mt-1">
                                          <Phone className="h-3 w-3 text-muted-foreground" /> {offer.contactPhone}
                                        </div>
                                      )}
                                      {!offer.contactEmail && !offer.contactPhone && <span className="text-muted-foreground">-</span>}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                                      <Lock className="h-3 w-3" />
                                      Accept to view
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <Badge variant={offer.status === "accepted" ? "default" : offer.status === "disqualified" ? "destructive" : "outline"}>
                                    {offer.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right">
                                  {offer.status === "pending" && (
                                    <div className="flex justify-end gap-1">
                                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs bg-transparent" onClick={() => handleAcceptOffer(offer.id)}>
                                        <CheckCircle className="h-3.5 w-3.5" /> Accept
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-destructive hover:text-destructive bg-transparent" onClick={() => handleDisqualifyOffer(offer.id)}>
                                        <Trash2 className="h-3.5 w-3.5" /> Disqualify
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile View */}
                      <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                        {itemOffers.map((offer: any) => (
                          <div key={offer.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 shadow-sm bg-card relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                                {offer.anonymizedSeller || "Unknown Seller"}
                              </span>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-lg text-primary">₹{offer.pricePerTon.toLocaleString("en-IN")}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Per Ton</span>
                                </div>
                                <div className="flex flex-col items-end pt-1 border-t border-border/50">
                                  {(() => {
                                    const requestedQuantityRaw = (item as any)?.options?.["Quantity"] || (item as any)?.options?.["Qty"] || (item as any)?.options?.["quantity"];
                                    const requestedQuantity = parseFloat(String(requestedQuantityRaw).replace(/[^\d.]/g, '')) || 1;
                                    const total = offer.pricePerTon * requestedQuantity;
                                    return (
                                      <>
                                        <span className="font-bold text-sm text-foreground">₹{total.toLocaleString("en-IN")}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Est.</span>
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {rankBadge(offer.rank)}
                              <Badge variant={offer.status === "accepted" ? "default" : offer.status === "disqualified" ? "destructive" : "outline"} className="text-xs">
                                {offer.status}
                              </Badge>
                              {offer.pdfUrl && (
                                <Button variant="outline" size="sm" className="h-6 px-2 gap-1 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20" onClick={() => window.open(offer.pdfUrl, '_blank')}>
                                  <FileText className="h-3 w-3" /> View Doc
                                </Button>
                              )}
                            </div>

                            {offer.sellerOptions && Object.keys(offer.sellerOptions).length > 0 && (
                              <div className="bg-muted/20 p-2.5 rounded-md mt-1 border border-border/30">
                                <div className="text-xs font-semibold text-foreground/80 mb-1 uppercase tracking-wider">Specs</div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                  {Object.entries(offer.sellerOptions).map(([k, v]) => {
                                    const valStr = Array.isArray(v) ? v.join(", ") : v;
                                    if (!valStr) return null;
                                    return <span key={k}><strong className="font-medium text-foreground">{formatOptionLabel(k)}:</strong> {String(valStr)}</span>
                                  })}
                                </div>
                              </div>
                            )}

                            {offer.comments && (
                              <div className="bg-muted/40 p-2.5 rounded-md mt-1 border border-border/50">
                                <p className="text-sm text-foreground/80 leading-snug">{offer.comments}</p>
                              </div>
                            )}

                            {/* Contact Info */}
                            {offer.status === "accepted" ? (
                              <div className="flex flex-col gap-1.5 text-sm bg-primary/5 border border-primary/10 p-3 rounded-md mt-1">
                                {offer.contactEmail && (
                                  <div className="flex items-center gap-2 text-foreground">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                      <Mail className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">{offer.contactEmail}</span>
                                  </div>
                                )}
                                {offer.contactPhone && (
                                  <div className="flex items-center gap-2 text-foreground">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                      <Phone className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">{offer.contactPhone}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-md mt-1 border border-border/50">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                                Accept to view contact info
                              </div>
                            )}

                            {/* Actions */}
                            {offer.status === "pending" && (
                              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 mt-2">
                                <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 bg-transparent w-full" onClick={() => handleDisqualifyOffer(offer.id)}>
                                  <Trash2 className="h-4 w-4" /> Disqualify
                                </Button>
                                <Button size="sm" className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 w-full shadow-sm" onClick={() => handleAcceptOffer(offer.id)}>
                                  <CheckCircle className="h-4 w-4" /> Accept Offer
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const acceptedOffer = itemOffers.find((o: any) => o.status === "accepted");
                        if (displayStatus === "closed" && (inquiry.rebidCount || 0) < 1) {
                          return (
                            <div className="p-4 border-t border-border flex justify-end bg-muted/20">
                              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-sm text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border-primary/20" onClick={() => handleRebid(acceptedOffer?.id)}>
                                <RotateCcw className="h-4 w-4" /> Re-bid & Resume Bidding
                              </Button>
                            </div>
                          );
                        }
                        if (displayStatus === "closed" && (inquiry.rebidCount || 0) >= 1) {
                          return (
                            <div className="p-4 border-t border-border flex justify-end bg-muted/20">
                              <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" /> No more re-bid chances available for this inquiry.
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )
      }
    </div >
  )
}

export default function OffersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading...</div>}>
      <OffersContent />
    </Suspense>
  )
}
