"use client";

import React, { memo } from "react";
import { Plus, Coffee, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "./pos.types";
import { formatCurrency } from "./pos.utils";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard = memo(
  ({ product, onAddToCart }: ProductCardProps) => {
    return (
      <Card
        className="hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer overflow-hidden p-0 border hover:border-primary/50 group h-full"
        onClick={() => onAddToCart(product)}
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
          </div>

          {/* Content - Compact but readable */}
          <div className="p-2.5 flex-1 flex flex-col min-h-0">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem] leading-tight">
              {product.name}
            </h3>

            {/* Optional: Show description only if available and compact */}
            <div className="flex-1">
              {product.description && (
                <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Price and Add Button - Always visible at bottom */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-muted/30">
              <span className="font-bold text-base text-primary">
                {formatCurrency(product.price)}
              </span>
              <Button
                size="sm"
                className="h-7 w-7 p-0 rounded-full shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
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
