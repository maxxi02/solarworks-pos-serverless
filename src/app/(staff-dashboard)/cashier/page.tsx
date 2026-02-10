// File: src/app/cashier/page.tsx
'use client';

import { useState, useEffect, useRef, TouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  User, 
  ShoppingCart, 
  Clock, 
  DollarSign, 
  Smartphone,
  Trash2,
  Plus,
  Minus,
  Save,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Filter
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
};

type SavedOrder = {
  id: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  tax: number;
  timestamp: Date;
  customerName?: string;
  status: 'completed' | 'saved' | 'pending';
  paymentMethod?: 'cash' | 'gcash' | 'split';
  splitAmounts?: {
    cash: number;
    gcash: number;
  };
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
  { id: 11, name: 'Breakfast Burrito', price: 10.50, category: 'breakfast', description: 'Eggs, cheese, and sausage in tortilla' },
  { id: 12, name: 'Green Tea Latte', price: 5.25, category: 'drinks', description: 'Matcha green tea with steamed milk' },
  { id: 13, name: 'Spaghetti Bolognese', price: 15.00, category: 'pasta', description: 'Classic meat sauce over spaghetti' },
  { id: 14, name: 'Garlic Bread', price: 4.50, category: 'breads', description: 'Toasted bread with garlic butter' },
  { id: 15, name: 'Tiramisu', price: 8.75, category: 'desserts', description: 'Coffee-flavored Italian dessert' },
];

const categories = ['All', 'Breakfast', 'Snacks', 'Pasta', 'Breads', 'Drinks', 'Desserts', 'Specials'];

const CashierPage = () => {
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([
    {
      id: 'ORD-001',
      items: [mockMenuItems[0], mockMenuItems[1]].map(item => ({ ...item, quantity: 1 })),
      subtotal: 18.25,
      tax: 1.83,
      total: 20.08,
      timestamp: new Date(Date.now() - 3600000),
      customerName: 'John Smith',
      status: 'completed',
      paymentMethod: 'cash'
    },
    {
      id: 'ORD-002',
      items: [mockMenuItems[2]].map(item => ({ ...item, quantity: 2 })),
      subtotal: 28.40,
      tax: 2.84,
      total: 31.24,
      timestamp: new Date(Date.now() - 7200000),
      customerName: 'Jane Doe',
      status: 'completed',
      paymentMethod: 'split',
      splitAmounts: { cash: 15.62, gcash: 15.62 }
    }
  ]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');
  
  // Touch/swipe states
  const categoriesRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [categoryScrollLeft, setCategoryScrollLeft] = useState(0);
  const [menuTouchStart, setMenuTouchStart] = useState<number | null>(null);
  
  const minSwipeDistance = 50;
  
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
  
  // Touch handlers for categories swipe
  const handleCategoryTouchStart = (e: TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };
  
  const handleCategoryTouchMove = (e: TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  
  const handleCategoryTouchEnd = () => {
    if (!touchStartX || !touchEndX || !categoriesRef.current) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      categoriesRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    } else if (isRightSwipe) {
      categoriesRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  // Touch handlers for menu category swipe
  const handleMenuTouchStart = (e: TouchEvent) => {
    setMenuTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleMenuTouchMove = (e: TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  
  const handleMenuTouchEnd = () => {
    if (!menuTouchStart || !touchEndX) return;
    
    const distance = menuTouchStart - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = categories.indexOf(selectedCategory);
      let newIndex = currentIndex;
      
      if (isLeftSwipe && currentIndex < categories.length - 1) {
        newIndex = currentIndex + 1;
      } else if (isRightSwipe && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }
      
      if (newIndex !== currentIndex) {
        setSelectedCategory(categories[newIndex]);
        if (categoriesRef.current) {
          const categoryElement = categoriesRef.current.querySelector(`[data-category="${categories[newIndex]}"]`) as HTMLElement;
          if (categoryElement) {
            categoryElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
          }
        }
      }
    }
  };
  
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
  
  const updateQuantity = (itemId: number, change: number) => {
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
  };
  
  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
  };
  
  // Save order function
  const saveOrder = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    
    const newOrder: SavedOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      subtotal,
      tax,
      total,
      timestamp: new Date(),
      customerName: customerName || 'Walk-in Customer',
      status: 'saved',
    };
    
    setSavedOrders(prev => [newOrder, ...prev]);
    alert('Order saved successfully!');
  };
  
  // Load saved order
  const loadSavedOrder = (order: SavedOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName || '');
  };
  
  // Delete saved order
  const deleteSavedOrder = (orderId: string) => {
    if (confirm('Delete this saved order?')) {
      setSavedOrders(prev => prev.filter(order => order.id !== orderId));
    }
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
  
  // Process payment
  const processPayment = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    
    let paymentDetails = '';
    
    if (paymentMethod === 'split') {
      if (splitPayment.cash + splitPayment.gcash !== total) {
        alert('Split payment amounts must equal the total!');
        return;
      }
      paymentDetails = `Split: Cash $${splitPayment.cash.toFixed(2)} + GCash $${splitPayment.gcash.toFixed(2)}`;
    } else if (paymentMethod === 'cash') {
      paymentDetails = `Cash: $${total.toFixed(2)}`;
    } else {
      paymentDetails = `GCash: $${total.toFixed(2)}`;
    }
    
    const newOrder: SavedOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      subtotal,
      tax,
      total,
      timestamp: new Date(),
      customerName: customerName || 'Walk-in Customer',
      status: 'completed',
      paymentMethod,
      splitAmounts: paymentMethod === 'split' ? splitPayment : undefined
    };
    
    setSavedOrders(prev => [newOrder, ...prev]);
    
    console.log('Processing payment:', {
      order: newOrder,
      paymentDetails,
      orderType
    });
    
    // Generate receipt
    const receiptText = `
      Restaurant POS
      ====================
      Order: ${newOrder.id}
      Date: ${newOrder.timestamp.toLocaleString()}
      Customer: ${newOrder.customerName}
      Type: ${orderType}
      ====================
      ${cart.map(item => `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}
      ====================
      Subtotal: $${subtotal.toFixed(2)}
      Tax (10%): $${tax.toFixed(2)}
      Total: $${total.toFixed(2)}
      Payment: ${paymentDetails}
      ====================
      Thank you for your business!
    `;
    
    console.log(receiptText);
    alert(`Payment processed successfully!\n${paymentDetails}\nOrder #${newOrder.id}`);
    
    // Clear cart
    clearCart();
  };
  
  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Initialize split payment when total changes
  useEffect(() => {
    if (paymentMethod === 'split' && total > 0) {
      setSplitPayment({ cash: total / 2, gcash: total / 2 });
    }
  }, [total, paymentMethod]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen">
        {/* Main Menu Area (Left - 70%) */}
        <main className="flex-1 flex flex-col min-w-0 w-7/10">
          {/* Top Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4 ml-6">
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold">Alex Miller</p>
                    <p className="text-xs text-gray-500">Cashier #04</p>
                  </div>
                  <Avatar>
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" />
                    <AvatarFallback>AM</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
            
            {/* Swipeable Categories */}
            <div className="mt-4 relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-800 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-800 to-transparent z-10 pointer-events-none" />
              
              <div
                ref={categoriesRef}
                onTouchStart={handleCategoryTouchStart}
                onTouchMove={handleCategoryTouchMove}
                onTouchEnd={handleCategoryTouchEnd}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-2"
              >
                {categories.map(cat => (
                  <Button
                    key={cat}
                    data-category={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat)}
                    className="whitespace-nowrap rounded-full shrink-0"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              
              {/* Scroll indicators */}
              <div className="flex justify-center gap-1 mt-2">
                {categories.map((cat, index) => (
                  <div
                    key={cat}
                    className={`w-2 h-2 rounded-full ${
                      selectedCategory === cat 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </header>
          
          {/* Menu Items */}
          <div 
            ref={menuRef}
            onTouchStart={handleMenuTouchStart}
            onTouchMove={handleMenuTouchMove}
            onTouchEnd={handleMenuTouchEnd}
            className="flex-1 overflow-y-auto p-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map(item => (
                <Card 
                  key={item.id} 
                  className="group hover:shadow-md transition-all cursor-pointer active:scale-98"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      </div>
                      <span className="font-bold text-blue-600 text-sm ml-2">${item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      <Button size="sm" className="h-6 px-2 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No items found</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            )}
            
            {/* Swipe instructions for mobile */}
            <div className="text-center mt-4 text-sm text-gray-500 lg:hidden">
              <p>Swipe left/right to change categories</p>
            </div>
          </div>
        </main>
        
        {/* Cart Sidebar (Right - 30%) */}
        <aside className="w-3/10 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Current Order</h2>
                <Badge variant="secondary" className="ml-2">
                  {cart.length}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveOrder}
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
            
            <div className="flex gap-2">
              <Button
                variant={orderType === 'dine-in' ? 'default' : 'outline'}
                onClick={() => setOrderType('dine-in')}
                className="flex-1 text-sm"
              >
                Dine In
              </Button>
              <Button
                variant={orderType === 'takeaway' ? 'default' : 'outline'}
                onClick={() => setOrderType('takeaway')}
                className="flex-1 text-sm"
              >
                Take Away
              </Button>
            </div>
          </div>
          
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Cart is empty</p>
                <p className="text-sm text-gray-400 mt-1">Add items from the menu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-500">${item.price.toFixed(2)} each</p>
                      </div>
                      <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, -1);
                          }}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, 1);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(item.id);
                        }}
                        className="h-6 px-2"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Payment Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Customer Name</Label>
                <Input
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
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
              </div>
              
              {/* Split Payment Controls */}
              {paymentMethod === 'split' && (
                <div className="space-y-2 p-3 border rounded-lg">
                  <Label className="text-sm font-semibold">Split Payment</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Cash</Label>
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
                      <Label className="text-xs">GCash</Label>
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => autoSplit('half')} className="flex-1 text-xs">
                      Half/Half
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => autoSplit('cash')} className="flex-1 text-xs">
                      All Cash
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => autoSplit('gcash')} className="flex-1 text-xs">
                      All GCash
                    </Button>
                  </div>
                  <div className="text-xs">
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
                        {splitPayment.cash + splitPayment.gcash !== total && (
                          <XCircle className="w-3 h-3 inline ml-1" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Order Summary */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={processPayment}
              disabled={cart.length === 0 || (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total)}
              className="w-full py-3"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          </div>
        </aside>
      </div>
      
      {/* Order History Modal/Drawer */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setActiveTab('history')}
          className="rounded-full p-3 shadow-lg"
          size="icon"
        >
          <Clock className="w-6 h-6" />
        </Button>
      </div>
      
      {/* Order History Panel */}
      {activeTab === 'history' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[80vh] rounded-t-xl sm:rounded-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Order History</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveTab('menu')}
              >
                ×
              </Button>
            </div>
            <div className="overflow-y-auto p-4 max-h-[60vh]">
              <div className="space-y-3">
                {savedOrders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-sm">{order.id}</h4>
                          <p className="text-xs text-gray-500">{order.customerName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {order.status}
                            </Badge>
                            {order.paymentMethod && (
                              <Badge variant="outline" className="text-xs">
                                {order.paymentMethod}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatTime(order.timestamp)}</p>
                          <p className="font-bold text-sm">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-1 mb-3">
                        {order.items.slice(0, 2).map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-gray-500">+{order.items.length - 2} more items</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            loadSavedOrder(order);
                            setActiveTab('menu');
                          }}
                          className="flex-1 text-xs"
                        >
                          Load Order
                        </Button>
                        {order.status === 'saved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSavedOrder(order.id)}
                            className="text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      
                      {order.paymentMethod === 'split' && order.splitAmounts && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                          <p className="font-medium">Split Payment:</p>
                          <div className="flex justify-between">
                            <span>Cash:</span>
                            <span>${order.splitAmounts.cash.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GCash:</span>
                            <span>${order.splitAmounts.gcash.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierPage;