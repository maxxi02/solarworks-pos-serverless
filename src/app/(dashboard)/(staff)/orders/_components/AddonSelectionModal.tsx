"use client";

import React, { useState, useCallback } from "react";
import { Plus, Minus, Check } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddonGroup, SelectedAddon, Product } from "./pos.types";
import { formatCurrency } from "./pos.utils";

interface AddonSelectionModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (product: Product, selectedAddons: SelectedAddon[], quantity: number) => void;
}

export function AddonSelectionModal({ product, open, onClose, onConfirm }: AddonSelectionModalProps) {
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) { onClose(); setSelections({}); setQuantity(1); }
    },
    [onClose],
  );

  if (!product) return null;

  const groups: AddonGroup[] = product.addonGroups || [];

  const toggleAddon = (group: AddonGroup, itemName: string) => {
    setSelections((prev) => {
      const current = new Set(prev[group.name] || []);
      if (group.multiSelect) {
        if (current.has(itemName)) current.delete(itemName);
        else current.add(itemName);
      } else {
        current.clear();
        current.add(itemName);
      }
      return { ...prev, [group.name]: current };
    });
  };

  const isSelected = (groupName: string, itemName: string) =>
    (selections[groupName] || new Set()).has(itemName);

  const selectedAddonList: SelectedAddon[] = groups.flatMap((group) =>
    group.items
      .filter((item) => isSelected(group.name, item.name))
      .map((item) => ({ groupName: group.name, addonName: item.name, price: item.price })),
  );
  const addonTotal = selectedAddonList.reduce((s, a) => s + a.price, 0);
  const lineTotal = (product.price + addonTotal) * quantity;
  const missingRequired = groups.filter((g) => g.required).filter((g) => !(selections[g.name]?.size));

  const handleConfirm = () => {
    if (missingRequired.length > 0) return;
    onConfirm(product, selectedAddonList, quantity);
    setSelections({});
    setQuantity(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        {/* Header */}
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start gap-4">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-16 w-16 rounded-xl object-cover border shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold leading-tight">{product.name}</DialogTitle>
              {product.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
              )}
              <p className="text-base font-semibold text-primary mt-1">{formatCurrency(product.price)}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Addon Groups */}
        <DialogBody className="space-y-5">
          {groups.map((group) => {
            const isMissing = group.required && !(selections[group.name]?.size);
            return (
              <div key={group.name}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-semibold text-sm">{group.name}</span>
                  {group.required ? (
                    <Badge variant="destructive" className={`text-[10px] h-4 px-1.5 ${isMissing ? "animate-pulse" : ""}`}>
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Optional</Badge>
                  )}
                  {group.multiSelect && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">Multi</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {group.items.map((item) => {
                    const selected = isSelected(group.name, item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleAddon(group, item.name)}
                        className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                            {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-medium truncate">{item.name}</span>
                        </div>
                        <span className={`text-sm font-semibold shrink-0 ml-2 ${item.price === 0 ? "text-muted-foreground" : "text-primary"}`}>
                          {item.price === 0 ? "Free" : `+${formatCurrency(item.price)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </DialogBody>

        <Separator />

        {/* Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-3 items-center pt-4">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-background" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="w-6 text-center text-sm font-bold">{quantity}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-background" onClick={() => setQuantity((q) => q + 1)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 font-semibold" disabled={missingRequired.length > 0} onClick={handleConfirm}>
              Add to Cart · {formatCurrency(lineTotal)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
