"use client";

import { Save, X, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SavedOrder } from './pos.types';
import { formatCurrency, formatDate } from './pos.utils';

interface SavedOrdersPanelProps {
  orders: SavedOrder[];
  isProcessing: boolean;
  isPrinting: boolean;
  onClose: () => void;
  onLoad: (order: SavedOrder) => void;
  onReprint: (order: SavedOrder) => void;
  onDelete: (orderId: string) => void;
  onClearAll: () => void;
}

export const SavedOrdersPanel = ({
  orders,
  isProcessing,
  isPrinting,
  onClose,
  onLoad,
  onReprint,
  onDelete,
  onClearAll,
}: SavedOrdersPanelProps) => {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 overflow-hidden flex flex-col">
      <div className="p-5 border-b flex justify-between items-center">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Save className="w-5 h-5" />Saved Orders ({orders.length})
        </h3>
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <Button variant="destructive" size="default" onClick={onClearAll} className="h-9 text-sm px-3">
              Clear All
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!orders.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <Save className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-base">No saved orders</p>
          </div>
        ) : (
          orders.map(order => (
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
                  {!!order.seniorPwdCount && (
                    <p className="text-green-600 text-xs">Senior/PWD: {order.seniorPwdCount} item(s)</p>
                  )}
                  <p className="text-muted-foreground">{order.items.length} items • {formatCurrency(order.total)}</p>
                  {order.paymentMethod === 'cash' && order.amountPaid && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Paid: {formatCurrency(order.amountPaid)} | Change: {formatCurrency(order.change || 0)}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    size="default"
                    variant="default"
                    className="h-9 text-sm flex-1"
                    onClick={() => onLoad(order)}
                    disabled={isProcessing || isPrinting}
                  >
                    Load
                  </Button>
                  <Button size="default" variant="outline" className="h-9 w-9 p-0" onClick={() => onReprint(order)} disabled={isPrinting}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button size="default" variant="destructive" className="h-9 w-9 p-0" onClick={() => onDelete(order.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
