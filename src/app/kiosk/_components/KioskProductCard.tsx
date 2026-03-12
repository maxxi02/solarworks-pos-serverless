"use client";

import { Plus } from "lucide-react";

export interface KioskProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  available: boolean;
  category?: string;
  menuType?: "food" | "drink";
}

interface KioskProductCardProps {
  product: KioskProduct;
  onAdd: (product: KioskProduct) => void;
  quantity: number;
}

export function KioskProductCard({ product, onAdd, quantity }: KioskProductCardProps) {
  return (
    <div
      onClick={() => onAdd(product)}
      className="relative bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.97] transition-all group"
    >
      {/* Product Image */}
      <div className="aspect-square w-full bg-muted flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-4xl select-none">
            {product.menuType === "drink" ? "🥤" : "🍽️"}
          </span>
        )}
      </div>

      {/* Cart badge */}
      {quantity > 0 && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shadow-md">
          {quantity}
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-primary font-black text-base">₱{product.price.toFixed(2)}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
            className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
