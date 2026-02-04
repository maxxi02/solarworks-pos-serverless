'use client';

import React, { useState } from 'react';
import { 
  Utensils, Pizza, Coffee, ShoppingBag, Star, Gift, 
  TrendingUp, Clock, Filter, Search, CheckCircle,
  Award, Tag, Percent,
  Flame, Calendar, Repeat, Target, Zap, Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


interface CustomerFoodAnalytics {
  customerId: string;
  name: string;
  email: string;
  avatarInitials: string;
  favoriteCategory: string;
  recentPurchases: FoodItem[];
  frequentlyPurchased: FoodItem[];
  availableCoupons: Coupon[];
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  dietaryPreferences: string[];
  foodPersonality: 'adventurous' | 'traditional' | 'health-conscious' | 'comfort-seeker';
  orderingFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
}

interface FoodItem {
  id: string;
  name: string;
  category: 'pizza' | 'burger' | 'pasta' | 'salad' | 'dessert' | 'drink' | 'appetizer';
  price: number;
  lastOrdered: string;
  orderCount: number;
  rating: number;
  imageColor: string;
  tags: string[];
}

interface Coupon {
  id: string;
  code: string;
  discount: string;
  description: string;
  validUntil: string;
  applicableItems: string[];
  status: 'available' | 'used' | 'expired';
  minOrderAmount?: number;
  type: 'percentage' | 'fixed' | 'bogo';
}

// Sample data
const customersAnalytics: CustomerFoodAnalytics[] = [
  {
    customerId: 'CUST001',
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    avatarInitials: 'AJ',
    favoriteCategory: 'pizza',
    totalSpent: 1250.75,
    averageOrderValue: 45.50,
    lastOrderDate: '2024-01-29',
    dietaryPreferences: ['Vegetarian', 'Gluten-Free Options'],
    foodPersonality: 'adventurous',
    orderingFrequency: 'weekly',
    recentPurchases: [
      { id: 'F001', name: 'Margherita Pizza', category: 'pizza', price: 18.99, lastOrdered: '2024-01-29', orderCount: 12, rating: 4.8, imageColor: 'bg-red-100', tags: ['vegetarian', 'chef-special'] },
      { id: 'F002', name: 'Caesar Salad', category: 'salad', price: 12.50, lastOrdered: '2024-01-28', orderCount: 8, rating: 4.5, imageColor: 'bg-green-100', tags: ['healthy', 'low-cal'] },
      { id: 'F003', name: 'Tiramisu', category: 'dessert', price: 8.99, lastOrdered: '2024-01-27', orderCount: 15, rating: 4.9, imageColor: 'bg-amber-100', tags: ['dessert', 'italian'] },
      { id: 'F004', name: 'Iced Latte', category: 'drink', price: 4.99, lastOrdered: '2024-01-29', orderCount: 25, rating: 4.7, imageColor: 'bg-blue-100', tags: ['coffee', 'cold'] },
    ],
    frequentlyPurchased: [
      { id: 'F001', name: 'Margherita Pizza', category: 'pizza', price: 18.99, lastOrdered: '2024-01-29', orderCount: 12, rating: 4.8, imageColor: 'bg-red-100', tags: ['vegetarian'] },
      { id: 'F005', name: 'BBQ Chicken Pizza', category: 'pizza', price: 21.99, lastOrdered: '2024-01-25', orderCount: 9, rating: 4.6, imageColor: 'bg-orange-100', tags: ['spicy', 'meat'] },
      { id: 'F004', name: 'Iced Latte', category: 'drink', price: 4.99, lastOrdered: '2024-01-29', orderCount: 25, rating: 4.7, imageColor: 'bg-blue-100', tags: ['coffee'] },
      { id: 'F006', name: 'Garlic Bread', category: 'appetizer', price: 6.99, lastOrdered: '2024-01-26', orderCount: 7, rating: 4.4, imageColor: 'bg-yellow-100', tags: ['appetizer'] },
    ],
    availableCoupons: [
      { id: 'CPN001', code: 'PIZZA20', discount: '20%', description: '20% off any pizza', validUntil: '2024-02-15', applicableItems: ['All Pizzas'], status: 'available', type: 'percentage' },
      { id: 'CPN002', code: 'LOYAL10', discount: '$10', description: '$10 off next order', validUntil: '2024-02-28', applicableItems: ['All Items'], status: 'available', minOrderAmount: 40, type: 'fixed' },
      { id: 'CPN003', code: 'DESSERTBOGO', discount: 'BOGO', description: 'Buy one dessert get one free', validUntil: '2024-02-10', applicableItems: ['Desserts'], status: 'available', type: 'bogo' },
    ]
  },
  {
    customerId: 'CUST002',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    avatarInitials: 'SC',
    favoriteCategory: 'salad',
    totalSpent: 890.25,
    averageOrderValue: 32.75,
    lastOrderDate: '2024-01-29',
    dietaryPreferences: ['Vegan', 'Organic'],
    foodPersonality: 'health-conscious',
    orderingFrequency: 'bi-weekly',
    recentPurchases: [
      { id: 'F007', name: 'Quinoa Bowl', category: 'salad', price: 14.99, lastOrdered: '2024-01-29', orderCount: 6, rating: 4.9, imageColor: 'bg-emerald-100', tags: ['vegan', 'organic'] },
      { id: 'F008', name: 'Green Smoothie', category: 'drink', price: 7.99, lastOrdered: '2024-01-28', orderCount: 12, rating: 4.7, imageColor: 'bg-green-100', tags: ['healthy', 'vegan'] },
      { id: 'F009', name: 'Avocado Toast', category: 'appetizer', price: 10.99, lastOrdered: '2024-01-27', orderCount: 8, rating: 4.6, imageColor: 'bg-lime-100', tags: ['vegetarian'] },
    ],
    frequentlyPurchased: [
      { id: 'F007', name: 'Quinoa Bowl', category: 'salad', price: 14.99, lastOrdered: '2024-01-29', orderCount: 6, rating: 4.9, imageColor: 'bg-emerald-100', tags: ['vegan'] },
      { id: 'F008', name: 'Green Smoothie', category: 'drink', price: 7.99, lastOrdered: '2024-01-28', orderCount: 12, rating: 4.7, imageColor: 'bg-green-100', tags: ['healthy'] },
      { id: 'F010', name: 'Greek Salad', category: 'salad', price: 13.50, lastOrdered: '2024-01-20', orderCount: 5, rating: 4.5, imageColor: 'bg-teal-100', tags: ['vegetarian'] },
    ],
    availableCoupons: [
      { id: 'CPN004', code: 'HEALTH15', discount: '15%', description: '15% off healthy meals', validUntil: '2024-02-20', applicableItems: ['Salads', 'Smoothies'], status: 'available', type: 'percentage' },
      { id: 'CPN005', code: 'VEGAN5', discount: '$5', description: '$5 off vegan items', validUntil: '2024-02-14', applicableItems: ['Vegan Items'], status: 'available', type: 'fixed' },
    ]
  },
  {
    customerId: 'CUST003',
    name: 'Miguel Santos',
    email: 'miguel.santos@email.com',
    avatarInitials: 'MS',
    favoriteCategory: 'burger',
    totalSpent: 1560.50,
    averageOrderValue: 52.15,
    lastOrderDate: '2024-01-29',
    dietaryPreferences: ['Meat Lover', 'Spicy'],
    foodPersonality: 'comfort-seeker',
    orderingFrequency: 'daily',
    recentPurchases: [
      { id: 'F011', name: 'Double Cheeseburger', category: 'burger', price: 16.99, lastOrdered: '2024-01-29', orderCount: 18, rating: 4.8, imageColor: 'bg-amber-100', tags: ['meat', 'cheese'] },
      { id: 'F012', name: 'Loaded Fries', category: 'appetizer', price: 8.99, lastOrdered: '2024-01-29', orderCount: 22, rating: 4.7, imageColor: 'bg-orange-100', tags: ['spicy', 'shareable'] },
      { id: 'F013', name: 'Chocolate Milkshake', category: 'drink', price: 6.99, lastOrdered: '2024-01-28', orderCount: 15, rating: 4.9, imageColor: 'bg-brown-100', tags: ['dessert', 'cold'] },
    ],
    frequentlyPurchased: [
      { id: 'F011', name: 'Double Cheeseburger', category: 'burger', price: 16.99, lastOrdered: '2024-01-29', orderCount: 18, rating: 4.8, imageColor: 'bg-amber-100', tags: ['meat'] },
      { id: 'F012', name: 'Loaded Fries', category: 'appetizer', price: 8.99, lastOrdered: '2024-01-29', orderCount: 22, rating: 4.7, imageColor: 'bg-orange-100', tags: ['spicy'] },
      { id: 'F014', name: 'Spicy Chicken Burger', category: 'burger', price: 15.99, lastOrdered: '2024-01-25', orderCount: 10, rating: 4.6, imageColor: 'bg-red-100', tags: ['spicy', 'chicken'] },
    ],
    availableCoupons: [
      { id: 'CPN006', code: 'BURGER25', discount: '25%', description: '25% off all burgers', validUntil: '2024-02-05', applicableItems: ['Burgers'], status: 'available', type: 'percentage' },
      { id: 'CPN007', code: 'FREEFRIES', discount: 'Free', description: 'Free fries with burger', validUntil: '2024-02-12', applicableItems: ['Burgers'], status: 'available', type: 'bogo' },
    ]
  },
];

const FoodAnalyticsDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pizza' | 'burger' | 'salad' | 'dessert' | 'drink'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'frequent' | 'spent'>('recent');

  // Filter and sort customers
  const filteredCustomers = customersAnalytics
    .filter(customer => {
      const matchesSearch = searchQuery === '' || 
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.favoriteCategory.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || 
        customer.favoriteCategory === categoryFilter ||
        customer.recentPurchases.some(item => item.category === categoryFilter) ||
        customer.frequentlyPurchased.some(item => item.category === categoryFilter);
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        case 'frequent':
          const freqOrder = { daily: 4, weekly: 3, 'bi-weekly': 2, monthly: 1 };
          return freqOrder[b.orderingFrequency] - freqOrder[a.orderingFrequency];
        case 'spent':
          return b.totalSpent - a.totalSpent;
        default:
          return 0;
      }
    });

  // Get selected customer data
  const currentCustomer = selectedCustomer 
    ? customersAnalytics.find(c => c.customerId === selectedCustomer)
    : filteredCustomers[0];

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pizza': return <Pizza className="h-4 w-4" />;
      case 'burger': return <Utensils className="h-4 w-4" />;
      case 'salad': return <CheckCircle className="h-4 w-4" />;
      case 'dessert': return <Star className="h-4 w-4" />;
      case 'drink': return <Coffee className="h-4 w-4" />;
      default: return <ShoppingBag className="h-4 w-4" />;
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pizza': return 'text-red-600 bg-red-50 border-red-200';
      case 'burger': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'salad': return 'text-green-600 bg-green-50 border-green-200';
      case 'dessert': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'drink': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'appetizer': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get personality color
  const getPersonalityColor = (personality: string) => {
    switch (personality) {
      case 'adventurous': return 'text-purple-600 bg-purple-50';
      case 'traditional': return 'text-blue-600 bg-blue-50';
      case 'health-conscious': return 'text-green-600 bg-green-50';
      case 'comfort-seeker': return 'text-amber-600 bg-amber-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate total coupons available
  const totalCouponsAvailable = customersAnalytics.reduce(
    (sum, customer) => sum + customer.availableCoupons.filter(c => c.status === 'available').length, 
    0
  );

  // Calculate total revenue from selected customers
  const totalRevenue = filteredCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  // Calculate average order frequency
  const avgOrderFrequency = filteredCustomers.length > 0 
    ? filteredCustomers.reduce((sum, customer) => {
        const freqValue = { daily: 7, weekly: 1, 'bi-weekly': 0.5, monthly: 0.25 }[customer.orderingFrequency];
        return sum + freqValue;
      }, 0) / filteredCustomers.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Food Analytics & Coupons
              </h2>
              <p className="text-muted-foreground">
                Analyze customer food preferences and manage personalized coupons
              </p>
            </div>
            <Button className="inline-flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Send Bulk Coupons
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredCustomers.length}</div>
              <p className="text-xs text-muted-foreground">
                With food preferences
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coupons Available</CardTitle>
              <Gift className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCouponsAvailable}</div>
              <p className="text-xs text-muted-foreground">
                Active personalized offers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From selected customers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Frequency</CardTitle>
              <Repeat className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgOrderFrequency.toFixed(1)}x/week</div>
              <p className="text-xs text-muted-foreground">
                Average ordering rate
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
                    placeholder="Search by name, email, or favorite food..."
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
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'pizza' | 'burger' | 'salad' | 'dessert' | 'drink')}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="pizza">Pizza</option>
                    <option value="burger">Burger</option>
                    <option value="salad">Salad</option>
                    <option value="dessert">Dessert</option>
                    <option value="drink">Drink</option>
                  </select>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'frequent' | 'spent')}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
                >
                  <option value="recent">Recent Orders</option>
                  <option value="frequent">Order Frequency</option>
                  <option value="spent">Total Spent</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer List Column */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>
                  {filteredCustomers.length} customers with food preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.customerId}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        currentCustomer?.customerId === customer.customerId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedCustomer(customer.customerId)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {customer.avatarInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-foreground truncate">
                              {customer.name}
                            </h4>
                            <Badge variant="outline" className={`text-xs ${getPersonalityColor(customer.foodPersonality)}`}>
                              {customer.foodPersonality}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {customer.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${getCategoryColor(customer.favoriteCategory)}`}>
                              {getCategoryIcon(customer.favoriteCategory)}
                              <span className="capitalize">{customer.favoriteCategory}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${customer.totalSpent.toLocaleString()} spent
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics & Coupons Column */}
          <div className="lg:col-span-2">
            {currentCustomer && (
              <>
                {/* Customer Profile Header */}
                <Card className="mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-lg bg-primary/10 text-primary">
                            {currentCustomer.avatarInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">
                            {currentCustomer.name}
                          </h3>
                          <p className="text-muted-foreground">{currentCustomer.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="gap-1">
                              <Flame className="h-3 w-3" />
                              {currentCustomer.orderingFrequency} orders
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Target className="h-3 w-3" />
                              {currentCustomer.favoriteCategory}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Zap className="h-3 w-3" />
                              {currentCustomer.foodPersonality}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          ${currentCustomer.totalSpent.toLocaleString()}
                        </div>
                        <p className="text-sm text-muted-foreground">Total spent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Recent Purchases */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Purchases
                      </CardTitle>
                      <CardDescription>
                        Last ordered items
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentCustomer.recentPurchases.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                            <div className={`h-10 w-10 rounded-lg ${item.imageColor} flex items-center justify-center`}>
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{item.name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>${item.price}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {item.rating}
                                </span>
                                <span>•</span>
                                <span>{formatDate(item.lastOrdered)}</span>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {item.orderCount}x ordered
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Frequently Purchased */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Repeat className="h-5 w-5" />
                        Frequently Purchased
                      </CardTitle>
                      <CardDescription>
                        Most ordered items
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentCustomer.frequentlyPurchased.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg ${item.imageColor} flex items-center justify-center`}>
                                {getCategoryIcon(item.category)}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Ordered {item.orderCount} times
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-foreground">${item.price}</div>
                              <div className="text-xs text-muted-foreground">
                                Last: {formatDate(item.lastOrdered)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Coupons Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Available Coupons
                    </CardTitle>
                    <CardDescription>
                      Personalized offers for {currentCustomer.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentCustomer.availableCoupons.map((coupon) => (
                        <div key={coupon.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className={`text-2xl font-bold ${
                                coupon.type === 'percentage' ? 'text-green-600' :
                                coupon.type === 'fixed' ? 'text-blue-600' : 'text-purple-600'
                              }`}>
                                {coupon.discount}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {coupon.type === 'bogo' ? 'Buy One Get One' : 'Discount'}
                              </div>
                            </div>
                            {coupon.type === 'percentage' ? (
                              <Percent className="h-8 w-8 text-green-200" />
                            ) : coupon.type === 'fixed' ? (
                              <Tag className="h-8 w-8 text-blue-200" />
                            ) : (
                              <Award className="h-8 w-8 text-purple-200" />
                            )}
                          </div>
                          
                          <div className="mb-3">
                            <div className="font-medium text-foreground">{coupon.description}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Code: <span className="font-mono font-bold">{coupon.code}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Valid until {formatDate(coupon.validUntil)}
                            </div>
                            {coupon.minOrderAmount && (
                              <div className="mt-1">
                                Min order: ${coupon.minOrderAmount}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {coupon.applicableItems.join(', ')}
                            </Badge>
                            <Button size="sm" variant="outline">
                              Apply Now
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Generate New Coupon */}
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">Generate New Coupon</h4>
                          <p className="text-sm text-muted-foreground">
                            Create personalized offer based on {currentCustomer.name}&apos;s preferences
                          </p>
                        </div>
                        <Button className="gap-2">
                          <Gift className="h-4 w-4" />
                          Create Coupon
                        </Button>
                      </div>
                      
                      {/* Quick Suggestions */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                        <Button variant="outline" size="sm" className="justify-start">
                          <Pizza className="h-4 w-4 mr-2" />
                          20% off {currentCustomer.favoriteCategory}
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start">
                          <Repeat className="h-4 w-4 mr-2" />
                          Free item after 5 orders
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start">
                          <Star className="h-4 w-4 mr-2" />
                          Birthday special
                        </Button>
                      </div>
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

export default FoodAnalyticsDashboard;