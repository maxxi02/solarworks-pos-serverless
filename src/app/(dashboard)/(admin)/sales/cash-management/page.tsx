"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Wallet,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Percent,
  Receipt,
  Banknote,
  Smartphone,
  ArrowDownLeft,
  BarChart3,
  Clock,
  ShoppingCart,
  Shield,
} from "lucide-react";
import { useSocket } from "@/provider/socket-provider";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface SummaryData {
  grossSales: number;
  netSales: number;
  totalDiscounts: number;
  totalRefunds: number;
  cashSales: number;
  cashSalesDirect: number;
  gcashSales: number;
  gcashSalesDirect: number;
  splitSales: number;
  totalCollected: number;
  transactionCount: number;
  hourlySales: Array<{ hour: string; sales: number }>;
  topItems: Array<{ name: string; qty: number; amount: number }>;
}

const DEFAULT_SUMMARY: SummaryData = {
  grossSales: 0,
  netSales: 0,
  totalDiscounts: 0,
  totalRefunds: 0,
  cashSales: 0,
  cashSalesDirect: 0,
  gcashSales: 0,
  gcashSalesDirect: 0,
  splitSales: 0,
  totalCollected: 0,
  transactionCount: 0,
  hourlySales: [],
  topItems: [],
};

export default function AdminCashManagementPage() {
  const { socket, isConnected: isLive } = useSocket();
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("today");
  const [summary, setSummary] = useState<SummaryData>(DEFAULT_SUMMARY);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodRef = useRef(selectedPeriod);
  useEffect(() => {
    periodRef.current = selectedPeriod;
  }, [selectedPeriod]);

  // ── Role guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPending && session) {
      const role = (session.user as any)?.role;
      if (role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [session, isPending, router]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadSummary(periodRef.current);
      }, 800);
    };

    socket.on("cash:updated", debouncedRefresh);
    socket.on("sales:updated", debouncedRefresh);

    return () => {
      socket.off("cash:updated", debouncedRefresh);
      socket.off("sales:updated", debouncedRefresh);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket]);

  // Initial load
  useEffect(() => {
    loadSummary(selectedPeriod).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when period changes
  useEffect(() => {
    if (!loading) loadSummary(selectedPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  // ── API ───────────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async (period: string) => {
    try {
      const params = new URLSearchParams({ period });
      const res = await fetch(`/api/payments/summary?${params}`);
      const result = await res.json();
      if (result.success && result.data) {
        setSummary(result.data);
      }
    } catch {
      /* silent — don't wipe existing data on network error */
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSummary(selectedPeriod).finally(() => setIsRefreshing(false));
  };

  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmtP = (n: number) => `₱${fmt(n)}`;

  if (loading || isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const periodLabel =
    selectedPeriod === "today"
      ? "Today"
      : selectedPeriod === "week"
        ? "Last 7 Days"
        : "Last 30 Days";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Sales
              </p>
              <Shield className="h-3 w-3 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Admin View
              </p>
            </div>
            <h1 className="text-2xl font-bold">Cash Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Store-wide financial overview · {periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {/* Period selector */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              {(["today", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-3 py-2 transition-colors ${
                    selectedPeriod === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {p === "today"
                    ? "Today"
                    : p === "week"
                      ? "7 Days"
                      : "30 Days"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
              />
              <span className="text-xs text-muted-foreground">
                {isLive ? "Live" : "Offline"}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ── Key Metrics Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Gross Sales",
              value: summary.grossSales,
              sub: "All completed orders",
              icon: TrendingUp,
              color: "text-foreground",
              bg: "bg-muted",
            },
            {
              label: "Net Sales",
              value: summary.netSales,
              sub: "After discounts & refunds",
              icon: BarChart3,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Discounts Given",
              value: summary.totalDiscounts,
              sub: "Senior / PWD discounts",
              icon: Percent,
              color: "text-amber-500",
              bg: "bg-amber-500/10",
            },
            {
              label: "Refunds",
              value: summary.totalRefunds,
              sub: "Returned orders",
              icon: ArrowDownLeft,
              color: "text-red-500",
              bg: "bg-red-500/10",
            },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">
                  {label}
                </p>
                <div className={`p-1.5 rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className={`text-2xl font-black ${color}`}>{fmtP(value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Cash Drawer Overview + Quick Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Cash Collected
                </p>
                <p className="text-3xl font-black text-foreground leading-tight">
                  {fmtP(summary.cashSales)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Cash Direct
                </p>
                <p className="text-sm font-bold text-green-600">
                  +{fmtP(summary.cashSalesDirect ?? summary.cashSales)}
                </p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-xs text-muted-foreground mb-0.5">
                  GCash Total
                </p>
                <p className="text-sm font-bold text-blue-500">
                  +{fmtP(summary.gcashSales)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  Total Collected
                </p>
                <p className="text-sm font-bold">
                  {fmtP(summary.totalCollected)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-1">
              <div className="p-2 bg-muted rounded-lg">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{summary.transactionCount}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-1">
              <div className="p-2 bg-muted rounded-lg">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Avg. Transaction
                </p>
                <p className="text-xl font-bold">
                  {fmtP(
                    summary.transactionCount > 0
                      ? summary.netSales / summary.transactionCount
                      : 0,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment Breakdown ── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Payment Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: "Cash",
                value: summary.cashSalesDirect ?? summary.cashSales,
                icon: Banknote,
                color: "bg-green-500",
              },
              {
                label: "GCash",
                value: summary.gcashSalesDirect ?? summary.gcashSales,
                icon: Smartphone,
                color: "bg-blue-500",
              },
              {
                label: "Split Payment",
                value: summary.splitSales,
                icon: Receipt,
                color: "bg-violet-500",
              },
            ].map(({ label, value, icon: Icon, color }) => {
              const pct =
                summary.grossSales > 0 ? (value / summary.grossSales) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-lg font-bold">{fmtP(value)}</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pct.toFixed(1)}% of gross sales
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Refund Details ── */}
        {summary.totalRefunds > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                Refunds This Period
              </h3>
            </div>
            <p className="text-2xl font-black text-red-500">
              {fmtP(summary.totalRefunds)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total value of refunded transactions
            </p>
          </div>
        )}

        {/* ── Hourly Sales ── */}
        {selectedPeriod === "today" && summary.hourlySales.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Hourly Sales</h3>
            </div>
            <div className="space-y-2.5">
              {summary.hourlySales.map((hour) => {
                const max = Math.max(
                  ...summary.hourlySales.map((h) => h.sales),
                );
                const pct = max > 0 ? (hour.sales / max) * 100 : 0;
                return (
                  <div key={hour.hour} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {hour.hour}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right">
                      {fmtP(hour.sales)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Top Items ── */}
        {summary.topItems.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Top Selling Items</h3>
            <div className="divide-y divide-border">
              {summary.topItems.map((item, i) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.qty} sold
                  </span>
                  <span className="text-sm font-bold">{fmtP(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
