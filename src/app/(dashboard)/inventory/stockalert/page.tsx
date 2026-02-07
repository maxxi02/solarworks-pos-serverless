'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  Plus, 
  Trash2, 
  Search,
  Filter,
  BarChart3,
  Coffee,
  Utensils,
  ShoppingCart,
  CheckCircle,
  X,
  Save,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  fetchInventory,
  createInventoryItem,
  deleteInventoryItem,
  adjustStock
} from '@/lib/inventoryService';
import { InventoryItem } from '@/types';
import { toast } from 'sonner';

// Delete Confirm Modal Component
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 dark:bg-black/80">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Item</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete <span className="font-semibold dark:text-white">"{itemName}"</span> from your inventory?
          </p>
          <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">
                This will permanently remove the item and all associated stock adjustment history.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
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
                Delete Item
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  // State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'restock' | 'usage' | 'waste' | 'correction'>('restock');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    currentStock: '',
    minStock: '',
    maxStock: '',
    unit: 'pieces' as InventoryItem['unit'],
    pricePerUnit: '',
    supplier: '',
    location: '',
    reorderPoint: ''
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemId: string | null;
    itemName: string;
  }>({
    isOpen: false,
    itemId: null,
    itemName: ''
  });

  // Load inventory on mount and when filters change
  useEffect(() => {
    loadInventory();
  }, [categoryFilter, statusFilter, searchQuery]);

  // Load inventory with filters
  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory(
        categoryFilter !== 'all' ? categoryFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
        searchQuery || undefined
      );
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Failed to load inventory', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category)))];

  // Calculate statistics
  const criticalItems = inventory.filter(item => item.status === 'critical');
  const lowItems = inventory.filter(item => item.status === 'low');
  const warningItems = inventory.filter(item => item.status === 'warning');
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.pricePerUnit), 0);

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    if (!showAdjustModal || !adjustmentQuantity || isNaN(Number(adjustmentQuantity))) {
      toast.error('Invalid quantity', {
        description: 'Please enter a valid quantity'
      });
      return;
    }

    try {
      const quantity = Number(adjustmentQuantity);
      
      // Validate quantity
      if (quantity > 100000) {
        toast.error('Validation Error', {
          description: 'Quantity cannot exceed 100,000 units'
        });
        return;
      }

      const result = await adjustStock(showAdjustModal._id!, {
        type: adjustmentType,
        quantity,
        notes: adjustmentNotes,
        performedBy: 'Admin'
      });

      // Update local state immediately for better UX
      setInventory(prev => prev.map(item => {
        if (item._id === showAdjustModal._id) {
          return {
            ...item,
            currentStock: result.newStock,
            status: result.status,
            lastRestocked: adjustmentType === 'restock' ? new Date() : item.lastRestocked
          };
        }
        return item;
      }));

      toast.success(`Stock ${adjustmentType === 'restock' ? 'Restocked' : 'Adjusted'}`, {
        description: `${adjustmentQuantity} ${showAdjustModal.unit} ${adjustmentType === 'restock' ? 'added to' : adjustmentType === 'usage' ? 'used from' : 'adjusted for'} ${showAdjustModal.name}`
      });
      
      // Reset modal
      setShowAdjustModal(null);
      setAdjustmentQuantity('');
      setAdjustmentNotes('');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // Add new item
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.currentStock || !newItem.minStock) {
      toast.error('Missing Information', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    try {
      // Validate price
      const price = Number(newItem.pricePerUnit);
      if (price > 1000000) {
        toast.error('Validation Error', {
          description: 'Price per unit cannot exceed ₱1,000,000'
        });
        return;
      }

      // Validate stock
      const stock = Number(newItem.currentStock);
      if (stock > 100000) {
        toast.error('Validation Error', {
          description: 'Stock cannot exceed 100,000 units'
        });
        return;
      }

      const inventoryItem: Omit<InventoryItem, '_id' | 'createdAt' | 'updatedAt'> = {
        name: newItem.name,
        category: newItem.category,
        currentStock: stock,
        minStock: Number(newItem.minStock),
        maxStock: Number(newItem.maxStock) || Number(newItem.minStock) * 3,
        unit: newItem.unit,
        supplier: newItem.supplier || 'Unknown',
        lastRestocked: new Date(),
        pricePerUnit: price,
        location: newItem.location || 'Unassigned',
        reorderPoint: Number(newItem.reorderPoint) || Math.ceil(Number(newItem.minStock) * 1.5),
        icon: 'package',
        status: 'ok'
      };

      const result = await createInventoryItem(inventoryItem);
      
      // Add to local state immediately
      setInventory(prev => [...prev, { ...inventoryItem, _id: result._id, createdAt: new Date(), updatedAt: new Date() }]);
      
      setShowAddModal(false);
      resetNewItemForm();
      
      toast.success('Item Added', {
        description: `${newItem.name} has been added to inventory`
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // Delete item
  const handleDeleteClick = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      itemId: id,
      itemName: name
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.itemId) return;

    try {
      await deleteInventoryItem(deleteModal.itemId);
      
      // Remove from local state immediately
      setInventory(prev => prev.filter(item => item._id !== deleteModal.itemId));
      
      // Close modal
      setDeleteModal({
        isOpen: false,
        itemId: null,
        itemName: ''
      });
      
      toast.success('Item Deleted', {
        description: `${deleteModal.itemName} has been removed from inventory`
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // Reset new item form
  const resetNewItemForm = () => {
    setNewItem({
      name: '',
      category: '',
      currentStock: '',
      minStock: '',
      maxStock: '',
      unit: 'pieces',
      pricePerUnit: '',
      supplier: '',
      location: '',
      reorderPoint: ''
    });
  };

  // Get status color - updated for dark mode
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'low': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'ok': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'ok': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Get item icon
  const getItemIcon = (icon: string) => {
    switch (icon) {
      case 'coffee': return <Coffee className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
      case 'milk': return <Coffee className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
      case 'syrup': return <Coffee className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
      case 'package': return <Package className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
      case 'utensils': return <Utensils className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
      default: return <Package className="h-5 w-5 text-blue-600 dark:text-blue-500" />;
    }
  };

  // Apply filters
  const applyFilters = () => {
    toast.info('Filters Applied', {
      description: 'Inventory list updated with current filters'
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    toast.info('Filters Cleared', {
      description: 'All filters have been cleared'
    });
  };

  // Format number with limits
  const formatNumber = (value: string, max: number) => {
    const num = Number(value);
    if (isNaN(num)) return '';
    if (num > max) return max.toString();
    return value;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage all ingredients and supplies</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button
              onClick={loadInventory}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              Add New Item
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mb-6 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 p-8 shadow dark:shadow-gray-900">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading inventory...</span>
        </div>
      )}

      {/* Stats Overview */}
      {!loading && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow dark:shadow-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventory.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow dark:shadow-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Critical Items</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">{criticalItems.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow dark:shadow-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₱{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow dark:shadow-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Need Restocking</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                    {inventory.filter(item => item.currentStock <= item.reorderPoint).length}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-600 dark:text-orange-500" />
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 rounded-lg bg-white dark:bg-gray-800 p-4 shadow dark:shadow-gray-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-600"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="critical">Critical</option>
                    <option value="low">Low</option>
                    <option value="warning">Warning</option>
                    <option value="ok">OK</option>
                  </select>
                </div>

                {/* Apply/Clear Filters */}
                <div className="flex gap-2">
                  <button
                    onClick={applyFilters}
                    className="rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Apply
                  </button>
                  <button
                    onClick={clearFilters}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow dark:shadow-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Stock Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Last Restocked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {inventory.map((item) => {
                    const stockPercentage = (item.currentStock / item.maxStock) * 100;
                    const needsRestock = item.currentStock <= item.reorderPoint;
                    
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                              {getItemIcon(item.icon)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{item.category}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">{item.supplier}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Current:</span>
                              <span className={`font-semibold ${
                                needsRestock ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'
                              }`}>
                                {item.currentStock} {item.unit}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Min:</span>
                              <span className="text-gray-900 dark:text-white">{item.minStock} {item.unit}</span>
                            </div>
                            <div className="mt-2">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div 
                                  className={`h-full ${
                                    item.status === 'critical' ? 'bg-red-600 dark:bg-red-500' :
                                    item.status === 'low' ? 'bg-orange-500 dark:bg-orange-500' :
                                    item.status === 'warning' ? 'bg-yellow-500 dark:bg-yellow-500' :
                                    'bg-green-500 dark:bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                />
                              </div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {Math.round(stockPercentage)}% of max stock
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="capitalize">{item.status}</span>
                          </div>
                          {needsRestock && (
                            <div className="mt-1 text-xs text-red-600 dark:text-red-500">
                              Reorder point: {item.reorderPoint} {item.unit}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">{item.location}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ₱{item.pricePerUnit.toLocaleString()}/{item.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(item.lastRestocked).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.floor((new Date().getTime() - new Date(item.lastRestocked).getTime()) / (1000 * 3600 * 24))} days ago
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowAdjustModal(item)}
                              className="rounded-lg bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item._id!, item.name)}
                              className="rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-500 hover:bg-red-200 dark:hover:bg-red-800/50"
                              title="Delete item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {inventory.length === 0 && !loading && (
              <div className="px-6 py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Try a different search or clear filters' 
                    : 'Add your first inventory item'}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <Plus className="mr-2 inline h-4 w-4" />
                  Add New Item
                </button>
              </div>
            )}
          </div>

          {/* Alerts Section */}
          {criticalItems.length > 0 && (
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Critical Stock Alerts</h3>
              </div>
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {criticalItems.map(item => (
                    <div key={item._id} className="rounded-lg bg-white dark:bg-gray-800 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Stock: {item.currentStock} {item.unit} • Min: {item.minStock} {item.unit}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{item.location}</p>
                        </div>
                        <button
                          onClick={() => setShowAdjustModal(item)}
                          className="rounded-lg bg-red-600 dark:bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Inventory Item</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewItemForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name *</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                  placeholder="e.g., Espresso Beans"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="e.g., Coffee"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit *</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value as InventoryItem['unit']})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="L">Liters</option>
                    <option value="mL">Milliliters</option>
                    <option value="boxes">Boxes</option>
                    <option value="bottles">Bottles</option>
                    <option value="bags">Bags</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Stock *</label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={newItem.currentStock}
                    onChange={(e) => setNewItem({...newItem, currentStock: formatNumber(e.target.value, 100000)})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max: 100,000 units</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.minStock}
                    onChange={(e) => setNewItem({...newItem, minStock: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Stock</label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={newItem.maxStock}
                    onChange={(e) => setNewItem({...newItem, maxStock: formatNumber(e.target.value, 100000)})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="50"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max: 100,000 units</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price per Unit (₱)</label>
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    value={newItem.pricePerUnit}
                    onChange={(e) => setNewItem({...newItem, pricePerUnit: formatNumber(e.target.value, 1000000)})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max: ₱1,000,000</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.reorderPoint}
                    onChange={(e) => setNewItem({...newItem, reorderPoint: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="15"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                  <input
                    type="text"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="Storage location"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewItemForm();
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                <Save className="mr-2 inline h-4 w-4" />
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adjust Stock: {showAdjustModal.name}</h3>
              <button
                onClick={() => {
                  setShowAdjustModal(null);
                  setAdjustmentQuantity('');
                  setAdjustmentNotes('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Stock:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {showAdjustModal.currentStock} {showAdjustModal.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Min Stock:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {showAdjustModal.minStock} {showAdjustModal.unit}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Type</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAdjustmentType('restock')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      adjustmentType === 'restock'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    Restock
                  </button>
                  <button
                    onClick={() => setAdjustmentType('usage')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      adjustmentType === 'usage'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    Usage
                  </button>
                  <button
                    onClick={() => setAdjustmentType('waste')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      adjustmentType === 'waste'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    Waste
                  </button>
                  <button
                    onClick={() => setAdjustmentType('correction')}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      adjustmentType === 'correction'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    Correction
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {adjustmentType === 'restock' ? 'Quantity to Add' : 
                   adjustmentType === 'usage' ? 'Quantity Used' :
                   adjustmentType === 'waste' ? 'Wasted Quantity' :
                   'Correct Stock to'}
                </label>
                <div className="mt-1 flex">
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(formatNumber(e.target.value, 100000))}
                    className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                    placeholder="Enter quantity"
                  />
                  <div className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{showAdjustModal.unit}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max: 100,000 units</p>
                {adjustmentType === 'correction' && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This will replace the current stock value
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-600 focus:outline-none"
                  rows={2}
                  placeholder="Optional notes about this adjustment..."
                />
              </div>
              
              {adjustmentQuantity && !isNaN(Number(adjustmentQuantity)) && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Current Stock:</span>
                      <span>{showAdjustModal.currentStock} {showAdjustModal.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adjustment:</span>
                      <span className={adjustmentType === 'restock' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                        {adjustmentType === 'restock' ? '+' : '-'}{adjustmentQuantity} {showAdjustModal.unit}
                      </span>
                    </div>
                    <hr className="my-2 border-gray-300 dark:border-gray-700" />
                    <div className="flex justify-between font-medium text-gray-900 dark:text-white">
                      <span>New Stock:</span>
                      <span>
                        {adjustmentType === 'restock' 
                          ? showAdjustModal.currentStock + Number(adjustmentQuantity)
                          : adjustmentType === 'correction'
                          ? Number(adjustmentQuantity)
                          : Math.max(0, showAdjustModal.currentStock - Number(adjustmentQuantity))
                        } {showAdjustModal.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAdjustModal(null);
                  setAdjustmentQuantity('');
                  setAdjustmentNotes('');
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                disabled={!adjustmentQuantity || isNaN(Number(adjustmentQuantity))}
                className="rounded-lg bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                <Save className="mr-2 inline h-4 w-4" />
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.itemName}
      />
    </div>
  );
}