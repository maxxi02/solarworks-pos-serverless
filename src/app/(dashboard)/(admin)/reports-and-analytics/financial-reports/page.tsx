'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Printer,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { io as socketIO, Socket } from 'socket.io-client'

interface ClosedRegister {
  _id: string
  openingFund: number
  openedAt: string
  closedAt: string
  cashierName: string
  registerName: string
  status: 'closed'
  cashOuts: Array<{ amount: number; reason: string; date: string }>
  actualCash?: number
  expectedCash?: number
  difference?: number
  closeStatus?: 'balanced' | 'short' | 'over'
  closingNotes?: string
  snapshot?: {
    totalSales: number
    netSales: number
    totalDiscounts: number
    totalRefunds: number
    cashSales: number
    gcashSales: number
    splitSales: number
    transactions: number
    items: number
  }
}

export default function ClosedRegistersPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [registers, setRegisters] = useState<ClosedRegister[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('today')
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Connect to socket server for printing
    const socketInstance = socketIO(process.env.NEXT_PUBLIC_SOCKET_URL || 'https://rendezvous-server-gpmv.onrender.com', {
      auth: { userId: 'financial-reports' },
    })
    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  useEffect(() => {
    loadClosedRegisters()
  }, [selectedPeriod])

  const loadClosedRegisters = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/closed-registers?period=${selectedPeriod}`)
      const result = await response.json()
      if (result.success) {
        setRegisters(result.data)
      } else {
        toast.error('Failed to load closed registers')
      }
    } catch (error) {
      console.error('Error loading closed registers:', error)
      toast.error('Failed to load closed registers')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadClosedRegisters()
    setRefreshing(false)
  }

  const handlePrint = async (register: ClosedRegister) => {
    if (!socket) {
      toast.error('Printing service not connected')
      return
    }

    setPrintingId(register._id)

    try {
      const businessName = "Rendezvous Cafe";
      const businessAddress = "Your Store Address";
      const businessPhone = "123-456-7890";

      // Prepare items for receipt
      const items = [
        {
          name: "OPENING FUND",
          price: register.openingFund,
          quantity: 1,
        },
        {
          name: "CASH SALES",
          price: register.snapshot?.cashSales || 0,
          quantity: 1,
        },
        {
          name: "GCASH SALES",
          price: register.snapshot?.gcashSales || 0,
          quantity: 1,
        },
        {
          name: "SPLIT SALES",
          price: register.snapshot?.splitSales || 0,
          quantity: 1,
        }
      ];

      // Add discounts if any
      if ((register.snapshot?.totalDiscounts || 0) > 0) {
        items.push({
          name: "TOTAL DISCOUNTS",
          price: -(register.snapshot?.totalDiscounts || 0),
          quantity: 1,
        });
      }

      // Add refunds if any
      if ((register.snapshot?.totalRefunds || 0) > 0) {
        items.push({
          name: "TOTAL REFUNDS",
          price: -(register.snapshot?.totalRefunds || 0),
          quantity: 1,
        });
      }

      // Add cash outs if any
      if (register.cashOuts && register.cashOuts.length > 0) {
        register.cashOuts.forEach(cashOut => {
          items.push({
            name: `CASH OUT: ${cashOut.reason}`,
            price: -cashOut.amount,
            quantity: 1,
          });
        });
      }

      // Calculate totals
      const totalSales = register.snapshot?.totalSales || 0;
      const expectedCash = register.expectedCash || 0;
      const actualCash = register.actualCash || 0;
      const difference = register.difference || 0;

      const printData = {
        jobId: `close-${register._id}-${Date.now()}`,
        target: 'receipt' as const,
        input: {
          orderNumber: `Z-${new Date(register.closedAt).toLocaleDateString().replace(/\//g, '')}-${register.cashierName}`,
          customerName: register.cashierName,
          cashier: register.cashierName,
          timestamp: new Date(register.closedAt),
          orderType: 'dine-in' as const,
          items: items,
          subtotal: totalSales,
          discountTotal: register.snapshot?.totalDiscounts || 0,
          total: expectedCash,
          paymentMethod: 'cash',
          amountPaid: actualCash,
          change: difference,
          businessName,
          businessAddress,
          businessPhone,
          receiptMessage: getStatusMessage(register.closeStatus || 'balanced', difference),
          isReprint: false,
        }
      }

      // Emit print request
      socket.emit('print:request', printData)

      toast.success('Print job sent to printer')
    } catch (error) {
      console.error('Print error:', error)
      toast.error('Failed to print')
    } finally {
      setPrintingId(null)
    }
  }

  const getStatusMessage = (status: string, difference: number) => {
    const absDiff = Math.abs(difference);
    switch (status) {
      case 'balanced':
        return `✓ REGISTER BALANCED ✓\nExact amount: ₱${absDiff.toFixed(2)}`
      case 'short':
        return `⚠ REGISTER SHORT ⚠\nShort by: ₱${absDiff.toFixed(2)}`
      case 'over':
        return `⚠ REGISTER OVER ⚠\nOver by: ₱${absDiff.toFixed(2)}`
      default:
        return ''
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'balanced':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'short':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'over':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'balanced':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'short':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'over':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ] as const

  // Calculate summary statistics
  const summary = {
    totalRegisters: registers.length,
    totalSales: registers.reduce((sum, r) => sum + (r.snapshot?.totalSales || 0), 0),
    balanced: registers.filter(r => r.closeStatus === 'balanced').length,
    short: registers.filter(r => r.closeStatus === 'short').length,
    over: registers.filter(r => r.closeStatus === 'over').length,
    totalDifference: registers.reduce((sum, r) => sum + (r.difference || 0), 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading closed registers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Closed Registers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and print register closing summaries
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors self-start"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {periods.map(period => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${selectedPeriod === period.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
                }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        {registers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Total Registers</p>
              <p className="text-xl font-bold text-card-foreground">{summary.totalRegisters}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold text-card-foreground">{formatCurrency(summary.totalSales)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Balanced</p>
              <p className="text-xl font-bold text-green-500">{summary.balanced}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Short</p>
              <p className="text-xl font-bold text-red-500">{summary.short}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Over</p>
              <p className="text-xl font-bold text-yellow-500">{summary.over}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Net Difference</p>
              <p className={`text-xl font-bold ${summary.totalDifference >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                {summary.totalDifference >= 0 ? '+' : ''}{formatCurrency(summary.totalDifference)}
              </p>
            </div>
          </div>
        )}

        {/* Registers List */}
        {registers.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No Closed Registers</h3>
            <p className="text-muted-foreground">
              No closed registers found for {periods.find(p => p.id === selectedPeriod)?.label.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registers.map(register => (
              <div key={register._id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold text-card-foreground">{register.registerName || 'Main Register'}</h3>
                      <p className="text-sm text-muted-foreground">Cashier: {register.cashierName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {register.closeStatus && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(register.closeStatus)}`}>
                        {register.closeStatus.toUpperCase()}
                      </span>
                    )}
                    <button
                      onClick={() => handlePrint(register)}
                      disabled={printingId === register._id}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" />
                      {printingId === register._id ? 'Printing...' : 'Print'}
                    </button>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Opened: {formatDate(register.openedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Closed: {formatDate(register.closedAt)}</span>
                  </div>
                </div>

                {/* Summary Numbers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Opening Fund</p>
                    <p className="font-medium text-card-foreground">{formatCurrency(register.openingFund)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="font-medium text-card-foreground">{formatCurrency(register.snapshot?.totalSales || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cash Sales</p>
                    <p className="font-medium text-card-foreground">{formatCurrency(register.snapshot?.cashSales || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                    <p className="font-medium text-card-foreground">{register.snapshot?.transactions || 0}</p>
                  </div>
                </div>

                {/* Cash Details */}
                {register.expectedCash !== undefined && register.actualCash !== undefined && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Cash</p>
                      <p className="font-medium text-card-foreground">{formatCurrency(register.expectedCash)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Actual Cash</p>
                      <p className={`font-medium ${(register.difference || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {formatCurrency(register.actualCash)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Difference</p>
                      <div className="flex items-center gap-1">
                        {(register.difference || 0) > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (register.difference || 0) < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <span className={`font-medium ${(register.difference || 0) > 0 ? 'text-green-500' :
                            (register.difference || 0) < 0 ? 'text-red-500' :
                              'text-green-500'
                          }`}>
                          {(register.difference || 0) > 0 ? '+' : ''}
                          {formatCurrency(register.difference || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Outs if any */}
                {register.cashOuts && register.cashOuts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-card-foreground mb-2">Cash Outs:</p>
                    <div className="space-y-1">
                      {register.cashOuts.map((cashOut, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cashOut.reason}</span>
                          <span className="font-medium text-red-500">-{formatCurrency(cashOut.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closing Notes */}
                {register.closingNotes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                    <p className="text-sm text-card-foreground">{register.closingNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}