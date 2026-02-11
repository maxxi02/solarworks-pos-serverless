'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, X, Edit2, Trash2, Check, Loader2, AlertTriangle } from 'lucide-react';
import { ProductIngredientsForm, ProductIngredient } from '@/components/forms/ProductIngredientsForm';
import AlertModal from '@/components/ui/alertmodal'; // You'll need to create this component

// Updated Types
interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  pricePerUnit: number;
  supplier?: string;
  status: string;
}

interface Product {
  _id?: string;
  name: string;
  price: number;
  description: string;
  ingredients: ProductIngredient[];
  available: boolean;
  categoryId?: string;
  createdAt?: string;
}

interface Category {
  _id?: string;
  name: string;
  description: string;
  products: Product[];
  createdAt?: string;
  updatedAt?: string;
}

// Remove the duplicate Ingredient interface - keep only one
interface Ingredient {
  name: string;
  quantity: number | string;
  unit: string;
  inventoryItemId?: string;
}

export default function CategoriesPage() {
  // States
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form States
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [productForm, setProductForm] = useState({ 
    name: '', price: '', description: '', available: true 
  });
  const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([]);
  
  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Modal States
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('success');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchCategories();
    fetchInventoryItems();
  }, []);

  // Utility Functions
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show alert modal
  const showAlertModal = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  // Show confirmation modal
  const showConfirmationModal = (message: string, onConfirm: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  // API Functions
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

  const fetchInventoryItems = async () => {
    try {
      setInventoryLoading(true);
      const response = await fetch('/api/products/stocks');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventoryItems(data);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const updateSelectedCategory = async () => {
    if (!selectedCategory?._id) return;
    
    try {
      const updatedCategories = await fetch('/api/products/categories').then(res => res.json());
      const updatedCategory = updatedCategories.find((c: Category) => c._id === selectedCategory._id);
      setSelectedCategory(updatedCategory);
    } catch (err) {
      console.error('Failed to update selected category:', err);
    }
  };

  // Category Functions
  const addCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (!response.ok) throw new Error('Failed to add category');
      
      const category = await response.json();
      setCategories(prev => [...prev, category]);
      setNewCategory({ name: '', description: '' });
      setShowCategoryForm(false);
      setSelectedCategory(category);
      showAlertModal('Category added successfully!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
      showAlertModal('Failed to add category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/products/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = `Delete failed: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.warn("Response was not JSON:", await response.text());
        }

        if (response.status === 404) {
          setError('Category not found. It may have already been deleted.');
          await fetchCategories();
          return;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Update UI
      setCategories(prev => prev.filter(c => c._id !== id));
      if (selectedCategory?._id === id) {
        setSelectedCategory(null);
      }

      showAlertModal(result.message || 'Category and its products deleted successfully', 'success');
      
    } catch (err: any) {
      console.error('❌ Delete failed:', err);
      setError(err.message || 'Failed to delete category');
      showAlertModal('Failed to delete category', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Product Functions
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

    // Prepare product data with new ingredient structure
    const productData = {
      name: productForm.name,
      price: price,
      description: productForm.description,
      ingredients: productIngredients,
      available: productForm.available,
      categoryId: selectedCategory._id
    };

    console.log('📤 Sending product with inventory integration:', productData);

    try {
      setLoading(true);
      setError(null);
      
      const endpoint = editingProduct 
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorText = await response.text();
          console.log('📥 Error response text:', errorText);
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorText;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('✅ Product saved:', result);
      
      // Refresh categories
      await fetchCategories();
      
      // Update selected category
      const updatedCategories = await fetch('/api/products/categories')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch updated categories');
          return res.json();
        })
        .catch(err => {
          console.error('Error fetching updated categories:', err);
          return categories;
        });
      
      const updatedCategory = updatedCategories.find((c: Category) => c._id === selectedCategory._id);
      if (updatedCategory) {
        setSelectedCategory(updatedCategory);
      }
      
      resetProductForm();
      showAlertModal(`Product ${editingProduct ? 'updated' : 'added'} successfully!`, 'success');
      
    } catch (err) {
      console.error('❌ Error saving product:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product');
      showAlertModal('Failed to save product', 'error');
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

    // Convert ingredients to ProductIngredient format
    const convertedIngredients = product.ingredients.map(ing => {
      // Type guard to check if it's already a ProductIngredient
      if ('inventoryItemId' in ing) {
        return ing as ProductIngredient;
      }
      // Handle old format - convert to ProductIngredient
      const oldIng = ing as unknown as { name: string; quantity: string | number; unit: string };
      return {
        inventoryItemId: '', // Will be filled by user
        name: oldIng.name,
        quantity: typeof oldIng.quantity === 'string' ? Number(oldIng.quantity) : oldIng.quantity,
        unit: oldIng.unit
      } as ProductIngredient;
    });
    
    setProductIngredients(convertedIngredients);
  };

  const deleteProduct = async (productId: string) => {
    if (!selectedCategory) return;

    try {
      setLoading(true);
      console.log(`🗑️ Deleting product ${productId}`);
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete product error response:', errorText);
        throw new Error(`Failed to delete product: ${response.status}`);
      }
      
      await fetchCategories();
      await updateSelectedCategory();
      showAlertModal('Product deleted successfully!', 'success');
    } catch (err) {
      console.error('❌ Delete product error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      showAlertModal('Failed to delete product', 'error');
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

      // First get the full product data
      const productResponse = await fetch(`/api/products/${productId}`);
      if (!productResponse.ok) throw new Error('Failed to fetch product');
      const fullProduct = await productResponse.json();

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fullProduct, available: !fullProduct.available })
      });

      if (!response.ok) throw new Error('Failed to update product');
      
      await fetchCategories();
      await updateSelectedCategory();
      showAlertModal(`Product ${!fullProduct.available ? 'activated' : 'deactivated'} successfully!`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      showAlertModal('Failed to update product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', description: '', available: true });
    setProductIngredients([]);
  };

  const handleIngredientsChange = useCallback((ingredients: ProductIngredient[]) => {
    setProductIngredients(ingredients);
  }, []);

  // Calculations
  const calculateStats = () => {
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.products?.length || 0), 0);
    const activeProducts = categories.reduce((sum, cat) => 
      sum + (cat.products?.filter(p => p.available).length || 0), 0
    );
    
    return { totalProducts, activeProducts };
  };

  const stats = calculateStats();

  // Get inventory item name by ID
  const getInventoryItemName = (inventoryItemId?: string) => {
    if (!inventoryItemId) return 'Unknown Item';
    const item = inventoryItems.find(item => item._id === inventoryItemId);
    return item ? item.name : 'Unknown Item';
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertType === 'success' ? 'Success' : alertType === 'error' ? 'Error' : 'Warning'}
        message={alertMessage}
        type={alertType}
      />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
            <p className="text-gray-600 mb-6">{confirmMessage}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  confirmAction();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Menu Management</h1>
            <p className="text-muted-foreground mt-1">Manage categories and products with inventory integration</p>
          </div>
          <button 
            onClick={() => setShowCategoryForm(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Category
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-xl font-bold">{categories.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-xl font-bold">{stats.totalProducts}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Active Products</p>
            <p className="text-xl font-bold">{stats.activeProducts}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Inventory Items</p>
            <p className="text-xl font-bold">{inventoryItems.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content - Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Table - Left Column */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold">Categories</h3>
                <p className="text-sm text-muted-foreground mt-1">Click on a category to view its products</p>
              </div>
            </div>
            
            {/* Add Category Form */}
            {showCategoryForm && (
              <div className="mb-6 p-4 border rounded bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">New Category</h4>
                  <button onClick={() => setShowCategoryForm(false)} disabled={loading}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    disabled={loading}
                  />
                  <button 
                    onClick={addCategory} 
                    disabled={loading}
                    className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Category'}
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && categories.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              /* Categories Table */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Category Name</th>
                      <th className="text-left py-3 px-4 font-medium">Products</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p>No categories yet. Add your first category!</p>
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr 
                          key={category._id} 
                          className={`border-b hover:bg-gray-50 cursor-pointer ${selectedCategory?._id === category._id ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedCategory(category)}
                        >
                          <td className="py-4 px-4">
                            <div className="font-medium">{category.name}</div>
                            {category.description && (
                              <div className="text-sm text-gray-500 mt-1">{category.description}</div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                              {category.products?.length || 0}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-500">
                            {formatDate(category.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showConfirmationModal(
                                  'Are you sure you want to delete this category and all its products?',
                                  () => deleteCategory(category._id!)
                                );
                              }}
                              disabled={loading}
                              className="text-red-500 hover:text-red-700"
                              title="Delete category and all its products"
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
            )}
          </div>

          {/* Products Table for Selected Category */}
          {selectedCategory && (
            <div className="mt-6 bg-card rounded-lg border p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold">{selectedCategory.name} - Products</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCategory.products?.length || 0} product(s) in this category
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selectedCategory.products?.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No products in this category. Add your first product!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Product Name</th>
                        <th className="text-left py-3 px-4 font-medium">Price</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Ingredients</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCategory.products?.map((product) => (
                        <tr key={product._id} className="border-b hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-xs text-gray-500 mt-1">{product.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => toggleProductAvailability(product._id!)}
                              disabled={loading}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                product.available 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              <Check className={`h-3 w-3 mr-1 ${product.available ? 'text-green-500' : 'text-red-500'}`} />
                              {product.available ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-xs text-gray-600">
                              {product.ingredients.length > 0 ? (
                                <div className="max-h-20 overflow-y-auto">
                                  {product.ingredients.map((ing, idx) => (
                                    <div key={idx} className="mb-1">
                                      • {getInventoryItemName(ing.inventoryItemId)}: {ing.quantity} {ing.unit}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">No ingredients</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => editProduct(product)}
                                disabled={loading}
                                className="text-blue-500 hover:text-blue-700"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  showConfirmationModal(
                                    'Are you sure you want to delete this product?',
                                    () => deleteProduct(product._id!)
                                  );
                                }}
                                disabled={loading}
                                className="text-red-500 hover:text-red-700"
                                title="Delete"
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

        {/* Product Form - Right Column */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border p-6 sticky top-6">
            <div className="mb-6">
              <h3 className="font-semibold">
                {selectedCategory 
                  ? `${selectedCategory.name} - Product Form`
                  : 'Product Management'
                }
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCategory 
                  ? editingProduct ? 'Edit existing product' : 'Add new product to this category'
                  : 'Select a category first'
                }
              </p>
            </div>

            {selectedCategory ? (
              <div className="space-y-4">
                {/* Basic Product Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₱) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    disabled={loading}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Product description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                    disabled={loading}
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="available"
                    checked={productForm.available}
                    onChange={(e) => setProductForm({...productForm, available: e.target.checked})}
                    className="h-4 w-4 text-primary border-gray-300 rounded"
                    disabled={loading}
                  />
                  <label htmlFor="available" className="ml-2 text-sm text-gray-700">
                    Product is available for sale
                  </label>
                </div>

                {/* Inventory Items Warning */}
                {inventoryItems.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">No Inventory Items</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          You need to add items to inventory first before creating products with ingredients.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ingredients Section */}
                <div className="pt-2">
                  <ProductIngredientsForm
                    inventoryItems={inventoryItems}
                    onIngredientsChange={handleIngredientsChange}
                    initialIngredients={productIngredients}
                    loading={inventoryLoading}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t space-y-2">
                  <button
                    onClick={saveProduct}
                    disabled={loading || !productForm.name || !productForm.price || productIngredients.length === 0}
                    className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : editingProduct ? 'Update Product' : 'Add Product'}
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
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <h4 className="font-semibold mb-2">Select a Category</h4>
                <p className="text-sm text-gray-500">
                  Select a category from the table to add or edit products
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}