'use client';

import { useState } from 'react';
import { TrendingUp, Users, Coffee, Clock, Calendar, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Sales data types
interface DailySales {
  date: string;
  revenue: number;
  transactions: number;
  avgOrder: number;
}

interface TopProduct {
  name: string;
  sales: number;
  quantity: number;
  revenue: number;
}

interface CategorySales {
  category: string;
  revenue: number;
  percentage: number;
}

// Time range type
type TimeRangeType = 'week' | 'month' | 'quarter';

export default function SalesAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRangeType>('week');

  // Sample data
  const dailySales: DailySales[] = [
    { date: 'Mon', revenue: 12500, transactions: 45, avgOrder: 278 },
    { date: 'Tue', revenue: 14200, transactions: 52, avgOrder: 273 },
    { date: 'Wed', revenue: 11800, transactions: 48, avgOrder: 246 },
    { date: 'Thu', revenue: 16500, transactions: 58, avgOrder: 284 },
    { date: 'Fri', revenue: 18900, transactions: 65, avgOrder: 291 },
    { date: 'Sat', revenue: 21000, transactions: 72, avgOrder: 292 },
    { date: 'Sun', revenue: 19500, transactions: 68, avgOrder: 287 },
  ];

  const topProducts: TopProduct[] = [
    { name: 'Iced Coffee Jelly', sales: 42, quantity: 126, revenue: 21420 },
    { name: 'Spanish Latte', sales: 38, quantity: 114, revenue: 17100 },
    { name: 'Matcha Sea Foam', sales: 35, quantity: 105, revenue: 18795 },
    { name: 'Jumbo! Hungarian Susilog', sales: 28, quantity: 84, revenue: 16380 },
    { name: 'Caramel Macchiato', sales: 25, quantity: 75, revenue: 11925 },
  ];

  const categorySales: CategorySales[] = [
    { category: 'Espresso', revenue: 52500, percentage: 35 },
    { category: 'Specials', revenue: 32000, percentage: 21 },
    { category: 'Breakfast', revenue: 29500, percentage: 20 },
    { category: 'Snacks', revenue: 18500, percentage: 12 },
    { category: 'Frappe', revenue: 9500, percentage: 6 },
    { category: 'Others', revenue: 8000, percentage: 6 },
  ];

  // Calculate totals
  const totalRevenue = dailySales.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = dailySales.reduce((sum, day) => sum + day.transactions, 0);
  const avgRevenuePerDay = Math.round(totalRevenue / dailySales.length);
  const avgTransactionsPerDay = Math.round(totalTransactions / dailySales.length);

  // Find peak day
  const peakDay = dailySales.reduce((max, day) => day.revenue > max.revenue ? day : max, dailySales[0]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Sales Analytics</h2>
              <p className="text-muted-foreground">Key metrics and performance insights</p>
            </div>
            <div className="flex gap-2">
              <Select 
                value={timeRange} 
                onValueChange={(value: TimeRangeType) => setTimeRange(value)}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₱{totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">+12.5%</span>
                  </div>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">+8.2%</span>
                  </div>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Revenue/Day</p>
                  <p className="text-2xl font-bold">₱{avgRevenuePerDay.toLocaleString()}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    Peak: ₱{peakDay.revenue.toLocaleString()} ({peakDay.date})
                  </div>
                </div>
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">₱{Math.round(totalRevenue / totalTransactions)}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {avgTransactionsPerDay} transactions/day
                  </div>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailySales.map((day) => {
                  const maxRevenue = Math.max(...dailySales.map(d => d.revenue));
                  const percentage = (day.revenue / maxRevenue) * 80;
                  
                  return (
                    <div key={day.date} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{day.date}</span>
                        <span className="text-muted-foreground">
                          ₱{day.revenue.toLocaleString()} • {day.transactions} trans
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorySales.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">
                        ₱{cat.revenue.toLocaleString()} • {cat.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Product</th>
                    <th className="text-left p-3 text-sm font-medium">Units Sold</th>
                    <th className="text-left p-3 text-sm font-medium">Total Revenue</th>
                    <th className="text-left p-3 text-sm font-medium">Avg Daily</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={product.name} className="border-b hover:bg-secondary/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/20">
                            <Coffee className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">#{index + 1} Best Seller</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{product.quantity} units</div>
                        <div className="text-xs text-muted-foreground">{product.sales} transactions</div>
                      </td>
                      <td className="p-3 font-semibold">₱{product.revenue.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="text-sm">
                          ₱{Math.round(product.revenue / 7).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">per day</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}