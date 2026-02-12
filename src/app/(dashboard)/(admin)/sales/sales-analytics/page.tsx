'use client';

import { useState } from 'react';
import { TrendingUp, Users, Clock, Download, Star } from 'lucide-react';
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
  TooltipProps,
  ReferenceLine
} from 'recharts';

// Types
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
  category: string;
}

type ChartType = 'line' | 'bar' | 'area';
type MetricColor = 'blue' | 'green' | 'purple' | 'amber' | 'pink';

// Constants
const COLORS = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
} as const;

const TARGET_REVENUE = 11000;
const REFERENCE_LINES = [
  { value: 11000, label: 'Target ₱11k', color: COLORS.danger },
  { value: 15000, label: '₱15,000', color: COLORS.warning },
  { value: 18000, label: '₱18,000', color: COLORS.success },
];

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: DailySales;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const revenue = payload[0].value;
  const difference = revenue - TARGET_REVENUE;

  return (
    <div className="bg-white dark:bg-gray-900 border rounded-lg p-3 shadow-lg">
      <p className="font-semibold mb-2">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Revenue:</span>
          <span className="font-bold">₱{revenue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Transactions:</span>
          <span className="font-bold">{payload[0].payload.transactions}</span>
        </div>
        <div className="pt-2 border-t">
          <div className={`text-sm font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {difference >= 0 ? '✓ Above target' : '✗ Below target'} 
            <span className="ml-2">₱{Math.abs(difference).toLocaleString()}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Target: ₱{TARGET_REVENUE.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: MetricColor;
}

function MetricCard({ title, value, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400'
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400'
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400'
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/20',
      text: 'text-pink-600 dark:text-pink-400'
    }
  };

  const { bg, text } = colorClasses[color];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${bg}`}>
            <div className={`h-6 w-6 ${text}`}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Chart Renderer Component
interface ChartRendererProps {
  chartType: ChartType;
  data: DailySales[];
}

function ChartRenderer({ chartType, data }: ChartRendererProps) {
  const chartProps = {
    data,
    margin: { top: 10, right: 30, left: 0, bottom: 0 }
  };

  const referenceLines = REFERENCE_LINES.map((line, index) => (
    <ReferenceLine
      key={`${line.value}-${index}`}
      y={line.value}
      stroke={line.color}
      strokeDasharray="3 3"
      label={{ value: line.label, position: 'right' }}
    />
  ));

  const commonElements = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="date" stroke="#666" />
      <YAxis 
        stroke="#666"
        tickFormatter={(value: number) => `₱${value.toLocaleString()}`}
      />
      <Tooltip content={<CustomTooltip />} />
      <Legend />
      {referenceLines}
    </>
  );

  switch (chartType) {
    case 'line':
      return (
        <LineChart {...chartProps}>
          {commonElements}
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke={COLORS.primary} 
            strokeWidth={3}
            dot={{ 
              r: 6,
              fill: COLORS.primary,
              stroke: '#fff',
              strokeWidth: 2
            }}
            activeDot={{ 
              r: 8,
              stroke: '#fff',
              strokeWidth: 3 
            }}
          />
        </LineChart>
      );
    case 'bar':
      return (
        <BarChart {...chartProps}>
          {commonElements}
          <Bar 
            dataKey="revenue" 
            fill={COLORS.primary} 
            radius={[4, 4, 0, 0]} 
            fillOpacity={0.8}
          />
        </BarChart>
      );
    case 'area':
      return (
        <AreaChart {...chartProps}>
          {commonElements}
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke={COLORS.primary} 
            fill={COLORS.primary} 
            fillOpacity={0.3} 
            strokeWidth={2}
          />
        </AreaChart>
      );
  }
}

// Sales Analytics Page
interface SalesAnalyticsPageProps {
  dailySales?: DailySales[];
  topProducts?: TopProduct[];
}

export default function SalesAnalyticsPage({ 
  dailySales = [],
  topProducts = [] 
}: SalesAnalyticsPageProps) {
  const [chartType, setChartType] = useState<ChartType>('line');

  // Calculate metrics
  const totalRevenue = dailySales.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = dailySales.reduce((sum, day) => sum + day.transactions, 0);
  const avgOrderValue = Math.round(totalRevenue / totalTransactions);
  const bestSeller = topProducts.reduce((max, product) => 
    product.revenue > max.revenue ? product : topProducts[0], 
    topProducts[0] || { name: '', revenue: 0 }
  );

  // Helper function to get rank styling
  const getRankStyle = (index: number) => {
    const styles = [
      'bg-amber-100 text-amber-700',
      'bg-gray-100 text-gray-700', 
      'bg-green-100 text-green-700',
      'bg-blue-100 text-blue-700'
    ];
    return styles[Math.min(index, 3)];
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <main className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <p className="text-muted-foreground">Daily sales performance & best sellers</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Revenue"
            value={`₱${totalRevenue.toLocaleString()}`}
            icon={<TrendingUp />}
            color="blue"
          />
          <MetricCard
            title="Total Transactions"
            value={totalTransactions.toString()}
            icon={<Users />}
            color="green"
          />
          <MetricCard
            title="Avg Order Value"
            value={`₱${avgOrderValue}`}
            icon={<Clock />}
            color="purple"
          />
          <MetricCard
            title="Best Seller"
            value={bestSeller.name.split(' ')[0] || 'N/A'}
            icon={<Star />}
            color="pink"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Sales Chart */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Daily Sales Trend</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span className="text-xs">₱{TARGET_REVENUE.toLocaleString()} Target</span>
                  </div>
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
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ChartRenderer chartType={chartType} data={dailySales} />
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {REFERENCE_LINES.map((line) => (
                  <div key={line.value} className="flex items-center gap-2">
                    <div className="w-3 h-0.5" style={{ backgroundColor: line.color }}></div>
                    <span className="text-xs">{line.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Sellers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRankStyle(index)}`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">₱{product.revenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{product.quantity} units</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Best Seller Highlight */}
              {bestSeller.name && (
                <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-pink-500" />
                        <h3 className="font-bold text-lg">Best Seller</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Highest revenue generator</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-2xl text-pink-600">{bestSeller.name}</div>
                      <div className="text-sm">₱{bestSeller.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Daily Performance vs Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-4">
              {dailySales.map((day) => {
                const aboveTarget = day.revenue > TARGET_REVENUE;
                const difference = day.revenue - TARGET_REVENUE;
                
                return (
                  <div key={day.date} className="text-center">
                    <div className="font-semibold text-sm mb-2">{day.date}</div>
                    <div className={`text-lg font-bold p-3 rounded-lg ${
                      aboveTarget ? 'bg-green-50 text-green-700 border border-green-200' : 
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      ₱{(day.revenue / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {day.transactions} transactions
                    </div>
                    <div className={`text-xs font-medium mt-1 ${aboveTarget ? 'text-green-600' : 'text-red-600'}`}>
                      {aboveTarget ? `+₱${difference.toLocaleString()}` : `-₱${Math.abs(difference).toLocaleString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Product Performance Details */}
        {topProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Rank</th>
                      <th className="text-left p-3 text-sm font-medium">Product</th>
                      <th className="text-left p-3 text-sm font-medium">Category</th>
                      <th className="text-left p-3 text-sm font-medium">Units Sold</th>
                      <th className="text-left p-3 text-sm font-medium">Revenue</th>
                      <th className="text-left p-3 text-sm font-medium">Avg Daily</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={product.name} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="p-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getRankStyle(index)}`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-3 font-medium">{product.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold">{product.quantity}</td>
                        <td className="p-3 font-bold text-primary">₱{product.revenue.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="font-semibold">
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
        )}
      </main>
    </div>
  );
}