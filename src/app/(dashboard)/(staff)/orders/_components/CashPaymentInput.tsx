"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from './pos.utils';
import { Separator } from '@/components/ui/separator';

interface CashPaymentInputProps {
  total: number;
  amountPaid: number;
  setAmountPaid: (value: number) => void;
  disabled?: boolean;
}

// Fixed version: default color gray-300 + primary focus, cleaner look

export const CashPaymentInput = ({
  total,
  amountPaid,
  setAmountPaid,
  disabled,
}: CashPaymentInputProps) => {
  const [error, setError] = useState('');

  const change = amountPaid - total;
  const isInsufficient = amountPaid > 0 && change < 0;

  const handleAmountChange = (value: string) => {
    const paid = parseFloat(value) || 0;
    setAmountPaid(paid);
    setError(paid > 0 && paid < total ? `Need ${formatCurrency(total - paid)} more` : '');
  };

  return (
    // Updated CashPaymentInput
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm flex items-center justify-between">
          <span>Amount Received</span>
          <span className="text-muted-foreground">Total: {formatCurrency(total)}</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
          <Input
            type="number"
            value={amountPaid || ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            className={`pl-7 h-10 text-base border border-input bg-background focus:border-primary focus:ring-1 focus:ring-primary/50 ${isInsufficient ? 'border-destructive focus:border-destructive focus:ring-destructive/50' : ''}`}
            step="0.01"
            min="0"
            disabled={disabled}
          />
        </div>
      </div>

      {amountPaid > 0 && (
        <div className={`rounded-lg p-4 space-y-2 border ${change >= 0 ? 'bg-primary/5 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paid:</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between font-bold text-base">
            <span className="text-muted-foreground">Change:</span>
            <span className={change >= 0 ? "text-primary" : "text-destructive"}>
              {formatCurrency(Math.abs(change))}
            </span>
          </div>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};