"use client";

import { useState, useEffect } from "react";
import {
  Star,
  MessageSquare,
  User,
  Calendar,
  ThumbsUp,
  Filter,
  Loader2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  visits: number;
  lastVisit: string | null;
}

interface Feedback {
  id: string;
  customerId: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

export default function CustomerFeedback() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [filterRating, setFilterRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/reports/custom-reports");
        const json = await res.json();
        if (json.success) {
          setCustomers(json.data.customers || []);
          setFeedbacks(json.data.feedbacks || []);
          if (json.data.customers?.length > 0) {
            setSelectedCustomer(json.data.customers[0]);
          }
        } else {
          setError(json.error || "Failed to load custom reports");
        }
      } catch (err) {
        setError("Network error — could not load custom reports");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading custom reports…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (customers.length === 0 || !selectedCustomer) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No customer feedback available yet.
          </p>
        </div>
      </div>
    );
  }

  const customerFeedbacks = feedbacks
    .filter((f) => f.customerId === selectedCustomer.id)
    .filter((f) => filterRating === 0 || f.rating === filterRating);

  const averageRating =
    feedbacks
      .filter((f) => f.customerId === selectedCustomer.id)
      .reduce((sum, f) => sum + f.rating, 0) /
      feedbacks.filter((f) => f.customerId === selectedCustomer.id).length || 0;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Customer Feedback</h1>
        <p className="text-muted-foreground">
          View customer ratings and comments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Customers</h3>
            <div className="space-y-3">
              {customers.map((customer) => {
                const custFeedbacks = feedbacks.filter(
                  (f) => f.customerId === customer.id,
                );
                const avgRating =
                  custFeedbacks.reduce((sum, f) => sum + f.rating, 0) /
                    custFeedbacks.length || 0;

                return (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedCustomer.id === customer.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        {renderStars(Math.round(avgRating))}
                        <span className="text-muted-foreground ml-1">
                          ({avgRating.toFixed(1)})
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {custFeedbacks.length} reviews
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Customer Summary</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Average Rating</span>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(averageRating))}
                    <span className="font-bold">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Reviews</span>
                <span className="font-bold">
                  {
                    feedbacks.filter(
                      (f) => f.customerId === selectedCustomer.id,
                    ).length
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Visits</span>
                <span className="font-bold">{selectedCustomer.visits}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Feedback from {selectedCustomer.name}
                </h3>
                <p className="text-muted-foreground">
                  {customerFeedbacks.length} reviews
                </p>
              </div>

              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(Number(e.target.value))}
                  className="border rounded px-3 py-1 text-sm bg-background"
                >
                  <option value="0">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>

            {customerFeedbacks.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No feedback available for this customer
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {customerFeedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {renderStars(feedback.rating)}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{feedback.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-white-700">{feedback.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rating Distribution */}
          <div className="mt-6 bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = feedbacks.filter(
                  (f) =>
                    f.customerId === selectedCustomer.id && f.rating === rating,
                ).length;
                const total = feedbacks.filter(
                  (f) => f.customerId === selectedCustomer.id,
                ).length;
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      {renderStars(rating)}
                      <span className="text-sm text-muted-foreground">
                        ({count})
                      </span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
