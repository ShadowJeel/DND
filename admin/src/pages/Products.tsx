import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Product = {
  product_id: number;
  name: string;
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
                <div key={product.product_id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-accent hover:text-accent-foreground transition-colors group gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(product.product_id)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground h-9 w-9 text-muted-foreground group-hover:text-destructive/80 group-hover:hover:text-destructive-foreground shrink-0"
                    title="Delete Product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
