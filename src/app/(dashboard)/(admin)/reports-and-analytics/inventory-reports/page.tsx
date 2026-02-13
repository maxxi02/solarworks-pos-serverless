'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Coffee, Utensils, Package, Users, Bell, ShoppingCart, DollarSign,TrendingDown,Printer, Search } from 'lucide-react';

interface StockAlert {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  status: 'critical' | 'low' | 'warning';
  unit: string;
  lastReported: string;
  reportedBy: string;
  reorderQuantity: number;
  pricePerUnit: number;
}

const stockAlerts: StockAlert[] = [
  { id: '1', name: 'Espresso Beans', category: 'Coffee', currentStock: 2, minStock: 10, maxStock: 30, status: 'critical', unit: 'kg', lastReported: '10 mins ago', reportedBy: 'Maria Santos', reorderQuantity: 20, pricePerUnit: 850 },
  { id: '2', name: 'Fresh Milk', category: 'Dairy', currentStock: 3, minStock: 15, maxStock: 40, status: 'critical', unit: 'L', lastReported: '25 mins ago', reportedBy: 'Juan Cruz', reorderQuantity: 30, pricePerUnit: 95 },
  { id: '3', name: 'Matcha Powder', category: 'Tea', currentStock: 8, minStock: 6, maxStock: 20, status: 'low', unit: 'kg', lastReported: '1 hour ago', reportedBy: 'Ana Reyes', reorderQuantity: 15, pricePerUnit: 1200 },
  { id: '4', name: 'Vanilla Syrup', category: 'Syrups', currentStock: 6, minStock: 5, maxStock: 25, status: 'low', unit: 'bottle', lastReported: '2 hours ago', reportedBy: 'Carlos Lim', reorderQuantity: 12, pricePerUnit: 280 },
  { id: '5', name: 'Paper Cups', category: 'Packaging', currentStock: 250, minStock: 150, maxStock: 1000, status: 'warning', unit: 'pieces', lastReported: 'Today', reportedBy: 'Sofia Tan', reorderQuantity: 500, pricePerUnit: 2.5 },
];

export default function AdminStockAlerts() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'warning'>('all');
  const [search, setSearch] = useState('');

  const filteredAlerts = useMemo(() => 
    stockAlerts.filter(alert => 
      (filter === 'all' || alert.status === filter) &&
      (alert.name.toLowerCase().includes(search.toLowerCase()) || 
      alert.category.toLowerCase().includes(search.toLowerCase()))
    ), 
  [filter, search]);

  const stats = useMemo(() => ({
    critical: stockAlerts.filter(a => a.status === 'critical').length,
    low: stockAlerts.filter(a => a.status === 'low').length,
    warning: stockAlerts.filter(a => a.status === 'warning').length,
    totalValue: stockAlerts.reduce((sum, item) => sum + (item.currentStock * item.pricePerUnit), 0),
    reorderCost: stockAlerts
      .filter(item => item.status === 'critical' || item.status === 'low')
      .reduce((sum, item) => sum + (item.reorderQuantity * item.pricePerUnit), 0),
  }), []);

  const getStatusColor = (status: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      low: 'bg-orange-100 text-orange-800 border-orange-300',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      critical: <AlertTriangle className="h-4 w-4" />,
      low: <TrendingDown className="h-4 w-4" />,
      warning: <Bell className="h-4 w-4" />,
    };
    return icons[status as keyof typeof icons];
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const stockPercentage = (current: number, max: number) => Math.round((current / max) * 100);

  const handleReorder = (item: StockAlert) => {
    alert(`Ordering ${item.reorderQuantity} ${item.unit} of ${item.name}`);
  };

  const handleMarkAsResolved = (id: string) => {
    alert(`Marked item ${id} as resolved`);
  };

  const getProgressBarColor = (status: string) => {
    const colors = {
      critical: 'bg-red-500',
      low: 'bg-orange-500',
      warning: 'bg-yellow-500',
    };
    return colors[status as keyof typeof colors];
  };

  const getFilterButtonClass = (currentFilter: string, status: string) => {
    const baseClass = 'px-4 py-2 rounded-lg transition-colors';
    
    if (filter === status) {
      return `${baseClass} ${
        status === 'critical' 
          ? 'bg-red-600 text-white' 
          : status === 'low'
          ? 'bg-orange-600 text-white'
          : 'bg-yellow-600 text-white'
      }`;
    }
    
    return `${baseClass} ${
      status === 'critical' 
        ? 'bg-red-100 text-red-800 hover:bg-red-200' 
        : status === 'low'
        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    }`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">Inventory Alert</h1>
        <p className="text-muted-foreground">Monitor low stock items reported by staff</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-6 rounded-xl shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{stats.low}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">Reorder Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.reorderCost)}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl shadow border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              All ({stockAlerts.length})
            </button>
            {['critical', 'low', 'warning'].map(status => (
              <button 
                key={status}
                onClick={() => setFilter(status as 'all' | 'critical' | 'low' | 'warning')}
                className={getFilterButtonClass(filter, status)}
              >
                {status} ({stats[status as keyof typeof stats]})
              </button>
            ))}
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-card rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="p-4 text-left">Item</th>
                <th className="p-4 text-left">Stock Level</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Reported By</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(alert => (
                <tr key={alert.id} className="border-t hover:bg-secondary/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        {alert.category === 'Coffee' || alert.category === 'Tea' ? 
                          <Coffee className="h-5 w-5 text-muted-foreground" /> : 
                          <Utensils className="h-5 w-5 text-muted-foreground" />
                        }
                      </div>
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-sm text-muted-foreground">{alert.category} • {alert.unit}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{alert.currentStock} / {alert.maxStock} {alert.unit}</p>
                      <div className="w-full bg-secondary rounded-full h-2 mt-1">
                        <div className={`h-2 rounded-full ${getProgressBarColor(alert.status)}`} 
                            style={{ width: `${stockPercentage(alert.currentStock, alert.maxStock)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Min: {alert.minStock} • {stockPercentage(alert.currentStock, alert.maxStock)}% full</p>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(alert.status)}`}>
                      {getStatusIcon(alert.status)}
                      {alert.status}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{alert.reportedBy}</p>
                      <p className="text-sm text-muted-foreground">{alert.lastReported}</p>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => handleReorder(alert)} 
                        className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
                      >
                        Reorder ({alert.reorderQuantity} {alert.unit})
                      </button>
                      <button 
                        onClick={() => handleMarkAsResolved(alert.id)} 
                        className="border px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No stock alerts found</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-card p-6 rounded-xl shadow border">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <ShoppingCart className="h-4 w-4" /> Generate Purchase Order
          </button>
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
            <Printer className="h-4 w-4" /> Print Summary
          </button>
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
            <Users className="h-4 w-4" /> Notify Staff
          </button>
        </div>
      </div>
    </div>
  );
}