'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, XCircle, Save, DollarSign, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import ZReportModal from '@/app/(dashboard)/(public)/settings/receipt-setting/components/ZReportModal';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';

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

export default function CloseRegisterPage() {
  const router = useRouter();
  const { settings } = useReceiptSettings();

  const [actualCash, setActualCash]   = useState<number | ''>('');
  const [notes, setNotes]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [isClosing, setIsClosing]     = useState(false);
  const [showZReport, setShowZReport] = useState(false);

  const [session, setSession]         = useState<SessionData | null>(null);
  const [summaryData, setSummaryData] = useState<any>({});

  const [summary, setSummary] = useState({
    openingFund: 0, cashSales: 0, refunds: 0, cashOuts: 0, expectedCash: 0,
    transactions: 0, items: 0, openedAt: '', cashierName: 'Cashier',
    registerName: 'Main Register', totalSales: 0, totalDiscounts: 0,
    gcashSales: 0, splitSales: 0,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionRes    = await fetch('/api/session');
      const sessionResult = await sessionRes.json();

      if (!sessionResult.success || !sessionResult.data) {
        toast.error('No open session found');
        router.replace('/dashboard');
        return;
      }

      const dbSession: SessionData = sessionResult.data;
      setSession(dbSession);

      const sessionStart   = new Date(dbSession.openedAt);
      const sessionCashOuts = (dbSession.cashOuts || []).filter(c => new Date(c.date) >= sessionStart);
      const totalCashOuts  = sessionCashOuts.reduce((s, c) => s + c.amount, 0);

      const paymentsRes    = await fetch('/api/payments');
      const paymentsResult = await paymentsRes.json();

      if (!paymentsResult.success || !paymentsResult.data) {
        toast.error('Failed to load payments');
        return;
      }

      const payments        = paymentsResult.data.payments;
      const sessionPayments = payments.filter((p: Payment) => new Date(p.createdAt) >= sessionStart);
      const completed       = sessionPayments.filter((p: Payment) => p.status === 'completed');
      const refunded        = sessionPayments.filter((p: Payment) => p.status === 'refunded');

      const totalSales     = completed.reduce((s: number, p: Payment) => s + p.total, 0);
      const totalDiscounts = completed.reduce((s: number, p: Payment) => s + (p.discountTotal || p.discount || 0), 0);
      const cashSales      = completed.filter((p: Payment) => p.paymentMethod === 'cash').reduce((s: number, p: Payment) => s + p.total, 0);
      const gcashSales     = completed.filter((p: Payment) => p.paymentMethod === 'gcash').reduce((s: number, p: Payment) => s + p.total, 0);
      const splitSales     = completed.filter((p: Payment) => p.paymentMethod === 'split').reduce((s: number, p: Payment) => s + p.total, 0);
      const refunds        = refunded.filter((p: Payment) => p.paymentMethod === 'cash').reduce((s: number, p: Payment) => s + p.total, 0);

      const expectedCash = dbSession.openingFund + cashSales - refunds - totalCashOuts;
      const txCount      = completed.length;
      const itemCount    = completed.reduce((s: number, p: Payment) => s + (p.items?.length || 0), 0);
      const openedAtStr  = typeof dbSession.openedAt === 'string' ? dbSession.openedAt : new Date(dbSession.openedAt).toLocaleString();

      setSummary({
        openingFund: dbSession.openingFund, cashSales, refunds, cashOuts: totalCashOuts,
        expectedCash, totalSales, totalDiscounts, gcashSales, splitSales,
        transactions: txCount, items: itemCount, openedAt: openedAtStr,
        cashierName: dbSession.cashierName || 'Cashier',
        registerName: dbSession.registerName || 'Main Register',
      });

      setSummaryData({
        totalSales, netSales: totalSales - totalDiscounts - refunds,
        totalDiscounts, totalRefunds: refunds, cashEarned: cashSales,
        cashInDrawer: expectedCash, cashOuts: totalCashOuts,
        transactions: txCount, items: itemCount,
        tenders: { cash: cashSales, gcash: gcashSales, split: splitSales, credit_card: 0, pay_later: 0, online: 0, invoice: 0, e_wallet: 0, pay_in: 0 },
        discounts: { sc: completed.reduce((s: number, p: Payment) => s + (p.discountTotal || 0), 0), pwd: 0, naac: 0, solo_parent: 0, other: 0 },
        openingFund: dbSession.openingFund, actualCash: expectedCash,
      });

      setActualCash(expectedCash);
    } catch (error) {
      console.error('loadData error:', error);
      toast.error('Failed to load closing data');
    } finally {
      setLoading(false);
    }
  };

  const counted    = actualCash === '' ? 0 : actualCash;
  const difference = counted - summary.expectedCash;
  const isBalanced = Math.abs(difference) < 0.01;

  const getStatus = () => {
    if (actualCash === '') return 'incomplete';
    if (isBalanced) return 'balanced';
    return difference < 0 ? 'short' : 'over';
  };
  const status = getStatus();

  const handleCloseRegister = async () => {
    if (status === 'incomplete') { toast.error('Please enter actual cash amount'); return; }
    if (status !== 'balanced') {
      if (!confirm(`Warning: Register is ${status === 'short' ? 'SHORT' : 'OVER'} by ₱${Math.abs(difference).toFixed(2)}. Continue?`)) return;
    }

    setIsClosing(true);
    try {
      const res = await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close', actualCash: counted, expectedCash: summary.expectedCash,
          difference, closeStatus: status, closingNotes: notes,
          snapshot: {
            totalSales: summary.totalSales, netSales: summary.totalSales - summary.totalDiscounts - summary.refunds,
            totalDiscounts: summary.totalDiscounts, totalRefunds: summary.refunds,
            cashSales: summary.cashSales, gcashSales: summary.gcashSales, splitSales: summary.splitSales,
            transactions: summary.transactions, items: summary.items,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) { toast.error('Failed to close register'); setIsClosing(false); return; }
    } catch {
      toast.error('Failed to close register'); setIsClosing(false); return;
    }

    const completeSummaryData = {
      ...summaryData, actualCash: counted, expectedCash: summary.expectedCash,
      difference, closeStatus: status, openingFund: summary.openingFund,
      cashSales: summary.cashSales, refunds: summary.refunds, cashOuts: summary.cashOuts,
      gcashSales: summary.gcashSales, splitSales: summary.splitSales,
      totalSales: summary.totalSales, totalDiscounts: summary.totalDiscounts,
      transactions: summary.transactions, items: summary.items,
      cashierName: summary.cashierName, openedAt: summary.openedAt,
    };

    setSummaryData(completeSummaryData);
    setShowZReport(true);
    setIsClosing(false);
  };

  const handleZReportClose  = () => { setShowZReport(false); router.replace('/cashmanagement'); };
  const handleConfirmClose  = () => { setShowZReport(false); toast.success('Register closed successfully!'); router.replace('/cashmanagement'); };

  const fmt  = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtP = (n: number) => `₱${fmt(n)}`;

  // ── Status card using CSS vars ──────────────────────────────────────────────
  const StatusCard = () => {
    if (status === 'incomplete') return (
      <div className="bg-muted border border-border rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground flex-shrink-0" />
        <div>
          <h3 className="font-bold text-foreground text-lg">Enter Cash Amount</h3>
          <p className="text-sm text-muted-foreground">Please enter the actual cash in drawer</p>
        </div>
      </div>
    );
    if (status === 'balanced') return (
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="h-8 w-8 text-primary flex-shrink-0" />
        <div>
          <h3 className="font-bold text-primary text-lg">✓ BALANCED ✓</h3>
          <p className="text-sm text-primary/70">Expected: {fmtP(summary.expectedCash)} | Counted: {fmtP(counted)} | Diff: {fmtP(difference)}</p>
        </div>
      </div>
    );
    if (status === 'short') return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
        <XCircle className="h-8 w-8 text-destructive flex-shrink-0" />
        <div>
          <h3 className="font-bold text-destructive text-lg">⚠ SHORT by {fmtP(Math.abs(difference))}</h3>
          <p className="text-sm text-destructive/70">Expected: {fmtP(summary.expectedCash)} | Counted: {fmtP(counted)}</p>
        </div>
      </div>
    );
    // over
    return (
      <div className="bg-muted border border-border rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="h-8 w-8 text-foreground flex-shrink-0" />
        <div>
          <h3 className="font-bold text-foreground text-lg">⚠ OVER by {fmtP(difference)}</h3>
          <p className="text-sm text-muted-foreground">Expected: {fmtP(summary.expectedCash)} | Counted: {fmtP(counted)}</p>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading closing data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Register</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Close Register</h1>
              <p className="text-muted-foreground mt-1 text-sm">Enter the actual cash in drawer</p>
            </div>
            <div className="text-sm text-muted-foreground">Cashier: {summary.cashierName}</div>
          </div>
        </div>

        {/* Session Info — orange accent */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-primary/70 font-medium uppercase tracking-wide">Opened</div>
              <div className="font-bold text-foreground text-sm mt-0.5">{summary.openedAt || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-primary/70 font-medium uppercase tracking-wide">Opening Fund</div>
              <div className="font-bold text-foreground text-sm mt-0.5">{fmtP(summary.openingFund)}</div>
            </div>
            <div>
              <div className="text-xs text-primary/70 font-medium uppercase tracking-wide">Transactions</div>
              <div className="font-bold text-foreground text-sm mt-0.5">{summary.transactions}</div>
            </div>
          </div>
        </div>

        {/* Refund Warning */}
        {summary.refunds > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Refunds this session: {fmtP(summary.refunds)}</p>
              <p className="text-xs text-destructive/70">Refunds deducted from expected cash</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <StatusCard />

        {/* Cash Count */}
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />Cash Count
          </h2>
          <div className="space-y-6">

            {/* Breakdown */}
            <div className="bg-muted rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Expected Cash Calculation</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-foreground">
                  <span>Opening Fund</span>
                  <span className="font-medium">{fmtP(summary.openingFund)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Sales</span>
                  <span className="font-medium text-foreground">+{fmtP(summary.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Refunds</span>
                  <span className="font-medium text-destructive">−{fmtP(summary.refunds)}</span>
                </div>
                {summary.cashOuts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Outs</span>
                    <span className="font-medium text-destructive">−{fmtP(summary.cashOuts)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base">
                  <span>Expected Cash</span>
                  <span className="text-primary">{fmtP(summary.expectedCash)}</span>
                </div>
              </div>
            </div>

            {/* Actual Cash Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Actual Cash Counted</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                <input
                  type="number" min="0" step="0.01"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-3 text-lg border-2 rounded-xl bg-background text-foreground focus:outline-none transition-colors ${
                    actualCash !== ''
                      ? isBalanced
                        ? 'border-primary ring-1 ring-primary/30'
                        : difference < 0
                          ? 'border-destructive ring-1 ring-destructive/20'
                          : 'border-border ring-1 ring-border'
                      : 'border-input'
                  }`}
                />
              </div>
              {actualCash !== '' && (
                <div className={`mt-2 text-sm font-medium ${isBalanced ? 'text-primary' : difference < 0 ? 'text-destructive' : 'text-foreground'}`}>
                  Difference: {difference < 0 ? '−' : '+'}{fmtP(Math.abs(difference))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Closing Notes <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full rounded-xl border border-input bg-background text-foreground px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground resize-none"
            placeholder="Add any notes about this closing..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCloseRegister}
            disabled={status === 'incomplete' || isClosing}
            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              status === 'balanced'   ? 'bg-primary text-primary-foreground hover:opacity-90' :
              status === 'short'     ? 'bg-destructive text-white hover:opacity-90'           :
              status === 'over'      ? 'bg-foreground text-background hover:opacity-90'       :
                                       'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Save className="h-4 w-4" />
            {isClosing             ? 'Closing...'     :
             status === 'balanced' ? 'Close Register' :
             status === 'short'    ? 'Close (Short)'  :
             status === 'over'     ? 'Close (Over)'   : 'Enter Amount'}
          </button>
        </div>

        {/* Preview Z-Report */}
        {actualCash !== '' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setSummaryData((prev: any) => ({
                  ...prev, actualCash: counted, expectedCash: summary.expectedCash,
                  difference, closeStatus: status,
                }));
                setShowZReport(true);
              }}
              className="text-sm text-primary hover:opacity-80 flex items-center gap-1.5 mx-auto transition-opacity"
            >
              <Receipt className="h-4 w-4" />Preview Z-Report before closing
            </button>
          </div>
        )}

      </div>

      {/* Z-Report Modal */}
      {showZReport && session && (
        <ZReportModal
          session={{
            ...session,
            openedAt: summary.openedAt, cashierName: summary.cashierName,
            registerName: summary.registerName, openingFund: summary.openingFund,
            closedAt: new Date().toISOString(), actualCash: counted,
            expectedCash: summary.expectedCash, difference, closeStatus: status,
          }}
          summary={{
            ...summaryData, actualCash: counted,
            expectedCash: summary.expectedCash, difference, closeStatus: status,
          }}
          settings={settings}
          onClose={handleZReportClose}
          onConfirmClose={handleConfirmClose}
        />
      )}
    </div>
  );
}