"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { CartItem, Product, SavedOrder } from "./pos.types";
import { generateOrderNumber, DISCOUNT_RATE } from "./pos.utils";

export const useCart = (
  playOrder: () => void,
  playError: () => void,
  playSuccess: () => void,
) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cart],
  );
  const discountTotal = useMemo(
    () =>
      cart.reduce(
        (sum, i) =>
          i.hasDiscount ? sum + i.price * i.quantity * DISCOUNT_RATE : sum,
        0,
      ),
    [cart],
  );
  const total = subtotal - discountTotal;
  const seniorPwdCount = cart.filter((i) => i.hasDiscount).length;

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      return existing
        ? prev.map((i) =>
            i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...prev, { ...product, quantity: 1, hasDiscount: false }];
    });
    toast.success(`${product.name} added`);
  }, []);

  const updateQuantity = useCallback((itemId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item._id === itemId
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((i) => i._id !== itemId));
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

  const removeDiscount = useCallback((itemId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === itemId ? { ...item, hasDiscount: false } : item,
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

  const persist = (orders: SavedOrder[]) => {
    setSavedOrders(orders);
    localStorage.setItem("pos_saved_orders", JSON.stringify(orders));
  };

  const saveOrder = useCallback((order: SavedOrder) => {
    setSavedOrders((prev) => {
      const updated = [order, ...prev].slice(0, 50);
      localStorage.setItem("pos_saved_orders", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteOrder = useCallback((orderId: string) => {
    setSavedOrders((prev) => {
      const updated = prev.filter((o) => o.id !== orderId);
      localStorage.setItem("pos_saved_orders", JSON.stringify(updated));
      toast.success("Order deleted");
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
    toast.success("All saved orders cleared");
  }, []);

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
    amountPaid: paymentMethod === "cash" ? amountPaid : undefined,
    change: paymentMethod === "cash" ? amountPaid - total : undefined,
    orderType,
    tableNumber: orderType === "dine-in" ? selectedTable : undefined,
    timestamp: new Date(),
    status: "completed",
    seniorPwdCount,
    orderNote: orderNote || undefined,
    cashier: "Cashier",
    cashierId: "current-user-id",
    seniorPwdIds,
  };
};
