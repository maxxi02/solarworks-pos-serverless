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
  RefreshCw,
  History,
  Scale,
  Beaker,
  Ruler,
  Box
} from 'lucide-react';
import {
  fetchInventory,
  createInventoryItem,
  deleteInventoryItem,
  adjustStock,
  getLowStockAlerts,
  getCriticalStockAlerts
} from '@/lib/inventoryService';
import { Inventory } from '@/models/Inventory';
import { 
  Unit, 
  UnitCategory,
  getUnitCategory,
  isValidUnit,
  getCompatibleUnits,
  formatQuantity,
  smartConvert,
  areUnitsCompatible,
  hasDensity,
  convertUnit
} from '@/lib/unit-conversion';
import { toast } from 'sonner';
import Link from 'next/link';

interface NewItemForm {
  name: string;
  category: string;
  currentStock: string;
  currentStockUnit: Unit;
  minStock: string;
  minStockUnit: Unit;
  maxStock: string;
  maxStockUnit: Unit;
  unit: Unit;
  pricePerUnit: string;
  supplier: string;
  location: string;
  reorderPoint: string;
  reorderPointUnit: Unit;
  density: string;
}

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
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 dark:bg-black/90">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Item</h3>
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
            Are you sure you want to delete <span className="font-semibold dark:text-white">"{itemName}"</span> from your inventory?
          </p>
          <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/10 p-3 border border-red-100 dark:border-red-900/30">
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
                Delete Item
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryIcon({ category }: { category: UnitCategory }) {
  switch (category) {
    case 'weight':
      return <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    case 'volume':
      return <Beaker className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'length':
      return <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
    case 'count':
      return <Box className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
    default:
      return <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
  }
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<Inventory | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'restock' | 'usage' | 'waste' | 'correction' | 'deduction'>('restock');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentUnit, setAdjustmentUnit] = useState<Unit>('g');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  
  const [newItem, setNewItem] = useState<NewItemForm>({
    name: '',
    category: '',
    currentStock: '',
    currentStockUnit: 'kg',
    minStock: '',
    minStockUnit: 'kg',
    maxStock: '',
    maxStockUnit: 'kg',
    unit: 'kg',
    pricePerUnit: '',
    supplier: '',
    location: '',
    reorderPoint: '',
    reorderPointUnit: 'kg',
    density: ''
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

  const [alerts, setAlerts] = useState({
    critical: 0,
    low: 0,
    warning: 0
  });

  useEffect(() => {
    loadInventory();
    loadAlerts();
  }, [categoryFilter, statusFilter, searchQuery]);

  const loadAlerts = async () => {
    try {
      const [critical, lowStock] = await Promise.all([
        getCriticalStockAlerts(),
        getLowStockAlerts()
      ]);
      
      setAlerts({
        critical: critical.length,
        low: lowStock.filter(a => a.status === 'low').length,
        warning: lowStock.filter(a => a.status === 'warning').length
      });
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

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

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.currentStock || !newItem.minStock) {
      toast.error('Missing Information', {
        description: 'Please fill in all required fields'
      });
      return;
    }

    try {
      if (!isValidUnit(newItem.currentStockUnit) || !isValidUnit(newItem.minStockUnit)) {
        toast.error('Invalid unit', {
          description: 'Please select valid units'
        });
        return;
      }

      const price = Number(newItem.pricePerUnit);
      if (price > 1000000) {
        toast.error('Validation Error', {
          description: 'Price per unit cannot exceed ₱1,000,000'
        });
        return;
      }

      const unitCategory = getUnitCategory(newItem.unit);
      if (!unitCategory) {
        toast.error('Invalid unit', {
          description: 'Please select a valid unit'
        });
        return;
      }

      const inventoryItem = {
        name: newItem.name,
        category: newItem.category,
        currentStock: Number(newItem.currentStock),
        currentStockUnit: newItem.currentStockUnit,
        minStock: Number(newItem.minStock),
        minStockUnit: newItem.minStockUnit,
        maxStock: newItem.maxStock ? Number(newItem.maxStock) : undefined,
        maxStockUnit: newItem.maxStockUnit,
        unit: newItem.unit,
        supplier: newItem.supplier || 'Unknown',
        pricePerUnit: price,
        location: newItem.location || 'Unassigned',
        reorderPoint: newItem.reorderPoint ? Number(newItem.reorderPoint) : undefined,
        reorderPointUnit: newItem.reorderPointUnit,
        density: newItem.density ? Number(newItem.density) : undefined,
        icon: 'package'
      };

      const result = await createInventoryItem(inventoryItem as any);
      setInventory(prev => [...prev, result]);
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

  const handleStockAdjustment = async () => {
    if (!showAdjustModal || !adjustmentQuantity || isNaN(Number(adjustmentQuantity))) {
      toast.error('Invalid quantity', {
        description: 'Please enter a valid quantity'
      });
      return;
    }

    try {
      const quantity = Number(adjustmentQuantity);
      
      if (quantity > 100000) {
        toast.error('Validation Error', {
          description: 'Quantity cannot exceed 100,000 units'
        });
        return;
      }

      let convertedQuantity = quantity;
      const inventoryUnit = showAdjustModal.unit as Unit;

      if (adjustmentUnit !== inventoryUnit) {
        if (!areUnitsCompatible(adjustmentUnit, inventoryUnit)) {
          const fromCategory = getUnitCategory(adjustmentUnit);
          const toCategory = getUnitCategory(inventoryUnit);
          
          if ((fromCategory === 'weight' && toCategory === 'volume') ||
              (fromCategory === 'volume' && toCategory === 'weight')) {
            
            if (!showAdjustModal.density && !hasDensity(showAdjustModal.name)) {
              toast.error('Cannot convert units', {
                description: `No density data for ${showAdjustModal.name}. Please add density or use ${inventoryUnit}.`
              });
              return;
            }
          } else {
            toast.error('Incompatible units', {
              description: `Cannot convert ${adjustmentUnit} to ${inventoryUnit}`
            });
            return;
          }
        }

        convertedQuantity = smartConvert(
          quantity,
          adjustmentUnit,
          inventoryUnit,
          showAdjustModal.name
        );
        
        convertedQuantity = formatQuantity(convertedQuantity, inventoryUnit);
      }

      const result = await adjustStock(showAdjustModal._id!.toString(), {
        type: adjustmentType,
        quantity: convertedQuantity,
        notes: adjustmentNotes,
        performedBy: 'Admin',
        reference: {
          type: 'manual',
          id: `manual-${Date.now()}`
        }
      });

      setInventory(prev => prev.map(item => {
        if (item._id?.toString() === showAdjustModal._id?.toString()) {
          return {
            ...item,
            currentStock: result.newStock,
            status: result.status as any,
            lastRestocked: adjustmentType === 'restock' ? new Date() : item.lastRestocked
          };
        }
        return item;
      }));

      loadAlerts();

      toast.success(`Stock ${adjustmentType === 'restock' ? 'Restocked' : 'Adjusted'}`, {
        description: `${adjustmentQuantity} ${adjustmentUnit} → ${convertedQuantity} ${inventoryUnit}`
      });
      
      setShowAdjustModal(null);
      setAdjustmentQuantity('');
      setAdjustmentUnit('g');
      setAdjustmentNotes('');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

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
      setInventory(prev => prev.filter(item => item._id?.toString() !== deleteModal.itemId));
      setDeleteModal({ isOpen: false, itemId: null, itemName: '' });
      loadAlerts();
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

  const resetNewItemForm = () => {
    setNewItem({
      name: '',
      category: '',
      currentStock: '',
      currentStockUnit: 'kg',
      minStock: '',
      minStockUnit: 'kg',
      maxStock: '',
      maxStockUnit: 'kg',
      unit: 'kg',
      pricePerUnit: '',
      supplier: '',
      location: '',
      reorderPoint: '',
      reorderPointUnit: 'kg',
      density: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/10 text-red-800 dark:text-red-500 border-red-200 dark:border-red-900/30';
      case 'low': return 'bg-orange-100 dark:bg-orange-900/10 text-orange-800 dark:text-orange-500 border-orange-200 dark:border-orange-900/30';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900/30';
      case 'ok': return 'bg-green-100 dark:bg-green-900/10 text-green-800 dark:text-green-500 border-green-200 dark:border-green-900/30';
      default: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'ok': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const formatNumber = (value: string, max: number) => {
    const num = Number(value);
    if (isNaN(num)) return '';
    if (num > max) return max.toString();
    return value;
  };

  const getUnitCategoryIcon = (category: UnitCategory) => {
    switch (category) {
      case 'weight': return <Scale className="h-4 w-4" />;
      case 'volume': return <Beaker className="h-4 w-4" />;
      case 'length': return <Ruler className="h-4 w-4" />;
      case 'count': return <Box className="h-4 w-4" />;
    }
  };

  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category)))];
  const criticalItems = inventory.filter(item => item.status === 'critical');
  const lowItems = inventory.filter(item => item.status === 'low');
  const warningItems = inventory.filter(item => item.status === 'warning');
  
  const totalValue = inventory.reduce((sum, item) => {
    try {
      if (!item.displayUnit || !item.unit) {
      return sum + (item.currentStock * item.pricePerUnit);
    }
      const displayToBaseRatio = convertUnit(1, item.displayUnit, item.unit);
      const pricePerBaseUnit = item.pricePerUnit / displayToBaseRatio;
      return sum + (item.currentStock * pricePerBaseUnit);
    } catch {
      return sum + (item.currentStock * item.pricePerUnit);
    }
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track and manage all ingredients and supplies
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Link href="/inventory/audit">
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900">
                <History className="h-4 w-4" />
                Audit Trail
              </button>
            </Link>
            <button
              onClick={loadInventory}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
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

      {loading && (
        <div className="mb-6 flex items-center justify-center rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading inventory...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventory.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600 dark:text-blue-500" />
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Critical Items</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">{criticalItems.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
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
            <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
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

          <div className="mb-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black pl-10 pr-4 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="critical">Critical</option>
                    <option value="low">Low</option>
                    <option value="warning">Warning</option>
                    <option value="ok">OK</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Stock Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Last Restocked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {inventory.map((item) => {
                    const itemId = item._id?.toString() || '';
                    const basePrice = item.displayUnit && item.unit 
                    ? (item.pricePerUnit / convertUnit(1, item.displayUnit, item.unit)).toFixed(2)
                    : item.pricePerUnit.toFixed(2);
                    const stockPercentage = (item.currentStock / item.maxStock) * 100;
                    const needsRestock = item.currentStock <= item.reorderPoint;
                    const displayStock = `${item.currentStock} ${item.unit}`;
                    const displayMinStock = `${item.minStock} ${item.unit}`;
                    
                    return (
                      <tr key={itemId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/10">
                              <CategoryIcon category={item.unitCategory} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                {item.name}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({item.displayUnit})
                                </span>
                              </div>
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
                                {displayStock}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Min:</span>
                              <span className="text-gray-900 dark:text-white">{displayMinStock}</span>
                            </div>
                            <div className="mt-2">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
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
                                {Math.round(stockPercentage)}% of max
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
                              Reorder at {item.reorderPoint} {item.unit}
                            </div>
                          )}
                          {item.density && (
                            <div className="mt-1 text-xs text-blue-600 dark:text-blue-500">
                              Density: {item.density} g/mL
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">{item.location}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            {getUnitCategoryIcon(item.unitCategory)}
                            <span>₱{item.pricePerUnit.toFixed(2)}/{item.displayUnit}</span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Base: ₱{(item.pricePerUnit / convertUnit(1, item.displayUnit, item.unit)).toFixed(2)}/{item.unit}
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
                              onClick={() => {
                                setShowAdjustModal(item);
                                setAdjustmentUnit(item.displayUnit as Unit);
                              }}
                              className="rounded-lg bg-blue-100 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/20"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => window.location.href = `/inventory/audit?id=${itemId}`}
                              className="rounded-lg bg-purple-100 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-500 hover:bg-purple-200 dark:hover:bg-purple-900/20"
                              title="View Audit Trail"
                            >
                              <History className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(itemId, item.name)}
                              className="rounded-lg bg-red-100 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-500 hover:bg-red-200 dark:hover:bg-red-900/20"
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

          {criticalItems.length > 0 && (
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Critical Stock Alerts ({criticalItems.length})
                </h3>
              </div>
              <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {criticalItems.slice(0, 4).map(item => {
                    const itemId = item._id?.toString() || '';
                    return (
                      <div key={itemId} className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Stock: {item.currentStock} {item.unit}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{item.location}</p>
                          </div>
                          <button
                            onClick={() => {
                              setShowAdjustModal(item);
                              setAdjustmentUnit(item.displayUnit as Unit);
                              setAdjustmentType('restock');
                            }}
                            className="rounded-lg bg-red-600 dark:bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-600"
                          >
                            Restock
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {criticalItems.length > 4 && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    +{criticalItems.length - 4} more critical items
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Inventory Item</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewItemForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name *</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Espresso Beans"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Coffee"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Unit *</label>
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value as Unit})}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="L">Liters (L)</option>
                  <option value="mL">Milliliters (mL)</option>
                  <option value="pieces">Pieces</option>
                  <option value="boxes">Boxes</option>
                  <option value="bottles">Bottles</option>
                  <option value="bags">Bags</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This is how the unit will be displayed in the UI
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Stock Levels</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Stock *</label>
                    <div className="flex mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        value={newItem.currentStock}
                        onChange={(e) => setNewItem({...newItem, currentStock: formatNumber(e.target.value, 100000)})}
                        className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="0"
                      />
                      <select
                        value={newItem.currentStockUnit}
                        onChange={(e) => setNewItem({...newItem, currentStockUnit: e.target.value as Unit})}
                        className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="pieces">pcs</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Min Stock *</label>
                    <div className="flex mt-1">
                      <input
                        type="number"
                        min="0"
                        value={newItem.minStock}
                        onChange={(e) => setNewItem({...newItem, minStock: e.target.value})}
                        className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="10"
                      />
                      <select
                        value={newItem.minStockUnit}
                        onChange={(e) => setNewItem({...newItem, minStockUnit: e.target.value as Unit})}
                        className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="pieces">pcs</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Stock</label>
                    <div className="flex mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        value={newItem.maxStock}
                        onChange={(e) => setNewItem({...newItem, maxStock: formatNumber(e.target.value, 100000)})}
                        className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="50"
                      />
                      <select
                        value={newItem.maxStockUnit}
                        onChange={(e) => setNewItem({...newItem, maxStockUnit: e.target.value as Unit})}
                        className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="pieces">pcs</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reorder Point</label>
                    <div className="flex mt-1">
                      <input
                        type="number"
                        min="0"
                        value={newItem.reorderPoint}
                        onChange={(e) => setNewItem({...newItem, reorderPoint: e.target.value})}
                        className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                        placeholder="15"
                      />
                      <select
                        value={newItem.reorderPointUnit}
                        onChange={(e) => setNewItem({...newItem, reorderPointUnit: e.target.value as Unit})}
                        className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="mL">mL</option>
                        <option value="pieces">pcs</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Pricing</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price per {newItem.unit} (₱)</label>
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.01"
                      value={newItem.pricePerUnit}
                      onChange={(e) => setNewItem({...newItem, pricePerUnit: formatNumber(e.target.value, 1000000)})}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Optional Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Density (g/mL)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.density}
                      onChange={(e) => setNewItem({...newItem, density: e.target.value})}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                      placeholder="0.85 for sugar"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Required for weight ↔ volume conversion
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                  <input
                    type="text"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
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
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
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

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Adjust Stock: {showAdjustModal.name}
              </h3>
              <button
                onClick={() => {
                  setShowAdjustModal(null);
                  setAdjustmentQuantity('');
                  setAdjustmentUnit('g');
                  setAdjustmentNotes('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Stock:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {showAdjustModal.currentStock} {showAdjustModal.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Display Unit:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {showAdjustModal.displayUnit}
                  </span>
                </div>
                {showAdjustModal.density && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Density:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-500">
                      {showAdjustModal.density} g/mL
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Type</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['restock', 'usage', 'waste', 'correction'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setAdjustmentType(type)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                        adjustmentType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/10 dark:text-blue-500'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
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
                    className="flex-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                    placeholder="Enter quantity"
                  />
                  <select
                    value={adjustmentUnit}
                    onChange={(e) => setAdjustmentUnit(e.target.value as Unit)}
                    className="rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {getCompatibleUnits(showAdjustModal.unitCategory).map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Will be converted to {showAdjustModal.unit} (base unit)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none"
                  rows={2}
                  placeholder="Optional notes about this adjustment..."
                />
              </div>
              
              {adjustmentQuantity && !isNaN(Number(adjustmentQuantity)) && adjustmentUnit && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Current Stock:</span>
                      <span>{showAdjustModal.currentStock} {showAdjustModal.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adjustment:</span>
                      <span className={adjustmentType === 'restock' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
                        {adjustmentQuantity} {adjustmentUnit}
                      </span>
                    </div>
                    {adjustmentUnit !== showAdjustModal.unit && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-500">
                        <span>Converted:</span>
                        <span>
                          {smartConvert(
                            Number(adjustmentQuantity),
                            adjustmentUnit,
                            showAdjustModal.unit as Unit,
                            showAdjustModal.name
                          ).toFixed(2)} {showAdjustModal.unit}
                        </span>
                      </div>
                    )}
                    <hr className="my-2 border-gray-300 dark:border-gray-800" />
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
                  setAdjustmentUnit('g');
                  setAdjustmentNotes('');
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
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

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.itemName}
      />
    </div>
  );
}