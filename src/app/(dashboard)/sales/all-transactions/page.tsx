'use client';

import { useState } from 'react';
import { Search, Filter, Download, Eye, MoreVertical, TrendingUp, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Transaction type
interface Transaction {
  id: string;
  customerName: string;
  items: number;
  total: number;
  paymentMethod: 'cash' | 'GCASH' | 'online';
  status: 'completed' | 'pending' | 'refunded';
  date: string;
  time: string;
}

// Filter types
type StatusFilterType = 'all' | 'completed' | 'pending' | 'refunded';
type DateFilterType = 'all' | 'today' | 'week' | 'month';

// Sample transactions data
const transactions: Transaction[] = [
  { id: 'TRX001', customerName: 'Alex Johnson', items: 3, total: 485, paymentMethod: 'GCASH', status: 'completed', date: '2024-01-29', time: '09:15 AM' },
  { id: 'TRX002', customerName: 'Sarah Chen', items: 2, total: 325, paymentMethod: 'cash', status: 'completed', date: '2024-01-29', time: '10:30 AM' },
  { id: 'TRX003', customerName: 'Miguel Santos', items: 5, total: 890, paymentMethod: 'online', status: 'completed', date: '2024-01-29', time: '11:45 AM' },
  { id: 'TRX004', customerName: 'Lisa Rodriguez', items: 1, total: 170, paymentMethod: 'GCASH', status: 'pending', date: '2024-01-29', time: '12:20 PM' },
  { id: 'TRX005', customerName: 'James Wilson', items: 4, total: 620, paymentMethod: 'cash', status: 'completed', date: '2024-01-28', time: '02:15 PM' },
  { id: 'TRX006', customerName: 'Maria Garcia', items: 2, total: 340, paymentMethod: 'online', status: 'completed', date: '2024-01-28', time: '03:45 PM' },
  { id: 'TRX007', customerName: 'David Kim', items: 3, total: 515, paymentMethod: 'GCASH', status: 'refunded', date: '2024-01-28', time: '04:30 PM' },
  { id: 'TRX008', customerName: 'Anna Martinez', items: 6, total: 975, paymentMethod: 'cash', status: 'completed', date: '2024-01-27', time: '01:15 PM' },
];

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  // Calculate totals
  const totalRevenue = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0);
  
  const todaySales = transactions
    .filter(t => t.date === '2024-01-29' && t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0);
  
  const avgTransaction = transactions.length > 0 
    ? totalRevenue / transactions.filter(t => t.status === 'completed').length 
    : 0;

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchQuery === '' || 
      transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && transaction.date === '2024-01-29') ||
      (dateFilter === 'week' && ['2024-01-29', '2024-01-28', '2024-01-27'].includes(transaction.date)) ||
      (dateFilter === 'month' && transaction.date.startsWith('2024-01'));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as StatusFilterType);
  };

  // Handle date filter change
  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value as DateFilterType);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Sales Transactions</h2>
          <p className="text-muted-foreground">View and manage all sales transactions</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">₱{totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-2xl font-bold">₱{todaySales.toLocaleString()}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Transaction</p>
                  <p className="text-2xl font-bold">₱{avgTransaction.toFixed(0)}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={handleDateFilterChange}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>

                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Transaction ID</th>
                    <th className="text-left p-3 text-sm font-medium">Customer</th>
                    <th className="text-left p-3 text-sm font-medium">Items</th>
                    <th className="text-left p-3 text-sm font-medium">Total</th>
                    <th className="text-left p-3 text-sm font-medium">Payment</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Date</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-secondary/50">
                      <td className="p-3">
                        <div className="font-medium">{transaction.id}</div>
                        <div className="text-xs text-muted-foreground">{transaction.time}</div>
                      </td>
                      <td className="p-3">{transaction.customerName}</td>
                      <td className="p-3">{transaction.items} items</td>
                      <td className="p-3 font-semibold">₱{transaction.total}</td>
                      <td className="p-3">
                        <span className="capitalize">{transaction.paymentMethod}</span>
                      </td>
                      <td className="p-3">
                        <Badge className={`${getStatusColor(transaction.status)} capitalize`}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="p-3">{transaction.date}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>
              <Button variant="outline">Load More</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}