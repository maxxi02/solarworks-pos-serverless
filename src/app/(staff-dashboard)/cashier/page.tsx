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
  ChevronLeft, ChevronRight, GripVertical,
  Save, History, Download, Printer,
  AlertCircle, PackageX, RefreshCw, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryOrder } from '@/hooks/useInventoryOrder';

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

interface SavedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'gcash' | 'split';
  splitPayment?: { cash: number; gcash: number };
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

interface StockAlert {
  itemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  unit: string;
  status: 'critical' | 'low' | 'warning';
  location: string;
  outOfStock?: boolean;
}

const CashierPage = () => {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  
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
  const [showSavedOrders, setShowSavedOrders] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  
  // Inventory State
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [insufficientStockItems, setInsufficientStockItems] = useState<any[]>([]);
  
  // Categories scroll ref and touch state
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Drop zone ref
  const cartDropZoneRef = useRef<HTMLDivElement>(null);
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);

  // Initialize inventory order hook
  const {
    isProcessing: isInventoryProcessing,
    isChecking,
    checkOrderStock,
    processOrderDeductions,
    insufficientItems,
    clearStockCheck
  } = useInventoryOrder({
    onSuccess: (result) => {
      console.log('Inventory updated successfully:', result);
      fetchStockAlerts(); // Refresh alerts after successful deduction
    },
    onError: (error) => {
      console.error('Inventory update failed:', error);
      toast.error('Failed to update inventory', {
        description: error.message
      });
    },
    onInsufficientStock: (items) => {
      setInsufficientStockItems(items);
      setShowInsufficientStockModal(true);
    },
    autoRollback: true
  });

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  // Generate Order Number
  const generateOrderNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${year}${month}${day}-${random}`;
  }, []);

  // Fetch stock alerts
  const fetchStockAlerts = useCallback(async () => {
    try {
      const [criticalRes, lowStockRes] = await Promise.all([
        fetch('/api/products/stocks/alerts/critical'),
        fetch('/api/products/stocks/alerts/low-stock')
      ]);

      if (criticalRes.ok && lowStockRes.ok) {
        const critical = await criticalRes.json();
        const lowStock = await lowStockRes.json();
        setStockAlerts([...critical, ...lowStock]);
      }
    } catch (error) {
      console.error('Failed to fetch stock alerts:', error);
    }
  }, []);

  // Load saved orders from localStorage
  useEffect(() => {
    const loadSavedOrders = () => {
      try {
        const saved = localStorage.getItem('pos_saved_orders');
        if (saved) {
          const parsed: SavedOrder[] = JSON.parse(saved);
          const ordersWithDates = parsed.map(order => ({
            ...order,
            timestamp: new Date(order.timestamp)
          }));
          setSavedOrders(ordersWithDates);
        }
      } catch (error) {
        console.error('Failed to load saved orders:', error);
      }
    };

    loadSavedOrders();
    fetchStockAlerts(); // Initial fetch of stock alerts
    
    // Refresh alerts every 60 seconds
    const interval = setInterval(fetchStockAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchStockAlerts]);

  // Save order to localStorage
  const saveOrderToLocal = useCallback((order: SavedOrder) => {
    try {
      const updatedOrders = [order, ...savedOrders].slice(0, 50);
      setSavedOrders(updatedOrders);
      localStorage.setItem('pos_saved_orders', JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Failed to save order');
    }
  }, [savedOrders]);

  // Fetch products data
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
      toast.error('Failed to load products');
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

  // Check scroll position for categories
  const checkScrollPosition = useCallback(() => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftScroll(scrollLeft > 10);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    setTimeout(checkScrollPosition, 100);
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categories, selectedMenuType, checkScrollPosition]);

  useEffect(() => {
    const container = categoriesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [checkScrollPosition]);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const scrollAmount = 200;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  }, []);

  // Category swipe handlers
  const handleCategoryMouseDown = useCallback((e: React.MouseEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);

  const handleCategoryMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !categoriesContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleCategoryMouseUp = useCallback(() => setIsDragging(false), []);
  const handleCategoryTouchStart = useCallback((e: React.TouchEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);
  const handleCategoryTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !categoriesContainerRef.current) return;
    e.preventDefault();
    const x = e.touches[0].pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);
  const handleCategoryTouchEnd = useCallback(() => setIsDragging(false), []);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    setDraggedItem(product);
    e.dataTransfer.setData('text/plain', product._id);
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed top-0 left-0 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    
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
  }, []);

  const handleDragEnd = useCallback(() => setDraggedItem(null), []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    cartDropZoneRef.current?.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    if (draggedItem) {
      addToCart(draggedItem);
      setDraggedItem(null);
    }
  }, [draggedItem]);

  // Touch drag and drop
  const handleTouchStart = useCallback((e: React.TouchEvent, product: Product) => {
    e.preventDefault();
    setDraggedItem(product);
    
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
    
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchPreview) {
      touchPreview.style.left = `${e.touches[0].clientX - 70}px`;
      touchPreview.style.top = `${e.touches[0].clientY - 50}px`;
    }
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (cartDropZoneRef.current?.contains(element)) {
      cartDropZoneRef.current.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    } else {
      cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    }
  }, [touchPreview]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchPreview) {
      touchPreview.remove();
      setTouchPreview(null);
    }
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (cartDropZoneRef.current?.contains(element) && draggedItem) {
      addToCart(draggedItem);
      if (window.navigator.vibrate) window.navigator.vibrate([20, 20, 20]);
    }
    
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    setDraggedItem(null);
  }, [touchPreview, draggedItem]);

  // Cart functions
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      return existing 
        ? prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1 }];
    });
    
    toast.success(`${product.name} added to cart`, { duration: 1500 });
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
    setCart(prev => {
      const item = prev.find(i => i._id === itemId);
      if (item) toast.info(`${item.name} removed from cart`, { duration: 1500 });
      return prev.filter(item => item._id !== itemId);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
    setSelectedTable('');
    setOrderNote('');
    clearStockCheck();
    toast.info('Cart cleared', { duration: 1500 });
  }, [clearStockCheck]);

  // Save order
  const saveOrder = useCallback(() => {
    if (cart.length === 0) {
      toast.error('Cannot save empty cart', { description: 'Add items to cart first' });
      return;
    }

    const newOrder: SavedOrder = {
      id: `save-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerName: customerName || 'Walk-in Customer',
      items: [...cart],
      subtotal,
      tax,
      total,
      paymentMethod,
      splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType,
      tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : undefined,
      timestamp: new Date(),
      status: 'pending'
    };

    saveOrderToLocal(newOrder);
    
    toast.success('Order Saved Successfully!', {
      description: `Order #${newOrder.orderNumber} has been saved`,
      duration: 3000,
      icon: <Save className="h-4 w-4" />
    });
  }, [cart, customerName, subtotal, tax, total, paymentMethod, splitPayment, orderType, selectedTable, generateOrderNumber, saveOrderToLocal]);

  // Load saved order
  const loadSavedOrder = useCallback((order: SavedOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName);
    setPaymentMethod(order.paymentMethod);
    if (order.splitPayment) setSplitPayment(order.splitPayment);
    setOrderType(order.orderType);
    setSelectedTable(order.tableNumber || '');
    
    toast.success('Order Loaded', {
      description: `Order #${order.orderNumber} loaded to cart`,
      duration: 2000
    });
    
    setShowSavedOrders(false);
  }, []);

  // Process payment with inventory integration
// Process payment with local-only mode
const processPayment = async () => {
  if (cart.length === 0) {
    toast.error('Cart is empty!');
    return;
  }
  if (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total) {
    toast.error('Split payment amounts must equal total!');
    return;
  }
  
  setIsCheckingStock(true);
  
  try {
    const orderId = `order-${Date.now()}`;
    const orderNumber = generateOrderNumber();
    
    // Prepare order items with ingredients for stock check
    const orderItems = cart.map(item => ({
      productId: item._id,
      productName: item.name,
      quantity: item.quantity,
      ingredients: item.ingredients || []
    }));

    // Check stock availability first
    const stockCheck = await checkOrderStock(orderItems);
    
    if (!stockCheck.allAvailable) {
      setInsufficientStockItems(stockCheck.insufficientItems);
      setShowInsufficientStockModal(true);
      setIsCheckingStock(false);
      return;
    }

    // Deduct ingredients from inventory
    await processOrderDeductions(orderId, orderNumber, orderItems);
    
    toast.success('Payment Successful!', {
      description: `Order Total: ₱${total.toFixed(2)}`,
      duration: 4000
    });
    
    // Save completed order to local storage
    const completedOrder: SavedOrder = {
      id: orderId,
      orderNumber,
      customerName: customerName || 'Walk-in Customer',
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod,
      splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType,
      tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : undefined,
      
      timestamp: new Date(),
      status: 'completed'
    };
    saveOrderToLocal(completedOrder);
    
    clearCart();
    
    toast.success('Order completed!', {
      description: `Order #${orderNumber} has been saved locally`,
      duration: 3000
    });
    
  } catch (error: any) {
    console.error('Payment processing error:', error);
    
    // Check if it's an insufficient stock error
    if (error.insufficientItems) {
      setInsufficientStockItems(error.insufficientItems);
      setShowInsufficientStockModal(true);
    } else {
      toast.error('Payment Failed', {
        description: error.message || 'An error occurred during payment processing'
      });
    }
  } finally {
    setIsCheckingStock(false);
  }
};

  const autoSplit = useCallback((type: 'half' | 'cash' | 'gcash') => {
    const splits = {
      half: { cash: total / 2, gcash: total / 2 },
      cash: { cash: total, gcash: 0 },
      gcash: { cash: 0, gcash: total }
    };
    setSplitPayment(splits[type]);
  }, [total]);

  // Format date for display
  const formatOrderDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Insufficient Stock Modal Component
  const InsufficientStockModal = () => {
    if (!showInsufficientStockModal) return null;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
        <div className="w-full max-w-lg rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <PackageX className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Insufficient Stock
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Some items cannot be fulfilled due to low inventory
              </p>
            </div>
          </div>
          
          <div className="mb-6 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {insufficientStockItems.map((item, index) => (
                <div 
                  key={index}
                  className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Required: {item.requiredQuantity} {item.unit}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Available: {item.currentStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-red-600 dark:text-red-500">
                        Short by: {item.shortBy} {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowInsufficientStockModal(false);
                setInsufficientStockItems([]);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Remove items with insufficient stock from cart
                const insufficientItemNames = new Set(
                  insufficientStockItems.map(item => item.name)
                );
                setCart(prev => prev.filter(item => 
                  !item.ingredients?.some(ing => 
                    insufficientItemNames.has(ing.name)
                  )
                ));
                setShowInsufficientStockModal(false);
                setInsufficientStockItems([]);
                toast.info('Removed items with insufficient stock from cart');
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Remove Unavailable Items
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Stock Alerts Badge Component
  const StockAlertsBadge = () => {
    const criticalCount = stockAlerts.filter(a => a.status === 'critical').length;
    const lowCount = stockAlerts.filter(a => a.status === 'low' || a.status === 'warning').length;
    const totalAlerts = stockAlerts.length;
    
    if (totalAlerts === 0) return null;
    
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStockAlerts(!showStockAlerts)}
          className={`h-8 text-xs gap-1 relative ${
            criticalCount > 0 
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' 
              : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Stock Alerts</span>
          <Badge className={`ml-1 h-5 px-1.5 ${
            criticalCount > 0 
              ? 'bg-red-600 text-white' 
              : 'bg-yellow-600 text-white'
          }`}>
            {totalAlerts}
          </Badge>
        </Button>
        
        {showStockAlerts && (
          <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-lg z-50">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h4 className="font-medium text-gray-900 dark:text-white">Low Stock Alerts</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowStockAlerts(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {stockAlerts.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No stock alerts at this time
                </div>
              ) : (
                <div className="space-y-2">
                  {stockAlerts.map((alert, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg ${
                        alert.status === 'critical'
                          ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30'
                          : 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {alert.itemName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Stock: {alert.currentStock} {alert.unit} • Min: {alert.minStock} {alert.unit}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                            Location: {alert.location}
                          </p>
                        </div>
                        <Badge className={
                          alert.status === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }>
                          {alert.status}
                        </Badge>
                      </div>
                      {alert.outOfStock && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-medium">
                          ⚠️ Out of stock - Reorder immediately
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">POS System</h1>
              <p className="text-xs text-muted-foreground mt-1">Swipe categories - Drag items to cart</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Stock Alerts Badge */}
              <StockAlertsBadge />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavedOrders(!showSavedOrders)}
                className="h-8 text-xs gap-1"
              >
                <History className="w-3.5 h-3.5" />
                Saved Orders ({savedOrders.length})
              </Button>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">Cashier #04</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
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

            {/* Categories Section - WITH SWIPE */}
            <div className="mb-4 relative">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium text-foreground">Categories</Label>
                <div className="flex items-center text-[10px] text-muted-foreground">
                  <span>← Swipe →</span>
                </div>
              </div>
              
              <div className="relative group">
                {showLeftScroll && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('left')}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                )}
                
                <div 
                  ref={categoriesContainerRef}
                  className="flex gap-1 overflow-x-auto scrollbar-hide px-1 py-1 select-none"
                  style={{ 
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none'
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
                      onClick={() => {
                        if (!isDragging) {
                          setSelectedCategory(cat);
                        }
                      }}
                      className="whitespace-nowrap text-xs shrink-0 px-3 py-1 h-8"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                
                {showRightScroll && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
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
                      className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing touch-none ${
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

          {/* Right Panel - Checkout */}
          <div className="lg:w-5/12 h-full flex gap-2">
            {/* Cart */}
            <div 
              ref={cartDropZoneRef}
              className="flex-1 transition-all duration-200"
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
                      disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                      className="h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  </div>
                  
                  {/* Drop zone hint */}
                  {cart.length === 0 && (
                    <div className="mt-1 p-2 border border-dashed rounded text-center bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        ↓ Drop or touch & drag products here ↓
                      </p>
                    </div>
                  )}
                </CardHeader>

                <CardContent 
                  className="flex-1 overflow-y-auto space-y-3 p-3 pt-0"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {/* Order Type */}
                  <div>
                    <Label className="text-xs">Order Type</Label>
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant={orderType === 'dine-in' ? 'default' : 'outline'}
                        onClick={() => setOrderType('dine-in')}
                        className="flex-1 h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        Dine In
                      </Button>
                      <Button
                        variant={orderType === 'takeaway' ? 'default' : 'outline'}
                        onClick={() => setOrderType('takeaway')}
                        className="flex-1 h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        Take Away
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Cart Items */}
                  <div>
                    <Label className="text-xs">Items</Label>
                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                      {cart.length === 0 ? (
                        <div className="text-center py-2 text-muted-foreground">
                          <p className="text-xs">No items in cart</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div key={item._id} className="flex justify-between items-center p-1.5 border rounded hover:bg-muted/30">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                ₱{item.price.toFixed(2)} × {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => updateCartQuantity(item._id, -1)} 
                                className="h-6 w-6 p-0"
                                disabled={isInventoryProcessing || isCheckingStock}
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </Button>
                              <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => updateCartQuantity(item._id, 1)} 
                                className="h-6 w-6 p-0"
                                disabled={isInventoryProcessing || isCheckingStock}
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => removeFromCart(item._id)} 
                                className="h-6 w-6 p-0"
                                disabled={isInventoryProcessing || isCheckingStock}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
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

                  {/* Payment Method */}
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('cash')}
                        className="h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        <DollarSign className="w-3 h-3 mr-1" /> Cash
                      </Button>
                      <Button
                        variant={paymentMethod === 'gcash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('gcash')}
                        className="h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        <Smartphone className="w-3 h-3 mr-1" /> GCash
                      </Button>
                      <Button
                        variant={paymentMethod === 'split' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('split')}
                        className="h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        <Receipt className="w-3 h-3 mr-1" /> Split
                      </Button>
                    </div>
                  </div>

                  {/* Split Payment Options */}
                  {paymentMethod === 'split' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Split Amounts</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => autoSplit('half')} 
                          className="h-6 text-xs"
                          disabled={isInventoryProcessing || isCheckingStock}
                        >
                          50/50
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => autoSplit('cash')} 
                          className="h-6 text-xs"
                          disabled={isInventoryProcessing || isCheckingStock}
                        >
                          Cash
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => autoSplit('gcash')} 
                          className="h-6 text-xs"
                          disabled={isInventoryProcessing || isCheckingStock}
                        >
                          GCash
                        </Button>
                      </div>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs">Cash:</span>
                          <span className="text-xs font-medium">₱{splitPayment.cash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs">GCash:</span>
                          <span className="text-xs font-medium">₱{splitPayment.gcash.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Name */}
                  <div>
                    <Label className="text-xs">Customer Name</Label>
                    <Input
                      placeholder="Enter customer name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-7 text-xs mt-1"
                      disabled={isInventoryProcessing || isCheckingStock}
                    />
                  </div>

                  {/* Order Notes */}
                  <div>
                    <Label className="text-xs">Order Notes</Label>
                    <Input
                      placeholder="Special instructions..."
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      className="h-7 text-xs mt-1"
                      disabled={isInventoryProcessing || isCheckingStock}
                    />
                  </div>

                  {/* Table Number for Dine-in */}
                  {orderType === 'dine-in' && (
                    <div>
                      <Label className="text-xs">Table Number</Label>
                      <Input
                        placeholder="e.g., Table 5"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="h-7 text-xs mt-1"
                        disabled={isInventoryProcessing || isCheckingStock}
                      />
                    </div>
                  )}

                  {/* Process Payment Button */}
                  <Button
                    onClick={processPayment}
                    disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                    className="w-full h-9 text-sm font-semibold"
                    size="lg"
                  >
                    {isInventoryProcessing || isCheckingStock ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {isCheckingStock ? 'Checking Stock...' : 'Updating Inventory...'}
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4 mr-2" />
                        Pay ₱{total.toFixed(2)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Buttons */}
            <div className="flex flex-col gap-2 w-10">
              <Button
                onClick={saveOrder}
                disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
                title="Save Order"
              >
                <Save className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => setShowSavedOrders(!showSavedOrders)}
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                title="Saved Orders"
              >
                <History className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                title="Refresh Stock Alerts"
                onClick={fetchStockAlerts}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Orders Side Panel */}
      {showSavedOrders && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4" />
              Saved Orders ({savedOrders.length})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSavedOrders(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {savedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No saved orders</p>
              </div>
            ) : (
              savedOrders.map((order) => (
                <Card key={order.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatOrderDate(order.timestamp)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {order.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs">
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-muted-foreground">{order.items.length} items • ₱{order.total.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs flex-1"
                        onClick={() => loadSavedOrder(order)}
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        Load Order
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <InsufficientStockModal />
    </div>
  );
};

export default CashierPage;