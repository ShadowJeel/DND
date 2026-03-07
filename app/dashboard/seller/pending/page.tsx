"use client"

import { BiddingTimer } from "@/components/bidding-timer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { Clock, FileText, Gavel, Package, Send, MapPin, Edit, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import useSWR from "swr"
import { getOpenInquiries, getOffersBySellerId, createOffer, updateOffer, deleteOffer } from "@/lib/store"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"
interface InquiryItem {
  id: string
  product: string
  paymentTerms: string
  options?: Record<string, string | string[]>
}

interface Inquiry {
  id: string
  buyerId: string
  buyerName: string
  items: InquiryItem[]
  status: string
  biddingDeadline?: string
  createdAt: string
  deliveryAddress?: string
  district?: string
  state?: string
  pinCode?: string
}

export default function SellerPendingPage() {
  const { user } = useAuth()
  const { data: inquiries, isLoading } = useSWR(
    "open-inquiries",
    () => getOpenInquiries(),
    { refreshInterval: 5000 }
  )
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [quoteItem, setQuoteItem] = useState<InquiryItem | null>(null)
  const [pricePerTon, setPricePerTon] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [quoteComments, setQuoteComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editingOffer, setEditingOffer] = useState<any>(null)
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [pdfUploadProgress, setPdfUploadProgress] = useState(false)

  const { data: myOffers } = useSWR(
    user ? `seller-offers-${user.id}` : null,
    () => getOffersBySellerId(user!.id),
    { refreshInterval: 5000 }
  )

  // Pre-fill contact info when user data is loaded
  if (user && !contactEmail && !contactPhone) {
    setContactEmail(user.email)
    setContactPhone(user.phone || "")
  }

  const submitQuote = async () => {
    if (!pricePerTon || !quoteItem || !selectedInquiry) {
      toast.error("Please enter a price per ton")
      return
    }
    setSubmitting(true)
    try {
      let finalPdfUrl = editingOffer ? editingOffer.pdfUrl || "" : ""

      if (selectedPdf) {
        setPdfUploadProgress(true)
        const fileRef = ref(storage, `quotes/${Date.now()}_${selectedInquiry.id}_${quoteItem.id}.pdf`)
        await uploadBytes(fileRef, selectedPdf, { contentType: "application/pdf" })
        finalPdfUrl = await getDownloadURL(fileRef)
        setPdfUploadProgress(false)
      }

      if (editingOffer) {
        // Do NOT use API route for updating, we use client SDK!
        await updateOffer(editingOffer.id, {
          pricePerTon: Number(pricePerTon),
          comments: quoteComments,
          pdfUrl: finalPdfUrl,
          contactEmail,
          contactPhone,
        })
        toast.success("Quote updated successfully!")
      } else {
        // Direct Native Creation
        const payload = {
          inquiryId: selectedInquiry.id,
          inquiryItemId: quoteItem.id,
          sellerId: user?.id as string,
          sellerName: user?.name as string,
          pricePerTon: Number(pricePerTon),
          comments: quoteComments,
          pdfUrl: finalPdfUrl || "/dummy-quote.pdf", // Simulated PDF if skipped
          contactEmail,
          contactPhone,
          status: "pending" as const
        }
        await createOffer(payload);

        // Ping backend ONLY to dispatch notifications!
        const res = await fetch("/api/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success("Quote submitted successfully!")
      }
      setQuoteItem(null)
      setEditingOffer(null)
      setSelectedPdf(null)
      setPdfUploadProgress(false)
      setPricePerTon("")
      setQuoteComments("")
      // Reset contact info to user defaults
      setContactEmail(user?.email || "")
      setContactPhone(user?.phone || "")
    } catch (e: any) {
      toast.error(e.message || "Failed to save quote")
    } finally {
      setSubmitting(false)
      setPdfUploadProgress(false)
    }
  }

  const handleDeleteQuote = async () => {
    if (!editingOffer) return
    if (!confirm("Are you sure you want to delete this quote?")) return

    setSubmitting(true)
    try {
      await deleteOffer(editingOffer.id)
      toast.success("Quote deleted successfully!")
      setQuoteItem(null)
      setEditingOffer(null)
      setSelectedPdf(null)
    } catch {
      toast.error("Failed to delete quote")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-foreground">Open Inquiries</h2>
        <p className="mt-1 text-muted-foreground">
          Browse buyer inquiries and submit your best price offers.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading inquiries...</div>
      ) : !Array.isArray(inquiries) || inquiries.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">No open inquiries at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {inquiries.map((inq: Inquiry) => (
            <Card key={inq.id} className="border-border transition-all hover:border-primary/20">
              <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">{inq.id}</CardTitle>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                        {new Date(inq.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="text-foreground/40">|</span>
                      <span>Buyer: {inq.buyerName || inq.buyerId}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {inq.status === "bidding" && inq.biddingDeadline && (
                    <BiddingTimer deadline={inq.biddingDeadline} status={inq.status as "open" | "bidding" | "closed"} />
                  )}
                  <div className="flex items-center gap-2">
                    {inq.status === "bidding" && (
                      <Badge className="border border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]">
                        <Gavel className="mr-1 h-3 w-3" /> Bidding
                      </Badge>
                    )}
                    <Badge variant="outline">{inq.items.length} item(s)</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4 flex flex-col gap-3">
                  {inq.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md p-4 text-sm border border-white/20 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-2 font-semibold text-foreground shrink-0 bg-primary/10 px-2.5 py-1 rounded-md">
                        <Package className="h-4 w-4 text-primary" />
                        {item.product}
                      </div>
                      <div className="hidden sm:block text-muted-foreground/30 mx-1">|</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
                        {Object.entries(item.options || {}).map(([k, v]) => {
                          const valStr = Array.isArray(v) ? v.join(", ") : v;
                          if (!valStr) return null;
                          return <span key={k} className="text-xs bg-background/60 shadow-sm border border-border px-2 py-1 rounded-md text-foreground/80"><span className="font-medium text-foreground">{k}:</span> {valStr}</span>
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {inq.deliveryAddress && (
                  <div className="mb-4 flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/10">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground block mb-0.5">Delivery Location:</span>
                      {inq.deliveryAddress}, {inq.district}, {inq.state} - {inq.pinCode}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="gap-1 shadow-sm"
                  onClick={() => setSelectedInquiry(inq)}
                >
                  <Send className="h-3.5 w-3.5" /> View Details & Quote
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inquiry Detail Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => { setSelectedInquiry(null); setQuoteItem(null); setEditingOffer(null); setSelectedPdf(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="font-serif text-xl text-foreground flex flex-wrap items-center gap-3">
              Inquiry {selectedInquiry?.id}
              {selectedInquiry?.status === "bidding" && selectedInquiry?.biddingDeadline && (
                <BiddingTimer deadline={selectedInquiry.biddingDeadline} status={selectedInquiry.status as "open" | "bidding" | "closed"} />
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1.5">
              Review the technical specifications and delivery details, then submit your price offer for each item.
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && !quoteItem && (
            <div className="mt-4 space-y-6">
              {/* Delivery Info Box */}
              {selectedInquiry.deliveryAddress && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <h4 className="flex items-center gap-2 font-medium text-sm text-foreground mb-2">
                    <MapPin className="h-4 w-4 text-primary" /> Delivery Information
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Address:</strong> {selectedInquiry.deliveryAddress}<br />
                    <strong>District:</strong> {selectedInquiry.district} &nbsp;|&nbsp;
                    <strong>State:</strong> {selectedInquiry.state} &nbsp;|&nbsp;
                    <strong>Pin Code:</strong> {selectedInquiry.pinCode}
                  </p>
                </div>
              )}

              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-foreground font-semibold">Product</TableHead>
                      <TableHead className="text-foreground font-semibold">Specifications</TableHead>
                      <TableHead className="text-foreground font-semibold">Terms</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInquiry.items.map((item) => {
                      const itemOffer = myOffers?.find((o: any) => o.inquiryItemId === item.id)
                      const isAccepted = itemOffer?.status === "accepted"

                      return (
                        <TableRow key={item.id} className="border-border">
                          <TableCell className="font-medium text-foreground align-top pt-4">
                            {item.product}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs pt-4">
                            <div className="flex flex-wrap gap-2">
                              {/* Dynamic Options */}
                              {Object.entries(item.options || {}).map(([k, v]) => {
                                const valStr = Array.isArray(v) ? v.join(", ") : v;
                                if (!valStr) return null;
                                return (
                                  <div key={k} className="bg-background/50 border border-border shadow-sm rounded-md px-2 py-1 flex flex-col min-w-[100px]">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-0.5">{k}</span>
                                    <span className="font-semibold text-foreground text-xs">{valStr}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs align-top pt-4">
                            <div className="space-y-1">
                              <div><span className="font-medium">Payment:</span> {item.paymentTerms ? `${item.paymentTerms} Days` : "-"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top pt-4">
                            {itemOffer ? (
                              <Button
                                size="sm"
                                variant={isAccepted ? "secondary" : "outline"}
                                className="h-8 gap-1 text-xs whitespace-nowrap"
                                onClick={() => {
                                  setQuoteItem(item)
                                  setEditingOffer(itemOffer)
                                  setSelectedPdf(null)
                                  setPricePerTon(itemOffer.pricePerTon.toString())
                                  setContactEmail(itemOffer.contactEmail || user?.email || "")
                                  setContactPhone(itemOffer.contactPhone || user?.phone || "")
                                  setQuoteComments(itemOffer.comments || "")
                                }}
                              >
                                {isAccepted ? <><FileText className="h-3 w-3" /> View Quote</> : <><Edit className="h-3 w-3" /> Edit quote</>}
                              </Button>
                            ) : (
                              <Button size="sm" className="h-8 gap-1 text-xs whitespace-nowrap" onClick={() => {
                                setQuoteItem(item)
                                setEditingOffer(null)
                                setSelectedPdf(null)
                                setPricePerTon("")
                                setContactEmail(user?.email || "")
                                setContactPhone(user?.phone || "")
                                setQuoteComments("")
                              }}>
                                <Send className="h-3 w-3" /> Offer Quote
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {quoteItem && (
            <div className="mt-4 flex flex-col gap-5">
              <div className="rounded-lg border border-border bg-muted/20 p-5">
                <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
                  <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {editingOffer ? "Quote Details for:" : "Quoting for:"} {quoteItem.product}
                  </h4>
                  {editingOffer?.status === "accepted" && (
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                      Offer Accepted
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm mt-3">
                  <div className="space-y-1.5">
                    <strong className="text-foreground/80 block text-xs uppercase tracking-wider">Specifications</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(quoteItem.options || {}).map(([k, v]) => {
                        const valStr = Array.isArray(v) ? v.join(", ") : v;
                        if (!valStr) return null;
                        return (
                          <div key={k} className="bg-background border border-border shadow-sm rounded-md px-2.5 py-1.5 flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-0.5">{k}</span>
                            <span className="font-semibold text-foreground text-sm">{valStr}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {selectedInquiry?.deliveryAddress && (
                    <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4">
                      <strong className="text-foreground/80 block text-xs uppercase tracking-wider">Delivery Details</strong>
                      <div className="text-muted-foreground">{selectedInquiry.district}, {selectedInquiry.state} - {selectedInquiry.pinCode}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Price per Ton (INR) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    placeholder="e.g. 48500"
                    value={pricePerTon}
                    onChange={(e) => setPricePerTon(e.target.value)}
                    className="h-11 text-lg font-medium"
                    disabled={editingOffer?.status === "accepted"}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Official Quotation PDF (Max 5MB)</Label>
                  <div className={`flex h-11 w-full items-center justify-center rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors ${(editingOffer?.status !== "accepted" && !submitting) ? "hover:bg-muted/50 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                    <label className={`flex w-full items-center justify-center gap-2 ${(editingOffer?.status !== "accepted" && !submitting) ? "cursor-pointer" : "cursor-not-allowed"}`}>
                      <FileText className="h-4 w-4 shrink-0 transition-colors" />
                      <span className="truncate">{selectedPdf ? selectedPdf.name : "Upload PDF Quote"}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        disabled={editingOffer?.status === "accepted" || submitting}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("PDF file must be less than 5MB");
                              e.target.value = '';
                            } else {
                              setSelectedPdf(file);
                              toast.success("PDF attached to quote");
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {editingOffer?.pdfUrl && editingOffer.pdfUrl !== "" && editingOffer.pdfUrl !== "/dummy-quote.pdf" && !selectedPdf && (
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      <a href={editingOffer.pdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">View uploaded PDF</a>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-5">
                <div>
                  <Label className="text-foreground">Contact Email</Label>
                  <Input
                    type="email"
                    placeholder="sales@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1"
                    disabled={editingOffer?.status === "accepted"}
                  />
                </div>
                <div>
                  <Label className="text-foreground">Contact Phone</Label>
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1"
                    disabled={editingOffer?.status === "accepted"}
                  />
                </div>
              </div>

              <div>
                <Label className="text-foreground">Additional Comments / Terms</Label>
                <Textarea
                  placeholder="e.g. Validity of quote, specific delivery timeline, material source..."
                  value={quoteComments}
                  onChange={(e) => setQuoteComments(e.target.value)}
                  className="mt-1"
                  rows={3}
                  disabled={editingOffer?.status === "accepted"}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => { setQuoteItem(null); setEditingOffer(null); setSelectedPdf(null); }}>
                  Cancel & Back to Items
                </Button>
                {editingOffer && editingOffer.status !== "accepted" && (
                  <Button variant="destructive" className="flex-1 h-11 gap-2 border border-destructive/20 hover:bg-destructive shadow-sm" onClick={handleDeleteQuote} disabled={submitting}>
                    <Trash2 className="h-4 w-4" /> Delete Quote
                  </Button>
                )}
                {(!editingOffer || editingOffer.status !== "accepted") ? (
                  <Button className="flex-1 h-11 gap-2" onClick={submitQuote} disabled={submitting}>
                    {!submitting && (editingOffer ? <Edit className="h-4 w-4" /> : <Send className="h-4 w-4" />)}
                    {submitting ? (pdfUploadProgress ? "Uploading PDF..." : "Processing...") : (editingOffer ? "Update Quote" : "Submit Quote securely")}
                  </Button>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-2 bg-green-50 text-green-700 rounded-md border border-green-200 font-medium">
                    Quote Accepted - Cannot be modified
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
