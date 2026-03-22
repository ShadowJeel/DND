import { useEffect, useState } from 'react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ProductOption = {
    id?: string;
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

export function Categories() {
    const [products, setProducts] = useState<Product[]>([]);
    const [newCategoryProductId, setNewCategoryProductId] = useState<string>('');
    const [selectedSubProduct, setSelectedSubProduct] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // State for managing currently drafted options before saving
    const [draftOptions, setDraftOptions] = useState<ProductOption[]>([]);

    // State for adding a new option manually
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionBuyerType, setNewOptionBuyerType] = useState<'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'none'>('text');
    const [newOptionSellerType, setNewOptionSellerType] = useState<'text' | 'number' | 'dropdown' | 'checkbox' | 'radio' | 'none'>('none');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const productsSnap = await getDocs(collection(db, "products"));
            const productsList: Product[] = [];
            for (const p of productsSnap.docs) {
                const data = p.data() as any;
                const productId = data.product_id?.toString() || p.id;

                // Fetch product options for this specific product
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
                            dropdown_values: od.dropdown_values || []
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

            // Re-sort correctly
            productsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            const data = productsList;
            setProducts(data || []);
            if (data && data.length > 0 && newCategoryProductId === '') {
                setNewCategoryProductId(data[0].product_id);
                // Initialize draft options for the selected product (general options)
                const currentOptions = (data[0].product_options || []).filter(o => !o.sub_product);
                setDraftOptions([...currentOptions]);
            } else if (newCategoryProductId !== "") {
                const selectedP = data.find(p => p.product_id === newCategoryProductId);
                if (selectedP) {
                    const currentOptions = (selectedP.product_options || []).filter(o => (o.sub_product || "") === selectedSubProduct);
                    setDraftOptions([...currentOptions]);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    // Makers logic removed, replaced by dynamic options.

    const handleAddOption = () => {
        if (!newOptionName.trim()) {
            alert("Please enter an option name.");
            return;
        }

        // Check if option already exists with the exact same types
        if (draftOptions.some(opt =>
            opt.option_name.toLowerCase() === newOptionName.trim().toLowerCase() &&
            opt.buyer_option_type === newOptionBuyerType &&
            opt.seller_option_type === newOptionSellerType
        )) {
            alert("An option with this exact name and types already exists for this product.");
            return;
        }

        const newOption: ProductOption = {
            product_id: newCategoryProductId,
            sub_product: selectedSubProduct || null,
            option_name: newOptionName.trim(),
            buyer_option_type: newOptionBuyerType,
            seller_option_type: newOptionSellerType,
        };

        setDraftOptions(prev => [...prev, newOption]);
        setNewOptionName('');
        setNewOptionBuyerType('text');
        setNewOptionSellerType('none');
    };

    const handleRemoveOption = (indexToRemove: number) => {
        setDraftOptions(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSaveOptions = async () => {
        if (newCategoryProductId === '') return;
        setLoading(true);

        try {
            // Firestore updates via active mapping
            // Delete old product_options mapping locally across collection!
            const snap = await getDocs(collection(db, "product_options"));
            const batch = writeBatch(db);
            let deletedCount = 0;
            snap.docs.forEach(d => {
                const data = d.data();
                if (String(data.product_id) === String(newCategoryProductId) && (data.sub_product || "") === selectedSubProduct) {
                    batch.delete(d.ref)
                    deletedCount++;
                }
            })
            if (deletedCount > 0) await batch.commit();

            // Insert new ones via new batch
            const newBatch = writeBatch(db);
            const optionsToInsert = draftOptions.map(opt => ({
                product_id: newCategoryProductId,
                sub_product: selectedSubProduct || null,
                option_name: opt.option_name,
                buyer_option_type: opt.buyer_option_type,
                seller_option_type: opt.seller_option_type,
                dropdown_values: opt.dropdown_values || []
            }));

            if (optionsToInsert.length > 0) {
                optionsToInsert.forEach(o => {
                    const newRef = doc(collection(db, "product_options"))
                    newBatch.set(newRef, o);
                });
                await newBatch.commit();
            }

            alert("Options saved successfully!");
            await fetchData();
        } catch (error: any) {
            console.error('Error saving options:', error);
            alert(error.message || 'Failed to save options');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Manage Categories</h2>
                <p className="text-muted-foreground mt-1">Create categories and link them to products, defining custom form options.</p>
            </div>

            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Product to Configure</label>
                        <select
                            value={newCategoryProductId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setNewCategoryProductId(newId);

                                const selectedProduct = products.find(p => p.product_id === newId);
                                const subProducts = selectedProduct?.sub_products || [];
                                const firstSub = subProducts.length > 0 ? subProducts[0] : '';
                                setSelectedSubProduct(firstSub);

                                // Update draft options for the newly selected sub-product
                                const currentOptions = (selectedProduct?.product_options || []).filter(o => (o.sub_product || "") === firstSub);
                                setDraftOptions([...currentOptions]);
                                setNewOptionName('');
                                setNewOptionBuyerType('text');
                                setNewOptionSellerType('none');
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="" disabled>Select a product...</option>
                            {products.map(product => (
                                <option key={product.product_id} value={product.product_id}>{product.name}</option>
                            ))}
                        </select>
                    </div>

                    {newCategoryProductId !== '' && products.find(p => p.product_id === newCategoryProductId)?.sub_products?.length! > 0 && (
                        <div className="col-span-full space-y-3">
                            <label className="text-sm font-medium">Select Sub-Product Variant</label>
                            <div className="flex flex-wrap gap-2">
                                {!products.find(p => p.product_id === newCategoryProductId)?.sub_products?.length && (
                                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/50 cursor-not-allowed">
                                        <span className="text-sm font-medium italic">General Options (No Sub-Product)</span>
                                    </label>
                                )}
                                {products.find(p => p.product_id === newCategoryProductId)?.sub_products?.map(sub => (
                                    <label
                                        key={sub}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${selectedSubProduct === sub ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border hover:border-primary/50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="subProductCategory"
                                            value={sub}
                                            checked={selectedSubProduct === sub}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedSubProduct(val);
                                                const selectedProduct = products.find(p => p.product_id === newCategoryProductId);
                                                const currentOptions = (selectedProduct?.product_options || []).filter(o => (o.sub_product || "") === val);
                                                setDraftOptions([...currentOptions]);
                                            }}
                                            className="hidden"
                                        />
                                        <span className="text-sm font-medium">{sub}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {newCategoryProductId !== '' && (
                    <>
                        <div className="mt-8 border-t border-border pt-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Options Configuration</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Select and configure the fields that buyers need to fill out for this product.</p>
                                </div>
                                <button
                                    onClick={handleSaveOptions}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 whitespace-nowrap"
                                >
                                    {loading ? 'Saving...' : 'Save Options'}
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Form to add new options manually */}
                                <div className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-4">
                                    <h4 className="font-semibold text-foreground text-sm">Add New Field</h4>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-xs font-medium text-foreground">Field Name</label>
                                            <input
                                                type="text"
                                                value={newOptionName}
                                                onChange={(e) => setNewOptionName(e.target.value)}
                                                placeholder="e.g. Grade, Weight, Type..."
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-xs font-medium text-foreground">Buyer Field Type</label>
                                            <select
                                                value={newOptionBuyerType}
                                                onChange={(e) => setNewOptionBuyerType(e.target.value as any)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="none">Not Required (None)</option>
                                                <option value="text">Text Input</option>
                                                <option value="number">Number Input</option>
                                                <option value="checkbox">Checkbox List</option>
                                                <option value="dropdown">Dropdown Menu</option>
                                                <option value="radio">Radio Button</option>
                                            </select>
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-xs font-medium text-foreground">Seller Field Type</label>
                                            <select
                                                value={newOptionSellerType}
                                                onChange={(e) => setNewOptionSellerType(e.target.value as any)}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="none">Not Required (None)</option>
                                                <option value="text">Text Input</option>
                                                <option value="number">Number Input</option>
                                                <option value="checkbox">Checkbox List</option>
                                                <option value="dropdown">Dropdown Menu</option>
                                                <option value="radio">Radio Button</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddOption}
                                                className="h-10 px-6 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors whitespace-nowrap"
                                            >
                                                Add Field
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* List of currently configured options */}
                                {draftOptions.length > 0 ? (
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-foreground text-sm">Configured Product Fields</h4>
                                        <div className="grid gap-3">
                                            {draftOptions.map((opt, index) => {
                                                const typeLabels = { text: 'Text', number: 'Number', dropdown: 'Dropdown', checkbox: 'Checkbox', radio: 'Radio', none: 'None' };
                                                return (
                                                    <div key={index} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm text-foreground">{opt.option_name}</span>
                                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                                                                <span className="text-muted-foreground"><span className="font-medium text-foreground/70">Buyer:</span> {typeLabels[opt.buyer_option_type as keyof typeof typeLabels] || opt.buyer_option_type}</span>
                                                                <span className="text-muted-foreground"><span className="font-medium text-foreground/70">Seller:</span> {typeLabels[opt.seller_option_type as keyof typeof typeLabels] || opt.seller_option_type}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleRemoveOption(index)} className="text-sm text-destructive hover:text-destructive/80 font-medium px-2 py-1">Remove</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 border border-dashed border-border rounded-xl">
                                        <p className="text-sm text-muted-foreground">No fields configured for this product yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
