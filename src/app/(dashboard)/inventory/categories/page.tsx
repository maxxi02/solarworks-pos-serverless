'use client';

import { useState } from 'react';
import {Coffee as Espresso, Sandwich, IceCream, GlassWater, Plus, X, Edit2, Trash2,Package } from 'lucide-react';

const categories = [
  { 
    id: '1', 
    name: 'Espresso Bar', 
    icon: Espresso, 
    items: 8, 
    revenue: 45200, 
    color: 'bg-amber-700',
    description: 'Classic espresso drinks',
    menuItems: [
      { id: '1', name: 'Cappuccino', price: 180, description: 'Espresso with steamed milk foam' },
      { id: '2', name: 'Caramel Macchiato', price: 200, description: 'Vanilla syrup, milk, espresso, caramel' },
      { id: '3', name: 'Americano', price: 140, description: 'Espresso with hot water' },
      { id: '4', name: 'Latte', price: 190, description: 'Espresso with steamed milk' },
      { id: '5', name: 'Mocha', price: 210, description: 'Chocolate, espresso, milk' },
      { id: '6', name: 'Flat White', price: 185, description: 'Ristretto with microfoam' },
    ]
  },
  { 
    id: '2', 
    name: 'Food Menu', 
    icon: Sandwich, 
    items: 15, 
    revenue: 28800, 
    color: 'bg-emerald-600',
    description: 'Sandwiches & pastries',
    menuItems: [
      { id: '1', name: 'Ham & Cheese Croissant', price: 120, description: 'Flaky croissant with ham and cheese' },
      { id: '2', name: 'Chocolate Cake', price: 150, description: 'Rich chocolate layer cake' },
    ]
  },
  { 
    id: '3', 
    name: 'Frappe & Blended', 
    icon: IceCream, 
    items: 12, 
    revenue: 32600, 
    color: 'bg-sky-600',
    description: 'Iced blended drinks',
    menuItems: [
      { id: '1', name: 'Coffee Frappe', price: 220, description: 'Iced blended coffee' },
      { id: '2', name: 'Mocha Frappe', price: 240, description: 'Chocolate coffee blend' },
    ]
  },
  { 
    id: '4', 
    name: 'Non-Coffee', 
    icon: GlassWater, 
    items: 10, 
    revenue: 18200, 
    color: 'bg-teal-500',
    description: 'Teas & other drinks',
    menuItems: [
      { id: '1', name: 'Matcha Latte', price: 200, description: 'Green tea with milk' },
      { id: '2', name: 'Hot Chocolate', price: 180, description: 'Rich chocolate drink' },
    ]
  },
];

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number] | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '' });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const handleAddItem = () => {
    if (newItem.name && newItem.price && selectedCategory) {
      alert(`Added ${newItem.name} to ${selectedCategory.name}`);
      setNewItem({ name: '', price: '', description: '' });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Cafe Menu Categories</h1>
        <p className="text-muted-foreground">Manage your cafe menu sections</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Total Categories</p>
          <p className="text-xl font-bold">{categories.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Menu Items</p>
          <p className="text-xl font-bold">{categories.reduce((sum, cat) => sum + cat.items, 0)}</p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold">
            {formatCurrency(categories.reduce((sum, cat) => sum + cat.revenue, 0))}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg shadow border">
          <p className="text-sm text-muted-foreground">Avg. Price</p>
          <p className="text-xl font-bold">₱165</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Categories List */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl shadow border p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold">Menu Categories</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="px-4 py-2 border rounded-lg bg-background"
                />
                <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                    selectedCategory?.id === category.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-lg ${category.color} flex items-center justify-center`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-muted-foreground">{category.items} items</span>
                        <span className="font-medium">{formatCurrency(category.revenue)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Category Details */}
        <div className="lg:col-span-1">
          {selectedCategory ? (
            <div className="bg-card rounded-xl shadow border p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold">{selectedCategory.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
                </div>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="p-2 hover:bg-secondary rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Category Stats */}
              <div className="mb-6 p-4 bg-secondary rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="font-medium">{selectedCategory.items}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                  <span className="font-medium">{formatCurrency(selectedCategory.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Price</span>
                  <span className="font-medium">{formatCurrency(selectedCategory.revenue / selectedCategory.items)}</span>
                </div>
              </div>

              {/* Menu Items List */}
              <div className="mb-6">
                <h4 className="font-medium mb-4">Menu Items</h4>
                <div className="space-y-3">
                  {selectedCategory.menuItems.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatCurrency(item.price)}</span>
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Item */}
              <div>
                <h4 className="font-medium mb-4">Add New Item</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  />
                  <input
                    type="number"
                    placeholder="Price (₱)"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  />
                  <button
                    onClick={handleAddItem}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add to {selectedCategory.name}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow border p-6">
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Select a Category</h3>
                <p className="text-sm text-muted-foreground">
                  Click on a category to view its menu items and details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}