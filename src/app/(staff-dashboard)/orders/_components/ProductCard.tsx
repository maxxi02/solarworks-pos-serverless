"use client";

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

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <div className="aspect-square relative bg-gradient-to-b from-slate-100 to-white">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            No image
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium line-clamp-2 h-10">{product.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-lg">₱{product.price.toFixed(2)}</span>
          <Button size="icon" variant="secondary" onClick={onAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
