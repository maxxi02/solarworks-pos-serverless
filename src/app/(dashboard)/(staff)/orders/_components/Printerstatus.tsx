"use client";

// components/_components/PrinterStatus.tsx
// Shows live USB + Bluetooth printer status with connect buttons

import { Smartphone, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/provider/socket-provider';
import { ReceiptSettings } from '@/types/receipt';

interface PrinterStatusProps {
  settings: ReceiptSettings;
}

export function PrinterStatus({ settings }: PrinterStatusProps) {
  const {
    isConnected,
    companionStatus,
  } = useSocket();

  return (
    <div className="space-y-3">
      {/* Companion App Connection */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Companion App</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {isConnected ? 'Connection Live' : 'Not Connected'}
            </p>
          </div>
        </div>
        <StatusBadge status={isConnected ? 'connected' : 'offline'} />
      </div>

      {/* Printer Status Summaries (Internal to Companion) */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "p-2.5 rounded-lg border text-center transition-colors",
            companionStatus.usb ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-dashed opacity-60"
          )}>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Receipt</p>
            <p className={cn(
              "text-xs font-semibold",
              companionStatus.usb ? "text-primary" : "text-muted-foreground"
            )}>
              {companionStatus.usb ? "Ready" : "Not Found"}
            </p>
          </div>
          <div className={cn(
            "p-2.5 rounded-lg border text-center transition-colors",
            companionStatus.bt ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-dashed opacity-60"
          )}>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Kitchen</p>
            <p className={cn(
              "text-xs font-semibold",
              companionStatus.bt ? "text-primary" : "text-muted-foreground"
            )}>
              {companionStatus.bt ? "Ready" : "Not Found"}
            </p>
          </div>
        </div>
      )}

      {/* Connection Help */}
      {!isConnected && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 border border-dashed rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Open the <strong>Rendy Companion</strong> app on your device to enable automatic printing.
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
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0 h-5 gap-1 font-bold">
          <CheckCircle2 className="h-3 w-3" /> ONLINE
        </Badge>
      );
    case 'printing':
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] px-2 py-0 h-5 gap-1 font-bold">
          <Loader2 className="h-3 w-3 animate-spin" /> PRINTING
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 gap-1 text-muted-foreground font-bold">
          <XCircle className="h-3 w-3" /> OFFLINE
        </Badge>
      );
  }
}

// Utility for cleaner class joining
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
