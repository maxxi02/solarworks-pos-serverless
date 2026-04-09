"use client";

import { useState, useEffect } from "react";
import {
  Search,
  TrendingUp,
  Clock,
  Calendar,
  RefreshCw,
  Wallet,
  CreditCard,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Receipt,
} from "lucide-react";
import { useSocket } from "@/provider/socket-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ============ Types ============
type PeriodFilter = "all" | "today" | "week" | "month" | "year";
type PaymentFilter = "all" | "cash" | "gcash";

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
  status?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  subtotal?: number;
  discount?: number;
  discountTotal?: number;
  amountPaid?: number;
  change?: number;
  splitPayment?: { cash: number; gcash: number };
}

interface UnifiedStats {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
  cashSales: number;
  gcashSales: number;
  splitSales: number;
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
    stats?: UnifiedStats;
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
    daily: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    paymentMethods: Array<{
      _id: string;
      total: number;
      count: number;
    }>;
    recentTransactions: Transaction[];
  };
  error?: string;
}

// ============ Utils ============
const formatCurrency = (value: number = 0): string => {
  return `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
  if (!transaction?.items || !Array.isArray(transaction.items))
    return "No items";
  return transaction.items.map((item) => item.name).join(", ");
};

// Date filter function
const isWithinDateRange = (date: string, filter: PeriodFilter): boolean => {
  if (filter === "all") return true;

  const transactionDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today": {
      return transactionDate >= today;
    }
    case "week": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return transactionDate >= weekAgo;
    }
    case "month": {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return transactionDate >= monthAgo;
    }
    case "year": {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(15);

  // Data states
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [unifiedStats, setUnifiedStats] = useState<UnifiedStats>({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    cashSales: 0,
    gcashSales: 0,
    splitSales: 0,
  });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Refunded transactions
  const [refundedTransactions, setRefundedTransactions] = useState<
    Transaction[]
  >([]);
  const [refundedLoading, setRefundedLoading] = useState(false);
  const [showRefundedTable, setShowRefundedTable] = useState(false);

  // Modal states
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Socket connection
  const { socket, isConnected: isLive } = useSocket();

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
        page: page.toString(),
        paymentMethod: paymentFilter,
        search: searchQuery,
      });

      // Map periodFilter to date range if necessary
      if (periodFilter !== "all") {
        const now = new Date();
        let startDate = new Date();
        switch (periodFilter) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case "year":
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        params.append("startDate", startDate.toISOString());
      }

      const url = `/api/payments?${params.toString()}`;

      const response = await fetch(url);
      const result: PaymentsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch transactions");
      }

      if (result.data?.payments) {
        setAllTransactions((prev) =>
          append ? [...prev, ...result.data!.payments] : result.data!.payments,
        );
      }

      if (result.data?.pagination) {
        setPagination({
          total: result.data.pagination.total,
          pages: result.data.pagination.pages,
        });
      }

      // Update stats from the unified API response (includes portal + POS)
      if (result.data?.stats && !append) {
        setUnifiedStats(result.data.stats);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Failed to load transactions. Please try again.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // NOTE: summary stats are now derived from the unified /api/payments response
  // which includes both POS payments and paid portal orders.
  // No separate fetchSummary needed.

  const fetchRefunded = async () => {
    setRefundedLoading(true);
    try {
      const res = await fetch(`/api/payments?status=refunded&limit=100&page=1`);
      const json = await res.json();
      if (json.success) setRefundedTransactions(json.data?.payments ?? []);
    } catch {
      // ignore
    } finally {
      setRefundedLoading(false);
    }
  };

  // ============ Effects ============
  // Initial load
  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions(1, false);
    fetchRefunded();
  }, [periodFilter, paymentFilter, searchQuery]); // Refetch when filters change

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleSalesUpdated = () => {
      setCurrentPage(1);
      fetchTransactions(1, false);
    };

    socket.on("sales:updated", handleSalesUpdated);

    return () => {
      socket.off("sales:updated", handleSalesUpdated);
    };
  }, [socket]);

  // Auto-refresh every 60 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(1, false);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Stats derived directly from the unified /api/payments response (POS + Portal)
  const totalRevenue = unifiedStats.totalSales;
  const totalTransactionsCount = unifiedStats.totalTransactions;
  const avgOrderValue = unifiedStats.averageTransaction;
  const cashTotal = unifiedStats.cashSales;
  const gcashTotal = unifiedStats.gcashSales;

  // Cash & GCash counts — compute from current page transactions as approximation
  const cashCount = allTransactions.filter(
    (t) => (t.paymentMethod || "").toLowerCase() === "cash",
  ).length;
  const gcashCount = allTransactions.filter(
    (t) => (t.paymentMethod || "").toLowerCase() === "gcash",
  ).length;

  // Today's revenue — filter from all transactions on client side
  const todayRevenue = periodFilter === "today"
    ? totalRevenue
    : allTransactions
        .filter((t) => {
          const d = new Date(t.createdAt);
          const today = new Date();
          return d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
        })
        .reduce((s, t) => s + (t.total || 0), 0);

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
    fetchRefunded();
  };

  // ============ Render ============
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header with Live Indicator */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Sales Transactions
              </h2>
              {/* Live Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary">
                <span
                  className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-red-400"}`}
                />
                <span className="text-xs font-medium">
                  {isLive ? "LIVE" : "OFFLINE"}
                </span>
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
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Refreshing..." : "Refresh"}
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
                    {isLoading ? "..." : formatCurrency(totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTransactionsCount} transactions
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
                    {isLoading ? "..." : formatCurrency(todayRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {allTransactions.filter((t) => {
                      const d = new Date(t.createdAt);
                      const today = new Date();
                      return d.getFullYear() === today.getFullYear() &&
                        d.getMonth() === today.getMonth() &&
                        d.getDate() === today.getDate();
                    }).length}{" "}
                    transactions today
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
                  <p className="text-sm text-muted-foreground">
                    Avg Transaction
                  </p>
                  <p className="text-2xl font-bold">
                    {isLoading ? "..." : formatCurrency(avgOrderValue)}
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
                    {isLoading ? "..." : formatCurrency(cashTotal)}
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
                    {isLoading ? "..." : formatCurrency(gcashTotal)}
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

        {/* Refunded Transactions */}
        {(refundedTransactions.length > 0 || refundedLoading) && (
          <div className="mb-6 border border-orange-300 dark:border-orange-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRefundedTable((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-full bg-orange-200 dark:bg-orange-800">
                  <AlertCircle className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    {refundedLoading
                      ? "Loading..."
                      : `${refundedTransactions.length} Refunded Transaction${refundedTransactions.length !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Total refunded:{" "}
                    {formatCurrency(
                      refundedTransactions.reduce(
                        (s, t) => s + (t.total || 0),
                        0,
                      ),
                    )}
                  </p>
                </div>
              </div>
              {showRefundedTable ? (
                <ChevronUp className="h-4 w-4 text-orange-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-orange-600" />
              )}
            </button>

            {showRefundedTable && (
              <div className="overflow-x-auto bg-background border-t border-orange-200 dark:border-orange-800">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50/60 dark:bg-orange-900/10">
                    <tr className="border-b border-orange-200 dark:border-orange-800">
                      {[
                        "Order #",
                        "Customer",
                        "Amount",
                        "Refunded By",
                        "Refunded At",
                        "Reason",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 font-medium text-orange-800 dark:text-orange-300"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {refundedTransactions.map((t) => (
                      <tr
                        key={t._id}
                        className="border-b border-border hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium">
                          {t.orderNumber}
                        </td>
                        <td className="px-4 py-3">
                          {t.customerName || "Walk-in"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-orange-700 dark:text-orange-400">
                          {formatCurrency(t.total)}
                        </td>
                        <td className="px-4 py-3">{t.refundedBy || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.refundedAt ? formatDateTime(t.refundedAt) : "—"}
                        </td>
                        <td
                          className="px-4 py-3 text-muted-foreground max-w-[200px] truncate"
                          title={t.refundReason}
                        >
                          {t.refundReason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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
                  onChange={(e) =>
                    setPeriodFilter(e.target.value as PeriodFilter)
                  }
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
                  onChange={(e) =>
                    setPaymentFilter(e.target.value as PaymentFilter)
                  }
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
              {periodFilter !== "all" && (
                <span className="text-xs bg-secondary px-2 py-1 rounded">
                  {periodFilter === "today"
                    ? "Today"
                    : periodFilter === "week"
                      ? "Last 7 days"
                      : periodFilter === "month"
                        ? "Last 30 days"
                        : "Last 12 months"}
                </span>
              )}
              {paymentFilter !== "all" && (
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
              <p className="text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
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
            ) : allTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No transactions found</p>
                <p className="text-sm mt-2">
                  Try adjusting your filters or create a new sale
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">
                          Order #
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Customer
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Items
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Products
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Total
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Payment
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Type
                        </th>
                        <th className="text-left p-3 text-sm font-medium">
                          Date & Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransactions.map((transaction) => (
                        <tr
                          key={transaction._id}
                          onClick={() => { setSelectedTransaction(transaction); setShowDetailsModal(true); }}
                          className="border-b hover:bg-secondary/50 cursor-pointer transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-medium font-mono text-xs">
                              {transaction.orderNumber}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium">
                              {transaction.customerName || "Walk-in Customer"}
                            </div>
                          </td>
                          <td className="p-3">
                            {getItemCount(transaction)} items
                          </td>
                          <td className="p-3">
                            <div
                              className="text-sm truncate max-w-[200px]"
                              title={getProductNames(transaction)}
                            >
                              {getProductNames(transaction)}
                            </div>
                          </td>
                          <td className="p-3 font-semibold">
                            {formatCurrency(transaction.total)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`capitalize text-sm px-2 py-1 rounded-full ${
                                transaction.paymentMethod?.toLowerCase() ===
                                "cash"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : transaction.paymentMethod?.toLowerCase() ===
                                      "gcash"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {transaction.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="capitalize text-sm">
                              {transaction.orderType || "takeaway"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {formatDateTime(transaction.createdAt)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {allTransactions.length} of {pagination.total}{" "}
                    transactions
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
                        "Load More"
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        {showDetailsModal && selectedTransaction && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Transaction Details
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTransaction.orderNumber}</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 p-2 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Date</p>
                      <p className="text-sm font-semibold">{formatDateTime(selectedTransaction.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Type</p>
                      <p className="text-sm font-semibold capitalize">
                        {selectedTransaction.orderType || "takeaway"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Customer</p>
                      <p className="text-sm font-semibold">{selectedTransaction.customerName || "Walk-in"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Status</p>
                      <p className="text-sm font-semibold capitalize">{selectedTransaction.status || "completed"}</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Order Items</h3>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="divide-y divide-border">
                        {selectedTransaction.items?.map((item, i) => (
                          <div key={i} className="p-3 flex justify-between items-center bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{item.name}</span>
                              <span className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatCurrency(item.price)}</span>
                            </div>
                            <span className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-muted/30 p-5 rounded-lg border border-border/50 space-y-3">
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(selectedTransaction.subtotal || selectedTransaction.total)}</span>
                    </div>
                    {(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0) > 0 && (
                      <div className="flex justify-between text-sm items-center text-green-600 dark:text-green-400">
                        <span>Discount:</span>
                        <span className="font-semibold border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                          -{formatCurrency(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border/60 my-3" />
                    <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/20">
                      <span className="font-bold text-lg text-primary">TOTAL:</span>
                      <span className="font-black text-2xl text-primary">{formatCurrency(selectedTransaction.total)}</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="border border-border rounded-lg p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Payment Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="font-bold capitalize bg-secondary px-3 py-1 rounded-full text-foreground">
                          {selectedTransaction.paymentMethod || "cash"}
                        </span>
                      </div>
                      
                      {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.amountPaid != null && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount Received:</span>
                            <span className="font-semibold">{formatCurrency(selectedTransaction.amountPaid)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-dashed border-border pt-2 mt-2">
                            <span className="font-bold">Change:</span>
                            <span className="font-bold text-green-600">{formatCurrency(selectedTransaction.change || 0)}</span>
                          </div>
                        </>
                      )}
                      
                      {selectedTransaction.paymentMethod === 'split' && selectedTransaction.splitPayment && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cash Portion:</span>
                            <span className="font-semibold">{formatCurrency(selectedTransaction.splitPayment.cash)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">GCash Portion:</span>
                            <span className="font-semibold">{formatCurrency(selectedTransaction.splitPayment.gcash)}</span>
                          </div>
                          <div className="border-t border-dashed border-border my-2 pt-2" />
                          <div className="flex justify-between text-sm">
                            <span className="font-bold">Total Paid:</span>
                            <span className="font-bold">
                              {formatCurrency(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                <div className="mt-8">
                  <Button onClick={() => setShowDetailsModal(false)} className="w-full h-12 text-base font-semibold" variant="outline">
                    Close Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
