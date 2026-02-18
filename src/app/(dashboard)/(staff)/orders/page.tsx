"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useInventoryOrder } from '@/hooks/useInventoryOrder';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { printReceipt, previewReceipt, ReceiptData as PrinterReceiptData } from '@/lib/receiptPrinter';
import { useAttendance } from "@/hooks/useAttendance";
import { useNotificationSound, preloadNotificationSounds } from '@/lib/use-notification-sound';
import {
  ShoppingCart, Plus, Minus, Trash2, DollarSign, Smartphone, Receipt,
  X, Loader2, Utensils, Coffee, ChevronLeft, ChevronRight, GripVertical,
  Save, History, PackageX, RefreshCw, Bell, Printer, Percent,
  Menu, Clock, Eye, Filter, Calendar, 
  Wifi, WifiOff, Bluetooth, AlertTriangle, CheckCircle2, ChevronRight as ChevronRightIcon
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ClockInCard } from "./_components/ClockInCard";

// ============ Types ============
interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  available: boolean;
  category?: string;
  menuType?: 'food' | 'drink';
}

interface CartItem extends Product {
  quantity: number;
  notes?: string;
  hasDiscount?: boolean;
}

interface CategoryData {
  products?: Product[];
  name: string;
  menuType: 'food' | 'drink';
}

interface SavedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: 'cash' | 'gcash' | 'split';
  splitPayment?: { cash: number; gcash: number };
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
  seniorPwdCount?: number;
  orderNote?: string;
  cashier?: string;
  cashierId?: string;
  seniorPwdIds?: string[];
  amountPaid?: number;
  change?: number;
}

interface StockAlert {
  itemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  unit: string;
  status: 'critical' | 'low' | 'warning';
  location: string;
  outOfStock?: boolean;
}

interface InsufficientStockItem {
  name: string;
  requiredQuantity: number;
  currentStock: number;
  unit: string;
  shortBy: number;
}

interface StockCheckResult {
  name: string;
  requiredQuantity: number;
  currentStock: number;
  unit: string;
  shortBy?: number;
}

interface PrinterStatusProps {
  settings: any;
}

// ============ Utils ============
const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
const formatDate = (date: Date) => new Intl.DateTimeFormat('en-PH', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
}).format(new Date(date));

const generateOrderNumber = () => {
  const date = new Date();
  return `ORD-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
};

// ============ Components ============

// Cash Payment Input Component with Receipt-style Change Calculation
const CashPaymentInput = ({ total, amountPaid, setAmountPaid, disabled }: {
  total: number;
  amountPaid: number;
  setAmountPaid: (value: number) => void;
  disabled?: boolean;
}) => {
  const [error, setError] = useState('');
  
  const change = amountPaid - total;
  const isInsufficient = amountPaid > 0 && change < 0;

  const handleAmountChange = (value: string) => {
    const paid = parseFloat(value) || 0;
    setAmountPaid(paid);
    
    if (paid > 0 && paid < total) {
      setError(`Need ${formatCurrency(total - paid)} more`);
    } else {
      setError('');
    }
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

      {/* Receipt-style Change Display */}
      {amountPaid > 0 && (
        <div className={`rounded-lg p-4 space-y-1 mt-3 font-mono ${
          change >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="text-right text-lg font-bold">
            {formatCurrency(amountPaid)}
          </div>
          <div className="text-right text-lg font-bold text-muted-foreground">
            -{formatCurrency(total)}
          </div>
          <div className="border-t border-dashed border-gray-300 my-2"></div>
          <div className="flex justify-between text-lg font-bold">
            <span className="text-gray-600">CHANGE:</span>
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(Math.abs(change))}
            </span>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Split Payment Input Component with Receipt-style Display
const SplitPaymentInput = ({ total, splitPayment, setSplitPayment, disabled }: {
  total: number;
  splitPayment: { cash: number; gcash: number };
  setSplitPayment: (value: { cash: number; gcash: number }) => void;
  disabled?: boolean;
}) => {
  const [error, setError] = useState('');
  const totalPaid = splitPayment.cash + splitPayment.gcash;
  const change = totalPaid - total;
  const isInsufficient = totalPaid > 0 && totalPaid < total;

  const handleCashChange = (value: string) => {
    const cashAmount = parseFloat(value) || 0;
    const newSplit = { cash: cashAmount, gcash: total - cashAmount };
    setSplitPayment(newSplit);
    
    if (Math.abs((cashAmount + newSplit.gcash) - total) > 0.01) {
      setError('Split amounts must equal total');
    } else {
      setError('');
    }
  };

  const handleGcashChange = (value: string) => {
    const gcashAmount = parseFloat(value) || 0;
    const newSplit = { cash: total - gcashAmount, gcash: gcashAmount };
    setSplitPayment(newSplit);
    
    if (Math.abs((newSplit.cash + gcashAmount) - total) > 0.01) {
      setError('Split amounts must equal total');
    } else {
      setError('');
    }
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
        <Button
          size="default"
          variant="outline"
          onClick={() => setSplitPayment({ cash: total / 2, gcash: total / 2 })}
          className="h-9 text-sm"
          disabled={disabled}
        >
          50/50
        </Button>
        <Button
          size="default"
          variant="outline"
          onClick={() => setSplitPayment({ cash: total, gcash: 0 })}
          className="h-9 text-sm"
          disabled={disabled}
        >
          All Cash
        </Button>
        <Button
          size="default"
          variant="outline"
          onClick={() => setSplitPayment({ cash: 0, gcash: total })}
          className="h-9 text-sm"
          disabled={disabled}
        >
          All GCash
        </Button>
      </div>

      {/* Receipt-style Summary */}
      <div className={`rounded-lg p-4 space-y-1 mt-3 font-mono ${
        totalPaid >= total ? 'bg-green-50' : 'bg-red-50'
      }`}>
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
        
        <div className="border-t border-dashed border-gray-300 my-2"></div>
        
        <div className="text-right text-lg font-bold">
          {formatCurrency(totalPaid)}
        </div>
        <div className="text-right text-lg font-bold text-muted-foreground">
          -{formatCurrency(total)}
        </div>
        
        <div className="border-t border-dashed border-gray-300 my-2"></div>
        
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
          <div className="text-center text-green-600 font-bold text-lg">
            EXACT AMOUNT
          </div>
        )}
        
        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
};

// Receipt Modal with Receipt-style Payment Display
const ReceiptModal = ({ receipt, settings, onClose, onPrint }: { 
  receipt: (SavedOrder & { cashier?: string; seniorPwdIds?: string[]; isReprint?: boolean }) | null; 
  settings: any;
  onClose: () => void;
  onPrint: () => void;
}) => {
  if (!receipt || !settings) return null;

  const is58mm = settings.receiptWidth === '58mm';
  const DISCOUNT_RATE = 0.2; // 20% senior/PWD discount

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${is58mm ? 'max-w-[320px]' : 'max-w-[380px]'} rounded-xl bg-white dark:bg-gray-900 border shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            <span>{receipt.isReprint ? 'REPRINT' : 'RECEIPT'}</span>
          </h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" 
            onClick={onClose}
          >
            <X className="h-5 w-5 font-bold" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div 
            id="receipt-content" 
            className={`font-mono ${is58mm ? 'text-[10px]' : 'text-xs'} bg-white dark:bg-black p-4`}
          >
            {/* Logo */}
            {settings.showLogo && settings.logoPreview && (
              <div className="mb-2 flex justify-center">
                <img 
                  src={settings.logoPreview} 
                  alt="Logo" 
                  className="h-12 object-contain mx-auto"
                  style={{ maxHeight: settings.logoSize || '48px' }}
                />
              </div>
            )}
            
            {/* Store Name */}
            {settings.sections?.storeName?.header && !settings.sections?.storeName?.disabled && (
              <div className="text-center font-bold mb-1">{settings.businessName}</div>
            )}
            
            {/* Location Address */}
            {settings.sections?.locationAddress?.header && !settings.sections?.locationAddress?.disabled && settings.locationAddress && (
              <div className="text-center mb-1 text-[10px]">{settings.locationAddress}</div>
            )}
            
            {/* Phone Number */}
            {settings.sections?.phoneNumber?.header && !settings.sections?.phoneNumber?.disabled && settings.phoneNumber && (
              <div className="text-center mb-1 text-[10px]">{settings.phoneNumber}</div>
            )}
            
            {/* Separator */}
            <div className="text-center mb-1">{"-".repeat(is58mm ? 24 : 32)}</div>
            
            {/* Order Details */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between">
                <span>Order #:</span>
                <span>{receipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(receipt.timestamp).toLocaleDateString()}, {new Date(receipt.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receipt.cashier || 'Cashier'}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{receipt.customerName}</span>
              </div>
              {settings.sections?.transactionType?.header && !settings.sections?.transactionType?.disabled && (
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="uppercase">{receipt.orderType}</span>
                </div>
              )}
              {settings.sections?.orderType?.header && !settings.sections?.orderType?.disabled && receipt.tableNumber && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span>{receipt.tableNumber}</span>
                </div>
              )}
              {receipt.orderNote && (
                <div className="flex justify-between">
                  <span>Note:</span>
                  <span>{receipt.orderNote}</span>
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="text-center mb-1">{"-".repeat(is58mm ? 24 : 32)}</div>
            
            {/* Customer Info (Senior/PWD) */}
            {settings.sections?.customerInfo?.footer && !settings.sections?.customerInfo?.disabled && receipt.seniorPwdIds && receipt.seniorPwdIds.length > 0 && (
              <div className="mb-1 text-[10px]">
                <div>Senior/PWD IDs: {receipt.seniorPwdIds.join(', ')}</div>
              </div>
            )}
            
            {/* Items Header */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between font-bold mb-1">
                <span>Item</span>
                <span>Qty Amount</span>
              </div>
              
              {/* Regular Items */}
              {receipt.items.filter(item => !item.hasDiscount).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{item.quantity} {formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              
              {/* Discounted Items */}
              {receipt.items.filter(item => item.hasDiscount).map((item, idx) => {
                const discountedPrice = item.price * (1 - DISCOUNT_RATE);
                return (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <span>{item.name}</span>
                      <span>{item.quantity} {formatCurrency(discountedPrice * item.quantity)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 text-[8px] pl-2">
                      <span>  (20% Senior/PWD)</span>
                      <span>-{formatCurrency(item.price * item.quantity * DISCOUNT_RATE)}</span>
                    </div>
                  </div>
                );
              })}
              
              {/* SKU - if enabled */}
              {settings.showSKU && receipt.items.map(item => (
                <div key={`sku-${item._id}`} className="text-[8px] text-gray-500">
                  SKU: {item._id.slice(-6)}
                </div>
              ))}
            </div>
            
            {/* Separator */}
            <div className="text-center mb-1">{"-".repeat(is58mm ? 24 : 32)}</div>
            
            {/* Totals */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(receipt.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="text-center mb-1">{"-".repeat(is58mm ? 24 : 32)}</div>
            
            {/* Payment Details - Receipt Style */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between mb-1">
                <span>Payment:</span>
                <span className="uppercase">{receipt.paymentMethod}</span>
              </div>
              
              {receipt.paymentMethod === 'split' && receipt.splitPayment && (
                <>
                  <div className="space-y-1 text-[8px] mb-1">
                    <div className="flex justify-between">
                      <span>Cash:</span>
                      <span>{formatCurrency(receipt.splitPayment.cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GCash:</span>
                      <span>{formatCurrency(receipt.splitPayment.gcash)}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 my-1"></div>
                  <div className="text-right font-bold">
                    {formatCurrency(receipt.splitPayment.cash + receipt.splitPayment.gcash)}
                  </div>
                  <div className="text-right text-muted-foreground">
                    -{formatCurrency(receipt.total)}
                  </div>
                  <div className="border-t border-dashed border-gray-300 my-1"></div>
                  {(receipt.splitPayment.cash + receipt.splitPayment.gcash) > receipt.total && (
                    <div className="flex justify-between font-bold">
                      <span>CHANGE:</span>
                      <span className="text-green-600">
                        {formatCurrency((receipt.splitPayment.cash + receipt.splitPayment.gcash) - receipt.total)}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {receipt.paymentMethod === 'cash' && receipt.amountPaid && (
                <>
                  <div className="text-right font-bold">
                    {formatCurrency(receipt.amountPaid)}
                  </div>
                  <div className="text-right text-muted-foreground">
                    -{formatCurrency(receipt.total)}
                  </div>
                  <div className="border-t border-dashed border-gray-300 my-1"></div>
                  <div className="flex justify-between font-bold">
                    <span>CHANGE:</span>
                    <span className="text-green-600">{formatCurrency(receipt.change || 0)}</span>
                  </div>
                </>
              )}
              
              {receipt.paymentMethod === 'gcash' && (
                <div className="flex justify-between">
                  <span>GCash Received:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
              )}
            </div>
            
            {/* Barcode */}
            {settings.sections?.barcode?.header && !settings.sections?.barcode?.disabled && (
              <div className="mt-2 text-center text-[8px]">
                <div>[BARCODE: {receipt.orderNumber}]</div>
              </div>
            )}
            
            {/* Business Hours */}
            {settings.showBusinessHours && settings.businessHours && (
              <div className="mt-2 text-center text-[8px]">
                <div>{settings.businessHours}</div>
              </div>
            )}
            
            {/* Tax PIN */}
            {settings.showTaxPIN && settings.taxPin && (
              <div className="mt-1 text-center text-[8px]">
                <div>Tax PIN: {settings.taxPin}</div>
              </div>
            )}
            
            {/* Receipt Message */}
            {settings.sections?.message?.footer && !settings.sections?.message?.disabled && settings.receiptMessage && (
              <div className="mt-2 text-center text-[8px]">
                <div>{settings.receiptMessage}</div>
              </div>
            )}
            
            {/* Disclaimer */}
            {!settings.sections?.disclaimer?.disabled && settings.disclaimer && (
              <div className="mt-1 text-center text-[8px]">
                <div>{settings.disclaimer}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Print and Close buttons */}
        <div className="border-t-2 bg-gray-50 dark:bg-gray-800 p-3 sticky bottom-0">
          <div className="flex gap-2">
            <Button 
              onClick={onPrint} 
              className="flex-1 gap-2 h-11 text-base font-extrabold"
              size="default"
            >
              <Printer className="w-5 h-5" />
              PRINT RECEIPT
            </Button>
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1 h-11 text-base font-extrabold"
              size="default"
            >
              CLOSE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Discount Modal
const DiscountModal = ({ isOpen, onClose, onApply, cartItems }: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { ids: string[]; itemIds: string[] }) => void;
  cartItems: CartItem[];
}) => {
  const [ids, setIds] = useState<string[]>(['']);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleAddId = () => setIds([...ids, '']);
  const handleRemoveId = (index: number) => setIds(ids.filter((_, i) => i !== index));
  const handleIdChange = (index: number, value: string) => {
    const newIds = [...ids];
    newIds[index] = value;
    setIds(newIds);
  };
  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const handleApply = () => {
    const validIds = ids.filter(id => id.trim());
    if (!validIds.length) {
      toast.error('Enter at least one ID');
      return;
    }
    if (!selectedItems.length) {
      toast.error('Select at least one item');
      return;
    }
    
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
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    onClick={() => handleRemoveId(index)} 
                    className="h-10 w-10" 
                  >
                    <Trash2 className="h-5 w-5" /> 
                  </Button>
                )}
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              size="default" 
              onClick={handleAddId} 
              className="mt-3 h-10 text-base" 
            >
              <Plus className="h-5 w-5 mr-2" />Add ID 
            </Button>
          </div>

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

// Order History Modal
const OrderHistoryModal = ({ isOpen, onClose, orders, onReprint, onViewDetails }: {
  isOpen: boolean;
  onClose: () => void;
  orders: SavedOrder[];
  onReprint: (order: SavedOrder) => void;
  onViewDetails: (order: SavedOrder) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const getDateFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today': return today;
      case 'week': return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month': return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const dateFilter = getDateFilter();
    const matchesDate = !dateFilter || new Date(order.timestamp) >= dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="w-6 h-6" />Order History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-5">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Input 
                placeholder="Search by order # or customer..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full h-10 text-base" 
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-10 text-base">
                <Filter className="w-5 h-5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base">All Status</SelectItem>
                <SelectItem value="completed" className="text-base">Completed</SelectItem>
                <SelectItem value="pending" className="text-base">Pending</SelectItem>
                <SelectItem value="cancelled" className="text-base">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(value: 'today' | 'week' | 'month' | 'all') => setDateRange(value)}>
              <SelectTrigger className="w-[80px] h-10 text-base">
                <Calendar className="w-5 h-5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today" className="text-base">Today</SelectItem>
                <SelectItem value="week" className="text-base">This Week</SelectItem>
                <SelectItem value="month" className="text-base">This Month</SelectItem>
                <SelectItem value="all" className="text-base">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto divide-y">
              {!filteredOrders.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-base">No orders found</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium text-base">{order.orderNumber}</span>
                          <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'} className="text-xs px-2 py-1">
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-base">
                          <span className="font-medium">{order.customerName}</span> • 
                          <span className="text-muted-foreground ml-2">{order.items.length} items • {formatCurrency(order.total)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />{formatDate(order.timestamp)}
                        </p>
                        {order.paymentMethod === 'cash' && order.amountPaid && (
                          <p className="text-xs text-muted-foreground">
                            Paid: {formatCurrency(order.amountPaid)} | Change: {formatCurrency(order.change || 0)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="default" variant="ghost" onClick={() => onViewDetails(order)} className="h-9 w-9">
                          <Eye className="w-5 h-5" />
                        </Button>
                        <Button size="default" variant="ghost" onClick={() => onReprint(order)} className="h-9 w-9">
                          <Printer className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-between text-base">
            <span>Total Orders: {filteredOrders.length}</span>
            <span>Total Sales: {formatCurrency(filteredOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0))}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="lg" className="text-base h-11">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Stock Alert Badge
const StockAlertsBadge = ({ alerts, show, onToggle, onRefresh }: {
  alerts: StockAlert[];
  show: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) => {
  if (!alerts.length) return null;

  const criticalCount = alerts.filter(a => a.status === 'critical').length;
  const totalAlerts = alerts.length;

  return (
    <div className="relative">
      <Button variant="outline" size="default" onClick={onToggle} className={`h-10 text-sm gap-2 ${
        criticalCount ? 'border-red-500 bg-red-50 text-red-700' : 'border-yellow-500 bg-yellow-50 text-yellow-700'
      }`}>
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Stock Alerts</span>
        <Badge className={`ml-2 h-6 px-2 text-xs ${criticalCount ? 'bg-red-600' : 'bg-yellow-600'}`}>{totalAlerts}</Badge>
      </Button>

      {show && (
        <div className="absolute right-0 mt-3 w-96 rounded-lg bg-white dark:bg-black border shadow-lg z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h4 className="font-medium text-base">Low Stock Alerts</h4>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto p-3 space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-lg ${
                alert.status === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              } border`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-base font-medium">{alert.itemName}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Stock: {alert.currentStock} {alert.unit} • Min: {alert.minStock} {alert.unit}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Location: {alert.location}</p>
                  </div>
                  <Badge className={`text-xs px-2 py-1 ${alert.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {alert.status}
                  </Badge>
                </div>
                {alert.outOfStock && (
                  <p className="text-sm text-red-600 mt-3 font-medium">⚠️ Out of stock - Reorder immediately</p> 
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Printer Status Component
const PrinterStatus = ({ settings }: PrinterStatusProps) => {
  const [customerStatus, setCustomerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [kitchenStatus, setKitchenStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const checkPrinters = async () => {
      // Simulate printer checks based on settings
      setTimeout(() => {
        setCustomerStatus(settings.customerPrinter?.enabled ? 'connected' : 'disconnected');
        setKitchenStatus(settings.kitchenPrinter?.enabled ? 'connected' : 'disconnected');
      }, 1000);
    };
    checkPrinters();
  }, [settings]);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Printer className="w-4 h-4" />
        <span>Customer:</span>
        {customerStatus === 'connected' ? (
          <Wifi className="w-4 h-4 text-green-500" /> 
        ) : customerStatus === 'checking' ? (
          <Loader2 className="w-4 h-4 animate-spin" /> 
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Utensils className="w-4 h-4" />
        <span>Kitchen:</span>
        {kitchenStatus === 'connected' ? (
          <Bluetooth className="w-4 h-4 text-blue-500" /> 
        ) : kitchenStatus === 'checking' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" /> 
        )}
      </div>
    </div>
  );
};

// ============ Main Component ============
export default function OrdersPage() {
  // Attendance Hook
  const { isClockedIn, isLoading: attendanceLoading, attendance, clockIn, clockOut } = useAttendance();

  // Sound Hook
  const { playSuccess, playError, playOrder } = useNotificationSound();

  // Receipt Settings Hook
  const { settings, isLoading: settingsLoading } = useReceiptSettings();

  // Preload sounds on mount
  useEffect(() => {
    preloadNotificationSounds();
  }, []);

  // POS State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [amountPaid, setAmountPaid] = useState(0);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('takeaway');
  const [selectedTable, setSelectedTable] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [seniorPwdIds, setSeniorPwdIds] = useState<string[]>([]);
  const [selectedMenuType, setSelectedMenuType] = useState<'food' | 'drink' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [draggedItem, setDraggedItem] = useState<Product | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSavedOrders, setShowSavedOrders] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<(SavedOrder & { cashier?: string; seniorPwdIds?: string[]; isReprint?: boolean }) | null>(null);
  const [insufficientStockItems, setInsufficientStockItems] = useState<InsufficientStockItem[]>([]);
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [splitError, setSplitError] = useState('');

  // Hooks
  const { isProcessing, checkOrderStock, processOrderDeductions, clearStockCheck } = useInventoryOrder({
    onSuccess: () => {
      fetchStockAlerts();
      playSuccess();
    },
    onError: (error: Error) => {
      toast.error('Inventory update failed', { description: error.message });
      playError();
    },
    onInsufficientStock: (items: StockCheckResult[]) => {
      setInsufficientStockItems(
        items.map(item => ({
          name: item.name,
          requiredQuantity: item.requiredQuantity,
          currentStock: item.currentStock,
          unit: item.unit,
          shortBy: item.shortBy ?? 0
        }))
      );
      setShowInsufficientStockModal(true);
      playError();
    },
    autoRollback: true
  });

  // Refs
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const cartDropZoneRef = useRef<HTMLDivElement>(null);
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);
  const [isDraggingCategory, setIsDraggingCategory] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Computed Values
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const discountTotal = useMemo(() => {
    const DISCOUNT_RATE = 0.2;
    return cart.reduce((sum, item) => 
      item.hasDiscount ? sum + item.price * item.quantity * DISCOUNT_RATE : sum, 0);
  }, [cart]);
  const total = subtotal - discountTotal;
  const seniorPwdCount = cart.filter(i => i.hasDiscount).length;
  
  // Payment validation
  const canProcessPayment = useMemo(() => {
    if (!cart.length) return false;
    
    if (paymentMethod === 'cash') {
      return amountPaid >= total;
    }
    
    if (paymentMethod === 'split') {
      const totalPaid = splitPayment.cash + splitPayment.gcash;
      return totalPaid >= total && !splitError;
    }
    
    if (paymentMethod === 'gcash') {
      return true;
    }
    
    return false;
  }, [cart.length, paymentMethod, amountPaid, total, splitPayment, splitError]);

  const categories = useMemo(() => 
    ['All', ...Array.from(new Set(products
      .filter(p => p.available && (selectedMenuType === 'all' || p.menuType === selectedMenuType))
      .map(p => p.category || 'Uncategorized')
    ))],
    [products, selectedMenuType]
  );

  const filteredProducts = useMemo(() => 
    products.filter(p => p.available && 
      (selectedMenuType === 'all' || p.menuType === selectedMenuType) &&
      (selectedCategory === 'All' || p.category === selectedCategory)
    ), [products, selectedMenuType, selectedCategory]
  );

  // Effects
  useEffect(() => {
    fetchProducts();
    loadSavedOrders();
    fetchStockAlerts();
    const interval = setInterval(fetchStockAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (paymentMethod === 'split' && total > 0) {
      setSplitPayment({ cash: total / 2, gcash: total / 2 });
    }
  }, [total, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === 'split') {
      const totalPaid = splitPayment.cash + splitPayment.gcash;
      if (Math.abs(totalPaid - total) > 0.01) {
        setSplitError(`Split amounts must equal ${formatCurrency(total)}`);
      } else {
        setSplitError('');
      }
    } else {
      setSplitError('');
    }
  }, [splitPayment, total, paymentMethod]);

  useEffect(() => {
    const checkScroll = () => {
      if (categoriesContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = categoriesContainerRef.current;
        setShowLeftScroll(scrollLeft > 10);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };
    setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  // API Calls
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/products/categories');
      const data: CategoryData[] = await res.json();
      const productsList: Product[] = [];
      data.forEach((category: CategoryData) => {
        category.products?.forEach((product: Product) => {
          productsList.push({ ...product, category: category.name, menuType: category.menuType });
        });
      });
      setProducts(productsList);
    } catch {
      toast.error('Failed to load products');
      playError();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const [criticalRes, lowStockRes] = await Promise.all([
        fetch('/api/products/stocks/alerts/critical'),
        fetch('/api/products/stocks/alerts/low-stock')
      ]);
      
      if (criticalRes.ok && lowStockRes.ok) {
        const critical = await criticalRes.json();
        const lowStock = await lowStockRes.json();
        setStockAlerts([...critical, ...lowStock]);
      }
    } catch {
      console.error('Failed to fetch stock alerts:');
    }
  };

  const loadSavedOrders = () => {
    try {
      const saved = localStorage.getItem('pos_saved_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedOrders(parsed.map((o: SavedOrder) => ({ ...o, timestamp: new Date(o.timestamp) })));
      }
    } catch {
      console.error('Failed to load saved orders');
    }
  };

  const saveOrderToLocal = (order: SavedOrder) => {
    try {
      const updated = [order, ...savedOrders].slice(0, 50);
      setSavedOrders(updated);
      localStorage.setItem('pos_saved_orders', JSON.stringify(updated));
    } catch {
      toast.error('Failed to save order');
    }
  };

  // Save order to database
  const saveOrderToDatabase = async (order: SavedOrder) => {
    try {
      console.log('Saving order to database for analytics:', order);
      
      const itemsWithRevenue = order.items.map(item => {
        const itemTotal = item.price * item.quantity;
        const discountedTotal = item.hasDiscount ? itemTotal * (1 - 0.2) : itemTotal;
        
        return {
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          hasDiscount: item.hasDiscount || false,
          discountRate: item.hasDiscount ? 0.2 : 0,
          revenue: discountedTotal,
          category: item.category,
          menuType: item.menuType,
          notes: item.notes
        };
      });

      const calculatedSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const calculatedDiscount = order.items.reduce((sum, item) => 
        item.hasDiscount ? sum + (item.price * item.quantity * 0.2) : sum, 0);
      const calculatedTotal = calculatedSubtotal - calculatedDiscount;

      const paymentData = {
        orderNumber: order.orderNumber,
        orderId: order.id,
        customerName: order.customerName || 'Walk-in Customer',
        items: itemsWithRevenue,
        subtotal: calculatedSubtotal,
        discountTotal: calculatedDiscount,
        total: calculatedTotal,
        paymentMethod: order.paymentMethod,
        splitPayment: order.splitPayment,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        orderNote: order.orderNote,
        seniorPwdCount: order.seniorPwdCount || 0,
        seniorPwdIds: seniorPwdIds,
        cashier: 'Cashier',
        cashierId: 'current-user-id',
        status: 'completed',
        amountPaid: order.amountPaid,
        change: order.change,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save payment: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Order saved to payments successfully:', result);
      
      toast.success('Order saved to database for analytics');
      return result;
      
    } catch (error) {
      console.error('Database save failed:', error);
      
      toast.warning('Order saved locally only (database unavailable)', {
        description: error instanceof Error ? error.message : 'Connection error'
      });
      
      saveOrderToLocal(order);
      return null;
    }
  };

  // Delete saved order
  const deleteSavedOrder = (orderId: string) => {
    try {
      const updated = savedOrders.filter(order => order.id !== orderId);
      setSavedOrders(updated);
      localStorage.setItem('pos_saved_orders', JSON.stringify(updated));
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete order');
    }
  };

  // Clear all saved orders
  const clearAllSavedOrders = () => {
    try {
      setSavedOrders([]);
      localStorage.removeItem('pos_saved_orders');
      toast.success('All saved orders cleared');
    } catch {
      toast.error('Failed to clear saved orders');
    }
  };

  // Cart Actions
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      return existing
        ? prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1, hasDiscount: false }];
    });
    toast.success(`${product.name} added`);
    playOrder();
  }, [playOrder]);

  const updateQuantity = useCallback((itemId: string, change: number) => {
    setCart(prev => prev
      .map(item => item._id === itemId ? { ...item, quantity: Math.max(1, item.quantity + change) } : item)
      .filter(item => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    const item = cart.find(i => i._id === itemId);
    setCart(prev => prev.filter(i => i._id !== itemId));
    if (item) {
      toast.info(`${item.name} removed`);
      playError();
    }
  }, [cart, playError]);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setAmountPaid(0);
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
    setSelectedTable('');
    setOrderNote('');
    setSeniorPwdIds([]);
    clearStockCheck();
    toast.info('Cart cleared');
  }, [clearStockCheck]);

  const applyDiscount = useCallback((data: { ids: string[]; itemIds: string[] }) => {
    setCart(prev => prev.map(item => 
      data.itemIds.includes(item._id) ? { ...item, hasDiscount: true } : item
    ));
    setSeniorPwdIds(prev => [...new Set([...prev, ...data.ids])]);
    toast.success(`Discount applied to ${data.itemIds.length} item(s)`);
    playSuccess();
  }, [playSuccess]);

  const removeDiscount = useCallback((itemId: string) => {
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, hasDiscount: false } : item
    ));
    toast.info('Discount removed');
  }, []);

  const saveOrder = useCallback(() => {
    if (!cart.length) {
      toast.error('Cart is empty');
      playError();
      return;
    }

    const newOrder: SavedOrder = {
      id: `save-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerName: customerName || 'Walk-in Customer',
      items: [...cart],
      subtotal, discountTotal, total,
      paymentMethod, splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType, tableNumber: orderType === 'dine-in' ? selectedTable : undefined,
      timestamp: new Date(), status: 'pending',
      seniorPwdCount, orderNote: orderNote || undefined,
      seniorPwdIds: seniorPwdIds
    };

    saveOrderToLocal(newOrder);
    toast.success('Order saved', { description: `#${newOrder.orderNumber}` });
    playSuccess();
  }, [cart, customerName, subtotal, discountTotal, total, paymentMethod, splitPayment, orderType, selectedTable, seniorPwdCount, orderNote, seniorPwdIds, playSuccess, playError]);

  const loadSavedOrder = useCallback((order: SavedOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName);
    setPaymentMethod(order.paymentMethod);
    if (order.splitPayment) setSplitPayment(order.splitPayment);
    if (order.amountPaid) setAmountPaid(order.amountPaid);
    setOrderType(order.orderType);
    setSelectedTable(order.tableNumber || '');
    setOrderNote(order.orderNote || '');
    setSeniorPwdIds(order.seniorPwdIds || []);
    setShowSavedOrders(false);
    toast.success('Order loaded');
    playSuccess();
  }, [playSuccess]);

  const handleReprintReceipt = (order: SavedOrder) => {
    setCurrentReceipt({
      ...order,
      cashier: 'Cashier',
      seniorPwdIds: order.seniorPwdIds || seniorPwdIds,
      isReprint: true
    });
    setShowReceipt(true);
  };

  const handleClockIn = useCallback(async () => {
    await clockIn();
    playSuccess();
  }, [clockIn, playSuccess]);

  const handleClockOut = useCallback(async () => {
    await clockOut();
    playSuccess();
  }, [clockOut, playSuccess]);

  // Print Receipt Function
  const handlePrintReceipt = useCallback(async () => {
    if (!currentReceipt || !settings) return;

    setIsPrinting(true);
    try {
      const receiptContent = document.getElementById('receipt-content');
      if (!receiptContent) return;

      const is58mm = settings.receiptWidth === '58mm';
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);

      const printDocument = iframe.contentWindow?.document;
      if (printDocument) {
        printDocument.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt - ${currentReceipt.orderNumber}</title>
              <meta charset="utf-8">
              <style>
                @page {
                  size: ${is58mm ? '58mm' : '80mm'} auto;
                  margin: 0;
                }
                
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                body {
                  font-family: 'Courier New', 'Courier', monospace;
                  font-size: ${is58mm ? '14px' : '16px'} !important;
                  font-weight: bold !important;
                  width: ${is58mm ? '58mm' : '80mm'};
                  max-width: ${is58mm ? '58mm' : '80mm'};
                  margin: 0 auto;
                  padding: 2mm;
                  background: white;
                  line-height: 1.5 !important;
                  color: black;
                }
                
                .text-center { text-align: center !important; }
                .text-left { text-align: left !important; }
                .text-right { text-align: right !important; }
                
                .text-\\[8px\\] { font-size: 12px !important; }
                .text-\\[10px\\] { font-size: 14px !important; }
                .text-xs { font-size: 14px !important; }
                .text-sm { font-size: 16px !important; }
                .text-base { font-size: 18px !important; }
                .text-lg { font-size: 20px !important; }
                .text-xl { font-size: 22px !important; }
                
                h1, h2, h3, .font-extrabold, .font-black {
                  font-size: ${is58mm ? '18px' : '20px'} !important;
                  font-weight: 900 !important;
                }
                
                .font-bold, strong, b { font-weight: 900 !important; }
                .font-extrabold { font-weight: 900 !important; }
                .font-black { font-weight: 900 !important; }
                .font-mono { font-family: 'Courier New', 'Courier', monospace; }
                
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mt-1 { margin-top: 4px; }
                .mt-2 { margin-top: 8px; }
                .mt-3 { margin-top: 12px; }
                .pl-2 { padding-left: 8px; }
                .pl-3 { padding-left: 12px; }
                
                .gap-1 { gap: 4px; }
                .gap-2 { gap: 8px; }
                
                .text-green-600 { color: #16a34a; font-weight: 900; }
                .text-gray-500 { color: #4b5563; }
                .text-gray-600 { color: #4b5563; }
                
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                
                .separator, .text-center:has(> :contains("-")) {
                  text-align: center;
                  letter-spacing: 2px;
                  font-size: 16px !important;
                  font-weight: 900;
                  margin: 6px 0;
                }
                
                .flex.justify-between {
                  font-size: ${is58mm ? '14px' : '16px'} !important;
                  margin-bottom: 4px;
                }
                
                .flex.justify-between span:first-child {
                  font-size: ${is58mm ? '14px' : '16px'} !important;
                  max-width: 70%;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                
                .flex.justify-between span:last-child {
                  font-size: ${is58mm ? '14px' : '16px'} !important;
                  font-weight: 900;
                }
                
                .font-bold.mt-1 {
                  font-size: ${is58mm ? '16px' : '18px'} !important;
                  margin-top: 8px;
                  padding-top: 4px;
                  border-top: 2px dashed #000;
                }
                
                .font-bold.mt-1 span:first-child {
                  font-size: ${is58mm ? '16px' : '18px'} !important;
                  font-weight: 900;
                }
                
                .font-bold.mt-1 span:last-child {
                  font-size: ${is58mm ? '18px' : '20px'} !important;
                  font-weight: 900;
                  color: #000;
                }
                
                .text-green-600.text-\\[8px\\] {
                  font-size: 12px !important;
                  padding-left: 8px;
                  margin-bottom: 2px;
                }
                
                .mb-1.text-\\[10px\\] {
                  font-size: ${is58mm ? '14px' : '15px'} !important;
                  line-height: 1.6;
                }
                
                .mb-1.text-\\[10px\\] div {
                  margin-bottom: 3px;
                }
                
                .mt-2.text-center.text-\\[8px\\] {
                  font-size: 12px !important;
                  margin-top: 8px;
                }
                
                .tracking-widest {
                  letter-spacing: 3px;
                  font-size: 14px !important;
                }
                
                .mt-2.text-center.text-\\[8px\\] div,
                .mt-1.text-center.text-\\[8px\\] div {
                  font-size: 12px !important;
                  line-height: 1.5;
                }
                
                .text-center.font-bold.mb-1 {
                  font-size: ${is58mm ? '18px' : '20px'} !important;
                  margin-bottom: 6px;
                }
                
                .text-center.mb-1.text-\\[10px\\] {
                  font-size: 13px !important;
                  margin-bottom: 3px;
                }
                
                @media print {
                  body {
                    width: ${is58mm ? '58mm' : '80mm'};
                    padding: 1.5mm;
                    font-size: ${is58mm ? '14px' : '16px'} !important;
                  }
                }
              </style>
            </head>
            <body>
              ${receiptContent.outerHTML}
            </body>
          </html>
        `);
        
        printDocument.close();

        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              setIsPrinting(false);
              toast.success('Receipt sent to printer');
            }, 500);
          }, 200);
        };
      }
    } catch (error) {
      console.error('Print failed:', error);
      toast.error('Failed to print receipt');
      setIsPrinting(false);
    }
  }, [currentReceipt, settings]);

  const processPayment = async () => {
    if (!cart.length) {
      toast.error('Cart is empty');
      playError();
      return;
    }
    
    // Validate payment
    if (paymentMethod === 'cash' && amountPaid < total) {
      toast.error(`Need ${formatCurrency(total - amountPaid)} more`);
      playError();
      return;
    }
    
    if (paymentMethod === 'split') {
      const totalPaid = splitPayment.cash + splitPayment.gcash;
      if (totalPaid < total) {
        toast.error(`Need ${formatCurrency(total - totalPaid)} more`);
        playError();
        return;
      }
      if (Math.abs(totalPaid - total) > 0.01) {
        toast.error(`Split amounts must equal ${formatCurrency(total)}`);
        playError();
        return;
      }
    }

    setIsCheckingStock(true);
    
    try {
      const orderNumber = generateOrderNumber();
      const orderId = `order-${Date.now()}`;
      const orderItems = cart.map(item => ({
        productId: item._id, 
        productName: item.name, 
        quantity: item.quantity, 
        ingredients: item.ingredients || []
      }));

      // Calculate change for cash payments
      const change = paymentMethod === 'cash' ? amountPaid - total : 0;

      // Check stock
      try {
        const stockCheck = await checkOrderStock(orderItems);
        if (!stockCheck.allAvailable) {
          setInsufficientStockItems(
            stockCheck.insufficientItems.map(item => ({
              ...item,
              shortBy: item.shortBy ?? 0
            }))
          );
          setShowInsufficientStockModal(true);
          setIsCheckingStock(false);
          playError();
          return;
        }

        await processOrderDeductions(orderId, orderNumber, orderItems);
      } catch {
        console.warn('Stock check failed, continuing with order:');
      }

      const completedOrder: SavedOrder = {
        id: orderId, 
        orderNumber, 
        customerName: customerName || 'Walk-in Customer',
        items: cart, 
        subtotal, 
        discountTotal, 
        total, 
        paymentMethod,
        splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
        amountPaid: paymentMethod === 'cash' ? amountPaid : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
        orderType, 
        tableNumber: orderType === 'dine-in' ? selectedTable : undefined,
        timestamp: new Date(), 
        status: 'completed', 
        seniorPwdCount, 
        orderNote: orderNote || undefined,
        cashier: 'Cashier',
        cashierId: 'current-user-id',
        seniorPwdIds: seniorPwdIds
      };

      // Save to database
      await saveOrderToDatabase(completedOrder);
      
      // Also save to local as backup
      saveOrderToLocal(completedOrder);

      // Try to print using printer settings
      if (settings?.printReceipt) {
        const receiptData: PrinterReceiptData = {
          ...completedOrder,
          cashier: 'Cashier',
          seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
          id: orderId,
          timestamp: new Date(),
          customerReceiptPrinted: false,
          kitchenReceiptPrinted: false
        };

        setIsPrinting(true);
        try {
          const printResults = await printReceipt(receiptData, settings);
          
          if (printResults.customer) {
            toast.success('Customer receipt printed');
          }
          
          if (printResults.kitchen) {
            toast.success('Kitchen order printed');
          }
        } catch {
          console.warn('Auto-print failed, showing receipt modal');
        } finally {
          setIsPrinting(false);
        }
      }

      // Show receipt modal
      setCurrentReceipt({
        ...completedOrder,
        cashier: 'Cashier',
        seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined
      });
      setShowReceipt(true);
      
      clearCart();
      toast.success('Payment successful!');
      playSuccess();
      
    } catch (error: unknown) {
      console.error('Payment process error:', error);
      
      if (error && typeof error === 'object' && 'insufficientItems' in error) {
        setInsufficientStockItems(error.insufficientItems as InsufficientStockItem[]);
        setShowInsufficientStockModal(true);
      } else {
        toast.error('Payment failed', { 
          description: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
      playError();
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleTestPrint = useCallback(() => {
    if (savedOrders.length > 0) {
      handleReprintReceipt(savedOrders[0]);
    } else {
      toast.info('No saved orders to test receipt');
    }
  }, [savedOrders, handleReprintReceipt]);

  const handlePreviewReceipt = useCallback((type: 'customer' | 'kitchen') => {
    if (!currentReceipt || !settings) return;
    
    const receiptData: PrinterReceiptData = {
      ...currentReceipt,
      cashier: currentReceipt.cashier || 'Cashier',
      id: currentReceipt.id,
      timestamp: currentReceipt.timestamp,
      customerReceiptPrinted: false,
      kitchenReceiptPrinted: false
    };
    
    previewReceipt(receiptData, settings, type);
  }, [currentReceipt, settings]);

  // Drag & Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    setDraggedItem(product);
    e.dataTransfer.setData('text/plain', product._id);
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed top-0 left-0 w-[160px] bg-card border-2 border-primary shadow-lg rounded-lg p-3';
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    dragPreview.innerHTML = `<div class="space-y-2"><div class="font-bold text-sm">${product.name}</div>
      <div class="text-xs text-muted-foreground">${product.category || 'Product'}</div>
      <div class="flex justify-between"><span class="font-bold text-sm text-primary">${formatCurrency(product.price)}</span>
      <span class="text-xs text-muted-foreground">+ Drop</span></div></div>`;
    
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 80, 45);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    cartDropZoneRef.current?.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);

  const handleDragLeave = useCallback(() => {
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    if (draggedItem) {
      addToCart(draggedItem);
      setDraggedItem(null);
    }
  }, [draggedItem, addToCart]);

  // Touch Handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, product: Product) => {
    e.preventDefault();
    setDraggedItem(product);
    
    const preview = document.createElement('div');
    preview.className = 'fixed z-50 w-[160px] bg-card border-2 border-primary shadow-lg rounded-lg p-3';
    preview.style.left = `${e.touches[0].clientX - 80}px`;
    preview.style.top = `${e.touches[0].clientY - 60}px`;
    preview.style.pointerEvents = 'none';
    preview.innerHTML = `<div class="space-y-2"><div class="font-bold text-sm">${product.name}</div>
      <div class="text-xs text-muted-foreground">${product.category || 'Product'}</div>
      <div class="flex justify-between"><span class="font-bold text-sm text-primary">${formatCurrency(product.price)}</span>
      <span class="text-xs text-muted-foreground">Release to add</span></div></div>`;
    
    document.body.appendChild(preview);
    setTouchPreview(preview);
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchPreview) {
      touchPreview.style.left = `${e.touches[0].clientX - 80}px`;
      touchPreview.style.top = `${e.touches[0].clientY - 60}px`;
    }
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (cartDropZoneRef.current?.contains(element)) {
      cartDropZoneRef.current.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    } else {
      cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    }
  }, [touchPreview]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchPreview) {
      touchPreview.remove();
      setTouchPreview(null);
    }
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (cartDropZoneRef.current?.contains(element) && draggedItem) {
      addToCart(draggedItem);
      if (window.navigator.vibrate) window.navigator.vibrate([20, 20, 20]);
    }
    
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    setDraggedItem(null);
  }, [touchPreview, draggedItem, addToCart]);

  // Category Scroll Handlers
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesContainerRef.current) {
      categoriesContainerRef.current.scrollBy({ left: direction === 'left' ? -250 : 250, behavior: 'smooth' });
    }
  };

  const handleCategoryMouseDown = useCallback((e: React.MouseEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDraggingCategory(true);
    setStartX(e.pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);

  const handleCategoryMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingCategory || !categoriesContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2.5;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDraggingCategory, startX, scrollLeft]);

  const handleCategoryMouseUp = useCallback(() => setIsDraggingCategory(false), []);
  const handleCategoryMouseLeave = useCallback(() => setIsDraggingCategory(false), []);

  // Loading state
  if (attendanceLoading || (isLoading && !products.length) || settingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-56 bg-muted rounded"></div>
            <div className="h-72 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not clocked in
  if (!isClockedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-10 text-center shadow-sm">
            <AlertTriangle className="h-20 w-20 text-yellow-600 mx-auto mb-8" />
            <h2 className="text-3xl font-bold mb-4">Clock In Required</h2>
            <p className="text-lg text-muted-foreground mb-8">
              You need to start your shift before accessing orders and POS system.
            </p>

            <Button
              onClick={handleClockIn}
              disabled={attendanceLoading}
              size="lg"
              className="w-full sm:w-auto h-12 text-base px-8" 
            >
              {attendanceLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                  Processing...
                </>
              ) : (
                "Start Shift (Clock In)"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Clocked in - Main POS Interface
  return (
    <div className="min-h-screen bg-background p-5">
      {/* Attendance Status Bar */}
      <div className="border-b bg-card sticky top-0 z-20 backdrop-blur-sm mb-5">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium text-base">On Shift</span>
              </div>

              {attendance && (
                <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span className="text-base">
                    Since {new Date(attendance.clockInTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {attendance?.status === "pending" && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-sm px-3 py-1">
                  Pending Approval
                </Badge>
              )}

              {attendance?.status === "confirmed" && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-sm px-3 py-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmed
                </Badge>
              )}
            </div>

            {/* Attendance Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="default" className="gap-2 h-10 text-sm">
                  Attendance
                  <ChevronRightIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-full sm:w-[450px] sm:max-w-[450px]">
                <SheetHeader className="mb-8">
                  <SheetTitle className="flex items-center gap-2 text-xl">
                    <Clock className="h-6 w-6 text-primary" />
                    Shift Controls
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-8">
                  <ClockInCard />

                  <Separator />

                  <div className="space-y-5">
                    {!attendance?.clockOutTime ? (
                      <Button
                        onClick={handleClockOut}
                        disabled={attendanceLoading}
                        variant="destructive"
                        size="lg"
                        className="w-full h-12 text-base" 
                      >
                        {attendanceLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Ending shift…
                          </>
                        ) : (
                          "Clock Out – End Shift"
                        )}
                      </Button>
                    ) : (
                      <div className="text-center text-muted-foreground py-5 text-base">
                        Shift completed
                      </div>
                    )}

                    <p className="text-sm text-center text-muted-foreground">
                      Remember to clock out at the end of your shift.
                      {attendance?.status === "pending" && (
                        <span className="block mt-2 text-yellow-700">
                          Your current attendance is awaiting manager approval.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* POS Header */}
        <header className="bg-card rounded-xl shadow-sm p-6 mb-5 border">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShoppingCart className="h-8 w-8" />
                POS System / Orders
              </h1>
              <p className="text-sm text-muted-foreground mt-2">Swipe categories • Drag items to cart</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Printer Status */}
              {settings && <PrinterStatus settings={settings} />}
              
              {/* Stock Alerts Badge */}
              <StockAlertsBadge 
                alerts={stockAlerts} 
                show={showStockAlerts} 
                onToggle={() => setShowStockAlerts(!showStockAlerts)} 
                onRefresh={fetchStockAlerts}
              />
              
              {/* Order History Button */}
              <Button variant="outline" size="default" onClick={() => setShowOrderHistory(true)} className="h-10 text-sm gap-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              
              {/* Saved Orders Button */}
              <Button variant="outline" size="default" onClick={() => setShowSavedOrders(!showSavedOrders)} className="h-10 text-sm gap-2">
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Saved ({savedOrders.length})</span>
              </Button>

              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-base py-2">Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowOrderHistory(true)} className="text-base py-2">
                    <History className="w-5 h-5 mr-3" />View History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchStockAlerts} className="text-base py-2">
                    <RefreshCw className="w-5 h-5 mr-3" />Refresh Stock
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleTestPrint} className="text-base py-2">
                    <Printer className="w-5 h-5 mr-3" />Test Print Receipt
                  </DropdownMenuItem>
                  {currentReceipt && (
                    <>
                      <DropdownMenuItem onClick={() => handlePreviewReceipt('customer')} className="text-base py-2">
                        <Eye className="w-5 h-5 mr-3" />Preview Customer Receipt
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewReceipt('kitchen')} className="text-base py-2">
                        <Utensils className="w-5 h-5 mr-3" />Preview Kitchen Order
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main POS Layout */}
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-220px)]">
          {/* Left Panel - Products */}
          <div className="lg:w-7/12 flex flex-col h-full">
            {/* Menu Type Filter */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {(['all', 'food', 'drink'] as const).map(type => (
                <Button key={type} variant={selectedMenuType === type ? 'default' : 'outline'}
                  onClick={() => { setSelectedMenuType(type); setSelectedCategory('All'); }} 
                  className="h-11 text-base">
                  {type === 'food' && <Utensils className="w-4 h-4 mr-2" />}
                  {type === 'drink' && <Coffee className="w-4 h-4 mr-2" />}
                  {type === 'all' ? 'All' : type}
                </Button>
              ))}
            </div>

            {/* Categories */}
            <div className="mb-5 relative">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Categories</Label>
                <span className="text-xs text-muted-foreground">← Swipe →</span>
              </div>
              
              <div className="relative group">
                {showLeftScroll && (
                  <Button variant="secondary" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('left')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                
                <div ref={categoriesContainerRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-2 py-1 select-none"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', cursor: isDraggingCategory ? 'grabbing' : 'grab' }}
                  onMouseDown={handleCategoryMouseDown}
                  onMouseMove={handleCategoryMouseMove}
                  onMouseUp={handleCategoryMouseUp}
                  onMouseLeave={handleCategoryMouseLeave}>
                  {categories.map(cat => (
                    <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'}
                      onClick={() => !isDraggingCategory && setSelectedCategory(cat)} 
                      className="whitespace-nowrap text-sm shrink-0 px-4 py-2 h-10">
                      {cat}
                    </Button>
                  ))}
                </div>
                
                {showRightScroll && (
                  <Button variant="secondary" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('right')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <div className="overflow-y-auto flex-1 pr-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin mr-3" />Loading...</div> 
              ) : !filteredProducts.length ? (
                <div className="text-center py-10 text-muted-foreground text-base">No products found</div> 
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map(product => (
                    <Card key={product._id} className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing touch-none ${
                      draggedItem?._id === product._id ? 'opacity-50 scale-95' : ''
                    }`} draggable onDragStart={(e) => handleDragStart(e, product)}
                      onDragEnd={() => setDraggedItem(null)}
                      onTouchStart={(e) => handleTouchStart(e, product)} 
                      onTouchMove={handleTouchMove} 
                      onTouchEnd={handleTouchEnd}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-sm line-clamp-2 flex-1">{product.name}</h3>
                            <GripVertical className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                          </div>
                          <Badge variant="outline" className="text-xs px-2 py-1 h-5">{product.category}</Badge>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {product.description || product.ingredients?.map(i => i.name).join(', ')}
                          </p>
                          <span className="font-bold text-sm text-primary">{formatCurrency(product.price)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="lg:w-5/12 h-full flex gap-3">
            <div ref={cartDropZoneRef} className="flex-1 transition-all" 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave} 
              onDrop={handleDrop}>
              <Card className="h-full flex flex-col border">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="w-5 h-5" />Current Order ({cart.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="default" onClick={() => setShowDiscountModal(true)} 
                        disabled={!cart.length || isProcessing || isCheckingStock || isPrinting} 
                        className="h-9 text-sm px-3">
                        <Percent className="w-4 h-4 mr-2" />Discount
                      </Button>
                      <Button variant="outline" size="default" onClick={clearCart} disabled={!cart.length || isProcessing || isCheckingStock || isPrinting} 
                        className="h-9 w-9 p-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {!cart.length && (
                    <div className="mt-2 p-3 border border-dashed rounded text-center bg-muted/30">
                      <p className="text-sm text-muted-foreground">↓ Drop products here ↓</p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-0">
                  {/* Discount Summary */}
                  {seniorPwdCount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-700 mb-2">Senior/PWD Discount Applied:</p>
                      <p className="text-xs text-green-600">{seniorPwdCount} item(s) with 20% discount</p>
                    </div>
                  )}

                  {/* Order Type */}
                  <div>
                    <Label className="text-sm">Order Type</Label>
                    <div className="flex gap-2 mt-2">
                      {(['dine-in', 'takeaway'] as const).map(type => (
                        <Button key={type} variant={orderType === type ? 'default' : 'outline'}
                          onClick={() => setOrderType(type)} className="flex-1 h-9 text-sm" disabled={isProcessing || isCheckingStock || isPrinting}>
                          {type === 'dine-in' ? 'Dine In' : 'Take Away'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Cart Items */}
                  <div>
                    <Label className="text-sm">Items</Label>
                    <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                      {cart.map(item => {
                        const discountedPrice = item.price * (1 - 0.2);
                        return (
                          <div key={item._id} className="flex flex-col p-2 border rounded">
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  {item.hasDiscount && <Badge variant="default" className="text-[10px] h-5 px-2 bg-green-600">20% OFF</Badge>}
                                </div>
                                <div className="flex items-center gap-3">
                                  {item.hasDiscount ? (
                                    <>
                                      <p className="text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</p>
                                      <p className="text-xs text-green-600 font-bold">{formatCurrency(discountedPrice)}</p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <Button size="default" variant="outline" onClick={() => updateQuantity(item._id, -1)} 
                                  className="h-8 w-8 p-0" disabled={isProcessing || isCheckingStock || isPrinting}>
                                  <Minus className="w-3.5 h-3.5" />
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                <Button size="default" variant="outline" onClick={() => updateQuantity(item._id, 1)} 
                                  className="h-8 w-8 p-0" disabled={isProcessing || isCheckingStock || isPrinting}>
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                                {item.hasDiscount && (
                                  <Button size="default" variant="outline" onClick={() => removeDiscount(item._id)} 
                                    className="h-8 w-8 p-0 text-yellow-600" disabled={isProcessing || isCheckingStock || isPrinting}>
                                    <Percent className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button size="default" variant="destructive" onClick={() => removeFromCart(item._id)} 
                                  className="h-8 w-8 p-0" disabled={isProcessing || isCheckingStock || isPrinting}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discountTotal > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount:</span>
                          <span>-{formatCurrency(discountTotal)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div>
                    <Label className="text-sm">Payment</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(['cash', 'gcash', 'split'] as const).map(method => (
                        <Button key={method} variant={paymentMethod === method ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod(method)} className="h-9 text-sm" disabled={isProcessing || isCheckingStock || isPrinting}>
                          {method === 'cash' && <DollarSign className="w-4 h-4 mr-2" />}
                          {method === 'gcash' && <Smartphone className="w-4 h-4 mr-2" />}
                          {method === 'split' && <Receipt className="w-4 h-4 mr-2" />}
                          {method === 'cash' ? 'Cash' : method === 'gcash' ? 'GCash' : 'Split'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Input with Receipt-style Change Display */}
                  {paymentMethod === 'cash' && (
                    <CashPaymentInput
                      total={total}
                      amountPaid={amountPaid}
                      setAmountPaid={setAmountPaid}
                      disabled={isProcessing || isCheckingStock || isPrinting}
                    />
                  )}

                  {/* Split Payment Input */}
                  {paymentMethod === 'split' && (
                    <SplitPaymentInput
                      total={total}
                      splitPayment={splitPayment}
                      setSplitPayment={setSplitPayment}
                      disabled={isProcessing || isCheckingStock || isPrinting}
                    />
                  )}

                  {/* GCash Note */}
                  {paymentMethod === 'gcash' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        GCash payment of {formatCurrency(total)} will be processed.
                      </p>
                    </div>
                  )}

                  {/* Customer Info */}
                  <Input placeholder="Customer name (optional)" value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} className="h-10 text-sm"
                    disabled={isProcessing || isCheckingStock || isPrinting} />
                  <Input placeholder="Order notes" value={orderNote} 
                    onChange={(e) => setOrderNote(e.target.value)} className="h-10 text-sm"
                    disabled={isProcessing || isCheckingStock || isPrinting} />
                  
                  {orderType === 'dine-in' && (
                    <Input placeholder="Table number" value={selectedTable} 
                      onChange={(e) => setSelectedTable(e.target.value)} className="h-10 text-sm"
                      disabled={isProcessing || isCheckingStock || isPrinting} />
                  )}

                  {/* Pay Button */}
                  <Button 
                    onClick={processPayment} 
                    disabled={!cart.length || isProcessing || isCheckingStock || isPrinting || settingsLoading || !canProcessPayment} 
                    className="w-full h-12 text-base font-semibold" 
                    size="lg"
                    variant={canProcessPayment ? 'default' : 'secondary'}
                  >
                    {isProcessing || isCheckingStock ? (
                      <><RefreshCw className="w-5 h-5 mr-3 animate-spin" />{isCheckingStock ? 'Checking Stock...' : 'Processing...'}</>
                    ) : isPrinting ? (
                      <><Printer className="w-5 h-5 mr-3 animate-pulse" />Printing...</>
                    ) : (
                      <>
                        <Receipt className="w-5 h-5 mr-3" />
                        {paymentMethod === 'cash' && amountPaid >= total 
                          ? `Pay & Change: ₱${(amountPaid - total).toFixed(2)}` 
                          : paymentMethod === 'split' && (splitPayment.cash + splitPayment.gcash) >= total
                          ? `Pay (Split)`
                          : `Pay ${formatCurrency(total)}`}
                      </>
                    )}
                  </Button>

                  {/* Payment Status */}
                  {paymentMethod === 'cash' && amountPaid > 0 && amountPaid < total && (
                    <p className="text-xs text-red-500 text-center">
                      Need {formatCurrency(total - amountPaid)} more
                    </p>
                  )}
                  {paymentMethod === 'split' && (splitPayment.cash + splitPayment.gcash) > 0 && 
                   (splitPayment.cash + splitPayment.gcash) < total && (
                    <p className="text-xs text-red-500 text-center">
                      Need {formatCurrency(total - (splitPayment.cash + splitPayment.gcash))} more
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Side Buttons */}
            <div className="flex flex-col gap-3 w-12">
              <Button onClick={saveOrder} disabled={!cart.length || isProcessing || isCheckingStock || isPrinting} 
                variant="default" size="icon" className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg" title="Save Order">
                <Save className="h-5 w-5" />
              </Button>
              <Button onClick={() => setShowSavedOrders(!showSavedOrders)} variant="outline" size="icon" 
                className="h-12 w-12 rounded-full" title="Saved Orders">
                <History className="h-5 w-5" />
              </Button>
              <Button onClick={fetchStockAlerts} variant="outline" size="icon" 
                className="h-12 w-12 rounded-full" title="Refresh Stock Alerts">
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Shift Reminder */}
        <div className="mt-8 bg-muted/40 border rounded-lg p-5 text-base">
          <p className="font-medium mb-2 flex items-center gap-3">
            <Clock className="h-5 w-5" />
            Quick reminder
          </p>
          <p className="text-muted-foreground">
            Please clock out when your shift ends.{" "}
            {attendance?.status === "pending" && "Your current shift is still pending approval."}
          </p>
        </div>
      </div>

      {/* Saved Orders Panel */}
      {showSavedOrders && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-5 border-b flex justify-between items-center">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Save className="w-5 h-5" />Saved Orders ({savedOrders.length})
            </h3>
            <div className="flex items-center gap-2">
              {savedOrders.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="default" 
                  onClick={clearAllSavedOrders}
                  className="h-9 text-sm px-3" 
                >
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowSavedOrders(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!savedOrders.length ? (
              <div className="text-center py-10 text-muted-foreground">
                <Save className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-base">No saved orders</p>
              </div>
            ) : (
              savedOrders.map(order => (
                <Card key={order.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-mono font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(order.timestamp)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs px-2 py-1">{order.status}</Badge>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{order.customerName}</p>
                      {order.seniorPwdCount && order.seniorPwdCount > 0 && (
                        <p className="text-green-600 text-xs">
                          Senior/PWD: {order.seniorPwdCount} item(s)
                        </p>
                      )}
                      <p className="text-muted-foreground">{order.items.length} items • {formatCurrency(order.total)}</p>
                      {order.paymentMethod === 'cash' && order.amountPaid && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Paid: {formatCurrency(order.amountPaid)} | Change: {formatCurrency(order.change || 0)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button size="default" variant="default" className="h-9 text-sm flex-1" onClick={() => loadSavedOrder(order)} disabled={isProcessing || isCheckingStock || isPrinting}>
                        Load
                      </Button>
                      <Button size="default" variant="outline" className="h-9 w-9 p-0" onClick={() => handleReprintReceipt(order)} title="Reprint" disabled={isPrinting}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="default" variant="destructive" className="h-9 w-9 p-0" onClick={() => deleteSavedOrder(order.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <DiscountModal isOpen={showDiscountModal} onClose={() => setShowDiscountModal(false)} onApply={applyDiscount} cartItems={cart} />
      
      <OrderHistoryModal 
        isOpen={showOrderHistory} 
        onClose={() => setShowOrderHistory(false)} 
        orders={savedOrders} 
        onReprint={handleReprintReceipt} 
        onViewDetails={(order) => {
          setCurrentReceipt({
            ...order,
            cashier: order.cashier || 'Cashier',
            seniorPwdIds: order.seniorPwdIds
          });
          setShowReceipt(true);
        }} 
      />
      
      {showReceipt && settings && (
        <ReceiptModal 
          receipt={currentReceipt} 
          settings={settings}
          onClose={() => setShowReceipt(false)} 
          onPrint={handlePrintReceipt}
        />
      )}

      {/* Insufficient Stock Modal */}
      {showInsufficientStockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-xl rounded-lg bg-white dark:bg-black border p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100"><PackageX className="h-8 w-8 text-red-600" /></div>
              <div><h3 className="text-2xl font-semibold">Insufficient Stock</h3><p className="text-base text-gray-600">Some items cannot be fulfilled</p></div>
            </div>
            
            <div className="mb-8 max-h-80 overflow-y-auto space-y-4">
              {insufficientStockItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-base">{item.name}</p>
                      <p className="text-sm">Required: {item.requiredQuantity} {item.unit}</p>
                      <p className="text-sm">Available: {item.currentStock} {item.unit}</p>
                    </div>
                    <span className="text-base font-medium text-red-600">Short: {item.shortBy} {item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => { setShowInsufficientStockModal(false); setInsufficientStockItems([]); }} 
                size="lg" className="text-base h-11 px-5">Close</Button>
              <Button variant="destructive" onClick={() => {
                const names = new Set(insufficientStockItems.map((i: InsufficientStockItem) => i.name));
                setCart(prev => prev.filter(item => !item.ingredients?.some(ing => names.has(ing.name))));
                setShowInsufficientStockModal(false);
                setInsufficientStockItems([]);
                toast.info('Removed unavailable items');
              }} size="lg" className="text-base h-11 px-5">Remove Unavailable</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}