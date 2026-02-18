"use client";

import { useState } from 'react';
import { History, Clock, Eye, Printer, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SavedOrder } from './pos.types';
import { formatCurrency, formatDate } from './pos.utils';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SavedOrder[];
  onReprint: (order: SavedOrder) => void;
  onViewDetails: (order: SavedOrder) => void;
}

type DateRange = 'today' | 'week' | 'month' | 'all';

const getDateFilter = (range: DateRange): Date | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map: Record<DateRange, Date | null> = {
    today,
    week: new Date(today.getTime() - 7 * 86400000),
    month: new Date(today.getTime() - 30 * 86400000),
    all: null,
  };
  return map[range];
};

export const OrderHistoryModal = ({
  isOpen, onClose, orders, onReprint, onViewDetails,
}: OrderHistoryModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('today');

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const dateFilter = getDateFilter(dateRange);
    const matchesDate = !dateFilter || new Date(order.timestamp) >= dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalSales = filteredOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <History className="w-6 h-6" />Order History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-5">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Search by order # or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[250px] h-10 text-base"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-10 text-base">
                <Filter className="w-5 h-5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['all', 'completed', 'pending', 'cancelled'].map(s => (
                  <SelectItem key={s} value={s} className="text-base capitalize">{s === 'all' ? 'All Status' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
              <SelectTrigger className="w-[80px] h-10 text-base">
                <Calendar className="w-5 h-5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'all', label: 'All Time' },
                ].map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-base">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orders List */}
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
                          <Badge
                            variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs px-2 py-1"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-base">
                          <span className="font-medium">{order.customerName}</span>
                          <span className="text-muted-foreground ml-2">• {order.items.length} items • {formatCurrency(order.total)}</span>
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
            <span>Total Sales: {formatCurrency(totalSales)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="lg" className="text-base h-11">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};