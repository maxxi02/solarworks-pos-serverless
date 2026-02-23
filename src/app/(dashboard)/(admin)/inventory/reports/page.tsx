// 'use client';

// import { useState } from 'react';
// import { Download, Filter, Calendar, TrendingUp, TrendingDown, Package, BarChart3, PieChart, FileText, Printer, Coffee, Utensils } from 'lucide-react';

// // Report type
// interface Report {
//   id: string;
//   name: string;
//   type: 'daily' | 'weekly' | 'monthly' | 'custom';
//   dateRange: string;
//   generatedDate: string;
//   size: string;
//   items: number;
//   totalValue: number;
//   status: 'completed' | 'pending' | 'error';
// }

// // Category stats type
// interface CategoryStats {
//   id: string;
//   name: string;
//   icon: 'coffee' | 'utensils';
//   totalItems: number;
//   lowStockItems: number;
//   totalValue: number;
//   change: number;
// }

// // Inventory movement type
// interface InventoryMovement {
//   id: string;
//   itemName: string;
//   category: string;
//   type: 'in' | 'out' | 'adjustment';
//   quantity: number;
//   date: string;
//   user: string;
//   notes?: string;
// }

// // Sample data
// const reports: Report[] = [
//   {
//     id: '1',
//     name: 'January 2024 Inventory Report',
//     type: 'monthly',
//     dateRange: 'Jan 1 - Jan 31, 2024',
//     generatedDate: '2024-02-01',
//     size: '4.2 MB',
//     items: 156,
//     totalValue: 85420.50,
//     status: 'completed'
//   },
//   {
//     id: '2',
//     name: 'Weekly Stock Analysis',
//     type: 'weekly',
//     dateRange: 'Jan 22 - Jan 28, 2024',
//     generatedDate: '2024-01-29',
//     size: '2.1 MB',
//     items: 142,
//     totalValue: 78250.75,
//     status: 'completed'
//   },
//   {
//     id: '3',
//     name: 'Today\'s Stock Alert',
//     type: 'daily',
//     dateRange: 'Jan 29, 2024',
//     generatedDate: '2024-01-29',
//     size: '1.5 MB',
//     items: 156,
//     totalValue: 85420.50,
//     status: 'completed'
//   },
//   {
//     id: '4',
//     name: 'Q4 2023 Year-End Report',
//     type: 'custom',
//     dateRange: 'Oct 1 - Dec 31, 2023',
//     generatedDate: '2024-01-05',
//     size: '8.7 MB',
//     items: 145,
//     totalValue: 79500.25,
//     status: 'completed'
//   },
//   {
//     id: '5',
//     name: 'Coffee Products Analysis',
//     type: 'custom',
//     dateRange: 'Dec 1 - Dec 31, 2023',
//     generatedDate: '2024-01-03',
//     size: '3.4 MB',
//     items: 45,
//     totalValue: 28500.00,
//     status: 'completed'
//   },
//   {
//     id: '6',
//     name: 'Low Stock Items Report',
//     type: 'weekly',
//     dateRange: 'Jan 15 - Jan 21, 2024',
//     generatedDate: '2024-01-22',
//     size: '1.8 MB',
//     items: 23,
//     totalValue: 12500.50,
//     status: 'completed'
//   },
//   {
//     id: '7',
//     name: 'Current Inventory Valuation',
//     type: 'monthly',
//     dateRange: 'As of Jan 29, 2024',
//     generatedDate: '2024-01-29',
//     size: '4.5 MB',
//     items: 156,
//     totalValue: 85420.50,
//     status: 'pending'
//   },
//   {
//     id: '8',
//     name: 'Stock Movement Log',
//     type: 'custom',
//     dateRange: 'Jan 1 - Jan 29, 2024',
//     generatedDate: '2024-01-29',
//     size: '6.2 MB',
//     items: 420,
//     totalValue: 0,
//     status: 'error'
//   },
// ];

// const categoryStats: CategoryStats[] = [
//   {
//     id: 'espresso',
//     name: 'Espresso',
//     icon: 'coffee',
//     totalItems: 42,
//     lowStockItems: 3,
//     totalValue: 28500.75,
//     change: 12.5
//   },
//   {
//     id: 'refreshers',
//     name: 'Refreshers',
//     icon: 'coffee',
//     totalItems: 18,
//     lowStockItems: 2,
//     totalValue: 12500.25,
//     change: 8.2
//   },
//   {
//     id: 'specials',
//     name: 'Specials',
//     icon: 'coffee',
//     totalItems: 24,
//     lowStockItems: 1,
//     totalValue: 18500.50,
//     change: 15.3
//   },
//   {
//     id: 'frappe',
//     name: 'Frappe',
//     icon: 'coffee',
//     totalItems: 15,
//     lowStockItems: 0,
//     totalValue: 9850.00,
//     change: 5.7
//   },
//   {
//     id: 'breakfast',
//     name: 'Breakfast',
//     icon: 'utensils',
//     totalItems: 12,
//     lowStockItems: 4,
//     totalValue: 8500.75,
//     change: -2.1
//   },
//   {
//     id: 'snacks',
//     name: 'Snacks',
//     icon: 'utensils',
//     totalItems: 21,
//     lowStockItems: 5,
//     totalValue: 12500.25,
//     change: 3.4
//   },
//   {
//     id: 'pastries',
//     name: 'Pastries',
//     icon: 'utensils',
//     totalItems: 18,
//     lowStockItems: 2,
//     totalValue: 9500.00,
//     change: 7.8
//   },
//   {
//     id: 'sweets',
//     name: 'Sweets',
//     icon: 'utensils',
//     totalItems: 6,
//     lowStockItems: 0,
//     totalValue: 3568.75,
//     change: 9.2
//   },
// ];

// const inventoryMovements: InventoryMovement[] = [
//   {
//     id: '1',
//     itemName: 'Espresso Beans',
//     category: 'Coffee',
//     type: 'in',
//     quantity: 20,
//     date: '2024-01-29 09:30',
//     user: 'Admin',
//     notes: 'Monthly restock'
//   },
//   {
//     id: '2',
//     itemName: 'Fresh Milk',
//     category: 'Dairy',
//     type: 'out',
//     quantity: -15,
//     date: '2024-01-29 11:15',
//     user: 'Staff',
//     notes: 'Daily usage'
//   },
//   {
//     id: '3',
//     itemName: 'Paper Cups (12oz)',
//     category: 'Packaging',
//     type: 'in',
//     quantity: 500,
//     date: '2024-01-28 14:20',
//     user: 'Admin',
//     notes: 'Bulk order'
//   },
//   {
//     id: '4',
//     itemName: 'Matcha Powder',
//     category: 'Tea',
//     type: 'adjustment',
//     quantity: -2,
//     date: '2024-01-28 16:45',
//     user: 'Manager',
//     notes: 'Damaged stock'
//   },
//   {
//     id: '5',
//     itemName: 'Croissants',
//     category: 'Pastries',
//     type: 'out',
//     quantity: -24,
//     date: '2024-01-28 08:15',
//     user: 'Staff',
//     notes: 'Sold out'
//   },
//   {
//     id: '6',
//     itemName: 'Strawberry Syrup',
//     category: 'Syrups',
//     type: 'in',
//     quantity: 12,
//     date: '2024-01-27 10:30',
//     user: 'Admin',
//     notes: 'Restock'
//   },
//   {
//     id: '7',
//     itemName: 'Vanilla Syrup',
//     category: 'Syrups',
//     type: 'out',
//     quantity: -8,
//     date: '2024-01-27 15:20',
//     user: 'Staff',
//     notes: 'Daily usage'
//   },
//   {
//     id: '8',
//     itemName: 'Sugar',
//     category: 'Pantry',
//     type: 'in',
//     quantity: 20,
//     date: '2024-01-26 13:45',
//     user: 'Admin',
//     notes: 'Restock'
//   },
// ];

// // Report type filter
// type ReportTypeFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'custom';
// type StatusFilter = 'all' | 'completed' | 'pending' | 'error';

// export default function InventoryReportsPage() {
//   const [reportTypeFilter, setReportTypeFilter] = useState<ReportTypeFilter>('all');
//   const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
//   const [dateRange, setDateRange] = useState('last30days');
//   const [selectedReport, setSelectedReport] = useState<string | null>(null);

//   // Filter reports
//   const filteredReports = reports.filter(report => {
//     const matchesType = reportTypeFilter === 'all' || report.type === reportTypeFilter;
//     const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
//     return matchesType && matchesStatus;
//   });

//   // Statistics
//   const totalReports = reports.length;
//   const totalValue = reports.reduce((sum, report) => sum + report.totalValue, 0);
//   const averageValue = totalReports > 0 ? totalValue / totalReports : 0;

//   // Get status color
//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'completed': return 'text-green-600 bg-green-50 border-green-200';
//       case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
//       case 'error': return 'text-red-600 bg-red-50 border-red-200';
//       default: return 'text-gray-600 bg-gray-50 border-gray-200';
//     }
//   };

//   // Get type icon
//   const getTypeIcon = (type: string) => {
//     switch (type) {
//       case 'daily': return <Calendar className="h-4 w-4" />;
//       case 'weekly': return <BarChart3 className="h-4 w-4" />;
//       case 'monthly': return <TrendingUp className="h-4 w-4" />;
//       case 'custom': return <FileText className="h-4 w-4" />;
//       default: return <FileText className="h-4 w-4" />;
//     }
//   };

//   // Format currency
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-PH', {
//       style: 'currency',
//       currency: 'PHP',
//       minimumFractionDigits: 2
//     }).format(amount);
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Main Content */}
//       <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//         {/* Page Title */}
//         <div className="mb-8">
//           <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//             <div>
//               <h2 className="text-3xl font-bold tracking-tight text-foreground">
//                 Inventory Reports
//               </h2>
//               <p className="text-muted-foreground">
//                 Generate, view, and manage inventory reports and analytics.
//               </p>
//             </div>
//             <button className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
//               <FileText className="h-4 w-4" />
//               Generate New Report
//             </button>
//           </div>
//         </div>

//         {/* Stats Overview */}
//         <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           <div className="rounded-lg border border-border bg-card p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
//                 <p className="text-2xl font-bold text-foreground">{totalReports}</p>
//                 <p className="text-xs text-muted-foreground">+2 this month</p>
//               </div>
//               <div className="rounded-lg bg-secondary p-3">
//                 <FileText className="h-6 w-6 text-foreground" />
//               </div>
//             </div>
//           </div>
//           <div className="rounded-lg border border-border bg-card p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
//                 <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
//                 <p className="text-xs text-muted-foreground">+12.5% from last month</p>
//               </div>
//               <div className="rounded-lg bg-secondary p-3">
//                 <TrendingUp className="h-6 w-6 text-foreground" />
//               </div>
//             </div>
//           </div>
//           <div className="rounded-lg border border-border bg-card p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Avg Report Value</p>
//                 <p className="text-2xl font-bold text-foreground">{formatCurrency(averageValue)}</p>
//                 <p className="text-xs text-muted-foreground">Per report</p>
//               </div>
//               <div className="rounded-lg bg-secondary p-3">
//                 <BarChart3 className="h-6 w-6 text-foreground" />
//               </div>
//             </div>
//           </div>
//           <div className="rounded-lg border border-border bg-card p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Active Categories</p>
//                 <p className="text-2xl font-bold text-foreground">{categoryStats.length}</p>
//                 <p className="text-xs text-muted-foreground">With inventory data</p>
//               </div>
//               <div className="rounded-lg bg-secondary p-3">
//                 <Package className="h-6 w-6 text-foreground" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Filters Section */}
//         <div className="mb-8 rounded-lg border border-border bg-card p-4">
//           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//             {/* Report Type Filters */}
//             <div className="flex flex-wrap gap-2">
//               <button
//                 onClick={() => setReportTypeFilter('all')}
//                 className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
//                   reportTypeFilter === 'all'
//                     ? 'bg-foreground text-background'
//                     : 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
//                 }`}
//               >
//                 All Reports
//               </button>
//               <button
//                 onClick={() => setReportTypeFilter('daily')}
//                 className={`rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
//                   reportTypeFilter === 'daily'
//                     ? 'bg-foreground text-background'
//                     : 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
//                 }`}
//               >
//                 <Calendar className="h-3 w-3" />
//                 Daily
//               </button>
//               <button
//                 onClick={() => setReportTypeFilter('weekly')}
//                 className={`rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
//                   reportTypeFilter === 'weekly'
//                     ? 'bg-foreground text-background'
//                     : 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
//                 }`}
//               >
//                 <BarChart3 className="h-3 w-3" />
//                 Weekly
//               </button>
//               <button
//                 onClick={() => setReportTypeFilter('monthly')}
//                 className={`rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
//                   reportTypeFilter === 'monthly'
//                     ? 'bg-foreground text-background'
//                     : 'border border-border bg-secondary text-foreground hover:bg-secondary/80'
//                 }`}
//               >
//                 <TrendingUp className="h-3 w-3" />
//                 Monthly
//               </button>
//             </div>

//             {/* Status Filter and Date Range */}
//             <div className="flex flex-wrap gap-2">
//               <select
//                 value={statusFilter}
//                 onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
//                 className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
//               >
//                 <option value="all">All Status</option>
//                 <option value="completed">Completed</option>
//                 <option value="pending">Pending</option>
//                 <option value="error">Error</option>
//               </select>
//               <select
//                 value={dateRange}
//                 onChange={(e) => setDateRange(e.target.value)}
//                 className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
//               >
//                 <option value="today">Today</option>
//                 <option value="last7days">Last 7 Days</option>
//                 <option value="last30days">Last 30 Days</option>
//                 <option value="last90days">Last 90 Days</option>
//                 <option value="thisyear">This Year</option>
//               </select>
//               <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80">
//                 <Filter className="h-4 w-4" />
//                 More Filters
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Main Content Grid */}
//         <div className="grid gap-8 lg:grid-cols-3">
//           {/* Reports List - 2 columns */}
//           <div className="lg:col-span-2">
//             <div className="rounded-lg border border-border bg-card">
//               <div className="border-b border-border px-6 py-4">
//                 <h3 className="text-lg font-semibold text-foreground">Generated Reports</h3>
//                 <p className="text-sm text-muted-foreground">Recent inventory reports and analytics</p>
//               </div>
              
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="border-b border-border bg-secondary">
//                       <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
//                         Report Name
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
//                         Type
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
//                         Date Range
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
//                         Status
//                       </th>
//                       <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
//                         Actions
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-border">
//                     {filteredReports.map((report) => (
//                       <tr key={report.id} className="hover:bg-secondary/50">
//                         <td className="px-6 py-4">
//                           <div>
//                             <div className="font-medium text-foreground">{report.name}</div>
//                             <div className="text-sm text-muted-foreground">
//                               Generated: {new Date(report.generatedDate).toLocaleDateString()}
//                             </div>
//                             <div className="text-xs text-muted-foreground">
//                               {report.size} • {report.items} items
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4">
//                           <div className="flex items-center gap-2">
//                             {getTypeIcon(report.type)}
//                             <span className="text-sm text-foreground capitalize">{report.type}</span>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4">
//                           <div className="text-sm text-foreground">{report.dateRange}</div>
//                         </td>
//                         <td className="px-6 py-4">
//                           <div className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(report.status)}`}>
//                             <span className="capitalize">{report.status}</span>
//                           </div>
//                         </td>
//                         <td className="px-6 py-4">
//                           <div className="flex items-center gap-2">
//                             <button
//                               title="Download"
//                               className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary"
//                             >
//                               <Download className="h-4 w-4" />
//                             </button>
//                             <button
//                               title="Print"
//                               className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary"
//                             >
//                               <Printer className="h-4 w-4" />
//                             </button>
//                             <button
//                               onClick={() => setSelectedReport(report.id === selectedReport ? null : report.id)}
//                               className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
//                             >
//                               View Details
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Report Details */}
//               {selectedReport && (
//                 <div className="border-t border-border p-6">
//                   <div className="flex items-center justify-between mb-4">
//                     <h4 className="text-lg font-semibold text-foreground">Report Details</h4>
//                     <button
//                       onClick={() => setSelectedReport(null)}
//                       className="text-sm text-muted-foreground hover:text-foreground"
//                     >
//                       Close
//                     </button>
//                   </div>
//                   <div className="grid gap-4 sm:grid-cols-2">
//                     <div className="rounded-lg bg-secondary p-4">
//                       <p className="text-sm font-medium text-foreground">Total Inventory Value</p>
//                       <p className="text-2xl font-bold text-foreground">
//                         {formatCurrency(reports.find(r => r.id === selectedReport)?.totalValue || 0)}
//                       </p>
//                     </div>
//                     <div className="rounded-lg bg-secondary p-4">
//                       <p className="text-sm font-medium text-foreground">Items Count</p>
//                       <p className="text-2xl font-bold text-foreground">
//                         {reports.find(r => r.id === selectedReport)?.items || 0}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Empty State */}
//               {filteredReports.length === 0 && (
//                 <div className="px-6 py-12 text-center">
//                   <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
//                   <h3 className="mt-4 text-lg font-medium text-foreground">No reports found</h3>
//                   <p className="mt-2 text-sm text-muted-foreground">
//                     Try changing your filters or generate a new report.
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Category Stats - 1 column */}
//           <div>
//             <div className="rounded-lg border border-border bg-card">
//               <div className="border-b border-border px-6 py-4">
//                 <h3 className="text-lg font-semibold text-foreground">Category Overview</h3>
//                 <p className="text-sm text-muted-foreground">Inventory by product category</p>
//               </div>
//               <div className="divide-y divide-border">
//                 {categoryStats.map((category) => (
//                   <div key={category.id} className="px-6 py-4">
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center gap-3">
//                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
//                           {category.icon === 'coffee' ? (
//                             <Coffee className="h-5 w-5 text-foreground" />
//                           ) : (
//                             <Utensils className="h-5 w-5 text-foreground" />
//                           )}
//                         </div>
//                         <div>
//                           <div className="font-medium text-foreground">{category.name}</div>
//                           <div className="text-xs text-muted-foreground">
//                             {category.lowStockItems} low stock • {category.totalItems} total
//                           </div>
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div className="font-semibold text-foreground">{formatCurrency(category.totalValue)}</div>
//                         <div className={`flex items-center gap-1 text-xs ${category.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
//                           {category.change >= 0 ? (
//                             <TrendingUp className="h-3 w-3" />
//                           ) : (
//                             <TrendingDown className="h-3 w-3" />
//                           )}
//                           <span>{Math.abs(category.change)}%</span>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Recent Activity */}
//             <div className="mt-8 rounded-lg border border-border bg-card">
//               <div className="border-b border-border px-6 py-4">
//                 <h3 className="text-lg font-semibold text-foreground">Recent Stock Movements</h3>
//                 <p className="text-sm text-muted-foreground">Last 7 days activity</p>
//               </div>
//               <div className="max-h-96 overflow-y-auto">
//                 {inventoryMovements.map((movement) => (
//                   <div key={movement.id} className="border-b border-border px-6 py-4 last:border-b-0">
//                     <div className="flex items-start justify-between">
//                       <div>
//                         <div className="font-medium text-foreground">{movement.itemName}</div>
//                         <div className="text-sm text-muted-foreground">{movement.category}</div>
//                         <div className="text-xs text-muted-foreground">
//                           {new Date(movement.date).toLocaleDateString()} • {movement.user}
//                         </div>
//                         {movement.notes && (
//                           <div className="mt-1 text-xs text-muted-foreground">Note: {movement.notes}</div>
//                         )}
//                       </div>
//                       <div className={`text-right font-semibold ${
//                         movement.quantity > 0 ? 'text-green-600' : 
//                         movement.quantity < 0 ? 'text-red-600' : 'text-yellow-600'
//                       }`}>
//                         {movement.quantity > 0 ? '+' : ''}{movement.quantity}
//                         <div className="text-xs font-normal capitalize text-muted-foreground">
//                           {movement.type}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Quick Report Actions */}
//         <div className="mt-8">
//           <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Quick Reports</h3>
//           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h4 className="font-semibold text-foreground">Stock Value Report</h4>
//                   <p className="text-sm text-muted-foreground">Current inventory valuation</p>
//                 </div>
//                 <FileText className="h-5 w-5 text-foreground" />
//               </div>
//             </button>
//             <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h4 className="font-semibold text-foreground">Low Stock Alert</h4>
//                   <p className="text-sm text-muted-foreground">Items needing reorder</p>
//                 </div>
//                 <Package className="h-5 w-5 text-foreground" />
//               </div>
//             </button>
//             <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h4 className="font-semibold text-foreground">Movement Log</h4>
//                   <p className="text-sm text-muted-foreground">Stock in/out history</p>
//                 </div>
//                 <TrendingUp className="h-5 w-5 text-foreground" />
//               </div>
//             </button>
//             <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:shadow-md">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h4 className="font-semibold text-foreground">Category Analysis</h4>
//                   <p className="text-sm text-muted-foreground">Performance by category</p>
//                 </div>
//                 <PieChart className="h-5 w-5 text-foreground" />
//               </div>
//             </button>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
import React from 'react'

const page = () => {
  return (
    <div>page</div>
  )
}

export default page