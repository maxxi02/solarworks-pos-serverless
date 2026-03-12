"use client";

import { Plus, Minus, X, ShoppingCart } from "lucide-react";

export interface KioskCartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  menuType?: "food" | "drink";
}

interface KioskCartProps {
  items: KioskCartItem[];
  onUpdate: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  subtotal: number;
  onCheckout: () => void;
}

export function KioskCart({ items, onUpdate, onRemove, subtotal, onCheckout }: KioskCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground gap-4">
        <ShoppingCart className="w-16 h-16 opacity-20" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <p className="text-sm">Tap a menu item to add it here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((item) => (
          <div
            key={item._id}
            className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl p-3"
          >
            {/* Image or icon */}
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{item.menuType === "drink" ? "🥤" : "🍽️"}</span>
              )}
            </div>

            {/* Name + price */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
              <p className="text-xs text-primary font-bold">₱{item.price.toFixed(2)}</p>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdate(item._id, -1)}
                className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
              <button
                onClick={() => onUpdate(item._id, 1)}
                className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(item._id)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Subtotal + CTA */}
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm font-medium">Subtotal</span>
          <span className="text-xl font-black text-foreground">₱{subtotal.toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          Place Order · ₱{subtotal.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
