"use client"
import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  Search, 
  Download, 
  Printer, 
  Eye, 
  RefreshCw,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  Smartphone,
  Receipt,
  TrendingUp,
  FileText,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react'

interface Transaction {
  id: string
  orderNumber: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  subtotal: number
  discount: number
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
}

const History = () => {
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    cashSales: 0,
    gcashSales: 0,
    splitSales: 0
  })

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions()
  }, [])

  // Update stats when transactions change
  useEffect(() => {
    calculateStats()
  }, [transactions])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      // Try to fetch from API first
      const response = await fetch('/api/payments')
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        })))
      } else {
        // Fallback to localStorage
        loadFromLocalStorage()
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      loadFromLocalStorage()
    } finally {
      setLoading(false)
    }
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('pos_saved_orders')
    if (saved) {
      const parsed = JSON.parse(saved)
      setTransactions(parsed.map((o: any) => ({
        ...o,
        timestamp: new Date(o.timestamp),
        status: o.status || 'completed'
      })))
    }
  }

  const calculateStats = () => {
    const completed = transactions.filter(t => t.status === 'completed')
    
    const totalSales = completed.reduce((sum, t) => sum + t.total, 0)
    const cashSales = completed
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0)
    const gcashSales = completed
      .filter(t => t.paymentMethod === 'gcash')
      .reduce((sum, t) => sum + t.total, 0)
    const splitSales = completed
      .filter(t => t.paymentMethod === 'split')
      .reduce((sum, t) => sum + t.total, 0)

    setStats({
      totalSales,
      totalTransactions: completed.length,
      averageTransaction: completed.length ? totalSales / completed.length : 0,
      cashSales,
      gcashSales,
      splitSales
    })
  }

  const getDateFilter = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dateRange) {
      case 'today':
        return { start: today, end: now }
      case 'week':
        return { 
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now 
        }
      case 'month':
        return { 
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now 
        }
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null
        }
      default:
        return null
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const matchesSearch = 
      transaction.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.cashier.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus

    // Payment filter
    const matchesPayment = filterPayment === 'all' || transaction.paymentMethod === filterPayment

    // Date filter
    const dateFilter = getDateFilter()
    let matchesDate = true
    if (dateFilter && dateFilter.start && dateFilter.end) {
      matchesDate = 
        transaction.timestamp >= dateFilter.start && 
        transaction.timestamp <= dateFilter.end
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return sortOrder === 'asc' 
          ? a.timestamp.getTime() - b.timestamp.getTime()
          : b.timestamp.getTime() - a.timestamp.getTime()
      case 'amount':
        return sortOrder === 'asc' ? a.total - b.total : b.total - a.total
      case 'name':
        return sortOrder === 'asc'
          ? a.customerName.localeCompare(b.customerName)
          : b.customerName.localeCompare(a.customerName)
      default:
        return 0
    }
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)

  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        )
      case 'refunded':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Refunded
          </span>
        )
      default:
        return null
    }
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="w-4 h-4" />
      case 'gcash':
        return <Smartphone className="w-4 h-4" />
      case 'split':
        return <CreditCard className="w-4 h-4" />
      default:
        return null
    }
  }

  const handleRefresh = () => {
    fetchTransactions()
  }

  const handlePrint = (transaction: Transaction) => {
    // Implement print functionality
    console.log('Printing:', transaction)
  }

  const handleExport = () => {
    const data = sortedTransactions.map(t => ({
      'Order #': t.orderNumber,
      'Date': formatDate(t.timestamp),
      'Customer': t.customerName,
      'Items': t.items.length,
      'Total': t.total,
        'Amount Paid': t.paymentMethod === 'cash' ? t.amountPaid :
        t.paymentMethod === 'split' && t.splitPayment
            ? t.splitPayment.cash + (t.splitPayment.gcash || 0)
            : t.total,
      'Change': t.paymentMethod === 'cash' ? t.change : 
                t.paymentMethod === 'split' && t.splitPayment ? 
                (t.splitPayment.cash + t.splitPayment.gcash) - t.total : 0,
      'Payment': t.paymentMethod,
      'Status': t.status,
      'Cashier': t.cashier
    }))

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${formatShortDate(new Date())}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Transaction History
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all your sales transactions
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Sales</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalTransactions} transactions</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Cash Sales</span>
              <DollarSign className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.cashSales)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {((stats.cashSales / stats.totalSales) * 100 || 0).toFixed(1)}% of total
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">GCash Sales</span>
              <Smartphone className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.gcashSales)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {((stats.gcashSales / stats.totalSales) * 100 || 0).toFixed(1)}% of total
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Average Transaction</span>
              <Receipt className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageTransaction)}</p>
            <p className="text-xs text-gray-400 mt-1">Per transaction</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order #, customer, or cashier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Payment Filter */}
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="split">Split</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Range</option>
              <option value="all">All Time</option>
            </select>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="name">Sort by Customer</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'text-blue-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Paid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cashier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.map((transaction) => {
                  // Calculate amount paid and change for display
                  let amountPaid = transaction.total
                  let change = 0
                  
                  if (transaction.paymentMethod === 'cash' && transaction.amountPaid) {
                    amountPaid = transaction.amountPaid
                    change = transaction.change || 0
                  } else if (transaction.paymentMethod === 'split' && transaction.splitPayment) {
                    amountPaid = transaction.splitPayment.cash + transaction.splitPayment.gcash
                    change = amountPaid - transaction.total
                  }

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {transaction.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(transaction.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.customerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {transaction.items.length} items
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.total)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">
                        {formatCurrency(amountPaid)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {change > 0 ? formatCurrency(change) : '₱0.00'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getPaymentIcon(transaction.paymentMethod)}
                          <span className="capitalize">{transaction.paymentMethod}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {transaction.cashier}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setShowDetailsModal(true)
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(transaction)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {currentItems.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your filters or search term
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedTransactions.length)} of {sortedTransactions.length} transactions
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {showDetailsModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
                    <p className="text-sm text-gray-500">{selectedTransaction.orderNumber}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">Date & Time</p>
                      <p className="text-sm font-medium">{formatDate(selectedTransaction.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Order Type</p>
                      <p className="text-sm font-medium capitalize">
                        {selectedTransaction.orderType}
                        {selectedTransaction.tableNumber && ` - Table ${selectedTransaction.tableNumber}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="text-sm font-medium">{selectedTransaction.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cashier</p>
                      <p className="text-sm font-medium">{selectedTransaction.cashier}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Items</h3>
                    <div className="border border-gray-200 rounded-lg divide-y">
                      {selectedTransaction.items.map((item, index) => (
                        <div key={index} className="p-3 flex justify-between">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} x {formatCurrency(item.price)}</p>
                          </div>
                          <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(selectedTransaction.subtotal)}</span>
                    </div>
                    {selectedTransaction.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedTransaction.discount)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between font-bold">
                      <span>TOTAL:</span>
                      <span className="text-lg">{formatCurrency(selectedTransaction.total)}</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Method:</span>
                        <span className="font-medium capitalize flex items-center gap-1">
                          {getPaymentIcon(selectedTransaction.paymentMethod)}
                          {selectedTransaction.paymentMethod}
                        </span>
                      </div>
                      
                      {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.amountPaid && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Amount Received:</span>
                            <span className="font-medium">{formatCurrency(selectedTransaction.amountPaid)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-green-600">
                            <span>Change:</span>
                            <span>{formatCurrency(selectedTransaction.change || 0)}</span>
                          </div>
                          <div className="text-xs text-gray-400 text-right mt-1">
                            {formatCurrency(selectedTransaction.amountPaid)} - {formatCurrency(selectedTransaction.total)} = {formatCurrency(selectedTransaction.change || 0)}
                          </div>
                        </>
                      )}

                      {selectedTransaction.paymentMethod === 'split' && selectedTransaction.splitPayment && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Cash:</span>
                            <span>{formatCurrency(selectedTransaction.splitPayment.cash)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">GCash:</span>
                            <span>{formatCurrency(selectedTransaction.splitPayment.gcash)}</span>
                          </div>
                          <div className="border-t border-gray-200 my-2"></div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>Total Paid:</span>
                            <span>{formatCurrency(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash)}</span>
                          </div>
                          {(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) > selectedTransaction.total && (
                            <>
                              <div className="flex justify-between text-sm font-bold text-green-600">
                                <span>Change:</span>
                                <span>{formatCurrency((selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) - selectedTransaction.total)}</span>
                              </div>
                              <div className="text-xs text-gray-400 text-right mt-1">
                                {formatCurrency(selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash)} - {formatCurrency(selectedTransaction.total)} = {formatCurrency((selectedTransaction.splitPayment.cash + selectedTransaction.splitPayment.gcash) - selectedTransaction.total)}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => handlePrint(selectedTransaction)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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