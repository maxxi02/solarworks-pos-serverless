'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, X, Edit2, Trash2,Utensils, Coffee } from 'lucide-react';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Product {
  _id?: string;
  name: string;
  price: number;
  description: string;
  ingredients: Ingredient[];
  available: boolean;
  categoryId?: string;
}

interface Category {
  _id?: string;
  name: string;
  description: string;
  products: Product[];
  menuType: 'food' | 'drink';
}

const UNITS = ['grams', 'kg', 'ml', 'liters', 'pieces', 'cups', 'tbsp', 'tsp', 'oz'];
const DRINK_UNITS = ['ml', 'liters', 'cups', 'oz'];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<'food' | 'drink'>('food');
  
  const [categoryForm, setCategoryForm] = useState({ 
    name: '', 
    description: '', 
    menuType: 'food' as 'food' | 'drink' 
  });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [productForm, setProductForm] = useState({ 
    name: '', price: '', description: '', available: true 
  });
  const [ingredientForm, setIngredientForm] = useState({ 
    name: '', quantity: '', unit: 'grams' 
  });
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

  const addCategory = async () => {
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
      setCategoryForm({ name: '', description: '', menuType: 'food' });
      setShowCategoryForm(false);
      setSelectedCategory(category);
      setSelectedMenu(category.menuType);
      alert('Category added successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category and all its products?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/products/categories/${id}`, { method: 'DELETE' });
      
      if (!response.ok) throw new Error('Failed to delete category');
      
      setCategories(prev => prev.filter(c => c._id !== id));
      if (selectedCategory?._id === id) setSelectedCategory(null);
      alert('Category deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    if (!ingredientForm.name.trim() || !ingredientForm.quantity.trim()) {
      setError('Ingredient name and quantity are required');
      return;
    }

    setProductIngredients(prev => [...prev, ingredientForm]);
    setIngredientForm({ 
      name: '', 
      quantity: '', 
      unit: 'grams' 
    });
  };

  const saveProduct = async () => {
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
      const response = await fetch('/api/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (!response.ok) throw new Error('Failed to save product');
      
      await fetchCategories();
      resetProductForm();
      alert('Product added successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!selectedCategory || !confirm('Are you sure you want to delete this product?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/products/categories/${selectedCategory._id}/products/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete product');
      
      await fetchCategories();
      alert('Product deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductAvailability = async (productId: string) => {
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
      alert(`Product ${!product.available ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      available: product.available
    });
    setProductIngredients([...product.ingredients]);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', description: '', available: true });
    setProductIngredients([]);
    setIngredientForm({ name: '', quantity: '', unit: 'grams' });
  };

  const getStats = () => {
    const foodCategories = categories.filter(c => c.menuType === 'food');
    const drinkCategories = categories.filter(c => c.menuType === 'drink');
    
    const currentCategories = selectedMenu === 'food' ? foodCategories : drinkCategories;
    
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
          <button 
            onClick={() => setShowCategoryForm(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>

        {/* Menu Selector - Food and Drink only */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSelectedMenu('food')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              selectedMenu === 'food' 
                ? 'bg-green-600 text-white border-2 border-green-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
            }`}
          >
            <Utensils className="h-5 w-5" />
            Food Menu
            <span className="ml-2 px-2 py-1 text-xs bg-white text-green-800 rounded">
              {categories.filter(c => c.menuType === 'food').length}
            </span>
          </button>
          <button
            onClick={() => setSelectedMenu('drink')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              selectedMenu === 'drink' 
                ? 'bg-blue-600 text-white border-2 border-blue-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
            }`}
          >
            <Coffee className="h-5 w-5" />
            Drink Menu
            <span className="ml-2 px-2 py-1 text-xs bg-white text-blue-800 rounded">
              {categories.filter(c => c.menuType === 'drink').length}
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              {selectedMenu === 'food' ? 'Food' : 'Drink'} Categories
            </p>
            <p className="text-xl font-bold">{stats.categories}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-xl font-bold">{stats.products}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Active Products</p>
            <p className="text-xl font-bold">{stats.activeProducts}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold">
                  {selectedMenu === 'food' ? 'Food' : 'Drink'} Categories
                </h3>
                <p className="text-sm text-muted-foreground">Click on a category to view its products</p>
              </div>
            </div>

            {showCategoryForm && (
              <div className="mb-6 p-4 border rounded bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">New Category</h4>
                  <button onClick={() => setShowCategoryForm(false)}><X className="h-5 w-5" /></button>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setCategoryForm({...categoryForm, menuType: 'food'})}
                    className={`flex-1 px-3 py-2 rounded border flex items-center justify-center gap-2 ${
                      categoryForm.menuType === 'food' 
                        ? 'bg-green-100 text-green-800 border-green-500' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Utensils className="h-4 w-4" /> Food
                  </button>
                  <button
                    onClick={() => setCategoryForm({...categoryForm, menuType: 'drink'})}
                    className={`flex-1 px-3 py-2 rounded border flex items-center justify-center gap-2 ${
                      categoryForm.menuType === 'drink' 
                        ? 'bg-blue-100 text-blue-800 border-blue-500' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Coffee className="h-4 w-4" /> Drink
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    disabled={loading}
                  />
                  <button 
                    onClick={addCategory} 
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
                  >
                    {loading ? 'Adding...' : 'Add Category'}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Products</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-3" />
                        <p>No {selectedMenu} categories yet</p>
                        <button 
                          onClick={() => setShowCategoryForm(true)}
                          className="mt-2 flex items-center gap-1 mx-auto text-primary hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add {selectedMenu === 'food' ? 'Food' : 'Drink'} Category
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => (
                      <tr 
                        key={category._id} 
                        className={`border-b hover:bg-gray-50 cursor-pointer ${selectedCategory?._id === category._id ? 'bg-primary/10' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-500">{category.description}</div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            {category.products?.length || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCategory(category._id!);
                            }}
                            disabled={loading}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Products Table */}
            {selectedCategory && (
              <div className="mt-6 bg-card rounded-lg border p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{selectedCategory.name} - Products</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        selectedCategory.menuType === 'food' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedCategory.menuType === 'food' ? 'Food' : 'Drink'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedCategory.products?.length || 0} product(s)
                    </p>
                  </div>
                  <button onClick={() => setSelectedCategory(null)}><X className="h-5 w-5" /></button>
                </div>

                {selectedCategory.products?.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-3" />
                    <p className="text-gray-500">No products in this category</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Product</th>
                          <th className="text-left py-3 px-4">Price</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCategory.products?.map((product) => (
                          <tr key={product._id} className="border-b hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-gray-500">{product.description}</div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              ₱{product.price.toLocaleString()}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => toggleProductAvailability(product._id!)}
                                disabled={loading}
                                className={`px-2.5 py-0.5 rounded-full text-xs ${
                                  product.available 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {product.available ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => editProduct(product)}
                                  disabled={loading}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteProduct(product._id!)}
                                  disabled={loading}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Form */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border p-6 sticky top-6">
            <div className="mb-6">
              <h3 className="font-semibold">
                {selectedCategory ? `${selectedCategory.name} - Product Form` : 'Product Form'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedCategory 
                  ? editingProduct ? 'Edit product' : 'Add new product'
                  : 'Select a category first'
                }
              </p>
            </div>

            {selectedCategory ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Product name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  disabled={loading}
                />

                <input
                  type="number"
                  placeholder="Price"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  disabled={loading}
                />

                <textarea
                  placeholder="Description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                  disabled={loading}
                />

                {/* Ingredients */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {selectedCategory.menuType === 'food' ? 'Ingredients' : 'Contents'}
                  </label>
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder={selectedCategory.menuType === 'food' ? 'Ingredient' : 'Content'}
                        value={ingredientForm.name}
                        onChange={(e) => setIngredientForm({...ingredientForm, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Qty"
                        value={ingredientForm.quantity}
                        onChange={(e) => setIngredientForm({...ingredientForm, quantity: e.target.value})}
                        className="w-full px-3 py-2 border rounded text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={ingredientForm.unit}
                        onChange={(e) => setIngredientForm({...ingredientForm, unit: e.target.value})}
                        className="w-full px-3 py-2 border rounded text-sm"
                        disabled={loading}
                      >
                        {(selectedCategory.menuType === 'food' ? UNITS : DRINK_UNITS).map(unit => 
                          <option key={unit} value={unit}>{unit}</option>
                        )}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <button 
                        onClick={addIngredient}
                        disabled={loading}
                        className="w-full h-full bg-gray-800 text-white rounded hover:bg-gray-700 flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {productIngredients.length > 0 && (
                    <div className="border rounded max-h-48 overflow-y-auto">
                      {productIngredients.map((ing, index) => (
                        <div key={index} className="flex justify-between items-center px-3 py-2 border-b">
                          <div>
                            <span className="text-sm">{ing.name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {ing.quantity} {ing.unit}
                            </span>
                          </div>
                          <button 
                            onClick={() => setProductIngredients(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="available"
                    checked={productForm.available}
                    onChange={(e) => setProductForm({...productForm, available: e.target.checked})}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                    disabled={loading}
                  />
                  <label htmlFor="available" className="ml-2 text-sm">
                    Available for sale
                  </label>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={saveProduct}
                    disabled={loading || !productForm.name || !productForm.price || productIngredients.length === 0}
                    className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  
                  {editingProduct && (
                    <button
                      onClick={resetProductForm}
                      className="w-full bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-3" />
                <p className="text-gray-500">Select a category to add products</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}