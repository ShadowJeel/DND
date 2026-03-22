import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Package, X } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Product = {
  product_id: number;
  name: string;
  sub_products?: string[];
  created_at: string;
};

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'products'));
      const prods: Product[] = snap.docs.map(d => {
        const data = d.data();
        return {
          product_id: parseInt(d.id) || data.product_id,
          name: data.name,
          sub_products: data.sub_products || [],
          created_at: data.created_at || new Date().toISOString()
        }
      });
      prods.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(prods);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    try {
      const idStr = String(Date.now());
      const newD = {
        product_id: parseInt(idStr),
        name: newProductName.trim(),
        created_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'products', idStr), newD);

      setProducts([...products, newD].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProductName('');
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert(error.message || 'Failed to add product');
    }
  };

  const handleDeleteProduct = async (product_id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteDoc(doc(db, 'products', String(product_id)));
      setProducts(products.filter(p => p.product_id !== product_id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleAddSubProduct = async (product: Product) => {
    const subName = window.prompt("Enter Sub-Product Name:");
    if (!subName || !subName.trim()) return;

    const updatedSubProducts = [...(product.sub_products || []), subName.trim()];
    try {
      await setDoc(doc(db, 'products', String(product.product_id)), {
        ...product,
        sub_products: updatedSubProducts
      }, { merge: true });

      setProducts(prev => prev.map(p => p.product_id === product.product_id ? { ...p, sub_products: updatedSubProducts } : p));
    } catch (error) {
      console.error('Error adding sub-product:', error);
      alert("Failed to add sub-product");
    }
  };

  const handleDeleteSubProduct = async (product: Product, subName: string) => {
    if (!window.confirm(`Are you sure you want to delete sub-product "${subName}"?`)) return;

    const updatedSubProducts = (product.sub_products || []).filter(s => s !== subName);
    try {
      await setDoc(doc(db, 'products', String(product.product_id)), {
        ...product,
        sub_products: updatedSubProducts
      }, { merge: true });

      setProducts(prev => prev.map(p => p.product_id === product.product_id ? { ...p, sub_products: updatedSubProducts } : p));
    } catch (error) {
      console.error('Error deleting sub-product:', error);
      alert("Failed to delete sub-product");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Manage Products</h2>
        <p className="text-muted-foreground mt-1">Add or remove products from the master list.</p>
      </div>

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Add New Product</h3>

        <form onSubmit={handleAddProduct} className="flex flex-col gap-4 mb-8 border-b border-border pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <input
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="E.g. Steel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!newProductName.trim()}
            className="mt-2 w-full md:w-auto md:self-end inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </button>
        </form>

        <h3 className="text-lg font-semibold mb-4 text-foreground">Existing Products</h3>
        <div className="rounded-md border border-border">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No products added yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {products.map((product) => (
                <div key={product.product_id} className="flex flex-col p-4 hover:bg-accent/30 transition-colors group gap-4 border-b last:border-0 border-border">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Package className="h-5 w-5 text-primary" />
                      {product.name}
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(product.product_id)}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground h-9 w-9 text-muted-foreground hover:shadow-sm shrink-0"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sub-Products Section */}
                  <div className="pl-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        Sub-Products
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-1">{(product.sub_products || []).length}</span>
                      </h4>
                      <button
                        onClick={() => handleAddSubProduct(product)}
                        className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Sub-Product
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(product.sub_products || []).length > 0 ? (
                        product.sub_products?.map((sub, sIdx) => (
                          <div key={sIdx} className="group/sub flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-lg text-sm shadow-sm">
                            <span className="font-medium text-foreground">{sub}</span>
                            <button
                              onClick={() => handleDeleteSubProduct(product, sub)}
                              className="text-muted-foreground hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No sub-products added. This product will use general configuration.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
