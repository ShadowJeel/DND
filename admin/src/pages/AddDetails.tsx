import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

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

export function AddDetails() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const productsSnap = await getDocs(collection(db, 'products'));
            const productsList: Product[] = [];
            for (const p of productsSnap.docs) {
                const data = p.data() as Product;
                data.product_id = parseInt(p.id) || data.product_id;
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
            productsList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            const data = productsList;

            setProducts(data || []);
            if (data && data.length > 0 && selectedProductId === '') {
                setSelectedProductId(data[0].product_id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleAddDropdownValue = async (productId: number, optionName: string, newValue: string) => {
        if (!newValue.trim()) return;

        const product = products.find(p => p.product_id === productId);
        const option = product?.product_options?.find(o => o.option_name === optionName);
        if (!option) return;

        const currentValues = option.dropdown_values || [];
        if (currentValues.includes(newValue.trim())) return;

        const updatedValues = [...currentValues, newValue.trim()];

        try {
            const q = query(collection(db, 'product_options'), where('product_id', '==', productId), where('option_name', '==', optionName));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, 'product_options', snap.docs[0].id), { dropdown_values: updatedValues });
            }
            await fetchData();
        } catch (error: any) {
            console.error('Error adding dropdown value:', error);
            alert('Failed to add value');
        }
    };

    const handleRemoveDropdownValue = async (productId: number, optionName: string, valueToRemove: string) => {
        const product = products.find(p => p.product_id === productId);
        const option = product?.product_options?.find(o => o.option_name === optionName);
        if (!option) return;

        const currentValues = option.dropdown_values || [];
        const updatedValues = currentValues.filter(v => v !== valueToRemove);

        try {
            const q = query(collection(db, 'product_options'), where('product_id', '==', productId), where('option_name', '==', optionName));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, 'product_options', snap.docs[0].id), { dropdown_values: updatedValues });
            }
            await fetchData();
        } catch (error: any) {
            console.error('Error removing dropdown value:', error);
            alert('Failed to remove value');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Add Details</h2>
                <p className="text-muted-foreground mt-1">Configure choices for dropdown menu options assigned to your products.</p>
            </div>

            <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Product</label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(Number(e.target.value))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="" disabled>Select a product...</option>
                            {products.map(product => (
                                <option key={product.product_id} value={product.product_id}>{product.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedProductId !== '' && (() => {
                    const savedOptions = products.find(p => p.product_id === selectedProductId)?.product_options || [];
                    const dropdownOptions = savedOptions.filter(opt => opt.option_type === 'dropdown' || opt.option_type === 'checkbox');

                    if (dropdownOptions.length === 0) {
                        return (
                            <div className="mt-8 border-t border-border pt-8 text-center text-muted-foreground">
                                This product does not have any options configured as a "Dropdown Menu" or "Checkbox List" in Manage Categories.
                            </div>
                        );
                    }

                    return (
                        <div className="mt-8 border-t border-border pt-8">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-foreground">Configure Option Details</h3>
                                <p className="text-sm text-muted-foreground mt-1">Add or remove choices for your saved dropdown menus and checkbox lists. Changes here are saved automatically.</p>
                            </div>

                            <div className="space-y-6">
                                {dropdownOptions.map(opt => (
                                    <div key={opt.id} className="p-4 rounded-lg border border-border bg-card">
                                        <h4 className="font-medium text-foreground mb-3">{opt.option_name} Choices</h4>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {(opt.dropdown_values || []).map((val, idx) => (
                                                <div key={idx} className="flex items-center gap-1 bg-background border px-2 py-1 rounded-md text-sm shadow-sm">
                                                    {val}
                                                    <button
                                                        onClick={() => handleRemoveDropdownValue(selectedProductId as number, opt.option_name, val)}
                                                        className="text-muted-foreground hover:text-destructive ml-1 focus-visible:outline-none"
                                                        title="Remove"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            ))}
                                            {(!opt.dropdown_values || opt.dropdown_values.length === 0) && (
                                                <span className="text-sm text-muted-foreground italic py-1">No choices added yet.</span>
                                            )}
                                        </div>

                                        <div className="flex gap-2 max-w-sm">
                                            <input
                                                type="text"
                                                id={`new-val-${opt.option_name}`}
                                                placeholder={`Add a choice for ${opt.option_name}...`}
                                                className="h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddDropdownValue(selectedProductId as number, opt.option_name, e.currentTarget.value);
                                                        e.currentTarget.value = '';
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById(`new-val-${opt.option_name}`) as HTMLInputElement;
                                                    if (input) {
                                                        handleAddDropdownValue(selectedProductId as number, opt.option_name, input.value);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="h-9 px-4 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
