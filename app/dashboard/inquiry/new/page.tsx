"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MapPin, Package, X, Send, ShoppingCart, Loader2, Lock, Plus } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatOptionType, formatOptionLabel } from "@/lib/utils"
import { createInquiry } from "@/lib/store"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

export interface CartItem {
  id?: string;
  product: string;
  sub_product?: string;
  paymentTerms: string;
  options: Record<string, string | string[]>;
  remarks?: string;
  groupId?: string;
}

const emptyItem: CartItem = {
  product: "",
  paymentTerms: "",
  options: {},
  remarks: "",
}

export default function NewInquiryPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState<1 | 2>(1)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isModalOpen])

  // Single Item Config State
  const [currentItem, setCurrentItem] = useState<CartItem>({ ...emptyItem })
  const [addedItems, setAddedItems] = useState<CartItem[]>([])

  // Submission fields
  const [biddingDuration, setBiddingDuration] = useState("1")
  const [deliveryLocation, setDeliveryLocation] = useState({
    state: "",
    district: ""
  })

  // Data for products
  const [dynamicProducts, setDynamicProducts] = useState<{ id: string, name: string, sub_products: string[], image_url?: string }[]>([])
  const [allOptions, setAllOptions] = useState<any[]>([])
  const [productOptions, setProductOptions] = useState<any[]>([])

  // Location settings
  const [locationSettings, setLocationSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)

  // All-Table Product Catalog State
  const [catalogData, setCatalogData] = useState<{ sellerId: string; sellerName: string; contactEmail: string; contactPhone: string; values: Record<string, string> }[]>([])
  const [revealedContacts, setRevealedContacts] = useState<Set<number>>(new Set())
  const [loadingCatalog, setLoadingCatalog] = useState(false)

  // Fetch product definitions & options
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingProducts(true)
        const [prodRes, optRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/products/options/all")
        ])

        if (prodRes.ok) {
          const data = await prodRes.json()
          setDynamicProducts(data.map((p: any) => ({
            id: p.id,
            name: p.name,
            sub_products: p.sub_products || [],
            image_url: p.image_url
          })))
        }

        if (optRes.ok) {
          const data = await optRes.json()
          setAllOptions(data)
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err)
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchInitialData()

    // Fetch locations for dropdowns
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLocations(data)
      })
      .catch((err) => console.error(err))

    // Fetch Global Location Settings
    import("firebase/firestore").then(({ doc, getDoc }) => {
      import("@/lib/firebase").then(({ db }) => {
        getDoc(doc(db, "settings", "location")).then((snap) => {
          if (snap.exists()) {
            setLocationSettings(snap.data())
          } else {
            setLocationSettings({ buyer_option_type: "dropdown", seller_option_type: "none" }) // default fallback
          }
        }).catch(err => console.error("Failed to load location settings:", err))
      })
    })
  }, [])

  const sortOptions = (options: any[]) => {
    const typeWeights: Record<string, number> = {
      'radio': 1, 'checkbox': 2, 'dropdown': 3, 'number': 4, 'text': 5
    };

    const groupWeights: Record<string, number> = {};
    options.forEach((opt: any) => {
      const firstWord = opt.option_name.trim().split(' ')[0].toLowerCase();
      const w = typeWeights[opt.buyer_option_type] ?? 99;
      if (groupWeights[firstWord] === undefined || w < groupWeights[firstWord]) {
        groupWeights[firstWord] = w;
      }
    });

    return [...options].sort((a, b) => {
      const isLockedA = a.seller_option_type !== 'none';
      const isLockedB = b.seller_option_type !== 'none';
      if (isLockedA && !isLockedB) return -1;
      if (!isLockedA && isLockedB) return 1;

      const nameA = a.option_name.toLowerCase().trim();
      const nameB = b.option_name.toLowerCase().trim();

      const specialOrder = ["quantity measurement", "quantity"];
      const idxA = specialOrder.indexOf(nameA);
      const idxB = specialOrder.indexOf(nameB);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return 1;
      if (idxB !== -1) return -1;

      const fwA = a.option_name.trim().split(' ')[0].toLowerCase();
      const fwB = b.option_name.trim().split(' ')[0].toLowerCase();

      const wA = groupWeights[fwA];
      const wB = groupWeights[fwB];

      if (wA !== wB) return wA - wB;

      return a.option_name.localeCompare(b.option_name);
    });
  };

  // Filter options when selected product changes (in Modal)
  useEffect(() => {
    if (currentItem.product && isModalOpen && allOptions.length > 0) {
      const product = dynamicProducts.find(p => p.name === currentItem.product);
      if (!product) return;

      const filteredOptions = allOptions.filter((opt: any) => {
        const matchesProduct = String(opt.product_id) === String(product.id);
        const matchesSubProduct = currentItem.sub_product ? opt.sub_product === currentItem.sub_product : !opt.sub_product;
        return matchesProduct && matchesSubProduct;
      });

      const mappedOptions = filteredOptions.map((opt: any) => ({
        ...opt,
        buyer_option_type: opt.buyer_option_type || (opt.form_type !== 'seller' ? opt.option_type : 'none'),
        seller_option_type: opt.seller_option_type || (opt.form_type === 'seller' ? opt.option_type : 'none')
      })).filter((opt: any) => opt.buyer_option_type !== 'none');

      const sorted = sortOptions(mappedOptions);
      setProductOptions(sorted);
    } else {
      setProductOptions([])
    }
  }, [currentItem.product, currentItem.sub_product, isModalOpen, allOptions, dynamicProducts])

  // Detect if ALL buyer options are table type
  const isAllTableProduct = (currentItem.product === "Stock of non-standard Color-coated coils/sheets") || (productOptions.length > 0 && productOptions.every((opt: any) => opt.buyer_option_type === 'table'));

  // Fetch seller catalog data for all-table products
  useEffect(() => {
    if (!isAllTableProduct || !currentItem.product) {
      setCatalogData([]);
      setRevealedContacts(new Set());
      return;
    }
    const fetchCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        // Query all sellers who sell this product
        const usersSnap = await getDocs(
          query(
            collection(db, "sellers"),
            where("categories", "array-contains", currentItem.product)
          )
        );

        const getSafeArray = (data: any): any[] => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (typeof data === 'object' && Object.keys(data).length > 0) return [data];
          return [];
        };

        const rows: typeof catalogData = [];

        for (const doc of usersSnap.docs) {
          const seller = doc.data();
          const rawItems = getSafeArray(seller.seller_product_options?.[currentItem.product]);
          
          // Filter by sub_product if buyer has selected one
          const filteredItems = currentItem.sub_product
            ? rawItems.filter(item => !item["Sub-Products"] || item["Sub-Products"] === currentItem.sub_product)
            : rawItems;

          for (const item of filteredItems) {
            const values: Record<string, string> = {};
            for (const [k, v] of Object.entries(item)) {
              values[k] = Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "");
            }
            rows.push({
              sellerId: doc.id,
              sellerName: seller.name || seller.company_name || "Seller",
              contactEmail: seller.email || "",
              contactPhone: seller.phone || "",
              values,
            });
          }
        }

        setCatalogData(rows);
      } catch (err) {
        console.error("Failed to fetch catalog data:", err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, [isAllTableProduct, currentItem.product, currentItem.sub_product, productOptions]);

  const updateOption = (optionName: string, value: string | string[]) => {
    setCurrentItem(prev => ({
      ...prev,
      options: {
        ...(prev.options || {}),
        [optionName]: value
      }
    }))
  }

  const toggleCheckboxOption = (optionName: string, value: string) => {
    setCurrentItem(prev => {
      const currentOptions = (prev.options?.[optionName] as string[]) || []
      let newOptions
      if (currentOptions.includes(value)) {
        newOptions = currentOptions.filter((v) => v !== value)
      } else {
        newOptions = [...currentOptions, value]
      }
      return {
        ...prev,
        options: {
          ...(prev.options || {}),
          [optionName]: newOptions,
        },
      }
    })
  }

  const validateForm = () => {
    if (!currentItem.product) {
      toast.error("Please select a Product")
      return false
    }

    for (const opt of productOptions) {
      // Skip table-type fields — data is provided by the seller
      if (opt.buyer_option_type === 'table') continue;

      const optionKey = (() => {
        const hasDuplicates = productOptions.filter((o) => o.option_name === opt.option_name).length > 1;
        return hasDuplicates ? `${opt.option_name} (${formatOptionType(opt.buyer_option_type)})` : opt.option_name;
      })();

      const val = currentItem.options?.[optionKey]

      if (opt.buyer_option_type === "checkbox") {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Please select at least one value for ${opt.option_name}`)
          return false
        }
      } else if (opt.buyer_option_type === "radio") {
        if (!val || String(val).trim() === "") {
          toast.error(`Please select a value for ${opt.option_name}`)
          return false
        }
      } else {
        if (!val || String(val).trim() === "") {
          toast.error(`Please provide a value for ${opt.option_name}`)
          return false
        }
      }
    }

    return true
  }

  const handleOpenModal = (product: any) => {
    setSelectedProduct(product)
    setCurrentItem({
      product: product.name,
      paymentTerms: "",
      options: {}
    })
    setModalStep(1)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
    setCurrentItem({ ...emptyItem })
    setAddedItems([])
  }

  const handleAddItem = () => {
    if (!validateForm()) return
    const newAdded = [...addedItems, { ...currentItem }]
    setAddedItems(newAdded)

    // For "another" entry same product, keep the form values as they are,
    // so the user can just modify the "unlocked" parts and add again.

    toast.success("Item added to inquiry stack")
  }

  const handleContinueToStep2 = () => {
    if (addedItems.length === 0) {
      toast.error("Please add at least one item to proceed")
      return
    }
    setModalStep(2)
  }

  const handleSubmitInquiry = async () => {
    // Final check for addedItems
    if (addedItems.length === 0) {
      toast.error("No items added to inquiry")
      return
    }

    // Validate minimum delivery details for buyer type
    if (locationSettings?.buyer_option_type !== "none") {
      if (!deliveryLocation.state || !deliveryLocation.district) {
        toast.error("Please provide both State and District for delivery.")
        return
      }
    }

    setSubmitting(true)
    try {
      const delivery = locationSettings?.buyer_option_type !== "none" ? {
        state: deliveryLocation.state,
        district: deliveryLocation.district
      } : undefined

      const itemPayload = addedItems.map(item => ({
        product: item.product,
        sub_product: item.sub_product,
        paymentTerms: item.paymentTerms,
        options: item.options,
        remarks: item.remarks
      }))

      const newInq = await createInquiry(
        user!.id,
        null,
        itemPayload,
        delivery
      )

      // Trigger notification flow for this specific inquiry
      const resp = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: user!.id,
          inquiryId: newInq.id,
          items: itemPayload
        })
      })

      if (!resp.ok) {
        console.error("Failed to trigger notification flow for:", newInq.id)
      }

      toast.success("Inquiry submitted successfully!")
      handleCloseModal()
      router.push("/dashboard/inquiries")
    } catch (error: any) {
      toast.error(error.message || "Failed to submit inquiry")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl pb-20">
      {/* ─── Page Header ─── */}
      <div className="mb-8 mt-4">
        <h2 className="font-serif text-3xl font-bold text-foreground tracking-tight">Products</h2>
        <p className="mt-2 text-muted-foreground text-[15px]">
          Select a product, choose specification and Submit inquiry.
        </p>
      </div>

      {/* ─── Product Card Grid ─── */}
      {loadingProducts ? (
        <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="font-medium">Loading Products...</p>
        </div>
      ) : dynamicProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed border-border rounded-xl text-muted-foreground bg-muted/10">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p className="font-medium text-lg">No Products Available</p>
          <p className="text-sm">Please check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {dynamicProducts.map((p) => (
            <div key={p.name} className="flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div
                className="aspect-[4/3] bg-white relative overflow-hidden flex items-center justify-center p-4 cursor-pointer"
                onClick={() => handleOpenModal(p)}
              >
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground/30 group-hover:scale-105 transition-transform duration-300" />
                )}
              </div>
              <div className="p-5 flex flex-col flex-1 border-t border-border/50">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <h3 className="font-bold text-lg leading-tight text-card-foreground line-clamp-2" title={p.name}>
                    {p.name}
                  </h3>
                </div>

                <div className="mt-auto">
                  <Button
                    onClick={() => handleOpenModal(p)}
                    className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold rounded-xl transition-colors shadow-none"
                  >
                    SELECT
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal Overlay ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-muted/10">
              <div className="flex items-center gap-4">
                {selectedProduct?.image_url ? (
                  <div className="relative h-12 w-12 rounded-lg border border-border shadow-sm flex-shrink-0 overflow-hidden bg-white">
                    <Image src={selectedProduct.image_url} alt={selectedProduct.name} fill className="object-contain p-1" sizes="48px" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  <h2 className="text-xl font-bold text-foreground leading-tight">
                    {selectedProduct?.name}
                  </h2>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                    {isAllTableProduct ? 'Seller Directory' : (modalStep === 1 ? 'Configure Requirements' : 'Delivery Details')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseModal} className="h-8 w-8 rounded-full bg-background/50 hover:bg-muted shrink-0 ml-4">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 form-scrollbar">
              {modalStep === 1 && (
                <div className="space-y-6">
                  {/* Sub Products */}
                  {selectedProduct?.sub_products?.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center">
                        {currentItem.product === "Stock of non-standard Color-coated coils/sheets" ? "COLOR SERIES" : "Product Type"} <span className="text-primary ml-1">*</span>
                      </Label>
                      <Select
                        disabled={addedItems.length > 0}
                        value={currentItem.sub_product || ""}
                        onValueChange={(val) => {
                          if (addedItems.length === 0) {
                            setCurrentItem(prev => ({ ...prev, sub_product: val, options: {} }))
                          }
                        }}
                      >
                        <SelectTrigger className={`h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground ${addedItems.length > 0 ? "opacity-70 cursor-not-allowed" : ""}`}>
                          <SelectValue placeholder={currentItem.product === "Stock of non-standard Color-coated coils/sheets" ? "Select Color Series..." : "Select product type..."} />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          {selectedProduct.sub_products.map((sp: string) => (
                            <SelectItem key={sp} value={sp} className="font-medium">{sp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isAllTableProduct && currentItem.sub_product ? (
                    /* ── All-Table Product: Catalog View ── */
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Seller Directory</span>
                      </div>

                      {loadingCatalog ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading seller data...</span>
                        </div>
                      ) : catalogData.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center">
                          <p className="text-sm text-muted-foreground">No seller data available yet for this product.</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Sellers will provide tabular data when they submit quotations.</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border overflow-hidden bg-card">
                          <div className="overflow-x-scroll scrollbar-show-x">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/30 border-b border-border">
                                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground/80 w-8">#</th>
                                  {(() => {
                                    const FIELD_ORDER = ["Sub-Products", "Color", "Manufacturer", "Quantity(in tons)", "Location", "Comment"];
                                    const allCols = Array.from(new Set(catalogData.flatMap(r => Object.keys(r.values))));
                                    const sortedCols = [...FIELD_ORDER.filter(f => allCols.includes(f)), ...allCols.filter(f => !FIELD_ORDER.includes(f))];
                                    return sortedCols.map((col, ci) => (
                                      <th key={ci} className="px-3 py-2.5 text-left font-semibold text-foreground/80 whitespace-nowrap">
                                        {col === "Sub-Products" && currentItem.product === "Stock of non-standard Color-coated coils/sheets" ? "Color Series" : col}
                                      </th>
                                    ));
                                  })()}
                                  <th className="px-3 py-2.5 text-center font-semibold text-foreground/80 w-36">Contact</th>
                                </tr>
                              </thead>
                              <tbody>
                                {catalogData.map((row, rowIdx) => (
                                  <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                    <td className="px-3 py-2.5 text-muted-foreground font-medium">{rowIdx + 1}</td>
                                    {(() => {
                                      const FIELD_ORDER = ["Sub-Products", "Color", "Manufacturer", "Quantity(in tons)", "Location", "Comment"];
                                      const allCols = Array.from(new Set(catalogData.flatMap(r => Object.keys(r.values))));
                                      const sortedCols = [...FIELD_ORDER.filter(f => allCols.includes(f)), ...allCols.filter(f => !FIELD_ORDER.includes(f))];
                                      return sortedCols.map((col, ci) => (
                                        <td key={ci} className="px-3 py-2.5 text-foreground font-medium whitespace-nowrap">
                                          {row.values[col] || <span className="text-muted-foreground/50 italic">—</span>}
                                        </td>
                                      ));
                                    })()}
                                    <td className="px-3 py-2.5 text-center">
                                      {revealedContacts.has(rowIdx) ? (
                                        <div className="flex flex-col items-start gap-1 text-[10px] animate-in fade-in duration-300">
                                          <span className="font-bold text-foreground">{row.sellerName}</span>
                                          {row.contactEmail && (
                                            <span className="flex items-center gap-1 text-muted-foreground break-all">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                              {row.contactEmail}
                                            </span>
                                          )}
                                          {row.contactPhone && (
                                            <span className="flex items-center gap-1 text-muted-foreground">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                              {row.contactPhone}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[10px] font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/5 rounded-lg px-2.5"
                                          onClick={() => setRevealedContacts(prev => new Set(prev).add(rowIdx))}
                                        >
                                          <Lock className="h-3 w-3" />
                                          Seller Contact
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                  {/* Specs */}
                  {productOptions.length > 0 && (
                    <div className="space-y-5">
                      {(() => {
                        const lastLockedIndex = productOptions.reduce((acc, opt, idx) => {
                          const isLocked = addedItems.length > 0 && opt.seller_option_type !== 'none';
                          return isLocked ? idx : acc;
                        }, -1);

                        return productOptions.map((opt, idx) => {
                          const optionKey = (() => {
                            const hasDuplicates = productOptions.filter(o => o.option_name === opt.option_name).length > 1;
                            return hasDuplicates ? `${opt.option_name} (${formatOptionType(opt.buyer_option_type)})` : opt.option_name;
                          })();

                          const isLocked = addedItems.length > 0 && opt.seller_option_type !== 'none';

                          return (
                            <div key={opt.id} className="space-y-2">
                              <div className={isLocked && opt.buyer_option_type !== 'table' ? "opacity-70" : ""}>
                                <Label className="text-foreground mb-2 flex items-center text-sm font-semibold">
                                  {opt.option_name}
                                  {productOptions.filter(o => o.option_name === opt.option_name).length > 1 && (
                                    <span className="ml-1 text-muted-foreground text-xs font-normal">({formatOptionType(opt.buyer_option_type)})</span>
                                  )}
                                  {opt.buyer_option_type !== 'table' && <span className="text-primary ml-1">*</span>}
                                </Label>

                                {opt.buyer_option_type === 'dropdown' ? (
                                  <Select
                                    disabled={isLocked}
                                    value={(currentItem.options?.[optionKey] as string) || ""}
                                    onValueChange={(v) => updateOption(optionKey, v)}
                                  >
                                    <SelectTrigger className="h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground"><SelectValue placeholder={`Select ${opt.option_name.toLowerCase()}`} /></SelectTrigger>
                                    <SelectContent className="z-[200]">
                                      {(opt.dropdown_values || []).map((val: string, idx: number) => (
                                        <SelectItem key={idx} value={val} className="font-medium">{val}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : opt.buyer_option_type === 'checkbox' ? (
                                  <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full rounded-lg border border-border/60 bg-muted/20 p-4 ${isLocked ? "pointer-events-none" : ""}`}>
                                    {(opt.dropdown_values || []).length > 0 ? (
                                      (opt.dropdown_values || []).map((val: string, idx: number) => (
                                        <label key={idx} className={`flex items-start gap-2 text-sm leading-tight cursor-pointer text-foreground/90 hover:text-foreground font-medium`}>
                                          <input
                                            type="checkbox"
                                            disabled={isLocked}
                                            checked={((currentItem.options?.[optionKey] as string[]) || []).includes(val)}
                                            onChange={() => toggleCheckboxOption(optionKey, val)}
                                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                          />
                                          <span>{val}</span>
                                        </label>
                                      ))
                                    ) : (
                                      <span className="text-sm text-muted-foreground italic col-span-full">No choices configured</span>
                                    )}
                                  </div>
                                ) : opt.buyer_option_type === 'radio' ? (
                                  <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full rounded-lg border border-border/60 bg-muted/20 p-4 ${isLocked ? "pointer-events-none" : ""}`}>
                                    {(opt.dropdown_values || []).length > 0 ? (
                                      (opt.dropdown_values || []).map((val: string, idx: number) => (
                                        <label key={idx} className={`flex items-start gap-2 text-sm leading-tight cursor-pointer text-foreground/90 hover:text-foreground font-medium`}>
                                          <input
                                            type="radio"
                                            disabled={isLocked}
                                            name={optionKey}
                                            checked={(currentItem.options?.[optionKey] as string) === val}
                                            onChange={() => updateOption(optionKey, val)}
                                            className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-gray-300 text-primary focus:ring-primary accent-primary"
                                          />
                                          <span>{val}</span>
                                        </label>
                                      ))
                                    ) : (
                                      <span className="text-sm text-muted-foreground italic col-span-full">No choices configured</span>
                                    )}
                                  </div>
                                ) : opt.buyer_option_type === 'table' ? (
                                  <div className="w-full rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
                                      <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">Tabular Data</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      This information will be provided by the seller in a tabular format when they submit their quotation.
                                    </p>
                                    {(opt.table_columns && opt.table_columns.length > 0) && (
                                      <div className="rounded-md border border-border/40 overflow-x-auto mt-2">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-muted/30 border-b border-border/40">
                                              {opt.table_columns.map((col: string, ci: number) => (
                                                <th key={ci} className="px-3 py-1.5 text-left font-semibold text-muted-foreground/80">{col}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              {opt.table_columns.map((_: string, ci: number) => (
                                                <td key={ci} className="px-3 py-2 text-muted-foreground/50 italic">—</td>
                                              ))}
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Input
                                    disabled={isLocked}
                                    type={opt.buyer_option_type === 'number' ? 'number' : 'text'}
                                    min={opt.buyer_option_type === 'number' ? ((opt.option_name.toLowerCase().includes('quantity') || opt.option_name.toLowerCase().trim() === 'qty') ? "1" : "0.000001") : undefined}
                                    step={opt.buyer_option_type === 'number' && (opt.option_name.toLowerCase().includes('quantity') || opt.option_name.toLowerCase().trim() === 'qty') ? "1" : "any"}
                                    placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                                    value={(currentItem.options?.[optionKey] as string) || ""}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      if (val.startsWith('-')) return;
                                      if (opt.buyer_option_type === 'number' && (opt.option_name.toLowerCase().includes('quantity') || opt.option_name.toLowerCase().trim() === 'qty')) {
                                        val = val.replace(/[^\d]/g, '');
                                        if (val === '0') val = "";
                                      }
                                      updateOption(optionKey, val);
                                    }}
                                    className="h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground"
                                  />
                                )}
                              </div>
                              {idx === lastLockedIndex && (
                                <p className="text-[10px] text-muted-foreground/70 italic mt-1 px-1">
                                  * To unlock the Categories, Submit or Cancel the Product Inquiry
                                </p>
                              )}
                            </div>
                          )
                        });
                      })()}
                    </div>
                  )}

                  {/* Remarks Field */}
                  {(!selectedProduct?.sub_products?.length || currentItem.sub_product) && !isAllTableProduct && (
                    <div className="space-y-3 pt-4 border-t border-border/50">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center">
                        Additional Remarks / Comments (Optional)
                      </Label>
                      <Textarea
                        placeholder="Add any specific requirements or notes for the sellers..."
                        value={currentItem.remarks || ""}
                        onChange={(e) => setCurrentItem(prev => ({ ...prev, remarks: e.target.value }))}
                        className="resize-none h-20 bg-muted/30 border-border font-medium text-foreground"
                      />
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}

              {modalStep === 2 && (
                <div className="space-y-6">
                  {/* Product Detail Preview for All Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" /> Added Items ({addedItems.length})
                      </h3>
                    </div>
                    {addedItems.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-border/60 bg-secondary/30 overflow-hidden shadow-sm">
                        <div className="bg-secondary/40 px-4 py-3 border-b border-border/50 flex items-center justify-between">
                          <h3 className="font-bold text-[15px] text-foreground flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            {item.product}
                            {item.sub_product && <span className="text-muted-foreground font-semibold ml-1">({item.sub_product})</span>}
                          </h3>
                          <button
                            type="button"
                            className="btn-action-icon !w-6 !h-6"
                            onClick={() => setAddedItems(prev => prev.filter((_, i) => i !== idx))}
                            title="Remove item"
                          >
                            <X />
                          </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                          {Object.entries(item.options || {}).map(([k, v]) => (
                            <div key={k} className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">{formatOptionLabel(k)}</span>
                              <span className="text-sm font-bold text-foreground leading-tight">{Array.isArray(v) ? v.join(", ") : v}</span>
                            </div>
                          ))}
                          {item.remarks && (
                            <div className="flex flex-col gap-0.5 col-span-2 mt-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90">Remarks</span>
                              <span className="text-sm font-bold text-foreground leading-tight italic">{item.remarks}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {locationSettings?.buyer_option_type && locationSettings.buyer_option_type !== "none" && (
                    <div className="space-y-4">
                      <Label className="text-xs border-b border-border/50 pb-2.5 font-bold tracking-[0.1em] text-muted-foreground/80 flex items-center gap-2 uppercase">
                        <MapPin className="h-4 w-4 text-primary" /> Delivery Location
                      </Label>
                      <div className="grid gap-5 sm:grid-cols-2 p-1">
                        {locationSettings.buyer_option_type === "dropdown" ? (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">State <span className="text-primary">*</span></Label>
                              <Select value={deliveryLocation.state} onValueChange={(val) => setDeliveryLocation(p => ({ ...p, state: val, district: "" }))}>
                                <SelectTrigger className="h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground">
                                  <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  {locations.map(l => (
                                    <SelectItem className="font-medium" key={l.id} value={l.state_name}>{l.state_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">District <span className="text-primary">*</span></Label>
                              <Select disabled={!deliveryLocation.state} value={deliveryLocation.district} onValueChange={(val) => setDeliveryLocation(p => ({ ...p, district: val }))}>
                                <SelectTrigger className="h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground">
                                  <SelectValue placeholder="Select District" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  {locations.find(l => l.state_name === deliveryLocation.state)?.districts?.map((d: string) => (
                                    <SelectItem className="font-medium" key={d} value={d}>{d}</SelectItem>
                                  )) || []}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">State <span className="text-primary">*</span></Label>
                              <Input className="h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground" value={deliveryLocation.state} onChange={e => setDeliveryLocation(p => ({ ...p, state: e.target.value }))} placeholder="Enter State" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">District <span className="text-primary">*</span></Label>
                              <Input className="h-11 rounded-lg bg-muted/30 border-border font-medium text-foreground" value={deliveryLocation.district} onChange={e => setDeliveryLocation(p => ({ ...p, district: e.target.value }))} placeholder="Enter District" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border bg-muted/10">
              <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-3">
                <div className="w-full sm:w-auto flex justify-center sm:justify-start">
                  {!isAllTableProduct && modalStep === 2 && (
                    <Button variant="ghost" onClick={() => setModalStep(1)} className="w-full sm:w-auto font-medium text-muted-foreground hover:text-foreground">
                      Back to Requirements
                    </Button>
                  )}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                  {isAllTableProduct ? (
                    <Button variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto font-medium rounded-xl px-6">Close</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto font-medium rounded-xl">Cancel</Button>
                      {modalStep === 1 ? (
                        <Button
                          onClick={handleAddItem}
                          variant="outline"
                          className="w-full sm:w-auto font-bold rounded-xl border-primary text-primary hover:bg-primary/5 px-6"
                        >
                          Add Item
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmitInquiry}
                          disabled={submitting}
                          className="w-full sm:w-auto font-bold px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 border-none shadow-sm gap-2 flex items-center justify-center"
                        >
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Submit Inquiry
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

              {/* Added Items Preview below buttons - only in Step 1, not for all-table products */}
              {!isAllTableProduct && modalStep === 1 && addedItems.length > 0 && (
                <div className="px-6 pb-6 pt-0 border-t border-border/40 bg-muted/5">
                  <div className="mt-4 space-y-3 max-h-[150px] overflow-y-auto pr-2 form-scrollbar">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded">
                        Inquiry Stack ({addedItems.length})
                      </span>
                    </div>
                    {addedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 py-2 px-3 bg-muted/30 border border-border/50 rounded-lg group">
                        <div className="flex flex-col">
                          <div className="text-[13px] font-bold text-foreground truncate max-w-[300px]">
                            {item.product} {item.sub_product && <span className="text-muted-foreground font-normal">({item.sub_product})</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {Object.values(item.options).map(v => Array.isArray(v) ? v.join(", ") : v).join(" · ")}
                            {item.remarks && ` · Remarks: ${item.remarks}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-action-icon !w-6 !h-6"
                          onClick={() => setAddedItems(prev => prev.filter((_, i) => i !== idx))}
                          title="Remove item"
                        >
                          <X />
                        </button>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border/20 mt-4">
                      <Button
                        onClick={handleContinueToStep2}
                        className="w-full font-bold h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm"
                      >
                        Continue to Delivery Details
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
      )}
    </div >
  )
}
