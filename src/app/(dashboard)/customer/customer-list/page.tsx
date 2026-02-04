'use client';

import React, { useState } from 'react';
import { 
  Users, Search, Filter, Mail, Calendar, CheckCircle, 
  UserX, Star, ChevronRight, MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Customer {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'inactive' | 'new';
  loginCount: number;
}

// Sample customer data
const customers: Customer[] = [
  {
    id: 'CUST001',
    email: 'alex.johnson@email.com',
    name: 'Alex Johnson',
    createdAt: '2023-12-15',
    lastLogin: '2024-01-29 09:15',
    status: 'active',
    loginCount: 42
  },
  {
    id: 'CUST002',
    email: 'sarah.chen@email.com',
    name: 'Sarah Chen',
    createdAt: '2023-11-20',
    lastLogin: '2024-01-29 08:45',
    status: 'active',
    loginCount: 28
  },
  {
    id: 'CUST003',
    email: 'miguel.santos@email.com',
    name: 'Miguel Santos',
    createdAt: '2024-01-25',
    lastLogin: '2024-01-29 10:30',
    status: 'new',
    loginCount: 3
  },
  {
    id: 'CUST004',
    email: 'lisa.r@email.com',
    name: 'Lisa Rodriguez',
    createdAt: '2023-10-10',
    lastLogin: '2024-01-28 14:20',
    status: 'active',
    loginCount: 56
  },
  {
    id: 'CUST005',
    email: 'james.wilson@email.com',
    name: 'James Wilson',
    createdAt: '2024-01-10',
    lastLogin: '2024-01-27 11:45',
    status: 'inactive',
    loginCount: 8
  },
  {
    id: 'CUST006',
    email: 'maria.g@email.com',
    name: 'Maria Garcia',
    createdAt: '2023-09-05',
    lastLogin: '2024-01-29 07:30',
    status: 'active',
    loginCount: 34
  },
  {
    id: 'CUST007',
    email: 'david.kim@email.com',
    name: 'David Kim',
    createdAt: '2024-01-22',
    lastLogin: '2024-01-29 16:15',
    status: 'new',
    loginCount: 5
  },
  {
    id: 'CUST008',
    email: 'anna.m@email.com',
    name: 'Anna Martinez',
    createdAt: '2023-08-15',
    lastLogin: '2024-01-29 13:45',
    status: 'active',
    loginCount: 65
  },
  {
    id: 'CUST009',
    email: 'robert.l@email.com',
    name: 'Robert Lee',
    createdAt: '2024-01-18',
    lastLogin: '2024-01-28 12:30',
    status: 'active',
    loginCount: 12
  },
  {
    id: 'CUST010',
    email: 'emily.w@email.com',
    name: 'Emily White',
    createdAt: '2023-12-28',
    lastLogin: '2024-01-29 10:15',
    status: 'active',
    loginCount: 19
  },
  {
    id: 'CUST011',
    email: 'thomas.b@email.com',
    name: 'Thomas Brown',
    createdAt: '2024-01-05',
    lastLogin: '2024-01-26 17:45',
    status: 'inactive',
    loginCount: 4
  },
  {
    id: 'CUST012',
    email: 'sophia.m@email.com',
    name: 'Sophia Martinez',
    createdAt: '2023-11-30',
    lastLogin: '2024-01-29 09:45',
    status: 'active',
    loginCount: 31
  },
];

const CustomerListPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'new'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'login'>('newest');

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = searchQuery === '' || 
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'login':
          return b.loginCount - a.loginCount;
        default:
          return 0;
      }
    });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'inactive': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'new': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />;
      case 'inactive': return <UserX className="h-3 w-3" />;
      case 'new': return <Star className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  // Calculate statistics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const newCustomers = customers.filter(c => c.status === 'new').length;
  const customersToday = customers.filter(c => 
    new Date(c.lastLogin).toDateString() === new Date().toDateString()
  ).length;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format last login
  const formatLastLogin = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Customer List
              </h2>
              <p className="text-muted-foreground">
                View and manage all registered customers by email.
              </p>
            </div>
            <Button className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Export List
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Registered by email
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Recently logged in
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <Star className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newCustomers}</div>
              <p className="text-xs text-muted-foreground">
                January registrations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logged In Today</CardTitle>
              <Calendar className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customersToday}</div>
              <p className="text-xs text-muted-foreground">
                Active today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search customers by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="new">New</option>
                  </select>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="name">Sort by Name</option>
                  <option value="login">Most Logins</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Customer Directory</CardTitle>
                <CardDescription>
                  Showing {filteredCustomers.length} of {customers.length} customers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Registration Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Logins
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map((customer) => {
                    const isLoggedInToday = new Date(customer.lastLogin).toDateString() === new Date().toDateString();
                    
                    return (
                      <tr key={customer.id} className="hover:bg-secondary/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {customer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{customer.name}</div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {customer.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">{formatDate(customer.createdAt)}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor((new Date().getTime() - new Date(customer.createdAt).getTime()) / (1000 * 3600 * 24))} days ago
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">
                            {formatLastLogin(customer.lastLogin)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(customer.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {isLoggedInToday && (
                            <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 text-xs">
                              Today
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getStatusColor(customer.status)}`}>
                            {getStatusIcon(customer.status)}
                            <span className="capitalize">{customer.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{customer.loginCount}</div>
                          <div className="text-xs text-muted-foreground">
                            Total logins
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="text-xs">
                              View
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Send Email</DropdownMenuItem>
                                <DropdownMenuItem>View Purchase History</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">No customers found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'No customers match the selected filters'}
                </p>
              </div>
            )}

            {/* Pagination/Summary */}
            {filteredCustomers.length > 0 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(filteredCustomers.length, 10)} customers per page
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    1
                  </Button>
                  <Button variant="outline" size="sm">
                    2
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default CustomerListPage;