'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useInventoryOrder } from '@/hooks/useInventoryOrder';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { printReceipt, previewReceipt, ReceiptData as PrinterReceiptData } from '@/lib/receiptPrinter';
import {
  ShoppingCart, Plus, Minus, Trash2, DollarSign, Smartphone, Receipt,
  X, Loader2, Utensils, Coffee, ChevronLeft, ChevronRight, GripVertical,
  Save, History, PackageX, RefreshCw, Bell, Printer, Percent, User, Users,
  Menu, Clock, Eye, Download, Filter, Calendar, Search, FileText, AlertCircle,
  Wifi, WifiOff, Bluetooth
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

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

// ============ Constants ============
const DISCOUNT_RATE = 0.2; // 20%

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

// Receipt Modal
const ReceiptModal = ({ receipt, onClose, onPrint, onReprint }: { 
  receipt: SavedOrder & { cashier?: string; seniorPwdIds?: string[]; isReprint?: boolean } | null; 
  onClose: () => void;
  onPrint: () => void;
  onReprint?: () => void;
}) => {
  if (!receipt) return null;

  const itemsWithDiscount = receipt.items.filter(item => item.hasDiscount);
  const itemsWithoutDiscount = receipt.items.filter(item => !item.hasDiscount);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-black border shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {receipt.isReprint ? 'Reprint' : 'Receipt'} #{receipt.orderNumber}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 h-4" />
          </Button>
        </div>

        <div id="receipt-content" className="p-4 space-y-3 font-mono text-xs">
          {/* Store Info - This will be replaced by settings in production */}
          <div className="text-center border-b border-dashed pb-2">
            <h4 className="font-bold text-sm">Rendezvous Cafe</h4>
            <p className="text-[10px]">Rendezvous Café, Talisay - Tanauan Road, Natatas, Tanauan City</p>
            <p className="text-[10px]">Tel: +63639660049893</p>
          </div>

          {/* Order Details */}
          <div className="border-b border-dashed pb-2">
            <div className="flex justify-between"><span>Order #:</span><span className="font-medium">{receipt.orderNumber}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{new Date(receipt.timestamp).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Cashier:</span><span>{receipt.cashier || 'Cashier'}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{receipt.customerName}</span></div>
            <div className="flex justify-between"><span>Type:</span><span className="capitalize">{receipt.orderType}</span></div>
            {receipt.tableNumber && <div className="flex justify-between"><span>Table:</span><span>{receipt.tableNumber}</span></div>}
            {receipt.orderNote && <div className="flex justify-between"><span>Notes:</span><span className="italic">{receipt.orderNote}</span></div>}
          </div>

          {/* Items */}
          {itemsWithoutDiscount.length > 0 && (
            <div className="border-b border-dashed pb-2">
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
                  <div className="col-span-2 text-right">{formatCurrency(item.price)}</div>
                  <div className="col-span-2 text-right">{formatCurrency(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Discounted Items */}
          {itemsWithDiscount.length > 0 && (
            <div className="border-b border-dashed pb-2">
              <div className="text-[10px] font-bold text-green-600 mb-1">*** WITH 20% DISCOUNT (SENIOR/PWD) ***</div>
              <div className="grid grid-cols-12 gap-1 font-bold mb-1">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {itemsWithDiscount.map((item, idx) => {
                const discountedPrice = item.price * (1 - DISCOUNT_RATE);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-1 text-[10px]">
                    <div className="col-span-6 truncate">{item.name}</div>
                    <div className="col-span-2 text-right">{item.quantity}</div>
                    <div className="col-span-2 text-right">
                      <span className="line-through text-[8px]">{formatCurrency(item.price)}</span>
                      <br /><span className="text-green-600">{formatCurrency(discountedPrice)}</span>
                    </div>
                    <div className="col-span-2 text-right">{formatCurrency(discountedPrice * item.quantity)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals */}
          <div className="border-b border-dashed pb-2">
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(receipt.subtotal)}</span></div>
            {receipt.discountTotal > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount:</span><span>-{formatCurrency(receipt.discountTotal)}</span></div>
            )}
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>TOTAL:</span><span className="text-primary">{formatCurrency(receipt.total)}</span>
            </div>
          </div>

          {/* Beneficiaries */}
          {receipt.seniorPwdCount && receipt.seniorPwdCount > 0 && (
            <div className="border-b border-dashed pb-2 text-[8px]">
              <p>Senior/PWD Count: {receipt.seniorPwdCount}</p>
            </div>
          )}

          {/* Payment */}
          <div className="border-b border-dashed pb-2">
            <div className="flex justify-between"><span>Payment:</span><span className="capitalize">{receipt.paymentMethod}</span></div>
            {receipt.paymentMethod === 'split' && receipt.splitPayment && (
              <>
                <div className="flex justify-between text-[10px] pl-2"><span>- Cash:</span><span>{formatCurrency(receipt.splitPayment.cash)}</span></div>
                <div className="flex justify-between text-[10px] pl-2"><span>- GCash:</span><span>{formatCurrency(receipt.splitPayment.gcash)}</span></div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] space-y-1">
            <p>Thank you for your patronage!</p>
            {receipt.isReprint && <p className="text-[9px] font-bold text-red-500">*** REPRINTED RECEIPT ***</p>}
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button onClick={onPrint} className="flex-1 gap-2">
            <Printer className="w-4 h-4" />Print
          </Button>
          {onReprint && (
            <Button onClick={onReprint} variant="outline" className="flex-1 gap-2">
              <Printer className="w-4 h-4" />Reprint
            </Button>
          )}
          <Button onClick={onClose} variant="outline" className="flex-1">Close</Button>
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
    if (!validIds.length) return toast.error('Enter at least one ID');
    if (!selectedItems.length) return toast.error('Select at least one item');
    
    onApply({ ids: validIds, itemIds: selectedItems });
    setIds(['']);
    setSelectedItems([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Senior/PWD Discount</DialogTitle>
          <DialogDescription>Select items and enter IDs for 20% discount</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>ID Numbers</Label>
            {ids.map((id, index) => (
              <div key={index} className="flex gap-2">
                <Input placeholder={`ID #${index + 1}`} value={id} onChange={(e) => handleIdChange(index, e.target.value)} className="flex-1" />
                {ids.length > 1 && <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveId(index)} className="h-10 w-10"><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddId} className="mt-2"><Plus className="h-4 w-4 mr-2" />Add ID</Button>
          </div>

          <div className="space-y-2">
            <Label>Select Items</Label>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
              {cartItems.map(item => (
                <div key={item._id} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  selectedItems.includes(item._id) ? 'bg-primary/10 border border-primary' : 'hover:bg-muted/50'
                }`} onClick={() => handleToggleItem(item._id)}>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} • {formatCurrency(item.price)} each</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    {selectedItems.includes(item._id) && <Badge variant="default" className="text-[10px] mt-1">Selected</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply Discount</Button>
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5" />Order History</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder="Search by order # or customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[140px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto divide-y">
              {!filteredOrders.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No orders found</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{order.orderNumber}</span>
                          <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">{order.customerName}</span> • 
                          <span className="text-muted-foreground ml-1">{order.items.length} items • {formatCurrency(order.total)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDate(order.timestamp)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onViewDetails(order)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onReprint(order)}><Printer className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span>Total Orders: {filteredOrders.length}</span>
            <span>Total Sales: {formatCurrency(filteredOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0))}</span>
          </div>
        </div>

        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
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
      <Button variant="outline" size="sm" onClick={onToggle} className={`h-8 text-xs gap-1 ${
        criticalCount ? 'border-red-500 bg-red-50 text-red-700' : 'border-yellow-500 bg-yellow-50 text-yellow-700'
      }`}>
        <Bell className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Stock Alerts</span>
        <Badge className={`ml-1 h-5 px-1.5 ${criticalCount ? 'bg-red-600' : 'bg-yellow-600'}`}>{totalAlerts}</Badge>
      </Button>

      {show && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-black border shadow-lg z-50">
          <div className="p-3 border-b flex justify-between items-center">
            <h4 className="font-medium">Low Stock Alerts</h4>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh} title="Refresh">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto p-2 space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-3 rounded-lg ${
                alert.status === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              } border`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{alert.itemName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Stock: {alert.currentStock} {alert.unit} • Min: {alert.minStock} {alert.unit}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Location: {alert.location}</p>
                  </div>
                  <Badge className={alert.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                    {alert.status}
                  </Badge>
                </div>
                {alert.outOfStock && (
                  <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Out of stock - Reorder immediately</p>
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
const PrinterStatus = ({ settings }: { settings: any }) => {
  const [customerStatus, setCustomerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [kitchenStatus, setKitchenStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const checkPrinters = async () => {
      // Simulate printer checks
      setTimeout(() => {
        setCustomerStatus('connected');
        setKitchenStatus('connected');
      }, 1000);
    };
    checkPrinters();
  }, []);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1">
        <Printer className="w-3 h-3" />
        <span>Customer:</span>
        {customerStatus === 'connected' ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : customerStatus === 'checking' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
      </div>
      <div className="flex items-center gap-1">
        <Utensils className="w-3 h-3" />
        <span>Kitchen:</span>
        {kitchenStatus === 'connected' ? (
          <Bluetooth className="w-3 h-3 text-blue-500" />
        ) : kitchenStatus === 'checking' ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
      </div>
    </div>
  );
};

// ============ Main Component ============
const CashierPage = () => {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, gcash: 0 });
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
  const [currentReceipt, setCurrentReceipt] = useState<SavedOrder & { cashier?: string; seniorPwdIds?: string[]; isReprint?: boolean } | null>(null);
  const [insufficientStockItems, setInsufficientStockItems] = useState<any[]>([]);
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Hooks
  const { isProcessing, checkOrderStock, processOrderDeductions, clearStockCheck } = useInventoryOrder({
    onSuccess: () => fetchStockAlerts(),
    onError: (error) => toast.error('Inventory update failed', { description: error.message }),
    onInsufficientStock: (items) => {
      setInsufficientStockItems(items);
      setShowInsufficientStockModal(true);
    },
    autoRollback: true
  });

  const { settings, isLoading: settingsLoading } = useReceiptSettings();

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
  const discountTotal = useMemo(() => cart.reduce((sum, item) => 
    item.hasDiscount ? sum + item.price * item.quantity * DISCOUNT_RATE : sum, 0), [cart]);
  const total = subtotal - discountTotal;
  const seniorPwdCount = cart.filter(i => i.hasDiscount).length;

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
    } catch (error) {
      toast.error('Failed to load products');
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
    } catch (error) {
      console.error('Failed to fetch stock alerts:', error);
    }
  };

  const loadSavedOrders = () => {
    try {
      const saved = localStorage.getItem('pos_saved_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedOrders(parsed.map((o: any) => ({ ...o, timestamp: new Date(o.timestamp) })));
      }
    } catch (error) {
      console.error('Failed to load saved orders');
    }
  };

  const saveOrderToLocal = (order: SavedOrder) => {
    try {
      const updated = [order, ...savedOrders].slice(0, 50);
      setSavedOrders(updated);
      localStorage.setItem('pos_saved_orders', JSON.stringify(updated));
    } catch (error) {
      toast.error('Failed to save order');
    }
  };

  // Save order to database
 const saveOrderToDatabase = async (order: SavedOrder) => {
    try {
      console.log('Saving order to database:', order);
      
      // Prepare the data for the database
      const receiptData = {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: order.items.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          hasDiscount: item.hasDiscount || false,
          category: item.category,
          menuType: item.menuType,
          notes: item.notes
        })),
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        total: order.total,
        paymentMethod: order.paymentMethod,
        splitPayment: order.splitPayment,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        orderNote: order.orderNote,
        seniorPwdCount: order.seniorPwdCount || 0,
        seniorPwdIds: seniorPwdIds, // Use current state
        cashier: 'Cashier', // You can get this from your auth session
        cashierId: 'current-user-id', // Get from auth session
        status: 'completed'
      };

      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData)
      });
      
      // Check if response is OK before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database response not OK:', response.status, errorText);
        throw new Error(`Failed to save to database: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Order saved to database successfully:', result);
      return result;
      
    } catch (error) {
      console.error('Database save failed:', error);
      
      // Show warning but don't block the user
      toast.warning('Order saved locally only (database unavailable)', {
        description: error instanceof Error ? error.message : 'Connection error'
      });
      
      // Still save locally as backup
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
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  // Clear all saved orders
  const clearAllSavedOrders = () => {
    try {
      setSavedOrders([]);
      localStorage.removeItem('pos_saved_orders');
      toast.success('All saved orders cleared');
    } catch (error) {
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
  }, []);

  const updateQuantity = useCallback((itemId: string, change: number) => {
    setCart(prev => prev
      .map(item => item._id === itemId ? { ...item, quantity: Math.max(1, item.quantity + change) } : item)
      .filter(item => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    const item = cart.find(i => i._id === itemId);
    setCart(prev => prev.filter(i => i._id !== itemId));
    if (item) toast.info(`${item.name} removed`);
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
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
  }, []);

  const removeDiscount = useCallback((itemId: string) => {
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, hasDiscount: false } : item
    ));
    toast.info('Discount removed');
  }, []);

  const saveOrder = useCallback(() => {
    if (!cart.length) return toast.error('Cart is empty');

    const newOrder: SavedOrder = {
      id: `save-${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerName: customerName || 'Walk-in Customer',
      items: [...cart],
      subtotal, discountTotal, total,
      paymentMethod, splitPayment: paymentMethod === 'split' ? splitPayment : undefined,
      orderType, tableNumber: orderType === 'dine-in' ? selectedTable : undefined,
      timestamp: new Date(), status: 'pending',
      seniorPwdCount, orderNote: orderNote || undefined
    };

    saveOrderToLocal(newOrder);
    toast.success('Order saved', { description: `#${newOrder.orderNumber}` });
  }, [cart, customerName, subtotal, discountTotal, total, paymentMethod, splitPayment, orderType, selectedTable, seniorPwdCount, orderNote]);

  const loadSavedOrder = useCallback((order: SavedOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName);
    setPaymentMethod(order.paymentMethod);
    if (order.splitPayment) setSplitPayment(order.splitPayment);
    setOrderType(order.orderType);
    setSelectedTable(order.tableNumber || '');
    setOrderNote(order.orderNote || '');
    setShowSavedOrders(false);
    toast.success('Order loaded');
  }, []);

  const handleReprintReceipt = (order: SavedOrder) => {
    setCurrentReceipt({
      ...order,
      cashier: 'Cashier',
      seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
      isReprint: true
    });
    setShowReceipt(true);
  };

  const processPayment = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (paymentMethod === 'split' && splitPayment.cash + splitPayment.gcash !== total) {
      return toast.error('Split amounts must equal total');
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

      // Check stock first (this might fail if API not ready)
      try {
        const stockCheck = await checkOrderStock(orderItems);
        if (!stockCheck.allAvailable) {
          setInsufficientStockItems(stockCheck.insufficientItems);
          setShowInsufficientStockModal(true);
          setIsCheckingStock(false);
          return;
        }

        await processOrderDeductions(orderId, orderNumber, orderItems);
      } catch (stockError) {
        console.warn('Stock check failed, continuing with order:', stockError);
        // Continue with order even if stock check fails (for testing)
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
        orderType, 
        tableNumber: orderType === 'dine-in' ? selectedTable : undefined,
        timestamp: new Date(), 
        status: 'completed', 
        seniorPwdCount, 
        orderNote: orderNote || undefined,
        cashier: 'Cashier',
        cashierId: 'current-user-id' // Replace with actual user ID
      };

      // Try to save to database, but don't block if it fails
      await saveOrderToDatabase(completedOrder);

      // Always save to local as backup
      saveOrderToLocal(completedOrder);

      // Prepare receipt data for printing
      const receiptData: PrinterReceiptData = {
        ...completedOrder,
        cashier: 'Cashier',
        seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined,
        id: orderId,
        timestamp: new Date(),
        customerReceiptPrinted: false,
        kitchenReceiptPrinted: false
      };

      // Try to print, but don't block if it fails (since you don't have printers yet)
      if (settings) {
        setIsPrinting(true);
        try {
          const printResults = await printReceipt(receiptData, settings);
          
          if (printResults.customer) {
            toast.success('Customer receipt printed');
          } else {
            toast.warning('Customer receipt print failed - printer not connected');
          }
          
          if (printResults.kitchen) {
            toast.success('Kitchen order printed');
          } else if (cart.some(item => item.menuType === 'food')) {
            toast.warning('Kitchen order print failed - Bluetooth printer not connected');
          }
        } catch (printError) {
          console.warn('Print failed (expected during testing):', printError);
          toast.info('Print preview available in receipt modal');
        } finally {
          setIsPrinting(false);
        }
      }

      // Show receipt preview
 setCurrentReceipt({
        ...completedOrder,
        cashier: 'Cashier',
        seniorPwdIds: seniorPwdIds.length ? seniorPwdIds : undefined
      });
      setShowReceipt(true);
      
      clearCart();
      toast.success('Payment successful! (Order saved locally)');
      
    } catch (error: any) {
      console.error('Payment process error:', error);
      
      if (error.insufficientItems) {
        setInsufficientStockItems(error.insufficientItems);
        setShowInsufficientStockModal(true);
      } else {
        toast.error('Payment failed', { 
          description: error.message || 'Unknown error occurred'
        });
      }
    } finally {
      setIsCheckingStock(false);
    }
  };

    const handlePrintReceipt = useCallback(async () => {
    if (!currentReceipt) return;

    setIsPrinting(true);
    try {
      // For testing without printer, just show browser print dialog
      const content = document.getElementById('receipt-content');
      if (content) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>Receipt - ${currentReceipt.orderNumber}</title>
                <style>
                  body { 
                    font-family: 'Courier New', monospace; 
                    font-size: 12px; 
                    width: 80mm; 
                    margin: 0 auto; 
                    padding: 10px;
                  }
                  @media print {
                    body { width: 80mm; }
                  }
                  .no-print { display: none; }
                </style>
              </head>
              <body>
                ${content.outerHTML}
                <div class="no-print" style="text-align:center; margin-top:20px;">
                  <button onclick="window.print()" style="padding:10px 20px; background:#000; color:#fff; border:none; border-radius:5px; cursor:pointer; margin-right:10px;">
                    Print Receipt
                  </button>
                  <button onclick="window.close()" style="padding:10px 20px; background:#666; color:#fff; border:none; border-radius:5px; cursor:pointer;">
                    Close
                  </button>
                </div>
              </body>
            </html>
          `);
          win.document.close();
          toast.success('Print preview opened');
        }
      }
    } catch (error) {
      console.error('Print failed:', error);
      toast.error('Failed to open print preview');
    } finally {
      setIsPrinting(false);
    }
  }, [currentReceipt]);

  
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

  const autoSplit = useCallback((type: 'half' | 'cash' | 'gcash') => {
    const splits = {
      half: { cash: total / 2, gcash: total / 2 },
      cash: { cash: total, gcash: 0 },
      gcash: { cash: 0, gcash: total }
    };
    setSplitPayment(splits[type]);
  }, [total]);

  // Drag & Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, product: Product) => {
    setDraggedItem(product);
    e.dataTransfer.setData('text/plain', product._id);
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragPreview = document.createElement('div');
    dragPreview.className = 'fixed top-0 left-0 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    dragPreview.innerHTML = `<div class="space-y-1"><div class="font-bold text-xs">${product.name}</div>
      <div class="text-[10px] text-muted-foreground">${product.category || 'Product'}</div>
      <div class="flex justify-between"><span class="font-bold text-[11px] text-primary">${formatCurrency(product.price)}</span>
      <span class="text-[10px] text-muted-foreground">+ Drop</span></div></div>`;
    
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 70, 40);
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
    preview.className = 'fixed z-50 w-[140px] bg-card border-2 border-primary shadow-lg rounded-lg p-2';
    preview.style.left = `${e.touches[0].clientX - 70}px`;
    preview.style.top = `${e.touches[0].clientY - 50}px`;
    preview.style.pointerEvents = 'none';
    preview.innerHTML = `<div class="space-y-1"><div class="font-bold text-xs">${product.name}</div>
      <div class="text-[10px] text-muted-foreground">${product.category || 'Product'}</div>
      <div class="flex justify-between"><span class="font-bold text-[11px] text-primary">${formatCurrency(product.price)}</span>
      <span class="text-[10px] text-muted-foreground">Release to add</span></div></div>`;
    
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
  }, [touchPreview, draggedItem, addToCart]);

  // Category Scroll Handlers
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesContainerRef.current) {
      categoriesContainerRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
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
    const walk = (x - startX) * 2;
    categoriesContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDraggingCategory, startX, scrollLeft]);

  const handleCategoryMouseUp = useCallback(() => setIsDraggingCategory(false), []);
  const handleCategoryMouseLeave = useCallback(() => setIsDraggingCategory(false), []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">POS System</h1>
              <p className="text-xs text-muted-foreground mt-1">Swipe categories • Drag items to cart</p>
            </div>
            <div className="flex items-center gap-3">
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
              <Button variant="outline" size="sm" onClick={() => setShowOrderHistory(true)} className="h-8 text-xs gap-1">
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">History</span>
              </Button>
              
              {/* Saved Orders Button */}
              <Button variant="outline" size="sm" onClick={() => setShowSavedOrders(!showSavedOrders)} className="h-8 text-xs gap-1">
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved ({savedOrders.length})</span>
              </Button>

              {/* Quick Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowOrderHistory(true)}>
                    <History className="w-4 h-4 mr-2" />View History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchStockAlerts}>
                    <RefreshCw className="w-4 h-4 mr-2" />Refresh Stock
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleTestPrint}>
                    <Printer className="w-4 h-4 mr-2" />Test Print Receipt
                  </DropdownMenuItem>
                  {currentReceipt && (
                    <>
                      <DropdownMenuItem onClick={() => handlePreviewReceipt('customer')}>
                        <Eye className="w-4 h-4 mr-2" />Preview Customer Receipt
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePreviewReceipt('kitchen')}>
                        <Utensils className="w-4 h-4 mr-2" />Preview Kitchen Order
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
          {/* Left Panel - Products */}
          <div className="lg:w-7/12 flex flex-col h-full">
            {/* Menu Type Filter */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['all', 'food', 'drink'] as const).map(type => (
                <Button key={type} variant={selectedMenuType === type ? 'default' : 'outline'}
                  onClick={() => { setSelectedMenuType(type); setSelectedCategory('All'); }} className="h-9 text-xs">
                  {type === 'food' && <Utensils className="w-3 h-3 mr-1" />}
                  {type === 'drink' && <Coffee className="w-3 h-3 mr-1" />}
                  {type === 'all' ? 'All' : type}
                </Button>
              ))}
            </div>

            {/* Categories */}
            <div className="mb-4 relative">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs">Categories</Label>
                <span className="text-[10px] text-muted-foreground">← Swipe →</span>
              </div>
              
              <div className="relative group">
                {showLeftScroll && (
                  <Button variant="secondary" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('left')}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                )}
                
                <div ref={categoriesContainerRef} className="flex gap-1 overflow-x-auto scrollbar-hide px-1 py-1 select-none"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', cursor: isDraggingCategory ? 'grabbing' : 'grab' }}
                  onMouseDown={handleCategoryMouseDown}
                  onMouseMove={handleCategoryMouseMove}
                  onMouseUp={handleCategoryMouseUp}
                  onMouseLeave={handleCategoryMouseLeave}>
                  {categories.map(cat => (
                    <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'}
                      onClick={() => !isDraggingCategory && setSelectedCategory(cat)} 
                      className="whitespace-nowrap text-xs shrink-0 px-3 py-1 h-8">
                      {cat}
                    </Button>
                  ))}
                </div>
                
                {showRightScroll && (
                  <Button variant="secondary" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-6 w-6 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => scrollCategories('right')}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <div className="overflow-y-auto flex-1 pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading...</div>
              ) : !filteredProducts.length ? (
                <div className="text-center py-8 text-muted-foreground">No products found</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map(product => (
                    <Card key={product._id} className={`hover:shadow-md transition-all active:scale-95 border cursor-grab active:cursor-grabbing touch-none ${
                      draggedItem?._id === product._id ? 'opacity-50 scale-95' : ''
                    }`} draggable onDragStart={(e) => handleDragStart(e, product)}
                      onDragEnd={() => setDraggedItem(null)}
                      onTouchStart={(e) => handleTouchStart(e, product)} 
                      onTouchMove={handleTouchMove} 
                      onTouchEnd={handleTouchEnd}>
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-xs line-clamp-2 flex-1">{product.name}</h3>
                            <GripVertical className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{product.category}</Badge>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {product.description || product.ingredients?.map(i => i.name).join(', ')}
                          </p>
                          <span className="font-bold text-xs text-primary">{formatCurrency(product.price)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="lg:w-5/12 h-full flex gap-2">
            <div ref={cartDropZoneRef} className="flex-1 transition-all" 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave} 
              onDrop={handleDrop}>
              <Card className="h-full flex flex-col border">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-1 text-sm">
                      <ShoppingCart className="w-4 h-4" />Order ({cart.length})
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setShowDiscountModal(true)} 
                        disabled={!cart.length || isProcessing || isCheckingStock || isPrinting} className="h-7 text-xs">
                        <Percent className="w-3 h-3 mr-1" />Discount
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearCart} disabled={!cart.length || isProcessing || isCheckingStock || isPrinting} className="h-7 text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {!cart.length && (
                    <div className="mt-1 p-2 border border-dashed rounded text-center bg-muted/30">
                      <p className="text-xs text-muted-foreground">↓ Drop products here ↓</p>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto space-y-3 p-3 pt-0">
                  {/* Discount Summary */}
                  {seniorPwdCount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                      <p className="text-xs font-medium text-green-700 mb-1">Senior/PWD Discount Applied:</p>
                      <p className="text-[10px] text-green-600">{seniorPwdCount} item(s) with 20% discount</p>
                    </div>
                  )}

                  {/* Order Type */}
                  <div>
                    <Label className="text-xs">Order Type</Label>
                    <div className="flex gap-1 mt-1">
                      {(['dine-in', 'takeaway'] as const).map(type => (
                        <Button key={type} variant={orderType === type ? 'default' : 'outline'}
                          onClick={() => setOrderType(type)} className="flex-1 h-7 text-xs" disabled={isProcessing || isCheckingStock || isPrinting}>
                          {type === 'dine-in' ? 'Dine In' : 'Take Away'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Cart Items */}
                  <div>
                    <Label className="text-xs">Items</Label>
                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                      {cart.map(item => {
                        const discountedPrice = item.price * (1 - DISCOUNT_RATE);
                        return (
                          <div key={item._id} className="flex flex-col p-1.5 border rounded">
                            <div className="flex justify-between items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="font-medium text-xs truncate">{item.name}</p>
                                  {item.hasDiscount && <Badge variant="default" className="text-[8px] h-4 px-1 bg-green-600">20% OFF</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.hasDiscount ? (
                                    <>
                                      <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(item.price)}</p>
                                      <p className="text-[10px] text-green-600 font-bold">{formatCurrency(discountedPrice)}</p>
                                    </>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground">{formatCurrency(item.price)}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground">× {item.quantity}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button size="sm" variant="outline" onClick={() => updateQuantity(item._id, -1)} 
                                  className="h-6 w-6 p-0" disabled={isProcessing || isCheckingStock || isPrinting}>
                                  <Minus className="w-2.5 h-2.5" />
                                </Button>
                                <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                                <Button size="sm" variant="outline" onClick={() => updateQuantity(item._id, 1)} 
                                  className="h-6 w-6 p-0" disabled={isProcessing || isCheckingStock || isPrinting}>
                                  <Plus className="w-2.5 h-2.5" />
                                </Button>
                                {item.hasDiscount && (
                                  <Button size="sm" variant="outline" onClick={() => removeDiscount(item._id)} 
                                    className="h-6 w-6 p-0 text-yellow-600" disabled={isProcessing || isCheckingStock || isPrinting}>
                                    <Percent className="w-2.5 h-2.5" />
                                  </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => removeFromCart(item._id)} 
                                  className="h-6 w-6 p-0" disabled={isProcessing || isCheckingStock || isPrinting}>
                                  <Trash2 className="w-2.5 h-2.5" />
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
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-xs"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
                      {discountTotal > 0 && (
                        <div className="flex justify-between text-xs text-green-600"><span>Discount:</span><span>-{formatCurrency(discountTotal)}</span></div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-sm"><span>Total:</span><span className="text-primary">{formatCurrency(total)}</span></div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Method */}
                  <div>
                    <Label className="text-xs">Payment</Label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {(['cash', 'gcash', 'split'] as const).map(method => (
                        <Button key={method} variant={paymentMethod === method ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod(method)} className="h-7 text-xs" disabled={isProcessing || isCheckingStock || isPrinting}>
                          {method === 'cash' && <DollarSign className="w-3 h-3 mr-1" />}
                          {method === 'gcash' && <Smartphone className="w-3 h-3 mr-1" />}
                          {method === 'split' && <Receipt className="w-3 h-3 mr-1" />}
                          {method === 'cash' ? 'Cash' : method === 'gcash' ? 'GCash' : 'Split'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Split Payment */}
                  {paymentMethod === 'split' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Split Amounts</Label>
                      <div className="grid grid-cols-3 gap-1">
                        <Button size="sm" variant="outline" onClick={() => autoSplit('half')} 
                          className="h-6 text-xs" disabled={isProcessing || isCheckingStock || isPrinting}>50/50</Button>
                        <Button size="sm" variant="outline" onClick={() => autoSplit('cash')} 
                          className="h-6 text-xs" disabled={isProcessing || isCheckingStock || isPrinting}>Cash</Button>
                        <Button size="sm" variant="outline" onClick={() => autoSplit('gcash')} 
                          className="h-6 text-xs" disabled={isProcessing || isCheckingStock || isPrinting}>GCash</Button>
                      </div>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between"><span className="text-xs">Cash:</span><span className="text-xs font-medium">{formatCurrency(splitPayment.cash)}</span></div>
                        <div className="flex justify-between"><span className="text-xs">GCash:</span><span className="text-xs font-medium">{formatCurrency(splitPayment.gcash)}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Customer Info */}
                  <Input placeholder="Customer name (optional)" value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} className="h-7 text-xs" 
                    disabled={isProcessing || isCheckingStock || isPrinting} />
                  <Input placeholder="Order notes" value={orderNote} 
                    onChange={(e) => setOrderNote(e.target.value)} className="h-7 text-xs" 
                    disabled={isProcessing || isCheckingStock || isPrinting} />
                  
                  {orderType === 'dine-in' && (
                    <Input placeholder="Table number" value={selectedTable} 
                      onChange={(e) => setSelectedTable(e.target.value)} className="h-7 text-xs" 
                      disabled={isProcessing || isCheckingStock || isPrinting} />
                  )}

                  {/* Pay Button */}
                  <Button onClick={processPayment} disabled={!cart.length || isProcessing || isCheckingStock || isPrinting || settingsLoading} 
                    className="w-full h-9 text-sm font-semibold" size="lg">
                    {isProcessing || isCheckingStock ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{isCheckingStock ? 'Checking Stock...' : 'Processing...'}</>
                    ) : isPrinting ? (
                      <><Printer className="w-4 h-4 mr-2 animate-pulse" />Printing...</>
                    ) : (
                      <><Receipt className="w-4 h-4 mr-2" />Pay {formatCurrency(total)}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Side Buttons */}
            <div className="flex flex-col gap-2 w-10">
              <Button onClick={saveOrder} disabled={!cart.length || isProcessing || isCheckingStock || isPrinting} 
                variant="default" size="icon" className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg" title="Save Order">
                <Save className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowSavedOrders(!showSavedOrders)} variant="outline" size="icon" 
                className="h-10 w-10 rounded-full" title="Saved Orders">
                <History className="h-4 w-4" />
              </Button>
              <Button onClick={fetchStockAlerts} variant="outline" size="icon" 
                className="h-10 w-10 rounded-full" title="Refresh Stock Alerts">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Orders Panel */}
      {showSavedOrders && (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" />Saved Orders ({savedOrders.length})
            </h3>
            <div className="flex items-center gap-2">
              {savedOrders.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearAllSavedOrders}
                  className="h-7 text-xs"
                >
                  Clear All
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSavedOrders(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!savedOrders.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Save className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No saved orders</p>
              </div>
            ) : (
              savedOrders.map(order => (
                <Card key={order.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.timestamp)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                    </div>
                    <div className="text-xs">
                      <p className="font-medium">{order.customerName}</p>
                      {order.seniorPwdCount && order.seniorPwdCount > 0 && (
                        <p className="text-green-600 text-[10px]">
                          Senior/PWD: {order.seniorPwdCount} item(s)
                        </p>
                      )}
                      <p className="text-muted-foreground">{order.items.length} items • {formatCurrency(order.total)}</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="default" className="h-7 text-xs flex-1" onClick={() => loadSavedOrder(order)} disabled={isProcessing || isCheckingStock || isPrinting}>
                        Load
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleReprintReceipt(order)} title="Reprint" disabled={isPrinting}>
                        <Printer className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => deleteSavedOrder(order.id)} title="Delete">
                        <Trash2 className="h-3 w-3" />
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
          // Load order details
          setCurrentReceipt({
            ...order,
            cashier: order.cashier || 'Cashier'
          });
          setShowReceipt(true);
        }} 
      />
      
      {showReceipt && (
        <ReceiptModal 
          receipt={currentReceipt} 
          onClose={() => setShowReceipt(false)} 
          onPrint={handlePrintReceipt}
          onReprint={currentReceipt?.isReprint ? undefined : () => {
            if (currentReceipt) {
              handleReprintReceipt(currentReceipt);
            }
          }}
        />
      )}

      {/* Insufficient Stock Modal */}
      {showInsufficientStockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-black border p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100"><PackageX className="h-6 w-6 text-red-600" /></div>
              <div><h3 className="text-lg font-semibold">Insufficient Stock</h3><p className="text-sm text-gray-600">Some items cannot be fulfilled</p></div>
            </div>
            
            <div className="mb-6 max-h-64 overflow-y-auto space-y-3">
              {insufficientStockItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm">Required: {item.requiredQuantity} {item.unit}</p>
                      <p className="text-sm">Available: {item.currentStock} {item.unit}</p>
                    </div>
                    <span className="text-sm font-medium text-red-600">Short: {item.shortBy} {item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowInsufficientStockModal(false); setInsufficientStockItems([]); }}>Close</Button>
              <Button variant="destructive" onClick={() => {
                const names = new Set(insufficientStockItems.map((i: any) => i.name));
                setCart(prev => prev.filter(item => !item.ingredients?.some(ing => names.has(ing.name))));
                setShowInsufficientStockModal(false);
                setInsufficientStockItems([]);
                toast.info('Removed unavailable items');
              }}>Remove Unavailable</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierPage;