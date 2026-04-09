"use client";

import React, { memo } from "react";
import { Plus, Coffee, Utensils, Sparkles, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "./pos.types";
import { formatCurrency } from "./pos.utils";

interface ProductCardProps {
  product: Product;
  /** Called when there are NO addons (direct add to cart) */
  onAddToCart: (product: Product) => void;
  /** Called when the product has addons — opens the addon selection modal */
  onOpenAddons: (product: Product) => void;
}

export const ProductCard = memo(
  ({ product, onAddToCart, onOpenAddons }: ProductCardProps) => {
    const hasAddons = (product.addonGroups?.length ?? 0) > 0;

    const handleClick = () => {
      if (hasAddons) onOpenAddons(product);
      else onAddToCart(product);
    };

    return (
      <Card
        className="hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer overflow-hidden p-0 border hover:border-primary/50 group h-full"
        onClick={handleClick}
      >
        <CardContent className="p-0 h-full flex flex-col">
          {/* Image with fixed aspect ratio */}
          <div className="relative w-full pt-[75%] bg-linear-to-br from-muted to-muted/50 shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {product.menuType === "drink" ? (
                  <Coffee className="w-12 h-12 text-muted-foreground/40" />
                ) : (
                  <Utensils className="w-12 h-12 text-muted-foreground/40" />
                )}
              </div>
            )}

            {/* Addon badge overlay */}
            {hasAddons && (
              <div className="absolute top-1.5 right-1.5">
                <Badge className="h-5 px-1.5 text-[9px] font-bold bg-primary/90 backdrop-blur-sm gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Customize
                </Badge>
              </div>
            )}

            {/* Kitchen badge */}
            {product.isCookable && (
              <div className="absolute top-1.5 left-1.5">
                <Badge className="h-5 px-1.5 text-[9px] font-bold bg-orange-500/90 backdrop-blur-sm gap-1">
                  <ChefHat className="w-2.5 h-2.5" />
                  Kitchen
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-2.5 flex-1 flex flex-col min-h-0">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors min-h-10 leading-tight">
              {product.name}
            </h3>

            <div className="flex-1">
              {product.description && (
                <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Price and Add Button */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-muted/30">
              <span className="font-bold text-base text-primary">
                {formatCurrency(product.price)}
              </span>
              <Button
                size="sm"
                className="h-7 w-7 p-0 rounded-full shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

ProductCard.displayName = "ProductCard";
