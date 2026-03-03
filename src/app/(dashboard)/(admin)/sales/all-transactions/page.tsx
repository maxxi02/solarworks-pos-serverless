'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Clock, Calendar, RefreshCw, Wallet, CreditCard } from 'lucide-react';
import { io as socketIO, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ============ Types ============
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year';
type PaymentFilter = 'all' | 'cash' | 'gcash';

interface TransactionItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

interface Transaction {
  _id: string;
  orderNumber: string;
  customerName?: string;
  items: TransactionItem[];
  total: number;
  paymentMethod: string;
  orderType?: string;
  cashierId?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentsResponse {
  success: boolean;
  data?: {
    payments: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  error?: string;
}

interface SummaryResponse {
  success: boolean;
  data?: {
    period: string;
    dateRange: {
      from: string;
      to: string;
    };
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      avgOrderValue: number;
    };
    recentTransactions: Transaction[];
  };
  error?: string;
}

// ============ Utils ============
const formatCurrency = (value: number = 0): string => {
  return `₱${value.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const getItemCount = (transaction: Transaction): number => {
  if (!transaction?.items || !Array.isArray(transaction.items)) return 0;
  return transaction.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};

const getProductNames = (transaction: Transaction): string => {
  if (!transaction?.items || !Array.isArray(transaction.items)) return 'No items';
  return transaction.items.map(item => item.name).join(', ');
};

// Date filter function
const isWithinDateRange = (date: string, filter: PeriodFilter): boolean => {
  if (filter === 'all') return true;
  
  const transactionDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (filter) {
    case 'today': {
      return transactionDate >= today;
    }
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return transactionDate >= weekAgo;
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return transactionDate >= monthAgo;
    }
    case 'year': {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return transactionDate >= yearAgo;
    }
    default:
      return true;
  }
};

// ============ Main Component ============
export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  
  // Data states
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryResponse['data'] | null>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Socket connection
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // ============ Data Fetching ============
  const fetchTransactions = async (page = currentPage, append = false) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);

    try {
      // Build query params for /api/payments
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString()
      });

      const url = `/api/payments?${params.toString()}`;
      console.log('Fetching transactions:', url);

      const response = await fetch(url);
      const result: PaymentsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transactions');
      }

      if (result.data?.payments) {
        setAllTransactions(prev => 
          append ? [...prev, ...result.data!.payments] : result.data!.payments
        );
      }

      if (result.data?.pagination) {
        setPagination({
          total: result.data.pagination.total,
          pages: result.data.pagination.pages
        });
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams({
        period: periodFilter
      });

      const url = `/api/payments/summary?${params.toString()}`;
      const response = await fetch(url);
      const result: SummaryResponse = await response.json();

      if (result.success && result.data) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  // ============ Filtering Logic ============
  const filteredTransactions = allTransactions.filter(transaction => {
    // Date filter
    if (!isWithinDateRange(transaction.createdAt, periodFilter)) {
      return false;
    }

    // Payment method filter
    if (paymentFilter !== 'all' && transaction.paymentMethod?.toLowerCase() !== paymentFilter.toLowerCase()) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        transaction.orderNumber?.toLowerCase().includes(query) ||
        transaction.customerName?.toLowerCase().includes(query) ||
        transaction.items?.some(item => item.name.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Calculate stats based on filtered transactions
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = filteredTransactions.length;
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate payment method summaries (cash and gcash only)
  const cashTransactions = filteredTransactions.filter(t => 
    t.paymentMethod?.toLowerCase() === 'cash'
  );
  const gcashTransactions = filteredTransactions.filter(t => 
    t.paymentMethod?.toLowerCase() === 'gcash'
  );

  const cashTotal = cashTransactions.reduce((sum, t) => sum + t.total, 0);
  const gcashTotal = gcashTransactions.reduce((sum, t) => sum + t.total, 0);

  const cashCount = cashTransactions.length;
  const gcashCount = gcashTransactions.length;

  // Get today's date for stats
  const today = new Date().toDateString();
  const todayTransactions = filteredTransactions.filter(t => 
    new Date(t.createdAt).toDateString() === today
  );
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);

  // ============ Effects ============
  // Initial load
  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions(1, false);
    fetchSummary();
  }, []); // Only run once on mount

  // Refetch when period changes for summary
  useEffect(() => {
    fetchSummary();
  }, [periodFilter]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080';

    const socket = socketIO(SOCKET_URL, {
      auth: { userId: 'transactions-dashboard' },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Transactions socket connected:', socket.id);
      setIsLive(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Transactions socket disconnected');
      setIsLive(false);
    });

    // Listen for sales updates (from your POST endpoint)
    socket.on('sales:updated', () => {
      console.log('📊 Sales updated — refreshing transactions...');
      
      // Refresh both transactions and summary
      setCurrentPage(1);
      fetchTransactions(1, false);
      fetchSummary();
    });

    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected');
      setIsLive(true);
      fetchTransactions(1, false);
      fetchSummary();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-refresh every 60 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(1, false);
      fetchSummary();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // ============ Handlers ============
  const handleLoadMore = () => {
    if (currentPage < pagination.pages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchTransactions(nextPage, true);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchTransactions(1, false);
    fetchSummary();
  };

  // ============ Render ============
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header with Live Indicator */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Sales Transactions</h2>
              {/* Live Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-xs font-medium">{isLive ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              View and manage all sales transactions
              {lastUpdated && (
                <span className="text-xs ml-2">
                  • Updated: {formatDateTime(lastUpdated.toISOString())}
                </span>
              )}
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Overview - First Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '...' : formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTransactions} transactions
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '...' : formatCurrency(todayRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {todayTransactions.length} transactions today
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Transaction</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '...' : formatCurrency(avgOrderValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per transaction
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Summary Cards - Cash and GCASH only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Wallet className="h-4 w-4" /> Cash Sales
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {isLoading ? '...' : formatCurrency(cashTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cashCount} transactions
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" /> GCASH Sales
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {isLoading ? '...' : formatCurrency(gcashTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gcashCount} transactions
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number, customer, or product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Period Filter */}
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm min-w-[130px]"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last 12 Months</option>
                </select>

                {/* Payment Method Filter - Cash and GCASH only */}
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm min-w-[130px]"
                >
                  <option value="all">All Payments</option>
                  <option value="cash">Cash Only</option>
                  <option value="gcash">GCASH Only</option>
                </select>
              </div>
            </div>

            {/* Active filters summary */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Showing: </span>
              {periodFilter !== 'all' && (
                <span className="text-xs bg-secondary px-2 py-1 rounded">
                  {periodFilter === 'today' ? 'Today' : 
                   periodFilter === 'week' ? 'Last 7 days' :
                   periodFilter === 'month' ? 'Last 30 days' :
                   'Last 12 months'}
                </span>
              )}
              {paymentFilter !== 'all' && (
                <span className="text-xs bg-secondary px-2 py-1 rounded capitalize">
                  {paymentFilter} only
                </span>
              )}
              {searchQuery && (
                <span className="text-xs bg-secondary px-2 py-1 rounded">
                  Search: "{searchQuery}"
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10">
            <CardContent className="py-4">
              <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No transactions found</p>
                <p className="text-sm mt-2">Try adjusting your filters or create a new sale</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">Order #</th>
                        <th className="text-left p-3 text-sm font-medium">Customer</th>
                        <th className="text-left p-3 text-sm font-medium">Items</th>
                        <th className="text-left p-3 text-sm font-medium">Products</th>
                        <th className="text-left p-3 text-sm font-medium">Total</th>
                        <th className="text-left p-3 text-sm font-medium">Payment</th>
                        <th className="text-left p-3 text-sm font-medium">Type</th>
                        <th className="text-left p-3 text-sm font-medium">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction._id} className="border-b hover:bg-secondary/50">
                          <td className="p-3">
                            <div className="font-medium font-mono text-xs">
                              {transaction.orderNumber}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{transaction.customerName || 'Walk-in Customer'}</div>
                          </td>
                          <td className="p-3">
                            {getItemCount(transaction)} items
                          </td>
                          <td className="p-3">
                            <div className="text-sm truncate max-w-[200px]" title={getProductNames(transaction)}>
                              {getProductNames(transaction)}
                            </div>
                          </td>
                          <td className="p-3 font-semibold">
                            {formatCurrency(transaction.total)}
                          </td>
                          <td className="p-3">
                            <span className={`capitalize text-sm px-2 py-1 rounded-full ${
                              transaction.paymentMethod?.toLowerCase() === 'cash' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : transaction.paymentMethod?.toLowerCase() === 'gcash'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {transaction.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="capitalize text-sm">
                              {transaction.orderType || 'takeaway'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">{formatDateTime(transaction.createdAt)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length} of {pagination.total} transactions
                  </div>
                  
                  {currentPage < pagination.pages && (
                    <Button 
                      variant="outline" 
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Debug Info - Remove in production */}
        <div className="mt-4 text-xs text-muted-foreground">
          <details>
            <summary>Debug Info</summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
              {JSON.stringify({
                totalTransactions: pagination.total,
                displayedTransactions: filteredTransactions.length,
                currentPage,
                totalPages: pagination.pages,
                filters: { 
                  period: periodFilter, 
                  payment: paymentFilter,
                  search: searchQuery 
                },
                paymentSummary: {
                  cash: { total: cashTotal, count: cashCount },
                  gcash: { total: gcashTotal, count: gcashCount }
                },
                socketConnected: isLive
              }, null, 2)}
            </pre>
          </details>
        </div>
      </main>
    </div>
  );
}