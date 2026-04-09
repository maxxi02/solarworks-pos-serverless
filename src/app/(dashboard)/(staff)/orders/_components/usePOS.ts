"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { CartItem, Product, SavedOrder, SelectedAddon } from "./pos.types";
import { generateOrderNumber, DISCOUNT_RATE } from "./pos.utils";

export const useCart = (
  playOrder: () => void,
  playError: () => void,
  playSuccess: () => void,
) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + (i.effectivePrice ?? i.price) * i.quantity, 0),
    [cart],
  );
  const discountTotal = useMemo(
    () =>
      cart.reduce(
        (sum, i) =>
          i.hasDiscount
            ? sum + (i.effectivePrice ?? i.price) * i.quantity * DISCOUNT_RATE
            : sum,
        0,
      ),
    [cart],
  );
  const total = subtotal - discountTotal;
  const seniorPwdCount = cart.filter((i) => i.hasDiscount).length;

  const addToCart = useCallback(
    (product: Product, selectedAddons: SelectedAddon[] = [], quantity = 1) => {
      const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
      const effectivePrice = product.price + addonTotal;
      // Unique key: same product + same addons = same line item
      const cartKey =
        product._id +
        (selectedAddons.length > 0
          ? ":" + selectedAddons.map((a) => a.addonName).sort().join(",")
          : "");

      setCart((prev) => {
        const existing = prev.find((i) => i.cartKey === cartKey);
        if (existing) {
          return prev.map((i) =>
            i.cartKey === cartKey
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          );
        }
        return [
          ...prev,
          {
            ...product,
            quantity,
            hasDiscount: false,
            selectedAddons,
            effectivePrice,
            cartKey,
          },
        ];
      });
      toast.success(`${product.name} added`);
    },
    [],
  );

  const updateQuantity = useCallback((cartKey: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          (item.cartKey ?? item._id) === cartKey
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((cartKey: string) => {
    setCart((prev) => prev.filter((i) => (i.cartKey ?? i._id) !== cartKey));
  }, []);

  const applyDiscount = useCallback(
    (data: { ids: string[]; itemIds: string[] }) => {
      setCart((prev) =>
        prev.map((item) =>
          data.itemIds.includes(item._id)
            ? { ...item, hasDiscount: true }
            : item,
        ),
      );
      toast.success(`Discount applied to ${data.itemIds.length} item(s)`);
      playSuccess();
    },
    [playSuccess],
  );

  const removeDiscount = useCallback((cartKey: string) => {
    setCart((prev) =>
      prev.map((item) =>
        (item.cartKey ?? item._id) === cartKey ? { ...item, hasDiscount: false } : item,
      ),
    );
    toast.info("Discount removed");
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
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
    clearCart,
  };
};

// ——— Saved Orders ———
const slimOrder = (order: SavedOrder): SavedOrder => ({
  ...order,
  items: order.items.map((item) => ({
    ...item,
    description: undefined,
    ingredients: [],
    imageUrl: undefined,
  })),
});

export const useSavedOrders = () => {
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>(() => {
    try {
      const saved = localStorage.getItem("pos_saved_orders");
      if (saved) {
        return JSON.parse(saved).map((o: SavedOrder) => ({
          ...o,
          timestamp: new Date(o.timestamp),
        }));
      }
    } catch {}
    return [];
  });

  const persist = useCallback((orders: SavedOrder[]) => {
    const slimmed = orders.map(slimOrder);
    try {
      localStorage.setItem("pos_saved_orders", JSON.stringify(slimmed));
    } catch (e) {
      console.error("LocalStorage save failed:", e);
      if (e instanceof Error && e.name === "QuotaExceededError") {
        // Fallback: Prune aggressively (keep only last 10)
        try {
          const restricted = slimmed.slice(0, 10);
          localStorage.setItem("pos_saved_orders", JSON.stringify(restricted));
          toast.warning("Storage full: kept only last 10 orders");
        } catch {
          localStorage.removeItem("pos_saved_orders");
          toast.error("Storage critical: cleared saved orders");
        }
      }
    }
  }, []);

  const saveOrder = useCallback(
    (order: SavedOrder) => {
      setSavedOrders((prev) => {
        const updated = [order, ...prev].slice(0, 50);
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const deleteOrder = useCallback(
    (orderId: string) => {
      setSavedOrders((prev) => {
        const updated = prev.filter((o) => o.id !== orderId);
        persist(updated);
        toast.success("Order deleted");
        return updated;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    setSavedOrders([]);
    persist([]);
    toast.success("All saved orders cleared");
  }, [persist]);

  return { savedOrders, saveOrder, deleteOrder, clearAll };
};

// ——— Order Builder (for processPayment helper) ———
export const buildOrder = ({
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
  cashier,
  cashierId,
}: {
  cart: CartItem[];
  customerName: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: "cash" | "gcash" | "split";
  splitPayment: { cash: number; gcash: number };
  amountPaid: number;
  orderType: "dine-in" | "takeaway";
  selectedTable: string;
  orderNote: string;
  seniorPwdCount: number;
  seniorPwdIds: string[];
  cashier?: string;
  cashierId?: string;
}): SavedOrder => {
  const orderId = `order-${Date.now()}`;
  return {
    id: orderId,
    orderNumber: generateOrderNumber(),
    customerName: customerName || "Walk-in Customer",
    items: cart,
    subtotal,
    discountTotal,
    total,
    paymentMethod,
    splitPayment: paymentMethod === "split" ? splitPayment : undefined,
    amountPaid: paymentMethod === "cash" ? amountPaid : total,
    change: paymentMethod === "cash" ? Math.max(0, amountPaid - total) : 0,
    orderType,
    tableNumber: orderType === "dine-in" ? selectedTable : undefined,
    timestamp: new Date(),
    status: "completed",
    seniorPwdCount,
    orderNote: orderNote || undefined,
    cashier: cashier || "Cashier",
    cashierId: cashierId || "unknown",
    seniorPwdIds,
  };
};
