'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  Coffee, 
  Utensils, 
  Package, 
  Bell, 
  ShoppingCart, 
  PhilippinePeso,
  TrendingDown,
  Printer,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { Inventory } from '@/models/Inventory';
import { fetchInventory, getLowStockAlerts, getCriticalStockAlerts } from '@/lib/inventoryService';
import { LowStockAlert } from '@/types';
import { AuditEntry } from '@/hooks/useInventorySocket';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';

// Extended type that combines LowStockAlert with additional fields
interface StockAlertItem extends LowStockAlert {
  lastReported?: string;
  reportedBy?: string;
  displayUnit?: string;
  maxStock?: number;
  pricePerUnit: number;
  category?: string;
}

export default function AdminStockAlerts() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'low' | 'warning'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditEntry[]>([]);
  const [isPrintMode, setIsPrintMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch alerts
      const [criticalItems, lowStockItems] = await Promise.all([
        getCriticalStockAlerts(),
        getLowStockAlerts()
      ]);

      // Fetch full inventory to get additional details (price, maxStock, etc.)
      const fullInventory = await fetchInventory();
      const inventoryMap = new Map<string, Inventory>();
      fullInventory.forEach(item => {
        if (item._id) {
          inventoryMap.set(item._id.toString(), item);
        }
      });

      // Combine critical items
      const criticalAlerts: StockAlertItem[] = criticalItems.map(item => {
        const fullItem = inventoryMap.get(item.itemId);
        return {
          ...item,
          displayUnit: fullItem?.displayUnit || item.unit,
          maxStock: fullItem?.maxStock,
          pricePerUnit: fullItem?.pricePerUnit || 0,
          category: fullItem?.category || 'Uncategorized'
        };
      });

      // Combine low stock items (filter by status)
      const lowAlerts: StockAlertItem[] = lowStockItems
        .filter(item => item.status === 'low')
        .map(item => {
          const fullItem = inventoryMap.get(item.itemId);
          return {
            ...item,
            displayUnit: fullItem?.displayUnit || item.unit,
            maxStock: fullItem?.maxStock,
            pricePerUnit: fullItem?.pricePerUnit || 0,
            category: fullItem?.category || 'Uncategorized'
          };
        });

      // Combine warning items
      const warningAlerts: StockAlertItem[] = lowStockItems
        .filter(item => item.status === 'warning')
        .map(item => {
          const fullItem = inventoryMap.get(item.itemId);
          return {
            ...item,
            displayUnit: fullItem?.displayUnit || item.unit,
            maxStock: fullItem?.maxStock,
            pricePerUnit: fullItem?.pricePerUnit || 0,
            category: fullItem?.category || 'Uncategorized'
          };
        });

      // Combine all alerts
      const allAlerts = [...criticalAlerts, ...lowAlerts, ...warningAlerts];
      setAlerts(allAlerts);

      // Fetch recent audit logs for last reported info
      const auditResponse = await fetch('/api/products/stocks/audit?limit=10');
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setRecentAudits(auditData.adjustments || []);
      }
    } catch (error) {
      console.error('Error loading stock alerts:', error);
      toast.error('Failed to load stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const getLastReportedInfo = (itemId: string) => {
    const audit = recentAudits.find(a => a.itemId === itemId);
    if (!audit) return { lastReported: 'Unknown', reportedBy: 'System' };
    
    const timeDiff = Date.now() - new Date(audit.createdAt).getTime();
    const minutes = Math.floor(timeDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let lastReported = '';
    if (days > 0) lastReported = `${days} day${days > 1 ? 's' : ''} ago`;
    else if (hours > 0) lastReported = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    else if (minutes > 0) lastReported = `${minutes} min ago`;
    else lastReported = 'Just now';

    return {
      lastReported,
      reportedBy: audit.performedBy || 'System'
    };
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => 
      (filter === 'all' || alert.status === filter) &&
      (alert.itemName.toLowerCase().includes(search.toLowerCase()) || 
      (alert.category && alert.category.toLowerCase().includes(search.toLowerCase())))
    );
  }, [alerts, filter, search]);

  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.status === 'critical').length,
    low: alerts.filter(a => a.status === 'low').length,
    warning: alerts.filter(a => a.status === 'warning').length,
    totalValue: alerts.reduce((sum, item) => {
      return sum + (item.currentStock * (item.pricePerUnit || 0));
    }, 0)
  }), [alerts]);

  const getStatusColor = (status: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/10 dark:text-red-500 dark:border-red-900/30',
      low: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/10 dark:text-orange-500 dark:border-orange-900/30',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/10 dark:text-yellow-500 dark:border-yellow-900/30',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      critical: <AlertTriangle className="h-4 w-4" />,
      low: <TrendingDown className="h-4 w-4" />,
      warning: <Bell className="h-4 w-4" />,
    };
    return icons[status as keyof typeof icons] || <Package className="h-4 w-4" />;
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const stockPercentage = (current: number, max?: number) => {
    if (!max || max === 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const handleMarkAsResolved = async (item: StockAlertItem) => {
    try {
      // Redirect to inventory page to adjust stock
      window.location.href = `/inventory/stockalert?adjust=${item.itemId}`;
    } catch (error) {
      toast.error('Failed to redirect');
    }
  };

  const getProgressBarColor = (status: string) => {
    const colors = {
      critical: 'bg-red-500',
      low: 'bg-orange-500',
      warning: 'bg-yellow-500',
      ok: 'bg-green-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getFilterButtonClass = (currentFilter: string, status: string) => {
    const baseClass = 'px-4 py-2 rounded-lg transition-colors';
    
    if (filter === status) {
      return `${baseClass} ${
        status === 'critical' 
          ? 'bg-red-600 text-white' 
          : status === 'low'
          ? 'bg-orange-600 text-white'
          : status === 'warning'
          ? 'bg-yellow-600 text-white'
          : 'bg-blue-600 text-white'
      }`;
    }
    
    return `${baseClass} ${
      status === 'critical' 
        ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/10 dark:text-red-500' 
        : status === 'low'
        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/10 dark:text-orange-500'
        : status === 'warning'
        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-500'
        : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/10 dark:text-blue-500'
    }`;
  };

  const exportToCSV = () => {
    const headers = ['Item', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Status', 'Unit', 'Price', 'Location', 'Last Reported'];
    const rows = filteredAlerts.map(item => {
      const reportedInfo = getLastReportedInfo(item.itemId);
      return [
        item.itemName,
        item.category || 'Uncategorized',
        item.currentStock,
        item.minStock || 0,
        item.maxStock || '-',
        item.status,
        item.displayUnit || item.unit,
        item.pricePerUnit ? `₱${item.pricePerUnit.toFixed(2)}` : '₱0.00',
        item.location || 'Unassigned',
        reportedInfo.lastReported
      ];
    });

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-alerts-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading stock alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 ${isPrintMode ? 'print:p-0' : ''}`}>
      {/* Header */}
      <div className="mb-8 print:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Inventory Alerts</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor low stock items requiring attention
            </p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0 print:hidden">
            <button
              onClick={loadData}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <Link
              href="/inventory/stockalert/audit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              View Audit Trail
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:grid-cols-4">
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{stats.low}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warning</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.warning}</p>
            </div>
            <Bell className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
            </div>
            <PhilippinePeso className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4 rounded-lg mb-6 print:hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-black' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              All ({stats.critical + stats.low + stats.warning})
            </button>
            {(['critical', 'low', 'warning'] as const).map(status => (
              <button 
                key={status}
                onClick={() => setFilter(status)}
                className={getFilterButtonClass(filter, status)}
              >
                {status} ({stats[status]})
              </button>
            ))}
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Stock Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Last Reported</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAlerts.map(alert => {
                const reportedInfo = getLastReportedInfo(alert.itemId);
                const stockPercent = stockPercentage(alert.currentStock, alert.maxStock);
                const maxStock = alert.maxStock || alert.minStock * 2;
                
                return (
                  <tr key={alert.itemId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                          {alert.category?.toLowerCase().includes('coffee') || alert.category?.toLowerCase().includes('tea') ? 
                            <Coffee className="h-5 w-5 text-gray-600 dark:text-gray-400" /> : 
                            <Utensils className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{alert.itemName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {alert.category || 'Uncategorized'} • {alert.displayUnit || alert.unit}
                          </p>
                          {alert.supplier && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{alert.supplier}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {alert.currentStock} / {maxStock} {alert.unit}
                        </p>
                        <div className="w-32 bg-gray-200 dark:bg-gray-800 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${getProgressBarColor(alert.status)}`} 
                            style={{ width: `${stockPercent}%` }} 
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Min: {alert.minStock} {alert.unit} • {stockPercent}% full
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(alert.status)}`}>
                        {getStatusIcon(alert.status)}
                        <span className="capitalize">{alert.status}</span>
                      </span>
                      {alert.reorderPoint && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Reorder at: {alert.reorderPoint} {alert.unit}
                        </p>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">{alert.location || 'Unassigned'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ₱{(alert.pricePerUnit || 0).toFixed(2)}/{alert.displayUnit || alert.unit}
                      </p>
                    </td>
                    
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{reportedInfo.reportedBy}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reportedInfo.lastReported}</p>
                    </td>
                    
                    <td className="px-6 py-4 print:hidden">
                      <button 
                        onClick={() => handleMarkAsResolved(alert)} 
                        className="border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAlerts.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No stock alerts found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {search || filter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'All inventory items are at healthy stock levels'}
            </p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; }
          .print\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </div>
  );
}