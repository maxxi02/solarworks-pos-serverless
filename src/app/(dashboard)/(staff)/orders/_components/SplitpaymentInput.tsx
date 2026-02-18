"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatCurrency } from './pos.utils';

interface SplitPaymentInputProps {
  total: number;
  splitPayment: { cash: number; gcash: number };
  setSplitPayment: (value: { cash: number; gcash: number }) => void;
  disabled?: boolean;
}

export const SplitPaymentInput = ({
  total,
  splitPayment,
  setSplitPayment,
  disabled,
}: SplitPaymentInputProps) => {
  const [error, setError] = useState('');
  const totalPaid = splitPayment.cash + splitPayment.gcash;
  const change = totalPaid - total;

  const validate = (cash: number, gcash: number) => {
    setError(Math.abs(cash + gcash - total) > 0.01 ? 'Split amounts must equal total' : '');
  };

  const handleCashChange = (value: string) => {
    const cashAmount = parseFloat(value) || 0;
    const newSplit = { cash: cashAmount, gcash: total - cashAmount };
    setSplitPayment(newSplit);
    validate(cashAmount, newSplit.gcash);
  };

  const handleGcashChange = (value: string) => {
    const gcashAmount = parseFloat(value) || 0;
    const newSplit = { cash: total - gcashAmount, gcash: gcashAmount };
    setSplitPayment(newSplit);
    validate(newSplit.cash, gcashAmount);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm flex items-center justify-between">
          <span>Cash Amount</span>
          <span className="text-muted-foreground">Remaining: {formatCurrency(total - splitPayment.gcash)}</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
          <Input
            type="number"
            value={splitPayment.cash || ''}
            onChange={(e) => handleCashChange(e.target.value)}
            placeholder="0.00"
            className="pl-7 h-10 text-base"
            step="0.01"
            min="0"
            max={total}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm flex items-center justify-between">
          <span>GCash Amount</span>
          <span className="text-muted-foreground">Remaining: {formatCurrency(total - splitPayment.cash)}</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
          <Input
            type="number"
            value={splitPayment.gcash || ''}
            onChange={(e) => handleGcashChange(e.target.value)}
            placeholder="0.00"
            className="pl-7 h-10 text-base"
            step="0.01"
            min="0"
            max={total}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Quick Split Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[
          { label: '50/50', action: () => setSplitPayment({ cash: total / 2, gcash: total / 2 }) },
          { label: 'All Cash', action: () => setSplitPayment({ cash: total, gcash: 0 }) },
          { label: 'All GCash', action: () => setSplitPayment({ cash: 0, gcash: total }) },
        ].map(({ label, action }) => (
          <Button
            key={label}
            size="default"
            variant="outline"
            onClick={action}
            className="h-9 text-sm"
            disabled={disabled}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Receipt-style Summary */}
      <div className={`rounded-lg p-4 space-y-1 mt-3 font-mono ${totalPaid >= total ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Cash:</span>
            <span className="font-medium">{formatCurrency(splitPayment.cash)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>GCash:</span>
            <span className="font-medium">{formatCurrency(splitPayment.gcash)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-right text-lg font-bold">{formatCurrency(totalPaid)}</div>
        <div className="text-right text-lg font-bold text-muted-foreground">-{formatCurrency(total)}</div>
        <div className="border-t border-dashed border-gray-300 my-2" />

        {totalPaid > total ? (
          <div className="flex justify-between text-lg font-bold">
            <span className="text-gray-600">CHANGE:</span>
            <span className="text-green-600">{formatCurrency(totalPaid - total)}</span>
          </div>
        ) : totalPaid < total ? (
          <div className="flex justify-between text-lg font-bold">
            <span className="text-gray-600">NEED:</span>
            <span className="text-red-600">{formatCurrency(total - totalPaid)}</span>
          </div>
        ) : (
          <div className="text-center text-green-600 font-bold text-lg">EXACT AMOUNT</div>
        )}

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};