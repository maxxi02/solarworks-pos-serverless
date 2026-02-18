"use client";

import { Bell, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StockAlert } from './pos.types';

interface StockAlertsBadgeProps {
  alerts: StockAlert[];
  show: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}

export const StockAlertsBadge = ({ alerts, show, onToggle, onRefresh }: StockAlertsBadgeProps) => {
  if (!alerts.length) return null;

  const criticalCount = alerts.filter(a => a.status === 'critical').length;
  const isCritical = criticalCount > 0;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="default"
        onClick={onToggle}
        className={`h-10 text-sm gap-2 ${
          isCritical
            ? 'border-red-500 bg-red-50 text-red-700'
            : 'border-yellow-500 bg-yellow-50 text-yellow-700'
        }`}
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Stock Alerts</span>
        <Badge className={`ml-2 h-6 px-2 text-xs ${isCritical ? 'bg-red-600' : 'bg-yellow-600'}`}>
          {alerts.length}
        </Badge>
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
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  alert.status === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-base font-medium">{alert.itemName}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Stock: {alert.currentStock} {alert.unit} • Min: {alert.minStock} {alert.unit}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Location: {alert.location}</p>
                  </div>
                  <Badge
                    className={`text-xs px-2 py-1 ${
                      alert.status === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {alert.status}
                  </Badge>
                </div>
                {alert.outOfStock && (
                  <p className="text-sm text-red-600 mt-3 font-medium">
                    ⚠️ Out of stock - Reorder immediately
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};