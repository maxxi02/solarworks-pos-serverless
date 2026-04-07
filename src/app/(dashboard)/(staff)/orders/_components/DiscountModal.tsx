"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CartItem } from './pos.types';
import { formatCurrency } from './pos.utils';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { ids: string[]; itemIds: string[] }) => void;
  cartItems: CartItem[];
}

export const DiscountModal = ({ isOpen, onClose, onApply, cartItems }: DiscountModalProps) => {
  const [ids, setIds] = useState<string[]>(['']);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleAddId = () => setIds([...ids, '']);
  const handleRemoveId = (index: number) => setIds(ids.filter((_, i) => i !== index));
  const handleIdChange = (index: number, value: string) => {
    const newIds = [...ids];
    newIds[index] = value;
    setIds(newIds);
  };
  const handleToggleItem = (itemId: string) =>
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );

  const handleApply = () => {
    const validIds = ids.filter(id => id.trim());
    if (!validIds.length) { toast.error('Enter at least one ID'); return; }
    if (!selectedItems.length) { toast.error('Select at least one item'); return; }
    onApply({ ids: validIds, itemIds: selectedItems });
    setIds(['']);
    setSelectedItems([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Apply Senior/PWD Discount</DialogTitle>
          <DialogDescription>Select items and enter IDs for 20% discount</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* ID Numbers */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">ID Numbers</Label>
            {ids.map((id, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`ID #${index + 1}`}
                  value={id}
                  onChange={(e) => handleIdChange(index, e.target.value)}
                  className="flex-1 h-10"
                />
                {ids.length > 1 && (
                  <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveId(index)} className="h-10 w-10 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddId} className="h-9 mt-1">
              <Plus className="h-4 w-4 mr-1.5" /> Add ID
            </Button>
          </div>

          {/* Item Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Items</Label>
            <div className="border rounded-lg divide-y overflow-hidden">
              {cartItems.map(item => (
                <div
                  key={item._id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                    selectedItems.includes(item._id)
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleToggleItem(item._id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {formatCurrency(item.price)} each</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                    {selectedItems.includes(item._id) && (
                      <Badge variant="default" className="text-[10px] mt-1">Selected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={onClose} className="h-10">Cancel</Button>
          <Button onClick={handleApply} className="h-10">Apply Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
