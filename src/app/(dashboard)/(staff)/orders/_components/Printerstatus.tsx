"use client";

// components/_components/PrinterStatus.tsx
// Shows live USB + Bluetooth printer status with connect buttons

import { useState, useEffect } from 'react';
import { Bluetooth, Usb, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/provider/socket-provider';
import { ReceiptSettings } from '@/types/receipt';
import { toast } from 'sonner';

interface PrinterStatusProps {
  settings: ReceiptSettings;
}

export function PrinterStatus({ settings }: PrinterStatusProps) {
  const {
    printerStatus,
    connectUSBPrinter,
    connectBluetoothPrinter,
  } = useSocket();

  const [connectingUSB, setConnectingUSB] = useState(false);
  const [connectingBT, setConnectingBT] = useState(false);
  const [usbSupported, setUsbSupported] = useState(false);
  const [btSupported, setBtSupported] = useState(false);

  useEffect(() => {
    setUsbSupported(typeof navigator !== 'undefined' && 'usb' in navigator);
    setBtSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  }, []);

  const handleConnectUSB = async () => {
    if (!usbSupported) {
      toast.error('WebUSB not supported', { description: 'Please use Chrome or Edge browser' });
      return;
    }
    setConnectingUSB(true);
    try {
      const ok = await connectUSBPrinter();
      if (ok) toast.success('USB receipt printer connected!');
      else toast.error('USB connection failed', { description: 'Make sure printer is plugged in and powered on' });
    } finally {
      setConnectingUSB(false);
    }
  };

  const handleConnectBluetooth = async () => {
    if (!btSupported) {
      toast.error('Web Bluetooth not supported', { description: 'Please use Chrome or Edge browser' });
      return;
    }
    setConnectingBT(true);
    try {
      const ok = await connectBluetoothPrinter();
      if (ok) toast.success('Kitchen Bluetooth printer connected!');
      else toast.error('Bluetooth connection failed', { description: 'Make sure printer is on and in pairing mode' });
    } finally {
      setConnectingBT(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* USB Receipt Printer */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-2">
          <Usb className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Receipt Printer</p>
            <p className="text-xs text-muted-foreground">XPrinter 58IIH · USB</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={printerStatus.usb} />
          {printerStatus.usb === 'disconnected' || printerStatus.usb === 'error' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleConnectUSB}
              disabled={connectingUSB || !usbSupported}
            >
              {connectingUSB
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : 'Connect'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Bluetooth Kitchen Printer */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-2">
          <Bluetooth className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Kitchen Printer</p>
            <p className="text-xs text-muted-foreground">XPrinter 58IIB · Bluetooth</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={printerStatus.bluetooth} />
          {printerStatus.bluetooth === 'disconnected' || printerStatus.bluetooth === 'error' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleConnectBluetooth}
              disabled={connectingBT || !btSupported}
            >
              {connectingBT
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : 'Pair'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Browser warning */}
      {(!usbSupported || !btSupported) && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-700">
            Printing requires <strong>Chrome</strong> or <strong>Edge</strong> browser for WebUSB/Bluetooth support.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'connected':
      return (
        <Badge variant="default" className="bg-green-500 text-white text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ready
        </Badge>
      );
    case 'printing':
      return (
        <Badge variant="default" className="bg-blue-500 text-white text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Printing
        </Badge>
      );
    case 'connecting':
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Connecting
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <XCircle className="h-3 w-3" /> Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" /> Offline
        </Badge>
      );
  }
}