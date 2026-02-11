"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type CartItemProps = {
  item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  };
  onQuantityChange: (delta: number) => void;
  onRemove: () => void;
};

export default function CartItem({
  item,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: item.id,
    data: {
      type: "cartItem",
      item: item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const totalPrice = item.price * item.quantity;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 py-3 px-4 bg-white rounded-lg border shadow-sm",
        "hover:shadow-md transition-all duration-200",
        isDragging && "shadow-lg border-blue-400 bg-blue-50 scale-105",
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing p-2 rounded hover:bg-slate-100",
          "text-slate-400 hover:text-slate-700 focus:outline-none",
          isDragging && "text-blue-600 cursor-grabbing",
        )}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Product Image */}
      <div className="relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-14 h-14 object-cover rounded-md shadow-sm"
          />
        ) : (
          <div className="w-14 h-14 bg-slate-100 rounded-md flex items-center justify-center">
            <span className="text-slate-400 text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate text-slate-800">{item.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-slate-500">₱{item.price.toFixed(2)}</p>
          <span className="text-slate-300">•</span>
          <p className="text-sm text-blue-600 font-medium">
            ₱{totalPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-slate-200"
            onClick={() => onQuantityChange(-1)}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <span className="w-6 text-center font-bold text-slate-800 tabular-nums">
            {item.quantity}
          </span>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-slate-200"
            onClick={() => onQuantityChange(1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Remove Button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
