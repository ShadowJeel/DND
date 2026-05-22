"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Edit, Mail, Phone, Tag, Trash2, Trophy, Plus, FileText, Clock, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import useSWR from "swr"
import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getOffersBySellerId, updateOffer, deleteOffer } from "@/lib/store"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/lib/firebase"

function rankBadge(rank?: number, inquiryStatus?: string) {
  if (inquiryStatus === "active") return <span className="text-muted-foreground italic text-[10px] leading-tight">Ranking will be shown when Bidding Starts</span>
  if (!rank) return <span className="text-muted-foreground">-</span>
  if (rank === 1) return <Badge className="border-0 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"><Trophy className="mr-1 h-3 w-3" /> #{rank}</Badge>
  if (rank <= 3) return <Badge variant="outline" className="text-primary"># {rank}</Badge>
  return <Badge variant="outline">#{rank}</Badge>
}

function statusBadge(status: string, inquiryStatus?: string) {
  if (status === "accepted") return <Badge className="border-0 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">Quote Accepted</Badge>
  if (status === "rejected") return <Badge variant="destructive">Quote Rejected</Badge>
  if (inquiryStatus === "deleted") return <Badge className="border-0 bg-black text-white hover:bg-black/90">Inquiry Deleted</Badge>

  if (status === "pending" || !status) {
    if (inquiryStatus === "active") return <Badge variant="outline">Active</Badge>
    if (inquiryStatus === "bidding") return <Badge variant="outline">Bidding Started</Badge>
    if (inquiryStatus === "closed") return <Badge variant="outline">Closed</Badge>
  }

  switch (status) {
    case "disqualified": return <Badge variant="destructive">Disqualified</Badge>
    case "pending": return <Badge variant="outline">Pending</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

function SellerMyOffersContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam === "history") return tabParam
    return "current"
  })

  useEffect(() => {
    if (tabParam === "current" || tabParam === "history") {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  const { data: offers, isLoading, mutate } = useSWR(
    user ? `seller-offers-${user.id}` : null,
    () => getOffersBySellerId(user!.id),
    { refreshInterval: 5000 }
  )

  const [editingOffer, setEditingOffer] = useState<any>(null)
  const [pricePerTon, setPricePerTon] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [quoteComments, setQuoteComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [pdfUploadProgress, setPdfUploadProgress] = useState(false)

  const { activeOffers, historyOffers } = useMemo(() => {
    if (!Array.isArray(offers)) return { activeOffers: [], historyOffers: [] }

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

    const active: any[] = []
    const history: any[] = []

    offers.forEach(offer => {
      const isTerminal = ["accepted", "rejected", "disqualified"].includes(offer.status) || offer.inquiryStatus === "deleted" || offer.inquiryStatus === "closed"
      const isOld = new Date(offer.createdAt).getTime() < thirtyDaysAgo

      if (offer.inquiryStatus !== "active") {
        if (offer.archived || (isTerminal && isOld)) {
          history.push(offer)
        } else {
          active.push(offer)
        }
      }
    })

    return { activeOffers: active, historyOffers: history }
  }, [offers])

  const handleArchiveOffer = async (id: string) => {
    if (!confirm("Remove this offer from your main list? It will still be available in the History tab.")) return
    try {
      // Optimistic local update
      if (offers) {
        const updatedOffers = offers.map((o: any) => o.id === id ? { ...o, archived: true } : o)
        mutate(updatedOffers, false)
      }

      await updateOffer(id, { archived: true })
      toast.success("Offer moved to history")
      mutate()
    } catch (e) {
      toast.error("Failed to archive offer")
    }
  }

  const handleUpdateQuote = async () => {
    if (!editingOffer || !pricePerTon) {
      toast.error("Please enter a price per unit")
      return
    }
    setSubmitting(true)
    try {
      if (editingOffer.status === "accepted") {
        throw new Error("Cannot edit an accepted offer")
      }

      let finalAttachments = [...(editingOffer.attachments || [])]

      if (selectedFiles.length > 0) {
        setPdfUploadProgress(true)
        const uploadPromises = selectedFiles.map(async (file) => {
          const fileRef = ref(storage, `quotes/${Date.now()}_${editingOffer.inquiryId}_${editingOffer.inquiryItemId}_${file.name}`)
          await uploadBytes(fileRef, file)
          return getDownloadURL(fileRef)
        })
        const newUrls = await Promise.all(uploadPromises)
        finalAttachments = [...finalAttachments, ...newUrls]
        setPdfUploadProgress(false)
      }

      await updateOffer(editingOffer.id, {
        pricePerTon: Number(pricePerTon),
        comments: quoteComments,
        attachments: finalAttachments,
        pdfUrl: finalAttachments[0] || "", // Fallback
        contactEmail,
        contactPhone,
      })
      toast.success("Quote updated successfully!")
      setEditingOffer(null)
      setSelectedFiles([])
      mutate()
    } catch (e: any) {
      toast.error(e.message || "Failed to update quote")
    } finally {
      setSubmitting(false)
      setPdfUploadProgress(false)
    }
  }

  const renderOfferTable = (offersList: any[], isCurrent: boolean) => (
    <>
      {/* Desktop Table */}
      <Card className="hidden border-border md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Offer ID</TableHead>
                <TableHead className="text-muted-foreground">Inquiry</TableHead>
                <TableHead className="text-muted-foreground">Item</TableHead>
                <TableHead className="text-muted-foreground">Price/unit</TableHead>
                <TableHead className="text-muted-foreground">Total Est.</TableHead>
                <TableHead className="text-muted-foreground">Rank</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Buyer Contact</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offersList.map((offer: any) => (
                <TableRow key={offer.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{offer.id}</TableCell>
                  <TableCell className="text-foreground">{offer.inquiryId}</TableCell>
                  <TableCell className="text-muted-foreground">{offer.inquiryItemId}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {"₹"}{offer.pricePerTon.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {"₹"}{((offer.pricePerTon || 0) * (offer.requestedQuantity || 1)).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{rankBadge(offer.rank, offer.inquiryStatus)}</TableCell>
                  <TableCell>{statusBadge(offer.status, offer.inquiryStatus)}</TableCell>
                  <TableCell>
                    {offer.status === "accepted" ? (
                      <div className="flex flex-col space-y-1 text-xs">
                        {offer.buyerAlias && <div className="font-medium text-foreground">{offer.buyerAlias}</div>}
                        {offer.buyerEmail && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {offer.buyerEmail}
                          </div>
                        )}
                        {offer.buyerPhone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {offer.buyerPhone}
                          </div>
                        )}
                      </div>
                    ) : offer.inquiryStatus === "deleted" ? (
                      <span className="text-[10px] text-muted-foreground italic leading-tight block max-w-[150px]">
                        Inquiry is deleted
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic leading-tight block max-w-[150px]">
                        Buyer contact will be shared after quote is Accepted
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isCurrent && offer.status !== "accepted" && offer.inquiryStatus !== "deleted" && (
                        <button
                          className="btn-action-icon"
                          onClick={() => {
                            setEditingOffer(offer)
                            setSelectedFiles([])
                            setPricePerTon(offer.pricePerTon.toString())
                            setContactEmail(offer.contactEmail || user?.email || "")
                            setContactPhone(offer.contactPhone || user?.phone || "")
                            setQuoteComments(offer.comments || "")
                          }}
                          title="Edit Offer"
                        >
                          <Edit />
                        </button>
                      )}

                      {isCurrent && (["accepted", "rejected", "disqualified"].includes(offer.status) || offer.inquiryStatus === "deleted" || offer.inquiryStatus === "closed") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-muted/50"
                          onClick={() => handleArchiveOffer(offer.id)}
                          title="Move to History"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}

                      {isCurrent && offer.status !== "accepted" && (
                        <button
                          className="btn-action-icon"
                          onClick={() => handleDeleteOffer(offer.id)}
                          title="Delete Offer"
                        >
                          <Trash2 />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="flex flex-col gap-4 md:hidden">
        {offersList.map((offer: any) => (
          <Card key={offer.id} className="border-border">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Offer ID: {offer.id}</div>
                    <div className="text-sm font-semibold text-red-500">Inquiry: {offer.inquiryId}</div>
                    <div className="text-xs text-muted-foreground">Item: {offer.inquiryItemId}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusBadge(offer.status, offer.inquiryStatus)}
                    {rankBadge(offer.rank, offer.inquiryStatus)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-border py-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Price/unit</div>
                    <div className="text-sm font-bold text-foreground">₹{offer.pricePerTon.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2">Total Est.</div>
                    <div className="text-base font-bold text-primary">₹{((offer.pricePerTon || 0) * (offer.requestedQuantity || 1)).toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</div>
                    <div className="text-sm text-foreground">{new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Buyer Contact</div>
                  {offer.status === "accepted" ? (
                    <div className="flex flex-col gap-1.5 ">
                      {offer.buyerAlias && <div className="text-sm font-bold text-foreground">{offer.buyerAlias}</div>}
                      {offer.buyerEmail && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground break-all">
                          <Mail className="h-3 w-3 shrink-0" /> {offer.buyerEmail}
                        </div>
                      )}
                      {offer.buyerPhone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {offer.buyerPhone}
                        </div>
                      )}
                    </div>
                  ) : offer.inquiryStatus === "deleted" ? (
                    <div className="text-[11px] text-muted-foreground italic leading-tight">
                      Inquiry is deleted
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic leading-tight">
                      Buyer contact will be shared after quote is Accepted
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {isCurrent && offer.status !== "accepted" && offer.inquiryStatus !== "deleted" && (
                    <button
                      className="btn-action-icon"
                      onClick={() => {
                        setEditingOffer(offer)
                        setSelectedFiles([])
                        setPricePerTon(offer.pricePerTon.toString())
                        setContactEmail(offer.contactEmail || user?.email || "")
                        setContactPhone(offer.contactPhone || user?.phone || "")
                        setQuoteComments(offer.comments || "")
                      }}
                      title="Edit Offer"
                    >
                      <Edit />
                    </button>
                  )}
                  {isCurrent && (["accepted", "rejected", "disqualified"].includes(offer.status) || offer.inquiryStatus === "deleted") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-grow gap-2 h-10"
                      onClick={() => handleArchiveOffer(offer.id)}
                    >
                      <Archive className="h-4 w-4" /> Move to History
                    </Button>
                  )}
                  {isCurrent && offer.status !== "accepted" && (
                    <button
                      className="btn-action-icon"
                      onClick={() => handleDeleteOffer(offer.id)}
                      title="Delete Offer"
                    >
                      <Trash2 />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this offer?")) return

    try {
      const targetOffer = offers?.find((o: any) => o.id === id)
      if (targetOffer?.status === "accepted") {
        throw new Error("Cannot delete an accepted offer")
      }

      // Cleanup storage if needed
      if (targetOffer?.pdfUrl && targetOffer.pdfUrl !== "/dummy-quote.pdf" && targetOffer.pdfUrl.includes("firebase")) {
        try {
          const fileRef = ref(storage, targetOffer.pdfUrl)
          await deleteObject(fileRef)
        } catch (e) {
          console.error("Failed to delete attached pdf", e)
        }
      }

      await deleteOffer(id)
      toast.success("Offer deleted successfully!")
      mutate() // Refresh the offers list
    } catch (e: any) {
      toast.error(e.message || "Failed to delete offer")
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-foreground">My Bidding</h2>
        <p className="mt-1 text-muted-foreground">
          Track all your submitted quotes and see your competitive ranking.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading offers...</div>
      ) : !Array.isArray(offers) || offers.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Tag className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">{"You haven't submitted any offers yet."}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="current">Active Bidding ({activeOffers.length})</TabsTrigger>
            <TabsTrigger value="history">Closed Bidding ({historyOffers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {activeOffers.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center gap-3 py-16">
                  <Tag className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No active offers.</p>
                </CardContent>
              </Card>
            ) : (
              renderOfferTable(activeOffers, true)
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyOffers.length === 0 ? (
              <Card className="border-border">
                <CardContent className="flex flex-col items-center gap-3 py-16">
                  <Clock className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground">History is empty.</p>
                </CardContent>
              </Card>
            ) : (
              renderOfferTable(historyOffers, false)
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Competitive Intelligence Note */}
      {Array.isArray(offers) && offers.length > 0 && (
        <Card className="mt-6 border-border bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Competitive Intelligence</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your rank indicates your price position in comparison with other sellers. A rank of #1 means you have the lowest (most competitive) price. Ranks update in real-time as new offers are submitted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Offer Dialog */}
      <Dialog open={!!editingOffer} onOpenChange={(open) => {
        if (!open) { setEditingOffer(null); setSelectedFiles([]); }
      }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>
              Update your quotation details for Item: {editingOffer?.inquiryItemId}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pricePerTon">Price per unit (INR) <span className="text-red-500">*</span></Label>
                <Input
                  id="pricePerTon"
                  type="number"
                  min="0.00001"
                  step="any"
                  value={pricePerTon}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('-')) return;
                    setPricePerTon(val);
                  }}
                  placeholder="e.g. 48500"
                />
              </div>
              <div className="space-y-2">
                <Label>Attach Quote Document (Max 5 files, 10MB each) (OPTIONAL)</Label>
                <div className="grid grid-cols-1 gap-3">
                  {/* Existing Attachments */}
                  {((editingOffer?.attachments || []) as string[]).map((url, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/30">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-xs truncate">Document {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline font-medium">View</a>
                        <button
                          type="button"
                          className="btn-action-icon !w-6 !h-6"
                          onClick={() => {
                            const newAttachments = editingOffer.attachments.filter((_: any, i: number) => i !== idx);
                            setEditingOffer({ ...editingOffer, attachments: newAttachments });
                          }}
                          title="Delete Attachment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* New files to upload */}
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md border border-primary/20 bg-primary/5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-xs truncate">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-action-icon !w-6 !h-6"
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        title="Remove Document"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add Button */}
                  {(selectedFiles.length + (editingOffer?.attachments?.length || 0)) < 5 && (
                    <div className={`flex h-10 w-full items-center justify-center rounded-md border border-dashed border-input bg-muted/20 px-3 py-2 text-xs text-muted-foreground transition-colors ${!submitting ? "hover:bg-muted/50 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                      <label className={`flex w-full items-center justify-center gap-2 ${!submitting ? "cursor-pointer" : "cursor-not-allowed"}`}>
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        <span>Add Attachment</span>
                        <input
                          type="file"
                          accept=".pdf,.jpeg,.jpg,.png"
                          multiple
                          className="hidden"
                          disabled={submitting}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const currentCount = selectedFiles.length + (editingOffer?.attachments?.length || 0);
                            const availableSlots = 5 - currentCount;

                            const validFiles: File[] = [];
                            files.slice(0, availableSlots).forEach(file => {
                              if (file.size <= 10 * 1024 * 1024) {
                                validFiles.push(file);
                              } else {
                                toast.error(`${file.name} exceeds 10MB limit`);
                              }
                            });

                            if (files.length > availableSlots) toast.error("Maximum 5 documents allowed");

                            if (validFiles.length > 0) {
                              setSelectedFiles(prev => [...prev, ...validFiles]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Comments / Terms (OPTIONAL)</Label>
              <Textarea
                value={quoteComments}
                onChange={(e) => setQuoteComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingOffer(null); setSelectedFiles([]); }}>Cancel</Button>
            <Button onClick={handleUpdateQuote} disabled={submitting}>
              {submitting ? (pdfUploadProgress ? "Uploading Files..." : "Saving...") : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SellerMyOffersPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading offers...</div>}>
      <SellerMyOffersContent />
    </Suspense>
  )
}
