"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from './pos.utils';

interface CashPaymentInputProps {
  total: number;
  amountPaid: number;
  setAmountPaid: (value: number) => void;
  disabled?: boolean;
}

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
            className={`pl-7 h-10 text-base ${isInsufficient ? 'border-red-500' : ''}`}
            step="0.01"
            min="0"
            disabled={disabled}
          />
        </div>
      </div>

      {amountPaid > 0 && (
        <div className={`rounded-lg p-4 space-y-1 mt-3 font-mono ${change >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-right text-lg font-bold">{formatCurrency(amountPaid)}</div>
          <div className="text-right text-lg font-bold text-muted-foreground">-{formatCurrency(total)}</div>
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span className="text-gray-600">CHANGE:</span>
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(Math.abs(change))}
            </span>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
};