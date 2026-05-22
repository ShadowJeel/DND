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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { Clock, FileText, Gavel, Package, Send, MapPin, Edit, Trash2, Plus } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import useSWR from "swr"
import { getOpenInquiries, getOffersBySellerId, createOffer, updateOffer, deleteOffer } from "@/lib/store"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { formatOptionType, formatOptionLabel, sortInquiryOptions } from "@/lib/utils"
// We need to import Select components as well. Wait, I should import them from ui.
interface InquiryItem {
  id: string
  product: string
  sub_product?: string
  paymentTerms: string
  options?: Record<string, string | string[]>
  remarks?: string
}

interface Inquiry {
  id: string
  buyerId: string
  buyerAlias: string
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
  const { user, allUsers } = useAuth()
  const { data: inquiries, isLoading } = useSWR(
    "open-inquiries",
    () => getOpenInquiries(),
    { refreshInterval: 5000 }
  )

  const { data: myOffers, mutate: mutateMyOffers } = useSWR(
    user ? `seller-offers-${user.id}` : null,
    () => getOffersBySellerId(user!.id),
    { refreshInterval: 5000 }
  )

  const filteredInquiries = useMemo(() => {
    if (!inquiries || !user) return []
    if (!Array.isArray(inquiries)) return []

    const currentUserBuyerId = allUsers?.find(u => u.role === "buyer" && u.email === user.email)?.id;

    return inquiries.filter((inq: Inquiry) => {
      // 0. EXCLUDE OWN INQUIRIES
      if (currentUserBuyerId && inq.buyerId === currentUserBuyerId) return false;

      // 1. PRODUCT CATEGORY MATCH & FILTER QUOTED
      const sellerCategories = user.categories || []
      const matchingItems = inq.items.filter(item => {
        if (!sellerCategories.includes(item.product)) return false;
        // Hide items that have already been quoted
        if (myOffers?.some((o: any) => o.inquiryItemId === item.id)) return false;
        return true;
      })

      if (matchingItems.length === 0) return false

      // 2. LOCATION MATCH
      if (inq.state || inq.district) {
        const sellerLocs = user.availableLocations || {}
        if (!inq.state || !sellerLocs[inq.state as string]) return false

        if (inq.district) {
          const sellerDistrictsForState = sellerLocs[inq.state as string]
          if (sellerDistrictsForState.length > 0 && !sellerDistrictsForState.includes(inq.district)) {
            return false
          }
        }
      }

      // 3. PRODUCT OPTIONS EXACT MATCH
      const sellerOptionsData = user.sellerProductOptions || {}

      const hasValidOptionMatch = matchingItems.some(item => {
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
              let buyerVal: string | string[] | undefined = (item.options || {})[optName]
              if ((optName === "Sub-Products" || optName === "Sub-Product") && !buyerVal) {
                buyerVal = item.sub_product
              }

              if (buyerVal !== undefined && buyerVal !== null && String(buyerVal).trim() !== "") {
                const buyerValsArr = Array.isArray(buyerVal) ? buyerVal : [buyerVal].filter(Boolean)
                const intersects = buyerValsArr.some(bv => sellerValsArr.includes(bv))

                if (!intersects) return false // This variant doesn't match
              }
            }
          }
          return true // This variant matches
        })
      })

      if (!hasValidOptionMatch) return false

      return true
    })
  }, [inquiries, user, myOffers])
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [quoteItem, setQuoteItem] = useState<InquiryItem | null>(null)
  const [pricePerTon, setPricePerTon] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [quoteComments, setQuoteComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [editingOffer, setEditingOffer] = useState<any>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [pdfUploadProgress, setPdfUploadProgress] = useState(false)
  const [sellerProductOptions, setSellerProductOptions] = useState<any[]>([])
  const [sellerOptionsState, setSellerOptionsState] = useState<Record<string, string | string[]>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [allProductOptions, setAllProductOptions] = useState<Record<string, any[]>>({})

  // Fetch all product options for unique (product, subProduct) pairs in inquiries to determine sort order
  const productSubProductPairs = useMemo(() => {
    return Array.from(new Set(inquiries?.flatMap((inq: any) => inq.items.map((item: any) => `${item.product}|${item.sub_product || ""}`)) || [])) as string[]
  }, [inquiries])

  useEffect(() => {
    if (productSubProductPairs.length === 0) return

    const fetchAll = async () => {
      const results: Record<string, any[]> = {}
      for (const pair of productSubProductPairs) {
        const [product, subProduct] = pair.split('|')
        try {
          const url = `/api/products/options?productName=${encodeURIComponent(product)}${subProduct ? `&subProduct=${encodeURIComponent(subProduct)}` : ""}`
          const res = await fetch(url)
          const data = await res.json()
          if (Array.isArray(data)) {
            results[pair] = data.map((opt: any) => ({
              ...opt,
              buyer_option_type: opt.buyer_option_type || (opt.form_type !== 'seller' ? opt.option_type : 'none'),
              seller_option_type: opt.seller_option_type || (opt.form_type === 'seller' ? opt.option_type : 'none')
            })).filter((opt: any) => opt.buyer_option_type !== 'none')
          }
        } catch (e) {
          console.error(`Failed to fetch options for ${pair}`, e)
        }
      }
      setAllProductOptions(results)
    }
    fetchAll()
  }, [productSubProductPairs])


  // Dispatch Location mapping
  const [locationSettings, setLocationSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [dispatchLocation, setDispatchLocation] = useState({ state: "", district: "" })



  // Pre-fill contact info when user data is loaded
  if (user && !contactEmail && !contactPhone) {
    setContactEmail(user.email)
    setContactPhone(user.phone || "")
  }

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setLocations(data)
    }).catch(console.error)

    import("firebase/firestore").then(({ doc, getDoc }) => {
      import("@/lib/firebase").then(({ db }) => {
        getDoc(doc(db, "settings", "location")).then((snap) => {
          if (snap.exists()) setLocationSettings(snap.data())
        }).catch(console.error)
      })
    })
  }, [])

  useEffect(() => {
    if (quoteItem && quoteItem.product) {
      const url = `/api/products/options?productName=${encodeURIComponent(quoteItem.product)}${quoteItem.sub_product ? `&subProduct=${encodeURIComponent(quoteItem.sub_product)}` : ""}`
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const mappedOptions = data.map((opt: any) => ({
              ...opt,
              seller_option_type: opt.seller_option_type || (opt.form_type === 'seller' ? opt.option_type : 'none')
            })).filter((opt: any) => opt.seller_option_type !== 'none');
            setSellerProductOptions(mappedOptions);
          } else {
            setSellerProductOptions([]);
          }
        })
        .catch(() => setSellerProductOptions([]))
    } else {
      setSellerProductOptions([])
    }
  }, [quoteItem?.product, quoteItem?.sub_product])

  const updateSellerOption = (optionName: string, value: string | string[]) => {
    setSellerOptionsState(prev => ({
      ...prev,
      [optionName]: value
    }))
  }

  const toggleSellerCheckbox = (optionName: string, value: string) => {
    setSellerOptionsState(prev => {
      const currentOptions = prev[optionName] as string[] || [];
      let newOptions;
      if (currentOptions.includes(value)) {
        newOptions = currentOptions.filter(v => v !== value);
      } else {
        newOptions = [...currentOptions, value];
      }
      return {
        ...prev,
        [optionName]: newOptions
      }
    })
  }

  const submitQuote = async () => {
    if (!pricePerTon || !quoteItem || !selectedInquiry) {
      toast.error("Please enter a price per unit")
      return
    }

    // Validation for Seller Options and Dispatch Location has been removed by request.

    setSubmitting(true)
    try {
      let finalAttachments = editingOffer ? [...(editingOffer.attachments || [])] : []

      if (selectedFiles.length > 0) {
        setPdfUploadProgress(true)
        const uploadPromises = selectedFiles.map(async (file) => {
          const fileRef = ref(storage, `quotes/${Date.now()}_${selectedInquiry.id}_${quoteItem.id}_${file.name}`)
          await uploadBytes(fileRef, file)
          return getDownloadURL(fileRef)
        })
        const newUrls = await Promise.all(uploadPromises)
        finalAttachments = [...finalAttachments, ...newUrls]
        setPdfUploadProgress(false)
      }

      if (editingOffer) {
        await updateOffer(editingOffer.id, {
          pricePerTon: Number(pricePerTon),
          comments: quoteComments,
          attachments: finalAttachments,
          contactEmail,
          contactPhone,
          sellerOptions: { ...sellerOptionsState },
        })
        toast.success("Quote updated successfully!")
      } else {
        const payload = {
          inquiryId: selectedInquiry.id,
          inquiryItemId: quoteItem.id,
          sellerId: user?.id as string,
          pricePerTon: Number(pricePerTon),
          comments: quoteComments,
          attachments: finalAttachments,
          pdfUrl: finalAttachments[0] || "/dummy-quote.pdf", // Fallback for old code
          contactEmail,
          contactPhone,
          sellerOptions: { ...sellerOptionsState },
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
      setSelectedFiles([])
      setPdfUploadProgress(false)
      setPricePerTon("")
      setQuoteComments("")
      // Reset contact info to user defaults
      setContactEmail(user?.email || "")
      setContactPhone(user?.phone || "")
      
      // Update global cache immediately
      mutateMyOffers()
    } catch (e: any) {
      toast.error(e.message || "Failed to save quote")
    } finally {
      setSubmitting(false)
      setPdfUploadProgress(false)
      setShowConfirmDialog(false)
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
      setSelectedFiles([])
    } catch {
      toast.error("Failed to delete quote")
    } finally {
      setSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  const requestedQuantityRaw = quoteItem?.options?.["Quantity"] || quoteItem?.options?.["Qty"] || quoteItem?.options?.["quantity"];
  const requestedQuantity = parseFloat(String(requestedQuantityRaw).replace(/[^\d.]/g, '')) || 1;
  const computedTotal = (Number(pricePerTon) || 0) * requestedQuantity;

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
      ) : !Array.isArray(filteredInquiries) || filteredInquiries.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">No open inquiries at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredInquiries.map((inq: Inquiry) => (
            <Card key={inq.id} className="border-border transition-all hover:border-primary/20">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-border/50">
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
                      <span>Buyer: {inq.buyerAlias || "Buyer-???"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {inq.status === "bidding" && inq.biddingDeadline && (
                    <BiddingTimer deadline={inq.biddingDeadline} status={inq.status as "open" | "bidding" | "closed"} />
                  )}
                  <div className="flex items-center gap-2">
                    {inq.status === "active" && (
                      <Badge className="border border-primary/20 bg-primary/10 text-primary">
                        <Clock className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    )}
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
                    <div key={item.id} className="flex flex-row items-center flex-wrap gap-2 rounded-lg bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md p-3 md:p-4 text-sm border border-white/20 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-2 font-semibold text-foreground shrink-0 bg-primary/10 px-2.5 py-1 rounded-md">
                        <Package className="h-4 w-4 text-primary" />
                        {item.product} {item.sub_product && <span className="text-muted-foreground font-normal">({item.sub_product})</span>}
                      </div>
                      <div className="text-muted-foreground/30 mx-1">|</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
                        {sortInquiryOptions(item.options || {}, allProductOptions[`${item.product}|${item.sub_product || ""}`]).map(([k, v]) => {
                          const valStr = Array.isArray(v) ? v.join(", ") : v;
                          if (!valStr) return null;
                          return <span key={k} className="text-xs bg-background/60 shadow-sm border border-border px-2 py-1 rounded-md text-foreground/80"><span className="font-medium text-foreground">{formatOptionLabel(k)}:</span> {valStr}</span>
                        })}
                        {item.remarks && (
                          <span className="text-xs bg-primary/10 shadow-sm border border-primary/20 px-2 py-1 rounded-md text-foreground/80 flex items-center gap-1.5"><FileText className="h-3 w-3 text-primary" /><span className="font-medium text-primary">Remarks:</span> <span className="italic max-w-[200px] truncate" title={item.remarks}>{item.remarks}</span></span>
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

                <Button
                  size="sm"
                  className="gap-1 shadow-sm w-full sm:w-auto"
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
      <Dialog open={!!selectedInquiry} onOpenChange={() => { setSelectedInquiry(null); setQuoteItem(null); setEditingOffer(null); setSelectedFiles([]); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader className="pb-4 border-b border-border pr-8 md:pr-0">
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
              {(selectedInquiry.state || selectedInquiry.district) && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <h4 className="flex items-center gap-2 font-medium text-sm text-foreground mb-2">
                    <MapPin className="h-4 w-4 text-primary" /> Delivery Information
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed flex flex-wrap gap-x-4 gap-y-1">
                    {selectedInquiry.district && <span><strong>District:</strong> {selectedInquiry.district}</span>}
                    {selectedInquiry.state && <span><strong>State:</strong> {selectedInquiry.state}</span>}
                  </p>
                </div>
              )}

              {/* Desktop View Table */}
              <div className="hidden md:block rounded-md border border-border overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-foreground font-semibold">Product</TableHead>
                      <TableHead className="text-foreground font-semibold">Specifications</TableHead>
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
                            {item.sub_product && <div className="text-[10px] text-muted-foreground font-normal">({item.sub_product})</div>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs pt-4">
                            <div className="flex flex-wrap gap-2">
                              {/* Dynamic Options */}
                              {sortInquiryOptions(item.options || {}, allProductOptions[`${item.product}|${item.sub_product || ""}`]).map(([k, v]) => {
                                const valStr = Array.isArray(v) ? v.join(", ") : v;
                                if (!valStr) return null;
                                return (
                                  <div key={k} className="bg-background/50 border border-border shadow-sm rounded-md px-2 py-1 flex flex-col min-w-[100px]">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-0.5">{formatOptionLabel(k)}</span>
                                    <span className="font-semibold text-foreground text-xs">{valStr}</span>
                                  </div>
                                )
                              })}
                            </div>
                            {item.remarks && (
                              <div className="mt-3 bg-primary/5 border border-primary/10 shadow-sm rounded-md p-2.5">
                                <span className="text-[10px] uppercase tracking-wider text-primary/80 font-bold block mb-1 flex items-center gap-1.5"><FileText className="h-3 w-3" /> Buyer's Remarks</span>
                                <span className="font-medium text-foreground text-xs italic leading-relaxed">{item.remarks}</span>
                              </div>
                            )}
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
                                  setSelectedFiles([])
                                  setPricePerTon(itemOffer.pricePerTon.toString())
                                  setContactEmail(itemOffer.contactEmail || user?.email || "")
                                  setContactPhone(itemOffer.contactPhone || user?.phone || "")
                                  setQuoteComments(itemOffer.comments || "")

                                  const { dispatch_state, dispatch_district, ...restOptions } = itemOffer.sellerOptions || {} as any;
                                  setSellerOptionsState(restOptions || {})
                                  setDispatchLocation({
                                    state: dispatch_state || "",
                                    district: dispatch_district || ""
                                  })
                                }}
                              >
                                {isAccepted ? <><FileText className="h-3 w-3" /> View Quote</> : <><Edit className="h-3 w-3" /> Edit quote</>}
                              </Button>
                            ) : (
                              <Button size="sm" className="h-8 gap-1 text-xs whitespace-nowrap" onClick={() => {
                                setQuoteItem(item)
                                setEditingOffer(null)
                                setSelectedFiles([])
                                setPricePerTon("")
                                setContactEmail(user?.email || "")
                                setContactPhone(user?.phone || "")
                                setQuoteComments("")
                                setSellerOptionsState({})
                                setDispatchLocation({ state: "", district: "" })
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

              {/* Mobile View Stack */}
              <div className="block md:hidden space-y-4">
                {selectedInquiry.items.map((item) => {
                  const itemOffer = myOffers?.find((o: any) => o.inquiryItemId === item.id)
                  const isAccepted = itemOffer?.status === "accepted"

                  return (
                    <div key={item.id} className="bg-muted/10 border border-border rounded-lg p-4 space-y-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          {item.product}
                        </span>
                        {item.sub_product && (
                          <span className="text-[11px] text-muted-foreground font-normal mt-0.5 ml-6">
                            ({item.sub_product})
                          </span>
                        )}
                      </div>

                      {/* Specifications */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Specifications</span>
                        <div className="flex flex-wrap gap-2">
                          {sortInquiryOptions(item.options || {}, allProductOptions[`${item.product}|${item.sub_product || ""}`]).map(([k, v]) => {
                            const valStr = Array.isArray(v) ? v.join(", ") : v;
                            if (!valStr) return null;
                            return (
                              <div key={k} className="bg-background border border-border shadow-sm rounded-md px-2 py-1 flex flex-col min-w-[100px]">
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-0.5">{formatOptionLabel(k)}</span>
                                <span className="font-semibold text-foreground text-xs">{valStr}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Remarks */}
                      {item.remarks && (
                        <div className="bg-primary/5 border border-primary/10 shadow-sm rounded-md p-3">
                          <span className="text-[10px] uppercase tracking-wider text-primary/80 font-bold block mb-1 flex items-center gap-1.5">
                            <FileText className="h-3 w-3" /> Buyer's Remarks
                          </span>
                          <span className="font-medium text-foreground text-xs italic leading-relaxed">
                            {item.remarks}
                          </span>
                        </div>
                      )}

                      {/* Action */}
                      <div className="pt-2 border-t border-border/50">
                        {itemOffer ? (
                          <Button
                            size="sm"
                            variant={isAccepted ? "secondary" : "outline"}
                            className="w-full h-9 gap-1.5 text-xs"
                            onClick={() => {
                              setQuoteItem(item)
                              setEditingOffer(itemOffer)
                              setSelectedFiles([])
                              setPricePerTon(itemOffer.pricePerTon.toString())
                              setContactEmail(itemOffer.contactEmail || user?.email || "")
                              setContactPhone(itemOffer.contactPhone || user?.phone || "")
                              setQuoteComments(itemOffer.comments || "")

                              const { dispatch_state, dispatch_district, ...restOptions } = itemOffer.sellerOptions || {} as any;
                              setSellerOptionsState(restOptions || {})
                              setDispatchLocation({
                                state: dispatch_state || "",
                                district: dispatch_district || ""
                              })
                            }}
                          >
                            {isAccepted ? <><FileText className="h-3.5 w-3.5" /> View Quote</> : <><Edit className="h-3.5 w-3.5" /> Edit quote</>}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full h-9 gap-1.5 text-xs"
                            onClick={() => {
                              setQuoteItem(item)
                              setEditingOffer(null)
                              setSelectedFiles([])
                              setPricePerTon("")
                              setContactEmail(user?.email || "")
                              setContactPhone(user?.phone || "")
                              setQuoteComments("")
                              setSellerOptionsState({})
                              setDispatchLocation({ state: "", district: "" })
                            }}
                          >
                            <Send className="h-3.5 w-3.5" /> Offer Quote
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {quoteItem && (
            <div className="mt-4 flex flex-col gap-5">
              <div className="rounded-lg border border-border bg-muted/20 p-5">
                <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
                  <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {editingOffer ? "Quote Details for:" : "Quoting for:"} {quoteItem.product} {quoteItem.sub_product && <span className="text-muted-foreground font-normal">({quoteItem.sub_product})</span>}
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
                      {sortInquiryOptions(quoteItem.options || {}, allProductOptions[`${quoteItem.product}|${quoteItem.sub_product || ""}`]).map(([k, v]) => {
                        const valStr = Array.isArray(v) ? v.join(", ") : v;
                        if (!valStr) return null;
                        return (
                          <div key={k} className="bg-background border border-border shadow-sm rounded-md px-2.5 py-1.5 flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-0.5">{formatOptionLabel(k)}</span>
                            <span className="font-semibold text-foreground text-sm">{valStr}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {(selectedInquiry?.state || selectedInquiry?.district) && (
                    <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4">
                      <strong className="text-foreground/80 block text-xs uppercase tracking-wider">Delivery Details</strong>
                      <div className="text-muted-foreground">{[selectedInquiry.district, selectedInquiry.state].filter(Boolean).join(", ")}</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Table View Options for Seller */}
              {sellerProductOptions.filter((opt: any) => opt.seller_option_type === 'table').length > 0 && (
                <div className="space-y-4">
                  {sellerProductOptions
                    .filter((opt: any) => opt.seller_option_type === 'table')
                    .map((opt: any) => {
                      const optionKey = opt.option_name;
                      const tableColumns: string[] = opt.table_columns || ['Column 1', 'Column 2'];
                      const currentRows: Record<string, string>[] = (() => {
                        try {
                          const raw = sellerOptionsState[optionKey];
                          if (typeof raw === 'string') return JSON.parse(raw);
                          if (Array.isArray(raw)) return raw as any;
                          return [];
                        } catch { return []; }
                      })();

                      const addRow = () => {
                        const emptyRow: Record<string, string> = {};
                        tableColumns.forEach(col => { emptyRow[col] = ''; });
                        const newRows = [...currentRows, emptyRow];
                        updateSellerOption(optionKey, JSON.stringify(newRows));
                      };

                      const updateRow = (rowIdx: number, colName: string, value: string) => {
                        const newRows = currentRows.map((row, i) =>
                          i === rowIdx ? { ...row, [colName]: value } : row
                        );
                        updateSellerOption(optionKey, JSON.stringify(newRows));
                      };

                      const removeRow = (rowIdx: number) => {
                        const newRows = currentRows.filter((_, i) => i !== rowIdx);
                        updateSellerOption(optionKey, JSON.stringify(newRows));
                      };

                      return (
                        <div key={opt.id || optionKey} className="rounded-lg border border-border bg-card overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">{opt.option_name}</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Add rows of data below. This will be visible to buyers.</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                              onClick={addRow}
                              disabled={editingOffer?.status === "accepted"}
                            >
                              <Plus className="h-3 w-3" /> Add Row
                            </Button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/20 border-b border-border">
                                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground/80 w-8">#</th>
                                  {tableColumns.map((col: string, ci: number) => (
                                    <th key={ci} className="px-3 py-2 text-left font-semibold text-foreground/80">{col}</th>
                                  ))}
                                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground/80 w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={tableColumns.length + 2} className="px-4 py-6 text-center text-muted-foreground italic text-xs">
                                      No rows added yet. Click &quot;Add Row&quot; to start.
                                    </td>
                                  </tr>
                                ) : (
                                  currentRows.map((row: Record<string, string>, rowIdx: number) => (
                                    <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                      <td className="px-3 py-1.5 text-muted-foreground font-medium">{rowIdx + 1}</td>
                                      {tableColumns.map((col: string, ci: number) => (
                                        <td key={ci} className="px-2 py-1.5">
                                          <Input
                                            type="text"
                                            placeholder={`Enter ${col.toLowerCase()}`}
                                            value={row[col] || ''}
                                            onChange={(e) => updateRow(rowIdx, col, e.target.value)}
                                            className="h-8 text-xs border-border/50 bg-background"
                                            disabled={editingOffer?.status === "accepted"}
                                          />
                                        </td>
                                      ))}
                                      <td className="px-2 py-1.5 text-right">
                                        {editingOffer?.status !== "accepted" && (
                                          <button
                                            type="button"
                                            className="btn-action-icon !w-6 !h-6"
                                            onClick={() => removeRow(rowIdx)}
                                            title="Remove row"
                                          >
                                            <Trash2 />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {showConfirmDialog ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground text-center mb-2">Confirm Your Offer</h3>
                  <div className="bg-background rounded-md border border-border p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Price per unit:</span>
                      <span className="font-semibold">₹ {Number(pricePerTon).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Requested Quantity:</span>
                      <span className="font-semibold">{requestedQuantity}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-center bg-muted/20 mt-1 rounded-sm">
                      <span className="text-foreground font-medium pl-2">Total Price:</span>
                      <span className="text-xl font-bold text-primary pr-2">₹ {computedTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setShowConfirmDialog(false)}>
                      Back to Edit
                    </Button>
                    <Button className="flex-1" onClick={submitQuote} disabled={submitting}>
                      {submitting ? "Processing..." : (editingOffer ? "Confirm Update" : "Confirm & Submit")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground font-medium">Price per unit (INR) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="0.000001"
                        step="any"
                        placeholder="e.g. 48500"
                        value={pricePerTon}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('-')) return;
                          setPricePerTon(val);
                        }}
                        className="h-11 text-lg font-medium"
                        disabled={editingOffer?.status === "accepted"}
                      />
                      {pricePerTon && Number(pricePerTon) > 0 && (
                        <div className="text-sm font-medium text-primary mt-1">
                          Total (Est): ₹ {computedTotal.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {/* Removed single PDF section as it is replaced by multi-attachment below comments */}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-5">
                    <div>
                      <Label className="text-foreground">Contact Email (Read-only)</Label>
                      <Input
                        type="email"
                        placeholder="sales@company.com"
                        value={contactEmail}
                        readOnly
                        className="mt-1 bg-muted cursor-not-allowed"
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
                    <Label className="text-foreground">Additional Comments / Terms (OPTIONAL)</Label>
                    <Textarea
                      placeholder="e.g. Validity of quote, specific delivery timeline, material source..."
                      value={quoteComments}
                      onChange={(e) => setQuoteComments(e.target.value)}
                      className="mt-1"
                      rows={3}
                      disabled={editingOffer?.status === "accepted"}
                    />
                  </div>

                  {/* Multi-attachment Section */}
                  <div className="space-y-3">
                    <Label className="text-foreground font-medium">Attach Quote Document (Max 5 files, 10MB each) (OPTIONAL)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* File List */}
                      {((editingOffer?.attachments || []) as string[]).map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/30">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <span className="text-xs truncate">Document {idx + 1}</span>
                          </div>
                          <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline font-medium">View</a>
                        </div>
                      ))}

                      {/* Currently selected files for upload */}
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
                            title="Remove attachment"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      ))}

                      {/* Add Button */}
                      {(selectedFiles.length + (editingOffer?.attachments?.length || 0)) < 5 && (
                        <div className={`flex h-10 w-full items-center justify-center rounded-md border border-dashed border-input bg-muted/20 px-3 py-2 text-xs text-muted-foreground transition-colors ${(editingOffer?.status !== "accepted" && !submitting) ? "hover:bg-muted/50 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                          <label className={`flex w-full items-center justify-center gap-2 ${(editingOffer?.status !== "accepted" && !submitting) ? "cursor-pointer" : "cursor-not-allowed"}`}>
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span>Add Attachment</span>
                            <input
                              type="file"
                              accept=".pdf,.jpeg,.jpg,.png"
                              multiple
                              className="hidden"
                              disabled={editingOffer?.status === "accepted" || submitting}
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const currentCount = selectedFiles.length + (editingOffer?.attachments?.length || 0);
                                const availableSlots = 5 - currentCount;

                                const validFiles: File[] = [];
                                let countError = false;
                                let sizeError = false;

                                files.slice(0, availableSlots).forEach(file => {
                                  if (file.size > 10 * 1024 * 1024) {
                                    sizeError = true;
                                  } else {
                                    validFiles.push(file);
                                  }
                                });

                                if (files.length > availableSlots) countError = true;

                                if (sizeError) toast.error("Some files exceed the 10MB limit");
                                if (countError) toast.error("Maximum 5 documents allowed");

                                if (validFiles.length > 0) {
                                  setSelectedFiles(prev => [...prev, ...validFiles]);
                                  toast.success(`${validFiles.length} file(s) attached`);
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button variant="outline" className="flex-1 h-11" onClick={() => { setQuoteItem(null); setEditingOffer(null); setSelectedFiles([]); setShowConfirmDialog(false); }}>
                      Cancel & Back to Items
                    </Button>
                    {editingOffer && editingOffer.status !== "accepted" && (
                      <Button variant="destructive" className="flex-1 h-11 gap-2 border border-destructive/20 hover:bg-destructive shadow-sm" onClick={handleDeleteQuote} disabled={submitting}>
                        <Trash2 className="h-4 w-4" /> Delete Quote
                      </Button>
                    )}
                    {(!editingOffer || editingOffer.status !== "accepted") ? (
                      <Button className="flex-1 h-11 gap-2" onClick={() => setShowConfirmDialog(true)} disabled={submitting || !pricePerTon || Number(pricePerTon) <= 0}>
                        {!submitting && (editingOffer ? <Edit className="h-4 w-4" /> : <Send className="h-4 w-4" />)}
                        {submitting ? (pdfUploadProgress ? "Uploading Files..." : "Processing...") : (editingOffer ? "Proceed to Confirm" : "Proceed to Confirm")}
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-2 bg-green-50 text-green-700 rounded-md border border-green-200 font-medium">
                        Quote Accepted - Cannot be modified
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
