'use client';

import { useState, useEffect } from 'react';
import { Coffee, Utensils, Package, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Product, Category } from '@/types/products';

// Default categories with icons
const defaultCategories = [
  { id: 'espresso', name: 'Espresso', icon: 'coffee' as const },
  { id: 'refreshers', name: 'Refreshers', icon: 'coffee' as const },
  { id: 'specials', name: 'Specials', icon: 'coffee' as const },
  { id: 'frappe', name: 'Frappe', icon: 'coffee' as const },
  { id: 'breakfast', name: 'All Day Breakfast', icon: 'utensils' as const },
  { id: 'snacks', name: 'Snack Attack', icon: 'utensils' as const },
  { id: 'pasta', name: 'Pasta', icon: 'utensils' as const },
  { id: 'breads-pastries', name: 'Breads + Pastries', icon: 'utensils' as const },
  { id: 'sweet-tooth', name: 'Sweet Tooth', icon: 'utensils' as const },
];

export default function ProductsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('espresso');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/addproducts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Group products by category
        const productsByCategory: { [key: string]: Product[] } = {};
        
        data.products.forEach((product: Product) => {
          if (!productsByCategory[product.category]) {
            productsByCategory[product.category] = [];
          }
          productsByCategory[product.category].push(product);
        });
        
        // Create categories array with products
        const categoryList: Category[] = defaultCategories.map(cat => ({
          ...cat,
          products: productsByCategory[cat.id] || []
        }));
        
        setCategories(categoryList);
        
        // If active category has no products, switch to first category with products
        if (productsByCategory[activeCategory]?.length === 0) {
          const firstCategoryWithProducts = categoryList.find(cat => cat.products.length > 0);
          if (firstCategoryWithProducts) {
            setActiveCategory(firstCategoryWithProducts.id);
          }
        }
        
        toast.success(`Loaded ${data.products.length} products`);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProducts();
  };

  // Handle navigate to add product
  const handleAddProduct = () => {
    router.push('/addproduct');
  };

  const currentCategory = categories.find(cat => cat.id === activeCategory);

  const toggleRawMaterials = (productId: string) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  // Calculate total products
  const totalProducts = categories.reduce((total, cat) => total + cat.products.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Products
              </h2>
              <p className="text-muted-foreground">
                Browse and manage all available products from our menu.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {categories.filter(cat => cat.products.length > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleAddProduct}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Loading products...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Category Tabs */}
            <div className="mb-8 border-b border-border">
              <div className="flex flex-wrap gap-2 overflow-x-auto">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px ${
                      activeCategory === category.id
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {category.icon === 'coffee' ? (
                      <Coffee className="h-4 w-4" />
                    ) : (
                      <Utensils className="h-4 w-4" />
                    )}
                    <span>{category.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      activeCategory === category.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {category.products.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {currentCategory && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                    {currentCategory.name}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {currentCategory.products.length} products
                  </span>
                </div>

                {currentCategory.products.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">
                      No products in this category
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Get started by adding your first product to this category.
                    </p>
                    <button
                      onClick={handleAddProduct}
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentCategory.products.map(product => (
                      <div
                        key={product.id}
                        className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{product.name}</h4>
                            {product.stock !== undefined && (
                              <div className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                product.stock > 10 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : product.stock > 0
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-destructive/10 text-destructive'
                              }`}>
                                Stock: {product.stock}
                              </div>
                            )}
                          </div>
                          
                          {/* Show Raw Materials button if product has raw materials */}
                          {product.rawMaterials && product.rawMaterials.length > 0 && (
                            <button
                              onClick={() => toggleRawMaterials(product.id)}
                              className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                            >
                              <Package className="h-3 w-3" />
                              <span>Materials</span>
                            </button>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="mb-4">
                          {product.variants && product.variants.length > 0 ? (
                            <div className="space-y-1">
                              {product.variants.map((variant, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{variant.name}</span>
                                  <span className="font-semibold text-foreground">₱{variant.price.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-lg font-semibold text-foreground">₱{product.price.toLocaleString()}</div>
                          )}
                        </div>

                        {/* Category and Date Info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className="capitalize">{product.categoryName}</span>
                          <span>
                            Added: {new Date(product.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Raw Materials Section (Expandable) */}
                        {product.rawMaterials && product.rawMaterials.length > 0 && expandedProductId === product.id && (
                          <div className="mt-4 border-t border-border pt-4">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                              <Package className="h-4 w-4" />
                              <span>Raw Materials</span>
                              <span className="text-xs text-muted-foreground">
                                ({product.rawMaterials.length} items)
                              </span>
                            </div>
                            <div className="space-y-2">
                              {product.rawMaterials.map((material, index) => (
                                <div key={material.id || index} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{material.name}</span>
                                  <span className="font-medium text-foreground">
                                    {material.quantity} {material.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Product Actions */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => {
                                // TODO: Implement edit functionality
                                toast.info('Edit functionality coming soon');
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                // TODO: Implement view details functionality
                                toast.info('View details coming soon');
                              }}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add-ons Section */}
            <div className="mt-12">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Add-Ons</h3>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                    <span className="font-medium text-foreground">Oat/Coconut Milk</span>
                    <span className="font-semibold text-foreground">+₱40</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                    <span className="font-medium text-foreground">Coffee Jelly</span>
                    <span className="font-semibold text-foreground">+₱30</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                    <span className="font-medium text-foreground">Extra Shot</span>
                    <span className="font-semibold text-foreground">+₱30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Materials Info Note */}
            <div className="mt-8 rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Live Product Data</p>
                  <p className="text-sm text-muted-foreground">
                    Products are now loaded from your database. Click the "Materials" button on product cards to view the raw materials needed. 
                    Stock levels are tracked for inventory management.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}