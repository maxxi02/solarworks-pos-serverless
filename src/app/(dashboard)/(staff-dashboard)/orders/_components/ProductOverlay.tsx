"use client";

import { Card, CardContent } from "@/components/ui/card";

type ProductOverlayProps = {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
};

export default function ProductOverlay({ product }: ProductOverlayProps) {
  return (
    <Card className="overflow-hidden shadow-2xl scale-105 opacity-90">
      <div className="aspect-square relative bg-linear-to-b from-blue-50 to-white">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <div className="text-center">
              <div className="text-2xl mb-2">☕</div>
              <span className="text-xs">No image</span>
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-3 bg-blue-50">
        <h3 className="font-bold line-clamp-2 h-10 text-blue-800">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-lg text-blue-900">
            ₱{product.price.toFixed(2)}
          </span>
          <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            Dragging...
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
