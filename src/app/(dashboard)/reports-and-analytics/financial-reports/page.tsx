'use client';

import { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, BarChart3, CreditCard, Calendar, Download, Filter } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  type: 'sale' | 'purchase' | 'expense' | 'refund';
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'online';
  status: 'completed' | 'pending';
}

const transactions: Transaction[] = [
  { id: '1', date: '2026-01-25', type: 'sale', category: 'Coffee', description: 'Espresso', amount: 150, paymentMethod: 'cash', status: 'completed' },
  { id: '2', date: '2026-01-25', type: 'purchase', category: 'Inventory', description: 'Coffee Beans', amount: 8500, paymentMethod: 'card', status: 'completed' },
  { id: '3', date: '2026-01-25', type: 'sale', category: 'Pastry', description: 'Croissant', amount: 120, paymentMethod: 'card', status: 'completed' },
  { id: '4', date: '2026-01-25', type: 'expense', category: 'Utilities', description: 'Electricity Bill', amount: 4500, paymentMethod: 'online', status: 'completed' },
  { id: '5', date: '2026-01-24', type: 'sale', category: 'Coffee', description: 'Cappuccino', amount: 180, paymentMethod: 'online', status: 'completed' },
  { id: '6', date: '2026-01-24', type: 'refund', category: 'Coffee', description: 'Wrong Order', amount: -150, paymentMethod: 'cash', status: 'completed' },
  { id: '7', date: '2026-01-24', type: 'purchase', category: 'Supplies', description: 'Paper Cups', amount: 1250, paymentMethod: 'card', status: 'pending' },
  { id: '8', date: '2026-01-23', type: 'sale', category: 'Tea', description: 'Matcha Latte', amount: 200, paymentMethod: 'card', status: 'completed' },
];

const categories = [
  { name: 'Coffee', value: 65200 },
  { name: 'Pastry', value: 18800 },
  { name: 'Tea', value: 9800 },
  { name: 'Other', value: 4700 },
];

export default function FinancialReport() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTransactions = useMemo(() => 
    transactions.filter(t => selectedCategory === 'all' || t.category === selectedCategory),
  [selectedCategory]);

  const stats = useMemo(() => {
    const revenue = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => ['purchase', 'expense'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
    const profit = revenue - expenses;
    
    return { 
      revenue, 
      expenses, 
      profit,
      target: 100000,
      avgTransaction: revenue / transactions.filter(t => t.type === 'sale').length 
    };
  }, []);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const getTypeColor = (type: string) => {
    const colors = {
      sale: 'bg-green-100 text-green-800',
      purchase: 'bg-blue-100 text-blue-800',
      expense: 'bg-red-100 text-red-800',
      refund: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type as keyof typeof colors];
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-gray-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Financial Report</h1>
            <p className="text-muted-foreground">January 2026 Performance</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-card p-4 rounded-lg shadow border mb-6">
        <div className="flex gap-2">
          {['week', 'month', 'quarter'].map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p as 'week' | 'month' | 'quarter')}
              className={`px-4 py-2 rounded transition-colors ${
                period === p 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Jan 1-25, 2026</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.revenue)}</p>
              <div className="flex items-center gap-1 text-green-600 mt-1">
                <TrendingUp className="h-4 w-4" /> 12.5%
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground">Profit</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.profit)}</p>
              <div className="flex items-center gap-1 text-green-600 mt-1">
                <TrendingUp className="h-4 w-4" /> 8.2%
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground">Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.expenses)}</p>
              <div className="flex items-center gap-1 text-red-600 mt-1">
                <TrendingDown className="h-4 w-4" /> 3.2%
              </div>
            </div>
            <CreditCard className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground">Avg. Sale</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.avgTransaction)}</p>
              <div className="text-sm text-muted-foreground mt-1">158 transactions</div>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-card rounded-lg shadow border mb-8">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Revenue Breakdown</h3>
        </div>
        <div className="p-6">
          {categories.map((cat, index) => (
            <div key={cat.name} className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{cat.name}</span>
                <span>{formatCurrency(cat.value)}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className={`h-2 rounded-full ${getCategoryColor(index)}`} 
                  style={{ width: `${(cat.value / stats.revenue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card rounded-lg shadow border">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="font-semibold">Recent Transactions</h3>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className="border rounded px-3 py-1 text-sm bg-background"
            >
              <option value="all">All Categories</option>
              <option value="Coffee">Coffee</option>
              <option value="Pastry">Pastry</option>
              <option value="Tea">Tea</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="p-4 text-left text-sm font-medium">Date</th>
                <th className="p-4 text-left text-sm font-medium">Description</th>
                <th className="p-4 text-left text-sm font-medium">Category</th>
                <th className="p-4 text-left text-sm font-medium">Type</th>
                <th className="p-4 text-left text-sm font-medium">Amount</th>
                <th className="p-4 text-left text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-secondary/50">
                  <td className="p-4 text-muted-foreground">{t.date}</td>
                  <td className="p-4 font-medium">{t.description}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-secondary rounded text-sm">
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${getTypeColor(t.type)}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      t.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}