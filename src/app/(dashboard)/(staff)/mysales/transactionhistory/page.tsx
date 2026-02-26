"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { useReceiptSettings } from '@/hooks/useReceiptSettings'
import {
  Search, Download, Printer, RefreshCw,
  CheckCircle2, XCircle, AlertCircle,
  DollarSign, Smartphone, Receipt, TrendingUp, FileText,
  ArrowLeft, ArrowRight, X, CreditCard, ChevronUp, ChevronDown,
} from 'lucide-react'

interface TransactionItem {
  name: string
  quantity: number
  price: number
  hasDiscount?: boolean
}

interface Transaction {
  _id: string
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
  timestamp: string
  orderType: 'dine-in' | 'takeaway'
  tableNumber?: string
  seniorPwdIds?: string[]
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  success: boolean
  data: {
    payments: Transaction[]
    pagination: { total: number; page: number; limit: number; pages: number }
  }
  error?: string
}

const DISCOUNT_RATE = 0.2

const History = () => {
  const { settings } = useReceiptSettings()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPayment, setFilterPayment] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 1 })
  const [stats, setStats] = useState({
    totalSales: 0, totalTransactions: 0, averageTransaction: 0,
    cashSales: 0, gcashSales: 0, splitSales: 0,
  })

  useEffect(() => { fetchTransactions() }, [currentPage])
  useEffect(() => { if (transactions.length > 0) calculateStats() }, [transactions])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?page=${currentPage}&limit=50`)
      if (!res.ok) throw new Error('Failed to fetch')
      const result: ApiResponse = await res.json()
      if (result.success && result.data) {
        setTransactions(result.data.payments)
        setPagination(result.data.pagination)
        setTotalTransactions(result.data.pagination.total)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const calculateStats = () => {
    const completed = transactions.filter(t => t.status === 'completed')
    const totalSales = completed.reduce((s, t) => s + t.total, 0)
    setStats({
      totalSales, totalTransactions: completed.length,
      averageTransaction: completed.length ? totalSales / completed.length : 0,
      cashSales: completed.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.total, 0),
      gcashSales: completed.filter(t => t.paymentMethod === 'gcash').reduce((s, t) => s + t.total, 0),
      splitSales: completed.filter(t => t.paymentMethod === 'split').reduce((s, t) => s + t.total, 0),
    })
  }

  const getDateFilter = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    switch (dateRange) {
      case 'today': return { start: today.toISOString(), end: now.toISOString() }
      case 'week': return { start: new Date(today.getTime() - 7 * 86400000).toISOString(), end: now.toISOString() }
      case 'month': return { start: new Date(today.getTime() - 30 * 86400000).toISOString(), end: now.toISOString() }
      case 'custom': return { start: customStartDate ? new Date(customStartDate).toISOString() : null, end: customEndDate ? new Date(customEndDate).toISOString() : null }
      default: return null
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || t.cashier?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus
    const matchesPayment = filterPayment === 'all' || t.paymentMethod === filterPayment
    const df = getDateFilter()
    const d = new Date(t.timestamp || t.createdAt)
    const matchesDate = !df?.start || !df?.end ? true : d >= new Date(df.start) && d <= new Date(df.end)
    return matchesSearch && matchesStatus && matchesPayment && matchesDate
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      const da = new Date(a.timestamp || a.createdAt).getTime()
      const db = new Date(b.timestamp || b.createdAt).getTime()
      return sortOrder === 'asc' ? da - db : db - da
    }
    if (sortBy === 'amount') return sortOrder === 'asc' ? a.total - b.total : b.total - a.total
    if (sortBy === 'name') return sortOrder === 'asc'
      ? (a.customerName || '').localeCompare(b.customerName || '')
      : (b.customerName || '').localeCompare(a.customerName || '')
    return 0
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)

  const fmt = (n: number) => `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  const formatDate = (s: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s))
  const formatShortDate = (d: Date) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)

  const handlePrint = useCallback((transaction: Transaction) => {
    if (!settings) return
    setIsPrinting(true)
    const is58mm = settings.receiptWidth === '58mm'
    const dash = '-'.repeat(is58mm ? 24 : 32)
    const discountTotal = transaction.discountTotal ?? transaction.discount ?? 0
    const tempDiv = document.createElement('div')
    tempDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px;'
    tempDiv.innerHTML = `<div>
      ${settings.showLogo && settings.logoPreview ? `<div class="text-center mb-1"><img src="${settings.logoPreview}" style="height:${settings.logoSize||'48px'};object-fit:contain;margin:0 auto;"/></div>` : ''}
      ${settings.sections?.storeName?.header && !settings.sections?.storeName?.disabled ? `<div class="text-center font-bold mb-1">${settings.businessName||''}</div>` : ''}
      ${settings.sections?.locationAddress?.header && !settings.sections?.locationAddress?.disabled && settings.locationAddress ? `<div class="text-center mb-1">${settings.locationAddress}</div>` : ''}
      ${settings.sections?.phoneNumber?.header && !settings.sections?.phoneNumber?.disabled && settings.phoneNumber ? `<div class="text-center mb-1">${settings.phoneNumber}</div>` : ''}
      <div class="text-center mb-1">${dash}</div>
      <div class="mb-1">
        <div class="flex justify-between"><span>Order #:</span><span>${transaction.orderNumber}</span></div>
        <div class="flex justify-between"><span>Date:</span><span>${formatDate(transaction.timestamp||transaction.createdAt)}</span></div>
        <div class="flex justify-between"><span>Cashier:</span><span>${transaction.cashier}</span></div>
        <div class="flex justify-between"><span>Customer:</span><span>${transaction.customerName}</span></div>
        <div class="flex justify-between"><span>Type:</span><span>${transaction.orderType?.toUpperCase()||'N/A'}</span></div>
        ${transaction.tableNumber ? `<div class="flex justify-between"><span>Table:</span><span>${transaction.tableNumber}</span></div>` : ''}
        ${transaction.seniorPwdIds?.length ? `<div>Senior/PWD IDs: ${transaction.seniorPwdIds.join(', ')}</div>` : ''}
      </div>
      <div class="text-center mb-1">${dash}</div>
      <div class="mb-1">
        <div class="flex justify-between font-bold mb-1"><span>Item</span><span>Qty Amount</span></div>
        ${transaction.items.map(item => { const dp = item.hasDiscount ? item.price*(1-DISCOUNT_RATE) : item.price; return `<div class="flex justify-between"><span>${item.name}</span><span>${item.quantity} ${fmt(dp*item.quantity)}</span></div>${item.hasDiscount?`<div style="font-size:.85em;padding-left:8px;">(20% Senior/PWD) -${fmt(item.price*item.quantity*DISCOUNT_RATE)}</div>`:''}` }).join('')}
      </div>
      <div class="text-center mb-1">${dash}</div>
      <div class="mb-1">
        <div class="flex justify-between"><span>Subtotal:</span><span>${fmt(transaction.subtotal)}</span></div>
        ${discountTotal>0?`<div class="flex justify-between"><span>Discount:</span><span>-${fmt(discountTotal)}</span></div>`:''}
        <div class="flex justify-between font-bold"><span>TOTAL:</span><span>${fmt(transaction.total)}</span></div>
      </div>
      <div class="text-center mb-1">${dash}</div>
      <div class="mb-1">
        <div class="flex justify-between"><span>Payment:</span><span>${transaction.paymentMethod.toUpperCase()}</span></div>
        ${transaction.paymentMethod==='cash'&&transaction.amountPaid?`<div class="flex justify-between font-bold"><span>CHANGE:</span><span>${fmt(transaction.change||0)}</span></div>`:''}
        ${transaction.paymentMethod==='split'&&transaction.splitPayment?`<div class="flex justify-between"><span>Cash:</span><span>${fmt(transaction.splitPayment.cash)}</span></div><div class="flex justify-between"><span>GCash:</span><span>${fmt(transaction.splitPayment.gcash)}</span></div>${(transaction.splitPayment.cash+transaction.splitPayment.gcash)>transaction.total?`<div class="flex justify-between font-bold"><span>CHANGE:</span><span>${fmt((transaction.splitPayment.cash+transaction.splitPayment.gcash)-transaction.total)}</span></div>`:''}`:''}
      </div>
      ${settings.showTaxPIN&&settings.taxPin?`<div class="text-center" style="font-size:.8em;">Tax PIN: ${settings.taxPin}</div>`:''}
      ${settings.sections?.message?.footer&&!settings.sections?.message?.disabled&&settings.receiptMessage?`<div class="text-center" style="font-size:.8em;">${settings.receiptMessage}</div>`:''}
      <div class="text-center" style="font-size:.8em;margin-top:2px;">** REPRINT **</div>
    </div>`
    document.body.appendChild(tempDiv)
    const iframe = document.createElement('iframe')
    Object.assign(iframe.style, { position:'absolute', width:'0', height:'0', border:'none', opacity:'0' })
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.write(`<!DOCTYPE html><html><head><title>Receipt</title><meta charset="utf-8"><style>@page{size:${is58mm?'58mm':'80mm'} auto;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:${is58mm?'14px':'16px'};font-weight:bold;width:${is58mm?'58mm':'80mm'};max-width:${is58mm?'58mm':'80mm'};margin:0 auto;padding:2mm;line-height:1.5}.text-center{text-align:center}.flex{display:flex}.justify-between{justify-content:space-between}.font-bold{font-weight:900}.mb-1{margin-bottom:4px}</style></head><body>${tempDiv.innerHTML}</body></html>`)
      doc.close()
      iframe.onload = () => setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => { document.body.removeChild(iframe); document.body.removeChild(tempDiv); setIsPrinting(false) }, 500) }, 200)
    } else { document.body.removeChild(tempDiv); setIsPrinting(false) }
  }, [settings])

  const handleExport = () => {
    if (!sortedTransactions.length) return
    const data = sortedTransactions.map(t => ({
      'Order #': t.orderNumber, 'Date': formatDate(t.timestamp||t.createdAt), 'Customer': t.customerName,
      'Items': t.items.length, 'Subtotal': t.subtotal, 'Discount': t.discountTotal??t.discount??0, 'Total': t.total,
      'Amount Paid': t.paymentMethod==='cash'?(t.amountPaid??t.total):t.paymentMethod==='split'&&t.splitPayment?t.splitPayment.cash+t.splitPayment.gcash:t.total,
      'Change': t.paymentMethod==='cash'?(t.change??0):t.paymentMethod==='split'&&t.splitPayment?Math.max(0,(t.splitPayment.cash+t.splitPayment.gcash)-t.total):0,
      'Payment': t.paymentMethod, 'Status': t.status, 'Cashier': t.cashier,
    }))
    const csv = [Object.keys(data[0]).join(','), ...data.map(r => Object.values(r).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `transactions_${formatShortDate(new Date())}.csv`
    a.click()
  }

  // ── Status badge using CSS var colors ──────────────────────────────────────
  const getStatusBadge = (status: string) => {
    if (status === 'completed') return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-foreground text-background">
        <CheckCircle2 className="w-3 h-3" />Completed
      </span>
    )
    if (status === 'cancelled') return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-border text-muted-foreground">
        <XCircle className="w-3 h-3" />Cancelled
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-border text-muted-foreground">
        <AlertCircle className="w-3 h-3" />Refunded
      </span>
    )
  }

  const getPaymentBadge = (method: string) => {
    const icons: Record<string, React.ReactNode> = {
      cash: <DollarSign className="w-3.5 h-3.5" />,
      gcash: <Smartphone className="w-3.5 h-3.5" />,
      split: <CreditCard className="w-3.5 h-3.5" />,
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icons[method]}<span className="capitalize">{method}</span>
      </span>
    )
  }

  if (loading && transactions.length === 0) return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8 animate-pulse space-y-6">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 md:p-8">

        {/* ── Header ── */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Sales</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Transaction History</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={fetchTransactions}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted flex items-center justify-center gap-2 font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm rounded-lg bg-foreground text-background hover:opacity-90 flex items-center justify-center gap-2 font-medium transition-opacity"
            >
              <Download className="w-4 h-4" />Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden mb-8 border border-border bg-border">
          {[
            { label: 'Total Sales', value: fmt(stats.totalSales), sub: `${stats.totalTransactions} transactions`, icon: TrendingUp },
            { label: 'Cash', value: fmt(stats.cashSales), sub: `${((stats.cashSales/stats.totalSales)*100||0).toFixed(1)}% of total`, icon: DollarSign },
            { label: 'GCash', value: fmt(stats.gcashSales), sub: `${((stats.gcashSales/stats.totalSales)*100||0).toFixed(1)}% of total`, icon: Smartphone },
            { label: 'Avg. Transaction', value: fmt(stats.averageTransaction), sub: 'Per order', icon: Receipt },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
                <Icon className="w-4 h-4 text-muted-foreground opacity-40" />
              </div>
              <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Order #, customer, cashier..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>

            {[
              { val: filterStatus, set: setFilterStatus, opts: [['all','All Status'],['completed','Completed'],['cancelled','Cancelled'],['refunded','Refunded']] },
              { val: filterPayment, set: setFilterPayment, opts: [['all','All Payments'],['cash','Cash'],['gcash','GCash'],['split','Split']] },
              { val: dateRange, set: (v: any) => setDateRange(v), opts: [['today','Today'],['week','Last 7 Days'],['month','Last 30 Days'],['custom','Custom Range'],['all','All Time']] },
            ].map((s, i) => (
              <select key={i} value={s.val} onChange={e => s.set(e.target.value)}
                className="px-3 py-2.5 rounded-lg text-sm bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors">
                {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}

            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                  className="px-3 py-2.5 rounded-lg text-sm bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <span className="text-muted-foreground text-sm">—</span>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                  className="px-3 py-2.5 rounded-lg text-sm bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            )}

            <div className="flex gap-2 ml-auto">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 rounded-lg text-sm bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="name">Customer</option>
              </select>
              <button onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-foreground">
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Order #', 'Date & Time', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Cashier', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentItems.map(t => (
                  <tr key={t._id}
                    onClick={() => { setSelectedTransaction(t); setShowDetailsModal(true) }}
                    className="cursor-pointer bg-background hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-semibold text-foreground">{t.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-muted-foreground">{formatDate(t.timestamp||t.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-foreground">{t.customerName}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-muted-foreground">{t.items.length}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-foreground">{fmt(t.total)}</span>
                    </td>
                    <td className="px-4 py-3.5">{getPaymentBadge(t.paymentMethod)}</td>
                    <td className="px-4 py-3.5">{getStatusBadge(t.status)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-muted-foreground">{t.cashier}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={e => { e.stopPropagation(); handlePrint(t) }} disabled={isPrinting}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg disabled:opacity-40 transition-colors">
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentItems.length === 0 && !loading && (
            <div className="text-center py-20 bg-background">
              <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Try adjusting your filters</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3.5 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, sortedTransactions.length)} of {totalTransactions}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => { setCurrentPage(p => p - 1); fetchTransactions() }} disabled={currentPage === 1}
                  className="px-3 py-2 border border-input rounded-lg text-sm bg-background disabled:opacity-40 hover:bg-muted flex items-center gap-1.5 transition-colors text-foreground">
                  <ArrowLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-xs text-muted-foreground px-2">{currentPage} / {pagination.pages}</span>
                <button onClick={() => { setCurrentPage(p => p + 1); fetchTransactions() }} disabled={currentPage === pagination.pages}
                  className="px-3 py-2 border border-input rounded-lg text-sm bg-background disabled:opacity-40 hover:bg-muted flex items-center gap-1.5 transition-colors text-foreground">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Details Modal ── */}
        {showDetailsModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-card text-card-foreground rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
              <div className="p-6 md:p-8">

                {/* Modal Header */}
                <div className="flex justify-between items-start mb-6 pb-5 border-b border-border">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Receipt</p>
                    <h2 className="text-xl font-bold tracking-tight font-mono">{selectedTransaction.orderNumber}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{formatDate(selectedTransaction.timestamp||selectedTransaction.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedTransaction.status)}
                    <button onClick={() => setShowDetailsModal(false)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: 'Customer', value: selectedTransaction.customerName },
                    { label: 'Cashier', value: selectedTransaction.cashier },
                    { label: 'Order Type', value: selectedTransaction.orderType + (selectedTransaction.tableNumber ? ` — Table ${selectedTransaction.tableNumber}` : '') },
                    { label: 'Payment', value: selectedTransaction.paymentMethod.toUpperCase() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                      <p className="text-sm font-medium text-foreground capitalize">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Items */}
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Items</p>
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {selectedTransaction.items.map((item, i) => {
                      const dp = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price
                      return (
                        <div key={i} className="flex justify-between items-center px-4 py-3 bg-background">
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.quantity} × {fmt(dp)}{item.hasDiscount && <span className="ml-2 opacity-50">· 20% disc</span>}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{fmt(dp * item.quantity)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="border border-border rounded-xl p-4 mb-5 space-y-2 bg-background">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>{fmt(selectedTransaction.subtotal)}</span>
                  </div>
                  {(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Discount</span><span>−{fmt(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base text-foreground">
                    <span>Total</span><span>{fmt(selectedTransaction.total)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border border-border rounded-xl p-4 mb-6 bg-background">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Payment</p>
                  <div className="space-y-2">
                    {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.amountPaid && <>
                      <div className="flex justify-between text-sm text-muted-foreground"><span>Received</span><span>{fmt(selectedTransaction.amountPaid)}</span></div>
                      <div className="flex justify-between text-sm font-semibold text-foreground"><span>Change</span><span>{fmt(selectedTransaction.change||0)}</span></div>
                    </>}
                    {selectedTransaction.paymentMethod === 'split' && selectedTransaction.splitPayment && <>
                      <div className="flex justify-between text-sm text-muted-foreground"><span>Cash</span><span>{fmt(selectedTransaction.splitPayment.cash)}</span></div>
                      <div className="flex justify-between text-sm text-muted-foreground"><span>GCash</span><span>{fmt(selectedTransaction.splitPayment.gcash)}</span></div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold text-foreground"><span>Total Paid</span><span>{fmt(selectedTransaction.splitPayment.cash+selectedTransaction.splitPayment.gcash)}</span></div>
                      {(selectedTransaction.splitPayment.cash+selectedTransaction.splitPayment.gcash) > selectedTransaction.total && (
                        <div className="flex justify-between text-sm font-semibold text-foreground"><span>Change</span><span>{fmt((selectedTransaction.splitPayment.cash+selectedTransaction.splitPayment.gcash)-selectedTransaction.total)}</span></div>
                      )}
                    </>}
                    {selectedTransaction.paymentMethod === 'gcash' && (
                      <div className="flex justify-between text-sm text-muted-foreground"><span>GCash Received</span><span>{fmt(selectedTransaction.total)}</span></div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowDetailsModal(false)}
                    className="px-5 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                    Close
                  </button>
                  <button onClick={() => handlePrint(selectedTransaction)} disabled={isPrinting}
                    className="px-5 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2 disabled:opacity-50 transition-opacity">
                    <Printer className="w-4 h-4" />{isPrinting ? 'Printing...' : 'Reprint'}
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