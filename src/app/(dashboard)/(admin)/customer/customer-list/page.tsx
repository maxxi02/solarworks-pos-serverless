"use client";

import { useState } from "react";
import { Users, Search, Mail, CheckCircle, UserX, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useUsers } from "../../staff-management/_components/use-users";
import { TableUser } from "../../staff-management/_components/staffManagement.types";
import { useEffect, useMemo } from "react";

interface Customer {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  lastLogin: string;
  status: "active" | "inactive" | "new";
  orderCount: number;
  totalSpent: number;
}

// Static data removed, using useUsers hook below

export default function CustomerListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [stats, setStats] = useState({ total: 0, active: 0, new: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCustomers = async (page = 1, append = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusFilter,
        sortBy: sortBy,
      });

      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const mapped: Customer[] = result.data.customers.map((u: any) => ({
          id: u.id || u._id,
          name: u.name || "Unknown",
          email: u.email,
          image: u.image,
          createdAt: u.createdAt,
          lastLogin: u.lastActive || u.createdAt,
          status: getFrontendStatus(u),
          orderCount: u.orderCount || 0,
          totalSpent: u.totalSpent || 0,
        }));

        setCustomers((prev) => (append ? [...prev, ...mapped] : mapped));
        setPagination(result.data.pagination);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getFrontendStatus = (u: any) => {
    if (u.banned) return "inactive";
    const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    if (new Date(u.createdAt).getTime() > sevenDaysAgo) return "new";
    return "active";
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchCustomers(1, false);
  }, [searchQuery, statusFilter, sortBy]);

  const handleLoadMore = () => {
    if (currentPage < pagination.pages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchCustomers(nextPage, true);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: {
        icon: <CheckCircle className="h-3 w-3" />,
        color: "bg-green-100 text-green-800",
      },
      inactive: {
        icon: <UserX className="h-3 w-3" />,
        color: "bg-gray-100 text-gray-800",
      },
      new: {
        icon: <Star className="h-3 w-3" />,
        color: "bg-blue-100 text-blue-800",
      },
    };
    const { icon, color } =
      config[status as keyof typeof config] || config.active;

    return (
      <Badge className={`${color} gap-1 capitalize`}>
        {icon} {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Customer List
          </h2>
          <p className="text-muted-foreground">
            Manage all registered customers
          </p>
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
                  <SelectTrigger className="w-35">
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
                  <SelectTrigger className="w-35">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="orders">Most Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>Customers ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Users className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {customer.image ? (
                        <div className="h-10 w-10 rounded-full overflow-hidden border">
                          <img src={customer.image} alt={customer.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-medium text-primary">
                            {customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                      )}
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
                        <div className="text-sm">
                          {formatDate(customer.createdAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(customer.lastLogin)}
                        </div>
                      </div>

                      {getStatusBadge(customer.status)}

                      <div className="text-right w-24">
                        <div className="font-medium">{customer.orderCount}</div>
                        <div className="text-xs text-muted-foreground">
                          orders
                        </div>
                      </div>

                      <div className="text-right w-24">
                        <div className="font-medium">₱{customer.totalSpent.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          spent
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.location.href = `/customer/analytics?id=${customer.id}`}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}

                {currentPage < pagination.pages && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <Users className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!loading && customers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No customers found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search"
                    : "No customers match filters"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
