"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import { Loader2, Package, X, Save, MapPin, Pencil, ChevronDown, ChevronRight, CheckCircle2, Circle, ShieldCheck, Layers, Globe, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { updateUser } from "@/lib/store"
import { ProductOption } from "@/lib/store"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function MyProductsPage() {
    const { user, updateUserData } = useAuth()
    const [loading, setLoading] = useState(false)
    const [editingProduct, setEditingProduct] = useState<string | null>(null)
    const [editingLocation, setEditingLocation] = useState<string | null>(null)
    const [expandedProducts, setExpandedProducts] = useState<string[]>([])
    const [expandedLocations, setExpandedLocations] = useState<string[]>([])

    // We maintain a local copy of the data for the item being edited
    const [tempProductItems, setTempProductItems] = useState<any[]>([])
    const [tempProductOptions, setTempProductOptions] = useState<Record<string, any>>({})
    const [tempLocationDistricts, setTempLocationDistricts] = useState<string[]>([])

    type SellerFormData = {
        categories: string[]
        sellerProductOptions: Record<string, any[]>
        availableLocations: Record<string, string[]>
    }

    const normalizeSellerProductOptions = (options: Record<string, any> | undefined): Record<string, any[]> => {
        if (!options) return {}
        return Object.entries(options).reduce((acc, [key, value]) => {
            acc[key] = Array.isArray(value) ? value : [value]
            return acc
        }, {} as Record<string, any[]>)
    }

    const [formData, setFormData] = useState<SellerFormData>({
        categories: user?.categories || [] as string[],
        sellerProductOptions: normalizeSellerProductOptions(user?.sellerProductOptions),
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
        if (user) {
            setFormData({
                categories: user.categories || [],
                sellerProductOptions: normalizeSellerProductOptions(user.sellerProductOptions),
                availableLocations: user.availableLocations || {},
            })
        }
    }, [user])

    const toggleProductExpand = (catName: string) => {
        const isCurrentlyExpanded = expandedProducts.includes(catName);
        const isActive = formData.categories.includes(catName);

        if (!isCurrentlyExpanded && !isActive) {
            // If expanding a new product, initialize its options from empty
            setTempProductOptions({});
            setTempProductItems([]);
        }

        setExpandedProducts(prev =>
            prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
        )
    }

    const toggleLocationExpand = (stateName: string) => {
        const isCurrentlyExpanded = expandedLocations.includes(stateName);
        const isActive = !!formData.availableLocations[stateName];

        if (!isCurrentlyExpanded && !isActive) {
            // If expanding a new location, initialize its districts from empty
            setTempLocationDistricts([]);
        }

        setExpandedLocations(prev =>
            prev.includes(stateName) ? prev.filter(s => s !== stateName) : [...prev, stateName]
        )
    }

    const validateProduct = (catName: string, options: Record<string, any>) => {
        const productObj = availableProducts.find(p => p.name === catName)
        if (!productObj) return null

        // Check sub-products
        if (productObj.sub_products && productObj.sub_products.length > 0) {
            const subs = options["Sub-Products"]
            if (!subs || (Array.isArray(subs) ? subs.length === 0 : !subs.trim())) {
                return `Please select a sub-product for ${catName}`
            }
        }

        // Check other options
        const pOptions = allOptions[productObj.id] || []
        for (const opt of pOptions) {
            if (opt.seller_option_type !== "none" && opt.seller_option_type !== "table") {
                const val = options[opt.option_name]
                if (!val || (Array.isArray(val) && val.length === 0)) {
                    return `Please select at least one ${opt.option_name} for ${catName}`
                }
            }
        }
        return null
    }

    const getSafeItemsArray = (data: any): any[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'object' && Object.keys(data).length > 0) return [data];
        return [];
    }

    const renderItemsTable = (items: any[], onRemove?: (index: number) => void) => {
        const safeItems = getSafeItemsArray(items);
        if (safeItems.length === 0) return null;
        
        // Exclude table type options from columns as they are handled differently
        const allColumns = Array.from(new Set(safeItems.flatMap(item => Object.keys(item))));
        const FIELD_ORDER = ["Sub-Products", "Color", "Manufacturer", "Quantity(in tons)", "Location", "Comment"];
        const columns = [
            ...FIELD_ORDER.filter(f => allColumns.includes(f)),
            ...allColumns.filter(f => !FIELD_ORDER.includes(f)),
        ];

        return (
            <div className="rounded-md border border-border overflow-hidden mb-5">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
                            <tr>
                                <th className="px-4 py-2.5 w-10 text-center">#</th>
                                {columns.map(col => (
                                    <th key={col} className="px-4 py-2.5 whitespace-nowrap">{col}</th>
                                ))}
                                {onRemove && <th className="px-4 py-2.5 text-right w-16">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {safeItems.map((item, idx) => (
                                <tr key={idx} className="bg-card hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 text-center text-muted-foreground font-medium">{idx + 1}</td>
                                    {columns.map(col => {
                                        const val = item[col];
                                        const displayVal = Array.isArray(val) ? val.join(", ") : String(val || "-");
                                        return (
                                            <td key={col} className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate" title={displayVal}>
                                                {displayVal}
                                            </td>
                                        )
                                    })}
                                    {onRemove && (
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => onRemove(idx)}
                                                title="Remove item"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const handleAddItem = (catName: string) => {
        const error = validateProduct(catName, tempProductOptions)
        if (error) {
            toast.error(error)
            return
        }

        setTempProductItems(prev => [...prev, { ...tempProductOptions }])
        setTempProductOptions({})
    }

    const saveProduct = async (catName: string) => {
        if (!user) return

        // If there are unsaved inputs in the form, try to add them first
        if (Object.keys(tempProductOptions).length > 0) {
            const error = validateProduct(catName, tempProductOptions)
            if (!error) {
                setTempProductItems(prev => [...prev, { ...tempProductOptions }])
                setTempProductOptions({})
            }
        }

        // Wait a tick for state to update if we just added an item, or proceed if items exist
        // To avoid async state issues, we use the current tempProductItems directly, plus any valid unsaved input
        let finalItems = [...tempProductItems]
        if (Object.keys(tempProductOptions).length > 0 && !validateProduct(catName, tempProductOptions)) {
             finalItems.push({ ...tempProductOptions })
        }

        if (finalItems.length === 0) {
            toast.error(`Please add at least one item for ${catName}`)
            return
        }

        setLoading(true)
        try {
            const newCategories = formData.categories.includes(catName)
                ? formData.categories
                : [...formData.categories, catName]

            const newOptions: Record<string, any[]> = {
                ...formData.sellerProductOptions,
                [catName]: finalItems,
            } as Record<string, any[]>

            const data = await updateUser(user.id, {
                categories: newCategories,
                sellerProductOptions: newOptions as Record<string, any[]>,
            })

            if (!data) throw new Error("Failed to update product")

            if (updateUserData) updateUserData(data)
            toast.success(`${catName} updated successfully`)
            setEditingProduct(null)
            if (!expandedProducts.includes(catName)) {
                setExpandedProducts(prev => [...prev, catName])
            }
        } catch (error) {
            toast.error("Failed to save product")
        } finally {
            setLoading(false)
        }
    }

    const deleteProduct = async (catName: string) => {
        if (!user) return
        if (!confirm(`Are you sure you want to remove ${catName}?`)) return

        setLoading(true)
        try {
            const newCategories = formData.categories.filter(c => c !== catName)
            const newOptions = { ...formData.sellerProductOptions }
            delete newOptions[catName]

            const data = await updateUser(user.id, {
                categories: newCategories,
                sellerProductOptions: newOptions,
            })

            if (!data) throw new Error("Failed to remove product")

            if (updateUserData) updateUserData(data)
            toast.success(`${catName} removed`)
            setExpandedProducts(prev => prev.filter(c => c !== catName))
        } catch (error) {
            toast.error("Failed to remove product")
        } finally {
            setLoading(false)
        }
    }

    const saveLocation = async (stateName: string) => {
        if (!user) return

        if (tempLocationDistricts.length === 0) {
            toast.error("Please select at least one district")
            return
        }

        setLoading(true)
        try {
            const newLocs = {
                ...formData.availableLocations,
                [stateName]: tempLocationDistricts
            }

            const data = await updateUser(user.id, {
                availableLocations: newLocs,
            })

            if (!data) throw new Error("Failed to update location")

            if (updateUserData) updateUserData(data)
            toast.success(`${stateName} updated successfully`)
            setEditingLocation(null)
            if (!expandedLocations.includes(stateName)) {
                setExpandedLocations(prev => [...prev, stateName])
            }
        } catch (error) {
            toast.error("Failed to save location")
        } finally {
            setLoading(false)
        }
    }

    const deleteLocation = async (stateName: string) => {
        if (!user) return
        if (!confirm(`Are you sure you want to remove ${stateName}?`)) return

        setLoading(true)
        try {
            const newLocs = { ...formData.availableLocations }
            delete newLocs[stateName]

            const data = await updateUser(user.id, {
                availableLocations: newLocs,
            })

            if (!data) throw new Error("Failed to remove location")

            if (updateUserData) updateUserData(data)
            toast.success(`${stateName} removed`)
            setExpandedLocations(prev => prev.filter(s => s !== stateName))
        } catch (error) {
            toast.error("Failed to remove location")
        } finally {
            setLoading(false)
        }
    }

    if (user?.role !== "seller" && user?.role !== "both") {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">You don't have permission to view this page.</p>
            </div>
        )
    }

    const activeProductCount = formData.categories.length
    const activeLocationCount = Object.keys(formData.availableLocations).length

    return (
        <div className="mx-auto max-w-4xl pb-20 px-4 md:px-0">
            {/* Page Header */}
            <div className="mb-10">
                <h2 className="font-serif text-3xl font-bold text-foreground tracking-tight">My Products & Locations</h2>
                <p className="mt-2 text-muted-foreground text-[15px]">
                    Configure the products you supply and the regions you deliver to.
                </p>
                {/* Summary Stats */}
                <div className="mt-5 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-primary border border-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
                        <Package className="h-3.5 w-3.5" />
                        {activeProductCount} Product{activeProductCount !== 1 ? "s" : ""} Active
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-emerald-600 border border-emerald-600 px-4 py-1.5 text-sm font-medium text-white">
                        <MapPin className="h-3.5 w-3.5" />
                        {activeLocationCount} Location{activeLocationCount !== 1 ? "s" : ""} Covered
                    </div>
                </div>
            </div>

            <div className="space-y-14">
                {/* ═══════════════════════ Products Section ═══════════════════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                            <Layers className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Products I Sell</h3>
                            <p className="text-xs text-muted-foreground">Click a product to configure or add it to your catalog.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {availableProducts.map((product) => {
                            const catName = product.name
                            const isActive = formData.categories.includes(catName)
                            const isEditing = editingProduct === catName
                            const isExpanded = expandedProducts.includes(catName)
                            const currentOptions = getSafeItemsArray(formData.sellerProductOptions[catName])
                            const pOptions = allOptions[product.id] || []
                            const savedOptionCount = currentOptions.length

                            const FIELD_ORDER = ["Color", "Manufacturer", "Quantity(in tons)", "Location", "Comment"];
                            const sortedPOptions = [
                                ...FIELD_ORDER.map(name => pOptions.find(o => o.option_name === name)).filter(Boolean),
                                ...pOptions.filter(o => !FIELD_ORDER.includes(o.option_name)),
                            ] as typeof pOptions;

                            return (
                                <div
                                    key={product.id}
                                    className={`rounded-xl border transition-all duration-200 ${isActive
                                        ? 'border-primary/30 bg-card shadow-sm'
                                        : 'border-border/60 bg-card/50 hover:border-border'
                                        } ${isEditing || (isExpanded && !isActive) ? 'ring-2 ring-primary/20' : ''}`}
                                >
                                    {/* Product Header Row */}
                                    <div
                                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none group"
                                        onClick={() => toggleProductExpand(catName)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Status Indicator */}
                                            {isActive ? (
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                                </div>
                                            ) : (
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className={`font-bold text-xl tracking-tight truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {catName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                {(isEditing || (isExpanded && !isActive)) ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn-action-icon"
                                                            onClick={() => {
                                                                setEditingProduct(null)
                                                                if (!isActive) setExpandedProducts(prev => prev.filter(c => c !== catName))
                                                            }}
                                                            disabled={loading}
                                                            title="Cancel"
                                                        >
                                                            <X />
                                                        </button>
                                                        {(() => {
                                                            const isValid = tempProductItems.length > 0 || Object.keys(tempProductOptions).length > 0;
                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    className={`h-8 px-4 text-xs font-medium gap-1.5 ${isValid ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                                                                    onClick={() => saveProduct(catName)}
                                                                    disabled={loading}
                                                                >
                                                                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> Save</>}
                                                                </Button>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    isActive && (
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                className="btn-action-icon"
                                                                onClick={() => {
                                                                    setEditingProduct(catName)
                                                                    setTempProductItems(getSafeItemsArray(formData.sellerProductOptions[catName]))
                                                                    setTempProductOptions({})
                                                                }}
                                                                disabled={loading}
                                                                title="Edit product"
                                                            >
                                                                <Pencil />
                                                            </button>
                                                            <button
                                                                className="btn-action-icon"
                                                                onClick={() => deleteProduct(catName)}
                                                                disabled={loading}
                                                                title="Remove product"
                                                            >
                                                                <X />
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                            <div className="ml-1 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Content */}
                                    {(isEditing || isExpanded) && (
                                        <div className="border-t border-border/50">
                                            {(isEditing || (isExpanded && !isActive)) ? (
                                                <div className="p-5">
                                                    {/* Preview of added items */}
                                                    {renderItemsTable(tempProductItems, (idx) => {
                                                        setTempProductItems(prev => prev.filter((_, i) => i !== idx))
                                                    })}

                                                    <div className="space-y-5 rounded-lg border border-border bg-muted/10 p-5">
                                                        <h4 className="text-sm font-semibold text-foreground">Add New Variant</h4>
                                                        
                                                        {/* Sub-Products */}
                                                        {product.sub_products && product.sub_products.length > 0 && (
                                                            <div className="space-y-2.5">
                                                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                    Sub-Products <span className="text-primary">*</span>
                                                                </Label>
                                                                <Select
                                                                    value={typeof tempProductOptions["Sub-Products"] === 'string' ? tempProductOptions["Sub-Products"] : ""}
                                                                    onValueChange={(val) => setTempProductOptions({ ...tempProductOptions, "Sub-Products": val })}
                                                                >
                                                                    <SelectTrigger className="w-full h-10 rounded-lg bg-muted/30 border-border font-medium text-foreground">
                                                                        <SelectValue placeholder="Select sub-product..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="z-[200]">
                                                                        {product.sub_products.map(sub => (
                                                                            <SelectItem key={sub} value={sub} className="font-medium">{sub}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}

                                                        {/* Dynamic Options / Categories */}
                                                        {sortedPOptions.map(opt => {
                                                                if (opt.seller_option_type === 'none') return null;

                                                                const isMulti = opt.seller_option_type === "dropdown" || opt.seller_option_type === "checkbox";
                                                                const currentVals = tempProductOptions[opt.option_name] || (isMulti ? [] : '');

                                                                return (
                                                                    <div key={opt.id} className="space-y-2.5">
                                                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                            {opt.option_name}
                                                                            <span className="ml-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70 normal-case tracking-normal">{opt.seller_option_type}</span>
                                                                        </Label>

                                                                        {(isMulti && opt.dropdown_values) ? (
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {opt.dropdown_values.map(val => {
                                                                                    const checked = Array.isArray(currentVals) && currentVals.includes(val)
                                                                                    return (
                                                                                        <label
                                                                                            key={val}
                                                                                            className={`inline-flex items-center gap-2 text-sm cursor-pointer transition-all duration-150 px-3.5 py-2 rounded-lg border ${checked
                                                                                                ? 'bg-primary border-primary text-primary-foreground font-medium shadow-sm'
                                                                                                : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
                                                                                                }`}
                                                                                        >
                                                                                            <Checkbox
                                                                                                checked={checked}
                                                                                                className={checked ? "border-primary-foreground/50 bg-primary-foreground/20 data-[state=checked]:bg-primary-foreground/20 data-[state=checked]:text-primary-foreground" : ""}
                                                                                                onCheckedChange={(c: boolean) => {
                                                                                                    const prev = Array.isArray(currentVals) ? currentVals : [];
                                                                                                    const next = c ? [...prev, val] : prev.filter((v: string) => v !== val)
                                                                                                    setTempProductOptions({ ...tempProductOptions, [opt.option_name]: next })
                                                                                                }}
                                                                                            />
                                                                                            {val}
                                                                                        </label>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        ) : opt.seller_option_type === 'table' ? (
                                                                            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
                                                                                    <span className="text-xs text-muted-foreground">Tabular data — configured per quotation</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <Input
                                                                                type={opt.seller_option_type === 'number' ? 'number' : 'text'}
                                                                                placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                                                                                value={typeof currentVals === 'string' ? currentVals : ''}
                                                                                onChange={(e) => setTempProductOptions({ ...tempProductOptions, [opt.option_name]: e.target.value })}
                                                                                className="h-10 rounded-lg bg-muted/30 border-border font-medium text-foreground"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        
                                                        {/* Add Item Button */}
                                                        <div className="pt-2 flex justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => handleAddItem(catName)}
                                                                className="gap-2"
                                                            >
                                                                <Plus className="h-4 w-4" /> Add Configuration
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Read-Only Summary */
                                                <div className="px-5 py-4">
                                                    {currentOptions.length > 0 ? (
                                                        renderItemsTable(currentOptions)
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground/60 italic py-1">No specifications configured. Click Edit to set up.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* ═══════════════════════ Locations Section ═══════════════════════ */}
                <section>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <Globe className="h-4.5 w-4.5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Delivery Locations</h3>
                            <p className="text-xs text-muted-foreground">Select the states and districts you deliver to.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {locations.map((loc) => {
                            const stateName = loc.state_name
                            const isActive = !!formData.availableLocations[stateName]
                            const isEditing = editingLocation === stateName
                            const isExpanded = expandedLocations.includes(stateName)
                            const isConfiguring = isEditing || (isExpanded && !isActive)
                            const currentDistricts = isConfiguring ? tempLocationDistricts : (formData.availableLocations[stateName] || [])
                            const districtCount = (formData.availableLocations[stateName] || []).length

                            return (
                                <div
                                    key={loc.id}
                                    className={`rounded-xl border transition-all duration-200 ${isActive
                                        ? 'border-emerald-500/30 bg-card shadow-sm'
                                        : 'border-border/60 bg-card/50 hover:border-border'
                                        } ${isEditing || (isExpanded && !isActive) ? 'ring-2 ring-emerald-500/20' : ''}`}
                                >
                                    {/* Location Header Row */}
                                    <div
                                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none group"
                                        onClick={() => toggleLocationExpand(stateName)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {isActive ? (
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                </div>
                                            ) : (
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className={`font-bold text-xl tracking-tight truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {stateName}
                                                </div>
                                                {isActive && districtCount > 0 && !isEditing && (
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                                        {districtCount} district{districtCount !== 1 ? "s" : ""} covered
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                {(isEditing || (isExpanded && !isActive)) ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setEditingLocation(null)
                                                                if (!isActive) setExpandedLocations(prev => prev.filter(s => s !== stateName))
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => saveLocation(stateName)}
                                                            disabled={loading || tempLocationDistricts.length === 0}
                                                            className={`h-8 px-4 text-xs font-medium gap-1.5 ${tempLocationDistricts.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                                                        >
                                                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> Save</>}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    isActive && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn-action-icon btn-action-icon-green"
                                                                onClick={() => {
                                                                    setEditingLocation(stateName)
                                                                    setTempLocationDistricts(formData.availableLocations[stateName] || [])
                                                                }}
                                                                disabled={loading}
                                                                title="Edit location"
                                                            >
                                                                <Pencil />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-action-icon btn-action-icon-green"
                                                                onClick={() => deleteLocation(stateName)}
                                                                disabled={loading}
                                                                title="Remove location"
                                                            >
                                                                <X />
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                            <div className="ml-1 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Content */}
                                    {(isEditing || isExpanded) && (
                                        <div className="border-t border-border/50">
                                            {(isEditing || (isExpanded && !isActive)) ? (
                                                <div className="p-5 space-y-3">
                                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        Select Districts
                                                    </Label>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {loc.districts?.map((dist: string) => {
                                                            const checked = currentDistricts.includes(dist)
                                                            return (
                                                                <label
                                                                    key={dist}
                                                                    className={`inline-flex items-center gap-2 text-sm cursor-pointer transition-all duration-150 px-3.5 py-2 rounded-lg border ${checked
                                                                        ? 'bg-emerald-600 border-emerald-600 text-white font-medium shadow-sm'
                                                                        : 'bg-muted/30 border-border text-muted-foreground hover:border-emerald-500/40 hover:bg-muted/50'
                                                                        }`}
                                                                >
                                                                    <Checkbox
                                                                        checked={checked}
                                                                        className={checked ? "border-white/50 bg-white/20 data-[state=checked]:bg-white/20 data-[state=checked]:text-white" : ""}
                                                                        onCheckedChange={(c: boolean) => {
                                                                            const next = c ? [...currentDistricts, dist] : currentDistricts.filter(d => d !== dist)
                                                                            setTempLocationDistricts(next)
                                                                        }}
                                                                    />
                                                                    {dist}
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                    {(!loc.districts || loc.districts.length === 0) && (
                                                        <p className="text-sm text-muted-foreground italic">No districts defined for this state.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Read-Only Summary */
                                                <div className="px-5 py-4">
                                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">Covered Districts</div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {currentDistricts.length > 0 ? currentDistricts.map(d => (
                                                            <span key={d} className="inline-flex items-center bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 px-2.5 py-1 rounded-md text-xs font-medium">{d}</span>
                                                        )) : <span className="text-xs text-muted-foreground/60 italic">All Districts Covered</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>
        </div>
    )
}
