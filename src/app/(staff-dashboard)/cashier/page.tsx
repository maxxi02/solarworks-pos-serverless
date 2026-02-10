// File: src/app/cashier/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Trash2, Search } from 'lucide-react';

// Mock data based on your screenshot
const mockMenuItems = [
  { id: 1, name: 'Jumbo Hungarian Sausilog', price: 195, category: 'breakfast' },
  { id: 2, name: 'Special Taal Tapsilog', price: 195, category: 'breakfast' },
  { id: 3, name: 'Crispy Chicksilog', price: 185, category: 'breakfast' },
  { id: 4, name: 'Old Time Spamsilog', price: 175, category: 'breakfast' },
  { id: 5, name: 'Juicy Beef Burger & Fries', price: 215, category: 'snacks' },
  { id: 6, name: 'Crispy Chicken Burger & Fries', price: 185, category: 'snacks' },
];

const categories = ['All', 'Breakfast', 'Snacks', 'Pasta', 'Breads', 'Desserts', 'Espresso', 'Refreshers', 'Specials', 'Frappe'];

const CashierPage = () => {
  // State
  const [cart, setCart] = useState<Array<{ id: number; name: string; price: number; quantity: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // UI-only functions
  const addToCart = (item: { id: number; name: string; price: number }) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId: number, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const processOrder = () => {
    console.log('Processing order...');
    alert('Order processed successfully!');
    setCart([]);
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Filter items
  const filteredItems = mockMenuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Side - Categories */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle - Menu Items */}
          <div className="col-span-7">
            <div className="bg-white rounded-lg shadow-sm p-4">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-lg py-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    <h3 className="font-semibold text-gray-800 text-lg mb-2">{item.name}</h3>
                    <p className="text-blue-600 font-bold text-xl">₱{item.price}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Current Order */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Order</h2>
              
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items added</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-800 text-sm">{item.name}</h4>
                            <p className="text-blue-600 font-bold">₱{item.price}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(item.id);
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.id, -1);
                              }}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-medium w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.id, 1);
                              }}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-bold text-blue-600">₱{(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <hr className="my-4" />

              {/* Total */}
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">₱{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex-1 py-3 rounded-lg border text-center ${
                      paymentMethod === 'cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('gcash')}
                    className={`flex-1 py-3 rounded-lg border text-center ${
                      paymentMethod === 'gcash'
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    GCash
                  </button>
                </div>
              </div>

              {/* Process Payment Button */}
              <Button
                onClick={processOrder}
                className={`w-full py-6 text-lg font-semibold ${
                  cart.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={cart.length === 0}
              >
                Process Payment
              </Button>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-center text-gray-500 text-sm">
                  Made with Emergent
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierPage;