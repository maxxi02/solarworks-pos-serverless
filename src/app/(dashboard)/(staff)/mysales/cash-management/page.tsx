"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import XReportModal from "./_components/XReportModal";

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

interface SummaryData {
  grossSales: number;
  netSales: number;
  totalDiscounts: number;
  totalRefunds: number;
  cashSales: number;
  gcashSales: number;
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
  gcashSales: 0,
  splitSales: 0,
  totalCollected: 0,
  transactionCount: 0,
  hourlySales: [],
  topItems: [],
};

export default function CashManagementPage() {
  const { settings, isLoading: settingsLoading } = useReceiptSettings();
  const { socket, isConnected: isLive } = useSocket();

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  const [session, setSession] = useState<SessionData | null>(null);
  const [summary, setSummary] = useState<SummaryData>(DEFAULT_SUMMARY);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to latest session so loadSummary closure is always fresh
  const sessionRef = useRef<SessionData | null>(null);
  const periodRef = useRef(selectedPeriod);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { periodRef.current = selectedPeriod; }, [selectedPeriod]);

  // ── Derived: cash in drawer ───────────────────────────────────────────────
  const getCashInDrawer = useCallback((s: SessionData | null, cashSales: number, period: string): number => {
    if (!s) return 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionStart = new Date(s.openedAt);
    let periodStart: Date;
    if (period === "week") periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    else if (period === "month") periodStart = new Date(todayStart.getTime() - 30 * 86_400_000);
    else periodStart = todayStart;
    const effectiveStart = sessionStart > periodStart ? sessionStart : periodStart;
    const outs = (s.cashOuts || [])
      .filter((c) => new Date(c.date) >= effectiveStart)
      .reduce((acc, c) => acc + c.amount, 0);
    return s.openingFund + cashSales - outs;
  }, []);

  const getPeriodCashOuts = useCallback((s: SessionData | null, period: string): number => {
    if (!s) return 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionStart = new Date(s.openedAt);
    let periodStart: Date;
    if (period === "week") periodStart = new Date(todayStart.getTime() - 7 * 86_400_000);
    else if (period === "month") periodStart = new Date(todayStart.getTime() - 30 * 86_400_000);
    else periodStart = todayStart;
    const effectiveStart = sessionStart > periodStart ? sessionStart : periodStart;
    return (s.cashOuts || [])
      .filter((c) => new Date(c.date) >= effectiveStart)
      .reduce((acc, c) => acc + c.amount, 0);
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        loadSummary(sessionRef.current, periodRef.current);
      }, 800);
    };

    const onCashUpdated = () => { debouncedRefresh(); checkSession(); };
    const onSalesUpdated = () => debouncedRefresh();

    socket.on("cash:updated", onCashUpdated);
    socket.on("sales:updated", onSalesUpdated);

    return () => {
      socket.off("cash:updated", onCashUpdated);
      socket.off("sales:updated", onSalesUpdated);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket]);

  // Initial load
  useEffect(() => {
    if (!settingsLoading) {
      checkSession().finally(() => setLoading(false));
    }
  }, [settingsLoading]);

  // Reload when period changes
  useEffect(() => {
    if (session) loadSummary(session, selectedPeriod);
  }, [selectedPeriod, session]);

  // ── API ───────────────────────────────────────────────────────────────────
  const checkSession = async () => {
    try {
      const res = await fetch("/api/session");
      const result = await res.json();
      if (result.success && result.data) {
        setSession(result.data);
        sessionRef.current = result.data;
        // Load summary immediately after we have session
        await loadSummary(result.data, periodRef.current);
      } else {
        setSession(null);
        sessionRef.current = null;
        setSummary(DEFAULT_SUMMARY);
      }
    } catch (err) {
      console.error("checkSession error:", err);
    }
  };

  const loadSummary = async (s: SessionData | null, period: string) => {
    if (!s) return;
    try {
      const params = new URLSearchParams({
        period,
        sessionStart: s.openedAt,
      });
      const res = await fetch(`/api/payments/summary?${params}`);
      const result = await res.json();
      if (result.success && result.data) {
        setSummary(result.data);
      }
    } catch {
      /* silent — don't wipe existing data on network error */
    }
  };

  // ── Cash Out ──────────────────────────────────────────────────────────────
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showXReportModal, setShowXReportModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<number | "">("");
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);

  const drawerBalance = getCashInDrawer(session, summary.cashSales, selectedPeriod);
  const drawerCashOuts = getPeriodCashOuts(session, selectedPeriod);

  const handleCashOut = async () => {
    if (!cashOutAmount || cashOutAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (cashOutAmount > drawerBalance) { toast.error("Insufficient cash in drawer"); return; }

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
        sessionRef.current = result.data;
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([checkSession()]).finally(() => setIsRefreshing(false));
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Register</p>
            <h1 className="text-2xl font-bold">Cash Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Opened{" "}
              {session?.openedAt
                ? new Date(session.openedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                : "—"}
              {" · "}Starting Fund:{" "}
              <span className="font-semibold text-foreground">{fmtP(session?.openingFund ?? 0)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              session?.status === "open"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {session?.status === "open" ? "Open" : "Closed"}
            </span>
            <button onClick={handleRefresh} className="p-2 border border-border rounded-lg hover:bg-muted transition-colors">
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>


        {/* ── Cash Drawer + Quick Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Cash in Drawer</p>
                  <p className="text-3xl font-black text-foreground leading-tight">{fmtP(drawerBalance)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowXReportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  X-Reading
                </button>
                <button
                  onClick={() => setShowCashOutModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold rounded-lg transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Pay Out
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Starting Fund</p>
                <p className="text-sm font-bold">{fmtP(session?.openingFund ?? 0)}</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-xs text-muted-foreground mb-0.5">Cash Sales</p>
                <p className="text-sm font-bold text-green-600">+{fmtP(summary.cashSales)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Pay Outs</p>
                <p className="text-sm font-bold text-red-500">−{fmtP(drawerCashOuts)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-1">
              <div className="p-2 bg-muted rounded-lg"><ShoppingBag className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{summary.transactionCount}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-1">
              <div className="p-2 bg-muted rounded-lg"><Receipt className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold">{fmtP(summary.totalCollected)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sales Summary ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Gross Sales", value: summary.grossSales, sub: "All completed orders", icon: TrendingUp, color: "text-foreground" },
            { label: "Net Sales", value: summary.netSales, sub: "After discounts", icon: BarChart3, color: "text-primary" },
            { label: "Discounts Given", value: summary.totalDiscounts, sub: "Senior / PWD", icon: Percent, color: "text-amber-500" },
            { label: "Refunds", value: summary.totalRefunds, sub: "Returned orders", icon: ArrowDownLeft, color: "text-red-500" },
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

        {/* ── Payment Breakdown ── */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Payment Breakdown</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Cash", value: summary.cashSales, icon: Banknote },
              { label: "GCash", value: summary.gcashSales, icon: Smartphone },
              { label: "Split", value: summary.splitSales, icon: CreditCard },
            ].map(({ label, value, icon: Icon }) => {
              const pct = summary.grossSales > 0 ? (value / summary.grossSales) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-lg font-bold">{fmtP(value)}</p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% of total</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Hourly Sales ── */}
        {selectedPeriod === "today" && summary.hourlySales.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Hourly Sales</h3>
            </div>
            <div className="space-y-2.5">
              {summary.hourlySales.map((hour) => {
                const max = Math.max(...summary.hourlySales.map((h) => h.sales));
                const pct = max > 0 ? (hour.sales / max) * 100 : 0;
                return (
                  <div key={hour.hour} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12 text-right">{hour.hour}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right">{fmtP(hour.sales)}</span>
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

      {/* ── Pay Out Modal ── */}
      {showCashOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">Pay Out</h3>
              <button onClick={() => setShowCashOutModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Available: </span>
                <span className="font-bold">{fmtP(drawerBalance)}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <input
                    type="number" min="0" step="0.01" max={drawerBalance}
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-2">
              <button onClick={() => setShowCashOutModal(false)} className="flex-1 py-2.5 border border-border text-sm font-medium rounded-lg hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!cashOutAmount || cashOutAmount <= 0) { toast.error("Enter a valid amount"); return; }
                  if (cashOutAmount > drawerBalance) { toast.error("Insufficient cash in drawer"); return; }
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

      <AdminPinModal
        open={showAdminPin}
        onOpenChange={setShowAdminPin}
        title="Admin Authorization"
        description="Enter admin PIN to authorize this pay out."
        onSuccess={handleCashOut}
      />

      {showXReportModal && (
        <XReportModal
          session={session}
          summary={summary}
          settings={{
            ...settings, // We will just mock settings if it's not exported from useReceiptSettings properly, wait, useReceiptSettings returns `settings`. Wait, does useReceiptSettings export settings? Let's check.
          }}
          expectedCash={drawerBalance}
          onClose={() => setShowXReportModal(false)}
        />
      )}
    </div>
  );
}