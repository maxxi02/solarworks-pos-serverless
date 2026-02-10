// File: src/app/(staff-dashboard)/cashier/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, Plus, Minus, Trash2, Save,
  DollarSign, Smartphone, Receipt, TableIcon,
  X, Loader2, Utensils, Coffee, ArrowRight,
  ChevronLeft, ChevronRight
} from 'lucide-react';

// Types
interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  ingredients: { name: string; quantity: string; unit: string }[];
  available: boolean;
  category?: string;
  menuType?: 'food' | 'drink';
}

interface CartItem extends Product {
  quantity: number;
  notes?: string;
}

interface SavedCart {
  id: string;
  name: string;
  items: CartItem[];
  total: number;
  timestamp: Date;
  customerName?: string;
}

interface Table {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'reserved';
  customerName?: string;
  total?: number;
  orderId?: string;
}

interface CategoryData {
  products?: Product[];
  name: string;
  menuType: 'food' | 'drink';
}

// Define tab type for type safety
type TabType = 'menu' | 'saved' | 'tables' | 'checkout';

const CashierPage = () => {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [selectedMenuType, setSelectedMenuType] = useState<'food' | 'drink' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('takeaway');
  const [selectedTable, setSelectedTable] = useState<string>('');
  
  // Categories scroll ref
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  // Swipe handlers for CATEGORIES section only
  const categoriesSwipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      scrollCategories('right');
    },
    onSwipedRight: () => {
      scrollCategories('left');
    },
    preventScrollOnSwipe: false,
    trackMouse: true,
    delta: 5
  });

  // Fetch data - Products and Categories
  const fetchProductsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const categoriesData: CategoryData[] = await response.json();
      const productsList: Product[] = [];
      
      categoriesData.forEach((category: CategoryData) => {
        if (category.products?.length) {
          category.products.forEach((product: Product) => {
            productsList.push({ 
              ...product, 
              category: category.name, 
              menuType: category.menuType 
            });
          });
        }
      });
      
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tables data
  const fetchTablesData = useCallback(async () => {
    try {
      const response = await fetch('/api/tables');
      if (response.ok) {
        const tablesData: Table[] = await response.json();
        setTables(tablesData);
      } else {
        // If no tables API, create default tables
        const defaultTables: Table[] = Array.from({ length: 12 }, (_, i) => ({
          id: (i + 1).toString(),
          number: `T${String(i + 1).padStart(2, '0')}`,
          status: 'available',
        }));
        setTables(defaultTables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  }, []);

  // Fetch saved carts
  const fetchSavedCarts = useCallback(async () => {
    try {
      const response = await fetch('/api/carts');
      if (response.ok) {
        const cartsData: SavedCart[] = await response.json();
        setSavedCarts(cartsData);
      }
    } catch (error) {
      console.error('Error fetching saved carts:', error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchProductsData();
    fetchTablesData();
    fetchSavedCarts();
  }, [fetchProductsData, fetchTablesData, fetchSavedCarts]);

  // Update split payment when total changes
  useEffect(() => {
    if (paymentMethod === 'split' && total > 0) {
      setSplitPayment({ cash: total / 2, gcash: total / 2 });
    }
  }, [total, paymentMethod]);

  // Filter products
  const filteredProducts = products.filter(product => {
    if (!product.available) return false;
    if (selectedMenuType !== 'all' && product.menuType !== selectedMenuType) return false;
    if (selectedCategory !== 'All' && product.category !== selectedCategory) return false;
    return true;
  });

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(
    products
      .filter(p => p.available && (selectedMenuType === 'all' || p.menuType === selectedMenuType))
      .map(p => p.category || 'Uncategorized')
  ))];

  // Scroll categories function
  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const scrollAmount = 200;
      
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      // Update scroll buttons after a delay
      setTimeout(checkScrollPosition, 300);
    }
  }, []);

  // Check scroll position for showing/hiding scroll buttons
  const checkScrollPosition = useCallback(() => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Check scroll position on mount and when categories change
  useEffect(() => {
    checkScrollPosition();
  }, [categories, selectedMenuType, checkScrollPosition]);

  // Cart functions
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      return existing 
        ? prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const updateCartQuantity = useCallback((itemId: string, change: number) => {
    setCart(prev => prev
      .map(item => item._id === itemId 
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
      )
      .filter(item => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item._id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
    setSelectedTable('');
  }, []);

  const saveCart = useCallback(async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    
    const cartName = prompt('Enter cart name:', `Cart ${savedCarts.length + 1}`);
    if (!cartName) return;
    
    const newCart: SavedCart = {
      id: `SAVED-${Date.now().toString().slice(-6)}`,
      name: cartName,
      items: [...cart],
      total,
      timestamp: new Date(),
      customerName: customerName || undefined,
    };
    
    try {
      const response = await fetch('/api/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCart)
      });
      
      if (response.ok) {
        const savedCart = await response.json();
        setSavedCarts(prev => [savedCart, ...prev]);
        alert('Cart saved to server!');
      } else {
        setSavedCarts(prev => [newCart, ...prev]);
        localStorage.setItem('savedCarts', JSON.stringify([newCart, ...savedCarts]));
        alert('Cart saved locally!');
      }
    } catch (error) {
      setSavedCarts(prev => [newCart, ...prev]);
      localStorage.setItem('savedCarts', JSON.stringify([newCart, ...savedCarts]));
      alert('Cart saved locally!');
    }
  }, [cart, savedCarts, total, customerName]);

  const loadSavedCart = useCallback((savedCart: SavedCart) => {
    setCart(savedCart.items);
    setCustomerName(savedCart.customerName || '');
    setActiveTab('menu');
  }, []);

  const processPayment = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    if (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total) {
      return alert('Split payment amounts must equal total!');
    }
    
    const orderData = {
      customerName,
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod,
      splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType,
      tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : undefined,
      timestamp: new Date(),
    };
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        alert(`Payment processed successfully!\nOrder Total: ₱${total.toFixed(2)}`);
        
        if (orderType === 'dine-in' && selectedTable) {
          const tableUpdate = tables.find(t => t.number === selectedTable);
          if (tableUpdate) {
            await fetch(`/api/tables/${tableUpdate.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...tableUpdate, status: 'occupied' })
            });
            
            fetchTablesData();
          }
        }
        
        clearCart();
      } else {
        alert(`Payment processed (local only)!\nOrder Total: ₱${total.toFixed(2)}`);
        clearCart();
      }
    } catch (error) {
      alert(`Payment processed (local only)!\nOrder Total: ₱${total.toFixed(2)}`);
      clearCart();
    }
  };

  // Auto split functions
  const autoSplit = useCallback((type: 'half' | 'cash' | 'gcash') => {
    const splits = {
      half: { cash: total / 2, gcash: total / 2 },
      cash: { cash: total, gcash: 0 },
      gcash: { cash: 0, gcash: total }
    };
    setSplitPayment(splits[type]);
  }, [total]);

  // Merge refs function to handle multiple refs
  const mergeRefs = useCallback((...refs: Array<React.Ref<HTMLDivElement> | undefined>) => {
    return (node: HTMLDivElement) => {
      refs.forEach(ref => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref != null) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">POS System</h1>
              <p className="text-sm text-gray-500">Point of Sale</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">Cashier #04</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as TabType)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="menu" className="text-sm">Menu</TabsTrigger>
              <TabsTrigger value="saved" className="text-sm">Saved</TabsTrigger>
              <TabsTrigger value="tables" className="text-sm">Tables</TabsTrigger>
              <TabsTrigger value="checkout" className="text-sm">
                <ArrowRight className="w-4 h-4 mr-1" />
                Checkout
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
          {/* Left Panel - Main Content */}
          <div className="lg:w-7/12 flex flex-col h-full">
            {activeTab === 'menu' && (
              <>
                {/* Menu Type */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {(['all', 'food', 'drink'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={selectedMenuType === type ? "default" : "outline"}
                      onClick={() => {
                        setSelectedMenuType(type);
                        setSelectedCategory('All');
                      }}
                      className="h-10 text-sm"
                    >
                      {type === 'food' && <Utensils className="w-4 h-4 mr-2" />}
                      {type === 'drink' && <Coffee className="w-4 h-4 mr-2" />}
                      {type === 'all' ? 'All Menu' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>

                {/* Categories Section with SWIPE */}
                <div className="mb-4 relative">
                  <Label className="text-sm font-medium mb-2 block">Categories</Label>
                  
                  <div className="relative">
                    {/* Left Scroll Button */}
                    {showLeftScroll && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100 h-8 w-8"
                        onClick={() => scrollCategories('left')}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {/* Swipeable Categories Container */}
                    <div 
                      ref={mergeRefs(categoriesContainerRef, categoriesSwipeHandlers.ref)}
                      className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-1"
                      onScroll={checkScrollPosition}
                      style={{ 
                        scrollbarWidth: 'none' as const, 
                        msOverflowStyle: 'none',
                        cursor: 'grab',
                        touchAction: 'pan-y'
                      }}
                    >
                      {categories.map(cat => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? "default" : "outline"}
                          onClick={() => setSelectedCategory(cat)}
                          className="whitespace-nowrap text-sm flex-shrink-0 px-3"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Right Scroll Button */}
                    {showRightScroll && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md hover:bg-gray-100 h-8 w-8"
                        onClick={() => scrollCategories('right')}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Swipe Hint */}
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    ← Swipe left/right to browse categories →
                  </p>
                </div>

                {/* Products Grid */}
                <div className="overflow-y-auto flex-1 pr-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2">Loading products...</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No products found</p>
                      {selectedCategory !== 'All' && (
                        <p className="text-sm text-gray-400 mt-1">Try selecting "All" categories</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {filteredProducts.map(product => (
                        <Card key={product._id} className="hover:shadow-md transition-all">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div>
                                <h3 className="font-bold text-sm line-clamp-2">{product.name}</h3>
                                <div className="flex gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {product.category}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {product.description || product.ingredients?.map(i => i.name).join(', ')}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-blue-600">₱{product.price.toFixed(2)}</span>
                                <Button size="sm" onClick={() => addToCart(product)} className="h-7">
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'saved' && (
              <div className="h-full overflow-y-auto">
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Saved Orders</h2>
                  <p className="text-sm text-gray-500">Load previously saved orders</p>
                </div>
                
                <div className="space-y-2">
                  {savedCarts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No saved orders yet</p>
                      <p className="text-sm text-gray-400 mt-1">Save your current order to see it here</p>
                    </div>
                  ) : (
                    savedCarts.map(savedCart => (
                      <Card key={savedCart.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold">{savedCart.name}</h3>
                              <p className="text-sm text-gray-500">
                                {savedCart.customerName || 'No customer'}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {savedCart.items.length} items
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(savedCart.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-600">₱{savedCart.total.toFixed(2)}</p>
                              <Button size="sm" onClick={() => loadSavedCart(savedCart)} className="mt-1">
                                Load
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tables' && (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Tables</h2>
                  <p className="text-sm text-gray-500">Select a table for dine-in orders</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 overflow-y-auto flex-1">
                  {tables.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                      <p className="mt-2 text-gray-500">Loading tables...</p>
                    </div>
                  ) : (
                    tables.map(table => (
                      <Card 
                        key={table.id}
                        className={`cursor-pointer transition-all ${selectedTable === table.number ? 'ring-2 ring-blue-500' : ''} ${
                          table.status === 'occupied' ? 'bg-red-50' : 
                          table.status === 'reserved' ? 'bg-yellow-50' : ''
                        }`}
                        onClick={() => {
                          if (table.status === 'available') {
                            setSelectedTable(table.number);
                            setOrderType('dine-in');
                          }
                        }}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <TableIcon className="w-6 h-6 text-gray-400" />
                          </div>
                          <h3 className="font-bold">{table.number}</h3>
                          <Badge className={`mt-1 ${
                            table.status === 'available' ? 'bg-green-100 text-green-800' :
                            table.status === 'occupied' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {table.status}
                          </Badge>
                          {table.status === 'occupied' && table.customerName && (
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {table.customerName}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel - Checkout */}
          <div className="lg:w-5/12 h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Order ({cart.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveCart} disabled={!cart.length}>
                      <Save className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearCart} disabled={!cart.length}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {/* Order Type */}
                <div>
                  <Label>Order Type</Label>
                  <div className="flex gap-2 mt-1">
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
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg flex justify-between items-center">
                      <span className="font-medium">Table {selectedTable}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTable('')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Cart Items */}
                <div>
                  <Label>Items</Label>
                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2" />
                        <p>No items in cart</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item._id} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.quantity} × ₱{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item._id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center">{item.quantity}</span>
                            <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item._id, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeFromCart(item._id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Order Summary */}
                <div>
                  <Label>Order Summary</Label>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₱{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (10%):</span>
                      <span>₱{tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-blue-600">₱{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Method */}
                <div>
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Button
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('cash')}
                      className="py-2"
                    >
                      <DollarSign className="w-4 h-4" /> Cash
                    </Button>
                    <Button
                      variant={paymentMethod === 'gcash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('gcash')}
                      className="py-2"
                    >
                      <Smartphone className="w-4 h-4" /> GCash
                    </Button>
                    <Button
                      variant={paymentMethod === 'split' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('split')}
                      className="py-2"
                    >
                      <Receipt className="w-4 h-4" /> Split
                    </Button>
                  </div>

                  {paymentMethod === 'split' && (
                    <div className="mt-2 space-y-2 p-2 border rounded">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Cash</Label>
                          <Input
                            type="number"
                            value={splitPayment.cash}
                            onChange={(e) => setSplitPayment(prev => ({ ...prev, cash: +e.target.value }))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">GCash</Label>
                          <Input
                            type="number"
                            value={splitPayment.gcash}
                            onChange={(e) => setSplitPayment(prev => ({ ...prev, gcash: +e.target.value }))}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => autoSplit('half')} className="flex-1">
                          50/50
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => autoSplit('cash')} className="flex-1">
                          Cash
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => autoSplit('gcash')} className="flex-1">
                          GCash
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Name */}
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    placeholder="Optional"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Process Payment Button */}
                <Button
                  onClick={processPayment}
                  disabled={!cart.length || (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total)}
                  className="w-full py-6 text-lg"
                >
                  <Receipt className="w-5 h-5 mr-2" />
                  Process Payment (₱{total.toFixed(2)})
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierPage;