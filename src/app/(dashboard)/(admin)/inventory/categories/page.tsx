'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Utensils,
  Coffee
} from 'lucide-react';
import { ProductIngredientsForm, ProductIngredient } from '@/components/forms/ProductIngredientsForm';
import { toast } from 'sonner';

// Updated Types with MenuType
type MenuType = 'food' | 'drink';

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
  menuType?: MenuType; // Added menuType
  createdAt?: string;
}

interface Category {
  _id?: string;
  name: string;
  description: string;
  menuType: MenuType; // Added menuType (required)
  products: Product[];
  createdAt?: string;
  updatedAt?: string;
}

// Delete Confirm Modal Component
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'product'
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: 'product' | 'category';
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 dark:bg-black/90">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete {itemType === 'category' ? 'Category' : 'Product'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete <span className="font-semibold dark:text-white">"{itemName}"</span>?
          </p>
          <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-100 dark:border-red-900/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">
                {itemType === 'category'
                  ? 'This will permanently delete the category and ALL products within it.'
                  : 'This will permanently remove this product from your menu.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 dark:bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete {itemType === 'category' ? 'Category' : 'Product'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Category Modal Component with MenuType
function AddCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, description: string, menuType: MenuType) => Promise<void>;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [menuType, setMenuType] = useState<MenuType>('food');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Validation Error', {
        description: 'Category name is required'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(name.trim(), description.trim(), menuType);
      setName('');
      setDescription('');
      setMenuType('food');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Category</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isSubmitting || loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Menu Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMenuType('food')}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${menuType === 'food'
                  ? 'bg-blue-600 dark:bg-blue-700 border-blue-600 dark:border-blue-700 text-white'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
              >
                <Utensils className="h-4 w-4" />
                <span>Food</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuType('drink')}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 transition-all ${menuType === 'drink'
                  ? 'bg-blue-600 dark:bg-blue-700 border-blue-600 dark:border-blue-700 text-white'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
              >
                <Coffee className="h-4 w-4" />
                <span>Drink</span>
              </button>
            </div>
          </div>

          {/* Category Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Main Dishes, Beverages"
              disabled={isSubmitting || loading}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Brief description of the category..."
              disabled={isSubmitting || loading}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting || loading}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || loading || !name.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmitting || loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Category
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  // States
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Form States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', price: '', description: '', available: true
  });
  const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([]);

  // Filter State for Categories Table
  const [menuTypeFilter, setMenuTypeFilter] = useState<'all' | MenuType>('all');

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Delete Modal States
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
    itemType: 'product' | 'category';
  }>({
    isOpen: false,
    itemId: null,
    itemName: '',
    itemType: 'product'
  });

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

  const getMenuTypeIcon = (menuType?: MenuType) => {
    if (menuType === 'food') return <Utensils className="h-3.5 w-3.5" />;
    if (menuType === 'drink') return <Coffee className="h-3.5 w-3.5" />;
    return null;
  };

  const getMenuTypeColor = (menuType?: MenuType) => {
    if (menuType === 'food') return 'bg-orange-100 dark:bg-orange-900/10 text-orange-800 dark:text-orange-500 border-orange-200 dark:border-orange-900/30';
    if (menuType === 'drink') return 'bg-blue-100 dark:bg-blue-900/10 text-blue-800 dark:text-blue-500 border-blue-200 dark:border-blue-900/30';
    return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-400';
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
      console.error('Failed to fetch categories:', err);
      toast.error('Failed to load categories', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
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
      toast.error('Failed to load inventory', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
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
  const addCategory = async (name: string, description: string, menuType: MenuType) => {
    try {
      const response = await fetch('/api/products/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, menuType }) // Include menuType
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add category');
      }

      const category = await response.json();
      setCategories(prev => [...prev, category]);
      setSelectedCategory(category);

      toast.success('Category Added', {
        description: `${name} has been added to ${menuType} categories`
      });
    } catch (err) {
      console.error('Failed to add category:', err);
      toast.error('Failed to add category', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/products/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete category');
      }

      const result = await response.json();

      setCategories(prev => prev.filter(c => c._id !== id));
      if (selectedCategory?._id === id) {
        setSelectedCategory(null);
      }

      toast.success('Category Deleted', {
        description: result.message || 'Category has been deleted successfully'
      });
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error('Failed to delete category', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      throw err;
    }
  };

  // Product Functions
  const saveProduct = async () => {
    if (!productForm.name || !productForm.price || !selectedCategory || productIngredients.length === 0) {
      toast.error('Missing Information', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    const price = parseFloat(productForm.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Invalid Price', {
        description: 'Please enter a valid price greater than 0'
      });
      return;
    }

    const productData = {
      name: productForm.name,
      price: price,
      description: productForm.description,
      ingredients: productIngredients,
      available: productForm.available,
      categoryId: selectedCategory._id,
      menuType: selectedCategory.menuType // Inherit menuType from category
    };

    try {
      setLoading(true);

      const endpoint = editingProduct
        ? `/api/products/category-products/${editingProduct._id}`
        : '/api/products/category-products';

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${editingProduct ? 'update' : 'create'} product`);
      }

      const updatedCategories = await fetch('/api/products/categories').then(res => res.json());
      const updatedCategory = updatedCategories.find((c: Category) => c._id === selectedCategory._id);
      if (updatedCategory) {
        setSelectedCategory(updatedCategory);
      }

      resetProductForm();

      toast.success(editingProduct ? 'Product Updated' : 'Product Added', {
        description: `${productForm.name} has been ${editingProduct ? 'updated' : 'added'} successfully`
      });

    } catch (err) {
      console.error('Failed to save product:', err);
      toast.error(`Failed to ${editingProduct ? 'update' : 'add'} product`, {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
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

    const convertedIngredients = product.ingredients.map(ing => {
      if ('inventoryItemId' in ing) {
        return ing as ProductIngredient;
      }
      const oldIng = ing as unknown as { name: string; quantity: string | number; unit: string };
      return {
        inventoryItemId: '',
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
      const response = await fetch(`/api/products/category-products/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete product');
      }

      const result = await response.json();

      await fetchCategories();
      await updateSelectedCategory();

      toast.success('Product Deleted', {
        description: result.message || 'Product has been deleted successfully'
      });
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast.error('Failed to delete product', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      throw err;
    }
  };

  const toggleProductAvailability = async (productId: string) => {
    if (!selectedCategory) return;

    try {
      const product = selectedCategory.products.find(p => p._id === productId);
      if (!product) return;

      const productResponse = await fetch(`/api/products/category-products/${productId}`);
      if (!productResponse.ok) throw new Error('Failed to fetch product');
      const fullProduct = await productResponse.json();

      const response = await fetch(`/api/products/category-products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fullProduct, available: !fullProduct.available })
      });

      if (!response.ok) throw new Error('Failed to update product');

      await fetchCategories();
      await updateSelectedCategory();

      toast.success('Product Status Updated', {
        description: `${product.name} is now ${!fullProduct.available ? 'available' : 'unavailable'} for sale`
      });
    } catch (err) {
      console.error('Failed to update product:', err);
      toast.error('Failed to update product', {
        description: err instanceof Error ? err.message : 'Unknown error occurred'
      });
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

  // Delete handlers
  const handleDeleteCategoryClick = (categoryId: string, categoryName: string) => {
    setDeleteModal({
      isOpen: true,
      itemId: categoryId,
      itemName: categoryName,
      itemType: 'category'
    });
  };

  const handleDeleteProductClick = (productId: string, productName: string) => {
    setDeleteModal({
      isOpen: true,
      itemId: productId,
      itemName: productName,
      itemType: 'product'
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.itemId) return;

    if (deleteModal.itemType === 'category') {
      await deleteCategory(deleteModal.itemId);
    } else {
      await deleteProduct(deleteModal.itemId);
    }
  };

  // Filtered categories based on menu type
  const filteredCategories = categories.filter(category => {
    if (menuTypeFilter === 'all') return true;
    return category.menuType === menuTypeFilter;
  });

  // Calculations
  const calculateStats = () => {
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.products?.length || 0), 0);
    const activeProducts = categories.reduce((sum, cat) =>
      sum + (cat.products?.filter(p => p.available).length || 0), 0
    );
    const foodCategories = categories.filter(cat => cat.menuType === 'food').length;
    const drinkCategories = categories.filter(cat => cat.menuType === 'drink').length;

    return { totalProducts, activeProducts, foodCategories, drinkCategories };
  };

  const stats = calculateStats();

  // Get inventory item name by ID
  const getInventoryItemName = (inventoryItemId?: string) => {
    if (!inventoryItemId) return 'Unknown Item';
    const item = inventoryItems.find(item => item._id === inventoryItemId);
    return item ? item.name : 'Unknown Item';
  };

  // Get status color
  const getStatusColor = (available: boolean) => {
    return available
      ? 'bg-green-100 dark:bg-green-900/10 text-green-800 dark:text-green-500 border-green-200 dark:border-green-900/30'
      : 'bg-red-100 dark:bg-red-900/10 text-red-800 dark:text-red-500 border-red-200 dark:border-red-900/30';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.itemName}
        itemType={deleteModal.itemType}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onConfirm={addCategory}
        loading={loading}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage food and drink categories with inventory integration
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button
              onClick={() => {
                fetchCategories();
                fetchInventoryItems();
                toast.info('Refreshing Data', {
                  description: 'Categories and inventory are being updated'
                });
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </div>

        {/* Stats Cards with Menu Type Breakdown */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Food Categories</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{stats.foodCategories}</p>
              </div>
              <Utensils className="h-8 w-8 text-orange-600 dark:text-orange-500" />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Drink Categories</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{stats.drinkCategories}</p>
              </div>
              <Coffee className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Table - Left Column */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Click on a category to view its products
                  </p>
                </div>

                {/* Menu Type Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setMenuTypeFilter('all')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${menuTypeFilter === 'all'
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setMenuTypeFilter('food')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${menuTypeFilter === 'food'
                      ? 'bg-orange-600 dark:bg-orange-700 text-white'
                      : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                  >
                    <Utensils className="h-3.5 w-3.5" />
                    Food
                  </button>
                  <button
                    onClick={() => setMenuTypeFilter('drink')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${menuTypeFilter === 'drink'
                      ? 'bg-blue-600 dark:bg-blue-700 text-white'
                      : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    Drink
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {loading && !categories.length ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading categories...</span>
                </div>
              ) : (
                /* Categories Table */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Category Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Products
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                              {menuTypeFilter === 'all'
                                ? 'No categories yet'
                                : `No ${menuTypeFilter} categories yet`}
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {menuTypeFilter === 'all'
                                ? 'Add your first category to get started'
                                : `Add your first ${menuTypeFilter} category to get started`}
                            </p>
                            <button
                              onClick={() => setShowCategoryModal(true)}
                              className="mt-4 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              <Plus className="mr-2 inline h-4 w-4" />
                              Add Category
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((category) => (
                          <tr
                            key={category._id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-all ${selectedCategory?._id === category._id
                              ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-600 dark:border-l-blue-500'
                              : ''
                              }`}
                            onClick={() => setSelectedCategory(category)}
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{category.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getMenuTypeColor(category.menuType)}`}>
                                {getMenuTypeIcon(category.menuType)}
                                {category.menuType === 'food' ? 'Food' : 'Drink'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category.products?.length > 0
                                ? 'bg-blue-100 dark:bg-blue-900/10 text-blue-800 dark:text-blue-500 border border-blue-200 dark:border-blue-900/30'
                                : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
                                }`}>
                                {category.products?.length || 0} products
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(category.createdAt)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategoryClick(category._id!, category.name);
                                }}
                                disabled={loading}
                                className="rounded-lg bg-red-100 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-500 hover:bg-red-200 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
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
          </div>

          {/* Products Table for Selected Category */}
          {selectedCategory && (
            <div className="mt-6 overflow-hidden rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedCategory.name} - Products
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${getMenuTypeColor(selectedCategory.menuType)}`}>
                        {getMenuTypeIcon(selectedCategory.menuType)}
                        {selectedCategory.menuType === 'food' ? 'Food' : 'Drink'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedCategory.products?.length || 0} product(s) in this category
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedCategory.products?.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">No products in this category. Add your first product!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Product Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Ingredients
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {selectedCategory.products?.map((product) => (
                          <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                              {product.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleProductAvailability(product._id!)}
                                disabled={loading}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${getStatusColor(product.available)}`}
                              >
                                {product.available ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                {product.available ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                                {product.ingredients.length > 0 ? (
                                  <div className="max-h-20 overflow-y-auto space-y-1">
                                    {product.ingredients.map((ing, idx) => (
                                      <div key={idx} className="flex items-center gap-1">
                                        <span className="text-gray-400 dark:text-gray-600">•</span>
                                        <span className="truncate">
                                          {getInventoryItemName(ing.inventoryItemId)}: {ing.quantity} {ing.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-600 italic">No ingredients</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => editProduct(product)}
                                  disabled={loading}
                                  className="rounded-lg bg-blue-100 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
                                  title="Edit product"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProductClick(product._id!, product.name)}
                                  disabled={loading}
                                  className="rounded-lg bg-red-100 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-500 hover:bg-red-200 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                                  title="Delete product"
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
            </div>
          )}
        </div>

        {/* Product Form - Right Column */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 overflow-hidden rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedCategory
                    ? `${selectedCategory.name} - Product Form`
                    : 'Product Management'
                  }
                </h3>
                {selectedCategory && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${getMenuTypeColor(selectedCategory.menuType)}`}>
                    {getMenuTypeIcon(selectedCategory.menuType)}
                    {selectedCategory.menuType === 'food' ? 'Food' : 'Drink'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (₱) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                    disabled={loading}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Product description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
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
                    onChange={(e) => setProductForm({ ...productForm, available: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-black"
                    disabled={loading}
                  />
                  <label htmlFor="available" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Product is available for sale
                  </label>
                </div>

                {/* Category Type Info */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start gap-2">
                    {selectedCategory.menuType === 'food' ? (
                      <Utensils className="h-4 w-4 text-orange-600 dark:text-orange-500 mt-0.5" />
                    ) : (
                      <Coffee className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {selectedCategory.menuType === 'food' ? 'Food Category' : 'Drink Category'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        This product will inherit the category type
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inventory Items Warning */}
                {inventoryItems.length === 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-500">No Inventory Items</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-600 mt-1">
                          You need to add items to inventory first before creating products with ingredients.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ingredients Section */}
                <div className="pt-2">
                  <ProductIngredientsForm
                    inventoryItems={inventoryItems as any}
                    // inventoryItems={inventoryItems}
                    onIngredientsChange={handleIngredientsChange}
                    initialIngredients={productIngredients}
                    loading={inventoryLoading}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                  <button
                    onClick={saveProduct}
                    disabled={loading || !productForm.name || !productForm.price || productIngredients.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {editingProduct ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </>
                    )}
                  </button>

                  {editingProduct && (
                    <button
                      onClick={resetProductForm}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select a Category</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  Click on any category from the table to start adding or editing products
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}