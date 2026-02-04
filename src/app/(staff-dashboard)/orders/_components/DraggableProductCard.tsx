"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  onAdd: () => void;
};

export default function DraggableProductCard({
  product,
  onAdd,
}: ProductCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: product.id,
      data: {
        type: "product",
        product: product,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing">
        <div
          className="aspect-square relative bg-gradient-to-b from-slate-100 to-white"
          {...attributes}
          {...listeners}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <div className="text-center">
                <div className="text-2xl mb-2">☕</div>
                <span className="text-xs">No image</span>
              </div>
            </div>
          )}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg" />
          )}
        </div>
        <CardContent className="p-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <h3 className="font-medium line-clamp-2 h-10 text-slate-800">
              {product.name}
            </h3>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              <span className="font-bold text-lg text-slate-900">
                ₱{product.price.toFixed(2)}
              </span>
            </div>
            <Button
              size="icon"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="hover:bg-blue-100 hover:text-blue-600"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/5 rounded-lg border-2 border-dashed border-blue-400 pointer-events-none" />
      )}
    </div>
  );
}
