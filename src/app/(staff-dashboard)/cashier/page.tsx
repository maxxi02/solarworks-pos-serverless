// File: src/app/cashier/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  ShoppingCart, 
  Plus,
  Minus,
  Trash2,
  Save,
  DollarSign,
  Smartphone,
  Receipt,
  Filter,
  TableIcon,
  X,
  Check
} from 'lucide-react';

// Types
type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
};

type CartItem = MenuItem & {
  quantity: number;
  notes?: string;
};

type SavedCart = {
  id: string;
  name: string;
  items: CartItem[];
  total: number;
  timestamp: Date;
  customerName?: string;
};

type Table = {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'reserved';
  orderId?: string;
  customerName?: string;
  total?: number;
};

// Mock data
const mockMenuItems: MenuItem[] = [
  { id: 1, name: 'Avocado Morning Toast', price: 12.50, category: 'breakfast', description: 'Sourdough, fresh avocado, poached egg' },
  { id: 2, name: 'Iced Caramel Macchiato', price: 5.75, category: 'drinks', description: 'Double espresso with caramel drizzle' },
  { id: 3, name: 'Penne Arrabbiata', price: 14.20, category: 'pasta', description: 'Spicy tomato sauce with basil' },
  { id: 4, name: 'Berry Mini Cupcake Set', price: 8.00, category: 'desserts', description: 'Box of 4 assorted berry cupcakes' },
  { id: 5, name: 'Classic Cappuccino', price: 4.50, category: 'drinks', description: 'Perfectly foamed milk over espresso' },
  { id: 6, name: 'Steakhouse Burger', price: 15.90, category: 'snacks', description: 'Angus beef with cheddar and onions' },
  { id: 7, name: 'Artisan Baguette', price: 3.25, category: 'breads', description: 'Freshly baked sourdough baguette' },
  { id: 8, name: 'Atlantic Salmon Salad', price: 18.50, category: 'specials', description: 'Grilled salmon with kale and quinoa' },
  { id: 9, name: 'Margherita Pizza', price: 16.50, category: 'specials', description: 'Mozzarella, tomato sauce, and basil' },
  { id: 10, name: 'Chocolate Lava Cake', price: 7.50, category: 'desserts', description: 'Warm chocolate cake with molten center' },
  { id: 11, name: 'Extra Rice', price: 2.00, category: 'addons', description: 'Additional serving of rice' },
  { id: 12, name: 'Garlic Sauce', price: 1.00, category: 'addons', description: 'Side of garlic sauce' },
];

const categories = ['All', 'Breakfast', 'Snacks', 'Pasta', 'Breads', 'Drinks', 'Desserts', 'Specials', 'Addons'];

const CashierPage = () => {
  // State
  const [cart, setCart] = useState<CartItem[]>([
    { id: 1, name: 'Avocado Morning Toast', price: 12.50, category: 'breakfast', description: 'Sourdough, fresh avocado, poached egg', quantity: 1 },
    { id: 2, name: 'Iced Caramel Macchiato', price: 5.75, category: 'drinks', description: 'Double espresso with caramel drizzle', quantity: 2 },
  ]);
  
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([
    {
      id: 'SAVED-001',
      name: 'Morning Breakfast',
      items: [mockMenuItems[0], mockMenuItems[4]].map(item => ({ ...item, quantity: 1 })),
      total: 17.00,
      timestamp: new Date(Date.now() - 3600000),
      customerName: 'John Doe'
    },
    {
      id: 'SAVED-002',
      name: 'Lunch Special',
      items: [mockMenuItems[2], mockMenuItems[3]].map(item => ({ ...item, quantity: 1 })),
      total: 22.20,
      timestamp: new Date(Date.now() - 7200000),
    }
  ]);
  
  const [tables, setTables] = useState<Table[]>([
    { id: '1', number: 'T01', status: 'occupied', orderId: 'ORD-101', customerName: 'Alice', total: 45.50 },
    { id: '2', number: 'T02', status: 'available' },
    { id: '3', number: 'T03', status: 'occupied', orderId: 'ORD-102', customerName: 'Bob', total: 32.25 },
    { id: '4', number: 'T04', status: 'reserved' },
    { id: '5', number: 'T05', status: 'available' },
    { id: '6', number: 'T06', status: 'occupied', orderId: 'ORD-103', customerName: 'Charlie', total: 28.75 },
    { id: '7', number: 'T07', status: 'available' },
    { id: '8', number: 'T08', status: 'occupied', orderId: 'ORD-104', customerName: 'Diana', total: 51.80 },
  ]);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('takeaway');
  const [selectedTable, setSelectedTable] = useState<string>('T07');
  const [activeTab, setActiveTab] = useState<'menu' | 'saved' | 'tables'>('menu');
  const [editingCartItem, setEditingCartItem] = useState<number | null>(null);
  
  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;
  
  // Filter menu items
  const filteredItems = mockMenuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || 
      item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Cart functions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  
  const updateCartQuantity = (itemId: number, change: number) => {
    setCart(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };
  
  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    setEditingCartItem(null);
  };
  
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
    setSelectedTable('');
    setEditingCartItem(null);
  };
  
  // Save cart function
  const saveCart = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    
    const cartName = prompt('Enter a name for this saved cart:', `Cart ${savedCarts.length + 1}`);
    if (!cartName) return;
    
    const newCart: SavedCart = {
      id: `SAVED-${Date.now().toString().slice(-6)}`,
      name: cartName,
      items: [...cart],
      total,
      timestamp: new Date(),
      customerName: customerName || undefined,
    };
    
    setSavedCarts(prev => [newCart, ...prev]);
    alert('Cart saved successfully!');
  };
  
  // Load saved cart
  const loadSavedCart = (savedCart: SavedCart) => {
    setCart(savedCart.items);
    setCustomerName(savedCart.customerName || '');
    setActiveTab('menu');
  };
  
  // Split payment functions
  const updateSplitAmount = (type: 'cash' | 'gcash', value: number) => {
    setSplitPayment(prev => {
      const newValue = Math.max(0, Math.min(total, value));
      const otherType = type === 'cash' ? 'gcash' : 'cash';
      const otherAmount = prev[otherType];
      const totalPaid = newValue + otherAmount;
      
      if (totalPaid > total) {
        return { ...prev, [type]: newValue, [otherType]: total - newValue };
      }
      return { ...prev, [type]: newValue };
    });
  };
  
  const autoSplit = (type: 'half' | 'cash' | 'gcash') => {
    switch (type) {
      case 'half':
        setSplitPayment({ cash: total / 2, gcash: total / 2 });
        break;
      case 'cash':
        setSplitPayment({ cash: total, gcash: 0 });
        break;
      case 'gcash':
        setSplitPayment({ cash: 0, gcash: total });
        break;
    }
  };
  
  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };
  
  // Initialize split payment when total changes
  useEffect(() => {
    if (paymentMethod === 'split' && total > 0) {
      setSplitPayment({ cash: total / 2, gcash: total / 2 });
    }
  }, [total, paymentMethod]);
  
  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Top Header */}
        <header className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">POS System</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold">Cashier #04</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="menu" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Menu
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Saved
                <Badge variant="secondary" className="ml-1">{savedCarts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="tables" className="flex items-center gap-2">
                <TableIcon className="w-4 h-4" />
                Tables
                <Badge variant="secondary" className="ml-1">{tables.filter(t => t.status === 'occupied').length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>
        
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-150px)]">
          {/* Left Side - Main Content */}
          <div className="lg:w-7/12 flex flex-col h-full">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap rounded-full text-sm"
                >
                  {cat}
                </Button>
              ))}
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-hidden">
              {/* Menu Items Grid */}
              {activeTab === 'menu' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 h-full overflow-y-auto pr-2">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600">${item.price.toFixed(2)}</span>
                              <Button
                                size="sm"
                                onClick={() => addToCart(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Saved Carts */}
              {activeTab === 'saved' && (
                <div className="space-y-3 h-full overflow-y-auto pr-2">
                  {savedCarts.map(savedCart => (
                    <Card key={savedCart.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold">{savedCart.name}</h3>
                            <p className="text-sm text-gray-500">
                              {savedCart.customerName || 'No customer name'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatDate(savedCart.timestamp)} {formatTime(savedCart.timestamp)}
                              </span>
                              <Badge variant="outline">
                                {savedCart.items.length} items
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600">${savedCart.total.toFixed(2)}</p>
                            <Button
                              size="sm"
                              onClick={() => loadSavedCart(savedCart)}
                              className="mt-2"
                            >
                              Load
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {savedCart.items.slice(0, 3).map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="truncate max-w-[70%]">{item.quantity}x {item.name}</span>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          {savedCart.items.length > 3 && (
                            <p className="text-sm text-gray-500">+{savedCart.items.length - 3} more items</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Tables */}
              {activeTab === 'tables' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 h-full overflow-y-auto pr-2">
                  {tables.map(table => (
                    <Card 
                      key={table.id}
                      className={`cursor-pointer transition-all ${
                        selectedTable === table.number ? 'ring-2 ring-blue-500' : ''
                      } ${table.status === 'occupied' ? 'bg-red-50' : table.status === 'reserved' ? 'bg-yellow-50' : ''}`}
                      onClick={() => {
                        setSelectedTable(table.number);
                        setOrderType('dine-in');
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                            <TableIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          
                          <div className="text-center">
                            <h3 className="font-bold text-lg">{table.number}</h3>
                            <Badge className={`mt-2 ${
                              table.status === 'available' 
                                ? 'bg-green-100 text-green-800' 
                                : table.status === 'occupied'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {table.status}
                            </Badge>
                            
                            {table.status === 'occupied' && (
                              <div className="mt-3 text-sm space-y-1">
                                <p className="font-medium truncate">{table.customerName}</p>
                                <p className="text-gray-500">Order: {table.orderId}</p>
                                <p className="font-bold text-blue-600">${table.total?.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Side - Order Panel */}
          <div className="lg:w-5/12 h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Current Order
                    <Badge variant="secondary">{cart.length}</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveCart}
                      disabled={cart.length === 0}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCart}
                      disabled={cart.length === 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {/* Order Type */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Order Type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={orderType === 'dine-in' ? 'default' : 'outline'}
                        onClick={() => setOrderType('dine-in')}
                        className="flex-1"
                      >
                        Dine In
                      </Button>
                      <Button
                        variant={orderType === 'takeaway' ? 'default' : 'outline'}
                        onClick={() => setOrderType('takeaway')}
                        className="flex-1"
                      >
                        Take Away
                      </Button>
                    </div>
                    
                    {orderType === 'dine-in' && selectedTable && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TableIcon className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Table {selectedTable} selected</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTable('')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Cart Items - Customizable */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Order Items</Label>
                    <div className="space-y-3">
                      {cart.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2" />
                          <p>No items in cart</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div 
                            key={item.id} 
                            className={`p-3 border rounded-lg transition-all ${
                              editingCartItem === item.id ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-sm text-gray-500">{item.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                                <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.id, -1)}
                                  disabled={item.quantity <= 1}
                                  className="h-7 w-7"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-bold">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.id, 1)}
                                  className="h-7 w-7"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              <div className="flex gap-2">
                                {editingCartItem === item.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        removeFromCart(item.id);
                                        setEditingCartItem(null);
                                      }}
                                      variant="destructive"
                                    >
                                      Remove
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => setEditingCartItem(null)}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingCartItem(item.id)}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {editingCartItem === item.id && (
                              <div className="mt-3 pt-3 border-t">
                                <Input
                                  placeholder="Add notes (optional)"
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Order Summary */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Order Summary</Label>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax (10%):</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-blue-600">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Payment Method */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('cash')}
                        className="flex flex-col h-auto py-2"
                      >
                        <DollarSign className="w-4 h-4 mb-1" />
                        <span className="text-xs">Cash</span>
                      </Button>
                      <Button
                        variant={paymentMethod === 'gcash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('gcash')}
                        className="flex flex-col h-auto py-2"
                      >
                        <Smartphone className="w-4 h-4 mb-1" />
                        <span className="text-xs">GCash</span>
                      </Button>
                      <Button
                        variant={paymentMethod === 'split' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('split')}
                        className="flex flex-col h-auto py-2"
                      >
                        <Receipt className="w-4 h-4 mb-1" />
                        <span className="text-xs">Split</span>
                      </Button>
                    </div>
                    
                    {/* Split Payment Controls */}
                    {paymentMethod === 'split' && (
                      <div className="mt-3 space-y-2 p-3 border rounded-lg">
                        <Label className="text-sm font-medium mb-2 block">Split Payment</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Cash Amount</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm">$</span>
                              <Input
                                type="number"
                                value={splitPayment.cash}
                                onChange={(e) => updateSplitAmount('cash', parseFloat(e.target.value) || 0)}
                                className="pl-6 text-sm h-8"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">GCash Amount</Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm">$</span>
                              <Input
                                type="number"
                                value={splitPayment.gcash}
                                onChange={(e) => updateSplitAmount('gcash', parseFloat(e.target.value) || 0)}
                                className="pl-6 text-sm h-8"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" onClick={() => autoSplit('half')} className="flex-1 text-xs">
                            50/50
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => autoSplit('cash')} className="flex-1 text-xs">
                            All Cash
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => autoSplit('gcash')} className="flex-1 text-xs">
                            All GCash
                          </Button>
                        </div>
                        <div className="text-xs mt-2 space-y-1">
                          <div className="flex justify-between">
                            <span>Cash:</span>
                            <span>${splitPayment.cash.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GCash:</span>
                            <span>${splitPayment.gcash.toFixed(2)}</span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span className={splitPayment.cash + splitPayment.gcash === total ? "text-green-600" : "text-red-600"}>
                              ${(splitPayment.cash + splitPayment.gcash).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Customer Name */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Customer Name (Optional)</Label>
                    <Input
                      placeholder="Enter customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  
                  {/* Process Payment Button */}
                  <Button
                    onClick={() => {
                      if (cart.length === 0) {
                        alert('Cart is empty!');
                        return;
                      }
                      alert(`Payment processed successfully!\nTotal: $${total.toFixed(2)}`);
                      clearCart();
                    }}
                    disabled={cart.length === 0 || (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total)}
                    className="w-full py-6 text-lg"
                    size="lg"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Process Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierPage;