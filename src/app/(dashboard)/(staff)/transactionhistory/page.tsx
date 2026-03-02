"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { useReceiptSettings } from '@/hooks/useReceiptSettings'
import {
  Clock, Search, Printer, RefreshCw, ArrowUpDown,
  CheckCircle2, XCircle, AlertCircle, DollarSign, Smartphone, Receipt,
  TrendingUp, FileText, ArrowLeft, ArrowRight, X, CreditCard, WifiOff,
} from 'lucide-react'

interface TransactionItem {
  name: string
  quantity: number
  price: number
  hasDiscount?: boolean
}

interface Transaction {
  id: string
  orderNumber: string
  customerName: string
  items: TransactionItem[]
  subtotal: number
  discount: number
  discountTotal?: number
  total: number
  paymentMethod: 'cash' | 'gcash' | 'split'
  splitPayment?: { cash: number; gcash: number }
  amountPaid?: number
  change?: number
  status: 'completed' | 'cancelled' | 'refunded'
  cashier: string
  timestamp: Date
  orderType: 'dine-in' | 'takeaway'
  tableNumber?: string
  seniorPwdIds?: string[]
}

const DISCOUNT_RATE = 0.2

const History = () => {
  const { settings } = useReceiptSettings()

  const [transactions, setTransactions]   = useState<Transaction[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [searchTerm, setSearchTerm]       = useState('')
  const [filterStatus, setFilterStatus]   = useState<string>('all')
  const [filterPayment, setFilterPayment] = useState<string>('all')
  const [dateRange, setDateRange]         = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate]     = useState('')
  const [sortBy, setSortBy]               = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder]         = useState<'asc' | 'desc'>('desc')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal]       = useState(false)
  const [isPrinting, setIsPrinting]       = useState(false)
  const [currentPage, setCurrentPage]     = useState(1)
  const [itemsPerPage]                    = useState(10)
  const [totalCount, setTotalCount]       = useState(0)
  const [todayStats, setTodayStats] = useState({
    totalSales: 0, totalTransactions: 0, averageTransaction: 0,
    cashSales: 0, gcashSales: 0, splitSales: 0,
  })

  // ── Build query params ────────────────────────────────────────────────────
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()

    if (filterStatus !== 'all')  params.set('status', filterStatus)
    if (filterPayment !== 'all') params.set('paymentMethod', filterPayment)
    if (searchTerm.trim())       params.set('search', searchTerm.trim())

    const now   = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (dateRange === 'today') {
      params.set('startDate', today.toISOString())
      params.set('endDate',   now.toISOString())
    } else if (dateRange === 'week') {
      params.set('startDate', new Date(today.getTime() - 7  * 86400000).toISOString())
      params.set('endDate',   now.toISOString())
    } else if (dateRange === 'month') {
      params.set('startDate', new Date(today.getTime() - 30 * 86400000).toISOString())
      params.set('endDate',   now.toISOString())
    } else if (dateRange === 'custom') {
      if (customStartDate) params.set('startDate', new Date(customStartDate).toISOString())
      if (customEndDate) {
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        params.set('endDate', end.toISOString())
      }
    }
    // 'all' → no date params

    params.set('sortBy',    sortBy)
    params.set('sortOrder', sortOrder)
    params.set('page',      String(currentPage))
    params.set('limit',     String(itemsPerPage))

    return params
  }, [filterStatus, filterPayment, searchTerm, dateRange, customStartDate, customEndDate, sortBy, sortOrder, currentPage, itemsPerPage])

  // ── Fetch TODAY stats (always fixed, independent of filters) ─────────────
  const fetchTodayStats = useCallback(async () => {
    try {
      const now   = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const params = new URLSearchParams({
        startDate: today.toISOString(),
        endDate:   now.toISOString(),
        limit:     '1000',
        page:      '1',
      })
      const res  = await fetch(`/api/payments?${params.toString()}`)
      const json = await res.json()
      if (json.success && json.data?.stats) {
        setTodayStats(json.data.stats)
      }
    } catch (e) {
      console.error('Failed to fetch today stats:', e)
    }
  }, [])

  // ── Fetch from MongoDB via API ────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params   = buildQueryParams()
      const response = await fetch(`/api/payments?${params.toString()}`)
      const json     = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || `Server error: ${response.status}`)
      }

      // Shape: { success, data: { payments, pagination, stats } }
      const { payments, pagination } = json.data

      // Normalise: map _id → id and parse timestamp strings
      const normalised: Transaction[] = (payments ?? []).map((t: any) => ({
        ...t,
        id:        t._id?.toString() ?? t.id,
        timestamp: new Date(t.timestamp ?? t.createdAt),
      }))

      setTransactions(normalised)
      setTotalCount(pagination?.total ?? normalised.length)
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err)
      setError(err.message || 'Failed to load transactions from the database.')
      setTransactions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams])

  // Refetch on filter/sort/page change
  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Fetch today stats once on mount (and after each transaction load to stay fresh)
  useEffect(() => { fetchTodayStats() }, [fetchTodayStats, fetchTransactions])

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) },
    [filterStatus, filterPayment, searchTerm, dateRange, customStartDate, customEndDate, sortBy, sortOrder])

  // ── Derived values ────────────────────────────────────────────────────────
  const totalPages       = Math.ceil(totalCount / itemsPerPage)
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage + 1
  const indexOfLastItem  = Math.min(currentPage * itemsPerPage, totalCount)

  const fmt         = (n: number) => `₱${n.toFixed(2)}`
  const formatDate  = (d: Date) =>
    new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
  const formatShort = (d: Date) =>
    new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)

  // ── Reprint receipt ───────────────────────────────────────────────────────
  const handlePrint = useCallback((transaction: Transaction) => {
    if (!settings) return
    setIsPrinting(true)

    const is58mm       = settings.receiptWidth === '58mm'
    const dash         = '-'.repeat(is58mm ? 24 : 32)
    const discountTotal = transaction.discountTotal ?? transaction.discount ?? 0

    const tempDiv = document.createElement('div')
    tempDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px;'
    tempDiv.innerHTML = `
      <div>
        ${settings.showLogo && settings.logoPreview ? `<div class="text-center mb-1"><img src="${settings.logoPreview}" style="height:${settings.logoSize||'48px'};object-fit:contain;margin:0 auto;" /></div>` : ''}
        ${settings.sections?.storeName?.header    && !settings.sections?.storeName?.disabled    && settings.businessName    ? `<div class="text-center font-bold mb-1">${settings.businessName}</div>` : ''}
        ${settings.sections?.locationAddress?.header && !settings.sections?.locationAddress?.disabled && settings.locationAddress ? `<div class="text-center mb-1">${settings.locationAddress}</div>` : ''}
        ${settings.sections?.phoneNumber?.header  && !settings.sections?.phoneNumber?.disabled  && settings.phoneNumber    ? `<div class="text-center mb-1">${settings.phoneNumber}</div>` : ''}
        <div class="text-center mb-1">${dash}</div>
        <div class="mb-1">
          <div class="flex justify-between"><span>Order #:</span><span>${transaction.orderNumber}</span></div>
          <div class="flex justify-between"><span>Date:</span><span>${formatDate(transaction.timestamp)}</span></div>
          <div class="flex justify-between"><span>Cashier:</span><span>${transaction.cashier}</span></div>
          <div class="flex justify-between"><span>Customer:</span><span>${transaction.customerName}</span></div>
          <div class="flex justify-between"><span>Type:</span><span>${transaction.orderType?.toUpperCase()}</span></div>
          ${transaction.tableNumber ? `<div class="flex justify-between"><span>Table:</span><span>${transaction.tableNumber}</span></div>` : ''}
          ${transaction.seniorPwdIds?.length ? `<div>Senior/PWD IDs: ${transaction.seniorPwdIds.join(', ')}</div>` : ''}
        </div>
        <div class="text-center mb-1">${dash}</div>
        <div class="mb-1">
          <div class="flex justify-between font-bold mb-1"><span>Item</span><span>Qty Amount</span></div>
          ${transaction.items.map(item => {
            const dp = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price
            return `
              <div class="flex justify-between"><span>${item.name}</span><span>${item.quantity} ${fmt(dp * item.quantity)}</span></div>
              ${item.hasDiscount ? `<div class="flex justify-between" style="font-size:0.85em;padding-left:8px;"><span>(20% Senior/PWD)</span><span>-${fmt(item.price * item.quantity * DISCOUNT_RATE)}</span></div>` : ''}`
          }).join('')}
        </div>
        <div class="text-center mb-1">${dash}</div>
        <div class="mb-1">
          <div class="flex justify-between"><span>Subtotal:</span><span>${fmt(transaction.subtotal)}</span></div>
          ${discountTotal > 0 ? `<div class="flex justify-between"><span>Discount:</span><span>-${fmt(discountTotal)}</span></div>` : ''}
          <div class="flex justify-between font-bold mt-1"><span>TOTAL:</span><span>${fmt(transaction.total)}</span></div>
        </div>
        <div class="text-center mb-1">${dash}</div>
        <div class="mb-1">
          <div class="flex justify-between mb-1"><span>Payment:</span><span>${transaction.paymentMethod.toUpperCase()}</span></div>
          ${transaction.paymentMethod === 'cash' && transaction.amountPaid != null ? `
            <div class="text-right font-bold">${fmt(transaction.amountPaid)}</div>
            <div class="text-right">${fmt(transaction.total)}</div>
            <div style="border-top:1px dashed currentColor;margin:2px 0;opacity:0.3;"></div>
            <div class="flex justify-between font-bold"><span>CHANGE:</span><span>${fmt(transaction.change || 0)}</span></div>` : ''}
          ${transaction.paymentMethod === 'split' && transaction.splitPayment ? `
            <div class="flex justify-between"><span>Cash:</span><span>${fmt(transaction.splitPayment.cash)}</span></div>
            <div class="flex justify-between"><span>GCash:</span><span>${fmt(transaction.splitPayment.gcash)}</span></div>
            <div style="border-top:1px dashed currentColor;margin:2px 0;opacity:0.3;"></div>
            <div class="text-right font-bold">${fmt(transaction.splitPayment.cash + transaction.splitPayment.gcash)}</div>
            ${(transaction.splitPayment.cash + transaction.splitPayment.gcash) > transaction.total
              ? `<div class="flex justify-between font-bold"><span>CHANGE:</span><span>${fmt((transaction.splitPayment.cash + transaction.splitPayment.gcash) - transaction.total)}</span></div>`
              : ''}` : ''}
          ${transaction.paymentMethod === 'gcash' ? `<div class="flex justify-between"><span>GCash Received:</span><span>${fmt(transaction.total)}</span></div>` : ''}
        </div>
        ${settings.sections?.barcode?.header && !settings.sections?.barcode?.disabled ? `<div class="text-center" style="font-size:0.8em;">[BARCODE: ${transaction.orderNumber}]</div>` : ''}
        ${settings.showBusinessHours && settings.businessHours ? `<div class="text-center" style="font-size:0.8em;">${settings.businessHours}</div>` : ''}
        ${settings.showTaxPIN && settings.taxPin ? `<div class="text-center" style="font-size:0.8em;">Tax PIN: ${settings.taxPin}</div>` : ''}
        ${settings.sections?.message?.footer && !settings.sections?.message?.disabled && settings.receiptMessage ? `<div class="text-center" style="font-size:0.8em;">${settings.receiptMessage}</div>` : ''}
        <div class="text-center" style="font-size:0.8em;margin-top:2px;">** REPRINT **</div>
      </div>`
    document.body.appendChild(tempDiv)

    const iframe = document.createElement('iframe')
    Object.assign(iframe.style, { position: 'absolute', width: '0', height: '0', border: 'none', opacity: '0' })
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.write(`<!DOCTYPE html><html><head>
        <title>Receipt - ${transaction.orderNumber}</title>
        <meta charset="utf-8">
        <style>
          @page { size: ${is58mm ? '58mm' : '80mm'} auto; margin: 0; }
          * { margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact; }
          body { font-family:'Courier New',monospace;font-size:${is58mm ? '14px' : '16px'};font-weight:bold;
            width:${is58mm ? '58mm' : '80mm'};max-width:${is58mm ? '58mm' : '80mm'};margin:0 auto;padding:2mm;line-height:1.5; }
          .text-center{text-align:center}.text-right{text-align:right}
          .flex{display:flex;text-align:left}.justify-between{justify-content:space-between}
          .font-bold,strong{font-weight:900}.mb-1{margin-bottom:4px}.mt-1{margin-top:4px}
        </style></head><body>${tempDiv.innerHTML}</body></html>`)
      doc.close()
      iframe.onload = () => setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          document.body.removeChild(tempDiv)
          setIsPrinting(false)
        }, 500)
      }, 200)
    } else {
      document.body.removeChild(tempDiv)
      setIsPrinting(false)
    }
  }, [settings])


  // ── Badges / icons ────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    if (status === 'completed') return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />Completed
      </span>
    )
    if (status === 'cancelled') return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100/80 text-destructive dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="w-3 h-3 mr-1" />Cancelled
      </span>
    )
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <AlertCircle className="w-3 h-3 mr-1" />Refunded
      </span>
    )
  }

  const getPaymentIcon = (method: string) => {
    if (method === 'cash')  return <DollarSign className="w-4 h-4" />
    if (method === 'gcash') return <Smartphone className="w-4 h-4" />
    return <CreditCard className="w-4 h-4" />
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6" />Transaction History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage all your sales transactions</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchTransactions}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load transactions</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
              <button onClick={fetchTransactions} className="mt-2 text-sm text-destructive/90 underline hover:text-destructive">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Today's Sales</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(todayStats.totalSales)}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{todayStats.totalTransactions} transactions</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Today's Cash</span>
              <DollarSign className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(todayStats.cashSales)}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {((todayStats.cashSales / (todayStats.totalSales || 1)) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Today's GCash</span>
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(todayStats.gcashSales)}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {((todayStats.gcashSales / (todayStats.totalSales || 1)) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Today's Avg. Transaction</span>
              <Receipt className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{fmt(todayStats.averageTransaction)}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Per transaction</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input type="text" placeholder="Search by order #, customer, or cashier..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>

            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All Payments</option>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="split">Split</option>
            </select>

            <select value={dateRange} onChange={e => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
              <option value="all">All Time</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex gap-2 items-center">
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                <span className="text-muted-foreground">to</span>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            )}

            <div className="flex gap-2">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="name">Sort by Customer</option>
              </select>
              <button onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-border rounded-lg hover:bg-muted/50">
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-primary' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Order #','Date & Time','Customer','Items','Total','Amount Paid','Change','Payment','Status','Cashier'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map(t => {
                  let amountPaid = t.total, change = 0
                  if (t.paymentMethod === 'cash' && t.amountPaid != null) {
                    amountPaid = t.amountPaid; change = t.change || 0
                  } else if (t.paymentMethod === 'split' && t.splitPayment) {
                    amountPaid = t.splitPayment.cash + t.splitPayment.gcash
                    change     = Math.max(0, amountPaid - t.total)
                  }
                  return (
                    <tr
                      key={t.id}
                      onClick={() => { setSelectedTransaction(t); setShowDetailsModal(true) }}
                      className="hover:bg-primary/5 active:bg-primary/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{t.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(t.timestamp)}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{t.customerName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{t.items?.length ?? 0} items</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{fmt(t.total)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{fmt(amountPaid)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{change > 0 ? fmt(change) : '₱0.00'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-background text-foreground">
                          {getPaymentIcon(t.paymentMethod)}
                          <span className="capitalize">{t.paymentMethod}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{t.cashier}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && !error && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters or search term</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {indexOfFirstItem} to {indexOfLastItem} of {totalCount} transactions
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
                  className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 hover:bg-muted/50">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-border rounded-md text-sm disabled:opacity-50 hover:bg-muted/50">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Transaction Details</h2>
                    <p className="text-sm text-muted-foreground">{selectedTransaction.orderNumber}</p>
                  </div>
                  <button onClick={() => setShowDetailsModal(false)} className="text-muted-foreground/70 hover:text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="text-sm font-medium">{formatDate(selectedTransaction.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Order Type</p>
                      <p className="text-sm font-medium capitalize">
                        {selectedTransaction.orderType}
                        {selectedTransaction.tableNumber && ` — Table ${selectedTransaction.tableNumber}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="text-sm font-medium">{selectedTransaction.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cashier</p>
                      <p className="text-sm font-medium">{selectedTransaction.cashier}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">Items</h3>
                    <div className="border border-border rounded-lg divide-y">
                      {selectedTransaction.items?.map((item, i) => {
                        const dp = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price
                        return (
                          <div key={i} className="p-3 flex justify-between">
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × {fmt(dp)}
                                {item.hasDiscount && <span className="ml-2 text-muted-foreground/70">(20% disc)</span>}
                              </p>
                            </div>
                            <p className="text-sm font-medium">{fmt(dp * item.quantity)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{fmt(selectedTransaction.subtotal)}</span>
                    </div>
                    {(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount:</span>
                        <span>-{fmt(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0)}</span>
                      </div>
                    )}
                    <div className="border-t border-border my-2" />
                    <div className="flex justify-between font-bold">
                      <span>TOTAL:</span>
                      <span className="text-lg">{fmt(selectedTransaction.total)}</span>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">Payment Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="font-medium capitalize flex items-center gap-1">
                          {getPaymentIcon(selectedTransaction.paymentMethod)}
                          {selectedTransaction.paymentMethod}
                        </span>
                      </div>
                      {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.amountPaid != null && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount Received:</span>
                            <span className="font-medium">{fmt(selectedTransaction.amountPaid)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>Change:</span>
                            <span>{fmt(selectedTransaction.change || 0)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground/70 text-right">
                            {fmt(selectedTransaction.amountPaid)} - {fmt(selectedTransaction.total)} = {fmt(selectedTransaction.change || 0)}
                          </div>
                        </>
                      )}
                      {selectedTransaction.paymentMethod === 'split' && selectedTransaction.splitPayment && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cash:</span>
                            <span>{fmt(selectedTransaction.splitPayment.cash)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">GCash:</span>
                            <span>{fmt(selectedTransaction.splitPayment.gcash)}</span>
                          </div>
                          <div className="border-t border-border my-2" />
                          <div className="flex justify-between text-sm font-bold">
                            <span>Total Paid:</span>
                            <span>{fmt(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash)}</span>
                          </div>
                          {(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) > selectedTransaction.total && (
                            <div className="flex justify-between text-sm font-bold">
                              <span>Change:</span>
                              <span>{fmt((selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) - selectedTransaction.total)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handlePrint(selectedTransaction)}
                    disabled={isPrinting}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-xl text-base font-semibold hover:bg-primary/90 active:bg-primary/80 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <Printer className="w-5 h-5" />
                    {isPrinting ? 'Printing...' : 'Reprint Receipt'}
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-border rounded-xl text-base font-semibold hover:bg-muted/50 active:bg-background transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default History