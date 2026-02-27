// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { 
//   History, 
//   Printer, 
//   Search, 
//   Calendar,
//   ChevronLeft,
//   ChevronRight,
//   Download,
//   Eye,
//   TrendingUp,
//   TrendingDown,
//   MinusCircle,
//   AlertCircle,
//   X,
//   Receipt,
//   DollarSign,
//   Filter,
//   RotateCcw
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { useReceiptSettings } from '@/hooks/useReceiptSettings';
// import ZReportModal from '@/app/(dashboard)/(public)/settings/receipt-setting/components/ZReportModal';
// import DatePicker from 'react-datepicker';
// import "react-datepicker/dist/react-datepicker.css";

// interface CashOut {
//   amount: number;
//   reason: string;
//   date: string;
// }

// interface ClosedSession {
//   _id: string;
//   openingFund: number;
//   cashierName: string;
//   registerName: string;
//   openedAt: string;
//   closedAt: string;
//   status: 'closed';
//   actualCash: number;
//   expectedCash: number;
//   difference: number;
//   closeStatus: string; // 'balanced' | 'short' | 'over'
//   closingNotes?: string;
//   snapshot?: {
//     totalSales?: number;
//     netSales?: number;
//     totalDiscounts?: number;
//     totalRefunds?: number;
//     cashSales?: number;
//     gcashSales?: number;
//     splitSales?: number;
//     transactions?: number;
//     items?: number;
//   };
//   cashOuts: CashOut[];
//   createdAt: string;
//   updatedAt: string;
// }

// interface Filters {
//   startDate: Date | null;
//   endDate: Date | null;
//   cashierName: string;
//   registerName: string;
//   status: 'all' | 'balanced' | 'short' | 'over';
// }

// export default function CloseRegisterHistoryPage() {
//   const router = useRouter();
//   const { settings } = useReceiptSettings();
  
//   const [sessions, setSessions] = useState<ClosedSession[]>([]);
//   const [filteredSessions, setFilteredSessions] = useState<ClosedSession[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedSession, setSelectedSession] = useState<ClosedSession | null>(null);
//   const [showZReport, setShowZReport] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
  
//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage] = useState(10);
  
//   // Filters
//   const [showFilters, setShowFilters] = useState(false);
//   const [filters, setFilters] = useState<Filters>({
//     startDate: null,
//     endDate: null,
//     cashierName: '',
//     registerName: '',
//     status: 'all'
//   });

//   // Statistics
//   const [statistics, setStatistics] = useState({
//     totalSessions: 0,
//     totalSales: 0,
//     totalDifference: 0,
//     balancedCount: 0,
//     shortCount: 0,
//     overCount: 0,
//     totalShortAmount: 0,
//     totalOverAmount: 0
//   });

//   useEffect(() => {
//     loadClosedSessions();
//   }, []);

//   useEffect(() => {
//     applyFilters();
//     calculateStatistics();
//   }, [sessions, filters, searchTerm]);

//   const loadClosedSessions = async () => {
//     setLoading(true);
//     try {
//       // Build query parameters
//       const params = new URLSearchParams();
//       if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
//       if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
//       if (filters.cashierName) params.append('cashierName', filters.cashierName);
//       if (filters.registerName) params.append('registerName', filters.registerName);
//       if (filters.status !== 'all') params.append('status', filters.status);

//       const response = await fetch(`/api/sessions/history?${params.toString()}`);
//       const result = await response.json();
      
//       if (result.success) {
//         setSessions(result.data);
//       } else {
//         toast.error('Failed to load closed sessions');
//       }
//     } catch (error) {
//       console.error('Error loading closed sessions:', error);
//       toast.error('Error loading closed sessions');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const applyFilters = () => {
//     let filtered = [...sessions];

//     // Search term filter (local filtering for better UX)
//     if (searchTerm) {
//       const term = searchTerm.toLowerCase();
//       filtered = filtered.filter(session => 
//         session.cashierName?.toLowerCase().includes(term) ||
//         session.registerName?.toLowerCase().includes(term) ||
//         new Date(session.closedAt).toLocaleDateString().includes(term) ||
//         (session.closeStatus || '').toLowerCase().includes(term)
//       );
//     }

//     setFilteredSessions(filtered);
//     setCurrentPage(1);
//   };

//   const calculateStatistics = () => {
//     const stats = {
//       totalSessions: filteredSessions.length,
//       totalSales: filteredSessions.reduce((sum, s) => sum + (s.snapshot?.totalSales || 0), 0),
//       totalDifference: filteredSessions.reduce((sum, s) => sum + (s.difference || 0), 0),
//       balancedCount: filteredSessions.filter(s => s.closeStatus === 'balanced').length,
//       shortCount: filteredSessions.filter(s => s.closeStatus === 'short').length,
//       overCount: filteredSessions.filter(s => s.closeStatus === 'over').length,
//       totalShortAmount: filteredSessions
//         .filter(s => s.closeStatus === 'short')
//         .reduce((sum, s) => sum + Math.abs(s.difference || 0), 0),
//       totalOverAmount: filteredSessions
//         .filter(s => s.closeStatus === 'over')
//         .reduce((sum, s) => sum + (s.difference || 0), 0)
//     };
//     setStatistics(stats);
//   };

//   const clearFilters = () => {
//     setFilters({
//       startDate: null,
//       endDate: null,
//       cashierName: '',
//       registerName: '',
//       status: 'all'
//     });
//     setSearchTerm('');
//     loadClosedSessions(); // Reload with no filters
//   };

//   const handleViewReport = (session: ClosedSession) => {
//     setSelectedSession(session);
//     setShowZReport(true);
//   };

//   const handleExport = () => {
//     const data = filteredSessions.map(session => ({
//       'Date Closed': new Date(session.closedAt).toLocaleString(),
//       'Cashier': session.cashierName || 'Unknown',
//       'Register': session.registerName || 'Main Register',
//       'Opening Fund': (session.openingFund || 0).toFixed(2),
//       'Expected Cash': (session.expectedCash || 0).toFixed(2),
//       'Actual Cash': (session.actualCash || 0).toFixed(2),
//       'Difference': (session.difference || 0).toFixed(2),
//       'Status': session.closeStatus || 'unknown',
//       'Total Sales': (session.snapshot?.totalSales || 0).toFixed(2),
//       'Transactions': session.snapshot?.transactions || 0,
//       'Cash Sales': (session.snapshot?.cashSales || 0).toFixed(2),
//       'GCash Sales': (session.snapshot?.gcashSales || 0).toFixed(2),
//       'Split Sales': (session.snapshot?.splitSales || 0).toFixed(2),
//       'Discounts': (session.snapshot?.totalDiscounts || 0).toFixed(2),
//       'Refunds': (session.snapshot?.totalRefunds || 0).toFixed(2)
//     }));

//     const headers = Object.keys(data[0]).join(',');
//     const csv = [
//       headers,
//       ...data.map(row => Object.values(row).join(','))
//     ].join('\n');

//     const blob = new Blob([csv], { type: 'text/csv' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `register-history-${new Date().toISOString().split('T')[0]}.csv`;
//     a.click();
//     window.URL.revokeObjectURL(url);
//   };

//   const handleRefresh = () => {
//     loadClosedSessions();
//     toast.success('History refreshed');
//   };

//   // Pagination
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentItems = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);
//   const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

//   const getStatusIcon = (status: string) => {
//     switch(status) {
//       case 'balanced':
//         return <MinusCircle className="h-5 w-5 text-green-500" />;
//       case 'short':
//         return <TrendingDown className="h-5 w-5 text-red-500" />;
//       case 'over':
//         return <TrendingUp className="h-5 w-5 text-yellow-500" />;
//       default:
//         return <AlertCircle className="h-5 w-5 text-gray-500" />;
//     }
//   };

//   const getStatusBadge = (status: string, difference: number) => {
//     const styles = {
//       balanced: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
//       short: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
//       over: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
//     };

//     const labels = {
//       balanced: 'Balanced',
//       short: `Short ${formatCurrency(Math.abs(difference))}`,
//       over: `Over ${formatCurrency(difference)}`
//     };

//     const style = styles[status as keyof typeof styles] || styles.balanced;

//     return (
//       <span className={`px-3 py-1 rounded-full text-sm font-medium border ${style}`}>
//         {labels[status as keyof typeof labels] || status}
//       </span>
//     );
//   };

//   const formatCurrency = (amount: number) => {
//     return `₱${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleString('en-PH', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const formatShortDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-PH', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric'
//     });
//   };

//   return (
//     <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="mb-6">
//           <div className="flex items-center justify-between flex-wrap gap-4">
//             <div className="flex items-center gap-3">
//               <History className="h-8 w-8 text-primary" />
//               <div>
//                 <h1 className="text-2xl md:text-3xl font-bold">Close Register History</h1>
//                 <p className="text-muted-foreground mt-1">View all closed register sessions</p>
//               </div>
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={handleRefresh}
//                 className="px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors flex items-center gap-2"
//                 title="Refresh"
//               >
//                 <RotateCcw className="h-4 w-4" />
//                 <span className="hidden sm:inline">Refresh</span>
//               </button>
//               <button
//                 onClick={handleExport}
//                 className="px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors flex items-center gap-2"
//                 disabled={filteredSessions.length === 0}
//               >
//                 <Download className="h-4 w-4" />
//                 <span className="hidden sm:inline">Export</span>
//               </button>
//               <button
//                 onClick={() => router.push('/mysales/cash-management')}
//                 className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
//               >
//                 Back
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Statistics Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//           <div className="bg-card border border-border rounded-xl p-4">
//             <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
//             <p className="text-2xl font-bold">{statistics.totalSessions}</p>
//             <p className="text-xs text-muted-foreground mt-2">
//               Total Sales: {formatCurrency(statistics.totalSales)}
//             </p>
//           </div>
          
//           <div className="bg-card border border-border rounded-xl p-4">
//             <p className="text-sm text-muted-foreground mb-1">Balanced</p>
//             <div className="flex items-center justify-between">
//               <p className="text-2xl font-bold text-green-600 dark:text-green-400">
//                 {statistics.balancedCount}
//               </p>
//               <MinusCircle className="h-5 w-5 text-green-500" />
//             </div>
//           </div>
          
//           <div className="bg-card border border-border rounded-xl p-4">
//             <p className="text-sm text-muted-foreground mb-1">Short</p>
//             <div className="flex items-center justify-between">
//               <p className="text-2xl font-bold text-red-600 dark:text-red-400">
//                 {statistics.shortCount}
//               </p>
//               <div className="text-right">
//                 <p className="text-sm font-medium text-red-600 dark:text-red-400">
//                   {formatCurrency(statistics.totalShortAmount)}
//                 </p>
//               </div>
//             </div>
//           </div>
          
//           <div className="bg-card border border-border rounded-xl p-4">
//             <p className="text-sm text-muted-foreground mb-1">Over</p>
//             <div className="flex items-center justify-between">
//               <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
//                 {statistics.overCount}
//               </p>
//               <div className="text-right">
//                 <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
//                   {formatCurrency(statistics.totalOverAmount)}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Search and Filters */}
//         <div className="bg-card border border-border rounded-xl p-4 mb-6">
//           <div className="flex flex-col md:flex-row gap-4">
//             <div className="flex-1 relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <input
//                 type="text"
//                 placeholder="Search by cashier, register, status, or date..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
//               />
//             </div>
//             <button
//               onClick={() => setShowFilters(!showFilters)}
//               className={`px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 ${
//                 showFilters ? 'bg-muted' : ''
//               }`}
//             >
//               <Filter className="h-4 w-4" />
//               <span className="hidden sm:inline">Filters</span>
//               {(filters.startDate || filters.endDate || filters.cashierName || filters.registerName || filters.status !== 'all') && (
//                 <span className="w-2 h-2 bg-primary rounded-full"></span>
//               )}
//             </button>
//             <button
//               onClick={clearFilters}
//               className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
//             >
//               Clear
//             </button>
//           </div>

//           {/* Advanced Filters */}
//           {showFilters && (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Start Date</label>
//                 <DatePicker
//                   selected={filters.startDate}
//                   onChange={(date) => setFilters({...filters, startDate: date})}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background"
//                   placeholderText="Select start date"
//                   dateFormat="MMM dd, yyyy"
//                   isClearable
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">End Date</label>
//                 <DatePicker
//                   selected={filters.endDate}
//                   onChange={(date) => setFilters({...filters, endDate: date})}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background"
//                   placeholderText="Select end date"
//                   dateFormat="MMM dd, yyyy"
//                   isClearable
//                   minDate={filters.startDate || undefined}
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Cashier</label>
//                 <input
//                   type="text"
//                   value={filters.cashierName}
//                   onChange={(e) => setFilters({...filters, cashierName: e.target.value})}
//                   placeholder="Filter by cashier"
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Status</label>
//                 <select
//                   value={filters.status}
//                   onChange={(e) => setFilters({...filters, status: e.target.value as any})}
//                   className="w-full px-3 py-2 border border-border rounded-lg bg-background"
//                 >
//                   <option value="all">All Status</option>
//                   <option value="balanced">Balanced</option>
//                   <option value="short">Short</option>
//                   <option value="over">Over</option>
//                 </select>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Sessions Table */}
//         <div className="bg-card border border-border rounded-xl overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-muted/50">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date Closed</th>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cashier</th>
//                   <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Register</th>
//                   <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Opening</th>
//                   <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Expected</th>
//                   <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actual</th>
//                   <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
//                   <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Sales</th>
//                   <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-border">
//                 {loading ? (
//                   <tr>
//                     <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
//                       <div className="flex justify-center">
//                         <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : currentItems.length === 0 ? (
//                   <tr>
//                     <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
//                       <div className="flex flex-col items-center gap-2">
//                         <History className="h-12 w-12 text-muted-foreground/50" />
//                         <p>No closed sessions found</p>
//                         <button
//                           onClick={clearFilters}
//                           className="text-primary hover:underline text-sm"
//                         >
//                           Clear filters
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : (
//                   currentItems.map((session) => (
//                     <tr key={session._id} className="hover:bg-muted/50 transition-colors">
//                       <td className="px-4 py-3 text-sm">
//                         <div className="flex flex-col">
//                           <span className="font-medium">{formatShortDate(session.closedAt)}</span>
//                           <span className="text-xs text-muted-foreground">
//                             {new Date(session.closedAt).toLocaleTimeString()}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-4 py-3 text-sm font-medium">
//                         {session.cashierName || 'Unknown'}
//                       </td>
//                       <td className="px-4 py-3 text-sm">
//                         {session.registerName || 'Main Register'}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-right">
//                         {formatCurrency(session.openingFund || 0)}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-right">
//                         {formatCurrency(session.expectedCash || 0)}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-right font-medium">
//                         {formatCurrency(session.actualCash || 0)}
//                       </td>
//                       <td className="px-4 py-3 text-center">
//                         {getStatusBadge(session.closeStatus || 'unknown', session.difference || 0)}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-right font-medium">
//                         {formatCurrency(session.snapshot?.totalSales || 0)}
//                       </td>
//                       <td className="px-4 py-3 text-center">
//                         <button
//                           onClick={() => handleViewReport(session)}
//                           className="p-2 hover:bg-muted rounded-lg transition-colors group relative"
//                           title="View Z-Report"
//                         >
//                           <Eye className="h-4 w-4 group-hover:text-primary" />
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           {filteredSessions.length > 0 && (
//             <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
//               <p className="text-sm text-muted-foreground">
//                 Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSessions.length)} of {filteredSessions.length} entries
//               </p>
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
//                   disabled={currentPage === 1}
//                   className="p-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <ChevronLeft className="h-4 w-4" />
//                 </button>
//                 <span className="px-4 py-2 text-sm bg-muted rounded-lg">
//                   Page {currentPage} of {totalPages}
//                 </span>
//                 <button
//                   onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
//                   disabled={currentPage === totalPages}
//                   className="p-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <ChevronRight className="h-4 w-4" />
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Z-Report Modal */}
//       {showZReport && selectedSession && (
//         <ZReportModal
//           session={{
//             ...selectedSession,
//             openedAt: selectedSession.openedAt,
//             closedAt: selectedSession.closedAt,
//             cashierName: selectedSession.cashierName,
//             registerName: selectedSession.registerName,
//             openingFund: selectedSession.openingFund
//           }}
//           summary={{
//             totalSales: selectedSession.snapshot?.totalSales || 0,
//             netSales: selectedSession.snapshot?.netSales || 0,
//             totalDiscounts: selectedSession.snapshot?.totalDiscounts || 0,
//             totalRefunds: selectedSession.snapshot?.totalRefunds || 0,
//             cashSales: selectedSession.snapshot?.cashSales || 0,
//             gcashSales: selectedSession.snapshot?.gcashSales || 0,
//             splitSales: selectedSession.snapshot?.splitSales || 0,
//             cashInDrawer: selectedSession.actualCash || 0,
//             expectedCash: selectedSession.expectedCash || 0,
//             difference: selectedSession.difference || 0,
//             closeStatus: selectedSession.closeStatus || 'unknown',
//             openingFund: selectedSession.openingFund || 0,
//             cashOuts: selectedSession.cashOuts?.reduce((sum, c) => sum + c.amount, 0) || 0,
//             transactions: selectedSession.snapshot?.transactions || 0,
//             items: selectedSession.snapshot?.items || 0,
//             actualCash: selectedSession.actualCash || 0
//           }}
//           settings={settings}
//           onClose={() => setShowZReport(false)}
//           onConfirmClose={() => setShowZReport(false)}
//           isHistoryView={true}
//         />
//       )}
//     </div>
//   );
// }