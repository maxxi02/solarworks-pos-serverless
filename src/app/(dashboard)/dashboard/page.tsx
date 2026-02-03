'use client';

import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  // Mock data for stats cards
  const statsData = {
    todaySales: { value: "₱12,450.00", change: "+12.5%", trend: "up" },
    transactions: { value: "156", change: "+8", trend: "up" },
    lowStock: { value: "12", change: "Needs attention", trend: "attention" },
    staffOnline: { value: "5", change: "of 8 total", trend: "stable" },
  };

  // Mock data for low stock items
  const lowStockItems = [
    { id: 1, name: "Premium Coffee Beans", stock: 3, category: "Beverages" },
    { id: 2, name: "Paper Cups", stock: 5, category: "Supplies" },
    { id: 3, name: "Vanilla Syrup", stock: 2, category: "Ingredients" },
    { id: 4, name: "Napkins", stock: 4, category: "Supplies" },
  ];

  // Mock data for staff activity
  const staffActivity = [
    { id: 1, name: "John Doe", role: "Barista", status: "active", time: "2h ago" },
    { id: 2, name: "Jane Smith", role: "Cashier", status: "active", time: "1h ago" },
    { id: 3, name: "Mike Johnson", role: "Manager", status: "break", time: "30m ago" },
    { id: 4, name: "Sarah Wilson", role: "Barista", status: "active", time: "Just now" },
    { id: 5, name: "Alex Brown", role: "Cashier", status: "active", time: "15m ago" },
    { id: 6, name: "Emily Davis", role: "Barista", status: "offline", time: "1h ago" },
    { id: 7, name: "Chris Lee", role: "Manager", status: "active", time: "45m ago" },
    { id: 8, name: "Taylor White", role: "Barista", status: "break", time: "20m ago" },
  ];

  // Mock sales data
  const salesData = {
    today: [12000, 12450],
    thisWeek: [82000, 85450],
    thisMonth: [285000, 312450]
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h2>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Today's Sales Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">₱</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.todaySales.value}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                {statsData.todaySales.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={statsData.todaySales.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {statsData.todaySales.change}
                </span>
                <span className="ml-1">from yesterday</span>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.transactions.value}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">{statsData.transactions.change}</span>
                <span className="ml-1">from yesterday</span>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Items Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <Package className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{statsData.lowStock.value}</div>
              <p className="text-xs text-amber-500 mt-2">{statsData.lowStock.change}</p>
            </CardContent>
          </Card>

          {/* Staff Online Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Online</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.staffOnline.value}</div>
              <p className="text-xs text-muted-foreground mt-2">{statsData.staffOnline.change}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sales Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="today" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="week">This Week</TabsTrigger>
                    <TabsTrigger value="month">This Month</TabsTrigger>
                  </TabsList>
                  <TabsContent value="today" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Sales Today</p>
                          <p className="text-2xl font-bold">₱12,450</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          +12.5%
                        </Badge>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-full w-3/4 rounded-full bg-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {salesData.today[0]} → {salesData.today[1]} 
                        <span className="text-green-500 ml-2">(+{((salesData.today[1] - salesData.today[0]) / salesData.today[0] * 100).toFixed(1)}%)</span>
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="week" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Sales This Week</p>
                          <p className="text-2xl font-bold">₱85,450</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          +4.2%
                        </Badge>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-full w-4/5 rounded-full bg-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {salesData.thisWeek[0].toLocaleString()} → {salesData.thisWeek[1].toLocaleString()} 
                        <span className="text-green-500 ml-2">(+{((salesData.thisWeek[1] - salesData.thisWeek[0]) / salesData.thisWeek[0] * 100).toFixed(1)}%)</span>
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="month" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Sales This Month</p>
                          <p className="text-2xl font-bold">₱312,450</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          +9.6%
                        </Badge>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-full w-7/8 rounded-full bg-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {salesData.thisMonth[0].toLocaleString()} → {salesData.thisMonth[1].toLocaleString()} 
                        <span className="text-green-500 ml-2">(+{((salesData.thisMonth[1] - salesData.thisMonth[0]) / salesData.thisMonth[0] * 100).toFixed(1)}%)</span>
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Items */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <Badge variant={item.stock <= 2 ? "destructive" : item.stock <= 5 ? "outline" : "secondary"}>
                        {item.stock} left
                      </Badge>
                    </div>
                  ))}
                  <button className="w-full text-center text-sm text-primary hover:underline">
                    View all low stock items →
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Staff Activity Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Staff Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffActivity.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="font-medium">
                            {staff.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                          staff.status === 'active' ? 'bg-green-500' : 
                          staff.status === 'break' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground">{staff.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        staff.status === 'active' ? 'default' : 
                        staff.status === 'break' ? 'secondary' : 'outline'
                      }>
                        {staff.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">{staff.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Staff: 8
                  </span>
                  <span className="text-green-500 font-medium">
                    Online: 5
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}