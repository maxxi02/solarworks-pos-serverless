'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  Clock,
  Calendar,
  RefreshCw,
  FileText,
  ShoppingBag,
  Percent,
  Receipt,
  Plus,
  Minus,
  AlertCircle,
  X,
  Banknote,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useReceiptSettings } from '@/hooks/useReceiptSettings'; // ← Import ito

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

interface SessionData {
  openingFund: number;
  openedAt: string;
  cashierName: string;
  registerName: string;
  status: 'open' | 'closed';
}

interface DrawerBreakdown {
  openingFund: number;
  cashSales: number;
  cashRefunds: number;
  cashOuts: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
}

export default function CashManagementPage() {
  const router = useRouter();
  
  // Gamitin ang useReceiptSettings hook
  const { getOpeningFund, isOpeningFundRequired, isLoading: settingsLoading } = useReceiptSettings();
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  // Session data - kukunin ang openingFund mula sa settings
  const [session, setSession] = useState<SessionData>({
    openingFund: getOpeningFund(), // ← Galing sa settings (default 2000)
    openedAt: '',
    cashierName: 'Cashier',
    registerName: 'Main Register',
    status: 'closed'
  });

  // Payments data
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Cash outs (from localStorage)
  const [cashOuts, setCashOuts] = useState<Array<{ amount: number; reason: string; date: string }>>([]);
  
  // Drawer breakdown
  const [drawer, setDrawer] = useState<DrawerBreakdown>({
    openingFund: getOpeningFund(), // ← Galing sa settings
    cashSales: 0,
    cashRefunds: 0,
    cashOuts: 0,
    expectedCash: 0
  });

  // Sales summary
  const [summary, setSummary] = useState({
    totalSales: 0,
    netSales: 0,
    totalDiscounts: 0,
    totalRefunds: 0,
    cashSales: 0,
    gcashSales: 0,
    splitSales: 0,
    transactionCount: 0,
    itemCount: 0,
    hourlySales: [] as Array<{ hour: string; sales: number }>,
    topItems: [] as Array<{ name: string; qty: number; amount: number }>
  });

  // Modal states
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<number | ''>('');
  const [cashOutReason, setCashOutReason] = useState('');
  const [showDrawerDetails, setShowDrawerDetails] = useState(false);

  // Update opening fund when settings change
  useEffect(() => {
    const openingFund = getOpeningFund();
    setSession(prev => ({ ...prev, openingFund }));
    setDrawer(prev => ({ ...prev, openingFund }));
  }, [getOpeningFund]); // ← Mag-uupdate kapag nagbago ang settings

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Recalculate when payments change
  useEffect(() => {
    calculateAll();
  }, [payments, cashOuts, selectedPeriod, session.openingFund]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load session from localStorage (kung meron)
      const savedSession = localStorage.getItem('pos_session');
      if (savedSession) {
        const sess = JSON.parse(savedSession);
        setSession(prev => ({
          ...prev,
          ...sess,
          openingFund: sess.openingFund || getOpeningFund() // Gamitin ang settings kung walang saved
        }));
      } else {
        // Walang saved session, gamitin ang settings
        setSession(prev => ({
          ...prev,
          openingFund: getOpeningFund(),
          openedAt: new Date().toLocaleString(),
          status: 'open'
        }));
      }

      // Load cash outs from localStorage
      const savedCashOuts = localStorage.getItem('pos_cash_outs');
      if (savedCashOuts) {
        setCashOuts(JSON.parse(savedCashOuts));
      }

      // Fetch payments from API
      const response = await fetch('/api/payments');
      const result = await response.json();
      
      if (result.success && result.data) {
        setPayments(result.data.payments);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAll = () => {
    // Filter by date based on selected period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate = today;
    if (selectedPeriod === 'week') {
      startDate = new Date(today.getTime() - 7 * 86400000);
    } else if (selectedPeriod === 'month') {
      startDate = new Date(today.getTime() - 30 * 86400000);
    }

    // Filter payments by date range
    const filtered = payments.filter(p => {
      const date = new Date(p.createdAt);
      return date >= startDate && date <= now;
    });

    // Separate completed and refunded
    const completed = filtered.filter(p => p.status === 'completed');
    const refunded = filtered.filter(p => p.status === 'refunded');

    // Calculate totals
    const totalSales = completed.reduce((sum, p) => sum + p.total, 0);
    const totalDiscounts = completed.reduce((sum, p) => sum + (p.discountTotal || p.discount || 0), 0);
    const totalRefunds = refunded.reduce((sum, p) => sum + p.total, 0);
    
    // Payment method breakdown
    const cashSales = completed
      .filter(p => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.total, 0);
    
    const gcashSales = completed
      .filter(p => p.paymentMethod === 'gcash')
      .reduce((sum, p) => sum + p.total, 0);
    
    const splitSales = completed
      .filter(p => p.paymentMethod === 'split')
      .reduce((sum, p) => sum + p.total, 0);

    // Cash refunds (refunds that were given as cash)
    const cashRefunds = refunded
      .filter(p => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.total, 0);

    // Total cash outs for the period
    const periodCashOuts = cashOuts
      .filter(c => {
        const date = new Date(c.date);
        return date >= startDate && date <= now;
      })
      .reduce((sum, c) => sum + c.amount, 0);

    // Expected cash in drawer = opening fund + cash sales - cash refunds - cash outs
    // Para sa 'today' lang ginagamit ang opening fund
    const expectedCash = (selectedPeriod === 'today' ? session.openingFund : 0) + cashSales - cashRefunds - periodCashOuts;

    // Update drawer breakdown
    setDrawer({
      openingFund: selectedPeriod === 'today' ? session.openingFund : 0,
      cashSales,
      cashRefunds,
      cashOuts: periodCashOuts,
      expectedCash
    });

    // Calculate hourly sales (for today only)
    let hourlySales: Array<{ hour: string; sales: number }> = [];
    if (selectedPeriod === 'today') {
      const hourlyMap = new Map<string, number>();
      for (let hour = 0; hour < 24; hour++) {
        hourlyMap.set(`${hour}:00`, 0);
      }

      completed.forEach(p => {
        const date = new Date(p.createdAt);
        if (date.toDateString() === today.toDateString()) {
          const hour = date.getHours();
          const key = `${hour}:00`;
          hourlyMap.set(key, (hourlyMap.get(key) || 0) + p.total);
        }
      });

      hourlySales = Array.from(hourlyMap.entries())
        .map(([hour, sales]) => ({ hour, sales }))
        .filter(h => h.sales > 0);
    }

    // Calculate top items
    const itemMap = new Map<string, { name: string; qty: number; amount: number }>();
    
    completed.forEach(p => {
      p.items.forEach((item: any) => {
        const key = item.name;
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.qty += item.quantity || 1;
          existing.amount += (item.price * (item.quantity || 1));
        } else {
          itemMap.set(key, {
            name: item.name,
            qty: item.quantity || 1,
            amount: item.price * (item.quantity || 1)
          });
        }
      });
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    setSummary({
      totalSales,
      netSales: totalSales - totalDiscounts - totalRefunds,
      totalDiscounts,
      totalRefunds,
      cashSales,
      gcashSales,
      splitSales,
      transactionCount: completed.length,
      itemCount: completed.reduce((sum, p) => sum + p.items.length, 0),
      hourlySales,
      topItems
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData().finally(() => setIsRefreshing(false));
  };

  const handlePeriodChange = (period: 'today' | 'week' | 'month') => {
    setSelectedPeriod(period);
  };

  const handleCashOut = async () => {
    if (!cashOutAmount || cashOutAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!cashOutReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }

    // Check if enough cash in drawer
    if (cashOutAmount > drawer.expectedCash) {
      toast.error('Insufficient cash in drawer');
      return;
    }

    // Save cash out
    const newCashOut = {
      amount: cashOutAmount,
      reason: cashOutReason,
      date: new Date().toISOString()
    };

    const updatedCashOuts = [...cashOuts, newCashOut];
    setCashOuts(updatedCashOuts);
    localStorage.setItem('pos_cash_outs', JSON.stringify(updatedCashOuts));

    toast.success(`Cash out of ₱${cashOutAmount.toFixed(2)} recorded: ${cashOutReason}`);
    
    setCashOutAmount('');
    setCashOutReason('');
    setShowCashOutModal(false);
  };

  const handleCloseRegister = () => {
    const hasRefundsToday = summary.totalRefunds > 0;
    
    if (hasRefundsToday) {
      toast.warning('Refunds detected today. You can still close the register.', {
        duration: 5000,
        action: {
          label: 'Continue',
          onClick: () => router.push('/close-register')
        }
      });
    } else {
      router.push('/close-register');
    }
  };

  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtP = (n: number) => `₱${fmt(n)}`;

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading cash management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Kita at pera sa drawer (Starting Fund: {fmtP(session.openingFund)})
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Session Status */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                session.status === 'open' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  session.status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
                {session.status === 'open' ? 'REGISTER OPEN' : 'REGISTER CLOSED'}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Summary Card - PINAKA IMPORTANTE */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8" />
              <div>
                <p className="text-purple-200 text-sm">PERA SA DRAWER</p>
                <p className="text-3xl font-black">{fmtP(drawer.expectedCash)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDrawerDetails(!showDrawerDetails)}
              className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30"
            >
              {showDrawerDetails ? 'Itago' : 'Details'}
            </button>
          </div>

          {showDrawerDetails && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-purple-400/30">
              <div>
                <p className="text-purple-200 text-xs">Starting Fund</p>
                <p className="font-bold text-lg">{fmtP(drawer.openingFund)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-xs">+ Cash Sales</p>
                <p className="font-bold text-lg text-green-300">{fmtP(drawer.cashSales)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-xs">- Cash Refunds</p>
                <p className="font-bold text-lg text-red-300">{fmtP(drawer.cashRefunds)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-xs">- Cash Outs</p>
                <p className="font-bold text-lg text-yellow-300">{fmtP(drawer.cashOuts)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' }
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => handlePeriodChange(period.id as 'today' | 'week' | 'month')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedPeriod === period.id
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Sales Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Gross Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtP(summary.totalSales)}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtP(summary.netSales)}</p>
                <p className="text-xs text-gray-400 mt-1">After discounts & refunds</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Discounts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtP(summary.totalDiscounts)}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Percent className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Refunds</p>
                <p className="text-2xl font-bold text-red-600">{fmtP(summary.totalRefunds)}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Minus className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cash Sales</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtP(summary.cashSales)}</p>
                <p className="text-xs text-gray-400">
                  {((summary.cashSales / summary.totalSales) * 100 || 0).toFixed(1)}% ng total
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">GCash Sales</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtP(summary.gcashSales)}</p>
                <p className="text-xs text-gray-400">
                  {((summary.gcashSales / summary.totalSales) * 100 || 0).toFixed(1)}% ng total
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Split Payments</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtP(summary.splitSales)}</p>
                <p className="text-xs text-gray-400">
                  {((summary.splitSales / summary.totalSales) * 100 || 0).toFixed(1)}% ng total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                <ShoppingBag className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Bilang ng Transaksyon</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.transactionCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-full">
                <Receipt className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Items na Naisang</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.itemCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Sales (for today only) */}
        {selectedPeriod === 'today' && summary.hourlySales.length > 0 && (
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Bawat Oras</h3>
            <div className="space-y-3">
              {summary.hourlySales.map((hour) => {
                const maxSales = Math.max(...summary.hourlySales.map(h => h.sales));
                const percentage = maxSales > 0 ? (hour.sales / maxSales) * 100 : 0;
                
                return (
                  <div key={hour.hour}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{hour.hour}</span>
                      <span className="font-semibold">{fmtP(hour.sales)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Items */}
        {summary.topItems.length > 0 && (
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Items</h3>
            <div className="space-y-4">
              {summary.topItems.map((item, index) => (
                <div key={item.name} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${
                    index === 0 ? 'bg-yellow-100' : 
                    index === 1 ? 'bg-gray-100' : 
                    index === 2 ? 'bg-orange-100' : 'bg-blue-100'
                  } dark:bg-gray-800 flex items-center justify-center text-xs font-bold`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                      <span className="font-semibold">{fmtP(item.amount)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.qty} units na naisang</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mabilis na Aksyon</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {session.status === 'open' && (
              <>
                <button
                  onClick={() => setShowCashOutModal(true)}
                  className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <Minus className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Mag-withdraw ng Pera</p>
                    <p className="text-xs text-gray-500">Kumuha ng pera sa drawer</p>
                  </div>
                </button>

                <button
                  onClick={handleCloseRegister}
                  className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <FileText className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Isara ang Register</p>
                    <p className="text-xs text-gray-500">End of day Z-Report</p>
                  </div>
                </button>
              </>
            )}

            <button
              onClick={() => router.push('/refunds')}
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Minus className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Mag-proseso ng Refund</p>
                <p className="text-xs text-gray-500">Ibenta ulit o ibalik ang pera</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/reports')}
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Tingnan ang Reports</p>
                <p className="text-xs text-gray-500">Daily, weekly, monthly</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Cash Out Modal */}
      {showCashOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mag-withdraw ng Pera</h3>
              <button
                onClick={() => setShowCashOutModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
                <p>Available sa drawer: <span className="font-bold">{fmtP(drawer.expectedCash)}</span></p>
                <p className="text-xs mt-1">Starting Fund: {fmtP(session.openingFund)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Halaga
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={drawer.expectedCash}
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dahilan
                </label>
                <select
                  value={cashOutReason}
                  onChange={(e) => setCashOutReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Pumili ng dahilan</option>
                  <option value="supplies">Pambili ng Supplies</option>
                  <option value="change">Pambarya</option>
                  <option value="expense">Gastos ng Store</option>
                  <option value="other">Iba pa</option>
                </select>
              </div>
              
              {cashOutReason === 'other' && (
                <div>
                  <input
                    type="text"
                    placeholder="Ilagay ang dahilan"
                    value={cashOutReason}
                    onChange={(e) => setCashOutReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowCashOutModal(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Kanselahin
              </button>
              <button
                onClick={handleCashOut}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg"
              >
                Mag-withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
