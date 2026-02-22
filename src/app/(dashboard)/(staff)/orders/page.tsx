"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useInventoryOrder } from '@/hooks/useInventoryOrder';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { printReceipt, previewReceipt, ReceiptData as PrinterReceiptData } from '@/lib/receiptPrinter';
import { useAttendance } from '@/hooks/useAttendance';
import { useNotificationSound, preloadNotificationSounds } from '@/lib/use-notification-sound';
import {
  ShoppingCart, Plus, Minus, Trash2, DollarSign, Smartphone, Receipt,
  Loader2, Utensils, Coffee, ChevronLeft, GripVertical,
  Save, History, RefreshCw, Printer, Percent,
  Menu, Clock, Eye, AlertTriangle,
  ChevronRight,
} from 'lucide-react';

// UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// Local _components
import { ClockInCard } from './_components/ClockInCard';
import { CashPaymentInput } from './_components/CashPaymentInput';
import { SplitPaymentInput } from './_components/SplitpaymentInput';
import { ReceiptModal } from './_components/Receiptmodal';
import { DiscountModal } from './_components/DiscountModal';
import { OrderHistoryModal } from './_components/OrderHistoryModal';
import { PrinterStatus } from './_components/Printerstatus';
import { InsufficientStockModal } from './_components/InsufficientStockModal';
import { SavedOrdersPanel } from './_components/Savedorderspanel';
import { useCart, useSavedOrders, buildOrder } from './_components/usePOS';
import {
  Product, CategoryData, SavedOrder, StockAlert,
  InsufficientStockItem, ReceiptOrder, StockCheckResult,
} from './_components/pos.types';
import { formatCurrency, generateOrderNumber, DISCOUNT_RATE } from './_components/pos.utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomerOrder } from '@/types/order.type';
import { useSocket } from '@/provider/socket-provider';

// ============ Main Component ============
export default function OrdersPage() {
  const { emitPosJoin, onNewCustomerOrder, offNewCustomerOrder } = useSocket();


  const { isClockedIn, isLoading: attendanceLoading, attendance, clockIn, clockOut } = useAttendance();
  const { playSuccess, playError, playOrder } = useNotificationSound();
  const { settings, isLoading: settingsLoading } = useReceiptSettings();
  const { isProcessing, checkOrderStock, processOrderDeductions, clearStockCheck } = useInventoryOrder({
    onSuccess: () => { fetchStockAlerts(); playSuccess(); },
    onError: (error: Error) => { toast.error('Inventory update failed', { description: error.message }); playError(); },
    onInsufficientStock: (items: StockCheckResult[]) => {
      setInsufficientStockItems(items.map(i => ({ ...i, shortBy: i.shortBy ?? 0 })));
      setShowInsufficientStockModal(true);
      playError();
    },
    autoRollback: true,
  });

  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false);

  // Cart
  const {
    cart, setCart, subtotal, discountTotal, total, seniorPwdCount,
    addToCart, updateQuantity, removeFromCart, applyDiscount, removeDiscount, clearCart: clearCartItems,
  } = useCart(playOrder, playError, playSuccess);

  // Saved Orders
  const { savedOrders, saveOrder: saveOrderToLocal, deleteOrder, clearAll: clearAllSavedOrders } = useSavedOrders();

  // Product State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  // Order Form State
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [amountPaid, setAmountPaid] = useState(0);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('takeaway');
  const [selectedTable, setSelectedTable] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [seniorPwdIds, setSeniorPwdIds] = useState<string[]>([]);
  const [splitError, setSplitError] = useState('');

  // UI State
  const [selectedMenuType, setSelectedMenuType] = useState<'food' | 'drink' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [draggedItem, setDraggedItem] = useState<Product | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSavedOrders, setShowSavedOrders] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  // const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptOrder | null>(null);
  const [insufficientStockItems, setInsufficientStockItems] = useState<InsufficientStockItem[]>([]);
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  //ORDER STATES
  const [incomingOrder, setIncomingOrder] = useState<CustomerOrder | null>(null);

  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const cartDropZoneRef = useRef<HTMLDivElement>(null);

  // ——— Computed ———
  const isDisabled = isProcessing || isCheckingStock || isPrinting;

  const canProcessPayment = useMemo(() => {
    if (!cart.length) return false;
    if (paymentMethod === 'cash') return amountPaid >= total;
    if (paymentMethod === 'split') return (splitPayment.cash + splitPayment.gcash) >= total && !splitError;
    return true;
  }, [cart.length, paymentMethod, amountPaid, total, splitPayment, splitError]);

  const categories = useMemo(() => [
    'All',
    ...Array.from(new Set(
      products
        .filter(p => p.available && (selectedMenuType === 'all' || p.menuType === selectedMenuType))
        .map(p => p.category || 'Uncategorized')
    )),
  ], [products, selectedMenuType]);

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      p.available &&
      (selectedMenuType === 'all' || p.menuType === selectedMenuType) &&
      (selectedCategory === 'All' || p.category === selectedCategory)
    ),
    [products, selectedMenuType, selectedCategory]
  );

  // ——— Effects ———
  useEffect(() => { preloadNotificationSounds(); }, []);

  // Join POS room + listen for customer orders
  useEffect(() => {
    emitPosJoin();

    const handleNewOrder = (order: CustomerOrder) => {
      setIncomingOrder(order);
      playOrder();
      toast.info(`New order from ${order.customerName}!`, {
        description: `${order.items.length} item(s) · ${formatCurrency(order.total)}`,
        duration: 10000,
      });
    };

    onNewCustomerOrder(handleNewOrder);
    return () => offNewCustomerOrder(handleNewOrder);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchStockAlerts();
    const t = setInterval(fetchStockAlerts, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (paymentMethod === 'split' && total > 0) setSplitPayment({ cash: total / 2, gcash: total / 2 });
  }, [total, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === 'split') {
      const paid = splitPayment.cash + splitPayment.gcash;
      setSplitError(Math.abs(paid - total) > 0.01 ? `Split amounts must equal ${formatCurrency(total)}` : '');
    } else {
      setSplitError('');
    }
  }, [splitPayment, total, paymentMethod]);

  useEffect(() => {
    const check = () => {
      if (categoriesContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = categoriesContainerRef.current;
        setShowLeftScroll(scrollLeft > 10);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };
    setTimeout(check, 100);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [categories]);

  // ——— API ———
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/products/categories');
      const data: CategoryData[] = await res.json();
      const list: Product[] = [];
      data.forEach(cat => cat.products?.forEach(p => list.push({ ...p, category: cat.name, menuType: cat.menuType })));
      setProducts(list);
    } catch {
      toast.error('Failed to load products');
      playError();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const [criticalRes, lowStockRes] = await Promise.all([
        fetch('/api/products/stocks/alerts/critical'),
        fetch('/api/products/stocks/alerts/low-stock'),
      ]);
      if (criticalRes.ok && lowStockRes.ok) {
        setStockAlerts([...(await criticalRes.json()), ...(await lowStockRes.json())]);
      }
    } catch { /* silent */ }
  };

  const saveOrderToDatabase = async (order: SavedOrder) => {
    try {
      const itemsWithRevenue = order.items.map(item => {
        const itemTotal = item.price * item.quantity;
        return {
          productId: item._id, name: item.name, price: item.price, quantity: item.quantity,
          hasDiscount: item.hasDiscount || false, discountRate: item.hasDiscount ? 0.2 : 0,
          revenue: item.hasDiscount ? itemTotal * (1 - 0.2) : itemTotal,
          category: item.category, menuType: item.menuType, notes: item.notes,
        };
      });

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.orderNumber, orderId: order.id,
          customerName: order.customerName || 'Walk-in Customer',
          items: itemsWithRevenue,
          subtotal: order.subtotal, discountTotal: order.discountTotal, total: order.total,
          paymentMethod: order.paymentMethod, splitPayment: order.splitPayment,
          orderType: order.orderType, tableNumber: order.tableNumber, orderNote: order.orderNote,
          seniorPwdCount: order.seniorPwdCount || 0, seniorPwdIds,
          cashier: 'Cashier', cashierId: 'current-user-id', status: 'completed',
          amountPaid: order.amountPaid, change: order.change,
          createdAt: new Date(), updatedAt: new Date(),
        }),
      });
      if (!response.ok) throw new Error(`Failed to save payment: ${response.status}`);
      toast.success('Order saved to database for analytics');
      return await response.json();
    } catch (error) {
      toast.warning('Order saved locally only (database unavailable)', {
        description: error instanceof Error ? error.message : 'Connection error',
      });
      saveOrderToLocal(order);
      return null;
    }
  };

  // ——— Cart Actions ———
  const clearCart = useCallback(() => {
    clearCartItems();
    setCustomerName('');
    setAmountPaid(0);
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
    setSelectedTable('');
    setOrderNote('');
    setSeniorPwdIds([]);
    clearStockCheck();
  }, [clearCartItems, clearStockCheck]);

  const handleApplyDiscount = useCallback((data: { ids: string[]; itemIds: string[] }) => {
    applyDiscount(data);
    setSeniorPwdIds(prev => [...new Set([...prev, ...data.ids])]);
  }, [applyDiscount]);

  const saveCurrentOrder = useCallback(() => {
    if (!cart.length) { toast.error('Cart is empty'); playError(); return; }
    const order: SavedOrder = {
      id: `save-${Date.now()}`, orderNumber: generateOrderNumber(),
      customerName: customerName || 'Walk-in Customer',
      items: [...cart], subtotal, discountTotal, total, paymentMethod,
      splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType, tableNumber: orderType === 'dine-in' ? selectedTable : undefined,
      timestamp: new Date(), status: 'pending', seniorPwdCount,
      orderNote: orderNote || undefined, seniorPwdIds,
    };
    saveOrderToLocal(order);
    toast.success('Order saved', { description: `#${order.orderNumber}` });
    playSuccess();
    clearCart();
  }, [cart, customerName, subtotal, discountTotal, total, paymentMethod, splitPayment, orderType,
    selectedTable, seniorPwdCount, orderNote, seniorPwdIds, playSuccess, playError, saveOrderToLocal]);

  const loadSavedOrder = useCallback((order: SavedOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName);
    setPaymentMethod(order.paymentMethod);
    if (order.splitPayment) setSplitPayment(order.splitPayment);
    if (order.amountPaid) setAmountPaid(order.amountPaid);
    setOrderType(order.orderType);
    setSelectedTable(order.tableNumber || '');
    setOrderNote(order.orderNote || '');
    setSeniorPwdIds(order.seniorPwdIds || []);
    setShowSavedOrders(false);
    toast.success('Order loaded');
    playSuccess();
  }, [playSuccess, setCart]);

  const handleReprintReceipt = useCallback((order: SavedOrder) => {
    setCurrentReceipt({ ...order, cashier: 'Cashier', seniorPwdIds: order.seniorPwdIds || seniorPwdIds, isReprint: true });
    setShowReceipt(true);
  }, [seniorPwdIds]);

  // ——— Print ———
  const handlePrintReceipt = useCallback(async () => {
    if (!currentReceipt || !settings) return;
    setIsPrinting(true);
    try {
      const receiptContent = document.getElementById('receipt-content');
      if (!receiptContent) return;
      const is58mm = settings.receiptWidth === '58mm';
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, { position: 'absolute', width: '0', height: '0', border: 'none', opacity: '0' });
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.write(`<!DOCTYPE html><html><head>
          <title>Receipt - ${currentReceipt.orderNumber}</title>
          <meta charset="utf-8">
          <style>
            @page { size: ${is58mm ? '58mm' : '80mm'} auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: 'Courier New', monospace; font-size: ${is58mm ? '14px' : '16px'};
              font-weight: bold; width: ${is58mm ? '58mm' : '80mm'}; max-width: ${is58mm ? '58mm' : '80mm'};
              margin: 0 auto; padding: 2mm; background: white; line-height: 1.5; color: black; }
            .text-center { text-align: center; } .text-right { text-align: right; }
            .flex { display: flex; } .justify-between { justify-content: space-between; }
            .font-bold, strong { font-weight: 900; } .text-green-600 { color: #16a34a; }
          </style></head><body>${receiptContent.outerHTML}</body></html>`);
        doc.close();
        iframe.onload = () => setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => { document.body.removeChild(iframe); setIsPrinting(false); toast.success('Receipt sent to printer'); }, 500);
        }, 200);
      }
    } catch {
      toast.error('Failed to print receipt');
      setIsPrinting(false);
    }
  }, [currentReceipt, settings]);

  // ——— Process Payment ———
  const processPayment = async () => {
    if (!cart.length) { toast.error('Cart is empty'); playError(); return; }

    if (paymentMethod === 'cash' && amountPaid < total) {
      toast.error(`Need ${formatCurrency(total - amountPaid)} more`); playError(); return;
    }
    if (paymentMethod === 'split') {
      const paid = splitPayment.cash + splitPayment.gcash;
      if (paid < total) { toast.error(`Need ${formatCurrency(total - paid)} more`); playError(); return; }
      if (Math.abs(paid - total) > 0.01) { toast.error(`Split amounts must equal ${formatCurrency(total)}`); playError(); return; }
    }

    setIsCheckingStock(true);
    try {
      const orderItems = cart.map(i => ({
        productId: i._id, productName: i.name, quantity: i.quantity, ingredients: i.ingredients || [],
      }));
      const orderNumber = generateOrderNumber();
      const orderId = `order-${Date.now()}`;

      try {
        const stockCheck = await checkOrderStock(orderItems);
        if (!stockCheck.allAvailable) {
          setInsufficientStockItems(stockCheck.insufficientItems.map(i => ({ ...i, shortBy: i.shortBy ?? 0 })));
          setShowInsufficientStockModal(true);
          setIsCheckingStock(false);
          playError();
          return;
        }
        await processOrderDeductions(orderId, orderNumber, orderItems);
      } catch { /* continue on stock check failure */ }

      const completedOrder = buildOrder({
        cart, customerName, subtotal, discountTotal, total,
        paymentMethod, splitPayment, amountPaid, orderType, selectedTable, orderNote, seniorPwdCount, seniorPwdIds,
      });

      await saveOrderToDatabase(completedOrder);
      saveOrderToLocal(completedOrder);

      if (settings?.printReceipt) {
        const receiptData: PrinterReceiptData = {
          ...completedOrder, cashier: 'Cashier',
          seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
          id: orderId, timestamp: new Date(),
          customerReceiptPrinted: false, kitchenReceiptPrinted: false,
        };
        setIsPrinting(true);
        try {
          const results = await printReceipt(receiptData, settings);
          if (results.customer) toast.success('Customer receipt printed');
          if (results.kitchen) toast.success('Kitchen order printed');
        } catch { /* silent */ } finally { setIsPrinting(false); }
      }

      setCurrentReceipt({
        ...completedOrder, cashier: 'Cashier',
        seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
      });
      setShowReceipt(true);
      clearCart();
      toast.success('Payment successful!');
      playSuccess();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'insufficientItems' in error) {
        const err = error as { insufficientItems: InsufficientStockItem[] };
        setInsufficientStockItems(err.insufficientItems);
        setShowInsufficientStockModal(true);
      } else {
        toast.error('Payment failed', { description: error instanceof Error ? error.message : 'Unknown error' });
      }
      playError();
    } finally {
      setIsCheckingStock(false);
    }
  };

  // ——— Drag & Drop ———
  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    setDraggedItem(product);
    e.dataTransfer.effectAllowed = 'copy';
    const preview = document.createElement('div');
    preview.style.cssText = 'position:absolute;top:-1000px;padding:12px;background:white;border:2px solid blue;border-radius:8px;width:160px';
    preview.innerHTML = `<div style="font-weight:bold">${product.name}</div><div style="font-size:12px">${formatCurrency(product.price)}</div>`;
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 80, 40);
    setTimeout(() => document.body.removeChild(preview), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);

  const handleDragLeave = useCallback(() => {
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    if (draggedItem) { addToCart(draggedItem); setDraggedItem(null); }
  }, [draggedItem, addToCart]);

  const handleTouchStart = useCallback((e: React.TouchEvent, product: Product) => {
    e.preventDefault();
    setDraggedItem(product);
    const preview = document.createElement('div');
    preview.className = 'fixed z-50 w-[160px] bg-card border-2 border-primary shadow-lg rounded-lg p-3';
    preview.style.cssText = `left:${e.touches[0].clientX - 80}px;top:${e.touches[0].clientY - 60}px;pointer-events:none;position:fixed`;
    preview.innerHTML = `<div class="font-bold text-sm">${product.name}</div><div class="text-xs text-p  rimary">${formatCurrency(product.price)}</div>`;
    document.body.appendChild(preview);
    setTouchPreview(preview);
    window.navigator.vibrate?.(20);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchPreview) {
      touchPreview.style.left = `${e.touches[0].clientX - 80}px`;
      touchPreview.style.top = `${e.touches[0].clientY - 60}px`;
    }
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    cartDropZoneRef.current?.classList.toggle('bg-primary/5', !!cartDropZoneRef.current?.contains(el));
  }, [touchPreview]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchPreview?.remove();
    setTouchPreview(null);
    const el = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (cartDropZoneRef.current?.contains(el) && draggedItem) {
      addToCart(draggedItem);
      window.navigator.vibrate?.([20, 20, 20]);
    }
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    setDraggedItem(null);
  }, [touchPreview, draggedItem, addToCart]);

  const scrollCategories = (dir: 'left' | 'right') =>
    categoriesContainerRef.current?.scrollBy({ left: dir === 'left' ? -250 : 250, behavior: 'smooth' });

  const handleCategoryMouseDown = useCallback((e: React.MouseEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDraggingCategory(true);
    setStartX(e.pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);

  const handleCategoryMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingCategory || !categoriesContainerRef.current) return;
    e.preventDefault();
    categoriesContainerRef.current.scrollLeft = scrollLeft - (e.pageX - categoriesContainerRef.current.offsetLeft - startX) * 2.5;
  }, [isDraggingCategory, startX, scrollLeft]);

  // ——— Guards ———
  if (attendanceLoading || (isLoading && !products.length) || settingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-56 bg-muted rounded" />
            <div className="h-72 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isClockedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-10 text-center shadow-sm">
            <AlertTriangle className="h-20 w-20 text-yellow-600 mx-auto mb-8" />
            <h2 className="text-3xl font-bold mb-4">Clock In Required</h2>
            <p className="text-lg text-muted-foreground mb-8">
              You need to start your shift before accessing the POS system.
            </p>
            <Button
              onClick={() => { clockIn(); playSuccess(); }}
              disabled={attendanceLoading}
              size="lg"
              className="w-full sm:w-auto h-12 text-base px-8"
            >
              {attendanceLoading
                ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</>
                : 'Start Shift (Clock In)'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ——— Main POS Interface ———
  return (
    <div className="min-h-screen bg-background p-5">
      {/* Attendance Status Bar */}
      <div className="border-b bg-card sticky top-0 z-20 backdrop-blur-sm mb-5">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">

          {/* Left — shift status */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium text-base">On Shift</span>
            </div>
            {attendance && (
              <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span className="text-base">
                  Since {new Date(attendance.clockInTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Right — single sheet trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Menu className="h-4 w-4" /> Actions
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Controls
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 overflow-y-auto h-[calc(100vh-80px)] p-2">
                {/* Shift Status */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Shift</p>
                  <ClockInCard />
                  {!attendance?.clockOutTime && (
                    <Button
                      onClick={() => { clockOut(); playSuccess(); }}
                      disabled={attendanceLoading}
                      variant="destructive"
                      className="w-full"
                    >
                      {attendanceLoading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ending shift…</>
                        : 'Clock Out – End Shift'}
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Printer */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Printer</p>
                  {settings && <PrinterStatus settings={settings} />}
                </div>

                <Separator />

                {/* Orders */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Orders</p>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowOrderHistory(true)}>
                    <History className="w-4 h-4" /> Order History
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowSavedOrders(v => !v)}>
                    <Save className="w-4 h-4" /> Saved Orders ({savedOrders.length})
                  </Button>
                </div>

                <Separator />

                {/* Stock */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stock</p>
                  <Button variant="outline" className="w-full justify-start gap-2"
                    onClick={() => setShowStockAlertsModal(true)}>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Stock Alerts
                    {stockAlerts.length > 0 && (
                      <Badge variant="destructive" className="ml-auto">{stockAlerts.length}</Badge>
                    )}
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={fetchStockAlerts}>
                    <RefreshCw className="w-4 h-4" /> Refresh Stock
                  </Button>
                </div>

                <Separator />
                {/* Stock Alerts Modal */}
                <Dialog open={showStockAlertsModal} onOpenChange={setShowStockAlertsModal}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Stock Alerts ({stockAlerts.length})
                      </DialogTitle>
                      <DialogDescription>
                        Items that are low or critically out of stock.
                      </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] pr-3">
                      {stockAlerts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No stock alerts at the moment.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stockAlerts.map((alert) => (
                            <div key={alert.itemId} className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{alert.itemName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Current: {alert.currentStock} {alert.unit} · Min: {alert.minStock} {alert.unit}
                                </p>
                                {alert.location && (
                                  <p className="text-xs text-muted-foreground">📍 {alert.location}</p>
                                )}
                              </div>
                              <Badge
                                variant={alert.status === 'critical' ? 'destructive' : 'secondary'}
                                className="shrink-0 ml-2"
                              >
                                {alert.outOfStock ? 'Out of Stock' : alert.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    <DialogFooter>
                      <Button variant="outline" className="w-full gap-2" onClick={() => { fetchStockAlerts(); }}>
                        <RefreshCw className="w-4 h-4" /> Refresh
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Incoming Customer Order Modal */}
                <Dialog open={!!incomingOrder} onOpenChange={() => setIncomingOrder(null)}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        New Customer Order
                      </DialogTitle>
                      <DialogDescription>
                        From <span className="font-semibold">{incomingOrder?.customerName}</span>
                        {incomingOrder?.orderType === 'dine-in' && incomingOrder.tableNumber && (
                          <span> · Table {incomingOrder.tableNumber}</span>
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[50vh] pr-3">
                      <div className="space-y-2">
                        {incomingOrder?.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name}
                                  className="h-10 w-10 rounded object-cover border flex-shrink-0" />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  {item.menuType === 'drink'
                                    ? <Coffee className="h-4 w-4 text-muted-foreground" />
                                    : <Utensils className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                              </div>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {incomingOrder?.orderNote && (
                          <div className="p-2 bg-muted rounded-lg text-sm text-muted-foreground">
                            📝 {incomingOrder.orderNote}
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(incomingOrder?.total ?? 0)}</span>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setIncomingOrder(null)}>
                        Decline
                      </Button>
                      <Button onClick={() => {
                        if (!incomingOrder) return;
                        // Load items into cart
                        incomingOrder.items.forEach(item => {
                          for (let i = 0; i < item.quantity; i++) {
                            addToCart({
                              ...item,
                              available: true,
                              ingredients: item.ingredients ?? [],
                            });
                          }
                        });
                        if (incomingOrder.customerName) setCustomerName(incomingOrder.customerName);
                        if (incomingOrder.orderNote) setOrderNote(incomingOrder.orderNote);
                        if (incomingOrder.orderType) setOrderType(incomingOrder.orderType);
                        if (incomingOrder.tableNumber) setSelectedTable(incomingOrder.tableNumber);
                        setIncomingOrder(null);
                        toast.success('Order loaded into cart');
                        playSuccess();
                      }}>
                        Accept Order
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Receipt */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Receipt</p>
                  <Button variant="outline" className="w-full justify-start gap-2"
                    onClick={() => savedOrders.length ? handleReprintReceipt(savedOrders[0]) : toast.info('No saved orders')}>
                    <Printer className="w-4 h-4" /> Test Print
                  </Button>
                  {currentReceipt && (
                    <>
                      <Button variant="outline" className="w-full justify-start gap-2"
                        onClick={() => previewReceipt(currentReceipt as unknown as PrinterReceiptData, settings, 'customer')}
                      >
                        <Eye className="w-4 h-4" /> Preview Customer Receipt
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-2"
                        onClick={() => previewReceipt(currentReceipt as unknown as PrinterReceiptData, settings, 'kitchen')}>
                        <Utensils className="w-4 h-4" /> Preview Kitchen Order
                      </Button>
                    </>
                  )}
                </div>
              </div>

            </SheetContent>
          </Sheet>

        </div>
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-220px)]">
          {/* Left — Products */}
          <div className="lg:w-7/12 flex flex-col h-full">
            {/* Menu Type Filter */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {(['all', 'food', 'drink'] as const).map(type => (
                <Button
                  key={type}
                  variant={selectedMenuType === type ? 'default' : 'outline'}
                  onClick={() => { setSelectedMenuType(type); setSelectedCategory('All'); }}
                  className="h-11 text-base"
                >
                  {type === 'food' && <Utensils className="w-4 h-4 mr-2" />}
                  {type === 'drink' && <Coffee className="w-4 h-4 mr-2" />}
                  {type === 'all' ? 'All' : type}
                </Button>
              ))}
            </div>

            {/* Categories */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Categories</Label>
                <span className="text-xs text-muted-foreground">← Swipe →</span>
              </div>
              <div className="relative group">
                {showLeftScroll && (
                  <Button variant="secondary" size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('left')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <div
                  ref={categoriesContainerRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide px-2 py-1 select-none"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', cursor: isDraggingCategory ? 'grabbing' : 'grab' }}
                  onMouseDown={handleCategoryMouseDown}
                  onMouseMove={handleCategoryMouseMove}
                  onMouseUp={() => setIsDraggingCategory(false)}
                  onMouseLeave={() => setIsDraggingCategory(false)}
                >
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      onClick={() => !isDraggingCategory && setSelectedCategory(cat)}
                      className="whitespace-nowrap text-sm shrink-0 px-4 py-2 h-10"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                {showRightScroll && (
                  <Button variant="secondary" size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('right')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <div className="overflow-y-auto flex-1 pr-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin mr-3" />Loading...
                </div>
              ) : !filteredProducts.length ? (
                <div className="text-center py-10 text-muted-foreground text-base">No products found</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map(product => (
                    <Card
                      key={product._id}
                      className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing touch-none overflow-hidden p-0 ${draggedItem?._id === product._id ? 'opacity-50 scale-95' : ''
                        }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, product)}
                      onDragEnd={() => setDraggedItem(null)}
                      onTouchStart={(e) => handleTouchStart(e, product)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <CardContent className="p-0">
                        {/* Image */}
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-36 object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-36 bg-muted flex items-center justify-center text-4xl">
                            {product.menuType === 'drink' ? '☕' : '🍽️'}
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-3">
                          <h3 className="font-bold text-sm line-clamp-2">{product.name}</h3>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-bold text-sm text-primary">
                              {formatCurrency(product.price)}
                            </span>
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                            >
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
          </div>

          {/* Right — Cart */}
          <div className="lg:w-5/12 h-full flex gap-3">
            <div
              ref={cartDropZoneRef}
              className="flex-1 transition-all"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Card className="h-full flex flex-col border">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="w-5 h-5" />Current Order ({cart.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="default" onClick={() => setShowDiscountModal(true)}
                        disabled={!cart.length || isDisabled} className="h-9 text-sm px-3">
                        <Percent className="w-4 h-4 mr-2" />Discount
                      </Button>
                      <Button variant="outline" size="default" onClick={saveCurrentOrder}
                        disabled={!cart.length || isDisabled} className="h-9 w-9 p-0" title="Save Order">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="default" onClick={clearCart}
                        disabled={!cart.length || isDisabled} className="h-9 w-9 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {!cart.length && (
                    <div className="mt-2 p-3 border border-dashed rounded text-center bg-muted/30">
                      <p className="text-sm text-muted-foreground">↓ Drop products here ↓</p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-0">
                  {/* Senior/PWD Banner */}
                  {seniorPwdCount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-700 mb-2">Senior/PWD Discount Applied:</p>
                      <p className="text-xs text-green-600">{seniorPwdCount} item(s) with 20% discount</p>
                    </div>
                  )}

                  {/* Order Type */}
                  <div>
                    <Label className="text-sm">Order Type</Label>
                    <div className="flex gap-2 mt-2">
                      {(['dine-in', 'takeaway'] as const).map(type => (
                        <Button key={type} variant={orderType === type ? 'default' : 'outline'}
                          onClick={() => setOrderType(type)} className="flex-1 h-9 text-sm" disabled={isDisabled}>
                          {type === 'dine-in' ? 'Dine In' : 'Take Away'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Cart Items */}
                  <div>
                    <Label className="text-sm">Items</Label>
                    <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item._id} className="flex flex-col p-2 border rounded">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Thumbnail */}
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-10 w-10 rounded object-cover border shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0 border">
                                  {item.menuType === 'drink'
                                    ? <Coffee className="h-4 w-4 text-muted-foreground" />
                                    : <Utensils className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  {item.hasDiscount && (
                                    <Badge variant="default" className="text-[10px] h-5 px-2 bg-green-600">20% OFF</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {item.hasDiscount ? (
                                    <>
                                      <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</p>
                                      <p className="text-xs text-green-600 font-bold">{formatCurrency(item.price * (1 - DISCOUNT_RATE))}</p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <Button size="default" variant="outline" onClick={() => updateQuantity(item._id, -1)} className="h-8 w-8 p-0" disabled={isDisabled}>
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <Button size="default" variant="outline" onClick={() => updateQuantity(item._id, 1)} className="h-8 w-8 p-0" disabled={isDisabled}>
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                                {item.hasDiscount && (
                                  <Button size="default" variant="outline" onClick={() => removeDiscount(item._id)} className="h-8 w-8 p-0 text-yellow-600" disabled={isDisabled}>
                                    <Percent className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button size="default" variant="destructive" onClick={() => removeFromCart(item._id)} className="h-8 w-8 p-0" disabled={isDisabled}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>   {/* ← ADD: closes min-w-0 wrapper */}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span><span>-{formatCurrency(discountTotal)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span><span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div>
                    <Label className="text-sm">Payment</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(['cash', 'gcash', 'split'] as const).map(method => (
                        <Button key={method} variant={paymentMethod === method ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod(method)} className="h-9 text-sm" disabled={isDisabled}>
                          {method === 'cash' && <DollarSign className="w-4 h-4 mr-2" />}
                          {method === 'gcash' && <Smartphone className="w-4 h-4 mr-2" />}
                          {method === 'split' && <Receipt className="w-4 h-4 mr-2" />}
                          {method === 'cash' ? 'Cash' : method === 'gcash' ? 'GCash' : 'Split'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <CashPaymentInput total={total} amountPaid={amountPaid} setAmountPaid={setAmountPaid} disabled={isDisabled} />
                  )}
                  {paymentMethod === 'split' && (
                    <SplitPaymentInput total={total} splitPayment={splitPayment} setSplitPayment={setSplitPayment} disabled={isDisabled} />
                  )}
                  {paymentMethod === 'gcash' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />GCash payment of {formatCurrency(total)} will be processed.
                      </p>
                    </div>
                  )}

                  {/* Customer Info */}
                  <Input placeholder="Customer name (optional)" value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)} className="h-10 text-sm" disabled={isDisabled} />
                  <Input placeholder="Order notes" value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)} className="h-10 text-sm" disabled={isDisabled} />
                  {orderType === 'dine-in' && (
                    <Input placeholder="Table number" value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)} className="h-10 text-sm" disabled={isDisabled} />
                  )}

                  {/* Pay Button */}
                  <Button
                    onClick={processPayment}
                    disabled={!cart.length || isDisabled || settingsLoading || !canProcessPayment}
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                    variant={canProcessPayment ? 'default' : 'secondary'}
                  >
                    {isProcessing || isCheckingStock ? (
                      <><RefreshCw className="w-5 h-5 mr-3 animate-spin" />{isCheckingStock ? 'Checking Stock...' : 'Processing...'}</>
                    ) : isPrinting ? (
                      <><Printer className="w-5 h-5 mr-3 animate-pulse" />Printing...</>
                    ) : (
                      <><Receipt className="w-5 h-5 mr-3" />
                        {paymentMethod === 'cash' && amountPaid >= total
                          ? `Pay & Change: ₱${(amountPaid - total).toFixed(2)}`
                          : paymentMethod === 'split' && (splitPayment.cash + splitPayment.gcash) >= total
                            ? 'Pay (Split)'
                            : `Pay ${formatCurrency(total)}`}
                      </>
                    )}
                  </Button>

                  {/* Underpayment hints */}
                  {paymentMethod === 'cash' && amountPaid > 0 && amountPaid < total && (
                    <p className="text-xs text-red-500 text-center">Need {formatCurrency(total - amountPaid)} more</p>
                  )}
                  {paymentMethod === 'split' && (splitPayment.cash + splitPayment.gcash) > 0 && (splitPayment.cash + splitPayment.gcash) < total && (
                    <p className="text-xs text-red-500 text-center">Need {formatCurrency(total - (splitPayment.cash + splitPayment.gcash))} more</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSavedOrders} onOpenChange={setShowSavedOrders}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Saved Orders ({savedOrders.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            <SavedOrdersPanel
              orders={savedOrders}
              isProcessing={isProcessing}
              isPrinting={isPrinting}
              onClose={() => setShowSavedOrders(false)}
              onLoad={loadSavedOrder}
              onReprint={handleReprintReceipt}
              onDelete={deleteOrder}
              onClearAll={clearAllSavedOrders}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        cartItems={cart}
      />

      <OrderHistoryModal
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        orders={savedOrders}
        onReprint={handleReprintReceipt}
        onViewDetails={(order) => {
          setCurrentReceipt({ ...order, cashier: order.cashier || 'Cashier', seniorPwdIds: order.seniorPwdIds });
          setShowReceipt(true);
        }}
      />

      {showReceipt && settings && (
        <ReceiptModal
          receipt={currentReceipt}
          settings={settings}
          onClose={() => setShowReceipt(false)}
          onPrint={handlePrintReceipt}
        />
      )}

      <InsufficientStockModal
        items={insufficientStockItems}
        onClose={() => { setShowInsufficientStockModal(false); setInsufficientStockItems([]); }}
        onRemoveUnavailable={() => {
          const names = new Set(insufficientStockItems.map(i => i.name));
          setCart(prev => prev.filter(item => !item.ingredients?.some(ing => names.has(ing.name))));
          setShowInsufficientStockModal(false);
          setInsufficientStockItems([]);
          toast.info('Removed unavailable items');
        }}
      />
    </div>
  );
}