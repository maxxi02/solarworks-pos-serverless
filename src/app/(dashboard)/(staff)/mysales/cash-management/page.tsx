"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Percent,
  Receipt,
  X,
  Banknote,
  Smartphone,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";
import { useSocket } from "@/provider/socket-provider";
import { notifyCashUpdated } from "@/lib/notifyServer";
import { AdminPinModal } from "@/app/(dashboard)/(staff)/orders/_components/AdminPinModal";

interface Payment {
  _id: string;
  orderNumber: string;
  subtotal?: number;
  discountTotal?: number;
  total: number;
  paymentMethod: string;
  status: string;
  items: any[];
  createdAt: string;
}

interface CashOut {
  amount: number;
  reason: string;
  date: string;
}

interface SessionData {
  _id: string;
  openingFund: number;
  openedAt: string;
  cashierName: string;
  registerName: string;
  status: "open" | "closed";
  cashOuts: CashOut[];
}

export default function CashManagementPage() {
  const { isLoading: settingsLoading } = useReceiptSettings();
  const { socket, isConnected: isLive } = useSocket();

  const [sessionReady, setSessionReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  const [session, setSession] = useState<SessionData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Derived stats
  const [stats, setStats] = useState({
    grossSales: 0,
    netSales: 0,
    totalDiscounts: 0,
    totalRefunds: 0,
    cashSales: 0,
    gcashSales: 0,
    splitSales: 0,
    totalCollected: 0,
    transactionCount: 0,
    itemCount: 0,
    cashInDrawer: 0,
    cashOuts: 0,
    hourlySales: [] as Array<{ hour: string; sales: number }>,
    topItems: [] as Array<{ name: string; qty: number; amount: number }>,
  });

  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<number | "">("");
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);

  // ── Socket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onCashUpdated = () => { loadPayments(); checkSession(); };
    const onSalesUpdated = () => loadPayments();
    socket.on("cash:updated", onCashUpdated);
    socket.on("sales:updated", onSalesUpdated);
    return () => {
      socket.off("cash:updated", onCashUpdated);
      socket.off("sales:updated", onSalesUpdated);
    };
  }, [socket]);

  useEffect(() => { if (!settingsLoading) checkSession(); }, [settingsLoading]);
  useEffect(() => { if (sessionReady) loadPayments(); }, [sessionReady]);
  useEffect(() => { if (session) calculateStats(); }, [payments, selectedPeriod, session]);

  // ── API ─────────────────────────────────────────────────────────────────
  const checkSession = async () => {
    try {
      const res = await fetch("/api/session");
      const result = await res.json();
      if (result.success && result.data) {
        setSession(result.data);
        setSessionReady(true);
      } else {
        setSession(null);
        setSessionReady(false);
        setPayments([]);
      }
    } catch (err) {
      console.error("checkSession error:", err);
      setSessionReady(false);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await fetch("/api/payments?limit=500");
      const result = await res.json();
      if (result.success && result.data) setPayments(result.data.payments);
    } catch {
      /* silent — don't block UI */
    }
  };



  // ── Stats calculation ───────────────────────────────────────────────────
  const calculateStats = useCallback(() => {
    if (!session) return;

    const now = new Date();
    const sessionStart = new Date(session.openedAt);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    if (selectedPeriod === "week") startDate = new Date(today.getTime() - 7 * 86400000);
    else if (selectedPeriod === "month") startDate = new Date(today.getTime() - 30 * 86400000);
    else startDate = today;

    const effectiveStart = startDate < sessionStart ? sessionStart : startDate;

    const filtered = payments.filter((p) => {
      const d = new Date(p.createdAt);
      return d >= effectiveStart && d <= now;
    });

    const completed = filtered.filter((p) => p.status === "completed");
    const refunded = filtered.filter((p) => p.status === "refunded");

    // Total discounts from orders (senior/PWD)
    const totalDiscounts = completed.reduce(
      (s, p) => s + (p.discountTotal || 0),
      0,
    );

    // Gross Sales = original price BEFORE discount (subtotal = pre-discount)
    // Fall back to p.total for older records that don't have subtotal stored
    const grossSales = completed.reduce((s, p) => s + (p.subtotal || p.total), 0);

    const totalRefunds = refunded.reduce((s, p) => s + p.total, 0);

    // Net Sales = what was actually collected (total = after-discount amount paid)
    const netSales = completed.reduce((s, p) => s + p.total, 0);

    const cashSales = completed
      .filter((p) => p.paymentMethod === "cash")
      .reduce((s, p) => s + p.total, 0);
    const gcashSales = completed
      .filter((p) => p.paymentMethod === "gcash")
      .reduce((s, p) => s + p.total, 0);
    const splitSales = completed
      .filter((p) => p.paymentMethod === "split")
      .reduce((s, p) => s + p.total, 0);
    const cashRefunds = refunded
      .filter((p) => p.paymentMethod === "cash")
      .reduce((s, p) => s + p.total, 0);

    const periodCashOuts = (session.cashOuts || [])
      .filter((c) => new Date(c.date) >= effectiveStart && new Date(c.date) <= now)
      .reduce((s, c) => s + c.amount, 0);

    // Cash in drawer = starting fund + all cash sales - cash refunds - cash outs
    const cashInDrawer = session.openingFund + cashSales - cashRefunds - periodCashOuts;

    // Hourly sales (today only)
    let hourlySales: Array<{ hour: string; sales: number }> = [];
    if (selectedPeriod === "today") {
      const map = new Map<string, number>();
      for (let h = 0; h < 24; h++) map.set(`${h}:00`, 0);
      completed.forEach((p) => {
        const d = new Date(p.createdAt);
        if (d.toDateString() === today.toDateString()) {
          const key = `${d.getHours()}:00`;
          map.set(key, (map.get(key) || 0) + p.total);
        }
      });
      hourlySales = Array.from(map.entries())
        .map(([hour, sales]) => ({ hour, sales }))
        .filter((h) => h.sales > 0);
    }

    // Top items
    const itemMap = new Map<string, { name: string; qty: number; amount: number }>();
    completed.forEach((p) => {
      p.items.forEach((item: any) => {
        const ex = itemMap.get(item.name);
        if (ex) {
          ex.qty += item.quantity || 1;
          ex.amount += item.price * (item.quantity || 1);
        } else {
          itemMap.set(item.name, {
            name: item.name,
            qty: item.quantity || 1,
            amount: item.price * (item.quantity || 1),
          });
        }
      });
    });

    // Total collected = all completed sales across all payment methods, minus refunds
    const totalCollected = cashSales + gcashSales + splitSales - totalRefunds;

    setStats({
      grossSales,
      netSales,
      totalDiscounts,
      totalRefunds,
      cashSales,
      gcashSales,
      splitSales,
      totalCollected,
      transactionCount: completed.length,
      itemCount: completed.reduce((s, p) => s + p.items.length, 0),
      cashInDrawer,
      cashOuts: periodCashOuts,
      hourlySales,
      topItems: Array.from(itemMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
    });
  }, [session, payments, selectedPeriod]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([checkSession(), loadPayments()]).finally(() => setIsRefreshing(false));
  };

  const handleCashOut = async () => {
    if (!cashOutAmount || cashOutAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (cashOutAmount > stats.cashInDrawer) { toast.error("Insufficient cash in drawer"); return; }

    setIsCashingOut(true);
    try {
      const res = await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cash_out", amount: cashOutAmount }),
      });
      const result = await res.json();
      if (result.success) {
        setSession(result.data);
        toast.success(`Cash out of ${fmtP(cashOutAmount as number)} recorded`);
        await notifyCashUpdated();
        setCashOutAmount("");
        setShowCashOutModal(false);
        setShowAdminPin(false);
      } else {
        toast.error("Failed to record cash out");
      }
    } catch {
      toast.error("Failed to record cash out");
    } finally {
      setIsCashingOut(false);
    }
  };

  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fmtP = (n: number) => `₱${fmt(n)}`;



  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const periodLabel = selectedPeriod === "today" ? "Today" : selectedPeriod === "week" ? "This Week" : "This Month";

  // ── Main Page ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Register</p>
            <h1 className="text-2xl font-bold">Cash Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Opened {session?.openedAt ? new Date(session.openedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
              {" · "}Starting Fund: <span className="font-semibold text-foreground">{fmtP(session?.openingFund ?? 0)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${session?.status === "open"
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-muted text-muted-foreground border-border"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {session?.status === "open" ? "Open" : "Closed"}
            </span>
            <button
              onClick={handleRefresh}
              className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Period Selector ── */}
        <div className="flex gap-1.5">
          {(["today", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedPeriod === p
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
                }`}
            >
              {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>


        {/* ── Cash Drawer + Quick Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Cash in Drawer — primary card */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Cash in Drawer</p>
                  <p className="text-3xl font-black text-foreground leading-tight">{fmtP(stats.cashInDrawer)}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCashOutModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold rounded-lg transition-colors"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Cash Out
              </button>
            </div>

            {/* Drawer breakdown — clean row */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Starting Fund</p>
                <p className="text-sm font-bold">{fmtP(session?.openingFund ?? 0)}</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-xs text-muted-foreground mb-0.5">Cash Sales</p>
                <p className="text-sm font-bold text-green-600">+{fmtP(stats.cashSales)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Pay Outs</p>
                <p className="text-sm font-bold text-red-500">−{fmtP(stats.cashOuts)}</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-col gap-3">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-1">
              <div className="p-2 bg-muted rounded-lg">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{stats.transactionCount}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-1">
              <div className="p-2 bg-muted rounded-lg">
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Items Sold</p>
                <p className="text-xl font-bold">{stats.itemCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sales Summary ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Gross Sales",
              value: stats.grossSales,
              sub: "All completed orders",
              icon: TrendingUp,
              color: "text-foreground",
            },
            {
              label: "Net Sales",
              value: stats.netSales,
              sub: "After discounts",
              icon: BarChart3,
              color: "text-primary",
            },
            {
              label: "Discounts Given",
              value: stats.totalDiscounts,
              sub: "Senior / PWD",
              icon: Percent,
              color: "text-amber-500",
            },
            {
              label: "Refunds",
              value: stats.totalRefunds,
              sub: "Returned orders",
              icon: ArrowDownLeft,
              color: "text-red-500",
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{fmtP(value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Payment Method Breakdown ── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Payment Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Cash", value: stats.cashSales, icon: Banknote },
              { label: "GCash", value: stats.gcashSales, icon: Smartphone },
              { label: "Split", value: stats.splitSales, icon: CreditCard },
            ].map(({ label, value, icon: Icon }) => {
              const pct = stats.grossSales > 0 ? (value / stats.grossSales) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-lg font-bold">{fmtP(value)}</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% of total</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Hourly Sales ── */}
        {selectedPeriod === "today" && stats.hourlySales.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Hourly Sales</h3>
            </div>
            <div className="space-y-2.5">
              {stats.hourlySales.map((hour) => {
                const max = Math.max(...stats.hourlySales.map((h) => h.sales));
                const pct = max > 0 ? (hour.sales / max) * 100 : 0;
                return (
                  <div key={hour.hour} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12 text-right">{hour.hour}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right">{fmtP(hour.sales)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Top Items ── */}
        {stats.topItems.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Top Selling Items</h3>
            <div className="divide-y divide-border">
              {stats.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.qty} sold</span>
                  <span className="text-sm font-bold">{fmtP(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Cash Out Modal ── */}
      {showCashOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Cash Out</h3>
              <button onClick={() => setShowCashOutModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Available: </span>
                <span className="font-bold">{fmtP(stats.cashInDrawer)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={stats.cashInDrawer}
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button
                onClick={() => setShowCashOutModal(false)}
                className="flex-1 py-2.5 border border-border text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!cashOutAmount || cashOutAmount <= 0) { toast.error("Enter a valid amount"); return; }
                  if (cashOutAmount > stats.cashInDrawer) { toast.error("Insufficient cash in drawer"); return; }
                  setShowAdminPin(true);
                }}
                disabled={isCashingOut || !cashOutAmount || (cashOutAmount as number) <= 0}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin PIN for Cash Out ── */}
      <AdminPinModal
        open={showAdminPin}
        onOpenChange={setShowAdminPin}
        title="Admin Authorization"
        description="Enter admin PIN to authorize this cash out."
        onSuccess={handleCashOut}
      />
    </div>
  );
}