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

// Types
interface StatData {
  value: string;
  change: string;
  trend: 'up' | 'down' | 'attention' | 'stable';
}

interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  category: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  status: 'active' | 'break' | 'offline';
  time: string;
}

interface SalesData {
  today: [number, number];
  thisWeek: [number, number];
  thisMonth: [number, number];
}

interface AdminDashboardProps {
  statsData?: {
    todaySales: StatData;
    transactions: StatData;
    lowStock: StatData;
    staffOnline: StatData;
  };
  lowStockItems?: LowStockItem[];
  staffActivity?: StaffMember[];
  salesData?: SalesData;
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: StatData['trend'];
  icon?: React.ReactNode;
  isCurrency?: boolean;
}

function StatCard({ title, value, change, trend, icon, isCurrency = false }: StatCardProps) {
  const getTrendColor = (trend: StatData['trend']) => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      case 'attention': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: StatData['trend']) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isCurrency ? (
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">₱</span>
          </div>
        ) : (
          icon
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${trend === 'attention' ? 'text-amber-500' : ''}`}>
          {value}
        </div>
        <div className="flex items-center text-xs text-muted-foreground mt-2">
          {getTrendIcon(trend)}
          <span className={getTrendColor(trend)}>
            {change}
          </span>
          {trend === 'up' && <span className="ml-1">from yesterday</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// SalesTabContent Component
interface SalesTabContentProps {
  period: string;
  current: number;
  previous: number;
}

function SalesTabContent({ period, current, previous }: SalesTabContentProps) {
  const percentChange = ((current - previous) / previous * 100).toFixed(1);
  const progressWidth = (current / (previous * 1.2)) * 100; // Cap at 120% of previous

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total Sales {period}</p>
          <p className="text-2xl font-bold">₱{current.toLocaleString()}</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700">
          +{percentChange}%
        </Badge>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div 
          className="h-full rounded-full bg-primary" 
          style={{ width: `${Math.min(progressWidth, 100)}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {previous.toLocaleString()} → {current.toLocaleString()} 
        <span className="text-green-500 ml-2">(+{percentChange}%)</span>
      </p>
    </div>
  );
}

// StaffStatusBadge Component
interface StaffStatusBadgeProps {
  status: StaffMember['status'];
}

function StaffStatusBadge({ status }: StaffStatusBadgeProps) {
  const config = {
    active: { variant: 'default' as const, label: 'active' },
    break: { variant: 'secondary' as const, label: 'break' },
    offline: { variant: 'outline' as const, label: 'offline' }
  };

  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
}

// Main Component
export default function AdminDashboard({ 
  statsData = {
    todaySales: { value: "₱8,450.00", change: "+12.5%", trend: "up" },
    transactions: { value: "116", change: "+8", trend: "up" },
    lowStock: { value: "12", change: "Needs attention", trend: "attention" },
    staffOnline: { value: "0", change: "of 8 total", trend: "stable" },
  },
  lowStockItems = [],
  staffActivity = [],
  salesData = {
    today: [12000, 12450],
    thisWeek: [82000, 85450],
    thisMonth: [285000, 312450]
  }
}: AdminDashboardProps) {
  
  const onlineStaffCount = staffActivity.filter(s => s.status === 'active').length;
  const totalStaffCount = staffActivity.length;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Sales"
            value={statsData.todaySales.value}
            change={statsData.todaySales.change}
            trend={statsData.todaySales.trend}
            isCurrency
          />
          
          <StatCard
            title="Transactions"
            value={statsData.transactions.value}
            change={statsData.transactions.change}
            trend={statsData.transactions.trend}
            icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />}
          />
          
          <StatCard
            title="Low Stock Items"
            value={statsData.lowStock.value}
            change={statsData.lowStock.change}
            trend={statsData.lowStock.trend}
            icon={<Package className="h-5 w-5 text-muted-foreground" />}
          />
          
          <StatCard
            title="Staff Online"
            value={statsData.staffOnline.value}
            change={statsData.staffOnline.change}
            trend={statsData.staffOnline.trend}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sales Chart */}
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
                  
                  <TabsContent value="today">
                    <SalesTabContent
                      period="Today"
                      current={salesData.today[1]}
                      previous={salesData.today[0]}
                    />
                  </TabsContent>
                  
                  <TabsContent value="week">
                    <SalesTabContent
                      period="This Week"
                      current={salesData.thisWeek[1]}
                      previous={salesData.thisWeek[0]}
                    />
                  </TabsContent>
                  
                  <TabsContent value="month">
                    <SalesTabContent
                      period="This Month"
                      current={salesData.thisMonth[1]}
                      previous={salesData.thisMonth[0]}
                    />
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
                      <Badge variant={
                        item.stock <= 2 ? "destructive" : 
                        item.stock <= 5 ? "outline" : "secondary"
                      }>
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

        {/* Staff Activity */}
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
                      <StaffStatusBadge status={staff.status} />
                      <p className="text-sm text-muted-foreground mt-1">{staff.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Staff: {totalStaffCount}</span>
                  <span className="text-green-500 font-medium">Online: {onlineStaffCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}