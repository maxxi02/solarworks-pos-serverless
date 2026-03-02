'use client';

import { useState, useEffect, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import { TrendingUp, Users, Clock, Star, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ============ Types ============
type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';

interface DailyData {
  date: string;
  revenue: number;
  transactions?: number;
}

interface PaymentMethodData {
  _id: string;
  total: number;
  count: number;
}

interface ProductData {
  name: string;
  category?: string;
  quantity: number;
  revenue: number;
}

interface TransactionItem {
  quantity: number;
  price?: number;
  name?: string;
}

interface Transaction {
  _id?: string;
  orderNumber?: string;
  createdAt: string;
  customerName?: string;
  items?: TransactionItem[] | number;
  itemsCount?: number;
  total?: number;
  paymentMethod?: string;
  orderType?: string;
}

interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgOrderValue: number;
}

interface SalesData {
  period: string;
  dateRange: {
    from: string;
    to: string;
  };
  summary: SalesSummary;
  daily: DailyData[];
  topProducts: ProductData[];
  paymentMethods: PaymentMethodData[];
  recentTransactions: Transaction[];
  totalCount: number;
}

interface ApiResponse {
  success: boolean;
  data?: SalesData;
  error?: string;
  details?: string;
}

// ============ Constants ============
const COLORS = {
  primary: '#3b82f6',
  cash: '#10b981',
  gcash: '#8b5cf6',
  split: '#f59e0b'
} as const;

// ============ Utils ============
const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';

  try {
    let date: Date;
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    } else {
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return dateStr;
    }

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
  if (!transaction) return 0;

  if (Array.isArray(transaction.items)) {
    return transaction.items.reduce((sum: number, item: TransactionItem) => {
      return sum + (item?.quantity || 0);
    }, 0);
  }

  if (typeof transaction.items === 'number') {
    return transaction.items;
  }

  if (transaction.itemsCount) {
    return transaction.itemsCount;
  }

  return 0;
};

// ============ Main Component ============
export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Toggle for showing/hiding line sa chart
  const [showLine, setShowLine] = useState(true);

  // Socket connection state
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchSalesData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/payments/summary?period=${period}&_=${Date.now()}`;
      console.log('Fetching from:', url);

      const response = await fetch(url);
      const result: ApiResponse = await response.json();

      console.log('API Response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      if (result.data) {
        setSalesData(result.data);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError('Failed to load sales analytics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://rendezvous-server-gpmv.onrender.com';

    const socket = socketIO(SOCKET_URL, {
      auth: { userId: 'analytics-dashboard' },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsLive(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsLive(false);
    });

    // 🔥 Re-fetch whenever a new sale is completed
    socket.on('sales:updated', () => {
      console.log('📊 Sales updated — refreshing...');
      fetchSalesData();
    });

    // Handle reconnection
    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected');
      setIsLive(true);
      fetchSalesData(); // Refresh data on reconnect
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      setIsLive(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - runs once on mount

  // Auto-refresh every 30 seconds as fallback
  useEffect(() => {
    fetchSalesData();

    const interval = setInterval(() => {
      fetchSalesData();
    }, 30000);

    return () => clearInterval(interval);
  }, [period]);

  if (isLoading && !salesData) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sales analytics from database...</p>
        </div>
      </div>
    );
  }

  if (error || !salesData) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error || 'No data available'}</p>
            <Button onClick={fetchSalesData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safe data extraction with defaults
  const summary = salesData?.summary || {
    totalRevenue: 0,
    totalTransactions: 0,
    avgOrderValue: 0
  };

  // Process daily data to ensure correct dates
  const daily = Array.isArray(salesData?.daily)
    ? [...salesData.daily].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    : [];

  const topProducts = Array.isArray(salesData?.topProducts) ? salesData.topProducts : [];
  const paymentMethods = Array.isArray(salesData?.paymentMethods) ? salesData.paymentMethods : [];
  const recentTransactions = Array.isArray(salesData?.recentTransactions) ? salesData.recentTransactions : [];

  const hasData = summary.totalTransactions > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <main className="max-w-7xl mx-auto">
        {/* Header with Last Updated and Live Indicator */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <div className="flex items-center gap-2 mt-1">
              {/* Live Indicator */}
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
              <p className="text-muted-foreground text-xs">
                {isLive ? 'Live' : 'Reconnecting...'}
              </p>
              <span className="text-xs text-muted-foreground">
                • Last updated: {formatDateTime(lastUpdated.toISOString())}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasData
                ? `${summary.totalTransactions} transactions found`
                : 'No transactions for selected period'}
            </p>
            {salesData?.dateRange && (
              <p className="text-xs text-muted-foreground mt-1">
                Period: {formatDate(salesData.dateRange.from)} - {formatDate(salesData.dateRange.to)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="px-3 py-2 border rounded-lg text-sm bg-background"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 12 Months</option>
              <option value="all">All Time</option>
            </select>

            <Button
              variant="outline"
              onClick={fetchSalesData}
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {!hasData ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Sales Data Yet</h3>
              <p className="text-muted-foreground">
                Complete transactions in the POS system to see analytics here.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  // Test data for development
                  console.log('Current payments in DB:', salesData);
                }}
              >
                Check Database
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(summary.totalRevenue || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Transactions</p>
                      <p className="text-2xl font-bold mt-1">
                        {summary.totalTransactions || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Order</p>
                      <p className="text-2xl font-bold mt-1">
                        {formatCurrency(summary.avgOrderValue || 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Top Product</p>
                      <p className="text-2xl font-bold mt-1 truncate max-w-[150px]">
                        {topProducts[0]?.name?.split(' ')[0] || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
                      <Star className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Daily Sales Chart - LINE CHART ONLY */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Daily Sales Trend</CardTitle>
                    <div className="flex items-center gap-4">
                      {/* Line Toggle Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLine(!showLine)}
                        className="h-8 gap-1"
                      >
                        {showLine ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span className="text-xs">Hide Line</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-xs">Show Line</span>
                          </>
                        )}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {daily.length > 0 && `${formatDate(daily[0]?.date)} - ${formatDate(daily[daily.length - 1]?.date)}`}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div style={{ width: '100%', height: '320px' }}>
                    <ResponsiveContainer>
                      <LineChart data={daily} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tickFormatter={(v) => `₱${(v || 0) / 1000}k`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value || 0)}
                          labelFormatter={formatDate}
                        />
                        <Legend />

                        {/* Conditionally render line based on showLine state */}
                        {showLine ? (
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke={COLORS.primary}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Revenue"
                          />
                        ) : (
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="transparent"
                            dot={{ r: 4, fill: COLORS.primary }}
                            activeDot={{ r: 6, fill: COLORS.primary }}
                            name="Revenue"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length > 0 ? (
                    <>
                      <div style={{ width: '100%', height: '260px' }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={paymentMethods}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="total"
                              label={({ _id, percent }) =>
                                `${_id || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                              }
                            >
                              {paymentMethods.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[entry._id as keyof typeof COLORS] || COLORS.primary}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value || 0)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-2">
                        {paymentMethods.map((method) => (
                          <div key={method._id} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: COLORS[method._id as keyof typeof COLORS] || COLORS.primary
                                }}
                              />
                              <span className="text-sm capitalize">{method._id || 'Unknown'}</span>
                            </div>
                            <div className="text-sm font-medium">
                              {formatCurrency(method.total || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Products */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.name || index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                                index === 2 ? 'bg-green-100 text-green-700' :
                                  'bg-blue-100 text-blue-700'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{product.name || 'Unknown Product'}</div>
                            <div className="text-xs text-muted-foreground">{product.category || 'Uncategorized'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-bold">{product.quantity || 0} units</div>
                            <div className="text-xs text-muted-foreground">sold</div>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <div className="font-bold text-primary">{formatCurrency(product.revenue || 0)}</div>
                            <div className="text-xs text-muted-foreground">revenue</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No product data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Order #</th>
                          <th className="text-left p-3 text-sm font-medium">Date & Time</th>
                          <th className="text-left p-3 text-sm font-medium">Customer</th>
                          <th className="text-right p-3 text-sm font-medium">Items</th>
                          <th className="text-right p-3 text-sm font-medium">Total</th>
                          <th className="text-left p-3 text-sm font-medium">Payment</th>
                          <th className="text-left p-3 text-sm font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((transaction) => (
                          <tr key={transaction._id || transaction.orderNumber} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="p-3 font-mono text-xs">{transaction.orderNumber || 'N/A'}</td>
                            <td className="p-3 text-sm">{formatDateTime(transaction.createdAt)}</td>
                            <td className="p-3 text-sm">{transaction.customerName || 'Walk-in Customer'}</td>
                            <td className="p-3 text-right text-sm">
                              {getItemCount(transaction)}
                            </td>
                            <td className="p-3 text-right font-bold text-primary">
                              {formatCurrency(transaction.total || 0)}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full capitalize">
                                {transaction.paymentMethod || 'cash'}
                              </span>
                            </td>
                            <td className="p-3 text-sm capitalize">{transaction.orderType || 'takeaway'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent transactions
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Debug Info - Remove in production */}
            <div className="mt-4 text-xs text-muted-foreground">
              <details>
                <summary>Debug Info</summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                  {JSON.stringify({
                    period,
                    totalTransactions: summary.totalTransactions,
                    dailyCount: daily.length,
                    productsCount: topProducts.length,
                    methodsCount: paymentMethods.length,
                    recentCount: recentTransactions.length,
                    socketConnected: isLive
                  }, null, 2)}
                </pre>
              </details>
            </div>
          </>
        )}
      </main>
    </div>
  );
}