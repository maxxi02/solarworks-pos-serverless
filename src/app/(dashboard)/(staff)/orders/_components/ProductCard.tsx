"use client";

import React, { memo } from "react";
import { Plus, Coffee, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "./pos.types";
import { formatCurrency } from "./pos.utils";

interface ProductCardProps {
    product: Product;
    isDragged: boolean;
    onAddToCart: (product: Product) => void;
    onDragStart: (e: React.DragEvent, product: Product) => void;
    onDragEnd: () => void;
    onTouchStart: (e: React.TouchEvent, product: Product) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
}

export const ProductCard = memo(({
    product,
    isDragged,
    onAddToCart,
    onDragStart,
    onDragEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}: ProductCardProps) => {
    return (
        <Card
            className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing touch-none overflow-hidden p-0 ${isDragged ? "opacity-50 scale-95" : ""
                }`}
            draggable
            onDragStart={(e) => onDragStart(e, product)}
            onDragEnd={onDragEnd}
            onTouchStart={(e) => onTouchStart(e, product)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
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
                        {product.menuType === "drink" ? "☕" : "🍽️"}
                    </div>
                )}

                {/* Content */}
                <div className="p-3">
                    <h3 className="font-bold text-sm line-clamp-2">
                        {product.name}
                    </h3>
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
                                onAddToCart(product);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

ProductCard.displayName = "ProductCard";
