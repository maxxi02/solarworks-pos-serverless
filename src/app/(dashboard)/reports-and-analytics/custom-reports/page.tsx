'use client';

import { useState } from 'react';
import { Eye, Download, Calendar, User, Mail, DollarSign, FileText } from 'lucide-react';

const customers = [
  { id: '1', name: 'Maria Santos', email: 'maria@email.com', totalSpent: 12500, visits: 25, lastVisit: '2024-01-25' },
  { id: '2', name: 'Juan Cruz', email: 'juan@email.com', totalSpent: 8500, visits: 18, lastVisit: '2024-01-24' },
  { id: '3', name: 'Ana Reyes', email: 'ana@email.com', totalSpent: 15600, visits: 32, lastVisit: '2024-01-25' },
];

const reports = [
  { id: '1', customerId: '1', title: 'Monthly Report', type: 'monthly', period: 'January 2024', generatedDate: '2024-01-26', summary: 'Total spent: ₱4,500 • 8 visits' },
  { id: '2', customerId: '1', title: 'Quarterly Report', type: 'quarterly', period: 'Q4 2023', generatedDate: '2024-01-02', summary: 'Total spent: ₱12,500 • 25 visits' },
  { id: '3', customerId: '2', title: 'Monthly Report', type: 'monthly', period: 'January 2024', generatedDate: '2024-01-26', summary: 'Total spent: ₱3,200 • 6 visits' },
];

export default function CustomerReports() {
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]);
  const customerReports = reports.filter(report => report.customerId === selectedCustomer.id);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Customer Reports</h1>
        <p className="text-muted-foreground">View customer spending reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Customers</h3>
            <div className="space-y-3">
              {customers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    selectedCustomer.id === customer.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent: {formatCurrency(customer.totalSpent)}</span>
                    <span className="text-muted-foreground">{customer.visits} visits</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Customer Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="font-medium">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Reports for {selectedCustomer.name}
                </h3>
                <p className="text-muted-foreground">
                  {customerReports.length} reports available
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Generate New Report
              </button>
            </div>

            {customerReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No reports available for this customer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customerReports.map(report => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-secondary transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {report.period} • Generated on {report.generatedDate}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-muted-foreground hover:text-primary">
                          <Eye className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-green-600">
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm">{report.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-lg shadow">
              <p className="text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow">
              <p className="text-muted-foreground">Total Visits</p>
              <p className="text-xl font-bold">{selectedCustomer.visits}</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow">
              <p className="text-muted-foreground">Avg. per Visit</p>
              <p className="text-xl font-bold">
                {formatCurrency(selectedCustomer.totalSpent / selectedCustomer.visits)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}