'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Package, Clock, RefreshCw, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  fetchInventory,
  getLowStockAlerts,
  getCriticalStockAlerts
} from '@/lib/inventoryService';
import { useInventorySocket } from '@/hooks/useInventorySocket';
import { useSocket } from '@/provider/socket-provider';
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { AICompanion } from '@/components/ai-companion';

// Modular Components
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesTrendChart } from '@/components/dashboard/SalesTrendChart';
import { PaymentMethodsChart } from '@/components/dashboard/PaymentMethodsChart';
import { RecentReceipts } from '@/components/dashboard/RecentReceipts';
import { InventoryAlerts } from '@/components/dashboard/InventoryAlerts';
import { AttendanceApprovals } from '@/components/dashboard/AttendanceApprovals';
import { OrderQueue } from '@/components/dashboard/OrderQueue';
import { authClient } from '@/lib/auth-client';

// Types
import type { LowStockAlert } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  // Recent Receipts State
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

  // Attendance State
  const [pending, setPending] = useState<AttendanceRecord[]>([]);

  // Socket
  const {
    onSalesUpdated, offSalesUpdated,
    onNewCustomerOrder, offNewCustomerOrder,
    onAttendanceApproved, offAttendanceApproved,
    onAttendanceStatusChanged, offAttendanceStatusChanged
  } = useSocket();

  useInventorySocket({
    userId: 'admin',
    userName: 'Admin',
    onInventoryAdjusted: loadInventoryData,
    onItemCreated: loadInventoryData,
    onItemDeleted: loadInventoryData
  });

  // Real-time Listeners
  useEffect(() => {
    const refreshSales = () => {
      loadSalesData();
      loadRecentReceipts();
    };

    const refreshAttendance = () => {
      loadPendingData();
      loadAttendanceHistory();
    };

    onSalesUpdated(refreshSales);
    onNewCustomerOrder(refreshSales);
    onAttendanceApproved(refreshAttendance);
    onAttendanceStatusChanged(refreshAttendance);

    return () => {
      offSalesUpdated(refreshSales);
      offNewCustomerOrder(refreshSales);
      offAttendanceApproved(refreshAttendance);
      offAttendanceStatusChanged(refreshAttendance);
    };
  }, [onSalesUpdated, onNewCustomerOrder, onAttendanceApproved, onAttendanceStatusChanged]);

  // Data Loading functions
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === 'admin';
  const userId = session?.user?.id;

  async function loadSalesData() {
    try {
      let periodParam = 'week';
      switch (period) {
        case 'day': periodParam = 'today'; break;
        case 'week': periodParam = 'week'; break;
        case 'month': periodParam = 'month'; break;
        case 'quarter': periodParam = 'quarter'; break;
        case 'year': periodParam = 'year'; break;
      }

      let url = `/api/payments/summary?period=${periodParam}`;
      if (!isAdmin && userId) {
        url += `&staffId=${userId}`;
      }

      const res = await fetch(url);
      const d = await res.json();
      if (d.success && d.data) {
        const yesterday = d.data.daily.length > 1 ? d.data.daily[d.data.daily.length - 2]?.revenue || 0 : 0;
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
    if (!isAdmin) return; // Staff doesn't need full inventory stats
    try {
      const data = await fetchInventory();
      const low = await getLowStockAlerts();
      const crit = await getCriticalStockAlerts();

      setLowStock(low);
      setCriticalStock(crit);

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

  // Attendance History for Staff
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  async function loadAttendanceHistory() {
    if (isAdmin) return;
    try {
      const res = await fetch('/api/attendance/history?limit=5');
      const d = await res.json();
      if (d.success) setAttendanceHistory(d.history || []);
    } catch (err) {
      console.error('Attendance history error:', err);
    }
  }

  async function loadRecentReceipts() {
    try {
      let url = '/api/receipts?limit=5';
      if (!isAdmin && userId) {
        // Assume API supports filtering or we handle it in frontend if it's just 5 items
      }
      const res = await fetch(url);
      const d = await res.json();
      if (d.receipts) {
        const receipts = isAdmin
          ? d.receipts
          : d.receipts.filter((r: any) => r.cashierId === userId);
        setRecentReceipts(receipts);
      }
    } catch (err) {
      console.error('Receipts error:', err);
    }
  }

  async function loadPendingData() {
    if (!isAdmin) return;
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
        loadRecentReceipts(),
        loadPendingData(),
        loadAttendanceHistory()
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

  const periodLabels = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year'
  };

  const uniqueLowStockItems = [...lowStock, ...criticalStock].filter((item, index, self) =>
    index === self.findIndex((t) => t.itemId === item.itemId)
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard Overview</h1>
            <p className="text-muted-foreground italic">Last synced: {formatDateTime(lastUpdated.toISOString())}</p>
          </div>
          <Button variant="default" onClick={loadAllData} disabled={loading} className="shadow-sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 shadow-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Top-level Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            title={isAdmin ? "Today's Total Sales" : "Your Today's Sales"}
            value={formatCurrency(sales.today)}
            {...calculateTrend(sales.today, sales.yesterday)}
            isCurrency
            isLoading={loading}
          />
          <StatCard
            title={isAdmin ? "Transactions" : "Your Transactions"}
            value={sales.transactions.toString()}
            {...calculateTrend(sales.transactions, sales.transactions * 0.95)}
            icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
            isLoading={loading}
          />
          {isAdmin ? (
            <>
              <StatCard
                title="Active Low Stocks"
                value={(invStats.critical + invStats.low).toString()}
                change={`${invStats.critical} critical items`}
                trend={invStats.critical > 0 ? 'attention' : 'stable'}
                icon={<Package className="h-5 w-5 text-muted-foreground" />}
                isLoading={loading}
              />
              <StatCard
                title="Staff Approvals"
                value={pending.length.toString()}
                change={`${pending.length} pending requests`}
                trend={pending.length > 0 ? 'attention' : 'stable'}
                icon={<Clock className="h-5 w-5 text-muted-foreground" />}
                isLoading={loading}
              />
            </>
          ) : (
            <>
              <StatCard
                title="Active Orders"
                value="View Queue"
                change="Incoming orders"
                trend="stable"
                icon={<Utensils className="h-5 w-5 text-muted-foreground" />}
                isLoading={loading}
              />
              <StatCard
                title="Your Attendance"
                value={attendanceHistory[0]?.status || 'No record'}
                change={attendanceHistory[0] ? `Last: ${formatDateTime(attendanceHistory[0].date)}` : 'Check history below'}
                trend="stable"
                icon={<Clock className="h-5 w-5 text-muted-foreground" />}
                isLoading={loading}
              />
            </>
          )}
        </div>

        {/* Charts & Queue Section */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <SalesTrendChart
              data={sales.daily}
              period={period}
              onPeriodChange={setPeriod}
              isLoading={loading}
            />
          </div>
          <div className="lg:col-span-1">
            {isAdmin ? (
              <PaymentMethodsChart
                methods={sales.methods}
                periodLabel={periodLabels[period]}
                isLoading={loading}
              />
            ) : (
              <OrderQueue />
            )}
          </div>
        </div>

        {/* Detail Sections */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <RecentReceipts receipts={recentReceipts} isLoading={loading} />
          </div>
          <div className="space-y-6">
            {isAdmin ? (
              <>
                <InventoryAlerts items={uniqueLowStockItems} isLoading={loading} />
                <AttendanceApprovals pending={pending} isLoading={loading} />
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Your Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendanceHistory.map((rec) => (
                      <div key={rec._id} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div className="text-sm">
                          <p className="font-medium">{new Date(rec.date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {rec.clockInTime} {rec.clockOutTime ? `- ${rec.clockOutTime}` : '(Active)'}
                          </p>
                        </div>
                        <Badge variant={rec.status === 'present' || rec.status === 'on-time' ? 'default' : 'secondary'}>
                          {rec.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AICompanion />
    </div>
  );
}