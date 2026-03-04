"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Package } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart, CartItem } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const emptyItem: CartItem = {
  product: "",
  paymentTerms: "",
  options: {},
}

export default function NewInquiryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { cart, addToCart: addItemToCart } = useCart()
  const [currentItem, setCurrentItem] = useState<CartItem>({ ...emptyItem })
  const [dynamicProducts, setDynamicProducts] = useState<string[]>([])
  const [productOptions, setProductOptions] = useState<any[]>([])

  // Fetch admin products on mount
  useEffect(() => {
    const fetchDynamicProducts = async () => {
      try {
        const res = await fetch("/api/products")
        if (res.ok) {
          const data = await res.json()
          setDynamicProducts(data.map((p: any) => p.name))
        }
      } catch (err) {
        console.error("Failed to fetch products:", err)
      }
    }
    fetchDynamicProducts()
  }, [])

  // Fetch product options when product changes
  useEffect(() => {
    if (currentItem.product) {
      fetch(`/api/products/options?productName=${encodeURIComponent(currentItem.product)}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setProductOptions(data)
          } else {
            setProductOptions([])
          }
        })
        .catch(() => setProductOptions([]))
    } else {
      setProductOptions([])
    }
  }, [currentItem.product])

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

    // Check if all product options are filled
    for (const opt of productOptions) {
      const optionKey = (() => {
        const hasDuplicates = productOptions.filter((o) => o.option_name === opt.option_name).length > 1;
        return hasDuplicates ? `${opt.option_name} (${opt.option_type})` : opt.option_name;
      })();

      const val = currentItem.options?.[optionKey];

      if (opt.option_type === 'checkbox') {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Please select at least one value for ${opt.option_name}`)
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

  const handleAddToCart = () => {
    if (!validateForm()) return

    const itemToSave = { ...currentItem }
    addItemToCart(itemToSave)
    setCurrentItem({ ...emptyItem })
    toast.success("Item added to cart")
  }

  const handleKeepToCart = () => {
    if (!validateForm()) return

    const itemToSave = { ...currentItem }
    addItemToCart(itemToSave)
    toast.success("Item kept in cart, form data retained")
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Create New Inquiry</h2>
          <p className="mt-1 text-muted-foreground">
            Configure product specifications and add them to your cart.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Product Form */}
        <div>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-foreground">
                <Package className="h-5 w-5 text-primary" />
                Product Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground">Select Product <span className="text-red-500 ml-1">*</span></Label>
                  <Select value={currentItem.product} onValueChange={(v) => updateField("product", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {dynamicProducts.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Product Options */}
              {productOptions.length > 0 ? (
                <div className="flex flex-col gap-5 border-t border-b border-border py-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Product Options</h3>
                  {productOptions.map((opt) => {
                    const optionKey = (() => {
                      const hasDuplicates = productOptions.filter(o => o.option_name === opt.option_name).length > 1;
                      return hasDuplicates ? `${opt.option_name} (${opt.option_type})` : opt.option_name;
                    })();

                    return (
                      <div key={opt.id}>
                        <Label className="text-foreground mb-2 block">{opt.option_name} <span className="text-red-500 ml-1">*</span></Label>

                        {opt.option_type === 'dropdown' ? (
                          <Select value={(currentItem.options?.[optionKey] as string) || ""} onValueChange={(v) => updateOption(optionKey, v)}>
                            <SelectTrigger><SelectValue placeholder={`Select ${opt.option_name.toLowerCase()}`} /></SelectTrigger>
                            <SelectContent>
                              {(opt.dropdown_values || []).map((val: string, idx: number) => (
                                <SelectItem key={idx} value={val}>{val}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : opt.option_type === 'checkbox' ? (
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
                        ) : (
                          <Input
                            type={opt.option_type === 'number' ? 'number' : 'text'}
                            min={opt.option_type === 'number' ? "0" : undefined}
                            placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                            value={(currentItem.options?.[optionKey] as string) || ""}
                            onChange={(e) => updateOption(optionKey, e.target.value)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground">Payment Term (in Days)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 15"
                    value={currentItem.paymentTerms || ""}
                    onChange={(e) => updateField("paymentTerms", e.target.value)}
                    className="mt-1.5"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button onClick={handleAddToCart} className="gap-2 sm:w-auto">
                  <Plus className="h-4 w-4" /> Add to Cart (Clear Form)
                </Button>
                <Button onClick={handleKeepToCart} variant="secondary" className="gap-2 sm:w-auto">
                  <Package className="h-4 w-4" /> Keep to Cart (Keep Data)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
