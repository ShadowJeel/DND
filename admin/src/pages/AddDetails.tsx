import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

type ProductOption = {
    id?: string;
    product_id: string; // Added
    sub_product?: string | null; // Added
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

export function AddDetails() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedSubProduct, setSelectedSubProduct] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

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
            const data = productsList;

            setProducts(data || []);
            if (data && data.length > 0 && selectedProductId === '') {
                setSelectedProductId(data[0].product_id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleAddDropdownValue = async (productId: string, optionName: string, newValue: string) => {
        if (!newValue.trim()) return;

        // Split by comma and clean up each value
        const newValues = newValue.split(',')
            .map(val => val.trim())
            .filter(val => val !== '');

        if (newValues.length === 0) return;

        const product = products.find(p => p.product_id === productId);
        const option = product?.product_options?.find(o => o.option_name === optionName && (o.sub_product || "") === selectedSubProduct);
        if (!option) return;

        const currentValues = option.dropdown_values || [];

        // Flatten any existing comma-separated strings first
        const flattenedCurrent = currentValues
            .flatMap(v => v.split(',').map(s => s.trim()))
            .filter(v => v !== '');

        // Filter out values that already exist
        const valuesToAdd = newValues.filter(val => !flattenedCurrent.includes(val));

        // If there are no new values to add AND the existing values were already flat, no need to update
        if (valuesToAdd.length === 0 && flattenedCurrent.length === currentValues.length) return;

        const updatedValues = [...flattenedCurrent, ...valuesToAdd].sort((a, b) => a.localeCompare(b));

        try {
            const q = query(
                collection(db, 'product_options'),
                where('product_id', '==', productId),
                where('option_name', '==', optionName),
                where('sub_product', '==', selectedSubProduct || null)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, 'product_options', snap.docs[0].id), { dropdown_values: updatedValues });
            }
            await fetchData();
        } catch (error: any) {
            console.error('Error adding dropdown values:', error);
            alert('Failed to add values');
        }
    };

    const handleRemoveDropdownValue = async (productId: string, optionName: string, valueToRemove: string) => {
        const product = products.find(p => p.product_id === productId);
        const option = product?.product_options?.find(o => o.option_name === optionName && (o.sub_product || "") === selectedSubProduct);
        if (!option) return;

        const currentValues = option.dropdown_values || [];

        // Flatten any existing comma-separated strings first, then filter out the one to remove
        const updatedValues = currentValues
            .flatMap(v => v.split(',').map(s => s.trim()))
            .filter(v => v !== '' && v !== valueToRemove)
            .sort((a, b) => a.localeCompare(b));

        try {
            const q = query(
                collection(db, 'product_options'),
                where('product_id', '==', productId),
                where('option_name', '==', optionName),
                where('sub_product', '==', selectedSubProduct || null)
            );
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
                            {products.map(product => (
                                <option key={product.product_id} value={product.product_id}>{product.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedProductId !== '' && products.find(p => p.product_id === selectedProductId)?.sub_products?.length! > 0 && (
                        <div className="col-span-full space-y-3">
                            <label className="text-sm font-medium">Select Sub-Product Variant</label>
                            <div className="flex flex-wrap gap-2">
                                {!products.find(p => p.product_id === selectedProductId)?.sub_products?.length && (
                                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/50 cursor-not-allowed">
                                        <span className="text-sm font-medium italic">General Options (No Sub-Product)</span>
                                    </label>
                                )}
                                {products.find(p => p.product_id === selectedProductId)?.sub_products?.map(sub => (
                                    <label
                                        key={sub}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${selectedSubProduct === sub ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border hover:border-primary/50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="subProductAddDetails"
                                            value={sub}
                                            checked={selectedSubProduct === sub}
                                            onChange={(e) => setSelectedSubProduct(e.target.value)}
                                            className="hidden"
                                        />
                                        <span className="text-sm font-medium">{sub}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {selectedProductId !== '' && (() => {
                    const savedOptions = products.find(p => p.product_id === selectedProductId)?.product_options || [];
                    const choiceTypes = ['dropdown', 'checkbox', 'radio'];
                    const dropdownOptions = savedOptions.filter(opt =>
                        (opt.sub_product || "") === selectedSubProduct &&
                        (choiceTypes.includes(opt.buyer_option_type) || choiceTypes.includes(opt.seller_option_type))
                    );

                    if (dropdownOptions.length === 0) {
                        return (
                            <div className="mt-8 border-t border-border pt-8 text-center text-muted-foreground">
                                This product does not have any options configured as a "Dropdown Menu", "Checkbox List", or "Radio Button".
                            </div>
                        );
                    }

                    return (
                        <div className="mt-8 border-t border-border pt-8">
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-foreground">Configure Option Details</h3>
                                <p className="text-sm text-muted-foreground mt-1">Add or remove choices for your saved dropdown menus, checkbox lists, or radio buttons. Changes here are saved automatically.</p>
                            </div>

                            <div className="space-y-6">
                                {dropdownOptions.map(opt => (
                                    <div key={opt.id} className="p-4 rounded-lg border border-border bg-card">
                                        <div className="flex items-center gap-2 mb-3">
                                            <h4 className="font-medium text-foreground">{opt.option_name} Choices</h4>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-secondary/50 text-secondary-foreground border border-border/50">
                                                Buyer: {opt.buyer_option_type === 'none' ? 'None (Text)' : opt.buyer_option_type} | Seller: {opt.seller_option_type === 'none' ? 'None (Text)' : opt.seller_option_type}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {(opt.dropdown_values || [])
                                                .flatMap(v => v.split(',').map(s => s.trim()))
                                                .filter(v => v !== '')
                                                .map((val, idx) => (
                                                    <div key={idx} className="flex items-center gap-1 bg-background border px-2 py-1 rounded-md text-sm shadow-sm">
                                                        {val}
                                                        <button
                                                            onClick={() => handleRemoveDropdownValue(selectedProductId, opt.option_name, val)}
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
                                                        handleAddDropdownValue(selectedProductId, opt.option_name, e.currentTarget.value);
                                                        e.currentTarget.value = '';
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById(`new-val-${opt.option_name}`) as HTMLInputElement;
                                                    if (input) {
                                                        handleAddDropdownValue(selectedProductId, opt.option_name, input.value);
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
