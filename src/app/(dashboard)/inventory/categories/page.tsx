'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';

// Types
interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Product {
  _id?: string;
  name: string;
  price: number;
  ingredients: Ingredient[];
  available: boolean;
  categoryId?: string;
}

interface Category {
  _id?: string;
  name: string;
  products: Product[];
  menuType: 'food' | 'drink';
}

// Constants
const UNITS = ['grams', 'kg', 'ml', 'liters', 'pieces', 'cups', 'tbsp', 'tsp', 'oz'];
const DRINK_UNITS = ['ml', 'liters', 'cups', 'oz'];

// Initial States
const initialCategoryForm = { 
  name: '', 
  menuType: 'food' as const 
};

const initialProductForm = { 
  name: '', 
  price: '', 
  available: true 
};

const initialIngredientForm = { 
  name: '', 
  quantity: '', 
  unit: 'grams' 
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<'food' | 'drink'>('food');
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [ingredientForm, setIngredientForm] = useState(initialIngredientForm);
  const [productIngredients, setProductIngredients] = useState<Ingredient[]>([]);

  const filteredCategories = categories.filter(cat => cat.menuType === selectedMenu);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });

      if (!response.ok) throw new Error('Failed to add category');
      
      const category = await response.json();
      setCategories(prev => [...prev, category]);
      resetCategoryForm();
      setSelectedCategory(category);
      setSelectedMenu(category.menuType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category and all its products?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/products/categories/${id}`, { method: 'DELETE' });
      
      if (!response.ok) throw new Error('Failed to delete category');
      
      setCategories(prev => prev.filter(c => c._id !== id));
      if (selectedCategory?._id === id) setSelectedCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = () => {
    if (!ingredientForm.name.trim() || !ingredientForm.quantity.trim()) {
      setError('Ingredient name and quantity are required');
      return;
    }

    setProductIngredients(prev => [...prev, ingredientForm]);
    setIngredientForm(initialIngredientForm);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !selectedCategory || productIngredients.length === 0) {
      setError('Please fill all required fields');
      return;
    }

    const price = parseFloat(productForm.price);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }

    const productData = {
      ...productForm,
      price,
      ingredients: productIngredients,
      categoryId: selectedCategory._id
    };

    try {
      setLoading(true);
      const url = editingProduct 
        ? `/api/products/categories/${selectedCategory._id}/products/${editingProduct._id}`
        : '/api/products/add';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (!response.ok) throw new Error('Failed to save product');
      
      await fetchCategories();
      resetProductForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedCategory || !confirm('Are you sure you want to delete this product?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/products/categories/${selectedCategory._id}/products/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete product');
      
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductAvailability = async (productId: string) => {
    if (!selectedCategory) return;

    try {
      setLoading(true);
      const product = selectedCategory.products.find(p => p._id === productId);
      if (!product) return;

      const response = await fetch(`/api/products/categories/${selectedCategory._id}/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, available: !product.available })
      });

      if (!response.ok) throw new Error('Failed to update product');
      
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      available: product.available
    });
    setProductIngredients([...product.ingredients]);
  };

  const resetCategoryForm = () => {
    setCategoryForm(initialCategoryForm);
    setShowCategoryForm(false);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm(initialProductForm);
    setProductIngredients([]);
    setIngredientForm(initialIngredientForm);
  };

  const getStats = () => {
    const currentCategories = filteredCategories;
    
    return {
      categories: currentCategories.length,
      products: currentCategories.reduce((sum, cat) => sum + (cat.products?.length || 0), 0),
      activeProducts: currentCategories.reduce((sum, cat) => 
        sum + (cat.products?.filter(p => p.available).length || 0), 0
      )
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Menu Management</h1>
            <p className="text-muted-foreground">Manage food and drink menus</p>
          </div>
          <Button onClick={() => setShowCategoryForm(true)} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        <Tabs value={selectedMenu} onValueChange={(value) => setSelectedMenu(value as 'food' | 'drink')} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="food">
              Food Menu
              <Badge variant="secondary" className="ml-2">
                {categories.filter(c => c.menuType === 'food').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="drink">
              Drink Menu
              <Badge variant="secondary" className="ml-2">
                {categories.filter(c => c.menuType === 'drink').length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedMenu === 'food' ? 'Food' : 'Drink'} Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProducts}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedMenu === 'food' ? 'Food' : 'Drink'} Categories</CardTitle>
              <CardDescription>Click on a category to view its products</CardDescription>
            </CardHeader>
            <CardContent>
              {showCategoryForm && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant={categoryForm.menuType === 'food' ? 'default' : 'outline'}
                          onClick={() => setCategoryForm({...categoryForm, menuType: 'food'})}
                          className="flex-1"
                        >
                          Food
                        </Button>
                        {/* <Button
                          variant={categoryForm.menuType === 'drink' ? 'default' : 'outline'}
                          onClick={() => setCategoryForm({...categoryForm, menuType: 'drink'})}
                          className="flex-1"
                        >
                          Drink
                        </Button> */}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input
                          id="category-name"
                          placeholder="Category name"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                          disabled={loading}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleAddCategory} disabled={loading} className="flex-1">
                          {loading ? 'Adding...' : 'Add Category'}
                        </Button>
                        <Button variant="outline" onClick={resetCategoryForm}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-gray-500">No {selectedMenu} categories yet</p>
                  <Button variant="outline" onClick={() => setShowCategoryForm(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Add {selectedMenu === 'food' ? 'Food' : 'Drink'} Category
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="w-25">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow 
                        key={category._id} 
                        className={`cursor-pointer ${selectedCategory?._id === category._id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <TableCell>
                          <div className="font-medium">{category.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {category.products?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (category._id) {
                                handleDeleteCategory(category._id);
                              }
                            }}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {selectedCategory && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedCategory.name} - Products
                      <Badge 
                        variant={selectedCategory.menuType === 'food' ? 'default' : 'secondary'}
                      >
                        {selectedCategory.menuType.charAt(0).toUpperCase() + selectedCategory.menuType.slice(1)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {selectedCategory.products?.length || 0} product(s)
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedCategory.products?.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-gray-500">No products in this category</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-25">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCategory.products?.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                          </TableCell>
                          <TableCell>
                            ₱{product.price.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={product.available ? 'default' : 'secondary'}
                              size="sm"
                              onClick={() => {
                                if (product._id) {
                                  handleToggleProductAvailability(product._id);
                                }
                              }}
                              disabled={loading}
                            >
                              {product.available ? 'Active' : 'Inactive'}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditProduct(product)}
                                disabled={loading}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (product._id) {
                                    handleDeleteProduct(product._id);
                                  }
                                }}
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>
                {selectedCategory ? `${selectedCategory.name} - Product Form` : 'Product Form'}
              </CardTitle>
              <CardDescription>
                {selectedCategory 
                  ? editingProduct ? 'Edit product' : 'Add new product'
                  : 'Select a category first'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCategory ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input
                      id="product-name"
                      placeholder="Product name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-price">Price</Label>
                    <Input
                      id="product-price"
                      type="number"
                      placeholder="Price"
                      value={productForm.price}
                      onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                      disabled={loading}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>{selectedCategory.menuType === 'food' ? 'Ingredients' : 'Contents'}</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={selectedCategory.menuType === 'food' ? 'Ingredient' : 'Content'}
                        value={ingredientForm.name}
                        onChange={(e) => setIngredientForm({...ingredientForm, name: e.target.value})}
                        className="flex-1"
                        disabled={loading}
                      />
                      <Input
                        placeholder="Quantity"
                        value={ingredientForm.quantity}
                        onChange={(e) => setIngredientForm({...ingredientForm, quantity: e.target.value})}
                        className="w-24"
                        disabled={loading}
                      />
                      <Select
                        value={ingredientForm.unit}
                        onValueChange={(value) => setIngredientForm({...ingredientForm, unit: value})}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectedCategory.menuType === 'food' ? UNITS : DRINK_UNITS).map(unit => 
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button size="icon" onClick={handleAddIngredient} disabled={loading}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {productIngredients.length > 0 && (
                      <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                        {productIngredients.map((ing, index) => (
                          <div key={index} className="flex justify-between items-center px-3 py-2">
                            <div className="text-sm">
                              {ing.name}
                              <span className="text-muted-foreground ml-2">
                                {ing.quantity} {ing.unit}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setProductIngredients(prev => prev.filter((_, i) => i !== index))}
                              className="h-6 w-6"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={productForm.available}
                      onCheckedChange={(checked) => setProductForm({...productForm, available: checked})}
                      disabled={loading}
                    />
                    <Label htmlFor="available">Available for sale</Label>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={handleSaveProduct}
                      disabled={loading || !productForm.name || !productForm.price || productIngredients.length === 0}
                      className="w-full"
                    >
                      {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                    </Button>
                    
                    {editingProduct && (
                      <Button variant="outline" onClick={resetProductForm} className="w-full">
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-gray-500">Select a category to add products</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}