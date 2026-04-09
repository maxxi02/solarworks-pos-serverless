'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Calendar,
  User,
  FileText,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RefundedTransaction {
  _id: string;
  orderNumber: string;
  customerName?: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  subtotal?: number;
  paymentMethod: string;
  cashier?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
  timestamp?: string;
  createdAt: string;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

const fmt = (n: number) =>
  `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function RefundReportsPage() {
  const [transactions, setTransactions] = useState<RefundedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRefunded = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments?status=refunded&limit=500&page=1');
      const json = await res.json();
      if (json.success) setTransactions(json.data?.payments ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRefunded(); }, [fetchRefunded]);

  // ── Filter by date ──────────────────────────────────────────────────────────
  const filtered = transactions.filter(t => {
    const date = new Date(t.refundedAt || t.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let inRange = true;
    if (dateFilter === 'today') inRange = date >= today;
    else if (dateFilter === 'week') inRange = date >= new Date(today.getTime() - 7 * 86400000);
    else if (dateFilter === 'month') inRange = date >= new Date(today.getTime() - 30 * 86400000);

    const q = search.toLowerCase();
    const matchesSearch = !q ||
      t.orderNumber?.toLowerCase().includes(q) ||
      t.customerName?.toLowerCase().includes(q) ||
      t.refundedBy?.toLowerCase().includes(q) ||
      t.cashier?.toLowerCase().includes(q) ||
      t.refundReason?.toLowerCase().includes(q);

    return inRange && matchesSearch;
  });

  const totalRefunded = filtered.reduce((s, t) => s + (t.total || 0), 0);
  const byStaff = filtered.reduce<Record<string, { count: number; amount: number }>>((acc, t) => {
    const name = t.refundedBy || t.cashier || 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, amount: 0 };
    acc[name].count++;
    acc[name].amount += t.total || 0;
    return acc;
  }, {});

  // ── CSV export ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    const header = ['Order #', 'Customer', 'Amount', 'Payment', 'Cashier', 'Refunded By', 'Refunded At', 'Reason'];
    const rows = filtered.map(t => [
      t.orderNumber,
      t.customerName || 'Walk-in',
      t.total.toFixed(2),
      t.paymentMethod,
      t.cashier || '—',
      t.refundedBy || '—',
      t.refundedAt ? new Date(t.refundedAt).toLocaleString('en-PH') : '—',
      `"${(t.refundReason || '—').replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refund-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <AlertCircle className="h-7 w-7 text-orange-500" />
              Refund Reports
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              All refunded transactions — track who refunded, when, and why.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchRefunded} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Refunded ({dateFilter === 'all' ? 'All Time' : dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 Days' : 'Last 30 Days'})</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{fmt(totalRefunded)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Staff Who Refunded</p>
                  <p className="text-2xl font-bold">{Object.keys(byStaff).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">staff members</p>
                </div>
                <User className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Refunded Amount</p>
                  <p className="text-2xl font-bold">
                    {filtered.length ? fmt(totalRefunded / filtered.length) : '₱0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">per transaction</p>
                </div>
                <FileText className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By Staff breakdown */}
        {Object.keys(byStaff).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Refunds by Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(byStaff)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([name, data]) => (
                    <div key={name} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
                      <div className="h-7 w-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-700 dark:text-orange-300 font-bold text-xs">
                        {name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{data.count} refund{data.count !== 1 ? 's' : ''} · {fmt(data.amount)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order, customer, staff, reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as DateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  dateFilter === f
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                {f === 'today' ? 'Today' : f === 'week' ? '7 Days' : f === 'month' ? '30 Days' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30 text-orange-400" />
                <p className="font-medium">No refunded transactions</p>
                <p className="text-sm mt-1">
                  {search || dateFilter !== 'all' ? 'Try adjusting your filters' : 'No transactions have been refunded yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8" />
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Refunded By</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Refunded At</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <>
                        <tr
                          key={t._id}
                          onClick={() => setExpandedId(expandedId === t._id ? null : t._id)}
                          className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {expandedId === t._id
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                            {t.orderNumber}
                          </td>
                          <td className="px-4 py-3">{t.customerName || 'Walk-in'}</td>
                          <td className="px-4 py-3 font-semibold text-orange-600 dark:text-orange-400">
                            {fmt(t.total)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="capitalize px-2 py-0.5 rounded-full text-xs bg-secondary">
                              {t.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{t.refundedBy || t.cashier || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              {fmtDate(t.refundedAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate" title={t.refundReason}>
                            {t.refundReason || '—'}
                          </td>
                        </tr>

                        {/* Expanded items row */}
                        {expandedId === t._id && (
                          <tr key={`${t._id}-exp`} className="bg-orange-50/40 dark:bg-orange-900/5 border-b">
                            <td colSpan={8} className="px-8 py-4">
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items in this order</p>
                                <div className="rounded-lg border divide-y overflow-hidden">
                                  {t.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm bg-background">
                                      <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {fmt(item.price)}</p>
                                      </div>
                                      <p className="font-semibold">{fmt(item.price * item.quantity)}</p>
                                    </div>
                                  ))}
                                  <div className="flex justify-between px-4 py-2.5 bg-muted/30 font-bold text-sm">
                                    <span>Total</span>
                                    <span className="text-orange-600 dark:text-orange-400">{fmt(t.total)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-6 text-xs text-muted-foreground">
                                  {t.cashier && <span>Cashier: <strong className="text-foreground">{t.cashier}</strong></span>}
                                  <span>Originally created: <strong className="text-foreground">{fmtDate(t.timestamp || t.createdAt)}</strong></span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>

                <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                  Showing {filtered.length} of {transactions.length} refunded transactions
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
