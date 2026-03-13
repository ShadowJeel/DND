import { useState, useEffect } from "react"
import { Package } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../lib/firebase"

type ProductOption = {
    id: string;
    option_name: string;
    option_type: 'text' | 'number' | 'dropdown' | 'checkbox';
    dropdown_values?: string[];
};

type Product = {
    product_id: string;
    name: string;
    product_options?: ProductOption[];
};

export function ProductDetails() {
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string>("")

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
                                option_name: od.option_name,
                                option_type: od.option_type,
                                dropdown_values: od.dropdown_values || []
                            })
                        }
                    });
                    productsList.push({
                        product_id: productId,
                        name: data.name || "Unnamed Product",
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
                                        setSelectedProductId(e.target.value);
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="" disabled>Select a product...</option>
                                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Preview Form */}
                    {selectedProduct && (
                        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative">
                            <div className="absolute top-4 right-4 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded">Buyer View Preview</div>
                            <div className="flex items-center gap-2 mb-6 text-xl font-semibold">
                                <Package className="h-5 w-5 text-primary" />
                                Product Specifications
                            </div>

                            <div className="flex flex-col gap-5">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Product <span className="text-red-500 ml-1">*</span></label>
                                        <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground flex-col justify-center cursor-not-allowed">
                                            {selectedProduct?.name}
                                        </div>
                                    </div>
                                </div>

                                {selectedProduct.product_options && selectedProduct.product_options.length > 0 && (
                                    <div className="flex flex-col gap-5">
                                        {[...selectedProduct.product_options]
                                            .sort((a, b) => {
                                                const typeOrder = { checkbox: 1, dropdown: 2, number: 3, text: 4 };
                                                const orderA = typeOrder[a.option_type] || 5;
                                                const orderB = typeOrder[b.option_type] || 5;
                                                if (orderA !== orderB) return orderA - orderB;
                                                return a.option_name.localeCompare(b.option_name);
                                            })
                                            .map((opt) => (
                                                <div key={opt.id}>
                                                    <label className="text-sm font-medium mb-1.5 block">
                                                        {opt.option_name}
                                                        {selectedProduct.product_options.filter(o => o.option_name === opt.option_name).length > 1 && (
                                                            <span className="ml-1 text-muted-foreground">({opt.option_type === 'number' ? 'No.' : opt.option_type === 'dropdown' ? 'Type' : opt.option_type})</span>
                                                        )}
                                                        <span className="text-red-500 ml-1">*</span>
                                                    </label>
                                                    {opt.option_type === 'dropdown' ? (
                                                        <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" defaultValue="">
                                                            <option value="" disabled>Select {opt.option_name.toLowerCase()}</option>
                                                            {(opt.dropdown_values || []).map((val, idx) => (
                                                                <option key={idx} value={val}>{val}</option>
                                                            ))}
                                                        </select>
                                                    ) : opt.option_type === 'checkbox' ? (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full rounded-md border border-input bg-background p-4 min-h-[40px]">
                                                            {(opt.dropdown_values || []).length > 0 ? (
                                                                (opt.dropdown_values || []).map((val, idx) => (
                                                                    <label key={idx} className="flex items-start gap-2 text-sm leading-tight">
                                                                        <input type="checkbox" value={val} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary" />
                                                                        <span>{val}</span>
                                                                    </label>
                                                                ))
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground italic col-span-full">No choices configured</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            required
                                                            type={opt.option_type === 'number' ? 'number' : 'text'}
                                                            min={opt.option_type === 'number' ? "0" : undefined}
                                                            placeholder={`Enter ${opt.option_name.toLowerCase()}`}
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Delivery Address <span className="text-red-500 ml-1">*</span></label>
                                    <textarea
                                        required
                                        placeholder="Enter complete delivery address..."
                                        rows={3}
                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">District <span className="text-red-500 ml-1">*</span></label>
                                        <input required type="text" placeholder="Enter district" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">State <span className="text-red-500 ml-1">*</span></label>
                                        <input required type="text" placeholder="Enter state" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Pin Code <span className="text-red-500 ml-1">*</span></label>
                                        <input required type="number" min="0" placeholder="Enter pin code" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Payment Terms(in days) <span className="text-red-500 ml-1">*</span></label>
                                        <input required type="number" min="0" placeholder="Enter payment terms" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
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
