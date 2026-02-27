'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, CreditCard, Wallet, TrendingUp,
  RefreshCw, ShoppingBag, Percent,
  Receipt, Minus, AlertCircle, X, Banknote, Smartphone, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { io as socketIO, Socket } from 'socket.io-client';
import { notifyCashUpdated } from '@/lib/notifyServer';

interface Payment {
  _id: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
  items: any[];
  discount?: number;
  discountTotal?: number;
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
  status: 'open' | 'closed';
  cashOuts: CashOut[];
}

interface DrawerBreakdown {
  openingFund: number;
  cashSales: number;
  cashRefunds: number;
  cashOuts: number;
  expectedCash: number;
}

export default function CashManagementPage() {
  const router = useRouter();
  const { isLoading: settingsLoading } = useReceiptSettings();

  const socketRef = useRef<Socket | null>(null);
  const [isLive, setIsLive] = useState(false);

  const [sessionReady, setSessionReady]= useState(false);
  const [startingFundInput, setStartingFundInput] = useState('');
  const [startingFundError, setStartingFundError] = useState('');
  const [isOpeningSession, setIsOpeningSession]   = useState(false);

  const [loading, setLoading]               = useState(true);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const [session, setSession]   = useState<SessionData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [drawer, setDrawer] = useState<DrawerBreakdown>({
    openingFund: 0, cashSales: 0, cashRefunds: 0, cashOuts: 0, expectedCash: 0,
  });

  const [summary, setSummary] = useState({
    totalSales: 0, netSales: 0, totalDiscounts: 0, totalRefunds: 0,
    cashSales: 0, gcashSales: 0, splitSales: 0,
    transactionCount: 0, itemCount: 0,
    hourlySales: [] as Array<{ hour: string; sales: number }>,
    topItems:    [] as Array<{ name: string; qty: number; amount: number }>,
  });

  const [showCashOutModal, setShowCashOutModal]   = useState(false);
  const [cashOutAmount, setCashOutAmount]         = useState<number | ''>('');
  const [cashOutReason, setCashOutReason]         = useState('');
  const [isCashingOut, setIsCashingOut]           = useState(false);
  const [showDrawerDetails, setShowDrawerDetails] = useState(false);

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = socketIO(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080', {
      auth: { userId: 'cash-management' },
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsLive(true));
    socket.on('disconnect', () => setIsLive(false));

    // Re-fetch when any payment or cash event happens
    socket.on('cash:updated', () => { loadPayments(); checkSession(); });
    socket.on('sales:updated', () => loadPayments());

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (settingsLoading) return;
    checkSession();
  }, [settingsLoading]);

  useEffect(() => {
    if (sessionReady) loadPayments();
  }, [sessionReady]);

  useEffect(() => {
    if (session) calculateAll();
  }, [payments, selectedPeriod, session]);

  const checkSession = async () => {
    try {
      const res    = await fetch('/api/session');
      const result = await res.json();
      if (result.success && result.data) {
        setSession(result.data);
        setSessionReady(true);
      } else {
        setSession(null);
        setSessionReady(false);
        setPayments([]);
        setSummary({
          totalSales: 0, netSales: 0, totalDiscounts: 0, totalRefunds: 0,
          cashSales: 0, gcashSales: 0, splitSales: 0,
          transactionCount: 0, itemCount: 0, hourlySales: [], topItems: [],
        });
        setDrawer({ openingFund: 0, cashSales: 0, cashRefunds: 0, cashOuts: 0, expectedCash: 0 });
      }
    } catch (err) {
      console.error('checkSession error:', err);
      setSessionReady(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStartingFund = async () => {
    const amount = parseFloat(startingFundInput);
    if (isNaN(amount) || amount < 0) {
      setStartingFundError('Please enter a valid amount.');
      return;
    }
    setIsOpeningSession(true);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingFund: amount }),
      });
      const result = await res.json();
      if (result.success) {
        setPayments([]);
        setSession(result.data);
        setSessionReady(true);
        toast.success(`Register opened with starting fund of ${fmtP(amount)}`);
      } else {
        toast.error('Failed to open register');
      }
    } catch {
      toast.error('Failed to open register');
    } finally {
      setIsOpeningSession(false);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res    = await fetch('/api/payments');
      const result = await res.json();
      if (result.success && result.data) setPayments(result.data.payments);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAll = () => {
    if (!session) return;
    const now          = new Date();
    const sessionStart = new Date(session.openedAt);
    const today        = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    if (selectedPeriod === 'week')       startDate = new Date(today.getTime() - 7  * 86400000);
    else if (selectedPeriod === 'month') startDate = new Date(today.getTime() - 30 * 86400000);
    else                                 startDate = today;

    const effectiveStart = startDate < sessionStart ? sessionStart : startDate;

    const filtered  = payments.filter(p => { const d = new Date(p.createdAt); return d >= effectiveStart && d <= now; });
    const completed = filtered.filter(p => p.status === 'completed');
    const refunded  = filtered.filter(p => p.status === 'refunded');

    const totalSales     = completed.reduce((s, p) => s + p.total, 0);
    const totalDiscounts = completed.reduce((s, p) => s + (p.discountTotal || p.discount || 0), 0);
    const totalRefunds   = refunded.reduce((s, p) => s + p.total, 0);
    const cashSales      = completed.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + p.total, 0);
    const gcashSales     = completed.filter(p => p.paymentMethod === 'gcash').reduce((s, p) => s + p.total, 0);
    const splitSales     = completed.filter(p => p.paymentMethod === 'split').reduce((s, p) => s + p.total, 0);
    const cashRefunds    = refunded.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + p.total, 0);

    const periodCashOuts = (session.cashOuts || [])
      .filter(c => { const d = new Date(c.date); return d >= effectiveStart && d <= now; })
      .reduce((s, c) => s + c.amount, 0);

    const expectedCash = session.openingFund + cashSales - cashRefunds - periodCashOuts;

    setDrawer({ openingFund: session.openingFund, cashSales, cashRefunds, cashOuts: periodCashOuts, expectedCash });

    let hourlySales: Array<{ hour: string; sales: number }> = [];
    if (selectedPeriod === 'today') {
      const map = new Map<string, number>();
      for (let h = 0; h < 24; h++) map.set(`${h}:00`, 0);
      completed.forEach(p => {
        const d = new Date(p.createdAt);
        if (d.toDateString() === today.toDateString()) {
          const key = `${d.getHours()}:00`;
          map.set(key, (map.get(key) || 0) + p.total);
        }
      });
      hourlySales = Array.from(map.entries()).map(([hour, sales]) => ({ hour, sales })).filter(h => h.sales > 0);
    }

    const itemMap = new Map<string, { name: string; qty: number; amount: number }>();
    completed.forEach(p => {
      p.items.forEach((item: any) => {
        const ex = itemMap.get(item.name);
        if (ex) { ex.qty += item.quantity || 1; ex.amount += item.price * (item.quantity || 1); }
        else itemMap.set(item.name, { name: item.name, qty: item.quantity || 1, amount: item.price * (item.quantity || 1) });
      });
    });

    setSummary({
      totalSales, netSales: totalSales - totalDiscounts - totalRefunds,
      totalDiscounts, totalRefunds, cashSales, gcashSales, splitSales,
      transactionCount: completed.length,
      itemCount: completed.reduce((s, p) => s + p.items.length, 0),
      hourlySales,
      topItems: Array.from(itemMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([checkSession(), loadPayments()]).finally(() => setIsRefreshing(false));
  };

  const handleCashOut = async () => {
    if (!cashOutAmount || cashOutAmount <= 0) { toast.error('Please enter a valid amount'); return; }
    if (!cashOutReason.trim())               { toast.error('Please enter a reason');        return; }
    if (cashOutAmount > drawer.expectedCash) { toast.error('Insufficient cash in drawer');  return; }

    setIsCashingOut(true);
    try {
      const res = await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cash_out', amount: cashOutAmount, reason: cashOutReason }),
      });
      const result = await res.json();
      if (result.success) {
        setSession(result.data);
        toast.success(`Cash out of ${fmtP(cashOutAmount as number)} recorded`);
        await notifyCashUpdated();
        setCashOutAmount(''); setCashOutReason(''); setShowCashOutModal(false);
      } else { toast.error('Failed to record cash out'); }
    } catch { toast.error('Failed to record cash out'); }
    finally { setIsCashingOut(false); }
  };

  const fmt  = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtP = (n: number) => `₱${fmt(n)}`;

  // ─── Open Register Gate ───────────────────────────────────────────────────
  if (!settingsLoading && !loading && !sessionReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card text-card-foreground rounded-2xl shadow-xl border border-border overflow-hidden">
            {/* Card Header */}
            <div className="bg-primary text-primary-foreground p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-foreground/20 rounded-full mb-3">
                <Wallet className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">Open Register</h2>
              <p className="text-sm mt-1 opacity-60">Enter the starting fund to begin</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Starting Fund Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">₱</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00" autoFocus
                    value={startingFundInput}
                    onChange={e => { setStartingFundInput(e.target.value); setStartingFundError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleConfirmStartingFund()}
                    className={`w-full pl-10 pr-4 py-3 text-xl font-bold border-2 rounded-xl bg-background text-foreground focus:outline-none transition-colors ${
                      startingFundError
                        ? 'border-destructive focus:border-destructive'
                        : 'border-input focus:border-primary'
                    }`}
                  />
                </div>
                {startingFundError && (
                  <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />{startingFundError}
                  </p>
                )}
              </div>

              {/* Quick amounts section REMOVED */}

              <div className="bg-muted border border-border rounded-xl p-3 text-xs text-muted-foreground flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-foreground" />
                <span>The starting fund is the cash in the drawer before sales begin. You may enter ₱0 if no opening cash is being added.</span>
              </div>

              <button
                onClick={handleConfirmStartingFund}
                disabled={isOpeningSession}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <CheckCircle className="h-5 w-5" />
                {isOpeningSession ? 'Opening...' : 'Open Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading cash management data...</p>
        </div>
      </div>
    );
  }

  // ─── Main Page ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Register</p>
              <h1 className="text-2xl font-bold text-foreground">Cash Management</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Starting Fund: {fmtP(session?.openingFund ?? 0)}
                {session?.openedAt && (
                  <span className="ml-2 text-xs opacity-60">· Since {new Date(session.openedAt).toLocaleTimeString()}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Status pill with live indicator */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                session?.status === 'open'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {session?.status === 'open' ? 'OPEN' : 'CLOSED'}
              </div>
              <button onClick={handleRefresh} className="p-2 border border-border rounded-lg hover:bg-muted transition-colors">
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Summary Card — orange */}
        <div className="bg-primary text-primary-foreground rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 opacity-70" />
              <div>
                <p className="text-sm opacity-60 uppercase tracking-widest">Cash in Drawer</p>
                <p className="text-3xl font-black">{fmtP(drawer.expectedCash)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDrawerDetails(!showDrawerDetails)}
              className="px-3 py-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg text-sm transition-colors"
            >
              {showDrawerDetails ? 'Hide' : 'Details'}
            </button>
          </div>
          {showDrawerDetails && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-primary-foreground/20">
              <div><p className="text-xs opacity-60">Starting Fund</p><p className="font-bold text-lg">{fmtP(drawer.openingFund)}</p></div>
              <div><p className="text-xs opacity-60">+ Cash Sales</p><p className="font-bold text-lg">{fmtP(drawer.cashSales)}</p></div>
              <div><p className="text-xs opacity-60">- Cash Refunds</p><p className="font-bold text-lg">{fmtP(drawer.cashRefunds)}</p></div>
              <div><p className="text-xs opacity-60">- Cash Outs</p><p className="font-bold text-lg">{fmtP(drawer.cashOuts)}</p></div>
            </div>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }].map(p => (
            <button key={p.id} onClick={() => setSelectedPeriod(p.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedPeriod === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >{p.label}</button>
          ))}
        </div>

        {/* Sales Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Gross Sales',     value: summary.totalSales,     icon: TrendingUp, sub: null },
            { label: 'Net Sales',       value: summary.netSales,       icon: DollarSign, sub: 'After discounts & refunds' },
            { label: 'Total Discounts', value: summary.totalDiscounts, icon: Percent,    sub: null },
            { label: 'Total Refunds',   value: summary.totalRefunds,   icon: Minus,      sub: null },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-card-foreground">{fmtP(value)}</p>
                  {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Cash Sales',     value: summary.cashSales,  icon: Banknote },
            { label: 'GCash Sales',    value: summary.gcashSales, icon: Smartphone },
            { label: 'Split Payments', value: summary.splitSales, icon: CreditCard },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-muted rounded-full">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-card-foreground">{fmtP(value)}</p>
                  <p className="text-xs text-muted-foreground">{((value / (summary.totalSales || 1)) * 100).toFixed(1)}% of total</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-muted rounded-full"><ShoppingBag className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Transaction Count</p>
                <p className="text-2xl font-bold text-card-foreground">{summary.transactionCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-muted rounded-full"><Receipt className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Items Sold</p>
                <p className="text-2xl font-bold text-card-foreground">{summary.itemCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Sales */}
        {selectedPeriod === 'today' && summary.hourlySales.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Hourly Sales</h3>
            <div className="space-y-3">
              {summary.hourlySales.map(hour => {
                const max = Math.max(...summary.hourlySales.map(h => h.sales));
                const pct = max > 0 ? (hour.sales / max) * 100 : 0;
                return (
                  <div key={hour.hour}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{hour.hour}</span>
                      <span className="font-semibold text-card-foreground">{fmtP(hour.sales)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Items */}
        {summary.topItems.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Top Selling Items</h3>
            <div className="space-y-4">
              {summary.topItems.map((item, i) => (
                <div key={item.name} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-card-foreground">{item.name}</span>
                      <span className="font-semibold text-card-foreground">{fmtP(item.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.qty} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Cash Out Modal */}
        {showCashOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-card text-card-foreground rounded-xl shadow-xl border border-border">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-card-foreground">Cash Out</h3>
                <button onClick={() => setShowCashOutModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-muted border border-border rounded-lg p-3 text-sm text-foreground">
                  <p>Available in drawer: <span className="font-bold">{fmtP(drawer.expectedCash)}</span></p>
                  <p className="text-xs mt-1 text-muted-foreground">Starting Fund: {fmtP(session?.openingFund ?? 0)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                    <input
                      type="number" min="0" step="0.01" max={drawer.expectedCash}
                      value={cashOutAmount}
                      onChange={e => setCashOutAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:border-foreground focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
                  <select value={cashOutReason} onChange={e => setCashOutReason(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:border-foreground focus:outline-none transition-colors"
                  >
                    <option value="">Select a reason</option>
                    <option value="supplies">Purchase Supplies</option>
                    <option value="change">Change Fund</option>
                    <option value="expense">Store Expense</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex gap-3">
                <button onClick={() => setShowCashOutModal(false)}
                  className="flex-1 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleCashOut} disabled={isCashingOut}
                  className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {isCashingOut ? 'Saving...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}