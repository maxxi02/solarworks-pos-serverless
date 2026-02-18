"use client";

import { useEffect, useState } from 'react';
import { Printer, Utensils, Wifi, WifiOff, Bluetooth, Loader2 } from 'lucide-react';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

interface PrinterStatusProps {
  settings: any;
}

const StatusIcon = ({ status, type }: { status: ConnectionStatus; type: 'wifi' | 'bluetooth' }) => {
  if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin" />;
  if (status === 'connected') {
    return type === 'wifi'
      ? <Wifi className="w-4 h-4 text-green-500" />
      : <Bluetooth className="w-4 h-4 text-blue-500" />;
  }
  return <WifiOff className="w-4 h-4 text-red-500" />;
};

export const PrinterStatus = ({ settings }: PrinterStatusProps) => {
  const [customerStatus, setCustomerStatus] = useState<ConnectionStatus>('checking');
  const [kitchenStatus, setKitchenStatus] = useState<ConnectionStatus>('checking');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomerStatus(settings.customerPrinter?.enabled ? 'connected' : 'disconnected');
      setKitchenStatus(settings.kitchenPrinter?.enabled ? 'connected' : 'disconnected');
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings]);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Printer className="w-4 h-4" />
        <span>Customer:</span>
        <StatusIcon status={customerStatus} type="wifi" />
      </div>
      <div className="flex items-center gap-2">
        <Utensils className="w-4 h-4" />
        <span>Kitchen:</span>
        <StatusIcon status={kitchenStatus} type="bluetooth" />
      </div>
    </div>
  );
};