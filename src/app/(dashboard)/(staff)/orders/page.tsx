"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useInventoryOrder } from "@/hooks/useInventoryOrder";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";
import {
  previewReceipt,
  ReceiptData as PrinterReceiptData,
} from "@/lib/receiptPrinter";
import { useAttendance } from "@/hooks/useAttendance";
import { useSession } from "@/lib/auth-client";
import {
  useNotificationSound,
  preloadNotificationSounds,
} from "@/lib/use-notification-sound";
import {
  ShoppingCart,
  Trash2,
  DollarSign,
  Smartphone,
  Receipt,
  Loader2,
  Utensils,
  Coffee,
  Save,
  RefreshCw,
  Printer,
  Percent,
  AlertTriangle,
} from "lucide-react";

// UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Local _components
import { CashPaymentInput } from "./_components/CashPaymentInput";
import { SplitPaymentInput } from "./_components/SplitpaymentInput";
import { ReceiptModal } from "./_components/Receiptmodal";
import { DiscountModal } from "./_components/DiscountModal";
import { OrderHistoryModal } from "./_components/OrderHistoryModal";
import { InsufficientStockModal } from "./_components/Insufficientstockmodal";
import { StockAlertsModal } from "./_components/StockAlertsModal";
import { IncomingOrderModal } from "./_components/IncomingOrderModal";
import { SavedOrdersPanel } from "./_components/Savedorderspanel";
import { CategoryFilter } from "./_components/CategoryFilter";
import { AttendanceBar } from "./_components/AttendanceBar";
import { ProductCard } from "./_components/ProductCard";
import { CartItem } from "./_components/CartItem";
import { useCart, useSavedOrders, buildOrder } from "./_components/usePOS";
import {
  Product,
  CategoryData,
  SavedOrder,
  StockAlert,
  InsufficientStockItem,
  ReceiptOrder,
  StockCheckResult,
} from "./_components/pos.types";
import {
  formatCurrency,
  generateOrderNumber,
  DISCOUNT_RATE,
} from "./_components/pos.utils";

import { useSocket } from "@/provider/socket-provider";
import { CustomerOrder } from "@/types/order.type";


// ============ Main Component ============
export default function OrdersPage() {
  const {
    emitPosJoin,
    onNewCustomerOrder,
    offNewCustomerOrder,
    printBoth,
    isConnected,
  } = useSocket();

  const { data: session } = useSession();
  const staffName = session?.user?.name || "Staff";

  const {
    isClockedIn,
    isLoading: attendanceLoading,
    attendance,
    clockIn,
    clockOut,
  } = useAttendance();
  const { playSuccess, playError, playOrder } = useNotificationSound();
  const { settings, isLoading: settingsLoading } = useReceiptSettings();
  const {
    isProcessing,
    checkOrderStock,
    processOrderDeductions,
    clearStockCheck,
  } = useInventoryOrder({
    onSuccess: () => {
      fetchStockAlerts();
      playSuccess();
    },
    onError: (error: Error) => {
      toast.error("Inventory update failed", { description: error.message });
      playError();
    },
    onInsufficientStock: (items: StockCheckResult[]) => {
      setInsufficientStockItems(
        items.map((i) => ({ ...i, shortBy: i.shortBy ?? 0 })),
      );
      setShowInsufficientStockModal(true);
      playError();
    },
    autoRollback: true,
  });

  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false);

  // Cart
  const {
    cart,
    setCart,
    subtotal,
    discountTotal,
    total,
    seniorPwdCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    applyDiscount,
    removeDiscount,
    clearCart: clearCartItems,
  } = useCart(playOrder, playError, playSuccess);

  // Saved Orders
  const {
    savedOrders,
    saveOrder: saveOrderToLocal,
    deleteOrder,
    clearAll: clearAllSavedOrders,
  } = useSavedOrders();

  // Product State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  // Order Form State
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "gcash" | "split"
  >("cash");
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [amountPaid, setAmountPaid] = useState(0);
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">(
    "takeaway",
  );
  const [selectedTable, setSelectedTable] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [seniorPwdIds, setSeniorPwdIds] = useState<string[]>([]);
  const [splitError, setSplitError] = useState("");

  // UI State
  const [selectedMenuType, setSelectedMenuType] = useState<
    "food" | "drink" | "all"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [draggedItem, setDraggedItem] = useState<Product | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSavedOrders, setShowSavedOrders] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  // const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptOrder | null>(
    null,
  );
  const [insufficientStockItems, setInsufficientStockItems] = useState<
    InsufficientStockItem[]
  >([]);
  const [showInsufficientStockModal, setShowInsufficientStockModal] =
    useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  //ORDER STATES
  const [incomingOrder, setIncomingOrder] = useState<CustomerOrder | null>(
    null,
  );

  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const cartDropZoneRef = useRef<HTMLDivElement>(null);

  // ——— Computed ———
  const isDisabled = isProcessing || isCheckingStock || isPrinting;

  const canProcessPayment = useMemo(() => {
    if (!cart.length) return false;
    if (paymentMethod === "cash") return amountPaid >= total;
    if (paymentMethod === "split")
      return splitPayment.cash + splitPayment.gcash >= total && !splitError;
    return true;
  }, [cart.length, paymentMethod, amountPaid, total, splitPayment, splitError]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          products
            .filter(
              (p) =>
                p.available &&
                (selectedMenuType === "all" || p.menuType === selectedMenuType),
            )
            .map((p) => p.category || "Uncategorized"),
        ),
      ),
    ],
    [products, selectedMenuType],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.available &&
          (selectedMenuType === "all" || p.menuType === selectedMenuType) &&
          (selectedCategory === "All" || p.category === selectedCategory),
      ),
    [products, selectedMenuType, selectedCategory],
  );

  // ——— Effects ———
  useEffect(() => {
    preloadNotificationSounds();
  }, []);

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
    if (paymentMethod === "split" && total > 0)
      setSplitPayment({ cash: total / 2, gcash: total / 2 });
  }, [total, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === "split") {
      const paid = splitPayment.cash + splitPayment.gcash;
      setSplitError(
        Math.abs(paid - total) > 0.01
          ? `Split amounts must equal ${formatCurrency(total)}`
          : "",
      );
    } else {
      setSplitError("");
    }
  }, [splitPayment, total, paymentMethod]);

  useEffect(() => {
    const check = () => {
      if (categoriesContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          categoriesContainerRef.current;
        setShowLeftScroll(scrollLeft > 10);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };
    setTimeout(check, 100);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [categories]);

  // ——— API ———
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products/categories");
      const data: CategoryData[] = await res.json();
      const list: Product[] = [];
      data.forEach((cat) =>
        cat.products?.forEach((p) =>
          list.push({ ...p, category: cat.name, menuType: cat.menuType }),
        ),
      );
      setProducts(list);
    } catch {
      toast.error("Failed to load products");
      playError();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const [criticalRes, lowStockRes] = await Promise.all([
        fetch("/api/products/stocks/alerts/critical"),
        fetch("/api/products/stocks/alerts/low-stock"),
      ]);
      if (criticalRes.ok && lowStockRes.ok) {
        setStockAlerts([
          ...(await criticalRes.json()),
          ...(await lowStockRes.json()),
        ]);
      }
    } catch {
      /* silent */
    }
  };

  const saveOrderToDatabase = async (order: SavedOrder) => {
    try {
      const itemsWithRevenue = order.items.map((item) => {
        const itemTotal = item.price * item.quantity;
        return {
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          hasDiscount: item.hasDiscount || false,
          discountRate: item.hasDiscount ? 0.2 : 0,
          revenue: item.hasDiscount ? itemTotal * (1 - 0.2) : itemTotal,
          category: item.category,
          menuType: item.menuType,
          notes: item.notes,
        };
      });

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          orderId: order.id,
          customerName: order.customerName || "Walk-in Customer",
          items: itemsWithRevenue,
          subtotal: order.subtotal,
          discountTotal: order.discountTotal,
          total: order.total,
          paymentMethod: order.paymentMethod,
          splitPayment: order.splitPayment,
          orderType: order.orderType,
          tableNumber: order.tableNumber,
          orderNote: order.orderNote,
          seniorPwdCount: order.seniorPwdCount || 0,
          seniorPwdIds,
          cashier: "Cashier",
          cashierId: "current-user-id",
          status: "completed",
          amountPaid: order.amountPaid,
          change: order.change,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      });
      if (!response.ok)
        throw new Error(`Failed to save payment: ${response.status}`);
      return await response.json();
    } catch (error) {
      toast.warning("Order saved locally only (database unavailable)", {
        description:
          error instanceof Error ? error.message : "Connection error",
      });
      saveOrderToLocal(order);
      return null;
    }
  };

  // ——— Cart Actions ———
  const clearCart = useCallback(() => {
    clearCartItems();
    setCustomerName("");
    setAmountPaid(0);
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod("cash");
    setSelectedTable("");
    setOrderNote("");
    setSeniorPwdIds([]);
    clearStockCheck();
  }, [clearCartItems, clearStockCheck]);

  const handleApplyDiscount = useCallback(
    (data: { ids: string[]; itemIds: string[] }) => {
      applyDiscount(data);
      setSeniorPwdIds((prev) => [...new Set([...prev, ...data.ids])]);
    },
    [applyDiscount],
  );

  const saveCurrentOrder = useCallback(() => {
    if (!cart.length) {
      toast.error("Cart is empty");
      playError();
      return;

    }
    const order: SavedOrder = {
      id: `save-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerName: customerName || "Walk-in Customer",
      items: [...cart],
      subtotal,
      discountTotal,
      total,
      paymentMethod,
      splitPayment: paymentMethod === "split" ? splitPayment : undefined,
      orderType,
      tableNumber: orderType === "dine-in" ? selectedTable : undefined,
      timestamp: new Date(),
      status: "pending",
      seniorPwdCount,
      orderNote: orderNote || undefined,
      seniorPwdIds,
    };
    saveOrderToLocal(order);
    playSuccess();
    clearCart();
  }, [
    cart,
    customerName,
    subtotal,
    discountTotal,
    total,
    paymentMethod,
    splitPayment,
    orderType,
    selectedTable,
    seniorPwdCount,
    orderNote,
    seniorPwdIds,
    playSuccess,
    playError,
    saveOrderToLocal,
  ]);

  const loadSavedOrder = useCallback(
    (order: SavedOrder) => {
      setCart(order.items);
      setCustomerName(order.customerName);
      setPaymentMethod(order.paymentMethod);
      if (order.splitPayment) setSplitPayment(order.splitPayment);
      if (order.amountPaid) setAmountPaid(order.amountPaid);
      setOrderType(order.orderType);
      setSelectedTable(order.tableNumber || "");
      setOrderNote(order.orderNote || "");
      setSeniorPwdIds(order.seniorPwdIds || []);
      setShowSavedOrders(false);
      playSuccess();
    },
    [playSuccess, setCart],
  );

  const handleReprintReceipt = useCallback(
    (order: SavedOrder) => {
      setCurrentReceipt({
        ...order,
        cashier: "Cashier",
        seniorPwdIds: order.seniorPwdIds || seniorPwdIds,
        isReprint: true,
      });
      setShowReceipt(true);
    },
    [seniorPwdIds],
  );

  // ——— Print ———
  const handlePrintReceipt = useCallback(async () => {
    if (!currentReceipt || !settings) return;

    if (!isConnected) {
      toast.warning("Companion App not connected", {
        description: "Open the Companion App on your phone/tablet to enable printing.",
        duration: 5000,
      });
      return;
    }

    setIsPrinting(true);
    try {
      const receiptInput = {
        orderNumber: currentReceipt.orderNumber,
        customerName: currentReceipt.customerName,
        cashier: staffName,
        timestamp: new Date(currentReceipt.timestamp),
        orderType: currentReceipt.orderType,
        tableNumber: currentReceipt.tableNumber,
        items: currentReceipt.items.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          hasDiscount: item.hasDiscount,
          menuType: item.menuType,
        })),
        subtotal: currentReceipt.subtotal,
        discountTotal: currentReceipt.discountTotal,
        total: currentReceipt.total,
        paymentMethod: currentReceipt.paymentMethod,
        splitPayment:
          currentReceipt.paymentMethod === "split"
            ? currentReceipt.splitPayment
            : undefined,
        amountPaid:
          currentReceipt.paymentMethod === "cash"
            ? currentReceipt.amountPaid
            : undefined,
        change:
          currentReceipt.paymentMethod === "cash"
            ? currentReceipt.change
            : undefined,
        seniorPwdCount: currentReceipt.seniorPwdCount,
        seniorPwdIds: currentReceipt.seniorPwdIds,
        businessName: settings.businessName || "Rendezvous Cafe",
        businessAddress: settings.locationAddress,
        businessPhone: settings.phoneNumber,
        receiptMessage: settings.receiptMessage,
      };

      const result = await printBoth(receiptInput);
      if (result.receipt || result.kitchen) {
        // toast.success("Reprinted successfully via Companion App");
      } else {
        toast.warning("Companion App received request but printers not ready");
      }
    } catch {
      toast.error("Reprint failed");
    } finally {
      setIsPrinting(false);
    }
  }, [currentReceipt, settings, printBoth, isConnected]);

  // ——— Process Payment ———
  const processPayment = async () => {
    if (!cart.length) {
      toast.error("Cart is empty");
      playError();
      return;
    }

    if (paymentMethod === "cash" && amountPaid < total) {
      toast.error(`Need ${formatCurrency(total - amountPaid)} more`);
      playError();
      return;
    }
    if (paymentMethod === "split") {
      const paid = splitPayment.cash + splitPayment.gcash;
      if (paid < total) {
        toast.error(`Need ${formatCurrency(total - paid)} more`);
        playError();
        return;
      }
      if (Math.abs(paid - total) > 0.01) {
        toast.error(`Split amounts must equal ${formatCurrency(total)}`);
        playError();
        return;
      }
    }

    setIsCheckingStock(true);
    try {


      const orderItems = cart.map((i) => ({
        productId: i._id,
        productName: i.name,
        quantity: i.quantity,
        ingredients: i.ingredients || [],
      }));
      const orderNumber = generateOrderNumber();
      const orderId = `order-${Date.now()}`;

      try {
        const stockCheck = await checkOrderStock(orderItems);
        if (!stockCheck.allAvailable) {
          setInsufficientStockItems(
            stockCheck.insufficientItems.map((i) => ({
              ...i,
              shortBy: i.shortBy ?? 0,
            })),
          );
          setShowInsufficientStockModal(true);
          setIsCheckingStock(false);
          playError();
          return;
        }
        await processOrderDeductions(orderId, orderNumber, orderItems);
      } catch {
        /* continue on stock check failure */
      }

      const completedOrder = buildOrder({
        cart,
        customerName,
        subtotal,
        discountTotal,
        total,
        paymentMethod,
        splitPayment,
        amountPaid,
        orderType,
        selectedTable,
        orderNote,
        seniorPwdCount,
        seniorPwdIds,
      });

      await saveOrderToDatabase(completedOrder);
      saveOrderToLocal(completedOrder);

      if ((settings?.printReceipt || settings?.kitchenPrinter?.enabled) && isConnected) {
        const receiptInput = {
          orderNumber,
          customerName: customerName || "Walk-in Customer",
          cashier: staffName,
          timestamp: new Date(),
          orderType,
          tableNumber: selectedTable || undefined,
          orderNote: orderNote || undefined,
          items: cart.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            hasDiscount: item.hasDiscount,
            menuType: item.menuType,
          })),
          subtotal,
          discountTotal,
          total,
          paymentMethod,
          splitPayment: paymentMethod === "split" ? splitPayment : undefined,
          amountPaid: paymentMethod === "cash" ? amountPaid : undefined,
          change: paymentMethod === "cash" ? amountPaid - total : undefined,
          seniorPwdCount,
          seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
          businessName: settings.businessName || "Rendezvous Cafe",
          businessAddress: settings.locationAddress,
          businessPhone: settings.phoneNumber,
          receiptMessage: settings.receiptMessage,
        };

        setIsPrinting(true);
        try {
          const results = await printBoth(receiptInput); // from useSocket
          if (results.receipt) { /* toast.success("Receipt printed"); */ }
          if (results.kitchen) { /* toast.success("Kitchen order printed"); */ }
          if (!results.receipt && !results.kitchen) {
            toast.warning(
              "Printers not connected — use browser fallback in printer settings",
            );
          }
        } catch {
          /* silent */
        } finally {
          setIsPrinting(false);
        }
      }

      setCurrentReceipt({
        ...completedOrder,
        cashier: "Cashier",
        seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
      });
      setShowReceipt(true);
      clearCart();
      toast.success("Payment successful!");
      playSuccess();
    } catch (error: unknown) {
      if (error && typeof error === "object" && "insufficientItems" in error) {
        const err = error as { insufficientItems: InsufficientStockItem[] };
        setInsufficientStockItems(err.insufficientItems);
        setShowInsufficientStockModal(true);
      } else {
        toast.error("Payment failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
      playError();
    } finally {
      setIsCheckingStock(false);
    }
  };

  // ——— Drag & Drop ———
  const handleDragStart = useCallback(
    (e: React.DragEvent, product: Product) => {
      setDraggedItem(product);
      e.dataTransfer.effectAllowed = "copy";
      const preview = document.createElement("div");
      preview.style.cssText =
        "position:absolute;top:-1000px;padding:12px;background:white;border:2px solid blue;border-radius:8px;width:160px";
      preview.innerHTML = `<div style="font-weight:bold">${product.name}</div><div style="font-size:12px">${formatCurrency(product.price)}</div>`;
      document.body.appendChild(preview);
      e.dataTransfer.setDragImage(preview, 80, 40);
      setTimeout(() => document.body.removeChild(preview), 0);
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.add(
      "bg-primary/5",
      "border-2",
      "border-primary",
      "border-dashed",
    );
  }, []);

  const handleDragLeave = useCallback(() => {
    cartDropZoneRef.current?.classList.remove(
      "bg-primary/5",
      "border-2",
      "border-primary",
      "border-dashed",
    );
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      cartDropZoneRef.current?.classList.remove(
        "bg-primary/5",
        "border-2",
        "border-primary",
        "border-dashed",
      );
      if (draggedItem) {
        addToCart(draggedItem);
        setDraggedItem(null);
      }
    },
    [draggedItem, addToCart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, product: Product) => {
      e.preventDefault();
      setDraggedItem(product);
      const preview = document.createElement("div");
      preview.className =
        "fixed z-50 w-[160px] bg-card border-2 border-primary shadow-lg rounded-lg p-3";
      preview.style.cssText = `left:${e.touches[0].clientX - 80}px;top:${e.touches[0].clientY - 60}px;pointer-events:none;position:fixed`;
      preview.innerHTML = `<div class="font-bold text-sm">${product.name}</div><div class="text-xs text-p  rimary">${formatCurrency(product.price)}</div>`;
      document.body.appendChild(preview);
      setTouchPreview(preview);
      window.navigator.vibrate?.(20);
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchPreview) {
        touchPreview.style.left = `${e.touches[0].clientX - 80}px`;
        touchPreview.style.top = `${e.touches[0].clientY - 60}px`;
      }
      const el = document.elementFromPoint(
        e.touches[0].clientX,
        e.touches[0].clientY,
      );
      cartDropZoneRef.current?.classList.toggle(
        "bg-primary/5",
        !!cartDropZoneRef.current?.contains(el),
      );
    },
    [touchPreview],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      touchPreview?.remove();
      setTouchPreview(null);
      const el = document.elementFromPoint(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY,
      );
      if (cartDropZoneRef.current?.contains(el) && draggedItem) {
        addToCart(draggedItem);
        window.navigator.vibrate?.([20, 20, 20]);
      }
      cartDropZoneRef.current?.classList.remove(
        "bg-primary/5",
        "border-2",
        "border-primary",
        "border-dashed",
      );
      setDraggedItem(null);
    },
    [touchPreview, draggedItem, addToCart],
  );

  const scrollCategories = (dir: "left" | "right") =>
    categoriesContainerRef.current?.scrollBy({
      left: dir === "left" ? -250 : 250,
      behavior: "smooth",
    });

  const handleCategoryMouseDown = useCallback((e: React.MouseEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDraggingCategory(true);
    setStartX(e.pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);

  const handleCategoryMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingCategory || !categoriesContainerRef.current) return;
      e.preventDefault();
      categoriesContainerRef.current.scrollLeft =
        scrollLeft -
        (e.pageX - categoriesContainerRef.current.offsetLeft - startX) * 2.5;
    },
    [isDraggingCategory, startX, scrollLeft],
  );

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
              onClick={() => {
                clockIn();
                playSuccess();
              }}
              disabled={attendanceLoading}
              size="lg"
              className="w-full sm:w-auto h-12 text-base px-8"
            >
              {attendanceLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Start Shift (Clock In)"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AttendanceBar
        attendance={attendance}
        attendanceLoading={attendanceLoading}
        clockOut={clockOut}
        playSuccess={playSuccess}
        settings={settings}
        savedOrders={savedOrders}
        stockAlerts={stockAlerts}
        setShowOrderHistory={setShowOrderHistory}
        setShowSavedOrders={setShowSavedOrders}
        setShowStockAlertsModal={setShowStockAlertsModal}
        onRefreshStock={fetchStockAlerts}
        currentReceipt={currentReceipt}
        onReprintReceipt={handleReprintReceipt}
        onPreviewReceipt={(type) =>
          currentReceipt &&
          previewReceipt(
            currentReceipt as unknown as PrinterReceiptData,
            settings!,
            type,
          )
        }
      />

      <>
        <div className="max-w-[1600px] mx-auto">
          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-5 pb-10">
            {/* Left — Products */}
            <div className="lg:w-[62%] flex flex-col">
              {/* Menu Type Filter */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {(["all", "food", "drink"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={selectedMenuType === type ? "default" : "outline"}
                    onClick={() => {
                      setSelectedMenuType(type);
                      setSelectedCategory("All");
                    }}
                    className="h-11 text-base"
                  >
                    {type === "food" && <Utensils className="w-4 h-4 mr-2" />}
                    {type === "drink" && <Coffee className="w-4 h-4 mr-2" />}
                    {type === "all" ? "All" : type}
                  </Button>
                ))}
              </div>

              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                showLeftScroll={showLeftScroll}
                showRightScroll={showRightScroll}
                onScroll={scrollCategories}
                containerRef={categoriesContainerRef}
                isDragging={isDraggingCategory}
                onMouseDown={handleCategoryMouseDown}
                onMouseMove={handleCategoryMouseMove}
                onMouseUp={() => setIsDraggingCategory(false)}
                onMouseLeave={() => setIsDraggingCategory(false)}
              />

              {/* Products Grid */}
              <div className="pr-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin mr-3" />
                    Loading...
                  </div>
                ) : !filteredProducts.length ? (
                  <div className="text-center py-10 text-muted-foreground text-base">
                    No products found
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        isDragged={draggedItem?._id === product._id}
                        onAddToCart={addToCart}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggedItem(null)}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right — Cart */}
            <div className="lg:w-[38%]">
              <div
                ref={cartDropZoneRef}
                className="flex-1 transition-all"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Card className="flex flex-col border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShoppingCart className="w-5 h-5" />
                        Current Order ({cart.length})
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="default"
                          onClick={() => setShowDiscountModal(true)}
                          disabled={!cart.length || isDisabled}
                          className="h-9 text-sm px-3"
                        >
                          <Percent className="w-4 h-4 mr-2" />
                          Discount
                        </Button>
                        <Button
                          variant="outline"
                          size="default"
                          onClick={saveCurrentOrder}
                          disabled={!cart.length || isDisabled}
                          className="h-9 w-9 p-0"
                          title="Save Order"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="default"
                          onClick={clearCart}
                          disabled={!cart.length || isDisabled}
                          className="h-9 w-9 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {!cart.length && (
                      <div className="mt-2 p-3 border border-dashed rounded text-center bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          ↓ Drop products here ↓
                        </p>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-6 p-6 pt-0">
                    {/* Senior/PWD Banner */}
                    {seniorPwdCount > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-700 mb-2">
                          Senior/PWD Discount Applied:
                        </p>
                        <p className="text-xs text-green-600">
                          {seniorPwdCount} item(s) with 20% discount
                        </p>
                      </div>
                    )}

                    {/* Order Type */}
                    <div>
                      <Label className="text-sm">Order Type</Label>
                      <div className="flex gap-2 mt-2">
                        {(["dine-in", "takeaway"] as const).map((type) => (
                          <Button
                            key={type}
                            variant={orderType === type ? "default" : "outline"}
                            onClick={() => setOrderType(type)}
                            className="flex-1 h-9 text-sm"
                            disabled={isDisabled}
                          >
                            {type === "dine-in" ? "Dine In" : "Take Away"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Cart Items */}
                    <div>
                      <Label className="text-sm font-semibold">Items</Label>
                      <div className="space-y-3 mt-3">
                        {cart.map((item) => (
                          <CartItem
                            key={item._id}
                            item={item}
                            isDisabled={isDisabled}
                            onUpdateQuantity={updateQuantity}
                            onRemoveDiscount={removeDiscount}
                            onRemoveFromCart={removeFromCart}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discountTotal > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(discountTotal)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-primary">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {/* Payment Method */}
                    <div>
                      <Label className="text-sm">Payment</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {(["cash", "gcash", "split"] as const).map((method) => (
                          <Button
                            key={method}
                            variant={
                              paymentMethod === method ? "default" : "outline"
                            }
                            onClick={() => setPaymentMethod(method)}
                            className="h-9 text-sm"
                            disabled={isDisabled}
                          >
                            {method === "cash" && (
                              <DollarSign className="w-4 h-4 mr-2" />
                            )}
                            {method === "gcash" && (
                              <Smartphone className="w-4 h-4 mr-2" />
                            )}
                            {method === "split" && (
                              <Receipt className="w-4 h-4 mr-2" />
                            )}
                            {method === "cash"
                              ? "Cash"
                              : method === "gcash"
                                ? "GCash"
                                : "Split"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {paymentMethod === "cash" && (
                      <CashPaymentInput
                        total={total}
                        amountPaid={amountPaid}
                        setAmountPaid={setAmountPaid}
                        disabled={isDisabled}
                      />
                    )}
                    {paymentMethod === "split" && (
                      <SplitPaymentInput
                        total={total}
                        splitPayment={splitPayment}
                        setSplitPayment={setSplitPayment}
                        disabled={isDisabled}
                      />
                    )}
                    {paymentMethod === "gcash" && (
                      <div className="bg-muted border rounded-lg p-3">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          GCash payment of {formatCurrency(total)} will be
                          processed.
                        </p>
                      </div>
                    )}

                    {/* Customer Info */}
                    <Input
                      placeholder="Customer name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-10 text-sm"
                      disabled={isDisabled}
                    />
                    <Input
                      placeholder="Order notes"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      className="h-10 text-sm"
                      disabled={isDisabled}
                    />
                    {orderType === "dine-in" && (
                      <Input
                        placeholder="Table number"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="h-10 text-sm"
                        disabled={isDisabled}
                      />
                    )}

                    {/* Pay Button */}
                    <Button
                      onClick={processPayment}
                      disabled={
                        !cart.length ||
                        isDisabled ||
                        settingsLoading ||
                        !canProcessPayment
                      }
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                      variant={canProcessPayment ? "default" : "secondary"}
                    >
                      {isProcessing || isCheckingStock ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                          {isCheckingStock
                            ? "Checking Stock..."
                            : "Processing..."}
                        </>
                      ) : isPrinting ? (
                        <>
                          <Printer className="w-5 h-5 mr-3 animate-pulse" />
                          Printing...
                        </>
                      ) : (
                        <>
                          <Receipt className="w-5 h-5 mr-3" />
                          {paymentMethod === "cash" && amountPaid >= total
                            ? `Pay & Change: ₱${(amountPaid - total).toFixed(2)}`
                            : paymentMethod === "split" &&
                              splitPayment.cash + splitPayment.gcash >= total
                              ? "Pay (Split)"
                              : `Pay ${formatCurrency(total)}`}
                        </>
                      )}
                    </Button>

                    {/* Underpayment hints */}
                    {paymentMethod === "cash" &&
                      amountPaid > 0 &&
                      amountPaid < total && (
                        <p className="text-xs text-red-500 text-center">
                          Need {formatCurrency(total - amountPaid)} more
                        </p>
                      )}
                    {paymentMethod === "split" &&
                      splitPayment.cash + splitPayment.gcash > 0 &&
                      splitPayment.cash + splitPayment.gcash < total && (
                        <p className="text-xs text-red-500 text-center">
                          Need{" "}
                          {formatCurrency(
                            total - (splitPayment.cash + splitPayment.gcash),
                          )}{" "}
                          more
                        </p>
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
            setCurrentReceipt({
              ...order,
              cashier: order.cashier || "Cashier",
              seniorPwdIds: order.seniorPwdIds,
            });
            setShowReceipt(true);
          }}
        />

        {
          showReceipt && settings && (
            <ReceiptModal
              receipt={currentReceipt}
              settings={settings}
              onClose={() => setShowReceipt(false)}
              onPrint={handlePrintReceipt}
            />
          )
        }

        <InsufficientStockModal
          items={insufficientStockItems}
          onClose={() => {
            setShowInsufficientStockModal(false);
            setInsufficientStockItems([]);
          }}
          onRemoveUnavailable={() => {
            const names = new Set(insufficientStockItems.map((i) => i.name));
            setCart((prev) =>
              prev.filter(
                (item) => !item.ingredients?.some((ing) => names.has(ing.name)),
              ),
            );
            setShowInsufficientStockModal(false);
            setInsufficientStockItems([]);
            toast.info("Removed unavailable items");
          }}
        />

        <StockAlertsModal
          isOpen={showStockAlertsModal}
          onClose={setShowStockAlertsModal}
          stockAlerts={stockAlerts}
          onRefresh={fetchStockAlerts}
        />

        <IncomingOrderModal
          order={incomingOrder}
          onClose={() => setIncomingOrder(null)}
          formatCurrency={formatCurrency}
          onAccept={(order) => {
            order.items.forEach((item) => {
              for (let i = 0; i < item.quantity; i++) {
                addToCart({
                  ...item,
                  available: true,
                  ingredients: item.ingredients ?? [],
                });
              }
            });
            if (order.customerName) setCustomerName(order.customerName);
            if (order.orderNote) setOrderNote(order.orderNote);
            if (order.orderType) setOrderType(order.orderType);
            if (order.tableNumber) setSelectedTable(order.tableNumber);
            setIncomingOrder(null);
            toast.success("Order loaded into cart");
            playSuccess();
          }}
        />
      </>
    </div>
  );
}
