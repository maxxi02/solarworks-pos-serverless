'use client';

import { useState } from 'react';
import { Users, Search,Mail, CheckCircle, UserX, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Customer {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'inactive' | 'new';
  loginCount: number;
}

const customers: Customer[] = [
  { id: 'CUST001', email: 'alex.johnson@email.com', name: 'Alex Johnson', createdAt: '2023-12-15', lastLogin: '2024-01-29 09:15', status: 'active', loginCount: 42 },
  { id: 'CUST002', email: 'sarah.chen@email.com', name: 'Sarah Chen', createdAt: '2023-11-20', lastLogin: '2024-01-29 08:45', status: 'active', loginCount: 28 },
  { id: 'CUST003', email: 'miguel.santos@email.com', name: 'Miguel Santos', createdAt: '2024-01-25', lastLogin: '2024-01-29 10:30', status: 'new', loginCount: 3 },
  { id: 'CUST004', email: 'lisa.r@email.com', name: 'Lisa Rodriguez', createdAt: '2023-10-10', lastLogin: '2024-01-28 14:20', status: 'active', loginCount: 56 },
  { id: 'CUST005', email: 'james.wilson@email.com', name: 'James Wilson', createdAt: '2024-01-10', lastLogin: '2024-01-27 11:45', status: 'inactive', loginCount: 8 },
];

export default function CustomerListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = searchQuery === '' || 
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.loginCount - a.loginCount;
    });

  const getStatusBadge = (status: string) => {
    const config = {
      active: { icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-100 text-green-800' },
      inactive: { icon: <UserX className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800' },
      new: { icon: <Star className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800' }
    };
    const { icon, color } = config[status as keyof typeof config] || config.active;
    
    return (
      <Badge className={`${color} gap-1 capitalize`}>
        {icon} {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    new: customers.filter(c => c.status === 'new').length,
    today: customers.filter(c => new Date(c.lastLogin).toDateString() === new Date().toDateString()).length
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Customer List</h2>
          <p className="text-muted-foreground">Manage all registered customers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New</p>
                  <p className="text-2xl font-bold">{stats.new}</p>
                </div>
                <Star className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{stats.today}</p>
                </div>
                <UserX className="h-6 w-6 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-140px">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-140px">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="login">Most Logins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-medium text-primary">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm">{formatDate(customer.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">{formatTime(customer.lastLogin)}</div>
                    </div>
                    
                    {getStatusBadge(customer.status)}
                    
                    <div className="text-right">
                      <div className="font-medium">{customer.loginCount}</div>
                      <div className="text-xs text-muted-foreground">logins</div>
                    </div>
                    
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No customers found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ? 'Try a different search' : 'No customers match filters'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}