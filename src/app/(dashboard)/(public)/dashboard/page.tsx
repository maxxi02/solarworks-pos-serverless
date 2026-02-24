'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart, Package, Users, TrendingUp, TrendingDown, RefreshCw,
  AlertTriangle, AlertCircle, CheckCircle, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  fetchInventory, 
  getLowStockAlerts, 
  getCriticalStockAlerts 
} from '@/lib/inventoryService';
import { useInventorySocket } from '@/hooks/useInventorySocket';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format-utils';

// Import the actual type from your types folder
import type { LowStockAlert } from '@/types';

// Types for our component
interface PaymentMethod {
  _id: string;
  total: number;
  count: number;
}

interface DailyData {
  date: string;
  revenue: number;
}

interface AttendanceRecord {
  _id: string;
  user?: {
    name: string;
    email: string;
    role?: string;
  };
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  hoursWorked?: number;
  status: string;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'quarter' | 'year';

const COLORS: Record<string, string> = {
  primary: '#3b82f6',
  cash: '#10b981',
  gcash: '#8b5cf6',
  split: '#f59e0b'
};

// Stat Card Component
function StatCard({ title, value, change, trend, icon, isCurrency, isLoading, alert }: any) {
  const getTrendIcon = (t: string) => 
    t === 'up' ? <TrendingUp className="h-4 w-4" /> : 
    t === 'down' ? <TrendingDown className="h-4 w-4" /> : null;
  
  const trendColor = trend === 'up' ? 'text-green-500' : 
                    trend === 'down' ? 'text-red-500' : 
                    trend === 'attention' ? 'text-amber-500' : 'text-muted-foreground';
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isCurrency ? (
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-lg font-bold text-green-600">₱</span>
          </div>
        ) : icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
        ) : (
          <>
            <div className={`text-2xl font-bold ${trend === 'attention' ? 'text-amber-500' : ''}`}>
              {value}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {getTrendIcon(trend)}
              <span className={trendColor}>{change}</span>
            </div>
            {alert && (
              <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
                {alert}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('week');

  // Sales State
  const [sales, setSales] = useState({
    today: 0,
    yesterday: 0,
    transactions: 0,
    daily: [] as DailyData[],
    methods: [] as PaymentMethod[]
  });
  
  // Inventory State
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [criticalStock, setCriticalStock] = useState<LowStockAlert[]>([]);
  const [invStats, setInvStats] = useState({
    total: 0,
    critical: 0,
    low: 0,
    warning: 0,
    value: 0,
    needRestock: 0
  });

  // Attendance State
  const [pending, setPending] = useState<AttendanceRecord[]>([]);

  // Socket
  useInventorySocket({ 
    userId: 'admin', 
    userName: 'Admin', 
    onInventoryAdjusted: loadInventoryData, 
    onItemCreated: loadInventoryData, 
    onItemDeleted: loadInventoryData 
  });

  // Load functions
  async function loadSalesData() {
    try {
      let periodParam = 'week';
      switch(period) {
        case 'day': periodParam = 'today'; break;
        case 'week': periodParam = 'week'; break;
        case 'month': periodParam = 'month'; break;
        case 'quarter': periodParam = 'quarter'; break;
        case 'year': periodParam = 'year'; break;
      }
      
      const res = await fetch(`/api/payments/summary?period=${periodParam}`);
      const d = await res.json();
      if (d.success && d.data) {
        const yesterday = d.data.daily.length > 1 ? d.data.daily[d.data.daily.length-2]?.revenue || 0 : 0;
        setSales({
          today: d.data.summary.totalRevenue,
          yesterday,
          transactions: d.data.summary.totalTransactions,
          daily: d.data.daily || [],
          methods: d.data.paymentMethods || []
        });
      }
    } catch (err) { 
      console.error('Sales error:', err); 
    }
  }

  async function loadInventoryData() {
    try {
      const data = await fetchInventory();
      setInventory(data);
      
      const low = await getLowStockAlerts();
      const crit = await getCriticalStockAlerts();
      
      console.log('Low stock alerts:', low);
      console.log('Critical alerts:', crit);
      
      setLowStock(low);
      setCriticalStock(crit);
      
      // Calculate stats
      const criticalCount = crit.length;
      const lowCount = low.filter((a: LowStockAlert) => a.status === 'low').length;
      const warningCount = low.filter((a: LowStockAlert) => a.status === 'warning').length;
      
      setInvStats({
        total: data.length,
        critical: criticalCount,
        low: lowCount,
        warning: warningCount,
        value: data.reduce((s, i) => s + (i.currentStock * (i.pricePerUnit || 0)), 0),
        needRestock: data.filter((i: any) => i.currentStock <= (i.reorderPoint || 0)).length
      });
    } catch (err) { 
      console.error('Inventory error:', err); 
    }
  }

  async function loadPendingData() {
    try {
      const res = await fetch('/api/attendance/admin/pending');
      const d = await res.json();
      if (d.success) setPending(d.records || []);
    } catch (err) { 
      console.error('Pending error:', err); 
    }
  }

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try { 
      await Promise.all([
        loadSalesData(), 
        loadInventoryData(), 
        loadPendingData()
      ]); 
    } catch (err) { 
      setError('Failed to load data'); 
    } finally { 
      setLoading(false); 
      setLastUpdated(new Date()); 
    }
  }

  useEffect(() => { 
    loadAllData(); 
    const i = setInterval(loadAllData, 60000); 
    return () => clearInterval(i); 
  }, [period]);

  const calculateTrend = (curr: number, prev: number) => {
    if (prev === 0) return { change: 'No data', trend: 'stable' as const };
    const p = ((curr - prev) / prev) * 100;
    return { 
      change: `${p > 0 ? '+' : ''}${p.toFixed(1)}%`, 
      trend: p > 5 ? 'up' as const : p < -5 ? 'down' as const : 'stable' as const 
    };
  };

  const stats = {
    sales: { value: formatCurrency(sales.today), ...calculateTrend(sales.today, sales.yesterday) },
    transactions: { value: sales.transactions.toString(), ...calculateTrend(sales.transactions, sales.transactions * 0.9) },
    lowStock: { 
      value: (invStats.critical + invStats.low).toString(), 
      change: `${invStats.critical} critical, ${invStats.low} low`, 
      trend: (invStats.critical + invStats.low) > 0 ? 'attention' as const : 'stable' as const,
      alert: invStats.critical > 0 ? `${invStats.critical} items critically low!` : undefined
    },
    staff: { 
      value: pending.length.toString(), 
      change: `${pending.length} pending`, 
      trend: pending.length > 0 ? 'attention' as const : 'stable' as const,
      alert: pending.length > 0 ? `${pending.length} attendance requests need review` : undefined
    }
  };

  const periodLabels = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year'
  };

  // Combine low stock and critical for display
  const allLowStockItems = [...lowStock, ...criticalStock];

  // Remove duplicates by itemId
  const uniqueLowStockItems = allLowStockItems.filter((item, index, self) => 
    index === self.findIndex((t) => t.itemId === item.itemId)
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Last updated: {formatDateTime(lastUpdated.toISOString())}</p>
          </div>
          <Button variant="outline" onClick={loadAllData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard 
            title="Today's Sales" 
            {...stats.sales} 
            isCurrency 
          />
          <StatCard 
            title="Transactions" 
            {...stats.transactions} 
            icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />} 
          />
          <StatCard 
            title="Low Stock" 
            {...stats.lowStock} 
            icon={<Package className="h-5 w-5 text-muted-foreground" />} 
          />
          <StatCard 
            title="Pending Attendance" 
            {...stats.staff} 
            icon={<Clock className="h-5 w-5 text-muted-foreground" />} 
          />
        </div>

        {/* Sales Trend with Period Selector */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Trend</CardTitle>
              <div className="flex gap-1">
                {(['day', 'week', 'month', 'quarter', 'year'] as PeriodFilter[]).map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p)}
                    className="capitalize"
                  >
                    {p === 'day' ? 'Day' : 
                     p === 'week' ? 'Week' : 
                     p === 'month' ? 'Month' : 
                     p === 'quarter' ? 'Quarter' : 'Year'}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {sales.daily.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sales.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      interval={period === 'year' ? 'preserveEnd' : undefined}
                    />
                    <YAxis tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(v) => formatCurrency(v as number)}
                      labelFormatter={formatDate}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No sales data for {periodLabels[period]}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {sales.methods.length > 0 ? (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={sales.methods} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={40} 
                          outerRadius={60} 
                          dataKey="total" 
                          label={({ _id, percent }) => 
                            `${_id} (${((percent || 0) * 100).toFixed(0)}%)`
                          }
                        >
                          {sales.methods.map((entry, i) => (
                            <Cell key={i} fill={COLORS[entry._id] || '#3b82f6'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {sales.methods.map(m => (
                      <div key={m._id} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[m._id] || '#3b82f6' }} 
                          />
                          <span className="capitalize">{m._id}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No payment data for {periodLabels[period]}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Attendance List */}
        {pending.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Approval ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pending.map(r => (
                  <div key={r._id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{r.user?.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(r.date)} • {new Date(r.clockInTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Low Stock List - Fixed with correct type properties */}
        {uniqueLowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Low Stock Alert ({uniqueLowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uniqueLowStockItems.map((alert: LowStockAlert, index: number) => {
                  // Use the correct properties from the LowStockAlert type
                  const itemName = alert.itemName || 'Unknown Item';
                  const itemCategory = alert.itemId ? 'Item' : 'Uncategorized'; // We don't have category in LowStockAlert
                  const itemLocation = alert.location || 'Unknown';
                  const itemUnit = alert.unit || 'pcs';
                  const currentStock = alert.currentStock || 0;
                  const status = alert.status || 'low';
                  
                  return (
                    <div key={alert.itemId || index} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          {itemLocation} • Min: {alert.minStock} {itemUnit}
                        </p>
                      </div>
                      <Badge variant={status === 'critical' ? 'destructive' : 'outline'}>
                        {currentStock} {itemUnit} left
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}