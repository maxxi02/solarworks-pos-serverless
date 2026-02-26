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
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemoveDiscount: (id: string) => void;
    onRemoveFromCart: (id: string) => void;
}

export const CartItem = memo(({
    item,
    isDisabled,
    onUpdateQuantity,
    onRemoveDiscount,
    onRemoveFromCart
}: CartItemProps) => {
    return (
        <div className="flex flex-col p-2 border rounded">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Thumbnail */}
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-10 w-10 rounded object-cover border shrink-0"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0 border">
                            {item.menuType === "drink" ? (
                                <Coffee className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Utensils className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                                {item.name}
                            </p>
                            {item.hasDiscount && (
                                <Badge
                                    variant="default"
                                    className="text-[10px] h-5 px-2 bg-green-600"
                                >
                                    20% OFF
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {item.hasDiscount ? (
                                <>
                                    <p className="text-xs text-muted-foreground line-through">
                                        {formatCurrency(item.price)}
                                    </p>
                                    <p className="text-xs text-green-600 font-bold">
                                        {formatCurrency(
                                            item.price * (1 - DISCOUNT_RATE),
                                        )}
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(item.price)}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                × {item.quantity}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                        <Button
                            size="default"
                            variant="outline"
                            onClick={() => onUpdateQuantity(item._id, -1)}
                            className="h-8 w-8 p-0"
                            disabled={isDisabled}
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                        </span>
                        <Button
                            size="default"
                            variant="outline"
                            onClick={() => onUpdateQuantity(item._id, 1)}
                            className="h-8 w-8 p-0"
                            disabled={isDisabled}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                        {item.hasDiscount && (
                            <Button
                                size="default"
                                variant="outline"
                                onClick={() => onRemoveDiscount(item._id)}
                                className="h-8 w-8 p-0 text-yellow-600"
                                disabled={isDisabled}
                            >
                                <Percent className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        <Button
                            size="default"
                            variant="destructive"
                            onClick={() => onRemoveFromCart(item._id)}
                            className="h-8 w-8 p-0"
                            disabled={isDisabled}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});

CartItem.displayName = "CartItem";
