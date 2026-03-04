"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2, ShoppingCart, ArrowLeft, ArrowRight, Pencil, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart, CartItem } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createInquiry } from "@/lib/store"

export default function CartPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { cart, removeFromCart, updateCartItem, clearCart } = useCart()

    const [submitting, setSubmitting] = useState(false)
    const [step, setStep] = useState<"cart" | "delivery" | "preview">("cart")
    const [biddingDuration, setBiddingDuration] = useState("3") // Default to 3 days
    const [deliveryDetails, setDeliveryDetails] = useState({
        deliveryAddress: "",
        district: "",
        state: "",
        pinCode: "",
    })

    // Editing State
    const [editingIdx, setEditingIdx] = useState<number | null>(null)
    const [editingItem, setEditingItem] = useState<CartItem | null>(null)
    const [productOptions, setProductOptions] = useState<any[]>([])

    useEffect(() => {
        if (editingItem && editingItem.product) {
            fetch(`/api/products/options?productName=${encodeURIComponent(editingItem.product)}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setProductOptions(data)
                    else setProductOptions([])
                })
                .catch(() => setProductOptions([]))
        } else {
            setProductOptions([])
        }
    }, [editingItem?.product])

    const startEditing = (idx: number, item: CartItem) => {
        setEditingIdx(idx)
        setEditingItem({ ...item })
    }

    const cancelEditing = () => {
        setEditingIdx(null)
        setEditingItem(null)
        setProductOptions([])
    }

    const updateEditingOption = (optionName: string, value: string | string[]) => {
        if (!editingItem) return
        setEditingItem(prev => ({
            ...prev!,
            options: {
                ...(prev!.options || {}),
                [optionName]: value
            }
        }))
    }

    const toggleEditingCheckbox = (optionName: string, value: string) => {
        if (!editingItem) return
        setEditingItem(prev => {
            const currentOptions = prev!.options?.[optionName] as string[] || [];
            let newOptions;
            if (currentOptions.includes(value)) {
                newOptions = currentOptions.filter(v => v !== value);
            } else {
                newOptions = [...currentOptions, value];
            }
            return {
                ...prev!,
                options: {
                    ...(prev!.options || {}),
                    [optionName]: newOptions
                }
            }
        })
    }

    const saveEdit = () => {
        if (editingIdx !== null && editingItem) {

            // Validate required fields
            for (const opt of productOptions) {
                const optionKey = (() => {
                    const hasDuplicates = productOptions.filter((o) => o.option_name === opt.option_name).length > 1;
                    return hasDuplicates ? `${opt.option_name} (${opt.option_type})` : opt.option_name;
                })();

                const val = editingItem.options?.[optionKey];

                if (opt.option_type === 'checkbox') {
                    if (!val || (Array.isArray(val) && val.length === 0)) {
                        toast.error(`Please select at least one value for ${opt.option_name}`)
                        return
                    }
                } else {
                    if (!val || String(val).trim() === '') {
                        toast.error(`Please provide a value for ${opt.option_name}`)
                        return
                    }
                }
            }

            updateCartItem(editingIdx, editingItem)
            toast.success("Item updated")
            cancelEditing()
        }
    }

    const handleProceedToDelivery = () => {
        if (cart.length === 0) {
            toast.error("Your cart is empty")
            return
        }
        setStep("delivery")
    }

    const handleProceedToPreview = () => {
        if (!deliveryDetails.deliveryAddress || !deliveryDetails.district || !deliveryDetails.state || !deliveryDetails.pinCode) {
            toast.error("Please fill in all delivery address details")
            return
        }
        setStep("preview")
    }

    const submitInquiry = async () => {
        if (cart.length === 0) {
            toast.error("Your cart is empty")
            return
        }

        setSubmitting(true)
        try {
            // 1. Native Direct Mutation
            const inquiry = await createInquiry(
                user?.id as string,
                user?.name || "Unknown Buyer",
                cart,
                deliveryDetails,
                Number(biddingDuration) || 3
            );

            // 2. Ping backend for Whatsapp notifications
            const res = await fetch("/api/inquiries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inquiryId: inquiry.id,
                    buyerId: user?.id,
                    buyerName: user?.name,
                    items: cart,
                    deliveryDetails,
                    biddingDuration: Number(biddingDuration) || 3
                }),
            })
            if (!res.ok) throw new Error()
            toast.success("Inquiry submitted successfully!")
            clearCart() // Clear global cart 
            router.push("/dashboard/inquiries")
        } catch {
            toast.error("Failed to submit inquiry")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="mx-auto max-w-4xl relative">
            {/* ... Existing header code ... */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {step !== "cart" && (
                        <Button variant="outline" size="icon" onClick={() => setStep(step === "preview" ? "delivery" : "cart")}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h2 className="font-serif text-2xl font-bold text-foreground">
                            {step === "cart" && "My Cart"}
                            {step === "delivery" && "Delivery Details"}
                            {step === "preview" && "Preview & Submit"}
                        </h2>
                        <p className="mt-1 text-muted-foreground">
                            {step === "cart" && "Review your configured products before proceeding."}
                            {step === "delivery" && "Where should these products be delivered if accepted?"}
                            {step === "preview" && "Final review of your inquiry requirements."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {step === "cart" && (
                    <Card className="border-border">
                        <CardHeader className="bg-muted/30 border-b border-border">
                            <CardTitle className="flex items-center gap-2 font-serif text-foreground text-lg">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                                Items in Cart ({cart.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="h-16 w-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                                        <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-medium text-foreground mb-1">Your cart is empty</h3>
                                    <p className="text-muted-foreground mb-6">Looks like you haven't added any products yet.</p>
                                    <Button onClick={() => router.push("/dashboard/inquiry/new")}>
                                        Add Products
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                                                    <span className="bg-primary/10 text-primary py-0.5 px-2 rounded-md text-xs">#{idx + 1}</span>
                                                    {item.product}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => startEditing(idx, item)} className="text-primary hover:text-primary/90 hover:bg-primary/10 h-8">
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => removeFromCart(idx)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6">
                                                {item.paymentTerms && (
                                                    <div className="text-sm">
                                                        <span className="text-muted-foreground block text-xs uppercase tracking-wider font-medium mb-0.5">Payment Terms</span>
                                                        {item.paymentTerms} Days
                                                    </div>
                                                )}
                                                {/* Show dynamic options summary */}
                                                {Object.entries(item.options || {}).map(([k, v]) => {
                                                    const valStr = Array.isArray(v) ? v.join(", ") : v;
                                                    if (!valStr) return null;
                                                    return (
                                                        <div key={k} className="text-sm">
                                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider font-medium mb-0.5">{k}</span>
                                                            {valStr}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        {cart.length > 0 && (
                            <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-between items-center">
                                <Button variant="outline" onClick={() => router.push("/dashboard/inquiry/new")}>
                                    Continue Adding Products
                                </Button>
                                <Button onClick={handleProceedToDelivery} className="gap-2">
                                    Proceed to Delivery <ArrowRight className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                )}

                {step === "delivery" && (
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-serif text-foreground">
                                Delivery Details (For whole Inquiry)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-6">
                            <div>
                                <Label className="text-foreground">Delivery Address <span className="text-red-500 ml-1">*</span></Label>
                                <Textarea
                                    placeholder="Enter complete delivery address..."
                                    value={deliveryDetails.deliveryAddress}
                                    onChange={(e) => setDeliveryDetails(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                                    className="mt-1.5"
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <Label className="text-foreground">District <span className="text-red-500 ml-1">*</span></Label>
                                    <Input placeholder="Enter district" value={deliveryDetails.district} onChange={(e) => setDeliveryDetails(prev => ({ ...prev, district: e.target.value }))} className="mt-1.5" />
                                </div>
                                <div>
                                    <Label className="text-foreground">State <span className="text-red-500 ml-1">*</span></Label>
                                    <Input placeholder="Enter state" value={deliveryDetails.state} onChange={(e) => setDeliveryDetails(prev => ({ ...prev, state: e.target.value }))} className="mt-1.5" />
                                </div>
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <Label className="text-foreground">Pin Code <span className="text-red-500 ml-1">*</span></Label>
                                    <Input placeholder="Enter pin code" type="number" min="0" value={deliveryDetails.pinCode} onChange={(e) => setDeliveryDetails(prev => ({ ...prev, pinCode: e.target.value }))} className="mt-1.5" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-border p-6 flex justify-between">
                            <Button variant="outline" onClick={() => setStep("cart")}>Back to Cart</Button>
                            <Button onClick={handleProceedToPreview} className="gap-2">
                                Proceed to Review <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === "preview" && (
                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader className="bg-muted/30 border-b border-border py-4">
                                <CardTitle className="text-base font-serif">Products Overview ({cart.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="p-4 grid sm:grid-cols-4 gap-4">
                                            <div className="sm:col-span-1 font-medium">{item.product}</div>
                                            <div className="sm:col-span-3 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-2">
                                                {Object.entries(item.options || {}).map(([k, v]) => {
                                                    const valStr = Array.isArray(v) ? v.join(", ") : v;
                                                    if (!valStr) return null;
                                                    return (
                                                        <span key={k}><strong className="font-medium text-foreground">{k}:</strong> {valStr}</span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="bg-muted/30 border-b border-border py-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-serif">Delivery Requirements</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setStep("delivery")} className="h-8">Edit Details</Button>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="text-sm flex flex-col gap-1">
                                    <p className="font-medium">{deliveryDetails.deliveryAddress}</p>
                                    <p className="text-muted-foreground">{deliveryDetails.district}, {deliveryDetails.state}</p>
                                    <p className="text-muted-foreground">PIN: {deliveryDetails.pinCode}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="bg-muted/30 border-b border-border py-4 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-serif flex items-center gap-2">Bidding Duration</CardTitle>
                                    <p className="text-xs text-muted-foreground font-normal mt-0.5">How long should sellers have to submit their quotes?</p>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Select value={biddingDuration} onValueChange={setBiddingDuration}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Day</SelectItem>
                                        <SelectItem value="2">2 Days</SelectItem>
                                        <SelectItem value="3">3 Days (Default)</SelectItem>
                                        <SelectItem value="5">5 Days</SelectItem>
                                        <SelectItem value="7">1 Week</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        <div className="flex justify-between items-center bg-card border border-border rounded-lg p-6 shadow-sm">
                            <div>
                                <h3 className="font-medium text-foreground">Ready to Submit?</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">Once submitted, verified sellers will review your inquiry and provide quotes.</p>
                            </div>
                            <Button onClick={submitInquiry} disabled={submitting} size="lg" className="min-w-[150px]">
                                {submitting ? "Submitting..." : "Submit Inquiry"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingIdx !== null && editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                    <Card className="w-full max-w-2xl border-border shadow-2xl relative my-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 rounded-full"
                            onClick={cancelEditing}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <CardHeader className="border-b border-border bg-muted/30 pb-4">
                            <CardTitle className="font-serif text-xl flex items-center gap-2">
                                <Pencil className="h-5 w-5 text-primary" />
                                Edit Item
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid gap-6 max-h-[60vh] overflow-y-auto">
                            <div>
                                <Label className="text-foreground">Product</Label>
                                <Input value={editingItem.product} disabled className="mt-1.5 bg-muted/50 cursor-not-allowed" />
                            </div>

                            {/* Dynamic Product Options */}
                            {productOptions.length > 0 ? (
                                <div className="flex flex-col gap-5 border-t border-border pt-6">
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
                                                    <Select value={(editingItem.options?.[optionKey] as string) || ""} onValueChange={(v) => updateEditingOption(optionKey, v)}>
                                                        <SelectTrigger><SelectValue placeholder={`Select ${opt.option_name.toLowerCase()}`} /></SelectTrigger>
                                                        <SelectContent>
                                                            {(opt.dropdown_values || []).map((val: string, idx: number) => (
                                                                <SelectItem key={idx} value={val}>{val}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : opt.option_type === 'checkbox' ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full rounded-md border border-input bg-background p-4 min-h-[40px]">
                                                        {(opt.dropdown_values || []).length > 0 ? (
                                                            (opt.dropdown_values || []).map((val: string, idx: number) => (
                                                                <label key={idx} className="flex items-start gap-2 text-sm leading-tight cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={((editingItem.options?.[optionKey] as string[]) || []).includes(val)}
                                                                        onChange={() => toggleEditingCheckbox(optionKey, val)}
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
                                                        value={(editingItem.options?.[optionKey] as string) || ""}
                                                        onChange={(e) => updateEditingOption(optionKey, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : null}

                            <div className="border-t border-border pt-6">
                                <Label className="text-foreground">Payment Term (in Days)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 15"
                                    value={editingItem.paymentTerms || ""}
                                    onChange={(e) => setEditingItem(prev => ({ ...prev!, paymentTerms: e.target.value }))}
                                    className="mt-1.5"
                                    min="0"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-border bg-muted/30 p-6 flex justify-end gap-3 rounded-b-xl">
                            <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
                            <Button onClick={saveEdit}>Save Changes</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    )
}
