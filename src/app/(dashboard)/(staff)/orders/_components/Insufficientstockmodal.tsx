"use client";

import { PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InsufficientStockItem } from './pos.types';

interface InsufficientStockModalProps {
  items: InsufficientStockItem[];
  onClose: () => void;
  onRemoveUnavailable: () => void;
}

export const InsufficientStockModal = ({
  items,
  onClose,
  onRemoveUnavailable,
}: InsufficientStockModalProps) => {
  if (!items.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-xl rounded-lg bg-white dark:bg-black border p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <PackageX className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Insufficient Stock</h3>
            <p className="text-base text-gray-600">Some items cannot be fulfilled</p>
          </div>
        </div>

        <div className="mb-8 max-h-80 overflow-y-auto space-y-4">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-base">{item.name}</p>
                  <p className="text-sm">Required: {item.requiredQuantity} {item.unit}</p>
                  <p className="text-sm">Available: {item.currentStock} {item.unit}</p>
                </div>
                <span className="text-base font-medium text-red-600">
                  Short: {item.shortBy} {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose} size="lg" className="text-base h-11 px-5">
            Close
          </Button>
          <Button variant="destructive" onClick={onRemoveUnavailable} size="lg" className="text-base h-11 px-5">
            Remove Unavailable
          </Button>
        </div>
      </div>
    </div>
  );
};