"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
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
  Search,
  Trash2,
  DollarSign,
  Smartphone,
  Receipt,
  Loader2,
  Utensils,
  Coffee,
  Save,
  Printer,
  Percent,
  Wallet,
  CheckCircle,
  AlertCircle,
  Lock,
  PowerOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/confirm-dialog";

// UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogBody,
  DialogContent,
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
import { SavedOrdersPanel } from "./_components/Savedorderspanel";
import { CategoryFilter } from "./_components/CategoryFilter";
import { QueueBoard } from "./_components/QueueBoard";
import { AddonSelectionModal } from "./_components/AddonSelectionModal";

import { AttendanceBar } from "./_components/AttendanceBar";
import { ProductCard } from "./_components/ProductCard";
import { CartItem } from "./_components/CartItem";
import { StaffPinClockIn } from "./_components/StaffPinClockIn";
import { useCart, useSavedOrders, buildOrder } from "./_components/usePOS";
import {
  Product,
  CategoryData,
  SavedOrder,
  InsufficientStockItem,
  ReceiptOrder,
  SelectedAddon,
} from "./_components/pos.types";
import {
  formatCurrency,
  generateOrderNumber,
} from "./_components/pos.utils";

import { useSocket } from "@/provider/socket-provider";
import { CustomerOrder } from "@/types/order.type";

// ============ Main Component ===========
export default function OrdersPage() {
  const {
    emitPosJoin,
    onQueueUpdated,
    offQueueUpdated,
    printBoth,
    printKitchenOrder,
    isConnected,
    onShopStatusChanged,
    offShopStatusChanged,
  } = useSocket();

  const { data: session } = useSession();
  const staffName = session?.user?.name || "Staff";

  const {
    isClockedIn,
    isLoading: attendanceLoading,
    attendance,
    clockIn,
    clockOut,
    refreshStatus,
  } = useAttendance();

  const { playSuccess, playError, playOrder } = useNotificationSound();
  const { settings, isLoading: settingsLoading } = useReceiptSettings();

  const queryClient = useQueryClient();
  const [showStockAlertsModal, setShowStockAlertsModal] = useState(false);

  // ——— Queries ———
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", "categories"],
    queryFn: async () => {
      const res = await fetch("/api/products/categories");
      if (!res.ok) throw new Error("Failed to load products");
      const data: CategoryData[] = await res.json();
      const list: Product[] = [];
      data.forEach((cat) =>
        cat.products?.forEach((p: any) =>
          list.push({ ...p, category: cat.name, menuType: cat.menuType }),
        ),
      );
      return list;
    },
  });

  const { data: stockAlerts = [], refetch: refetchStockAlerts } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: async () => {
      const [criticalRes, lowStockRes] = await Promise.all([
        fetch("/api/products/stocks/alerts/critical"),
        fetch("/api/products/stocks/alerts/low-stock"),
      ]);
      if (criticalRes.ok && lowStockRes.ok) {
        return [
          ...(await criticalRes.json()),
          ...(await lowStockRes.json()),
        ];
      }
      return [];
    },
    refetchInterval: 60000,
  });

  const { data: sessionStatus, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/session");
      const result = await res.json();
      return result.success ? result.data : null;
    },
  });

  const { data: shopStatus, isLoading: shopStatusLoading } = useQuery({
    queryKey: ["shop-status"],
    queryFn: async () => {
      const res = await fetch("/api/shop-status");
      const data = await res.json();
      return data.isOpen !== false;
    },
  });

  // ——— State ———
  const [startingFundInput, setStartingFundInput] = useState("");
  const [startingFundError, setStartingFundError] = useState("");

  const isRegisterClosed = shopStatus === false && !sessionStatus;
  const needsOpenRegister = isClockedIn && shopStatus !== false && !sessionStatus;
  // Register is open but opened by someone else
  const registerOpenedByOther = !!sessionStatus && sessionStatus.cashierName !== staffName;

  // ——— Mutations ———
  const openRegisterMutation = useMutation({
    mutationFn: async (amount: number) => {
      const name = session?.user?.name;
      if (!name) throw new Error("Session not loaded");

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingFund: amount, cashierName: name }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to open register");

      // Only open the shop after the session is confirmed created
      await fetch("/api/shop-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true, updatedBy: "staff" }),
      });

      return result;
    },
    onSuccess: (result, amount) => {
      toast.success(`Register opened with ₱${amount.toFixed(2)} starting fund`);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["shop-status"] });
      setStartingFundInput("");
      setStartingFundError("");
    },
    onError: (error: Error) => {
      if (error.message === "Register already open") {
        toast.info("Register is already open. Refreshing...");
        queryClient.invalidateQueries({ queryKey: ["session"] });
        queryClient.invalidateQueries({ queryKey: ["shop-status"] });
      } else {
        toast.error("Failed to open register");
      }
    },
  });

  const updateQueueStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await fetch("/api/orders/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, queueStatus: status }),
      });
      if (!res.ok) throw new Error("Failed to update queue");
      return res.json();
    },
  });

  const handleClockInSuccess = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["session"] });
    queryClient.invalidateQueries({ queryKey: ["shop-status"] });
    await refreshStatus();
  }, [queryClient, refreshStatus]);

  const handleConfirmStartingFund = () => {
    const amount = parseFloat(startingFundInput);
    if (isNaN(amount) || amount < 0) {
      setStartingFundError("Please enter a valid amount (0 or more)");
      return;
    }
    openRegisterMutation.mutate(amount);
  };


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

  // Dialog States
  const [confirmClearCartOpen, setConfirmClearCartOpen] = useState(false);
  const [confirmDeleteSavedOrder, setConfirmDeleteSavedOrder] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pos" | "queue">("pos");
  const [unreadQueueCount, setUnreadQueueCount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptOrder | null>(
    null,
  );
  const [insufficientStockItems, setInsufficientStockItems] = useState<
    InsufficientStockItem[]
  >([]);
  const [showInsufficientStockModal, setShowInsufficientStockModal] =
    useState(false);

  const [isPrinting, setIsPrinting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);

  // Addon Selection Modal state
  const [addonModalProduct, setAddonModalProduct] = useState<Product | null>(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);

  const handleOpenAddons = useCallback((product: Product) => {
    setAddonModalProduct(product);
    setAddonModalOpen(true);
  }, []);

  const handleAddonConfirm = useCallback(
    (product: Product, selectedAddons: SelectedAddon[], quantity: number) => {
      addToCart(product, selectedAddons, quantity);
    },
    [addToCart],
  );
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  //ORDER STATES
  const [activeCustomerOrderId, setActiveCustomerOrderId] = useState<
    string | null
  >(null);


  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const cartDropZoneRef = useRef<HTMLDivElement>(null);
  const productsContainerRef = useRef<HTMLDivElement>(null);

  // ——— Computed ———
  const isDisabled = isPrinting || attendanceLoading || isPaying;

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
          (selectedCategory === "All" || p.category === selectedCategory) &&
          (!searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [products, selectedMenuType, selectedCategory, searchQuery],
  );

  // ——— Effects ———
  useEffect(() => {
    preloadNotificationSounds();
  }, []);

  // Track recently notified orders
  const notifiedOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isConnected) return;
    emitPosJoin();

    const handleQueueUpdate = (data: {
      orderId: string;
      queueStatus: string;
      order: CustomerOrder;
    }) => {
      if (data.queueStatus === "queueing") {
        if (notifiedOrdersRef.current.has(data.orderId)) return;
        notifiedOrdersRef.current.add(data.orderId);

        if (activeTab !== "queue") {
          setUnreadQueueCount((prev) => prev + 1);
        }
        playOrder();
        toast.info(
          `New portal order from ${data.order?.customerName || "Customer"}!`,
          {
            description: `${data.order?.items?.length || 0} item(s) · ${formatCurrency(data.order?.total || 0)} · Check Queue Board`,
            duration: 6000,
          },
        );
      }
    };

    onQueueUpdated(handleQueueUpdate);
    return () => offQueueUpdated(handleQueueUpdate);
  }, [isConnected, activeTab, onQueueUpdated, offQueueUpdated, playOrder, emitPosJoin]);

  // Whenever the user is clocked in, verify a cash session is open.
  // NOTE: We intentionally do NOT force-close the shop here.
  // The needsOpenRegister guard already shows the "Open Register" screen.
  // Forcing isOpen=false here caused a race condition: sessionStatus is null
  // while the query is still loading, which incorrectly closed the shop for
  // all customers even when a register was already open.
  useEffect(() => {
    if (!isClockedIn) return;
    // Just re-validate queries so the UI reflects the latest state
    if (needsOpenRegister) {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["shop-status"] });
    }
  }, [isClockedIn, needsOpenRegister, queryClient]);

  // Real-time: listen for shop status changes
  useEffect(() => {
    const handleShopStatus = ({ isOpen }: { isOpen: boolean }) => {
      if (!isOpen) {
        queryClient.invalidateQueries({ queryKey: ["shop-status"] });
        toast.warning("Register has been closed.", {
          description: "Please open the register to continue taking orders.",
          duration: 6000,
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["shop-status"] });
      }
    };
    onShopStatusChanged(handleShopStatus);
    return () => offShopStatusChanged(handleShopStatus);
  }, [onShopStatusChanged, offShopStatusChanged, queryClient]);

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


  const saveOrderMutation = useMutation({
    mutationFn: async (order: SavedOrder) => {
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
          cashier: staffName,
          cashierId: session?.user?.id || "unknown",
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
    },
    onError: (error, order) => {
      toast.warning("Order saved locally only (database unavailable)", {
        description: error instanceof Error ? error.message : "Connection error",
      });
      saveOrderToLocal(order);
    },
  });

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
    setActiveCustomerOrderId(null);
  }, [clearCartItems]);

  const handleClearCartClick = () => {
    if (cart.length > 0) {
      setConfirmClearCartOpen(true);
    }
  };

  const handleUpdateQuantity = useCallback(
    (id: string, delta: number) => {
      updateQuantity(id, delta);
    },
    [updateQuantity],
  );

  const handleRemoveFromCart = useCallback(
    (id: string) => {
      removeFromCart(id);
    },
    [removeFromCart],
  );

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
    clearCart,
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

  const handlePrintKitchenSlip = async (order: CustomerOrder) => {
    if (!settings?.kitchenPrinter?.enabled || !isConnected) {
      toast.warning("Kitchen printer not configured or connected.");
      return;
    }
    const receiptInput = {
      orderNumber: order.orderNumber || order.orderId.slice(-6).toUpperCase(),
      customerName: order.customerName || "Walk-in Customer",
      cashier: staffName,
      timestamp: new Date(order.timestamp),
      orderType: order.orderType || "dine-in",
      tableNumber: order.tableNumber || undefined,
      orderNote: order.orderNote || undefined,
      sourceOrderId: order.orderId,
      items: order.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        hasDiscount: false,
        menuType: item.menuType,
      })),
      subtotal: order.subtotal,
      discountTotal: 0,
      total: order.total,
      paymentMethod: "cash" as const,
      seniorPwdCount: 0,
      businessName: settings.businessName || "Rendezvous Cafe",
      businessAddress: settings.locationAddress,
      businessPhone: settings.phoneNumber,
      receiptMessage: settings.receiptMessage,
    };

    try {
      setIsPrinting(true);
      await printKitchenOrder(receiptInput);
      toast.success("Kitchen slip printed");
    } catch (e) {
      toast.error("Failed to print kitchen slip");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleReprintReceipt = useCallback(
    (order: SavedOrder) => {
      setCurrentReceipt({
        ...order,
        cashier: order.cashier || staffName,
        seniorPwdIds: order.seniorPwdIds || seniorPwdIds,
        isReprint: true,
      });
      setShowSavedOrders(false);
      setShowOrderHistory(false);
      setShowReceipt(true);
    },
    [staffName, seniorPwdIds],
  );

  // ——— Print ———
  const handlePrintReceipt = useCallback(async () => {
    if (!currentReceipt || !settings) return;

    if (!isConnected) {
      toast.warning("Companion App not connected", {
        description:
          "Open the Companion App on your phone/tablet to enable printing.",
        duration: 5000,
      });
      return;
    }

    setIsPrinting(true);
    try {
      const receiptInput = {
        orderNumber: currentReceipt.orderNumber,
        customerName: currentReceipt.customerName,
        cashier: currentReceipt.cashier || staffName,
        timestamp: new Date(currentReceipt.timestamp),
        orderType: currentReceipt.orderType,
        tableNumber: currentReceipt.tableNumber,
        orderNote: currentReceipt.orderNote,
        isReprint: currentReceipt.isReprint,
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
        businessLogo: settings.showLogo ? (settings.logo || settings.logoPreview || undefined) : undefined,
        receiptMessage: settings.receiptMessage,
      };

      const result = await printBoth(receiptInput);
      if (!result.receipt && !result.kitchen) {
        toast.warning("Companion App received request but printers not ready");
      }
    } catch {
      toast.error("Printing failed");
    } finally {
      setIsPrinting(false);
    }
  }, [currentReceipt, settings, printBoth, isConnected, staffName]);

  // ——— Process Payment ———
  const processPayment = async () => {
    if (isPaying) return;

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


    try {
      setIsPaying(true);

      const orderNumber = generateOrderNumber();
      const orderId = `order-${Date.now()}`;

      const completedOrder = buildOrder({
        cart,
        customerName: customerName || "Walk-in Customer",
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
        cashier: staffName,
        cashierId: session?.user?.id || "unknown",
      });

      await saveOrderMutation.mutateAsync(completedOrder);
      saveOrderToLocal(completedOrder);

      // Separate cookable items for kitchen printing
      const cookableItems = cart.filter(item => item.isCookable);
      const hasKitchenItems = cookableItems.length > 0;

      if (
        (settings?.printReceipt || settings?.kitchenPrinter?.enabled) &&
        isConnected
      ) {
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
            isCookable: item.isCookable,
          })),
          subtotal,
          discountTotal,
          total,
          paymentMethod,
          splitPayment: paymentMethod === "split" ? splitPayment : undefined,
          amountPaid: paymentMethod === "cash" ? amountPaid : undefined,
          change: paymentMethod === "cash" ? (amountPaid - total) : undefined,
          seniorPwdCount,
          seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
          businessName: settings.businessName || "Rendezvous Cafe",
          businessAddress: settings.locationAddress,
          businessPhone: settings.phoneNumber,
          businessLogo: settings.showLogo ? (settings.logo || settings.logoPreview || undefined) : undefined,
          receiptMessage: settings.receiptMessage,
        };

        setIsPrinting(true);
        try {
          // If there are cookable items, print kitchen slip
          if (hasKitchenItems && settings?.kitchenPrinter?.enabled) {
            const kitchenInput = {
              ...receiptInput,
              items: cookableItems.map((item) => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                hasDiscount: item.hasDiscount,
                menuType: item.menuType,
              })),
            };
            await printKitchenOrder(kitchenInput);
          }
          
          // Always print receipt if enabled
          if (settings?.printReceipt) {
            await printBoth(receiptInput);
          }
        } catch {
          /* silent */
        } finally {
          setIsPrinting(false);
        }
      }

      if (activeCustomerOrderId) {
        updateQueueStatusMutation.mutate({
          orderId: activeCustomerOrderId,
          status: "paid",
        });
      }

      clearCart();
      toast.success("Payment successful!");
      playSuccess();
    } catch (error: unknown) {
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      playError();
    } finally {
      setIsPaying(false);
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
      preview.innerHTML = `<div style="font-weight:bold text-black">${product.name}</div><div style="font-size:12px text-black">${formatCurrency(product.price)}</div>`;
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
      preview.innerHTML = `<div class="font-bold text-sm text-black">${product.name}</div><div class="text-xs text-primary">${formatCurrency(product.price)}</div>`;
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
  const isActuallyLoading =
    attendanceLoading ||
    productsLoading ||
    settingsLoading ||
    sessionLoading ||
    shopStatusLoading;

  if (isActuallyLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="container max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-56 bg-muted rounded" />
            <div className="h-72 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Not clocked in — show PIN screen
  if (!isClockedIn) {
    return (
      <StaffPinClockIn
        staffId={session?.user?.id || ""}
        staffName={staffName}
        onSuccess={handleClockInSuccess}
        playSuccess={playSuccess}
        playError={playError}
      />
    );
  }

  // Clocked in but register was closed — show Register Closed screen
  if (isRegisterClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-destructive text-destructive-foreground px-8 py-7 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Register Closed</h2>
              <p className="text-sm mt-1 opacity-70">The register has been closed for this session</p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                To start taking orders again, you need to open a new register session with a starting fund.
              </p>

              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PowerOff className="h-3.5 w-3.5 text-destructive" />
                  <span>Register was closed by staff</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Starting Fund
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xl select-none">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    autoFocus
                    value={startingFundInput}
                    onChange={(e) => { setStartingFundInput(e.target.value); setStartingFundError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirmStartingFund()}
                    className={`w-full pl-10 pr-4 py-3.5 text-2xl font-bold border-2 rounded-xl bg-background text-foreground focus:outline-none transition-colors ${startingFundError ? "border-destructive" : "border-input focus:border-primary"
                      }`}
                  />
                </div>
                {startingFundError && (
                  <p className="mt-2 text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {startingFundError}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2.5">
                Cash already in the drawer before any sales. Enter ₱0 if starting empty.
              </p>

              <button
                onClick={handleConfirmStartingFund}
                disabled={openRegisterMutation.isPending || !session?.user?.name}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                {openRegisterMutation.isPending ? "Opening..." : "Open Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Register is open but by another cashier — this staff can still take orders
  // (they share the same register session), so just fall through to the POS.
  // But if they somehow land here before sessionStatus loads, show nothing extra.

  // Clocked in but no cash session open — must open register before taking orders
  if (needsOpenRegister) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary text-primary-foreground px-8 py-7 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
                <Wallet className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Open Register</h2>
              <p className="text-sm mt-1 opacity-70">Enter starting cash to begin shift</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Starting Fund
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xl select-none">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    autoFocus
                    value={startingFundInput}
                    onChange={(e) => { setStartingFundInput(e.target.value); setStartingFundError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirmStartingFund()}
                    className={`w-full pl-10 pr-4 py-3.5 text-2xl font-bold border-2 rounded-xl bg-background text-foreground focus:outline-none transition-colors ${startingFundError ? "border-destructive" : "border-input focus:border-primary"
                      }`}
                  />
                </div>
                {startingFundError && (
                  <p className="mt-2 text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {startingFundError}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2.5">
                Cash already in the drawer before any sales. Enter ₱0 if starting empty.
              </p>

              <button
                onClick={handleConfirmStartingFund}
                disabled={openRegisterMutation.isPending || !session?.user?.name}
                className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                {openRegisterMutation.isPending ? "Opening..." : "Open Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background overflow-x-hidden ">
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
        onRefreshStock={() => refetchStockAlerts()}
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
        showSearch={showSearch}
        onToggleSearch={() => { setShowSearch((v) => !v); setSearchQuery(""); }}
      />

      {/* Active register banner — visible to all staff */}
      {sessionStatus && registerOpenedByOther && (
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 mt-3">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm">
            <Wallet className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground">
              Register opened by <span className="font-semibold text-primary">{sessionStatus.cashierName}</span>
              {sessionStatus.openedAt && (
                <span className="text-muted-foreground ml-1">
                  at {new Date(sessionStatus.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <>
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "pos" | "queue");
            if (val === "queue") setUnreadQueueCount(0);
          }}
          className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 md:mt-2 mb-4 md:mb-6 gap-4">
            <h1 className="text-2xl font-bold">Orders</h1>
            <TabsList className="w-full md:w-auto grid grid-cols-2 h-11 md:h-10">
              <TabsTrigger value="pos" className="text-xs md:text-sm">
                Point of Sale
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-xs md:text-sm">
                Queue Board
                {unreadQueueCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadQueueCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pos" className="m-0 w-full overflow-hidden">
            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-5 w-full overflow-hidden">
              {/* Left — Products */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
                {/* Search Bar */}
                {showSearch && (
                  <div className="relative w-full mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      autoFocus
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 h-12 text-base rounded-xl w-full"
                    />
                  </div>
                )}

                {/* Menu Type Filter */}
                <div className="grid grid-cols-3 gap-1.5 xs:gap-2 md:gap-3 mb-4 md:mb-5">
                  {(["all", "food", "drink"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={
                        selectedMenuType === type ? "default" : "outline"
                      }
                      onClick={() => {
                        setSelectedMenuType(type);
                        setSelectedCategory("All");
                      }}
                      className="h-9 md:h-10 lg:h-11 text-[10px] xs:text-xs md:text-sm lg:text-base capitalize px-1 md:px-2 lg:px-4"
                    >
                      {type === "food" && (
                        <Utensils className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      )}
                      {type === "drink" && (
                        <Coffee className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                      )}
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

                {/* Products Grid - Scrollable Area */}
                <div
                  ref={productsContainerRef}
                  className="overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 flex-1"
                  style={{ minHeight: "400px", maxHeight: "696px" }}
                >
                  {productsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin mr-3" />
                      Loading products...
                    </div>
                  ) : !filteredProducts.length ? (
                    <div className="text-center py-10 text-muted-foreground text-base">
                      No products found
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          onAddToCart={addToCart}
                          onOpenAddons={handleOpenAddons}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right — Cart */}
              <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 min-w-0 max-h-[500px] lg:max-h-none overflow-y-auto">
                <div
                  ref={cartDropZoneRef}
                  className="transition-all"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Card className="flex flex-col border shadow-sm">
                    <CardHeader className="p-4 md:p-6 pb-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                          <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                          Current Order ({cart.length})
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDiscountModal(true)}
                            disabled={!cart.length || isDisabled}
                            className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-3 flex-1 sm:flex-none"
                          >
                            <Percent className="w-3.5 h-3.5 mr-1.5 md:mr-2" />
                            Discount
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={saveCurrentOrder}
                            disabled={!cart.length || isDisabled}
                            className="h-8 w-8 md:h-9 md:w-9 p-0"
                            title="Save Order"
                          >
                            <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearCartClick}
                            disabled={!cart.length || isDisabled}
                            className="h-8 w-8 md:h-9 md:w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Clear Cart"
                          >
                            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </Button>
                        </div>
                      </div>
                      {!cart.length && (
                        <div className="mt-2 p-3 border border-dashed rounded text-center bg-muted/30">
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Click or drag products here
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
                              variant={
                                orderType === type ? "default" : "outline"
                              }
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
                        <div
                          className="space-y-3 mt-3 overflow-y-auto pr-1"
                          style={{ maxHeight: "360px" }}
                        >
                          {cart.map((item) => (
                            <CartItem
                              key={item.cartKey ?? item._id}
                              item={item}
                              isDisabled={isDisabled}
                              onUpdateQuantity={handleUpdateQuantity}
                              onRemoveDiscount={removeDiscount}
                              onRemoveFromCart={handleRemoveFromCart}
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
                        <Label className="text-xs md:text-sm text-muted-foreground/80">
                          Payment Method
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5 xs:gap-2 mt-2">
                          {(["cash", "gcash", "split"] as const).map(
                            (method) => (
                              <Button
                                key={method}
                                variant={
                                  paymentMethod === method
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => setPaymentMethod(method)}
                                className="h-9 md:h-10 text-[10px] xs:text-xs md:text-sm capitalize px-1 md:px-4"
                                disabled={isDisabled}
                              >
                                {method === "cash" && (
                                  <DollarSign className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                                )}
                                {method === "gcash" && (
                                  <Smartphone className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                                )}
                                {method === "split" && (
                                  <Receipt className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                                )}
                                {method}
                              </Button>
                            ),
                          )}
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
                          disabled={isDisabled || openRegisterMutation.isPending}
                        />
                      )}

                      {/* Pay Button */}
                      <Button
                        onClick={processPayment}
                        disabled={
                          !cart.length ||
                          isDisabled ||
                          settingsLoading ||
                          !canProcessPayment ||
                          saveOrderMutation.isPending ||
                          openRegisterMutation.isPending
                        }
                        className="w-full h-12 text-base font-semibold"
                        size="lg"
                        variant={canProcessPayment ? "default" : "secondary"}
                      >
                        {saveOrderMutation.isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Processing...
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
                                splitPayment.cash + splitPayment.gcash >=
                                total
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
          </TabsContent>

          <TabsContent value="queue" className="m-0 pb-10">
            <QueueBoard
              onReprintReceipt={handleReprintReceipt}
              onPrintKitchenSlip={handlePrintKitchenSlip}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={showSavedOrders} onOpenChange={setShowSavedOrders}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Saved Orders ({savedOrders.length})
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <SavedOrdersPanel
                orders={savedOrders}
                isProcessing={saveOrderMutation.isPending}
                isPrinting={isPrinting}
                onClose={() => setShowSavedOrders(false)}
                onLoad={loadSavedOrder}
                onReprint={handleReprintReceipt}
                onDelete={(orderId) => setConfirmDeleteSavedOrder({ open: true, orderId })}
                onClearAll={clearAllSavedOrders}
              />
            </DialogBody>
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
              cashier: order.cashier || staffName,
              seniorPwdIds: order.seniorPwdIds || [],
              isReprint: true,
            });
            setShowOrderHistory(false);
            setShowReceipt(true);
          }}
        />

        {showReceipt && settings && (
          <ReceiptModal
            receipt={currentReceipt}
            settings={settings}
            onClose={() => setShowReceipt(false)}
            onPrint={handlePrintReceipt}
            isPrinting={isPrinting}
          />
        )}

        {showInsufficientStockModal && (
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
                  (item) =>
                    !item.ingredients?.some((ing) => names.has(ing.name)),
                ),
              );
              setShowInsufficientStockModal(false);
              setInsufficientStockItems([]);
              toast.info("Removed unavailable items");
            }}
          />
        )}

        <StockAlertsModal
          isOpen={showStockAlertsModal}
          onClose={setShowStockAlertsModal}
          stockAlerts={stockAlerts}
          onRefresh={() => refetchStockAlerts()}
        />

        <AddonSelectionModal
          product={addonModalProduct}
          open={addonModalOpen}
          onClose={() => setAddonModalOpen(false)}
          onConfirm={handleAddonConfirm}
        />

        {/* Destructive Action Confirmations */}
        <ConfirmDialog
          open={confirmClearCartOpen}
          onOpenChange={setConfirmClearCartOpen}
          title="Clear Cart?"
          description="This will remove all items from your current order. This action cannot be undone."
          onConfirm={clearCart}
          confirmText="Clear Cart"
          variant="destructive"
        />

        <ConfirmDialog
          open={confirmDeleteSavedOrder.open}
          onOpenChange={(open) => setConfirmDeleteSavedOrder(prev => ({ ...prev, open }))}
          title="Delete Saved Order?"
          description="Are you sure you want to delete this saved order? This cannot be undone."
          onConfirm={() => {
            if (confirmDeleteSavedOrder.orderId) {
              deleteOrder(confirmDeleteSavedOrder.orderId);
              setConfirmDeleteSavedOrder({ open: false, orderId: null });
            }
          }}
          confirmText="Delete"
          variant="destructive"
        />

      </>
    </div>
  );
}