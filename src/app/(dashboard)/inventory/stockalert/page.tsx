'use client';

import { useState } from 'react';
import { AlertTriangle, Package, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Coffee, Utensils } from 'lucide-react';

// Stock Alert type
interface StockAlert {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  status: 'critical' | 'low' | 'warning' | 'ok';
  lastOrderDate: string;
  supplier: string;
  reorderQuantity: number;
  icon: 'coffee' | 'utensils';
  unit: string;
  pricePerUnit: number;
}

// Sample stock data
const stockAlerts: StockAlert[] = [
  // Critical alerts (stock < min)
  {
    id: 'espresso-beans',
    name: 'Espresso Beans',
    category: 'Coffee',
    currentStock: 2,
    minStock: 10,
    status: 'critical',
    lastOrderDate: '2024-01-15',
    supplier: 'Coffee Beans Co.',
    reorderQuantity: 20,
    icon: 'coffee',
    unit: 'kg',
    pricePerUnit: 850,
  },
  {
    id: 'milk',
    name: 'Fresh Milk',
    category: 'Dairy',
    currentStock: 3,
    minStock: 15,
    status: 'critical',
    lastOrderDate: '2024-01-18',
    supplier: 'Dairy Fresh',
    reorderQuantity: 30,
    icon: 'utensils',
    unit: 'L',
    pricePerUnit: 95,
  },
  {
    id: 'strawberry-syrup',
    name: 'Strawberry Syrup',
    category: 'Syrups',
    currentStock: 1,
    minStock: 5,
    status: 'critical',
    lastOrderDate: '2024-01-10',
    supplier: 'Flavor Masters',
    reorderQuantity: 12,
    icon: 'coffee',
    unit: 'bottle',
    pricePerUnit: 320,
  },

  // Low stock alerts (stock < 1.5 * min)
  {
    id: 'matcha-powder',
    name: 'Matcha Powder',
    category: 'Tea',
    currentStock: 8,
    minStock: 6,
    status: 'low',
    lastOrderDate: '2024-01-20',
    supplier: 'Green Tea Imports',
    reorderQuantity: 15,
    icon: 'coffee',
    unit: 'kg',
    pricePerUnit: 1200,
  },
  {
    id: 'vanilla-syrup',
    name: 'Vanilla Syrup',
    category: 'Syrups',
    currentStock: 6,
    minStock: 5,
    status: 'low',
    lastOrderDate: '2024-01-12',
    supplier: 'Flavor Masters',
    reorderQuantity: 12,
    icon: 'coffee',
    unit: 'bottle',
    pricePerUnit: 280,
  },
  {
    id: 'croissants',
    name: 'Croissants',
    category: 'Pastries',
    currentStock: 12,
    minStock: 8,
    status: 'low',
    lastOrderDate: '2024-01-21',
    supplier: 'Bakery Delight',
    reorderQuantity: 24,
    icon: 'utensils',
    unit: 'pieces',
    pricePerUnit: 35,
  },

  // Warning alerts (stock < 2 * min)
  {
    id: 'chocolate-syrup',
    name: 'Chocolate Syrup',
    category: 'Syrups',
    currentStock: 8,
    minStock: 5,
    status: 'warning',
    lastOrderDate: '2024-01-14',
    supplier: 'Flavor Masters',
    reorderQuantity: 12,
    icon: 'coffee',
    unit: 'bottle',
    pricePerUnit: 290,
  },
  {
    id: 'paper-cups',
    name: 'Paper Cups (12oz)',
    category: 'Packaging',
    currentStock: 250,
    minStock: 150,
    status: 'warning',
    lastOrderDate: '2024-01-05',
    supplier: 'Eco Packaging',
    reorderQuantity: 500,
    icon: 'utensils',
    unit: 'pieces',
    pricePerUnit: 2.5,
  },
  {
    id: 'sugar',
    name: 'White Sugar',
    category: 'Pantry',
    currentStock: 9,
    minStock: 5,
    status: 'warning',
    lastOrderDate: '2024-01-08',
    supplier: 'Sweet Suppliers',
    reorderQuantity: 20,
    icon: 'utensils',
    unit: 'kg',
    pricePerUnit: 65,
  },

  // Ok stock
  {
    id: 'caramel-syrup',
    name: 'Caramel Syrup',
    category: 'Syrups',
    currentStock: 15,
    minStock: 5,
    status: 'ok',
    lastOrderDate: '2024-01-19',
    supplier: 'Flavor Masters',
    reorderQuantity: 12,
    icon: 'coffee',
    unit: 'bottle',
    pricePerUnit: 310,
  },
  {
    id: 'coffee-filters',
    name: 'Coffee Filters',
    category: 'Supplies',
    currentStock: 350,
    minStock: 100,
    status: 'ok',
    lastOrderDate: '2024-01-03',
    supplier: 'Brew Supplies',
    reorderQuantity: 500,
    icon: 'coffee',
    unit: 'pieces',
    pricePerUnit: 0.8,
  },
  {
    id: 'napkins',
    name: 'Napkins',
    category: 'Packaging',
    currentStock: 1200,
    minStock: 500,
    status: 'ok',
    lastOrderDate: '2024-01-02',
    supplier: 'Eco Packaging',
    reorderQuantity: 2000,
    icon: 'utensils',
    unit: 'pieces',
    pricePerUnit: 0.3,
  },
];

// Status filter type
type StatusFilter = 'all' | 'critical' | 'low' | 'warning' | 'ok';

export default function StockAlertsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter alerts based on status and search
  const filteredAlerts = stockAlerts.filter(alert => {
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      alert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Count by status
  const criticalCount = stockAlerts.filter(a => a.status === 'critical').length;
  const lowCount = stockAlerts.filter(a => a.status === 'low').length;
  const warningCount = stockAlerts.filter(a => a.status === 'warning').length;
  const okCount = stockAlerts.filter(a => a.status === 'ok').length;

  // Calculate stock percentage
  const getStockPercentage = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    return Math.min(percentage, 200); // Cap at 200% for display
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'low': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ok': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <TrendingDown className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'ok': return <TrendingUp className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Stock Alerts
          </h2>
          <p className="text-muted-foreground">
            Monitor inventory levels and receive alerts for low stock items.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical</p>
                <p className="text-2xl font-bold text-red-900">{criticalCount}</p>
                <p className="text-xs text-red-700">Needs immediate attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-900">{lowCount}</p>
                <p className="text-xs text-orange-700">Order soon</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Warning</p>
                <p className="text-2xl font-bold text-yellow-900">{warningCount}</p>
                <p className="text-xs text-yellow-700">Monitor closely</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">In Stock</p>
                <p className="text-2xl font-bold text-green-900">{okCount}</p>
                <p className="text-xs text-green-700">Adequate stock</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-foreground text-background'
                    : 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                All ({stockAlerts.length})
              </button>
              <button
                onClick={() => setStatusFilter('critical')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  statusFilter === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                Critical ({criticalCount})
              </button>
              <button
                onClick={() => setStatusFilter('low')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  statusFilter === 'low'
                    ? 'bg-orange-600 text-white'
                    : 'border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                }`}
              >
                Low ({lowCount})
              </button>
              <button
                onClick={() => setStatusFilter('warning')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  statusFilter === 'warning'
                    ? 'bg-yellow-600 text-white'
                    : 'border border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                Warning ({warningCount})
              </button>
            </div>

            {/* Search */}
            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Stock Alerts Table */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-secondary">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Stock Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Last Ordered
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAlerts.map((alert) => {
                  const stockPercentage = getStockPercentage(alert.currentStock, alert.minStock);
                  const needsReorder = alert.currentStock < alert.minStock;
                  const reorderCost = alert.reorderQuantity * alert.pricePerUnit;
                  
                  return (
                    <tr key={alert.id} className="hover:bg-secondary/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                            {alert.icon === 'coffee' ? (
                              <Coffee className="h-5 w-5 text-foreground" />
                            ) : (
                              <Utensils className="h-5 w-5 text-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{alert.name}</div>
                            <div className="text-sm text-muted-foreground">{alert.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current:</span>
                            <span className="font-semibold text-foreground">
                              {alert.currentStock} {alert.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Min:</span>
                            <span className="font-semibold text-foreground">
                              {alert.minStock} {alert.unit}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <div 
                                className={`h-full ${
                                  alert.status === 'critical' ? 'bg-red-600' :
                                  alert.status === 'low' ? 'bg-orange-500' :
                                  alert.status === 'warning' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {Math.round(stockPercentage)}% of minimum
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(alert.status)}`}>
                          {getStatusIcon(alert.status)}
                          <span className="capitalize">{alert.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {new Date(alert.lastOrderDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.floor((new Date().getTime() - new Date(alert.lastOrderDate).getTime()) / (1000 * 3600 * 24))} days ago
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{alert.supplier}</div>
                        <div className="text-xs text-muted-foreground">
                          ₱{alert.pricePerUnit.toLocaleString()}/{alert.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {needsReorder ? (
                          <div className="space-y-2">
                            <button className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
                              Reorder Now
                            </button>
                            <div className="text-xs text-muted-foreground">
                              {alert.reorderQuantity} {alert.unit} = ₱{reorderCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        ) : (
                          <button className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80">
                            View History
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredAlerts.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No stock alerts found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'All items are adequately stocked'}
              </p>
            </div>
          )}

          {/* Summary */}
          {filteredAlerts.length > 0 && (
            <div className="border-t border-border bg-secondary px-6 py-4">
              <div className="flex flex-col justify-between sm:flex-row sm:items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAlerts.length} of {stockAlerts.length} items
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm sm:mt-0">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-600" />
                    <span className="text-foreground">Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span className="text-foreground">Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-foreground">Warning</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Generate Purchase Orders</h4>
                  <p className="text-sm text-muted-foreground">For critical items</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-foreground" />
              </div>
            </button>
            <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Stock Report</h4>
                  <p className="text-sm text-muted-foreground">Generate PDF report</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-foreground" />
              </div>
            </button>
            <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Email Suppliers</h4>
                  <p className="text-sm text-muted-foreground">Contact all suppliers</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-foreground" />
              </div>
            </button>
            <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">Update Stock</h4>
                  <p className="text-sm text-muted-foreground">Bulk stock update</p>
                </div>
                <ArrowDownRight className="h-5 w-5 text-foreground" />
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}