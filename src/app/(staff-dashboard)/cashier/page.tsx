'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, Plus, Minus, Trash2,
  DollarSign, Smartphone, Receipt,
  X, Loader2, Utensils, Coffee,
  ChevronLeft, ChevronRight, GripVertical
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

interface CategoryData {
  products?: Product[];
  name: string;
  menuType: 'food' | 'drink';
}

const CashierPage = () => {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('takeaway');
  const [selectedTable, setSelectedTable] = useState<string>('');
  
  // UI State
  const [selectedMenuType, setSelectedMenuType] = useState<'food' | 'drink' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [draggedItem, setDraggedItem] = useState<Product | null>(null);
  
  // Categories scroll ref and touch state
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Drop zone ref
  const cartDropZoneRef = useRef<HTMLDivElement>(null);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

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

  // Initial data fetch
  useEffect(() => {
    fetchProductsData();
  }, [fetchProductsData]);

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

  // Drag and Drop Handlers - WITH SMALL PREVIEW
  const handleDragStart = (e: React.DragEvent, product: Product) => {
    setDraggedItem(product);
    e.dataTransfer.setData('text/plain', product._id);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create SMALL drag preview - kasing laki ng card
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed top-0 left-0 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px'; // Hide it off screen
    
    dragPreview.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-start justify-between">
          <div class="font-bold text-xs text-foreground">${product.name}</div>
          <div class="text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M9 12h6"/><path d="M3 6h3l2-4h8l2 4h3"/><path d="M5 18h14"/></svg>
          </div>
        </div>
        <div class="text-[10px] text-muted-foreground">${product.category || 'Product'}</div>
        <div class="flex justify-between items-center">
          <span class="font-bold text-[11px] text-primary">₱${product.price.toFixed(2)}</span>
          <span class="text-[10px] text-muted-foreground">+ Drop</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 70, 40);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    if (cartDropZoneRef.current) {
      cartDropZoneRef.current.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (cartDropZoneRef.current) {
      cartDropZoneRef.current.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (cartDropZoneRef.current) {
      cartDropZoneRef.current.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    }
    
    if (draggedItem) {
      addToCart(draggedItem);
      setDraggedItem(null);
    }
  };

  // Touch-based drag and drop for mobile - WITH SMALL PREVIEW
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent, product: Product) => {
    e.preventDefault();
    setDraggedItem(product);
    
    // Create touch preview - maliit lang
    const preview = document.createElement('div');
    preview.className = 'fixed z-50 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    preview.style.left = `${e.touches[0].clientX - 70}px`;
    preview.style.top = `${e.touches[0].clientY - 50}px`;
    preview.style.pointerEvents = 'none';
    
    preview.innerHTML = `
      <div class="space-y-1">
        <div class="font-bold text-xs text-foreground">${product.name}</div>
        <div class="text-[10px] text-muted-foreground">${product.category || 'Product'}</div>
        <div class="flex justify-between items-center">
          <span class="font-bold text-[11px] text-primary">₱${product.price.toFixed(2)}</span>
          <span class="text-[10px] text-muted-foreground">Release to add</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(preview);
    setTouchPreview(preview);
    
    if (window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Update preview position
    if (touchPreview) {
      touchPreview.style.left = `${e.touches[0].clientX - 70}px`;
      touchPreview.style.top = `${e.touches[0].clientY - 50}px`;
    }
    
    // Check if touch is over cart area
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (cartDropZoneRef.current?.contains(element)) {
      cartDropZoneRef.current.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    } else {
      cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Remove preview
    if (touchPreview) {
      touchPreview.remove();
      setTouchPreview(null);
    }
    
    // Check if touch ended over cart area
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (cartDropZoneRef.current?.contains(element) && draggedItem) {
      addToCart(draggedItem);
      
      if (window.navigator.vibrate) {
        window.navigator.vibrate([20, 20, 20]);
      }
    }
    
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    setDraggedItem(null);
  };

  // Manual swipe/hand drag functions for categories
  const handleCategoryMouseDown = (e: React.MouseEvent) => {
    if (!categoriesContainerRef.current) return;
    
    setIsDragging(true);
    setStartX(e.pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  };

  const handleCategoryMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !categoriesContainerRef.current) return;
    e.preventDefault();
    
    const x = e.pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleCategoryMouseUp = () => {
    setIsDragging(false);
  };

  const handleCategoryTouchStart = (e: React.TouchEvent) => {
    if (!categoriesContainerRef.current) return;
    
    setIsDragging(true);
    setStartX(e.touches[0].pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  };

  const handleCategoryTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !categoriesContainerRef.current) return;
    
    const x = e.touches[0].pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleCategoryTouchEnd = () => {
    setIsDragging(false);
  };

  // Scroll categories function with buttons
  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const scrollAmount = 200;
      
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      setTimeout(checkScrollPosition, 300);
    }
  }, []);

  // Check scroll position for showing/hiding scroll buttons
  const checkScrollPosition = useCallback(() => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      setShowLeftScroll(scrollLeft > 10);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Check scroll position on mount and when categories change
  useEffect(() => {
    setTimeout(checkScrollPosition, 100);
  }, [categories, selectedMenuType, checkScrollPosition]);

  // Listen for window resize and scroll
  useEffect(() => {
    const handleResize = () => {
      checkScrollPosition();
    };
    
    window.addEventListener('resize', handleResize);
    
    if (categoriesContainerRef.current) {
      categoriesContainerRef.current.addEventListener('scroll', checkScrollPosition);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (categoriesContainerRef.current) {
        categoriesContainerRef.current.removeEventListener('scroll', checkScrollPosition);
      }
    };
  }, [checkScrollPosition]);

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
        clearCart();
      } else {
        alert(`Payment processed (local only)!\nOrder Total: ₱${total.toFixed(2)}`);
        clearCart();
      }
    } catch {
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">POS System</h1>
              <p className="text-xs text-muted-foreground mt-1">Drag and drop items to cart</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">Cashier #04</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
          {/* Left Panel - Main Content */}
          <div className="lg:w-7/12 flex flex-col h-full">
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
                  className="h-9 text-xs"
                >
                  {type === 'food' && <Utensils className="w-3 h-3 mr-1" />}
                  {type === 'drink' && <Coffee className="w-3 h-3 mr-1" />}
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>

            {/* Categories Section */}
            <div className="mb-4 relative">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium text-foreground">Categories</Label>
                <div className="flex items-center text-[10px] text-muted-foreground">
                  <span>Swipe to browse</span>
                </div>
              </div>
              
              <div className="relative">
                {showLeftScroll && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background shadow-md hover:bg-muted h-6 w-6"
                    onClick={() => scrollCategories('left')}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                )}
                
                <div 
                  ref={categoriesContainerRef}
                  className="flex gap-1 overflow-x-auto scrollbar-hide px-6 py-1 select-none"
                  style={{ 
                    scrollbarWidth: 'none' as const, 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    touchAction: 'pan-x'
                  }}
                  onMouseDown={handleCategoryMouseDown}
                  onMouseMove={handleCategoryMouseMove}
                  onMouseUp={handleCategoryMouseUp}
                  onMouseLeave={handleCategoryMouseUp}
                  onTouchStart={handleCategoryTouchStart}
                  onTouchMove={handleCategoryTouchMove}
                  onTouchEnd={handleCategoryTouchEnd}
                >
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      onClick={(e) => {
                        if (!isDragging) {
                          setSelectedCategory(cat);
                        }
                      }}
                      className="whitespace-nowrap text-xs shrink-0 px-2 py-1 h-7"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                
                {showRightScroll && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background shadow-md hover:bg-muted h-6 w-6"
                    onClick={() => scrollCategories('right')}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products Grid - with Drag and Drop */}
            <div 
              className="overflow-y-auto flex-1 pr-2"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-xs text-foreground">Loading...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product._id} 
                      className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing ${
                        draggedItem?._id === product._id ? 'opacity-50 scale-95' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, product)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, product)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-xs line-clamp-2 text-foreground flex-1">
                              {product.name}
                            </h3>
                            <GripVertical className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {product.category}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {product.description || product.ingredients?.map(i => i.name).join(', ')}
                          </p>
                          <div className="flex justify-between items-center pt-1">
                            <span className="font-bold text-xs text-primary">₱{product.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Checkout (DROP ZONE) */}
          <div 
            ref={cartDropZoneRef}
            className="lg:w-5/12 h-full transition-all duration-200"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Card className="h-full flex flex-col border">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-1 text-sm">
                    <ShoppingCart className="w-4 h-4" />
                    Order ({cart.length})
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearCart} 
                    disabled={!cart.length}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </div>
                
                {/* Drop zone hint - mas maliit */}
                {cart.length === 0 && (
                  <div className="mt-1 p-2 border border-dashed rounded text-center">
                    <p className="text-xs text-muted-foreground">
                      ↓ Drop products here ↓
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent 
                className="flex-1 overflow-y-auto space-y-3 p-3 pt-0"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* Order Type - mas compact */}
                <div>
                  <Label className="text-xs">Order Type</Label>
                  <div className="flex gap-1 mt-1">
                    <Button
                      variant={orderType === 'dine-in' ? 'default' : 'outline'}
                      onClick={() => setOrderType('dine-in')}
                      className="flex-1 h-7 text-xs"
                    >
                      Dine In
                    </Button>
                    <Button
                      variant={orderType === 'takeaway' ? 'default' : 'outline'}
                      onClick={() => setOrderType('takeaway')}
                      className="flex-1 h-7 text-xs"
                    >
                      Take Away
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Cart Items - mas compact */}
                <div>
                  <Label className="text-xs">Items</Label>
                  <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="text-center py-2 text-muted-foreground">
                        <p className="text-xs">No items in cart</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item._id} className="flex justify-between items-center p-1.5 border rounded">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.quantity} × ₱{item.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item._id, -1)} className="h-6 w-6 p-0">
                              <Minus className="w-2.5 h-2.5" />
                            </Button>
                            <span className="w-5 text-center text-xs">{item.quantity}</span>
                            <Button size="sm" variant="outline" onClick={() => updateCartQuantity(item._id, 1)} className="h-6 w-6 p-0">
                              <Plus className="w-2.5 h-2.5" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeFromCart(item._id)} className="h-6 w-6 p-0">
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Order Summary - mas compact */}
                <div>
                  <Label className="text-xs">Order Summary</Label>
                  <div className="space-y-0.5 mt-1">
                    <div className="flex justify-between text-xs">
                      <span>Subtotal:</span>
                      <span>₱{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Tax (10%):</span>
                      <span>₱{tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-sm">
                      <span>Total:</span>
                      <span className="text-primary">₱{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Payment Method - mas compact */}
                <div>
                  <Label className="text-xs">Payment</Label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    <Button
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('cash')}
                      className="h-7 text-xs"
                    >
                      <DollarSign className="w-3 h-3 mr-1" /> Cash
                    </Button>
                    <Button
                      variant={paymentMethod === 'gcash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('gcash')}
                      className="h-7 text-xs"
                    >
                      <Smartphone className="w-3 h-3 mr-1" /> GCash
                    </Button>
                    <Button
                      variant={paymentMethod === 'split' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('split')}
                      className="h-7 text-xs"
                    >
                      <Receipt className="w-3 h-3 mr-1" /> Split
                    </Button>
                  </div>
                </div>

                {/* Customer Name - mas compact */}
                <div>
                  <Label className="text-xs">Customer</Label>
                  <Input
                    placeholder="Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-7 text-xs mt-1"
                  />
                </div>

                {/* Process Payment Button */}
                <Button
                  onClick={processPayment}
                  disabled={!cart.length}
                  className="w-full h-9 text-sm"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Pay ₱{total.toFixed(2)}
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