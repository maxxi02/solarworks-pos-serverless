'use client';

import { useState, useEffect, useMemo } from 'react';
import { Coffee, Utensils, Users, TrendingUp, Clock, Search, Repeat, Star, ShoppingBag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LatestOrder {
  orderId: string;
  orderNumber: string;
  total: number;
  itemCount: number;
  summary: string;
  createdAt: string | null;
  queueStatus: string;
  orderType: string;
  rating: number | null;
}

interface FrequentOrder {
  name: string;
  category: string;
  price: number;
  orderCount: number;
  lastOrdered: string;
}

interface CustomerAnalytics {
  customerId: string;
  name: string;
  email: string;
  image: string | null;
  favoriteCategory: string;
  totalSpent: number;
  orderCount: number;
  orderingFrequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'rare';
  latestOrders: LatestOrder[];
  frequentOrders: FrequentOrder[];
}

interface AnalyticsStats {
  totalCustomers: number;
  totalRevenue: number;
  avgOrdersPerCustomer: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CustomerAnalyticsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerAnalytics[]>([]);
  const [details, setDetails] = useState<Record<string, Partial<CustomerAnalytics>>>({});
  const [stats, setStats] = useState<AnalyticsStats>({ totalCustomers: 0, totalRevenue: 0, avgOrdersPerCustomer: 0 });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial list
  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/customers/analytics');
        const json = await res.json();
        if (json.success) {
          setCustomers(json.data.customers);
          setStats(json.data.stats);

          // Get ID from URL or default to first
          const urlParams = new URLSearchParams(window.location.search);
          const initialId = urlParams.get('id');
          const defaultId = initialId || (json.data.customers.length > 0 ? json.data.customers[0].customerId : null);
          
          if (defaultId) {
            setSelectedCustomerId(defaultId);
            fetchDetails(defaultId);
          }
        } else {
          setError(json.error || 'Failed to load analytics');
        }
      } catch {
        setError('Network error — could not load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, []);

  const fetchDetails = async (id: string) => {
    if (details[id]?.latestOrders) return; // Already cached
    
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/analytics?id=${id}`);
      const json = await res.json();
      if (json.success) {
        setDetails(prev => ({ ...prev, [id]: json.data }));
      }
    } catch (err) {
      console.error("Failed to fetch customer details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const rawCurrentCustomer = useMemo(() => {
     return filteredCustomers.find((c) => c.customerId === selectedCustomerId)
    || filteredCustomers[0]
    || null;
  }, [filteredCustomers, selectedCustomerId]);

  // Merge list data with fetched details
  const currentCustomer = useMemo(() => {
    if (!rawCurrentCustomer) return null;
    const detail = details[rawCurrentCustomer.customerId];
    return { ...rawCurrentCustomer, ...detail } as CustomerAnalytics;
  }, [rawCurrentCustomer, details]);

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    fetchDetails(id);
    // Update URL without refreshing
    const url = new URL(window.location.href);
    url.searchParams.set('id', id);
    window.history.pushState({}, '', url);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryIcon = (category: string) =>
    ['espresso', 'specials', 'frappe', 'drinks'].includes(category?.toLowerCase())
      ? <Coffee className="h-4 w-4" />
      : <Utensils className="h-4 w-4" />;

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
      />
    ));

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading customer analytics…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Could not load analytics</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Customer Analytics</h2>
          <p className="text-muted-foreground">Order history &amp; preferences of your registered customers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Customers with Orders</p>
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
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
                  <p className="text-sm text-muted-foreground">Avg Orders / Customer</p>
                  <p className="text-2xl font-bold">{stats.avgOrdersPerCustomer}</p>
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
                placeholder="Search customers by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Empty state — no customers with orders */}
        {filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No customer orders found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery
                  ? 'No customers match your search.'
                  : 'No Google-authenticated customer has placed an order yet.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Two Columns: List + Detail */}
        {filteredCustomers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.customerId}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          (selectedCustomerId ?? null) === customer.customerId
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        }`}
                        onClick={() => handleCustomerSelect(customer.customerId)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          {customer.image ? (
                            <img
                              src={customer.image}
                              alt={customer.name}
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="font-medium text-sm">
                                {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{customer.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs gap-1">
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

            {/* Customer Detail */}
            <div className="lg:col-span-2 relative">
               {/* Detail Loading Overlay */}
               {detailLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
                    <div className="flex flex-col items-center gap-2 bg-background p-4 rounded-xl border shadow-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground font-medium">Updating details...</p>
                    </div>
                  </div>
                )}

              {currentCustomer ? (
                <>
                  {/* Customer Header Card */}
                  <Card className="mb-6">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {currentCustomer.image ? (
                          <img
                            src={currentCustomer.image}
                            alt={currentCustomer.name}
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold">
                              {currentCustomer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold">{currentCustomer.name}</h3>
                          <p className="text-muted-foreground text-sm">{currentCustomer.email}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary">{currentCustomer.orderingFrequency || 'Computing...'}</Badge>
                            <Badge variant="outline">₱{currentCustomer.totalSpent.toLocaleString()} spent</Badge>
                            <Badge variant="outline">{currentCustomer.orderCount} orders</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Latest & Frequent Orders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Latest Orders */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Latest Orders
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!currentCustomer.latestOrders ? (
                          <div className="flex justify-center py-8">
                             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : currentCustomer.latestOrders.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
                        ) : (
                          <div className="space-y-3">
                            {currentCustomer.latestOrders.map((order) => (
                              <div key={order.orderId} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {order.orderNumber}
                                  </span>
                                  <span className="font-semibold text-sm">₱{order.total.toLocaleString()}</span>
                                </div>
                                <p className="text-sm truncate" title={order.summary}>
                                  {order.summary}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(order.createdAt)} · {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                                  </span>
                                  {order.rating !== null && (
                                    <div className="flex items-center gap-0.5">
                                      {renderStars(order.rating)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Frequent Orders */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          Frequent Orders
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!currentCustomer.frequentOrders ? (
                          <div className="flex justify-center py-8">
                             <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : currentCustomer.frequentOrders.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                        ) : (
                          <div className="space-y-3">
                            {currentCustomer.frequentOrders.map((item, idx) => (
                              <div key={`${item.name}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <div className="font-medium text-sm">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Ordered {item.orderCount}× · Last: {formatDate(item.lastOrdered)}
                                  </div>
                                </div>
                                <span className="text-sm font-semibold">₱{item.price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>


                </>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}