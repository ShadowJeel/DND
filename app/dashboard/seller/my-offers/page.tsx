"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Edit, Mail, Phone, Tag, Trash2, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import useSWR from "swr"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getOffersBySellerId, updateOffer, deleteOffer } from "@/lib/store"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/lib/firebase"

function rankBadge(rank?: number) {
  if (!rank) return <span className="text-muted-foreground">-</span>
  if (rank === 1) return <Badge className="border-0 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"><Trophy className="mr-1 h-3 w-3" /> #{rank}</Badge>
  if (rank <= 3) return <Badge variant="outline" className="text-primary"># {rank}</Badge>
  return <Badge variant="outline">#{rank}</Badge>
}

function statusBadge(status: string) {
  switch (status) {
    case "accepted": return <Badge className="border-0 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">Accepted</Badge>
    case "disqualified": return <Badge variant="destructive">Disqualified</Badge>
    case "pending": return <Badge variant="outline">Pending</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

export default function SellerMyOffersPage() {
  const { user } = useAuth()
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
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [pdfUploadProgress, setPdfUploadProgress] = useState(false)
  const [removeExistingPdf, setRemoveExistingPdf] = useState(false)

  const handleUpdateQuote = async () => {
    if (!editingOffer || !pricePerTon) {
      toast.error("Please enter a price per ton")
      return
    }
    setSubmitting(true)
    try {
      if (editingOffer.status === "accepted") {
        throw new Error("Cannot edit an accepted offer")
      }

      let finalPdfUrl = editingOffer.pdfUrl || ""

      // Delete the existing remote PDF if checking the remove box, or replacing it with another
      if (removeExistingPdf || selectedPdf) {
        if (finalPdfUrl && finalPdfUrl !== "/dummy-quote.pdf" && finalPdfUrl.includes("firebase")) {
          try {
            const oldRef = ref(storage, finalPdfUrl)
            await deleteObject(oldRef)
          } catch (e) {
            console.error("Failed to delete old pdf", e)
          }
        }
        finalPdfUrl = removeExistingPdf ? "" : finalPdfUrl
      }

      if (selectedPdf) {
        setPdfUploadProgress(true)
        const fileRef = ref(storage, `quotes/${Date.now()}_${editingOffer.inquiryId}_${editingOffer.inquiryItemId}.pdf`)
        await uploadBytes(fileRef, selectedPdf)
        finalPdfUrl = await getDownloadURL(fileRef)
        setPdfUploadProgress(false)
      }

      await updateOffer(editingOffer.id, {
        pricePerTon: Number(pricePerTon),
        comments: quoteComments,
        pdfUrl: finalPdfUrl,
        contactEmail,
        contactPhone,
      })
      toast.success("Quote updated successfully!")
      setEditingOffer(null)
      setSelectedPdf(null)
      setRemoveExistingPdf(false)
      mutate()
    } catch (e: any) {
      toast.error(e.message || "Failed to update quote")
    } finally {
      setSubmitting(false)
      setPdfUploadProgress(false)
    }
  }

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
        <h2 className="font-serif text-2xl font-bold text-foreground">My Offers</h2>
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
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Offer ID</TableHead>
                  <TableHead className="text-muted-foreground">Inquiry</TableHead>
                  <TableHead className="text-muted-foreground">Item</TableHead>
                  <TableHead className="text-muted-foreground">Price/Ton</TableHead>
                  <TableHead className="text-muted-foreground">Rank</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Buyer Contact</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-right text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer: any) => (
                  <TableRow key={offer.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{offer.id}</TableCell>
                    <TableCell className="text-foreground">{offer.inquiryId}</TableCell>
                    <TableCell className="text-muted-foreground">{offer.inquiryItemId}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {"₹"}{offer.pricePerTon.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>{rankBadge(offer.rank)}</TableCell>
                    <TableCell>{statusBadge(offer.status)}</TableCell>
                    <TableCell>
                      {offer.status === "accepted" ? (
                        <div className="flex flex-col text-xs space-y-1">
                          {offer.buyerName && <div className="font-medium text-foreground">{offer.buyerName}</div>}
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
                      ) : (
                        <span className="text-xs text-muted-foreground italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(offer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </TableCell>
                    <TableCell className="text-right">
                      {offer.status !== "accepted" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:bg-primary/10"
                            onClick={() => {
                              setEditingOffer(offer)
                              setSelectedPdf(null)
                              setRemoveExistingPdf(false)
                              setPricePerTon(offer.pricePerTon.toString())
                              setContactEmail(offer.contactEmail || user?.email || "")
                              setContactPhone(offer.contactPhone || user?.phone || "")
                              setQuoteComments(offer.comments || "")
                            }}
                            title="Edit Offer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteOffer(offer.id)}
                            title="Delete Offer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Competitive Intelligence Note */}
      {Array.isArray(offers) && offers.length > 0 && (
        <Card className="mt-6 border-border bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Competitive Intelligence</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your rank indicates your price position relative to other sellers. A rank of #1 means you have the lowest (most competitive) price. Ranks update in real-time as new offers are submitted.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Offer Dialog */}
      <Dialog open={!!editingOffer} onOpenChange={(open) => {
        if (!open) { setEditingOffer(null); setSelectedPdf(null); setRemoveExistingPdf(false); }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>
              Update your quotation details for Item: {editingOffer?.inquiryItemId}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pricePerTon">Price per Ton (INR) <span className="text-red-500">*</span></Label>
                <Input
                  id="pricePerTon"
                  type="number"
                  value={pricePerTon}
                  onChange={(e) => setPricePerTon(e.target.value)}
                  placeholder="e.g. 48500"
                />
              </div>
              <div className="space-y-2">
                <Label>Official Quotation PDF</Label>

                {editingOffer?.pdfUrl && editingOffer.pdfUrl !== "" && editingOffer.pdfUrl !== "/dummy-quote.pdf" && !selectedPdf && !removeExistingPdf ? (
                  <div className="flex flex-col gap-2 rounded-md border border-input p-3 bg-muted/20">
                    <p className="text-sm font-medium">Current PDF Uploaded</p>
                    <div className="flex gap-2">
                      <a href={editingOffer.pdfUrl} target="_blank" rel="noreferrer" className="flex-1">
                        <Button type="button" variant="outline" size="sm" className="w-full">
                          View PDF
                        </Button>
                      </a>
                      <Button type="button" variant="destructive" size="sm" onClick={() => setRemoveExistingPdf(true)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className={`flex h-11 w-full items-center justify-center rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors ${!submitting ? "hover:bg-muted/50 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                      <label className={`flex w-full items-center justify-center gap-2 ${!submitting ? "cursor-pointer" : "cursor-not-allowed"}`}>
                        <span className="truncate">{selectedPdf ? selectedPdf.name : (removeExistingPdf ? "Upload New PDF instead" : "Upload New PDF (Optional)")}</span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          disabled={submitting}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error("PDF file must be less than 5MB");
                                e.target.value = '';
                              } else {
                                setSelectedPdf(file);
                                setRemoveExistingPdf(false);
                                toast.success("PDF attached to quote");
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                    {(selectedPdf || removeExistingPdf) && editingOffer?.pdfUrl && editingOffer.pdfUrl !== "" && editingOffer.pdfUrl !== "/dummy-quote.pdf" && (
                      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => { setSelectedPdf(null); setRemoveExistingPdf(false); }}>
                        Cancel Changes & Keep Original File
                      </Button>
                    )}
                  </div>
                )}
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
              <Label>Additional Comments / Terms</Label>
              <Textarea
                value={quoteComments}
                onChange={(e) => setQuoteComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingOffer(null); setSelectedPdf(null); setRemoveExistingPdf(false); }}>Cancel</Button>
            <Button onClick={handleUpdateQuote} disabled={submitting}>
              {submitting ? (pdfUploadProgress ? "Uploading PDF..." : "Saving...") : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
