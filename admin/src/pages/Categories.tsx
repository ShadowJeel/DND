import { useEffect, useState } from 'react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ProductOption = {
    id?: number;
    option_name: string;
    option_type: 'text' | 'number' | 'dropdown' | 'checkbox';
    dropdown_values?: string[];
};

type Product = {
    product_id: number;
    name: string;
    product_options?: ProductOption[];
};

const PREDEFINED_OPTIONS = [
    "Manufacturer", "Grade", "Outer Diameter", "Diameter", "Thickness", "Coating",
    "Quantity", "Top paint type", "Top Color Shade", "Width", "Length", "Nominal Bore", "Dimensions", "Shape"
];

export function Categories() {
    const [products, setProducts] = useState<Product[]>([]);
    const [newCategoryProductId, setNewCategoryProductId] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);

    // State for managing currently drafted options before saving. 
    // Now stores an array of ProductOptions for each predefined name.
    const [draftOptions, setDraftOptions] = useState<Record<string, ProductOption[]>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const productsSnap = await getDocs(collection(db, "products"));
            const productsList: Product[] = [];
            for (const p of productsSnap.docs) {
                const data = p.data() as Product;
                data.product_id = parseInt(p.id) || data.product_id;

                // Fetch product options manually
                const optsSnap = await getDocs(collection(db, "product_options"));
                const options: ProductOption[] = [];
                optsSnap.docs.forEach(o => {
                    const od = o.data();
                    if (od.product_id === data.product_id) {
                        options.push({
                            id: od.id,
                            option_name: od.option_name,
                            option_type: od.option_type,
                            dropdown_values: od.dropdown_values
                        })
                    }
                });
                data.product_options = options;
                productsList.push(data);
            }

            // Re-sort correctly
            productsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            const data = productsList;
            setProducts(data || []);
            if (data && data.length > 0 && newCategoryProductId === '') {
                setNewCategoryProductId(data[0].product_id);
                // Initialize draft options for the selected product
                const currentOptions = data[0].product_options || [];
                const draftMap: Record<string, ProductOption[]> = {};
                currentOptions.forEach((opt: ProductOption) => {
                    if (!draftMap[opt.option_name]) {
                        draftMap[opt.option_name] = [];
                    }
                    draftMap[opt.option_name].push(opt);
                });
                setDraftOptions(draftMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    // Makers logic removed, replaced by dynamic options.

    const handleToggleType = (optionName: string, type: 'text' | 'number' | 'dropdown' | 'checkbox') => {
        setDraftOptions(prev => {
            const next = { ...prev };
            const currentArray = next[optionName] || [];
            const exists = currentArray.some(opt => opt.option_type === type);

            if (exists) {
                // Remove this type
                next[optionName] = currentArray.filter(opt => opt.option_type !== type);
                if (next[optionName].length === 0) {
                    delete next[optionName];
                }
            } else {
                // Add this type
                next[optionName] = [...currentArray, { option_name: optionName, option_type: type }];
            }
            return next;
        });
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
                if (d.data().product_id === newCategoryProductId) {
                    batch.delete(d.ref)
                    deletedCount++;
                }
            })
            if (deletedCount > 0) await batch.commit();

            // Insert new ones via new batch
            const newBatch = writeBatch(db);
            const optionsToInsert = Object.values(draftOptions).flat().map(opt => ({
                product_id: newCategoryProductId,
                option_name: opt.option_name,
                option_type: opt.option_type,
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
                                const newId = Number(e.target.value);
                                setNewCategoryProductId(newId);

                                // Update draft options for the newly selected product
                                const selectedProduct = products.find(p => p.product_id === newId);
                                const currentOptions = selectedProduct?.product_options || [];
                                const draftMap: Record<string, ProductOption[]> = {};
                                currentOptions.forEach((opt: ProductOption) => {
                                    if (!draftMap[opt.option_name]) {
                                        draftMap[opt.option_name] = [];
                                    }
                                    draftMap[opt.option_name].push(opt);
                                });
                                setDraftOptions(draftMap);
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="" disabled>Select a product...</option>
                            {products.map(product => (
                                <option key={product.product_id} value={product.product_id}>{product.name}</option>
                            ))}
                        </select>
                    </div>
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

                            <div className="space-y-4">
                                {PREDEFINED_OPTIONS.map(optionName => {
                                    const activeTypes = draftOptions[optionName] || [];
                                    const isAnyActive = activeTypes.length > 0;

                                    return (
                                        <div key={optionName} className={`p-4 rounded-lg border transition-colors ${isAnyActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                                            <div className="font-medium text-foreground mb-3">{optionName}</div>
                                            <div className="flex flex-wrap gap-4">
                                                {(['text', 'number', 'dropdown', 'checkbox'] as const).map(type => {
                                                    const isChecked = activeTypes.some(opt => opt.option_type === type);
                                                    const labels = {
                                                        text: 'Text Input',
                                                        number: 'Number Input',
                                                        dropdown: 'Dropdown Menu',
                                                        checkbox: 'Checkbox List'
                                                    };
                                                    return (
                                                        <label key={type} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground/80">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleType(optionName, type)}
                                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                            />
                                                            {labels[type]}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
