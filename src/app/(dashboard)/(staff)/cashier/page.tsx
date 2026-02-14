'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, Plus, Minus, Trash2,
  DollarSign, Smartphone, Receipt,
  X, Loader2, Utensils, Coffee,
  ChevronLeft, ChevronRight, GripVertical,
  Save, History, PackageX, RefreshCw, Bell,
  Printer, Download, CheckCircle, Percent,
  User, Users, Menu, FileText, Search,
  Filter, ArrowLeft, ArrowRight, Clock,
  Calendar, MoreVertical, Edit, Copy,
  AlertCircle, Check, Archive, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryOrder } from '@/hooks/useInventoryOrder';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Types
interface Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  ingredients: { name: string; quantity: string; unit: string }[];
  available: boolean;
  category?: string;
  menuType?: 'food' | 'drink';
}

interface CartItem extends Product {
  quantity: number;
  notes?: string;
  hasDiscount?: boolean;
  discountType?: 'senior' | 'pwd' | 'none';
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
  seniorCount?: number;
  pwdCount?: number;
  orderNote?: string;
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

// Enhanced Receipt Component with Print Options
interface ReceiptData {
  orderNumber: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: string;
  splitPayment?: { cash: number; gcash: number };
  orderType: string;
  tableNumber?: string;
  timestamp: Date;
  cashier: string;
  seniorIds?: string[];
  pwdIds?: string[];
  seniorCount?: number;
  pwdCount?: number;
  orderNote?: string;
  isReprint?: boolean;
}

const ReceiptModal = ({ receipt, onClose, onPrint, onSavePDF }: { 
  receipt: ReceiptData | null; 
  onClose: () => void;
  onPrint: () => void;
  onSavePDF?: () => void;
}) => {
  if (!receipt) return null;

  const itemsWithDiscount = receipt.items.filter(item => item.hasDiscount);
  const itemsWithoutDiscount = receipt.items.filter(item => !item.hasDiscount);

  // Print without saving to database (for menu printing)
  const handlePrintOnly = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${receipt.orderNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
              .text-center { text-align: center; }
              .border-bottom { border-bottom: 1px dashed #000; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .font-bold { font-weight: bold; }
              .mt-2 { margin-top: 8px; }
              .mb-2 { margin-bottom: 8px; }
              .pt-2 { padding-top: 8px; }
              .pb-2 { padding-bottom: 8px; }
              .text-xs { font-size: 10px; }
              .text-green-600 { color: #059669; }
              .line-through { text-decoration: line-through; }
              @media print {
                body { width: 100%; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
            <div style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin: 0 5px;">
                Print Receipt
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin: 0 5px;">
                Close
              </button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-xl">
        {/* Receipt Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {receipt.isReprint ? 'Reprint Receipt' : 'Receipt'} #{receipt.orderNumber}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 h-4" />
          </Button>
        </div>

        {/* Receipt Content - Printable Area */}
        <div id="receipt-content" className="p-4 space-y-3 font-mono text-xs">
          {/* Store Info */}
          <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-700 pb-2">
            <h4 className="font-bold text-sm">YOUR STORE NAME</h4>
            <p className="text-[10px]">123 Main Street, City</p>
            <p className="text-[10px]">Tel: (123) 456-7890</p>
            <p className="text-[10px]">VAT Reg TIN: 123-456-789-000</p>
          </div>

          {/* Receipt Details */}
          <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-2">
            <div className="flex justify-between">
              <span>Order #:</span>
              <span className="font-medium">{receipt.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(receipt.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{receipt.cashier}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{receipt.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Type:</span>
              <span className="capitalize">{receipt.orderType}</span>
            </div>
            {receipt.tableNumber && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span>{receipt.tableNumber}</span>
              </div>
            )}
            {receipt.orderNote && (
              <div className="flex justify-between">
                <span>Notes:</span>
                <span className="italic">{receipt.orderNote}</span>
              </div>
            )}
          </div>

          {/* Items without Discount */}
          {itemsWithoutDiscount.length > 0 && (
            <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-2">
              <div className="grid grid-cols-12 gap-1 font-bold mb-1">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {itemsWithoutDiscount.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 text-[10px]">
                  <div className="col-span-6 truncate">{item.name}</div>
                  <div className="col-span-2 text-right">{item.quantity}</div>
                  <div className="col-span-2 text-right">₱{item.price.toFixed(2)}</div>
                  <div className="col-span-2 text-right">₱{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Items with Discount */}
          {itemsWithDiscount.length > 0 && (
            <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-2">
              <div className="text-[10px] font-bold text-green-600 dark:text-green-500 mb-1">
                *** WITH 20% DISCOUNT ***
              </div>
              <div className="grid grid-cols-12 gap-1 font-bold mb-1">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {itemsWithDiscount.map((item, idx) => {
                const discountedPrice = item.price * 0.8;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-1 text-[10px]">
                    <div className="col-span-6 truncate">{item.name}</div>
                    <div className="col-span-2 text-right">{item.quantity}</div>
                    <div className="col-span-2 text-right">
                      <span className="line-through text-[8px]">₱{item.price.toFixed(2)}</span>
                      <br />
                      <span className="text-green-600">₱{discountedPrice.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 text-right">₱{(discountedPrice * item.quantity).toFixed(2)}</div>
                  </div>
                );
              })}
              
              {/* Discount Summary */}
              <div className="mt-2 text-[10px] text-green-600 dark:text-green-500">
                <div className="flex justify-between">
                  <span>Total Discount on SC/PWD Items:</span>
                  <span>-₱{(receipt.subtotal - (receipt.total + receipt.discountTotal)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{receipt.subtotal.toFixed(2)}</span>
            </div>
            
            {/* Discount Total */}
            {receipt.discountTotal > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-500">
                <span>Total Discount:</span>
                <span>-₱{receipt.discountTotal.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>TOTAL:</span>
              <span className="text-primary">₱{receipt.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Beneficiaries Info */}
          {(receipt.seniorCount || receipt.pwdCount) && (
            <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-2 text-[8px]">
              {receipt.seniorCount ? (
                <p>Senior Citizens: {receipt.seniorCount} {receipt.seniorIds?.length ? `(IDs: ${receipt.seniorIds.join(', ')})` : ''}</p>
              ) : null}
              {receipt.pwdCount ? (
                <p>PWD: {receipt.pwdCount} {receipt.pwdIds?.length ? `(IDs: ${receipt.pwdIds.join(', ')})` : ''}</p>
              ) : null}
            </div>
          )}

          {/* Payment Details */}
          <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-2">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="capitalize">{receipt.paymentMethod}</span>
            </div>
            {receipt.paymentMethod === 'split' && receipt.splitPayment && (
              <>
                <div className="flex justify-between text-[10px] pl-2">
                  <span>- Cash:</span>
                  <span>₱{receipt.splitPayment.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] pl-2">
                  <span>- GCash:</span>
                  <span>₱{receipt.splitPayment.gcash.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>₱{receipt.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change:</span>
              <span>₱0.00</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] space-y-1">
            <p>Thank you for your patronage!</p>
            <p>This serves as your official receipt</p>
            {receipt.discountTotal > 0 && (
              <p className="text-[9px] font-bold">*** With 20% Senior/PWD Discount on selected items ***</p>
            )}
            {receipt.isReprint && (
              <p className="text-[9px] font-bold text-red-500">*** REPRINTED RECEIPT ***</p>
            )}
            <p className="text-[8px]">Generated by POS System v1.0</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <Button
            onClick={onPrint}
            className="flex-1 gap-2"
            variant="default"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
          {onSavePDF && (
            <Button
              onClick={onSavePDF}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Download className="w-4 h-4" />
              Save PDF
            </Button>
          )}
          <Button
            onClick={onClose}
            className="flex-1"
            variant="outline"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Discount Modal Component
interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { type: 'senior' | 'pwd'; ids: string[]; itemIds: string[] }) => void;
  cartItems: CartItem[];
}

const DiscountModal = ({ isOpen, onClose, onApply, cartItems }: DiscountModalProps) => {
  const [discountType, setDiscountType] = useState<'senior' | 'pwd'>('senior');
  const [ids, setIds] = useState<string[]>(['']);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleAddId = () => {
    setIds([...ids, '']);
  };

  const handleRemoveId = (index: number) => {
    const newIds = ids.filter((_, i) => i !== index);
    setIds(newIds);
  };

  const handleIdChange = (index: number, value: string) => {
    const newIds = [...ids];
    newIds[index] = value;
    setIds(newIds);
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleApply = () => {
    const validIds = ids.filter(id => id.trim() !== '');
    
    if (validIds.length === 0) {
      toast.error('Please enter at least one ID');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    onApply({
      type: discountType,
      ids: validIds,
      itemIds: selectedItems
    });

    setDiscountType('senior');
    setIds(['']);
    setSelectedItems([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Senior/PWD Discount</DialogTitle>
          <DialogDescription>
            Select which items are for Senior Citizen or PWD and enter their IDs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={discountType === 'senior' ? 'default' : 'outline'}
                onClick={() => setDiscountType('senior')}
                className="flex-1"
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                Senior Citizen
              </Button>
              <Button
                type="button"
                variant={discountType === 'pwd' ? 'default' : 'outline'}
                onClick={() => setDiscountType('pwd')}
                className="flex-1"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                PWD
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{discountType === 'senior' ? 'Senior Citizen' : 'PWD'} ID Numbers</Label>
            {ids.map((id, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`ID #${index + 1}`}
                  value={id}
                  onChange={(e) => handleIdChange(index, e.target.value)}
                  className="flex-1"
                />
                {ids.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveId(index)}
                    className="h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddId}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another ID
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Select Items for Discount</Label>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedItems.includes(item._id)
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleToggleItem(item._id)}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} • ₱{item.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₱{(item.price * item.quantity).toFixed(2)}</p>
                    {selectedItems.includes(item._id) && (
                      <Badge variant="default" className="text-[10px] mt-1">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedItems.length} item(s)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Menu Printing Component
interface MenuPrintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const MenuPrintingModal = ({ isOpen, onClose, products }: MenuPrintingModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMenuType, setSelectedMenuType] = useState<'food' | 'drink' | 'all'>('all');
  const [includePrices, setIncludePrices] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState<'80mm' | 'A4'>('80mm');

  const categories = ['All', ...Array.from(new Set(
    products
      .filter(p => p.available && (selectedMenuType === 'all' || p.menuType === selectedMenuType))
      .map(p => p.category || 'Uncategorized')
  ))];

  const filteredProducts = products.filter(product => {
    if (!product.available) return false;
    if (selectedMenuType !== 'all' && product.menuType !== selectedMenuType) return false;
    if (selectedCategory !== 'All' && product.category !== selectedCategory) return false;
    return true;
  });

  const handlePrintMenu = () => {
    const printContent = document.getElementById('menu-print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Menu - ${selectedCategory}</title>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                ${paperSize === '80mm' ? 'width: 80mm; margin: 0 auto;' : 'max-width: 210mm; margin: 0 auto;'} 
                padding: 10px; 
              }
              .header { text-align: center; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: ${paperSize === '80mm' ? '14px' : '24px'}; }
              .header p { margin: 5px 0; font-size: ${paperSize === '80mm' ? '10px' : '14px'}; }
              .category { 
                font-size: ${paperSize === '80mm' ? '12px' : '18px'}; 
                font-weight: bold; 
                border-bottom: 1px solid #000; 
                margin-top: 15px; 
                padding-bottom: 5px; 
              }
              .product { 
                display: flex; 
                justify-content: space-between; 
                margin: 8px 0; 
                font-size: ${paperSize === '80mm' ? '10px' : '14px'}; 
              }
              .product-info { flex: 1; }
              .product-name { font-weight: bold; }
              .product-description { 
                font-size: ${paperSize === '80mm' ? '8px' : '12px'}; 
                color: #666; 
                margin-top: 2px; 
              }
              .product-price { font-weight: bold; white-space: nowrap; }
              .footer { 
                text-align: center; 
                margin-top: 20px; 
                font-size: ${paperSize === '80mm' ? '8px' : '12px'}; 
                border-top: 1px dashed #000; 
                padding-top: 10px; 
              }
              .grid-2 { 
                display: grid; 
                grid-template-columns: repeat(2, 1fr); 
                gap: 10px; 
              }
              @media print {
                body { width: 100%; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${Array(copies).fill(printContent.outerHTML).join('<div style="page-break-after: always;"></div>')}
            <div style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                Print Menu
              </button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const groupByCategory = (products: Product[]) => {
    const grouped: { [key: string]: Product[] } = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(product);
    });
    return grouped;
  };

  const groupedProducts = groupByCategory(filteredProducts);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Print Menu
          </DialogTitle>
          <DialogDescription>
            Configure and print your menu. This will not affect orders or inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Print Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paper Size</Label>
              <Select value={paperSize} onValueChange={(value: any) => setPaperSize(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">Thermal Paper (80mm)</SelectItem>
                  <SelectItem value="A4">A4 Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Copies</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Menu Type Filter */}
          <div className="space-y-2">
            <Label>Menu Type</Label>
            <div className="flex gap-2">
              {(['all', 'food', 'drink'] as const).map((type) => (
                <Button
                  key={type}
                  variant={selectedMenuType === type ? "default" : "outline"}
                  onClick={() => {
                    setSelectedMenuType(type);
                    setSelectedCategory('All');
                  }}
                  className="flex-1"
                >
                  {type === 'food' && <Utensils className="w-4 h-4 mr-2" />}
                  {type === 'drink' && <Coffee className="w-4 h-4 mr-2" />}
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Options */}
          <div className="space-y-2">
            <Label>Content Options</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includePrices}
                  onChange={(e) => setIncludePrices(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Include Prices</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeDescriptions}
                  onChange={(e) => setIncludeDescriptions(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Include Descriptions</span>
              </label>
            </div>
          </div>

          {/* Menu Preview */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <div className="text-sm font-medium mb-2">Preview ({filteredProducts.length} items)</div>
            <div id="menu-print-content" className="space-y-3">
              <div className="header text-center">
                <h1 className={`font-bold ${paperSize === '80mm' ? 'text-sm' : 'text-xl'}`}>
                  OUR MENU
                </h1>
                <p className="text-xs text-gray-600">
                  {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                  {selectedMenuType !== 'all' && ` • ${selectedMenuType}`}
                </p>
                <p className="text-xs">Valid as of {new Date().toLocaleDateString()}</p>
              </div>

              {Object.entries(groupedProducts).map(([category, items]) => (
                <div key={category} className="mb-4">
                  <div className={`category ${paperSize === '80mm' ? 'text-sm' : 'text-lg'}`}>
                    {category}
                  </div>
                  <div className={paperSize === '80mm' ? '' : 'grid grid-cols-2 gap-2'}>
                    {items.map(product => (
                      <div key={product._id} className="product">
                        <div className="product-info">
                          <span className="product-name text-sm">{product.name}</span>
                          {includeDescriptions && product.description && (
                            <div className="product-description text-xs text-gray-600">
                              {product.description}
                            </div>
                          )}
                          {!includeDescriptions && product.ingredients?.length > 0 && (
                            <div className="product-description text-xs text-gray-600">
                              {product.ingredients.map(i => i.name).join(', ')}
                            </div>
                          )}
                        </div>
                        {includePrices && (
                          <span className="product-price text-sm">
                            ₱{product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="footer text-xs text-gray-500">
                <p>Thank you for dining with us!</p>
                <p>Prices are subject to change without prior notice.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePrintMenu} className="gap-2">
            <Printer className="w-4 h-4" />
            Print Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Order History Component
interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SavedOrder[];
  onReprint: (order: SavedOrder) => void;
  onViewDetails: (order: SavedOrder) => void;
}

const OrderHistoryModal = ({ isOpen, onClose, orders, onReprint, onViewDetails }: OrderHistoryModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const getDateFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return today;
      case 'week':
        return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    const dateFilter = getDateFilter();
    const matchesDate = !dateFilter || new Date(order.timestamp) >= dateFilter;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Order History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by order # or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No orders found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{order.orderNumber}</span>
                            <Badge variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">{order.customerName}</span> • 
                            <span className="text-muted-foreground ml-1">
                              {order.items.length} items • ₱{order.total.toFixed(2)}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.timestamp)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewDetails(order)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onReprint(order)}
                            title="Reprint Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-between text-sm">
            <span>Total Orders: {filteredOrders.length}</span>
            <span>
              Total Sales: ₱{filteredOrders
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.total, 0)
                .toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CashierPage = () => {
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  
  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('takeaway');
  const [selectedTable, setSelectedTable] = useState<string>('');
  
  // Discount State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [seniorIds, setSeniorIds] = useState<string[]>([]);
  const [pwdIds, setPwdIds] = useState<string[]>([]);
  
  // UI State
  const [selectedMenuType, setSelectedMenuType] = useState<'food' | 'drink' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [draggedItem, setDraggedItem] = useState<Product | null>(null);
  const [showSavedOrders, setShowSavedOrders] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showMenuPrinting, setShowMenuPrinting] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  
  // Inventory State
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [showStockAlerts, setShowStockAlerts] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [insufficientStockItems, setInsufficientStockItems] = useState<any[]>([]);
  
  // Receipt State
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<SavedOrder | null>(null);
  
  // Categories scroll ref and touch state
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Drop zone ref
  const cartDropZoneRef = useRef<HTMLDivElement>(null);
  const [touchPreview, setTouchPreview] = useState<HTMLDivElement | null>(null);

  // Initialize inventory order hook
  const {
    isProcessing: isInventoryProcessing,
    isChecking,
    checkOrderStock,
    processOrderDeductions,
    insufficientItems,
    clearStockCheck
  } = useInventoryOrder({
    onSuccess: (result) => {
      console.log('Inventory updated successfully:', result);
      fetchStockAlerts();
    },
    onError: (error) => {
      console.error('Inventory update failed:', error);
      toast.error('Failed to update inventory', {
        description: error.message
      });
    },
    onInsufficientStock: (items) => {
      setInsufficientStockItems(items);
      setShowInsufficientStockModal(true);
    },
    autoRollback: true
  });

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountTotal = cart.reduce((sum, item) => {
    if (item.hasDiscount) {
      return sum + (item.price * item.quantity * 0.20);
    }
    return sum;
  }, 0);

  const total = subtotal - discountTotal;

  const seniorCount = cart.filter(item => item.hasDiscount && item.discountType === 'senior').length;
  const pwdCount = cart.filter(item => item.hasDiscount && item.discountType === 'pwd').length;

  const generateOrderNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${year}${month}${day}-${random}`;
  }, []);

  const fetchStockAlerts = useCallback(async () => {
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
    } catch (error) {
      console.error('Failed to fetch stock alerts:', error);
    }
  }, []);

  useEffect(() => {
    const loadSavedOrders = () => {
      try {
        const saved = localStorage.getItem('pos_saved_orders');
        if (saved) {
          const parsed: SavedOrder[] = JSON.parse(saved);
          const ordersWithDates = parsed.map(order => ({
            ...order,
            timestamp: new Date(order.timestamp)
          }));
          setSavedOrders(ordersWithDates);
        }
      } catch (error) {
        console.error('Failed to load saved orders:', error);
      }
    };

    loadSavedOrders();
    fetchStockAlerts();
    
    const interval = setInterval(fetchStockAlerts, 60000);
    return () => clearInterval(interval);
  }, [fetchStockAlerts]);

  const saveOrderToLocal = useCallback((order: SavedOrder) => {
    try {
      const updatedOrders = [order, ...savedOrders].slice(0, 50);
      setSavedOrders(updatedOrders);
      localStorage.setItem('pos_saved_orders', JSON.stringify(updatedOrders));
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Failed to save order');
    }
  }, [savedOrders]);

  const fetchProductsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/products/categories');
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const categoriesData: CategoryData[] = await response.json();
      const productsList: Product[] = [];
      
      categoriesData.forEach((category: CategoryData) => {
        if (category.products?.length) {
          category.products.forEach((product: Product) => {
            productsList.push({ 
              ...product, 
              category: category.name, 
              menuType: category.menuType 
            });
          });
        }
      });
      
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsData();
  }, [fetchProductsData]);

  useEffect(() => {
    if (paymentMethod === 'split' && total > 0) {
      setSplitPayment({ cash: total / 2, gcash: total / 2 });
    }
  }, [total, paymentMethod]);

  const filteredProducts = products.filter(product => {
    if (!product.available) return false;
    if (selectedMenuType !== 'all' && product.menuType !== selectedMenuType) return false;
    if (selectedCategory !== 'All' && product.category !== selectedCategory) return false;
    return true;
  });

  const categories = ['All', ...Array.from(new Set(
    products
      .filter(p => p.available && (selectedMenuType === 'all' || p.menuType === selectedMenuType))
      .map(p => p.category || 'Uncategorized')
  ))];

  const checkScrollPosition = useCallback(() => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftScroll(scrollLeft > 10);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    setTimeout(checkScrollPosition, 100);
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categories, selectedMenuType, checkScrollPosition]);

  useEffect(() => {
    const container = categoriesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [checkScrollPosition]);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const scrollAmount = 200;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  }, []);

  const handleCategoryMouseDown = useCallback((e: React.MouseEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);

  const handleCategoryMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !categoriesContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleCategoryMouseUp = useCallback(() => setIsDragging(false), []);
  const handleCategoryTouchStart = useCallback((e: React.TouchEvent) => {
    if (!categoriesContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - categoriesContainerRef.current.offsetLeft);
    setScrollLeft(categoriesContainerRef.current.scrollLeft);
  }, []);
  const handleCategoryTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !categoriesContainerRef.current) return;
    e.preventDefault();
    const x = e.touches[0].pageX - categoriesContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);
  const handleCategoryTouchEnd = useCallback(() => setIsDragging(false), []);

  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    setDraggedItem(product);
    e.dataTransfer.setData('text/plain', product._id);
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed top-0 left-0 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    
    dragPreview.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-start justify-between">
          <div class="font-bold text-xs text-foreground">${product.name}</div>
          <div class="text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M9 12h6"/><path d="M3 6h3l2-4h8l2 4h3"/><path d="M5 18h14"/></svg>
          </div>
        </div>
        <div class="text-[10px] text-muted-foreground">${product.category || 'Product'}</div>
        <div class="flex justify-between items-center">
          <span class="font-bold text-[11px] text-primary">₱${product.price.toFixed(2)}</span>
          <span class="text-[10px] text-muted-foreground">+ Drop</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 70, 40);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
  }, []);

  const handleDragEnd = useCallback(() => setDraggedItem(null), []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    cartDropZoneRef.current?.classList.add('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    cartDropZoneRef.current?.classList.remove('bg-primary/5', 'border-2', 'border-primary', 'border-dashed');
    if (draggedItem) {
      addToCart(draggedItem);
      setDraggedItem(null);
    }
  }, [draggedItem]);

  const handleTouchStart = useCallback((e: React.TouchEvent, product: Product) => {
    e.preventDefault();
    setDraggedItem(product);
    
    const preview = document.createElement('div');
    preview.className = 'fixed z-50 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    preview.style.left = `${e.touches[0].clientX - 70}px`;
    preview.style.top = `${e.touches[0].clientY - 50}px`;
    preview.style.pointerEvents = 'none';
    
    preview.innerHTML = `
      <div class="space-y-1">
        <div class="font-bold text-xs text-foreground">${product.name}</div>
        <div class="text-[10px] text-muted-foreground">${product.category || 'Product'}</div>
        <div class="flex justify-between items-center">
          <span class="font-bold text-[11px] text-primary">₱${product.price.toFixed(2)}</span>
          <span class="text-[10px] text-muted-foreground">Release to add</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(preview);
    setTouchPreview(preview);
    
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (touchPreview) {
      touchPreview.style.left = `${e.touches[0].clientX - 70}px`;
      touchPreview.style.top = `${e.touches[0].clientY - 50}px`;
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
  }, [touchPreview, draggedItem]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      return existing 
        ? prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1, hasDiscount: false, discountType: 'none' }];
    });
    
    toast.success(`${product.name} added to cart`, { duration: 1500 });
  }, []);

  const updateCartQuantity = useCallback((itemId: string, change: number) => {
    setCart(prev => prev
      .map(item => item._id === itemId 
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
      )
      .filter(item => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const item = prev.find(i => i._id === itemId);
      if (item) toast.info(`${item.name} removed from cart`, { duration: 1500 });
      return prev.filter(item => item._id !== itemId);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setSplitPayment({ cash: 0, gcash: 0 });
    setPaymentMethod('cash');
    setSelectedTable('');
    setOrderNote('');
    setSeniorIds([]);
    setPwdIds([]);
    clearStockCheck();
    toast.info('Cart cleared', { duration: 1500 });
  }, [clearStockCheck]);

  const handleApplyDiscount = useCallback((data: { type: 'senior' | 'pwd'; ids: string[]; itemIds: string[] }) => {
    setCart(prev => prev.map(item => {
      if (data.itemIds.includes(item._id)) {
        return {
          ...item,
          hasDiscount: true,
          discountType: data.type
        };
      }
      return item;
    }));

    if (data.type === 'senior') {
      setSeniorIds(prev => [...new Set([...prev, ...data.ids])]);
    } else {
      setPwdIds(prev => [...new Set([...prev, ...data.ids])]);
    }

    toast.success(`Discount applied to ${data.itemIds.length} item(s)`);
  }, []);

  const removeDiscount = useCallback((itemId: string) => {
    setCart(prev => prev.map(item => 
      item._id === itemId 
        ? { ...item, hasDiscount: false, discountType: 'none' }
        : item
    ));
    toast.info('Discount removed from item');
  }, []);

  const saveOrder = useCallback(() => {
    if (cart.length === 0) {
      toast.error('Cannot save empty cart', { description: 'Add items to cart first' });
      return;
    }

    const newOrder: SavedOrder = {
      id: `save-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerName: customerName || 'Walk-in Customer',
      items: [...cart],
      subtotal,
      discountTotal,
      total,
      paymentMethod,
      splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType,
      tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : undefined,
      timestamp: new Date(),
      status: 'pending',
      seniorCount,
      pwdCount,
      orderNote: orderNote || undefined
    };

    saveOrderToLocal(newOrder);
    
    toast.success('Order Saved Successfully!', {
      description: `Order #${newOrder.orderNumber} has been saved`,
      duration: 3000,
      icon: <Save className="h-4 w-4" />
    });
  }, [cart, customerName, subtotal, discountTotal, total, paymentMethod, splitPayment, orderType, selectedTable, seniorCount, pwdCount, orderNote, generateOrderNumber, saveOrderToLocal]);

  const loadSavedOrder = useCallback((order: SavedOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName);
    setPaymentMethod(order.paymentMethod);
    if (order.splitPayment) setSplitPayment(order.splitPayment);
    setOrderType(order.orderType);
    setSelectedTable(order.tableNumber || '');
    setOrderNote(order.orderNote || '');
    
    toast.success('Order Loaded', {
      description: `Order #${order.orderNumber} loaded to cart`,
      duration: 2000
    });
    
    setShowSavedOrders(false);
  }, []);

  // New function to print menu without affecting orders
  const handlePrintMenu = () => {
    setShowMenuPrinting(true);
  };

  // Function to reprint receipt from history
  const handleReprintReceipt = (order: SavedOrder) => {
    const receiptData: ReceiptData = {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: order.items,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      total: order.total,
      paymentMethod: order.paymentMethod,
      splitPayment: order.splitPayment,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      timestamp: order.timestamp,
      cashier: 'Cashier #04',
      seniorIds: order.seniorCount ? seniorIds : undefined,
      pwdIds: order.pwdCount ? pwdIds : undefined,
      seniorCount: order.seniorCount,
      pwdCount: order.pwdCount,
      orderNote: order.orderNote,
      isReprint: true
    };

    setCurrentReceipt(receiptData);
    setShowReceipt(true);
  };

  const handleViewOrderDetails = (order: SavedOrder) => {
    setSelectedOrderForDetails(order);
    // You can implement a details modal here
    toast.info(`Viewing order ${order.orderNumber}`);
  };

  const handlePrintReceipt = useCallback(() => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${currentReceipt?.orderNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
              .text-center { text-align: center; }
              .border-bottom { border-bottom: 1px dashed #000; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .font-bold { font-weight: bold; }
              .mt-2 { margin-top: 8px; }
              .mb-2 { margin-bottom: 8px; }
              .pt-2 { padding-top: 8px; }
              .pb-2 { padding-bottom: 8px; }
              .text-xs { font-size: 10px; }
              .text-green-600 { color: #059669; }
              .line-through { text-decoration: line-through; }
              @media print {
                body { width: 100%; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
            <div style="text-align: center; margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                Print Receipt
              </button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, [currentReceipt]);

  const handleSavePDF = useCallback(() => {
    toast.info('PDF save feature coming soon');
  }, []);

  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!');
      return;
    }
    if (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total) {
      toast.error('Split payment amounts must equal total!');
      return;
    }
    
    setIsCheckingStock(true);
    
    try {
      const orderId = `order-${Date.now()}`;
      const orderNumber = generateOrderNumber();
      
      const orderItems = cart.map(item => ({
        productId: item._id,
        productName: item.name,
        quantity: item.quantity,
        ingredients: item.ingredients || []
      }));

      const stockCheck = await checkOrderStock(orderItems);
      
      if (!stockCheck.allAvailable) {
        setInsufficientStockItems(stockCheck.insufficientItems);
        setShowInsufficientStockModal(true);
        setIsCheckingStock(false);
        return;
      }

      await processOrderDeductions(orderId, orderNumber, orderItems);
      
      const paymentData = {
        orderNumber,
        customerName: customerName || 'Walk-in Customer',
        items: cart.map(item => ({
          productId: item._id,
          name: item.name,
          category: item.category || 'Uncategorized',
          menuType: item.menuType || 'food',
          price: item.price,
          quantity: item.quantity,
          revenue: item.hasDiscount ? item.price * 0.8 : item.price,
          hasDiscount: item.hasDiscount,
          discountType: item.discountType
        })),
        subtotal,
        discountTotal,
        total,
        paymentMethod,
        splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
        orderType,
        tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : null,
        orderNote: orderNote || null,
        seniorIds: seniorIds.length > 0 ? seniorIds : null,
        pwdIds: pwdIds.length > 0 ? pwdIds : null,
        seniorCount,
        pwdCount,
        status: 'completed',
        createdAt: new Date()
      };

      try {
        const paymentResponse = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        if (!paymentResponse.ok) {
          console.error('Failed to save to payments API:', await paymentResponse.text());
          toast.warning('Payment saved locally only. Analytics may be delayed.', {
            duration: 3000
          });
        } else {
          const result = await paymentResponse.json();
          console.log('Payment saved to MongoDB:', result);
        }
      } catch (apiError) {
        console.error('Error calling payments API:', apiError);
        toast.warning('Network error. Payment saved locally only.', {
          duration: 3000
        });
      }

      toast.success('Payment Successful!', {
        description: `Order Total: ₱${total.toFixed(2)}`,
        duration: 4000
      });
      
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
        orderType,
        tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : undefined,
        timestamp: new Date(),
        status: 'completed',
        seniorCount,
        pwdCount,
        orderNote: orderNote || undefined
      };
      saveOrderToLocal(completedOrder);

      const receiptData: ReceiptData = {
        orderNumber,
        customerName: customerName || 'Walk-in Customer',
        items: [...cart],
        subtotal,
        discountTotal,
        total,
        paymentMethod,
        splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
        orderType,
        tableNumber: orderType === 'dine-in' && selectedTable ? selectedTable : undefined,
        timestamp: new Date(),
        cashier: 'Cashier #04',
        seniorIds: seniorIds.length > 0 ? seniorIds : undefined,
        pwdIds: pwdIds.length > 0 ? pwdIds : undefined,
        seniorCount,
        pwdCount,
        orderNote: orderNote || undefined
      };

      setCurrentReceipt(receiptData);
      setShowReceipt(true);
      
      clearCart();
      
      toast.success('Order completed!', {
        description: `Order #${orderNumber} has been saved`,
        duration: 3000
      });
      
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      if (error.insufficientItems) {
        setInsufficientStockItems(error.insufficientItems);
        setShowInsufficientStockModal(true);
      } else {
        toast.error('Payment Failed', {
          description: error.message || 'An error occurred during payment processing'
        });
      }
    } finally {
      setIsCheckingStock(false);
    }
  };

  const syncOfflinePayments = async () => {
    try {
      const saved = localStorage.getItem('pos_saved_orders');
      if (!saved) return;
      
      const orders = JSON.parse(saved);
      const unsynced = orders.filter((o: any) => !o.synced);
      
      for (const order of unsynced) {
        try {
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...order,
              createdAt: new Date(order.timestamp)
            })
          });
          
          order.synced = true;
        } catch (e) {
          console.error('Failed to sync order:', order.orderNumber);
        }
      }
      
      localStorage.setItem('pos_saved_orders', JSON.stringify(orders));
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  useEffect(() => {
    syncOfflinePayments();
  }, []);

  const autoSplit = useCallback((type: 'half' | 'cash' | 'gcash') => {
    const splits = {
      half: { cash: total / 2, gcash: total / 2 },
      cash: { cash: total, gcash: 0 },
      gcash: { cash: 0, gcash: total }
    };
    setSplitPayment(splits[type]);
  }, [total]);

  const formatOrderDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const InsufficientStockModal = () => {
    if (!showInsufficientStockModal) return null;
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
        <div className="w-full max-w-lg rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <PackageX className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Insufficient Stock
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Some items cannot be fulfilled due to low inventory
              </p>
            </div>
          </div>
          
          <div className="mb-6 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {insufficientStockItems.map((item, index) => (
                <div 
                  key={index}
                  className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Required: {item.requiredQuantity} {item.unit}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Available: {item.currentStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-red-600 dark:text-red-500">
                        Short by: {item.shortBy} {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowInsufficientStockModal(false);
                setInsufficientStockItems([]);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Close
            </button>
            <button
              onClick={() => {
                const insufficientItemNames = new Set(
                  insufficientStockItems.map(item => item.name)
                );
                setCart(prev => prev.filter(item => 
                  !item.ingredients?.some(ing => 
                    insufficientItemNames.has(ing.name)
                  )
                ));
                setShowInsufficientStockModal(false);
                setInsufficientStockItems([]);
                toast.info('Removed items with insufficient stock from cart');
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Remove Unavailable Items
            </button>
          </div>
        </div>
      </div>
    );
  };

  const StockAlertsBadge = () => {
    const criticalCount = stockAlerts.filter(a => a.status === 'critical').length;
    const lowCount = stockAlerts.filter(a => a.status === 'low' || a.status === 'warning').length;
    const totalAlerts = stockAlerts.length;
    
    if (totalAlerts === 0) return null;
    
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStockAlerts(!showStockAlerts)}
          className={`h-8 text-xs gap-1 relative ${
            criticalCount > 0 
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' 
              : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Stock Alerts</span>
          <Badge className={`ml-1 h-5 px-1.5 ${
            criticalCount > 0 
              ? 'bg-red-600 text-white' 
              : 'bg-yellow-600 text-white'
          }`}>
            {totalAlerts}
          </Badge>
        </Button>
        
        {showStockAlerts && (
          <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 shadow-lg z-50">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h4 className="font-medium text-gray-900 dark:text-white">Low Stock Alerts</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowStockAlerts(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {stockAlerts.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No stock alerts at this time
                </div>
              ) : (
                <div className="space-y-2">
                  {stockAlerts.map((alert, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg ${
                        alert.status === 'critical'
                          ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30'
                          : 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {alert.itemName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Stock: {alert.currentStock} {alert.unit} • Min: {alert.minStock} {alert.unit}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                            Location: {alert.location}
                          </p>
                        </div>
                        <Badge className={
                          alert.status === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }>
                          {alert.status}
                        </Badge>
                      </div>
                      {alert.outOfStock && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-medium">
                          ⚠️ Out of stock - Reorder immediately
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header with Menu Options */}
        <header className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">POS System</h1>
              <p className="text-xs text-muted-foreground mt-1">Swipe categories - Drag items to cart</p>
            </div>
            <div className="flex items-center gap-3">
              {/* New Menu Printing Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintMenu}
                className="h-8 text-xs gap-1"
              >
                <Menu className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Menu</span>
              </Button>

              {/* Stock Alerts Badge */}
              <StockAlertsBadge />
              
              {/* Order History Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrderHistory(true)}
                className="h-8 text-xs gap-1"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
              </Button>
              
              {/* Saved Orders Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavedOrders(!showSavedOrders)}
                className="h-8 text-xs gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved ({savedOrders.length})</span>
              </Button>

              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrintMenu}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Menu
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowOrderHistory(true)}>
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchStockAlerts}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Stock
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
          {/* Left Panel - Main Content */}
          <div className="lg:w-7/12 flex flex-col h-full">
            {/* Menu Type */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['all', 'food', 'drink'] as const).map((type) => (
                <Button
                  key={type}
                  variant={selectedMenuType === type ? "default" : "outline"}
                  onClick={() => {
                    setSelectedMenuType(type);
                    setSelectedCategory('All');
                  }}
                  className="h-9 text-xs"
                >
                  {type === 'food' && <Utensils className="w-3 h-3 mr-1" />}
                  {type === 'drink' && <Coffee className="w-3 h-3 mr-1" />}
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>

            {/* Categories Section - WITH SWIPE */}
            <div className="mb-4 relative">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium text-foreground">Categories</Label>
                <div className="flex items-center text-[10px] text-muted-foreground">
                  <span>← Swipe →</span>
                </div>
              </div>
              
              <div className="relative group">
                {showLeftScroll && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('left')}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                )}
                
                <div 
                  ref={categoriesContainerRef}
                  className="flex gap-1 overflow-x-auto scrollbar-hide px-1 py-1 select-none"
                  style={{ 
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none'
                  }}
                  onMouseDown={handleCategoryMouseDown}
                  onMouseMove={handleCategoryMouseMove}
                  onMouseUp={handleCategoryMouseUp}
                  onMouseLeave={handleCategoryMouseUp}
                  onTouchStart={handleCategoryTouchStart}
                  onTouchMove={handleCategoryTouchMove}
                  onTouchEnd={handleCategoryTouchEnd}
                >
                  {categories.map(cat => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      onClick={() => {
                        if (!isDragging) {
                          setSelectedCategory(cat);
                        }
                      }}
                      className="whitespace-nowrap text-xs shrink-0 px-3 py-1 h-8"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
                
                {showRightScroll && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('right')}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products Grid - with Drag and Drop */}
            <div 
              className="overflow-y-auto flex-1 pr-2"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-xs text-foreground">Loading...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product._id} 
                      className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing touch-none ${
                        draggedItem?._id === product._id ? 'opacity-50 scale-95' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, product)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, product)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-xs line-clamp-2 text-foreground flex-1">
                              {product.name}
                            </h3>
                            <GripVertical className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {product.category}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {product.description || product.ingredients?.map(i => i.name).join(', ')}
                          </p>
                          <div className="flex justify-between items-center pt-1">
                            <span className="font-bold text-xs text-primary">₱{product.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Checkout */}
          <div className="lg:w-5/12 h-full flex gap-2">
            {/* Cart */}
            <div 
              ref={cartDropZoneRef}
              className="flex-1 transition-all duration-200"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Card className="h-full flex flex-col border">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-1 text-sm">
                      <ShoppingCart className="w-4 h-4" />
                      Order ({cart.length})
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDiscountModal(true)}
                        disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                        className="h-7 text-xs"
                      >
                        <Percent className="w-3 h-3 mr-1" />
                        Discount
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearCart} 
                        disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                        className="h-7 text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Drop zone hint */}
                  {cart.length === 0 && (
                    <div className="mt-1 p-2 border border-dashed rounded text-center bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        ↓ Drop or touch & drag products here ↓
                      </p>
                    </div>
                  )}
                </CardHeader>

                <CardContent 
                  className="flex-1 overflow-y-auto space-y-3 p-3 pt-0"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {/* Discount Summary */}
                  {(seniorCount > 0 || pwdCount > 0) && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-lg p-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                        Discount Beneficiaries:
                      </p>
                      {seniorCount > 0 && (
                        <p className="text-[10px] text-green-600 dark:text-green-500">
                          Senior Citizens: {seniorCount} item(s)
                        </p>
                      )}
                      {pwdCount > 0 && (
                        <p className="text-[10px] text-green-600 dark:text-green-500">
                          PWD: {pwdCount} item(s)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Order Type */}
                  <div>
                    <Label className="text-xs">Order Type</Label>
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant={orderType === 'dine-in' ? 'default' : 'outline'}
                        onClick={() => setOrderType('dine-in')}
                        className="flex-1 h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        Dine In
                      </Button>
                      <Button
                        variant={orderType === 'takeaway' ? 'default' : 'outline'}
                        onClick={() => setOrderType('takeaway')}
                        className="flex-1 h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        Take Away
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Cart Items */}
                  <div>
                    <Label className="text-xs">Items</Label>
                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                      {cart.length === 0 ? (
                        <div className="text-center py-2 text-muted-foreground">
                          <p className="text-xs">No items in cart</p>
                        </div>
                      ) : (
                        cart.map(item => {
                          const discountedPrice = item.price * 0.8;
                          return (
                            <div key={item._id} className="flex flex-col p-1.5 border rounded hover:bg-muted/30">
                              <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <p className="font-medium text-xs truncate">{item.name}</p>
                                    {item.hasDiscount && (
                                      <Badge variant="default" className="text-[8px] h-4 px-1 bg-green-600">
                                        20% OFF
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {item.hasDiscount ? (
                                      <>
                                        <p className="text-[10px] text-muted-foreground line-through">
                                          ₱{item.price.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-green-600 font-bold">
                                          ₱{discountedPrice.toFixed(2)}
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground">
                                        ₱{item.price.toFixed(2)}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground">
                                      × {item.quantity}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateCartQuantity(item._id, -1)} 
                                    className="h-6 w-6 p-0"
                                    disabled={isInventoryProcessing || isCheckingStock}
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </Button>
                                  <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => updateCartQuantity(item._id, 1)} 
                                    className="h-6 w-6 p-0"
                                    disabled={isInventoryProcessing || isCheckingStock}
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </Button>
                                  {item.hasDiscount && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => removeDiscount(item._id)} 
                                      className="h-6 w-6 p-0 text-yellow-600"
                                      title="Remove discount"
                                    >
                                      <Percent className="w-2.5 h-2.5" />
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => removeFromCart(item._id)} 
                                    className="h-6 w-6 p-0"
                                    disabled={isInventoryProcessing || isCheckingStock}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Order Summary */}
                  <div>
                    <Label className="text-xs">Order Summary</Label>
                    <div className="space-y-0.5 mt-1">
                      <div className="flex justify-between text-xs">
                        <span>Subtotal:</span>
                        <span>₱{subtotal.toFixed(2)}</span>
                      </div>
                      
                      {discountTotal > 0 && (
                        <div className="flex justify-between text-xs text-green-600 dark:text-green-500">
                          <span>Total Discount:</span>
                          <span>-₱{discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between font-bold text-sm">
                        <span>Total:</span>
                        <span className="text-primary">₱{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('cash')}
                        className="h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        <DollarSign className="w-3 h-3 mr-1" /> Cash
                      </Button>
                      <Button
                        variant={paymentMethod === 'gcash' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('gcash')}
                        className="h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        <Smartphone className="w-3 h-3 mr-1" /> GCash
                      </Button>
                      <Button
                        variant={paymentMethod === 'split' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('split')}
                        className="h-7 text-xs"
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        <Receipt className="w-3 h-3 mr-1" /> Split
                      </Button>
                    </div>
                  </div>

                  {/* Split Payment Options */}
                  {paymentMethod === 'split' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Split Amounts</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => autoSplit('half')} 
                          className="h-6 text-xs"
                          disabled={isInventoryProcessing || isCheckingStock}
                        >
                          50/50
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => autoSplit('cash')} 
                          className="h-6 text-xs"
                          disabled={isInventoryProcessing || isCheckingStock}
                        >
                          Cash
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => autoSplit('gcash')} 
                          className="h-6 text-xs"
                          disabled={isInventoryProcessing || isCheckingStock}
                        >
                          GCash
                        </Button>
                      </div>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs">Cash:</span>
                          <span className="text-xs font-medium">₱{splitPayment.cash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs">GCash:</span>
                          <span className="text-xs font-medium">₱{splitPayment.gcash.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Name */}
                  <div>
                    <Label className="text-xs">Customer Name</Label>
                    <Input
                      placeholder="Enter customer name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-7 text-xs mt-1"
                      disabled={isInventoryProcessing || isCheckingStock}
                    />
                  </div>

                  {/* Order Notes */}
                  <div>
                    <Label className="text-xs">Order Notes</Label>
                    <Input
                      placeholder="Special instructions..."
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      className="h-7 text-xs mt-1"
                      disabled={isInventoryProcessing || isCheckingStock}
                    />
                  </div>

                  {/* Table Number for Dine-in */}
                  {orderType === 'dine-in' && (
                    <div>
                      <Label className="text-xs">Table Number</Label>
                      <Input
                        placeholder="e.g., Table 5"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="h-7 text-xs mt-1"
                        disabled={isInventoryProcessing || isCheckingStock}
                      />
                    </div>
                  )}

                  {/* Process Payment Button */}
                  <Button
                    onClick={processPayment}
                    disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                    className="w-full h-9 text-sm font-semibold"
                    size="lg"
                  >
                    {isInventoryProcessing || isCheckingStock ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {isCheckingStock ? 'Checking Stock...' : 'Updating Inventory...'}
                      </>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4 mr-2" />
                        Pay ₱{total.toFixed(2)}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Buttons */}
            <div className="flex flex-col gap-2 w-10">
              <Button
                onClick={saveOrder}
                disabled={!cart.length || isInventoryProcessing || isCheckingStock}
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg"
                title="Save Order"
              >
                <Save className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => setShowSavedOrders(!showSavedOrders)}
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                title="Saved Orders"
              >
                <History className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                title="Refresh Stock Alerts"
                onClick={fetchStockAlerts}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                title="Print Menu"
                onClick={handlePrintMenu}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Orders Side Panel */}
      {showSavedOrders && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" />
              Saved Orders ({savedOrders.length})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSavedOrders(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {savedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Save className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No saved orders</p>
              </div>
            ) : (
              savedOrders.map((order) => (
                <Card key={order.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatOrderDate(order.timestamp)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {order.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs">
                      <p className="font-medium">{order.customerName}</p>
                      {(order.seniorCount || order.pwdCount) && (
                        <p className="text-green-600 dark:text-green-500 text-[10px]">
                          {order.seniorCount ? `${order.seniorCount} Senior` : ''}
                          {order.seniorCount && order.pwdCount ? ' • ' : ''}
                          {order.pwdCount ? `${order.pwdCount} PWD` : ''}
                        </p>
                      )}
                      <p className="text-muted-foreground">{order.items.length} items • ₱{order.total.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs flex-1"
                        onClick={() => loadSavedOrder(order)}
                        disabled={isInventoryProcessing || isCheckingStock}
                      >
                        Load Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={() => handleReprintReceipt(order)}
                        title="Reprint Receipt"
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Menu Printing Modal */}
      <MenuPrintingModal
        isOpen={showMenuPrinting}
        onClose={() => setShowMenuPrinting(false)}
        products={products}
      />

      {/* Order History Modal */}
      <OrderHistoryModal
        isOpen={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        orders={savedOrders}
        onReprint={handleReprintReceipt}
        onViewDetails={handleViewOrderDetails}
      />

      {/* Discount Modal */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        cartItems={cart}
      />

      {/* Receipt Modal */}
      {showReceipt && (
        <ReceiptModal
          receipt={currentReceipt}
          onClose={() => setShowReceipt(false)}
          onPrint={handlePrintReceipt}
          onSavePDF={handleSavePDF}
        />
      )}

      {/* Insufficient Stock Modal */}
      <InsufficientStockModal />
    </div>
  );
};

export default CashierPage;