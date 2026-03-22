"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Package, MapPin, Send, Trash2, Clock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatOptionType, formatOptionLabel } from "@/lib/utils"
import { createInquiry } from "@/lib/store"

export interface CartItem {
  id?: string;
  product: string;
  sub_product?: string;
  paymentTerms: string;
  options: Record<string, string | string[]>;
}

const emptyItem: CartItem = {
  product: "",
  paymentTerms: "",
  options: {},
}

export default function NewInquiryPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Local cart state
  const [addedItems, setAddedItems] = useState<CartItem[]>([])
  const [currentItem, setCurrentItem] = useState<CartItem>({ ...emptyItem })

  // Submission fields
  const [biddingDuration, setBiddingDuration] = useState("1")
  const [deliveryLocation, setDeliveryLocation] = useState({
    state: "",
    district: ""
  })

  const [isLoaded, setIsLoaded] = useState(false)

  // Synchronize drafts with LocalStorage perfectly
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem("dnd_draft_items")
      if (savedItems) setAddedItems(JSON.parse(savedItems))

      const savedBidding = localStorage.getItem("dnd_draft_bidding")
      if (savedBidding) setBiddingDuration(savedBidding)

      const savedDelivery = localStorage.getItem("dnd_draft_delivery")
      if (savedDelivery) setDeliveryLocation(JSON.parse(savedDelivery))
    } catch (e) { }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("dnd_draft_items", JSON.stringify(addedItems))
      localStorage.setItem("dnd_draft_bidding", biddingDuration)
      localStorage.setItem("dnd_draft_delivery", JSON.stringify(deliveryLocation))
    }
  }, [addedItems, biddingDuration, deliveryLocation, isLoaded])

  // Data for products
  const [dynamicProducts, setDynamicProducts] = useState<{ name: string, sub_products: string[] }[]>([])
  const [productOptions, setProductOptions] = useState<any[]>([])

  // Location settings
  const [locationSettings, setLocationSettings] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])

  const [submitting, setSubmitting] = useState(false)

  // Fetch product definitions & options
  useEffect(() => {
    const fetchDynamicProducts = async () => {
      try {
        const res = await fetch("/api/products")
        if (res.ok) {
          const data = await res.json()
          setDynamicProducts(data.map((p: any) => ({ name: p.name, sub_products: p.sub_products || [] })))
        }
      } catch (err) {
        console.error("Failed to fetch products:", err)
      }
    }
    fetchDynamicProducts()

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

  useEffect(() => {
    if (currentItem.product) {
      const url = `/api/products/options?productName=${encodeURIComponent(currentItem.product)}${currentItem.sub_product ? `&subProduct=${encodeURIComponent(currentItem.sub_product)}` : ""}`
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const mappedOptions = data.map((opt: any) => ({
              ...opt,
              buyer_option_type: opt.buyer_option_type || (opt.form_type !== 'seller' ? opt.option_type : 'none')
            })).filter((opt: any) => opt.buyer_option_type !== 'none');

            const typeWeights: Record<string, number> = {
              'radio': 1, 'checkbox': 2, 'dropdown': 3, 'number': 4, 'text': 5
            };

            const groupWeights: Record<string, number> = {};
            mappedOptions.forEach((opt: any) => {
              const firstWord = opt.option_name.trim().split(' ')[0].toLowerCase();
              const w = typeWeights[opt.buyer_option_type] ?? 99;
              if (groupWeights[firstWord] === undefined || w < groupWeights[firstWord]) {
                groupWeights[firstWord] = w;
              }
            });

            mappedOptions.sort((a, b) => {
              const fwA = a.option_name.trim().split(' ')[0].toLowerCase();
              const fwB = b.option_name.trim().split(' ')[0].toLowerCase();

              const wA = groupWeights[fwA];
              const wB = groupWeights[fwB];

              if (wA !== wB) return wA - wB;

              if (a.option_name.toLowerCase() === "quantity type" && b.option_name.toLowerCase() === "quantity") return -1;
              if (a.option_name.toLowerCase() === "quantity" && b.option_name.toLowerCase() === "quantity type") return 1;

              return a.option_name.localeCompare(b.option_name);
            });

            setProductOptions(mappedOptions);
          } else {
            setProductOptions([])
          }
        })
        .catch(() => setProductOptions([]))
    } else {
      setProductOptions([])
    }
  }, [currentItem.product, currentItem.sub_product])

  const updateField = (field: keyof CartItem, value: string | number) => {
    setCurrentItem((prev) => ({ ...prev, [field]: value }))
  }

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
      const currentOptions = prev.options?.[optionName] as string[] || [];
      let newOptions;
      if (currentOptions.includes(value)) {
        newOptions = currentOptions.filter(v => v !== value);
      } else {
        newOptions = [...currentOptions, value];
      }
      return {
        ...prev,
        options: {
          ...(prev.options || {}),
          [optionName]: newOptions
        }
      }
    })
  }

  const validateForm = () => {
    if (!currentItem.product) {
      toast.error("Please select a Product")
      return false
    }

    for (const opt of productOptions) {
      const optionKey = (() => {
        const hasDuplicates = productOptions.filter((o) => o.option_name === opt.option_name).length > 1;
        return hasDuplicates ? `${opt.option_name} (${formatOptionType(opt.buyer_option_type)})` : opt.option_name;
      })();

      const val = currentItem.options?.[optionKey];

      if (opt.buyer_option_type === 'checkbox') {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Please select at least one value for ${opt.option_name}`)
          return false
        }
      } else if (opt.buyer_option_type === 'radio') {
        if (!val || String(val).trim() === '') {
          toast.error(`Please select a value for ${opt.option_name}`)
          return false
        }
      } else {
        if (!val || String(val).trim() === '') {
          toast.error(`Please provide a value for ${opt.option_name}`)
          return false
        }
      }
    }

    return true
  }

  const handleAddProduct = () => {
    if (!validateForm()) return

    const itemToSave = { ...currentItem, id: crypto.randomUUID() }
    setAddedItems(prev => [...prev, itemToSave])
    setCurrentItem({ ...emptyItem })
    toast.success("Product added to inquiry")
  }

  const handleKeepData = () => {
    if (!validateForm()) return

    const itemToSave = { ...currentItem, id: crypto.randomUUID() }
    setAddedItems(prev => [...prev, itemToSave])
    toast.success("Product added, form data retained")
  }

  const handleSubmitInquiry = async () => {
    if (addedItems.length === 0) {
      toast.error("Please add at least one product to the inquiry")
      return
    }

    // Validate minimum delivery details for buyer type
    if (locationSettings?.buyer_option_type !== "none") {
      if (!deliveryLocation.state || !deliveryLocation.district) {
        toast.error("Please provide both State and District for delivery.")
        return
      }
    }

    const durationDays = parseInt(biddingDuration)
    if (isNaN(durationDays) || durationDays <= 0) {
      toast.error("Please enter a valid number of days for bidding duration (e.g. 1, 2, 3...)")
      return
    }

    setSubmitting(true)

    try {
      const delivery = locationSettings?.buyer_option_type !== "none" ? {
        state: deliveryLocation.state,
        district: deliveryLocation.district
      } : undefined

      const itemsPayload = addedItems.map(item => ({
        product: item.product,
        sub_product: item.sub_product,
        paymentTerms: item.paymentTerms,
        options: item.options
      }))

      for (const item of itemsPayload) {
        const newInq = await createInquiry(
          user!.id,
          user?.name || user?.email || "Unknown",
          [item],
          delivery,
          durationDays
        )

        const res = await fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerId: user!.id,
            inquiryId: newInq.id,
            items: [item],
            biddingDuration: durationDays
          })
        })

        if (!res.ok) {
          console.error("Failed to trigger notification flow for:", newInq.id)
        }
      }

      localStorage.removeItem("dnd_draft_items")
      localStorage.removeItem("dnd_draft_bidding")
      localStorage.removeItem("dnd_draft_delivery")
      toast.success("Inquiry submitted successfully!")
      setAddedItems([])
      setBiddingDuration("1")
      setDeliveryLocation({
        state: "",
        district: "",
      })
      setCurrentItem({ ...emptyItem })
      router.push("/dashboard/inquiries")
    } catch (error: any) {
      toast.error(error.message || "Failed to submit inquiry")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-0">
      <div className="mb-4 md:mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Create New Inquiry</h2>
          <p className="mt-1 text-muted-foreground">
            Configure product specifications and submit your requirements.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-foreground">
              <Package className="h-5 w-5 text-primary" />
              Add Product to Inquiry
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-foreground">Select Product <span className="text-red-500 ml-1">*</span></Label>
                <Select value={currentItem.product} onValueChange={(v) => {
                  updateField("product", v);
                  updateField("sub_product", "");
                }}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {dynamicProducts.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentItem.product && dynamicProducts.find(p => p.name === currentItem.product)?.sub_products?.length! > 0 && (
                <div className="col-span-full space-y-2">
                  <Label className="text-foreground">Select Product Type<span className="text-red-500 ml-1">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {dynamicProducts.find(p => p.name === currentItem.product)?.sub_products.map((sub) => (
                      <label
                        key={sub}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${currentItem.sub_product === sub ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border hover:border-primary/50'}`}
                      >
                        <input
                          type="radio"
                          name="subProductInquiry"
                          value={sub}
                          checked={currentItem.sub_product === sub}
                          onChange={(e) => updateField("sub_product", e.target.value)}
                          className="hidden"
                        />
                        <span className="text-sm font-medium">{sub}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {productOptions.length > 0 && (
              <div className="flex flex-col gap-4 md:gap-5 border-t border-b border-border py-4 md:py-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Product Requirements</h3>
                {productOptions.map((opt) => {
                  const optionKey = (() => {
                    const hasDuplicates = productOptions.filter(o => o.option_name === opt.option_name).length > 1;
                    return hasDuplicates ? `${opt.option_name} (${formatOptionType(opt.buyer_option_type)})` : opt.option_name;
                  })();

                  return (
                    <div key={opt.id}>
                      <Label className="text-foreground mb-2 block">
                        {opt.option_name}
                        {productOptions.filter(o => o.option_name === opt.option_name).length > 1 && (
                          <span className="ml-1 text-muted-foreground">({formatOptionType(opt.buyer_option_type)})</span>
                        )}
                        <span className="text-red-500 ml-1">*</span>
                      </Label>

                      {opt.buyer_option_type === 'dropdown' ? (
                        <Select value={(currentItem.options?.[optionKey] as string) || ""} onValueChange={(v) => updateOption(optionKey, v)}>
                          <SelectTrigger><SelectValue placeholder={`Select ${opt.option_name.toLowerCase()}`} /></SelectTrigger>
                          <SelectContent>
                            {(opt.dropdown_values || []).map((val: string, idx: number) => (
                              <SelectItem key={idx} value={val}>{val}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : opt.buyer_option_type === 'checkbox' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full rounded-md border border-input bg-background p-4 min-h-[40px]">
                          {(opt.dropdown_values || []).length > 0 ? (
                            (opt.dropdown_values || []).map((val: string, idx: number) => (
                              <label key={idx} className="flex items-start gap-2 text-sm leading-tight cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={((currentItem.options?.[optionKey] as string[]) || []).includes(val)}
                                  onChange={() => toggleCheckboxOption(optionKey, val)}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>{val}</span>
                              </label>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic col-span-full">No choices configured</span>
                          )}
                        </div>
                      ) : opt.buyer_option_type === 'radio' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full rounded-md border border-input bg-background p-4 min-h-[40px]">
                          {(opt.dropdown_values || []).length > 0 ? (
                            (opt.dropdown_values || []).map((val: string, idx: number) => (
                              <label key={idx} className="flex items-start gap-2 text-sm leading-tight cursor-pointer">
                                <input
                                  type="radio"
                                  name={optionKey}
                                  checked={(currentItem.options?.[optionKey] as string) === val}
                                  onChange={() => updateOption(optionKey, val)}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>{val}</span>
                              </label>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic col-span-full">No choices configured</span>
                          )}
                        </div>
                      ) : (
                        <Input
                          type={opt.buyer_option_type === 'number' ? 'number' : 'text'}
                          min={opt.buyer_option_type === 'number' ? "0" : undefined}
                          placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                          value={(currentItem.options?.[optionKey] as string) || ""}
                          onChange={(e) => updateOption(optionKey, e.target.value)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 md:mt-2">
              <Button onClick={handleAddProduct} className="w-full sm:w-auto gap-2">
                <Plus className="h-4 w-4" /> Add to Inquiry (Clear Form)
              </Button>
              <Button onClick={handleKeepData} variant="secondary" className="w-full sm:w-auto gap-2">
                <Package className="h-4 w-4" /> Keep Data & Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {addedItems.length > 0 && (
          <Card className="border-border border-primary/20">
            <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
              <CardTitle className="text-[17px] font-serif flex items-center gap-2 text-primary">
                Selected Products
                <span className="bg-primary text-secondary text-xs h-5 w-5 rounded-full flex items-center justify-center font-bold">{addedItems.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {addedItems.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start gap-4 border border-border p-4 rounded-lg bg-background shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-1.5">
                    <div className="font-semibold text-[15px]">{item.product} {item.sub_product && <span className="text-muted-foreground font-normal text-sm">({item.sub_product})</span>}</div>
                    <div className="text-sm text-muted-foreground flex flex-col sm:flex-row flex-wrap gap-x-5 gap-y-1.5 mt-1">
                      {Object.entries(item.options).map(([k, v]) => (
                        <span key={k} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 bg-border rounded-full hidden sm:block"></span>
                          <span className="font-medium text-foreground/80">{formatOptionLabel(k)}:</span>
                          <span>{Array.isArray(v) ? v.join(", ") : v}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setAddedItems(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {addedItems.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Submission Details</CardTitle>
              <CardDescription>Configure delivery requirements and bidding timeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {locationSettings?.buyer_option_type && locationSettings.buyer_option_type !== "none" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-[15px] text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Delivery Location</h4>
                  <div className="grid gap-5 sm:grid-cols-2 p-5 bg-muted/20 border border-border rounded-lg">
                    {locationSettings.buyer_option_type === "dropdown" ? (
                      <>
                        <div className="space-y-2">
                          <Label>State <span className="text-red-500">*</span></Label>
                          <Select value={deliveryLocation.state} onValueChange={(val) => setDeliveryLocation(p => ({ ...p, state: val, district: "" }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map(l => (
                                <SelectItem key={l.id} value={l.state_name}>{l.state_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>District <span className="text-red-500">*</span></Label>
                          <Select disabled={!deliveryLocation.state} value={deliveryLocation.district} onValueChange={(val) => setDeliveryLocation(p => ({ ...p, district: val }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select District" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.find(l => l.state_name === deliveryLocation.state)?.districts?.map((d: string) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              )) || []}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>State <span className="text-red-500">*</span></Label>
                          <Input value={deliveryLocation.state} onChange={e => setDeliveryLocation(p => ({ ...p, state: e.target.value }))} placeholder="Enter State" />
                        </div>
                        <div className="space-y-2">
                          <Label>District <span className="text-red-500">*</span></Label>
                          <Input value={deliveryLocation.district} onChange={e => setDeliveryLocation(p => ({ ...p, district: e.target.value }))} placeholder="Enter District" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-1">
                <h4 className="font-medium text-[15px] text-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Bidding Timeline</h4>
                <div className="space-y-2 max-w-md">
                  <Label>Bidding Duration (Days) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={biddingDuration}
                    onChange={(e) => setBiddingDuration(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleSubmitInquiry} className="w-full h-12 text-[15px] gap-2 mt-4" disabled={submitting}>
                <Send className="h-5 w-5" />
                {submitting ? "Submitting Inquiry..." : "Submit Complete Inquiry"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
