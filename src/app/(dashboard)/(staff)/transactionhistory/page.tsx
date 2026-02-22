// "use client"
// import React, { useState, useEffect, useCallback } from 'react'
// import { useReceiptSettings } from '@/hooks/useReceiptSettings'
// import {
//   Clock,
//   Search,
//   Download,
//   Printer,
//   Eye,
//   RefreshCw,
//   ArrowUpDown,
//   CheckCircle2,
//   XCircle,
//   AlertCircle,
//   DollarSign,
//   Smartphone,
//   Receipt,
//   TrendingUp,
//   FileText,
//   ArrowLeft,
//   ArrowRight,
//   X,
//   CreditCard,
// } from 'lucide-react'

// interface TransactionItem {
//   name: string
//   quantity: number
//   price: number
//   hasDiscount?: boolean
// }

// interface Transaction {
//   id: string
//   orderNumber: string
//   customerName: string
//   items: TransactionItem[]
//   subtotal: number
//   discount: number
//   discountTotal?: number
//   total: number
//   paymentMethod: 'cash' | 'gcash' | 'split'
//   splitPayment?: { cash: number; gcash: number }
//   amountPaid?: number
//   change?: number
//   status: 'completed' | 'cancelled' | 'refunded'
//   cashier: string
//   timestamp: Date
//   orderType: 'dine-in' | 'takeaway'
//   tableNumber?: string
//   seniorPwdIds?: string[]
// }

// const DISCOUNT_RATE = 0.2

// const History = () => {
//   const { settings } = useReceiptSettings()

//   const [transactions, setTransactions] = useState<Transaction[]>([])
//   const [loading, setLoading] = useState(true)
//   const [searchTerm, setSearchTerm] = useState('')
//   const [filterStatus, setFilterStatus] = useState<string>('all')
//   const [filterPayment, setFilterPayment] = useState<string>('all')
//   const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today')
//   const [customStartDate, setCustomStartDate] = useState('')
//   const [customEndDate, setCustomEndDate] = useState('')
//   const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date')
//   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
//   const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
//   const [showDetailsModal, setShowDetailsModal] = useState(false)
//   const [isPrinting, setIsPrinting] = useState(false)
//   const [currentPage, setCurrentPage] = useState(1)
//   const [itemsPerPage] = useState(10)
//   const [stats, setStats] = useState({
//     totalSales: 0,
//     totalTransactions: 0,
//     averageTransaction: 0,
//     cashSales: 0,
//     gcashSales: 0,
//     splitSales: 0,
//   })

//   useEffect(() => { fetchTransactions() }, [])
//   useEffect(() => { calculateStats() }, [transactions])

//   const fetchTransactions = async () => {
//     setLoading(true)
//     try {
//       const response = await fetch('/api/payments')
//       if (response.ok) {
//         const data = await response.json()
//         setTransactions(data.map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })))
//       } else {
//         loadFromLocalStorage()
//       }
//     } catch {
//       loadFromLocalStorage()
//     } finally {
//       setLoading(false)
//     }
//   }

//   const loadFromLocalStorage = () => {
//     const saved = localStorage.getItem('pos_saved_orders')
//     if (saved) {
//       const parsed = JSON.parse(saved)
//       setTransactions(parsed.map((o: any) => ({
//         ...o,
//         timestamp: new Date(o.timestamp),
//         status: o.status || 'completed',
//       })))
//     }
//   }

//   const calculateStats = () => {
//     const completed = transactions.filter(t => t.status === 'completed')
//     const totalSales = completed.reduce((sum, t) => sum + t.total, 0)
//     setStats({
//       totalSales,
//       totalTransactions: completed.length,
//       averageTransaction: completed.length ? totalSales / completed.length : 0,
//       cashSales: completed.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0),
//       gcashSales: completed.filter(t => t.paymentMethod === 'gcash').reduce((sum, t) => sum + t.total, 0),
//       splitSales: completed.filter(t => t.paymentMethod === 'split').reduce((sum, t) => sum + t.total, 0),
//     })
//   }

//   const getDateFilter = () => {
//     const now = new Date()
//     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
//     switch (dateRange) {
//       case 'today': return { start: today, end: now }
//       case 'week': return { start: new Date(today.getTime() - 7 * 86400000), end: now }
//       case 'month': return { start: new Date(today.getTime() - 30 * 86400000), end: now }
//       case 'custom': return {
//         start: customStartDate ? new Date(customStartDate) : null,
//         end: customEndDate ? new Date(customEndDate) : null,
//       }
//       default: return null
//     }
//   }

//   const filteredTransactions = transactions.filter(t => {
//     const matchesSearch =
//       t.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       t.cashier.toLowerCase().includes(searchTerm.toLowerCase())
//     const matchesStatus = filterStatus === 'all' || t.status === filterStatus
//     const matchesPayment = filterPayment === 'all' || t.paymentMethod === filterPayment
//     const dateFilter = getDateFilter()
//     const matchesDate = !dateFilter?.start || !dateFilter?.end
//       ? true
//       : t.timestamp >= dateFilter.start && t.timestamp <= dateFilter.end
//     return matchesSearch && matchesStatus && matchesPayment && matchesDate
//   })

//   const sortedTransactions = [...filteredTransactions].sort((a, b) => {
//     if (sortBy === 'date') return sortOrder === 'asc' ? a.timestamp.getTime() - b.timestamp.getTime() : b.timestamp.getTime() - a.timestamp.getTime()
//     if (sortBy === 'amount') return sortOrder === 'asc' ? a.total - b.total : b.total - a.total
//     if (sortBy === 'name') return sortOrder === 'asc' ? a.customerName.localeCompare(b.customerName) : b.customerName.localeCompare(a.customerName)
//     return 0
//   })

//   const indexOfLastItem = currentPage * itemsPerPage
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage
//   const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem)
//   const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)

//   const fmt = (n: number) => `₱${n.toFixed(2)}`

//   const formatDate = (date: Date) =>
//     new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)

//   const formatShortDate = (date: Date) =>
//     new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)

//   // ——— REPRINT ———
//   const handlePrint = useCallback((transaction: Transaction) => {
//     if (!settings) return
//     setIsPrinting(true)

//     const is58mm = settings.receiptWidth === '58mm'

//     // Build a temporary receipt-content div matching ReceiptModal's DOM structure
//     const dash = '-'.repeat(is58mm ? 24 : 32)
//     const discountTotal = transaction.discountTotal ?? transaction.discount ?? 0

//     const tempDiv = document.createElement('div')
//     tempDiv.id = 'receipt-content-temp'
//     tempDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px;'
//     tempDiv.innerHTML = `
//       <div>
//         ${settings.showLogo && settings.logoPreview ? `<div class="text-center mb-1"><img src="${settings.logoPreview}" style="height:${settings.logoSize || '48px'};object-fit:contain;margin:0 auto;" /></div>` : ''}
//         ${settings.sections?.storeName?.header && !settings.sections?.storeName?.disabled ? `<div class="text-center font-bold mb-1">${settings.businessName || ''}</div>` : ''}
//         ${settings.sections?.locationAddress?.header && !settings.sections?.locationAddress?.disabled && settings.locationAddress ? `<div class="text-center mb-1 text-center">${settings.locationAddress}</div>` : ''}
//         ${settings.sections?.phoneNumber?.header && !settings.sections?.phoneNumber?.disabled && settings.phoneNumber ? `<div class="text-center mb-1">${settings.phoneNumber}</div>` : ''}
//         <div class="text-center mb-1">${dash}</div>
//         <div class="mb-1">
//           <div class="flex justify-between"><span>Order #:</span><span>${transaction.orderNumber}</span></div>
//           <div class="flex justify-between"><span>Date:</span><span>${formatDate(transaction.timestamp)}</span></div>
//           <div class="flex justify-between"><span>Cashier:</span><span>${transaction.cashier}</span></div>
//           <div class="flex justify-between"><span>Customer:</span><span>${transaction.customerName}</span></div>
//           <div class="flex justify-between"><span>Type:</span><span>${transaction.orderType.toUpperCase()}</span></div>
//           ${transaction.tableNumber ? `<div class="flex justify-between"><span>Table:</span><span>${transaction.tableNumber}</span></div>` : ''}
//           ${transaction.seniorPwdIds?.length ? `<div>Senior/PWD IDs: ${transaction.seniorPwdIds.join(', ')}</div>` : ''}
//         </div>
//         <div class="text-center mb-1">${dash}</div>
//         <div class="mb-1">
//           <div class="flex justify-between font-bold mb-1"><span>Item</span><span>Qty Amount</span></div>
//           ${transaction.items.map(item => {
//             const dp = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price
//             return `
//               <div class="flex justify-between"><span>${item.name}</span><span>${item.quantity} ${fmt(dp * item.quantity)}</span></div>
//               ${item.hasDiscount ? `<div class="flex justify-between" style="font-size:0.85em;padding-left:8px;"><span>(20% Senior/PWD)</span><span>-${fmt(item.price * item.quantity * DISCOUNT_RATE)}</span></div>` : ''}`
//           }).join('')}
//         </div>
//         <div class="text-center mb-1">${dash}</div>
//         <div class="mb-1">
//           <div class="flex justify-between"><span>Subtotal:</span><span>${fmt(transaction.subtotal)}</span></div>
//           ${discountTotal > 0 ? `<div class="flex justify-between"><span>Discount:</span><span>-${fmt(discountTotal)}</span></div>` : ''}
//           <div class="flex justify-between font-bold mt-1"><span>TOTAL:</span><span>${fmt(transaction.total)}</span></div>
//         </div>
//         <div class="text-center mb-1">${dash}</div>
//         <div class="mb-1">
//           <div class="flex justify-between mb-1"><span>Payment:</span><span>${transaction.paymentMethod.toUpperCase()}</span></div>
//           ${transaction.paymentMethod === 'cash' && transaction.amountPaid ? `
//             <div class="text-right font-bold">${fmt(transaction.amountPaid)}</div>
//             <div class="text-right">${fmt(transaction.total)}</div>
//             <div style="border-top:1px dashed currentColor;margin:2px 0;opacity:0.3;"></div>
//             <div class="flex justify-between font-bold"><span>CHANGE:</span><span>${fmt(transaction.change || 0)}</span></div>` : ''}
//           ${transaction.paymentMethod === 'split' && transaction.splitPayment ? `
//             <div class="flex justify-between"><span>Cash:</span><span>${fmt(transaction.splitPayment.cash)}</span></div>
//             <div class="flex justify-between"><span>GCash:</span><span>${fmt(transaction.splitPayment.gcash)}</span></div>
//             <div style="border-top:1px dashed currentColor;margin:2px 0;opacity:0.3;"></div>
//             <div class="text-right font-bold">${fmt(transaction.splitPayment.cash + transaction.splitPayment.gcash)}</div>
//             ${(transaction.splitPayment.cash + transaction.splitPayment.gcash) > transaction.total ? `
//               <div class="flex justify-between font-bold"><span>CHANGE:</span><span>${fmt((transaction.splitPayment.cash + transaction.splitPayment.gcash) - transaction.total)}</span></div>` : ''}` : ''}
//           ${transaction.paymentMethod === 'gcash' ? `<div class="flex justify-between"><span>GCash Received:</span><span>${fmt(transaction.total)}</span></div>` : ''}
//         </div>
//         ${settings.sections?.barcode?.header && !settings.sections?.barcode?.disabled ? `<div class="text-center" style="font-size:0.8em;">[BARCODE: ${transaction.orderNumber}]</div>` : ''}
//         ${settings.showBusinessHours && settings.businessHours ? `<div class="text-center" style="font-size:0.8em;">${settings.businessHours}</div>` : ''}
//         ${settings.showTaxPIN && settings.taxPin ? `<div class="text-center" style="font-size:0.8em;">Tax PIN: ${settings.taxPin}</div>` : ''}
//         ${settings.sections?.message?.footer && !settings.sections?.message?.disabled && settings.receiptMessage ? `<div class="text-center" style="font-size:0.8em;">${settings.receiptMessage}</div>` : ''}
//         <div class="text-center" style="font-size:0.8em;margin-top:2px;">** REPRINT **</div>
//       </div>
//     `
//     document.body.appendChild(tempDiv)

//     const iframe = document.createElement('iframe')
//     Object.assign(iframe.style, { position: 'absolute', width: '0', height: '0', border: 'none', opacity: '0' })
//     document.body.appendChild(iframe)
//     const doc = iframe.contentWindow?.document
//     if (doc) {
//       doc.write(`<!DOCTYPE html><html><head>
//         <title>Receipt - ${transaction.orderNumber}</title>
//         <meta charset="utf-8">
//         <style>
//           @page { size: ${is58mm ? '58mm' : '80mm'} auto; margin: 0; }
//           * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//           body { font-family: 'Courier New', monospace; font-size: ${is58mm ? '14px' : '16px'};
//             font-weight: bold; width: ${is58mm ? '58mm' : '80mm'}; max-width: ${is58mm ? '58mm' : '80mm'};
//             margin: 0 auto; padding: 2mm; line-height: 1.5; }
//           .text-center { text-align: center; }
//           .text-right { text-align: right; }
//           .flex { display: flex; text-align: left; }
//           .justify-between { justify-content: space-between; }
//           .font-bold, strong { font-weight: 900; }
//           .mb-1 { margin-bottom: 4px; }
//           .mt-1 { margin-top: 4px; }
//         </style></head><body>${tempDiv.innerHTML}</body></html>`)
//       doc.close()
//       iframe.onload = () => setTimeout(() => {
//         iframe.contentWindow?.print()
//         setTimeout(() => {
//           document.body.removeChild(iframe)
//           document.body.removeChild(tempDiv)
//           setIsPrinting(false)
//         }, 500)
//       }, 200)
//     } else {
//       document.body.removeChild(tempDiv)
//       setIsPrinting(false)
//     }
//   }, [settings])

//   const handleExport = () => {
//     if (!sortedTransactions.length) return
//     const data = sortedTransactions.map(t => ({
//       'Order #': t.orderNumber,
//       'Date': formatDate(t.timestamp),
//       'Customer': t.customerName,
//       'Items': t.items.length,
//       'Subtotal': t.subtotal,
//       'Discount': t.discountTotal ?? t.discount ?? 0,
//       'Total': t.total,
//       'Amount Paid': t.paymentMethod === 'cash' ? (t.amountPaid ?? t.total)
//         : t.paymentMethod === 'split' && t.splitPayment ? t.splitPayment.cash + t.splitPayment.gcash
//         : t.total,
//       'Change': t.paymentMethod === 'cash' ? (t.change ?? 0)
//         : t.paymentMethod === 'split' && t.splitPayment ? Math.max(0, (t.splitPayment.cash + t.splitPayment.gcash) - t.total)
//         : 0,
//       'Payment': t.paymentMethod,
//       'Status': t.status,
//       'Cashier': t.cashier,
//     }))
//     const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n')
//     const blob = new Blob([csv], { type: 'text/csv' })
//     const url = window.URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = `transactions_${formatShortDate(new Date())}.csv`
//     a.click()
//   }

//   const getStatusBadge = (status: string) => {
//     if (status === 'completed') return (
//       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
//         <CheckCircle2 className="w-3 h-3 mr-1" />Completed
//       </span>
//     )
//     if (status === 'cancelled') return (
//       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
//         <XCircle className="w-3 h-3 mr-1" />Cancelled
//       </span>
//     )
//     return (
//       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//         <AlertCircle className="w-3 h-3 mr-1" />Refunded
//       </span>
//     )
//   }

//   const getPaymentIcon = (method: string) => {
//     if (method === 'cash') return <DollarSign className="w-4 h-4" />
//     if (method === 'gcash') return <Smartphone className="w-4 h-4" />
//     return <CreditCard className="w-4 h-4" />
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-100">
//         <div className="max-w-7xl mx-auto p-6">
//           <div className="animate-pulse space-y-6">
//             <div className="h-8 w-64 bg-gray-200 rounded" />
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//               {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded" />)}
//             </div>
//             <div className="h-96 bg-gray-200 rounded" />
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <div className="max-w-7xl mx-auto p-6">

//         {/* Header */}
//         <div className="mb-6 flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
//               <Clock className="w-6 h-6" />Transaction History
//             </h1>
//             <p className="text-sm text-gray-500 mt-1">View and manage all your sales transactions</p>
//           </div>
//           <div className="flex gap-2">
//             <button onClick={fetchTransactions}
//               className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
//               <RefreshCw className="w-4 h-4" />Refresh
//             </button>
//             <button onClick={handleExport}
//               className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
//               <Download className="w-4 h-4" />Export
//             </button>
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//           <div className="bg-white rounded-lg border border-gray-200 p-4">
//             <div className="flex items-center justify-between mb-2">
//               <span className="text-sm text-gray-500">Total Sales</span>
//               <TrendingUp className="w-4 h-4 text-blue-500" />
//             </div>
//             <p className="text-2xl font-bold text-gray-900">{fmt(stats.totalSales)}</p>
//             <p className="text-xs text-gray-400 mt-1">{stats.totalTransactions} transactions</p>
//           </div>

//           <div className="bg-white rounded-lg border border-gray-200 p-4">
//             <div className="flex items-center justify-between mb-2">
//               <span className="text-sm text-gray-500">Cash Sales</span>
//               <DollarSign className="w-4 h-4 text-green-500" />
//             </div>
//             <p className="text-2xl font-bold text-gray-900">{fmt(stats.cashSales)}</p>
//             <p className="text-xs text-gray-400 mt-1">
//               {((stats.cashSales / stats.totalSales) * 100 || 0).toFixed(1)}% of total
//             </p>
//           </div>

//           <div className="bg-white rounded-lg border border-gray-200 p-4">
//             <div className="flex items-center justify-between mb-2">
//               <span className="text-sm text-gray-500">GCash Sales</span>
//               <Smartphone className="w-4 h-4 text-blue-500" />
//             </div>
//             <p className="text-2xl font-bold text-gray-900">{fmt(stats.gcashSales)}</p>
//             <p className="text-xs text-gray-400 mt-1">
//               {((stats.gcashSales / stats.totalSales) * 100 || 0).toFixed(1)}% of total
//             </p>
//           </div>

//           <div className="bg-white rounded-lg border border-gray-200 p-4">
//             <div className="flex items-center justify-between mb-2">
//               <span className="text-sm text-gray-500">Average Transaction</span>
//               <Receipt className="w-4 h-4 text-purple-500" />
//             </div>
//             <p className="text-2xl font-bold text-gray-900">{fmt(stats.averageTransaction)}</p>
//             <p className="text-xs text-gray-400 mt-1">Per transaction</p>
//           </div>
//         </div>

//         {/* Filters */}
//         <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
//           <div className="flex flex-wrap gap-4">
//             {/* Search */}
//             <div className="flex-1 min-w-[200px] relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input type="text" placeholder="Search by order #, customer, or cashier..."
//                 value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
//                 className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
//             </div>

//             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
//               className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
//               <option value="all">All Status</option>
//               <option value="completed">Completed</option>
//               <option value="cancelled">Cancelled</option>
//               <option value="refunded">Refunded</option>
//             </select>

//             <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
//               className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
//               <option value="all">All Payments</option>
//               <option value="cash">Cash</option>
//               <option value="gcash">GCash</option>
//               <option value="split">Split</option>
//             </select>

//             <select value={dateRange} onChange={e => setDateRange(e.target.value as any)}
//               className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
//               <option value="today">Today</option>
//               <option value="week">Last 7 Days</option>
//               <option value="month">Last 30 Days</option>
//               <option value="custom">Custom Range</option>
//               <option value="all">All Time</option>
//             </select>

//             {dateRange === 'custom' && (
//               <div className="flex gap-2 items-center">
//                 <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
//                   className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
//                 <span className="text-gray-500">to</span>
//                 <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
//                   className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
//               </div>
//             )}

//             <div className="flex gap-2">
//               <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
//                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
//                 <option value="date">Sort by Date</option>
//                 <option value="amount">Sort by Amount</option>
//                 <option value="name">Sort by Customer</option>
//               </select>
//               <button onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
//                 className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
//                 <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-blue-600' : ''}`} />
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50 border-b border-gray-200">
//                 <tr>
//                   {['Order #', 'Date & Time', 'Customer', 'Items', 'Total', 'Amount Paid', 'Change', 'Payment', 'Status', 'Cashier', 'Actions'].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {currentItems.map(t => {
//                   let amountPaid = t.total
//                   let change = 0
//                   if (t.paymentMethod === 'cash' && t.amountPaid) {
//                     amountPaid = t.amountPaid
//                     change = t.change || 0
//                   } else if (t.paymentMethod === 'split' && t.splitPayment) {
//                     amountPaid = t.splitPayment.cash + t.splitPayment.gcash
//                     change = Math.max(0, amountPaid - t.total)
//                   }

//                   return (
//                     <tr key={t.id} className="hover:bg-gray-50">
//                       <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.orderNumber}</td>
//                       <td className="px-4 py-3 text-sm text-gray-500">{formatDate(t.timestamp)}</td>
//                       <td className="px-4 py-3 text-sm text-gray-900">{t.customerName}</td>
//                       <td className="px-4 py-3 text-sm text-gray-500">{t.items.length} items</td>
//                       <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(t.total)}</td>
//                       <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(amountPaid)}</td>
//                       <td className="px-4 py-3 text-sm font-medium text-gray-900">{change > 0 ? fmt(change) : '₱0.00'}</td>
//                       <td className="px-4 py-3">
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
//                           {getPaymentIcon(t.paymentMethod)}
//                           <span className="capitalize">{t.paymentMethod}</span>
//                         </span>
//                       </td>
//                       <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
//                       <td className="px-4 py-3 text-sm text-gray-500">{t.cashier}</td>
//                       <td className="px-4 py-3">
//                         <div className="flex gap-2">
//                           <button onClick={() => { setSelectedTransaction(t); setShowDetailsModal(true) }}
//                             className="p-1 text-gray-400 hover:text-blue-600" title="View Details">
//                             <Eye className="w-4 h-4" />
//                           </button>
//                           <button onClick={() => handlePrint(t)} disabled={isPrinting}
//                             className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-50" title="Reprint Receipt">
//                             <Printer className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   )
//                 })}
//               </tbody>
//             </table>
//           </div>

//           {currentItems.length === 0 && (
//             <div className="text-center py-12">
//               <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
//               <p className="text-gray-500">No transactions found</p>
//               <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search term</p>
//             </div>
//           )}

//           {totalPages > 1 && (
//             <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
//               <p className="text-sm text-gray-500">
//                 Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedTransactions.length)} of {sortedTransactions.length} transactions
//               </p>
//               <div className="flex gap-2">
//                 <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
//                   className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50">
//                   <ArrowLeft className="w-4 h-4" />
//                 </button>
//                 <span className="px-3 py-1 text-sm">Page {currentPage} of {totalPages}</span>
//                 <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
//                   className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50">
//                   <ArrowRight className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Details Modal */}
//         {showDetailsModal && selectedTransaction && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//             <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
//               <div className="p-6">
//                 <div className="flex justify-between items-start mb-4">
//                   <div>
//                     <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
//                     <p className="text-sm text-gray-500">{selectedTransaction.orderNumber}</p>
//                   </div>
//                   <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">
//                     <X className="w-5 h-5" />
//                   </button>
//                 </div>

//                 <div className="space-y-4">
//                   {/* Order Info */}
//                   <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="text-xs text-gray-500">Date & Time</p>
//                       <p className="text-sm font-medium">{formatDate(selectedTransaction.timestamp)}</p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-gray-500">Order Type</p>
//                       <p className="text-sm font-medium capitalize">
//                         {selectedTransaction.orderType}
//                         {selectedTransaction.tableNumber && ` — Table ${selectedTransaction.tableNumber}`}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-gray-500">Customer</p>
//                       <p className="text-sm font-medium">{selectedTransaction.customerName}</p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-gray-500">Cashier</p>
//                       <p className="text-sm font-medium">{selectedTransaction.cashier}</p>
//                     </div>
//                   </div>

//                   {/* Items */}
//                   <div>
//                     <h3 className="text-sm font-medium text-gray-900 mb-2">Items</h3>
//                     <div className="border border-gray-200 rounded-lg divide-y">
//                       {selectedTransaction.items.map((item, i) => {
//                         const displayPrice = item.hasDiscount ? item.price * (1 - DISCOUNT_RATE) : item.price
//                         return (
//                           <div key={i} className="p-3 flex justify-between">
//                             <div>
//                               <p className="text-sm font-medium">{item.name}</p>
//                               <p className="text-xs text-gray-500">
//                                 Qty: {item.quantity} × {fmt(displayPrice)}
//                                 {item.hasDiscount && <span className="ml-2 text-gray-400">(20% disc)</span>}
//                               </p>
//                             </div>
//                             <p className="text-sm font-medium">{fmt(displayPrice * item.quantity)}</p>
//                           </div>
//                         )
//                       })}
//                     </div>
//                   </div>

//                   {/* Totals */}
//                   <div className="bg-gray-50 p-4 rounded-lg space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Subtotal:</span>
//                       <span className="font-medium">{fmt(selectedTransaction.subtotal)}</span>
//                     </div>
//                     {(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0) > 0 && (
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-600">Discount:</span>
//                         <span>-{fmt(selectedTransaction.discountTotal ?? selectedTransaction.discount ?? 0)}</span>
//                       </div>
//                     )}
//                     <div className="border-t border-gray-200 my-2" />
//                     <div className="flex justify-between font-bold">
//                       <span>TOTAL:</span>
//                       <span className="text-lg">{fmt(selectedTransaction.total)}</span>
//                     </div>
//                   </div>

//                   {/* Payment Details */}
//                   <div className="border border-gray-200 rounded-lg p-4">
//                     <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Details</h3>
//                     <div className="space-y-2">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-gray-600">Method:</span>
//                         <span className="font-medium capitalize flex items-center gap-1">
//                           {getPaymentIcon(selectedTransaction.paymentMethod)}
//                           {selectedTransaction.paymentMethod}
//                         </span>
//                       </div>

//                       {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.amountPaid && (
//                         <>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-600">Amount Received:</span>
//                             <span className="font-medium">{fmt(selectedTransaction.amountPaid)}</span>
//                           </div>
//                           <div className="flex justify-between text-sm font-bold">
//                             <span>Change:</span>
//                             <span>{fmt(selectedTransaction.change || 0)}</span>
//                           </div>
//                           <div className="text-xs text-gray-400 text-right">
//                             {fmt(selectedTransaction.amountPaid)} - {fmt(selectedTransaction.total)} = {fmt(selectedTransaction.change || 0)}
//                           </div>
//                         </>
//                       )}

//                       {selectedTransaction.paymentMethod === 'split' && selectedTransaction.splitPayment && (
//                         <>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-600">Cash:</span>
//                             <span>{fmt(selectedTransaction.splitPayment.cash)}</span>
//                           </div>
//                           <div className="flex justify-between text-sm">
//                             <span className="text-gray-600">GCash:</span>
//                             <span>{fmt(selectedTransaction.splitPayment.gcash)}</span>
//                           </div>
//                           <div className="border-t border-gray-200 my-2" />
//                           <div className="flex justify-between text-sm font-bold">
//                             <span>Total Paid:</span>
//                             <span>{fmt(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash)}</span>
//                           </div>
//                           {(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) > selectedTransaction.total && (
//                             <div className="flex justify-between text-sm font-bold">
//                               <span>Change:</span>
//                               <span>{fmt((selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) - selectedTransaction.total)}</span>
//                             </div>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   </div>

//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-gray-600">Status:</span>
//                     {getStatusBadge(selectedTransaction.status)}
//                   </div>
//                 </div>

//                 <div className="mt-6 flex justify-end gap-2">
//                   <button
//                     onClick={() => handlePrint(selectedTransaction)}
//                     disabled={isPrinting}
//                     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
//                   >
//                     <Printer className="w-4 h-4" />
//                     {isPrinting ? 'Printing...' : 'Reprint Receipt'}
//                   </button>
//                   <button onClick={() => setShowDetailsModal(false)}
//                     className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
//                     Close
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   )
// }

// export default History


import React from 'react'

const TransactionsHIstoryPage = () => {
  return (
    <div>TransactionsHIstoryPage</div>
  )
}

export default TransactionsHIstoryPage