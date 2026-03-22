import { useState, useEffect } from "react"
import { Package } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../lib/firebase"

type ProductOption = {
    id: string;
    product_id: string;
    sub_product?: string | null;
    option_name: string;
    buyer_option_type: 'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'none';
    seller_option_type: 'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'none';
    dropdown_values?: string[];
};

type Product = {
    product_id: string;
    name: string;
    sub_products?: string[];
    product_options?: ProductOption[];
};

export function ProductDetails() {
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>("")
    const [selectedSubProduct, setSelectedSubProduct] = useState<string>("")

    useEffect(() => {
        const fetchData = async () => {
            try {
                const productsSnap = await getDocs(collection(db, 'products'));
                const productsList: Product[] = [];
                for (const p of productsSnap.docs) {
                    const data = p.data() as any;
                    const productId = data.product_id?.toString() || p.id;
                    const optsSnap = await getDocs(collection(db, "product_options"));
                    const options: ProductOption[] = [];
                    optsSnap.docs.forEach(o => {
                        const od = o.data();
                        if (String(od.product_id) === String(productId)) {
                            options.push({
                                id: o.id,
                                product_id: String(od.product_id),
                                sub_product: od.sub_product || null,
                                option_name: od.option_name,
                                buyer_option_type: od.buyer_option_type || (od.form_type !== 'seller' ? od.option_type : 'none'),
                                seller_option_type: od.seller_option_type || (od.form_type === 'seller' ? od.option_type : 'none'),
                                dropdown_values: [...(od.dropdown_values || [])].sort((a: string, b: string) => String(a).localeCompare(String(b)))
                            })
                        }
                    });
                    productsList.push({
                        product_id: productId,
                        name: data.name || "Unnamed Product",
                        sub_products: data.sub_products || [],
                        product_options: options
                    });
                }
                productsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setProducts(productsList);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    const selectedProduct = products.find(p => p.product_id === selectedProductId);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">View Product Details</h2>
                <p className="text-muted-foreground mt-1">Preview how the inquiry form looks to buyers for specific products and categories.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Selection Controls */}
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Product</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        const newId = e.target.value;
                                        setSelectedProductId(newId);

                                        const selectedProduct = products.find(p => p.product_id === newId);
                                        const subProducts = selectedProduct?.sub_products || [];
                                        const firstSub = subProducts.length > 0 ? subProducts[0] : '';
                                        setSelectedSubProduct(firstSub);
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="" disabled>Select a product...</option>
                                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Side-by-Side Previews */}
                    {selectedProduct && (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Buyer Preview */}
                            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative">
                                <div className="absolute top-4 right-4 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Buyer View</div>
                                <div className="flex items-center gap-2 mb-6 text-lg font-semibold">
                                    <Package className="h-5 w-5 text-primary" />
                                    Buyer Form Preview
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div className="grid gap-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">Product <span className="text-red-500 ml-1">*</span></label>
                                            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex-col justify-center cursor-not-allowed italic font-bold">
                                                {selectedProduct?.name}
                                            </div>
                                        </div>

                                        {selectedProduct.sub_products && selectedProduct.sub_products.length > 0 && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium mb-1.5 block">Select Variant <span className="text-red-500 ml-1">*</span></label>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedProduct.sub_products.map(sub => (
                                                        <label
                                                            key={sub}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${selectedSubProduct === sub ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border hover:border-primary/50'}`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="preview-sub-buyer"
                                                                value={sub}
                                                                checked={selectedSubProduct === sub}
                                                                onChange={(e) => setSelectedSubProduct(e.target.value)}
                                                                className="hidden"
                                                            />
                                                            <span className="text-xs font-medium">{sub}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedProduct.product_options && selectedProduct.product_options.filter(o => (o.sub_product || "") === selectedSubProduct && o.buyer_option_type !== 'none').length > 0 ? (
                                        <div className="flex flex-col gap-5 border-t border-border pt-5">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">Product Options:</div>
                                            {selectedProduct.product_options
                                                .filter(o => (o.sub_product || "") === selectedSubProduct && o.buyer_option_type !== 'none')
                                                .map((opt) => (
                                                    <div key={opt.id}>
                                                        <label className="text-sm font-medium mb-1.5 block">
                                                            {opt.option_name}
                                                            <span className="text-red-500 ml-1">*</span>
                                                        </label>
                                                        {opt.buyer_option_type === 'dropdown' ? (
                                                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" defaultValue="">
                                                                <option value="" disabled>Select {opt.option_name.toLowerCase()}</option>
                                                                {(opt.dropdown_values || []).map((val, idx) => (
                                                                    <option key={idx} value={val}>{val}</option>
                                                                ))}
                                                            </select>
                                                        ) : opt.buyer_option_type === 'checkbox' ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full rounded-md border border-input bg-background p-3 min-h-[40px]">
                                                                {(opt.dropdown_values || []).length > 0 ? (
                                                                    (opt.dropdown_values || []).map((val, idx) => (
                                                                        <label key={idx} className="flex items-start gap-2 text-xs leading-tight">
                                                                            <input type="checkbox" readOnly className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-primary" />
                                                                            <span>{val}</span>
                                                                        </label>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic col-span-full">No choices configured</span>
                                                                )}
                                                            </div>
                                                        ) : opt.buyer_option_type === 'radio' ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full rounded-md border border-input bg-background p-3 min-h-[40px]">
                                                                {(opt.dropdown_values || []).length > 0 ? (
                                                                    (opt.dropdown_values || []).map((val, idx) => (
                                                                        <label key={idx} className="flex items-start gap-2 text-xs leading-tight">
                                                                            <input type="radio" name={`buyer-${opt.id}`} disabled className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-gray-300 text-primary" />
                                                                            <span>{val}</span>
                                                                        </label>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic col-span-full">No choices configured</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={opt.buyer_option_type === 'number' ? 'number' : 'text'}
                                                                placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic bg-muted/30 p-4 rounded-md border border-dashed border-border text-center">
                                            No buyer-specific options configured for this variant.
                                        </div>
                                    )}

                                    <div className="border-t border-border pt-5 space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">Delivery Details <span className="text-red-500 ml-1">*</span></label>
                                            <textarea disabled placeholder="Standard delivery fields..." rows={2} className="flex w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm cursor-not-allowed shadow-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="h-10 rounded-md border border-input bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center">Payment Term</div>
                                            <div className="h-10 rounded-md border border-input bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center">PIN Code</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seller Preview */}
                            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative">
                                <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">My Products View</div>
                                <div className="flex items-center gap-2 mb-6 text-lg font-semibold border-b pb-4">
                                    <Package className="h-5 w-5 text-amber-500" />
                                    My Product Configuration
                                </div>

                                <div className="flex flex-col gap-6">
                                    {/* Product Header in My Products flow */}
                                    <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
                                        <Package className="h-6 w-6 text-muted-foreground" />
                                        <div className="font-bold text-lg text-primary">{selectedProduct?.name}</div>
                                    </div>

                                    {selectedProduct.sub_products && selectedProduct.sub_products.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">Selected Variant:</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedProduct.sub_products.map(sub => (
                                                    <label
                                                        key={sub}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${selectedSubProduct === sub ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border hover:border-primary/50'}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="preview-sub-seller"
                                                            value={sub}
                                                            checked={selectedSubProduct === sub}
                                                            onChange={(e) => setSelectedSubProduct(e.target.value)}
                                                            className="hidden"
                                                        />
                                                        <span className="text-xs font-medium">{sub}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedProduct.product_options && selectedProduct.product_options.filter(o => (o.sub_product || "") === selectedSubProduct && o.seller_option_type !== 'none').length > 0 ? (
                                        <div className="flex flex-col gap-5 border-t border-border pt-5">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">Configure your product specifics:</div>
                                            {selectedProduct.product_options
                                                .filter(o => (o.sub_product || "") === selectedSubProduct && o.seller_option_type !== 'none')
                                                .map((opt) => (
                                                    <div key={opt.id} className="space-y-2">
                                                        <label className="text-sm font-medium block">
                                                            {opt.option_name}
                                                            <span className="text-red-500 ml-1">*</span>
                                                        </label>
                                                        {opt.seller_option_type === 'dropdown' ? (
                                                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" defaultValue="">
                                                                <option value="" disabled>Select {opt.option_name.toLowerCase()}</option>
                                                                {(opt.dropdown_values || []).map((val, idx) => (
                                                                    <option key={idx} value={val}>{val}</option>
                                                                ))}
                                                            </select>
                                                        ) : opt.seller_option_type === 'checkbox' ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full rounded-md border border-input bg-background p-3 min-h-[40px]">
                                                                {(opt.dropdown_values || []).length > 0 ? (
                                                                    (opt.dropdown_values || []).map((val, idx) => (
                                                                        <label key={idx} className="flex items-start gap-2 text-xs leading-tight">
                                                                            <input type="checkbox" readOnly className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-primary" />
                                                                            <span>{val}</span>
                                                                        </label>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic col-span-full">No choices configured</span>
                                                                )}
                                                            </div>
                                                        ) : opt.seller_option_type === 'radio' ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full rounded-md border border-input bg-background p-3 min-h-[40px]">
                                                                {(opt.dropdown_values || []).length > 0 ? (
                                                                    (opt.dropdown_values || []).map((val, idx) => (
                                                                        <label key={idx} className="flex items-start gap-2 text-xs leading-tight">
                                                                            <input type="radio" name={`seller-preview-${opt.id}`} disabled className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-gray-300 text-primary" />
                                                                            <span>{val}</span>
                                                                        </label>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic col-span-full">No choices configured</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={opt.seller_option_type === 'number' ? 'number' : 'text'}
                                                                placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic bg-muted/10 p-4 rounded-md border border-dashed border-border text-center">
                                            No seller-specific configuration options needed for this variant.
                                        </div>
                                    )}

                                    <div className="bg-amber-500/5 p-4 rounded-lg border border-amber-500/10 text-xs">
                                        <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Preview Note:</p>
                                        <p className="text-muted-foreground leading-relaxed">
                                            This is how the product selection card will appear in the seller's <strong>"My Products"</strong> dashboard.
                                            Sellers will fill these details once and they will be automatically included in future quotes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
