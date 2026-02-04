'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Search, Filter, Eye, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Refund/Return type
interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  productName: string;
  reason: 'defective' | 'wrong-item' | 'not-as-described' | 'quality-issue' | 'other';
  quantity: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  date: string;
  requestedBy: 'customer' | 'staff';
}

// Type definitions for filters
type StatusFilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'completed';
type ReasonFilterType = 'all' | 'defective' | 'wrong-item' | 'not-as-described' | 'quality-issue';

export default function ReturnsRefundsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilterType>('all');

  // Sample return requests
  const returnRequests: ReturnRequest[] = [
    { id: 'RET001', orderId: 'ORD1001', customerName: 'Alex Johnson', productName: 'Iced Coffee Jelly', reason: 'quality-issue', quantity: 1, amount: 170, status: 'pending', date: '2024-01-29', requestedBy: 'customer' },
    { id: 'RET002', orderId: 'ORD1002', customerName: 'Sarah Chen', productName: 'Matcha Sea Foam', reason: 'defective', quantity: 1, amount: 179, status: 'approved', date: '2024-01-28', requestedBy: 'customer' },
    { id: 'RET003', orderId: 'ORD1003', customerName: 'Miguel Santos', productName: 'Spanish Latte', reason: 'wrong-item', quantity: 2, amount: 300, status: 'completed', date: '2024-01-28', requestedBy: 'staff' },
    { id: 'RET004', orderId: 'ORD1004', customerName: 'Lisa Rodriguez', productName: 'Caramel Macchiato', reason: 'not-as-described', quantity: 1, amount: 159, status: 'rejected', date: '2024-01-27', requestedBy: 'customer' },
    { id: 'RET005', orderId: 'ORD1005', customerName: 'James Wilson', productName: 'Jumbo! Hungarian Susilog', reason: 'quality-issue', quantity: 1, amount: 195, status: 'pending', date: '2024-01-27', requestedBy: 'customer' },
    { id: 'RET006', orderId: 'ORD1006', customerName: 'Maria Garcia', productName: 'Basket of Fries', reason: 'wrong-item', quantity: 1, amount: 125, status: 'approved', date: '2024-01-26', requestedBy: 'staff' },
    { id: 'RET007', orderId: 'ORD1007', customerName: 'David Kim', productName: 'Blueberry Muffin', reason: 'defective', quantity: 1, amount: 150, status: 'completed', date: '2024-01-26', requestedBy: 'customer' },
  ];

  // Calculate statistics
  const totalReturns = returnRequests.length;
  const pendingReturns = returnRequests.filter(r => r.status === 'pending').length;
  const totalRefundAmount = returnRequests
    .filter(r => r.status === 'completed' || r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);
  const completionRate = totalReturns > 0 
    ? Math.round((returnRequests.filter(r => r.status === 'completed').length / totalReturns) * 100)
    : 0;

  // Filter requests
  const filteredRequests = returnRequests.filter(request => {
    const matchesSearch = searchQuery === '' || 
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesReason = reasonFilter === 'all' || request.reason === reasonFilter;
    
    return matchesSearch && matchesStatus && matchesReason;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="h-3 w-3 mr-1" /> Pending
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle className="h-3 w-3 mr-1" /> Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" /> Completed
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get reason text
  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'defective': return 'Defective Product';
      case 'wrong-item': return 'Wrong Item Received';
      case 'not-as-described': return 'Not as Described';
      case 'quality-issue': return 'Quality Issue';
      default: return reason;
    }
  };

  // Handle actions
  const handleApprove = (id: string) => {
    alert(`Approved return: ${id}`);
  };

  const handleReject = (id: string) => {
    alert(`Rejected return: ${id}`);
  };

  const handleComplete = (id: string) => {
    alert(`Completed return: ${id}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Returns & Refunds</h2>
          <p className="text-muted-foreground">Manage return requests and refund processing</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{totalReturns}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                  <RefreshCw className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{pendingReturns}</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/20">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Refunds</p>
                  <p className="text-2xl font-bold">₱{totalRefundAmount.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                  <XCircle className="h-6 w-6 text-purple-600" />
                </div>
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
                    placeholder="Search by customer, product, or order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <Select 
                  value={statusFilter} 
                  onValueChange={(value: StatusFilterType) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={reasonFilter} 
                  onValueChange={(value: ReasonFilterType) => setReasonFilter(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reasons</SelectItem>
                    <SelectItem value="defective">Defective</SelectItem>
                    <SelectItem value="wrong-item">Wrong Item</SelectItem>
                    <SelectItem value="not-as-described">Not as Described</SelectItem>
                    <SelectItem value="quality-issue">Quality Issue</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Returns Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Return Requests</CardTitle>
              <Button>Process New Return</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Return ID</th>
                    <th className="text-left p-3 text-sm font-medium">Order / Product</th>
                    <th className="text-left p-3 text-sm font-medium">Customer</th>
                    <th className="text-left p-3 text-sm font-medium">Reason</th>
                    <th className="text-left p-3 text-sm font-medium">Amount</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-secondary/50">
                      <td className="p-3">
                        <div className="font-medium">{request.id}</div>
                        <div className="text-xs text-muted-foreground">{request.date}</div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{request.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            Order: {request.orderId} • Qty: {request.quantity}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>{request.customerName}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          Requested by: {request.requestedBy}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{getReasonText(request.reason)}</span>
                      </td>
                      <td className="p-3 font-semibold">₱{request.amount}</td>
                      <td className="p-3">{getStatusBadge(request.status)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-green-600 hover:text-green-700"
                                onClick={() => handleApprove(request.id)}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-red-600 hover:text-red-700"
                                onClick={() => handleReject(request.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8"
                              onClick={() => handleComplete(request.id)}
                            >
                              Complete Refund
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {filteredRequests.length} of {returnRequests.length} return requests
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Process Refund</h4>
                  <p className="text-sm text-muted-foreground">Issue refund for completed returns</p>
                  <Button className="w-full">Process Batch Refunds</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Export Reports</h4>
                  <p className="text-sm text-muted-foreground">Download returns and refunds data</p>
                  <Button variant="outline" className="w-full">Export to Excel</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Return Policies</h4>
                  <p className="text-sm text-muted-foreground">View and edit return policies</p>
                  <Button variant="outline" className="w-full">Manage Policies</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}