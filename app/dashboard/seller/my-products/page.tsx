"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import { Loader2, Package, X, Save, MapPin } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { updateUser } from "@/lib/store"
import { ProductOption } from "@/lib/store"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export default function MyProductsPage() {
    const { user, updateUserData } = useAuth()
    const [loading, setLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        categories: user?.categories || [] as string[],
        sellerProductOptions: user?.sellerProductOptions || {} as Record<string, Record<string, any>>,
        availableLocations: user?.availableLocations || {} as Record<string, string[]>,
    })
    const [locations, setLocations] = useState<any[]>([])
    const [availableProducts, setAvailableProducts] = useState<{ id: string, name: string, sub_products?: string[] }[]>([])
    const [allOptions, setAllOptions] = useState<Record<string, ProductOption[]>>({})

    useEffect(() => {
        const fetchCats = async () => {
            try {
                const { getProducts, getAllSellerProductOptions } = await import("@/lib/store")
                const [data, optsData, locRes] = await Promise.all([
                    getProducts(),
                    getAllSellerProductOptions(),
                    fetch("/api/locations")
                ])
                setAvailableProducts(data)
                setAllOptions(optsData)
                if (locRes.ok) {
                    const locData = await locRes.json()
                    setLocations(locData)
                }
            } catch (err) {
                logger.error("Failed to fetch products for My Products page", { error: (err as Error).message })
            }
        }
        fetchCats()
    }, [])

    useEffect(() => {
        if (!isEditing && user) {
            setFormData({
                categories: user.categories || [],
                sellerProductOptions: user.sellerProductOptions || {},
                availableLocations: user.availableLocations || {},
            })
        }
    }, [user, isEditing])

    const handleSave = async () => {
        if (!user) return

        setLoading(true)
        try {
            const data = await updateUser(user.id, {
                categories: formData.categories,
                sellerProductOptions: formData.sellerProductOptions,
                availableLocations: formData.availableLocations,
            })

            if (!data) {
                throw new Error("Failed to update products")
            }

            if (updateUserData) {
                updateUserData(data)
            }

            toast.success("Products updated successfully")
            setIsEditing(false)
        } catch (error) {
            logger.error("Failed to update products", { error: (error as Error)?.message })
            toast.error(error instanceof Error ? error.message : "Failed to update products")
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setFormData({
            categories: user?.categories || [],
            sellerProductOptions: user?.sellerProductOptions || {},
            availableLocations: user?.availableLocations || {},
        })
        setIsEditing(false)
    }

    if (user?.role !== "seller" && user?.role !== "both") {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">You don't have permission to view this page.</p>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground">My Products</h2>
                    <p className="mt-1 text-muted-foreground">
                        Manage the products and manufacturers you supply. You will only receive inquiries for these products.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                        <Package className="mr-2 h-4 w-4" />
                        Edit Products
                    </Button>
                )}
            </div>

            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Products I Sell
                    </CardTitle>
                    <CardDescription>
                        {isEditing
                            ? "Add or remove products, and select the specific options you deal in."
                            : "The list of products and supply parameters you currently accept."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="pb-6 mb-4 border-b">
                                    <Label htmlFor="add-product" className="text-sm font-semibold text-foreground mb-2 block">Add a New Product</Label>
                                    <p className="text-xs text-muted-foreground mb-3">Select a product category from the list to add it to your portfolio.</p>
                                    <div className="max-w-md">
                                        <select
                                            id="add-product"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            onChange={(e) => {
                                                const val = e.target.value
                                                if (val && !formData.categories.includes(val)) {
                                                    setFormData({
                                                        ...formData,
                                                        categories: [...formData.categories, val]
                                                    })
                                                }
                                                e.target.value = "" // Reset select
                                            }}
                                        >
                                            <option value="">-- Choose a product to add --</option>
                                            {availableProducts
                                                .filter(p => !formData.categories.includes(p.name))
                                                .map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-b pb-2">
                                    <Label className="text-sm font-semibold text-muted-foreground">Selected Products</Label>
                                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                                        {formData.categories.length} product(s)
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {formData.categories.map((catName) => {
                                        const productObj = availableProducts.find(p => p.name === catName)
                                        const pOptions = productObj ? allOptions[productObj.id] : []
                                        const selectedOptions = formData.sellerProductOptions[catName] || {}

                                        return (
                                            <div
                                                key={catName}
                                                className="flex flex-col gap-3 p-4 rounded-xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2 font-medium text-lg text-foreground pl-2">
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                        {catName}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newOptMap = { ...formData.sellerProductOptions }
                                                            delete newOptMap[catName]
                                                            setFormData({
                                                                ...formData,
                                                                categories: formData.categories.filter(c => c !== catName),
                                                                sellerProductOptions: newOptMap
                                                            })
                                                        }}
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                                                        title="Remove product entirely"
                                                    >
                                                        <X className="h-4 w-4 mr-1" /> Remove
                                                    </Button>
                                                </div>

                                                {productObj?.sub_products && productObj.sub_products.length > 0 && (
                                                    <div className="mt-2 pl-2 border-b pb-4 mb-2">
                                                        <Label className="text-xs font-semibold text-muted-foreground mb-3 block">Sub-Products you supply for this product:</Label>
                                                        <div className="flex flex-wrap gap-2.5">
                                                            {productObj.sub_products.map(sub => {
                                                                const currentOptVals = selectedOptions["Sub-Products"] || []
                                                                const isChecked = Array.isArray(currentOptVals) && currentOptVals.includes(sub)
                                                                return (
                                                                    <label key={sub} className={`flex items-center gap-2 text-sm cursor-pointer transition-colors px-3 py-1.5 rounded-lg border ${isChecked ? 'bg-primary/5 border-primary/30 text-foreground font-medium' : 'bg-muted/30 border-transparent hover:border-border text-foreground'}`}>
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked: boolean) => {
                                                                                setFormData(prev => {
                                                                                    const prevSelected = prev.sellerProductOptions[catName]?.[`Sub-Products`] || []
                                                                                    const newSelected = checked
                                                                                        ? [...prevSelected, sub]
                                                                                        : prevSelected.filter((m: string) => m !== sub)
                                                                                    return {
                                                                                        ...prev,
                                                                                        sellerProductOptions: {
                                                                                            ...prev.sellerProductOptions,
                                                                                            [catName]: {
                                                                                                ...(prev.sellerProductOptions[catName] || {}),
                                                                                                [`Sub-Products`]: newSelected
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                })
                                                                            }}
                                                                            className="h-4 w-4 rounded-sm"
                                                                        />
                                                                        {sub}
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {pOptions && pOptions.length > 0 && (
                                                    <div className="mt-2 pl-2 space-y-6">
                                                        {pOptions.map(opt => {
                                                            const isMulti = opt.seller_option_type === "dropdown" || opt.seller_option_type === "checkbox"
                                                            const isText = opt.seller_option_type === "text" || opt.seller_option_type === "number"

                                                            if (isMulti && opt.dropdown_values && opt.dropdown_values.length > 0) {
                                                                const currentOptVals = selectedOptions[opt.option_name] || []
                                                                return (
                                                                    <div key={opt.id}>
                                                                        <Label className="text-xs font-semibold text-muted-foreground mb-3 block">{opt.option_name}:</Label>
                                                                        <div className="flex flex-wrap gap-2.5">
                                                                            {opt.dropdown_values.map(val => {
                                                                                const isChecked = Array.isArray(currentOptVals) && currentOptVals.includes(val)
                                                                                return (
                                                                                    <label key={val} className={`flex items-center gap-2 text-sm cursor-pointer transition-colors px-3 py-1.5 rounded-lg border ${isChecked ? 'bg-primary/5 border-primary/30 text-foreground font-medium' : 'bg-muted/30 border-transparent hover:border-border text-foreground'}`}>
                                                                                        <Checkbox
                                                                                            checked={isChecked}
                                                                                            onCheckedChange={(checked: boolean) => {
                                                                                                setFormData(prev => {
                                                                                                    const prevSelected = prev.sellerProductOptions[catName]?.[opt.option_name] || []
                                                                                                    const newSelected = checked
                                                                                                        ? [...prevSelected, val]
                                                                                                        : prevSelected.filter((m: string) => m !== val)

                                                                                                    return {
                                                                                                        ...prev,
                                                                                                        sellerProductOptions: {
                                                                                                            ...prev.sellerProductOptions,
                                                                                                            [catName]: {
                                                                                                                ...(prev.sellerProductOptions[catName] || {}),
                                                                                                                [opt.option_name]: newSelected
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                })
                                                                                            }}
                                                                                            className="h-4 w-4 rounded-sm"
                                                                                        />
                                                                                        {val}
                                                                                    </label>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            } else if (isText) {
                                                                const currentVal = selectedOptions[opt.option_name] || ""
                                                                return (
                                                                    <div key={opt.id} className="max-w-md">
                                                                        <Label className="text-xs font-semibold text-muted-foreground mb-2 block">{opt.option_name}:</Label>
                                                                        <Input
                                                                            type={opt.seller_option_type === "number" ? "number" : "text"}
                                                                            value={currentVal}
                                                                            onChange={(e) => {
                                                                                setFormData(prev => ({
                                                                                    ...prev,
                                                                                    sellerProductOptions: {
                                                                                        ...prev.sellerProductOptions,
                                                                                        [catName]: {
                                                                                            ...(prev.sellerProductOptions[catName] || {}),
                                                                                            [opt.option_name]: e.target.value
                                                                                        }
                                                                                    }
                                                                                }))
                                                                            }}
                                                                            placeholder={`Enter supported ${opt.option_name.toLowerCase()}`}
                                                                        />
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {formData.categories.length === 0 && (
                                        <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                                            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                                            <p className="text-sm font-medium text-foreground">No products selected yet</p>
                                            <p className="text-xs text-muted-foreground mt-1">Please add the products you deal in below.</p>
                                        </div>
                                    )}
                                </div>


                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {user?.categories && user.categories.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {user.categories.map((cat) => (
                                        <div key={cat} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                                            <div className="font-semibold text-lg text-foreground flex items-center gap-2 mb-3 border-b pb-2">
                                                <Package className="h-5 w-5 text-primary" />
                                                {cat}
                                            </div>
                                            <div className="space-y-4">
                                                {user.sellerProductOptions?.[cat] && Object.keys(user.sellerProductOptions[cat]).length > 0 ? (
                                                    Object.entries(user.sellerProductOptions[cat]).map(([optName, optVals]) => {
                                                        const isArray = Array.isArray(optVals);
                                                        const holdsData = isArray ? optVals.length > 0 : Boolean(optVals);
                                                        if (!holdsData) return null;
                                                        return (
                                                            <div key={optName}>
                                                                <Label className="text-xs text-muted-foreground mb-2 block">{optName}:</Label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {isArray ? (optVals as string[]).map((val: string) => (
                                                                        <span key={val} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
                                                                            {val}
                                                                        </span>
                                                                    )) : (
                                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
                                                                            {String(optVals)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground mb-2 block">Configurations:</Label>
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary/50 text-secondary-foreground border border-border/50 italic">
                                                            No restrictions defined
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-40" />
                                    <h3 className="text-lg font-medium text-foreground mb-1">No products added yet</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                        You haven't added any products to your portfolio. Click "Edit Products" to start receiving inquiries.
                                    </p>
                                    <Button onClick={() => setIsEditing(true)}>
                                        <Package className="mr-2 h-4 w-4" /> Add Your First Product
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Service Areas Card */}
            <Card className="border-border mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Available Delivery Locations
                    </CardTitle>
                    <CardDescription>
                        {isEditing
                            ? "Select the states and districts you can deliver your products to."
                            : "The geographic regions where you currently provide delivery services."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="space-y-6">
                            {locations.length > 0 ? locations.map((loc) => {
                                const isStateChecked = !!formData.availableLocations[loc.state_name]
                                const selectedDistricts = formData.availableLocations[loc.state_name] || []
                                return (
                                    <div key={loc.id} className="p-4 rounded-xl border bg-muted/10">
                                        <label className="flex items-center gap-3 font-semibold text-foreground cursor-pointer mb-3">
                                            <Checkbox
                                                checked={isStateChecked}
                                                onCheckedChange={(checked: boolean) => {
                                                    setFormData(prev => {
                                                        const newLocs = { ...prev.availableLocations }
                                                        if (checked) {
                                                            newLocs[loc.state_name] = []
                                                        } else {
                                                            delete newLocs[loc.state_name]
                                                        }
                                                        return { ...prev, availableLocations: newLocs }
                                                    })
                                                }}
                                                className="h-5 w-5"
                                            />
                                            {loc.state_name}
                                        </label>

                                        {isStateChecked && loc.districts && loc.districts.length > 0 && (
                                            <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {loc.districts.map((dist: string) => {
                                                    const isDistChecked = selectedDistricts.includes(dist)
                                                    return (
                                                        <label key={dist} className={`flex items-center gap-2 text-sm cursor-pointer transition-colors px-3 py-2 rounded-lg border ${isDistChecked ? 'bg-primary/5 border-primary/30 text-foreground font-medium' : 'bg-background hover:border-border text-foreground'}`}>
                                                            <Checkbox
                                                                checked={isDistChecked}
                                                                onCheckedChange={(checked: boolean) => {
                                                                    setFormData(prev => {
                                                                        const prevDist = prev.availableLocations[loc.state_name] || []
                                                                        const newDist = checked
                                                                            ? [...prevDist, dist]
                                                                            : prevDist.filter(d => d !== dist)
                                                                        return {
                                                                            ...prev,
                                                                            availableLocations: {
                                                                                ...prev.availableLocations,
                                                                                [loc.state_name]: newDist
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                                className="h-4 w-4 rounded-sm"
                                                            />
                                                            {dist}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {isStateChecked && (!loc.districts || loc.districts.length === 0) && (
                                            <p className="ml-8 text-sm text-muted-foreground italic">Entire state active.</p>
                                        )}
                                    </div>
                                )
                            }) : (
                                <p className="text-muted-foreground text-sm">No locations configured by admin yet.</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {user?.availableLocations && Object.keys(user.availableLocations).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(user.availableLocations).map(([state, districts]) => (
                                        <div key={state} className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                                            <div className="font-semibold text-lg text-foreground flex items-center gap-2 mb-3 border-b pb-2">
                                                <MapPin className="h-5 w-5 text-primary" />
                                                {state}
                                            </div>
                                            <div className="space-y-4">
                                                {districts.length > 0 ? (
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground mb-2 block">Covered Districts:</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {districts.map((val: string) => (
                                                                <span key={val} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border border-border">
                                                                    {val}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary/50 text-secondary-foreground border border-border/50 italic">
                                                            All Districts Covered
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed">
                                    <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-40" />
                                    <h3 className="text-lg font-medium text-foreground mb-1">No locations selected</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                        You haven't specified your delivery boundaries. Click "Edit Products" to define your coverage map.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isEditing && (
                <div className="flex w-full justify-end gap-3 mt-8">
                    <Button variant="outline" onClick={handleCancel} disabled={loading} className="px-6">Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="px-6">
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                    </Button>
                </div>
            )}
        </div>
    )
}
