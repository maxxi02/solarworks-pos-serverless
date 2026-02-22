'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Filter,
  Search,
  Package,
  Download,
  Printer,
  RefreshCw,
  Scale,
  Beaker,
  Ruler,
  Box,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Types
interface AuditEntry {
  _id: string;
  itemId: string;
  itemName: string;
  type: 'restock' | 'usage' | 'waste' | 'correction' | 'deduction' | 'adjustment';
  quantity: number;
  unit: string;
  originalQuantity?: number;
  originalUnit?: string;
  previousStock: number;
  newStock: number;
  notes?: string;
  conversionNote?: string;
  reference?: {
    type: 'order' | 'manual' | 'return' | 'adjustment' | 'rollback';
    id?: string;
    number?: string;
  };
  transactionId?: string;
  performedBy: string;
  createdAt: string;
  
  // Display fields
  displayQuantity?: string;
  displayPreviousStock?: string;
  displayNewStock?: string;
  displayChange?: string;
  displayTime?: string;
}

interface AuditFilters {
  dateFrom: string;
  dateTo: string;
  itemName: string;
  type: string;
  referenceType: string;
  performedBy: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReference, setSelectedReference] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: ''
  });
  
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [stats, setStats] = useState({
    totalAdjustments: 0,
    totalRestocks: 0,
    totalDeductions: 0,
    totalCorrections: 0,
    totalWaste: 0,
    totalValue: 0
  });

  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load audit logs
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedItem && selectedItem !== 'all') params.append('itemId', selectedItem);
      if (selectedType && selectedType !== 'all') params.append('type', selectedType);
      if (selectedReference && selectedReference !== 'all') params.append('referenceType', selectedReference);
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const response = await fetch(`/api/products/stocks/audit?${params.toString()}`);
      
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setAuditLogs(data.adjustments || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [pagination.page, pagination.limit]);

  // Apply filters
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadAuditLogs();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedItem('');
    setSelectedType('all');
    setSelectedReference('all');
    setDateRange({ from: '', to: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => loadAuditLogs(), 100);
  };

  // Get adjustment type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'restock':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900/30';
      case 'usage':
      case 'deduction':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
      case 'waste':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-900/30';
      case 'correction':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-900/30';
      case 'adjustment':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  // Get reference type color
  const getReferenceColor = (type?: string) => {
    switch (type) {
      case 'order':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'manual':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'return':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'rollback':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Get unit category icon
  const getUnitCategoryIcon = (unit: string) => {
    const weightUnits = ['kg', 'g', 'mg', 'lb', 'oz'];
    const volumeUnits = ['L', 'mL', 'tsp', 'tbsp', 'cup', 'fl_oz', 'gal', 'qt', 'pt'];
    const lengthUnits = ['m', 'cm', 'mm', 'inch', 'in', 'ft'];
    const countUnits = ['pieces', 'pcs', 'box', 'boxes', 'bottle', 'bottles', 'bag', 'bags', 'pack', 'packs', 'can', 'cans'];

    if (weightUnits.includes(unit)) {
      return <Scale className="h-4 w-4 text-blue-500" />;
    } else if (volumeUnits.includes(unit)) {
      return <Beaker className="h-4 w-4 text-green-500" />;
    } else if (lengthUnits.includes(unit)) {
      return <Ruler className="h-4 w-4 text-purple-500" />;
    } else if (countUnits.includes(unit)) {
      return <Box className="h-4 w-4 text-orange-500" />;
    }
    return <Package className="h-4 w-4 text-gray-500" />;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return '';
    }
  };

  // Export as CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Item', 'Type', 'Quantity', 'Unit', 'Previous', 'New', 'Change', 'Reference', 'Performed By', 'Notes'];
    
    const rows = auditLogs.map(log => [
      formatDate(log.createdAt),
      formatTime(log.createdAt),
      log.itemName,
      log.type,
      log.quantity,
      log.unit,
      log.previousStock,
      log.newStock,
      (log.newStock - log.previousStock).toFixed(2),
      log.reference?.type || '-',
      log.performedBy,
      log.notes || '-'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Print audit log
  const printAuditLog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Audit Log - ${format(new Date(), 'MMM dd, yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f5f5f5; text-align: left; padding: 10px; }
            td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
            .badge { 
              display: inline-block; 
              padding: 2px 8px; 
              border-radius: 12px; 
              font-size: 12px;
              background: #e5e7eb;
            }
            .restock { background: #d1fae5; color: #065f46; }
            .deduction { background: #dbeafe; color: #1e40af; }
            .correction { background: #ede9fe; color: #5b21b6; }
            .waste { background: #ffedd5; color: #9a3412; }
          </style>
        </head>
        <body>
          <h1>Inventory Audit Log</h1>
          <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
          <p>Total Records: ${pagination.total}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Stock Change</th>
                <th>Reference</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.map(log => `
                <tr>
                  <td>${formatDate(log.createdAt)} ${formatTime(log.createdAt)}</td>
                  <td>${log.itemName}</td>
                  <td><span class="badge ${log.type}">${log.type}</span></td>
                  <td>${log.quantity} ${log.unit}</td>
                  <td>${log.previousStock} → ${log.newStock} (${log.newStock - log.previousStock > 0 ? '+' : ''}${log.newStock - log.previousStock})</td>
                  <td>${log.reference?.type || '-'} ${log.reference?.number ? `#${log.reference.number}` : ''}</td>
                  <td>${log.performedBy}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/inventory/stockalert"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Stock Alerts</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Trail</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Complete history of all inventory adjustments
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={printAuditLog}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={loadAuditLogs}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Adjustments</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{stats.totalAdjustments || 0}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Restocks</p>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-500 mt-1">{stats.totalRestocks || 0}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Deductions</p>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-500 mt-1">{stats.totalDeductions || 0}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Corrections</p>
            <p className="text-2xl font-semibold text-purple-600 dark:text-purple-500 mt-1">{stats.totalCorrections || 0}</p>
          </div>
          <div className="rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Waste</p>
            <p className="text-2xl font-semibold text-orange-600 dark:text-orange-500 mt-1">{stats.totalWaste || 0}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={applyFilters}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Clear
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Adjustment Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="restock">Restock</option>
                <option value="deduction">Deduction</option>
                <option value="usage">Usage</option>
                <option value="waste">Waste</option>
                <option value="correction">Correction</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            {/* Reference Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Reference Type
              </label>
              <select
                value={selectedReference}
                onChange={(e) => setSelectedReference(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All References</option>
                <option value="order">Order</option>
                <option value="manual">Manual</option>
                <option value="return">Return</option>
                <option value="rollback">Rollback</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Stock Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Performed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading audit logs...</p>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No audit logs found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No inventory adjustments have been recorded yet.
                    </p>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <>
                    <tr 
                      key={log._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                      onClick={() => setExpandedEntry(expandedEntry === log._id ? null : log._id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(log.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(log.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getUnitCategoryIcon(log.unit)}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {log.itemName}
                            </div>
                            {log.reference?.number && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                #{log.reference.number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getTypeColor(log.type)}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {log.quantity} {log.unit}
                        </div>
                        {log.originalQuantity && log.originalUnit && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({log.originalQuantity} {log.originalUnit})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {log.previousStock}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.newStock}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {log.unit}
                          </span>
                        </div>
                        <div className={`text-xs ${
                          log.newStock - log.previousStock > 0 
                            ? 'text-green-600 dark:text-green-500' 
                            : log.newStock - log.previousStock < 0 
                              ? 'text-red-600 dark:text-red-500' 
                              : 'text-gray-500'
                        }`}>
                          {log.newStock - log.previousStock > 0 ? '+' : ''}
                          {log.newStock - log.previousStock} {log.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.reference ? (
                          <div>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getReferenceColor(log.reference.type)}`}>
                              {log.reference.type}
                            </span>
                            {log.reference.number && (
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                #{log.reference.number}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {log.performedBy}
                        </div>
                        {log.transactionId && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {log.transactionId.substring(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEntry(expandedEntry === log._id ? null : log._id);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {expandedEntry === log._id && (
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-3">
                            {log.conversionNote && (
                              <div className="text-sm text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30">
                                <span className="font-medium">Conversion:</span> {log.conversionNote}
                              </div>
                            )}
                            {log.notes && (
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Notes:</span> {log.notes}
                              </div>
                            )}
                            {log.transactionId && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                Transaction ID: {log.transactionId}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="rounded-lg border border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}