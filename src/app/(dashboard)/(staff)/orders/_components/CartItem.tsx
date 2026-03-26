"use client";

import React, { memo } from "react";
import { Plus, Minus, Trash2, Percent, Coffee, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartItem as CartItemType } from "./pos.types";
import { formatCurrency, DISCOUNT_RATE } from "./pos.utils";

interface CartItemProps {
  item: CartItemType;
  isDisabled: boolean;
  onUpdateQuantity: (cartKey: string, delta: number) => void;
  onRemoveDiscount: (cartKey: string) => void;
  onRemoveFromCart: (cartKey: string) => void;
}

export const CartItem = memo(
  ({
    item,
    isDisabled,
    onUpdateQuantity,
    onRemoveDiscount,
    onRemoveFromCart,
  }: CartItemProps) => {
    // Use cartKey for all operations so addon-differentiated items work correctly
    const key = item.cartKey ?? item._id;
    const displayPrice = item.effectivePrice ?? item.price;

    return (
      <div className="flex flex-col p-3 border rounded-lg bg-card/50 shadow-sm gap-3">
        {/* Top Row: Thumbnail + Info */}
        <div className="flex items-start gap-3 min-w-0">
          {/* Thumbnail */}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-12 w-12 rounded-lg object-cover border shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border">
              {item.menuType === "drink" ? (
                <Coffee className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Utensils className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-foreground truncate max-w-[150px] xs:max-w-none">
                {item.name}
              </p>
              {item.hasDiscount && (
                <Badge
                  variant="default"
                  className="text-[9px] h-4 px-1.5 bg-green-600 font-bold"
                >
                  20% OFF
                </Badge>
              )}
            </div>

            {/* Selected Addons */}
            {item.selectedAddons && item.selectedAddons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {item.selectedAddons.map((addon) => (
                  <span
                    key={addon.addonName}
                    className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {addon.addonName}
                    {addon.price > 0 && (
                      <span className="ml-1 text-primary/80">+{formatCurrency(addon.price)}</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              {item.hasDiscount ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] text-muted-foreground line-through opacity-70">
                    {formatCurrency(displayPrice)}
                  </span>
                  <span className="text-xs text-green-600 font-bold">
                    {formatCurrency(displayPrice * (1 - DISCOUNT_RATE))}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(displayPrice)}
                </p>
              )}
              <span className="text-[10px] text-muted-foreground/60 px-1 py-0.5 bg-muted rounded">
                × {item.quantity}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onUpdateQuantity(key, -1)}
              className="h-7 w-7 md:h-8 md:w-8 hover:bg-background"
              disabled={isDisabled}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="w-6 text-center text-xs md:text-sm font-bold">
              {item.quantity}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onUpdateQuantity(key, 1)}
              className="h-7 w-7 md:h-8 md:w-8 hover:bg-background"
              disabled={isDisabled}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {item.hasDiscount && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemoveDiscount(key)}
                className="h-8 px-2 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/10"
                disabled={isDisabled}
              >
                <Percent className="w-3.5 h-3.5 mr-1" />
                <span className="text-[10px] font-bold">Remove</span>
              </Button>
            )}
            <Button
              size="icon"
              variant="destructive"
              onClick={() => onRemoveFromCart(key)}
              className="h-8 w-8"
              disabled={isDisabled}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

CartItem.displayName = "CartItem";
