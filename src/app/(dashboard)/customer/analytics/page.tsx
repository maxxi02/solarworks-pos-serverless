'use client';

import { useState } from 'react';
import { Coffee, Utensils, Users, Gift, TrendingUp, Clock, Search, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomerAnalytics {
  customerId: string;
  name: string;
  email: string;
  favoriteCategory: string;
  recentPurchases: PurchaseItem[];
  frequentlyPurchased: PurchaseItem[];
  availableCoupons: Coupon[];
  totalSpent: number;
  orderingFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
}

interface PurchaseItem {
  id: string;
  name: string;
  category: string;
  price: number;
  lastOrdered: string;
  orderCount: number;
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  description: string;
  validUntil: string;
  type: 'percentage' | 'fixed' | 'bogo';
}

// Sample data - simplified
const customersAnalytics: CustomerAnalytics[] = [
  {
    customerId: 'CUST001',
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    favoriteCategory: 'espresso',
    totalSpent: 1250.75,
    orderingFrequency: 'weekly',
    recentPurchases: [
      { id: 'iced-coffee-jelly', name: 'Iced Coffee Jelly', category: 'espresso', price: 170, lastOrdered: '2024-01-29', orderCount: 5 },
      { id: 'blueberry-muffin', name: 'Blueberry Muffin', category: 'breads-pastries', price: 150, lastOrdered: '2024-01-28', orderCount: 3 },
      { id: 'spanish-latte', name: 'Spanish Latte', category: 'espresso', price: 150, lastOrdered: '2024-01-29', orderCount: 8 },
    ],
    frequentlyPurchased: [
      { id: 'spanish-latte', name: 'Spanish Latte', category: 'espresso', price: 150, lastOrdered: '2024-01-29', orderCount: 8 },
      { id: 'iced-coffee-jelly', name: 'Iced Coffee Jelly', category: 'espresso', price: 170, lastOrdered: '2024-01-29', orderCount: 5 },
      { id: 'americano', name: 'Americano', category: 'espresso', price: 99, lastOrdered: '2024-01-25', orderCount: 4 },
    ],
    availableCoupons: [
      { id: 'CPN001', code: 'ESPRESSO20', discount: '20%', description: '20% off espresso drinks', validUntil: '2024-02-15', type: 'percentage' },
      { id: 'CPN002', code: 'COFFEE10', discount: '₱10', description: '₱10 off next coffee', validUntil: '2024-02-28', type: 'fixed' },
    ]
  },
  {
    customerId: 'CUST002',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    favoriteCategory: 'specials',
    totalSpent: 890.25,
    orderingFrequency: 'bi-weekly',
    recentPurchases: [
      { id: 'matcha-sea-foam', name: 'Matcha Sea Foam', category: 'specials', price: 179, lastOrdered: '2024-01-29', orderCount: 6 },
      { id: 'strawberry-matcha-latte', name: 'Strawberry Matcha Latte', category: 'specials', price: 169, lastOrdered: '2024-01-28', orderCount: 4 },
    ],
    frequentlyPurchased: [
      { id: 'matcha-sea-foam', name: 'Matcha Sea Foam', category: 'specials', price: 179, lastOrdered: '2024-01-29', orderCount: 6 },
      { id: 'matcha-latte', name: 'Matcha Latte', category: 'specials', price: 150, lastOrdered: '2024-01-20', orderCount: 5 },
    ],
    availableCoupons: [
      { id: 'CPN003', code: 'MATCHA15', discount: '15%', description: '15% off matcha drinks', validUntil: '2024-02-20', type: 'percentage' },
    ]
  },
];

export default function FoodAnalyticsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(customersAnalytics[0].customerId);

  const currentCustomer = customersAnalytics.find(c => c.customerId === selectedCustomer);

  const stats = {
    totalCustomers: customersAnalytics.length,
    totalCoupons: customersAnalytics.reduce((sum, c) => sum + c.availableCoupons.length, 0),
    totalRevenue: customersAnalytics.reduce((sum, c) => sum + c.totalSpent, 0),
    avgFrequency: 2.5 // Hardcoded for simplicity
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const getCategoryIcon = (category: string) => {
    return ['espresso', 'specials', 'frappe'].includes(category) ? 
      <Coffee className="h-4 w-4" /> : <Utensils className="h-4 w-4" />;
  };

  const getCouponColor = (type: string) => {
    return type === 'percentage' ? 'text-green-600' : 
           type === 'fixed' ? 'text-blue-600' : 'text-purple-600';
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Food Analytics</h2>
          <p className="text-muted-foreground">Customer preferences & coupons</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                </div>
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Coupons</p>
                  <p className="text-2xl font-bold">{stats.totalCoupons}</p>
                </div>
                <Gift className="h-6 w-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">₱{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Frequency</p>
                  <p className="text-2xl font-bold">{stats.avgFrequency}x/week</p>
                </div>
                <Repeat className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customers List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customersAnalytics.map((customer) => (
                    <div
                      key={customer.customerId}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        selectedCustomer === customer.customerId ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setSelectedCustomer(customer.customerId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-medium">{customer.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryIcon(customer.favoriteCategory)}
                              {customer.favoriteCategory}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ₱{customer.totalSpent.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Details */}
          <div className="lg:col-span-2">
            {currentCustomer && (
              <>
                {/* Customer Header */}
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{currentCustomer.name}</h3>
                        <p className="text-muted-foreground">{currentCustomer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{currentCustomer.orderingFrequency}</Badge>
                          <Badge variant="outline">₱{currentCustomer.totalSpent.toLocaleString()} spent</Badge>
                        </div>
                      </div>
                      <Button className="gap-2">
                        <Gift className="h-4 w-4" />
                        Create Coupon
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Purchases */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Recent Purchases
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentCustomer.recentPurchases.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(item.lastOrdered)} • {item.orderCount}x
                              </div>
                            </div>
                            <div className="font-semibold">₱{item.price}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Repeat className="h-4 w-4" />
                        Frequent Purchases
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentCustomer.frequentlyPurchased.map((item) => (
                          <div key={item.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Ordered {item.orderCount} times • Last: {formatDate(item.lastOrdered)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Coupons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Available Coupons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {currentCustomer.availableCoupons.map((coupon) => (
                        <div key={coupon.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className={`text-xl font-bold ${getCouponColor(coupon.type)}`}>
                                {coupon.discount}
                              </div>
                              <div className="font-medium">{coupon.description}</div>
                              <div className="text-sm text-muted-foreground">
                                Code: <span className="font-mono">{coupon.code}</span> • Valid until {formatDate(coupon.validUntil)}
                              </div>
                            </div>
                            <Button size="sm">Apply</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}