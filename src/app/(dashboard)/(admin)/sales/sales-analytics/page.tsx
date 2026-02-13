'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Clock, Star, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';
type ChartType = 'line' | 'bar' | 'area';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cash: '#10b981',
  gcash: '#8b5cf6',
  split: '#f59e0b'
};

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSalesData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/payments/summary?period=${period}&_=${Date.now()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      setSalesData(result.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError('Failed to load sales analytics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 30 seconds para realtime
  useEffect(() => {
    fetchSalesData();
    
    const interval = setInterval(() => {
      fetchSalesData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [period]);

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    
    try {
      // Handle different date formats
      let date;
      if (dateStr.includes('T')) {
        date = new Date(dateStr);
      } else {
        // Format: YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      return date.toLocaleDateString('en-PH', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Safe function to get item count
  const getItemCount = (transaction: any) => {
    if (!transaction) return 0;
    
    if (Array.isArray(transaction.items)) {
      return transaction.items.reduce((sum: number, i: any) => {
        return sum + (i?.quantity || 0);
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
  
  // FIX: Process daily data to ensure correct dates
  let daily = Array.isArray(salesData?.daily) ? [...salesData.daily] : [];
  
  // Sort by date ascending
  daily.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const topProducts = Array.isArray(salesData?.topProducts) ? salesData.topProducts : [];
  const paymentMethods = Array.isArray(salesData?.paymentMethods) ? salesData.paymentMethods : [];
  const recentTransactions = Array.isArray(salesData?.recentTransactions) ? salesData.recentTransactions : [];
  
  const hasData = summary.totalTransactions > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <main className="max-w-7xl mx-auto">
        {/* Header with Last Updated */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">
                {hasData 
                  ? `${summary.totalTransactions} transactions found`
                  : 'No transactions for selected period'}
              </p>
              <span className="text-xs text-muted-foreground">
                • Last updated: {formatDateTime(lastUpdated.toISOString())}
              </span>
            </div>
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
              {/* Daily Sales Chart - FIXED DATE FORMAT */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Daily Sales Trend</CardTitle>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {daily.length > 0 && `${formatDate(daily[0]?.date)} - ${formatDate(daily[daily.length-1]?.date)}`}
                      </span>
                      <Tabs value={chartType} onValueChange={(v: string) => setChartType(v as ChartType)}>
                        <TabsList>
                          <TabsTrigger value="line">Line</TabsTrigger>
                          <TabsTrigger value="bar">Bar</TabsTrigger>
                          <TabsTrigger value="area">Area</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' && (
                        <LineChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tickFormatter={(v) => `₱${(v || 0)/1000}k`}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value || 0)}
                            labelFormatter={formatDate}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={COLORS.primary} 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Revenue"
                          />
                        </LineChart>
                      )}
                      {chartType === 'bar' && (
                        <BarChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tickFormatter={(v) => `₱${(v || 0)/1000}k`}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value || 0)}
                            labelFormatter={formatDate}
                          />
                          <Legend />
                          <Bar dataKey="revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
                      )}
                      {chartType === 'area' && (
                        <AreaChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={formatDate}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tickFormatter={(v) => `₱${(v || 0)/1000}k`}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value || 0)}
                            labelFormatter={formatDate}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={COLORS.primary} 
                            fill={COLORS.primary} 
                            fillOpacity={0.3} 
                            name="Revenue"
                          />
                        </AreaChart>
                      )}
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
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentMethods}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="total"
                              label={({ name, percent }) => 
                                `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                              }
                            >
                              {paymentMethods.map((entry: any, index: number) => (
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
                        {paymentMethods.map((method: any) => (
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
                    {topProducts.map((product: any, index: number) => (
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
                        {recentTransactions.map((transaction: any) => (
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
          </>
        )}
      </main>
    </div>
  );
}