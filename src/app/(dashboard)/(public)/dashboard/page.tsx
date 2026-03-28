"use client";

import { useState, useEffect } from "react";
import { Package, Clock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSocket } from "@/provider/socket-provider";
import { formatCurrency, formatDateTime } from "@/lib/format-utils";
import { AICompanion } from "@/components/ai-companion";
import { authClient } from "@/lib/auth-client";
import type { LowStockAlert } from "@/types";

import { StatCard } from "@/components/dashboard/StatCard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { RecentReceipts } from "@/components/dashboard/RecentReceipts";
import { InventoryAlerts } from "@/components/dashboard/InventoryAlerts";
import { AttendanceApprovals } from "@/components/dashboard/AttendanceApprovals";
import { OrderQueue } from "@/components/dashboard/OrderQueue";
import { AttendanceCard } from "@/components/dashboard/AttendanceCard";

interface PaymentMethod { _id: string; total: number; count: number; }
interface DailyData { date: string; revenue: number; }
interface AttendanceRecord {
  _id: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  hoursWorked?: number;
  status: string;
}
type PeriodFilter = "day" | "week" | "month" | "quarter" | "year";

export default function AdminDashboard() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  // ── Admin-only state ──────────────────────────────────────────────────────
  const [salesLoading, setSalesLoading] = useState(true);
  const [invLoading, setInvLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>("week");
  const [sales, setSales] = useState({
    today: 0, yesterday: 0, transactions: 0,
    daily: [] as DailyData[], methods: [] as PaymentMethod[],
  });
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [criticalStock, setCriticalStock] = useState<LowStockAlert[]>([]);
  const [invStats, setInvStats] = useState({ total: 0, critical: 0, low: 0, warning: 0, value: 0, needRestock: 0 });
  const [pending, setPending] = useState<AttendanceRecord[]>([]);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const {
    onSalesUpdated, offSalesUpdated,
    onNewCustomerOrder, offNewCustomerOrder,
    onAttendanceApproved, offAttendanceApproved,
    onAttendanceStatusChanged, offAttendanceStatusChanged,
  } = useSocket();

  useEffect(() => {
    const refreshSales = () => loadSalesData();
    const refreshAttendance = () => loadPendingData();

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

  async function loadSalesData() {
    if (!isAdmin) { setSalesLoading(false); return; }
    setSalesLoading(true);
    try {
      const periodMap: Record<PeriodFilter, string> = {
        day: "today", week: "week", month: "month", quarter: "quarter", year: "year",
      };
      const res = await fetch(`/api/payments/analytics?period=${periodMap[period]}`);
      const d = await res.json();
      if (d.success && d.data) {
        const yesterday = d.data.daily.length > 1
          ? d.data.daily[d.data.daily.length - 2]?.revenue || 0 : 0;
        setSales({
          today: d.data.summary.totalRevenue,
          yesterday,
          transactions: d.data.summary.totalTransactions,
          daily: d.data.daily || [],
          methods: d.data.paymentMethods || [],
        });
      }
    } catch (err) { console.error("Sales error:", err); }
    finally { setSalesLoading(false); }
  }

  async function loadInventoryData() {
    if (!isAdmin) { setInvLoading(false); return; }
    setInvLoading(true);
    try {
      const res = await fetch("/api/dashboard/inventory-summary");
      const d = await res.json();
      if (d.success && d.data) {
        setInvStats(d.data.stats);
        setLowStock(d.data.lowStock.filter((i: any) => i.status !== "critical"));
        setCriticalStock(d.data.lowStock.filter((i: any) => i.status === "critical"));
      }
    } catch (err) { console.error("Inventory error:", err); }
    finally { setInvLoading(false); }
  }

  async function loadPendingData() {
    if (!isAdmin) { setPendingLoading(false); return; }
    setPendingLoading(true);
    try {
      const res = await fetch("/api/attendance/admin/pending");
      const d = await res.json();
      if (d.success) setPending(d.records || []);
    } catch (err) { console.error("Pending error:", err); }
    finally { setPendingLoading(false); }
  }

  async function loadAllData() {
    setError(null);
    loadSalesData();
    loadInventoryData();
    loadPendingData();
    setLastUpdated(new Date());
  }

  useEffect(() => {
    loadAllData();
    const i = setInterval(loadAllData, 60000);
    return () => clearInterval(i);
  }, [period, isAdmin]);

  const calculateTrend = (curr: number, prev: number) => {
    if (prev === 0) return { change: "No data", trend: "stable" as const };
    const p = ((curr - prev) / prev) * 100;
    return {
      change: `${p > 0 ? "+" : ""}${p.toFixed(1)}%`,
      trend: p > 5 ? "up" as const : p < -5 ? "down" as const : "stable" as const,
    };
  };

  const periodLabels: Record<PeriodFilter, string> = {
    day: "Today", week: "This Week", month: "This Month",
    quarter: "This Quarter", year: "This Year",
  };

  const isRefreshing = isAdmin && (salesLoading || invLoading || pendingLoading);

  const uniqueLowStockItems = [...lowStock, ...criticalStock].filter(
    (item, index, self) => index === self.findIndex((t) => t.itemId === item.itemId),
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard Overview</h1>
            <p className="text-muted-foreground italic">
              Last synced: {formatDateTime(lastUpdated.toISOString())}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 shadow-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isAdmin ? (
          <>
            {/* Admin stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <StatCard
                title="Today's Total Sales"
                value={formatCurrency(sales.today)}
                {...calculateTrend(sales.today, sales.yesterday)}
                isCurrency
                isLoading={salesLoading}
              />
              <StatCard
                title="Transactions"
                value={sales.transactions.toString()}
                {...calculateTrend(sales.transactions, sales.transactions * 0.95)}
                icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
                isLoading={salesLoading}
              />
              <StatCard
                title="Active Low Stocks"
                value={(invStats.critical + invStats.low).toString()}
                change={`${invStats.critical} critical items`}
                trend={invStats.critical > 0 ? "attention" : "stable"}
                icon={<Package className="h-5 w-5 text-muted-foreground" />}
                isLoading={invLoading}
              />
              <StatCard
                title="Staff Approvals"
                value={pending.length.toString()}
                change={`${pending.length} pending requests`}
                trend={pending.length > 0 ? "attention" : "stable"}
                icon={<Clock className="h-5 w-5 text-muted-foreground" />}
                isLoading={pendingLoading}
              />
            </div>

            {/* Admin: Chart + Payment Methods */}
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <SalesTrendChart
                  data={sales.daily}
                  period={period}
                  onPeriodChange={setPeriod}
                  isLoading={salesLoading}
                />
              </div>
              <div className="lg:col-span-1">
                <PaymentMethodsChart
                  methods={sales.methods}
                  periodLabel={periodLabels[period]}
                  isLoading={salesLoading}
                />
              </div>
            </div>

            {/* Admin: Receipts + Inventory + Attendance Approvals */}
            <div className="grid lg:grid-cols-2 gap-6">
              <RecentReceipts />
              <div className="space-y-6">
                <InventoryAlerts items={uniqueLowStockItems} isLoading={invLoading} />
                <AttendanceApprovals pending={pending} isLoading={pendingLoading} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Staff: Attendance + Order Queue side by side */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <AttendanceCard />
              <OrderQueue />
            </div>

            {/* Staff: Recent Transactions full width */}
            <RecentReceipts />
          </>
        )}
      </div>

      <AICompanion />
    </div>
  );
}
