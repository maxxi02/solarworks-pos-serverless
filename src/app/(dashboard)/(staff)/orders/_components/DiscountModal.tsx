"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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
          <DialogDescription className="text-base">Select items and enter IDs for 20% discount</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-5">
          {/* ID Numbers */}
          <div className="space-y-3">
            <Label className="text-base">ID Numbers</Label>
            {ids.map((id, index) => (
              <div key={index} className="flex gap-3">
                <Input
                  placeholder={`ID #${index + 1}`}
                  value={id}
                  onChange={(e) => handleIdChange(index, e.target.value)}
                  className="flex-1 h-10 text-base"
                />
                {ids.length > 1 && (
                  <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveId(index)} className="h-10 w-10">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="default" onClick={handleAddId} className="mt-3 h-10 text-base">
              <Plus className="h-5 w-5 mr-2" />Add ID
            </Button>
          </div>

          {/* Item Selection */}
          <div className="space-y-3">
            <Label className="text-base">Select Items</Label>
            <div className="max-h-72 overflow-y-auto border rounded-lg p-3 space-y-3">
              {cartItems.map(item => (
                <div
                  key={item._id}
                  className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                    selectedItems.includes(item._id) ? 'bg-primary/10 border border-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleToggleItem(item._id)}
                >
                  <div className="flex-1">
                    <p className="text-base font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity} • {formatCurrency(item.price)} each</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    {selectedItems.includes(item._id) && (
                      <Badge variant="default" className="text-xs mt-2">Selected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} size="lg" className="text-base h-11">Cancel</Button>
          <Button onClick={handleApply} size="lg" className="text-base h-11">Apply Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};