'use client';

import { useState } from 'react';
import { Star, MessageSquare, User, Calendar, ThumbsUp, Filter } from 'lucide-react';

const customers = [
  { id: '1', name: 'Maria Santos', email: 'maria@email.com', visits: 25, lastVisit: '2024-01-25' },
  { id: '2', name: 'Juan Cruz', email: 'juan@email.com', visits: 18, lastVisit: '2024-01-24' },
  { id: '3', name: 'Ana Reyes', email: 'ana@email.com', visits: 32, lastVisit: '2024-01-25' },
];

const feedbacks = [
  { 
    id: '1', 
    customerId: '1', 
    rating: 5, 
    comment: 'Love their caramel macchiato! Best coffee in town.', 
    date: '2024-01-25',
    helpful: 12
  },
  { 
    id: '2', 
    customerId: '1', 
    rating: 4, 
    comment: 'Great service but the place gets crowded during peak hours.', 
    date: '2024-01-20',
    helpful: 8
  },
  { 
    id: '3', 
    customerId: '2', 
    rating: 3, 
    comment: 'Coffee was okay, but the croissant was a bit dry.', 
    date: '2024-01-24',
    helpful: 3
  },
  { 
    id: '4', 
    customerId: '3', 
    rating: 5, 
    comment: 'Perfect matcha latte every time! Highly recommended.', 
    date: '2024-01-25',
    helpful: 15
  },
];

export default function CustomerFeedback() {
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]);
  const [filterRating, setFilterRating] = useState(0);
  
  const customerFeedbacks = feedbacks
    .filter(f => f.customerId === selectedCustomer.id)
    .filter(f => filterRating === 0 || f.rating === filterRating);

  const averageRating = feedbacks
    .filter(f => f.customerId === selectedCustomer.id)
    .reduce((sum, f) => sum + f.rating, 0) / 
    feedbacks.filter(f => f.customerId === selectedCustomer.id).length || 0;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
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
        <p className="text-muted-foreground">View customer ratings and comments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Customers</h3>
            <div className="space-y-3">
              {customers.map(customer => {
                const custFeedbacks = feedbacks.filter(f => f.customerId === customer.id);
                const avgRating = custFeedbacks.reduce((sum, f) => sum + f.rating, 0) / custFeedbacks.length || 0;
                
                return (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedCustomer.id === customer.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        {renderStars(Math.round(avgRating))}
                        <span className="text-muted-foreground ml-1">({avgRating.toFixed(1)})</span>
                      </div>
                      <span className="text-muted-foreground">{custFeedbacks.length} reviews</span>
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
                    <span className="font-bold">{averageRating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Reviews</span>
                <span className="font-bold">
                  {feedbacks.filter(f => f.customerId === selectedCustomer.id).length}
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
                <p className="text-muted-foreground">No feedback available for this customer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customerFeedbacks.map(feedback => (
                  <div key={feedback.id} className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {renderStars(feedback.rating)}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{feedback.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{feedback.helpful} helpful</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{feedback.comment}</p>
                    
                    <div className="flex gap-2">
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        Helpful
                      </button>
                      <button className="text-sm text-gray-600 hover:text-gray-800">
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rating Distribution */}
          <div className="mt-6 bg-card rounded-xl shadow p-6">
            <h3 className="font-semibold mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = feedbacks.filter(f => 
                  f.customerId === selectedCustomer.id && f.rating === rating
                ).length;
                const total = feedbacks.filter(f => f.customerId === selectedCustomer.id).length;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-16">
                      {renderStars(rating)}
                      <span className="text-sm text-muted-foreground">({count})</span>
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