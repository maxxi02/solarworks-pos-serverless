'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, DollarSign, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import ZReportModal from '@/app/(dashboard)/(public)/settings/receipt-setting/components/ZReportModal';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { notifyRegisterClosed, notifyCashUpdated } from '@/lib/notifyServer';

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

      setActualCash('');

      setSummaryData({
        totalSales, netSales: totalSales - totalDiscounts - refunds,
        totalDiscounts, totalRefunds: refunds, cashEarned: cashSales,
        cashInDrawer: expectedCash, cashOuts: totalCashOuts,
        transactions: txCount, items: itemCount,
        tenders: { cash: cashSales, gcash: gcashSales, split: splitSales, credit_card: 0, pay_later: 0, online: 0, invoice: 0, e_wallet: 0, pay_in: 0 },
        discounts: { sc: completed.reduce((s: number, p: Payment) => s + (p.discountTotal || 0), 0), pwd: 0, naac: 0, solo_parent: 0, other: 0 },
        openingFund: dbSession.openingFund, actualCash: 0,
      });
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
    if (status === 'incomplete') { 
      toast.error('Please enter actual cash amount'); 
      return; 
    }

    setIsClosing(true);
    try {
      const res = await fetch('/api/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close', actualCash: counted, expectedCash: summary.expectedCash,
          difference, closeStatus: status, closingNotes: '',
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

      if (status === 'balanced') {
        await notifyRegisterClosed({
          cashierName: summary.cashierName,
          registerName: summary.registerName,
          closedAt: new Date().toISOString(),
        });
        await notifyCashUpdated();
      }

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

  const handleZReportClose  = () => { setShowZReport(false); router.replace('/mysales/cash-management'); };
  const handleConfirmClose  = () => { 
    setShowZReport(false); 
    toast.success('Register closed successfully!'); 
    router.replace('/mysales/cash-management'); 
  };

  const fmt  = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtP = (n: number) => `₱${fmt(n)}`;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">Loading closing data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-3 md:p-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-1">Register</p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Close Register</h1>
              <p className="text-muted-foreground mt-2 text-base">Enter the actual cash in drawer</p>
            </div>
            <div className="text-base text-muted-foreground bg-muted px-4 py-2 rounded-xl">
              {summary.cashierName}
            </div>
          </div>
        </div>

        {/* Actual Cash Input - Input na lang ang natira */}
        <div className="bg-card border-2 border-border rounded-2xl p-8 mt-4">
          <h2 className="text-2xl font-bold text-card-foreground mb-6 flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />Cash Count
          </h2>
          
          <div>
            <label className="block text-lg font-medium text-foreground mb-4">Actual Cash Counted</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl">₱</span>
              <input
                type="number" 
                min="0" 
                step="0.01"
                value={actualCash}
                onChange={e => setActualCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full pl-14 pr-5 py-5 text-2xl border-2 rounded-2xl bg-background text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                style={{ fontSize: '1.75rem', padding: '1.25rem 1.25rem 1.25rem 3.5rem' }}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => router.back()}
            className="flex-1 py-4 border-2 border-border text-foreground text-base font-medium rounded-2xl hover:bg-muted active:bg-muted transition-colors touch-manipulation"
            style={{ minHeight: '3.5rem' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCloseRegister}
            disabled={status === 'incomplete' || isClosing}
            className={`flex-1 py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors touch-manipulation ${
              status === 'balanced'   ? 'bg-primary text-primary-foreground active:opacity-90' :
              status === 'short'     ? 'bg-destructive text-white active:opacity-90'           :
              status === 'over'      ? 'bg-foreground text-background active:opacity-90'       :
                                       'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
            style={{ minHeight: '3.5rem' }}
          >
            <Save className="h-5 w-5" />
            {isClosing ? 'Closing...' : 'Close Register'}
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
              className="text-base text-primary active:opacity-80 flex items-center justify-center gap-2 mx-auto transition-opacity touch-manipulation p-3"
            >
              <Receipt className="h-5 w-5" />Preview Z-Report before closing
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