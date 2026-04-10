"use client";

// components/_components/PrinterStatus.tsx
// Shows live USB + Bluetooth printer status.
// Companion status comes from Socket.IO (useSocket).
// Local hardware status comes from usePrinterStatus (event-driven + 10s poll).

import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Printer,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/provider/socket-provider";
import { usePrinterStatus } from "@/hooks/usePrinterStatus";
import { ReceiptSettings } from "@/types/receipt";

interface PrinterStatusProps {
  settings: ReceiptSettings;
}

export function PrinterStatus({ settings }: PrinterStatusProps) {
  const { isConnected, companionStatus, emitCompanionPing, emitCompanionPrinterDisconnect } = useSocket();
  const [pinging, setPinging] = useState(false);

  const handlePing = () => {
    setPinging(true);
    emitCompanionPing();
    setTimeout(() => setPinging(false), 1500);
  };
  const localPrinters = usePrinterStatus();

  // Determine effective printer states:
  // If companion is connected, use its reported status; otherwise fall back to local WebUSB/BT.
  const usbReady = isConnected
    ? companionStatus.usb
    : localPrinters.usb === "connected" || localPrinters.usb === "printing";

  const btReady = isConnected
    ? companionStatus.bt
    : localPrinters.bluetooth === "connected" ||
      localPrinters.bluetooth === "printing";

  return (
    <div className="space-y-3">
      {/* Companion App Connection */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Companion App</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
              {isConnected ? "Connection Live" : "Not Connected"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={isConnected ? "connected" : "offline"} />
          {isConnected && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePing} disabled={pinging} title="Refresh printer status">
              <RefreshCw className={cn("h-3.5 w-3.5", pinging && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* Printer Status */}
      <div className="grid grid-cols-2 gap-2">
        {/* Receipt */}
        <div
          className={cn(
            "p-2.5 rounded-lg border text-center transition-colors",
            usbReady
              ? "bg-primary/5 border-primary/20"
              : "bg-muted/30 border-dashed opacity-60",
          )}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Printer className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              Receipt
            </p>
          </div>
          <p
            className={cn(
              "text-xs font-semibold",
              usbReady ? "text-primary" : "text-muted-foreground",
            )}
          >
            {localPrinters.usb === "printing"
              ? "Printing…"
              : usbReady
                ? "Ready"
                : "Not Found"}
          </p>
          {isConnected && usbReady && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 mt-1 mx-auto text-destructive hover:text-destructive"
              title="Disconnect receipt printer"
              onClick={() => emitCompanionPrinterDisconnect("usb")}
            >
              <Unplug className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Kitchen */}
        <div
          className={cn(
            "p-2.5 rounded-lg border text-center transition-colors",
            btReady
              ? "bg-primary/5 border-primary/20"
              : "bg-muted/30 border-dashed opacity-60",
          )}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Printer className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              Kitchen
            </p>
          </div>
          <p
            className={cn(
              "text-xs font-semibold",
              btReady ? "text-primary" : "text-muted-foreground",
            )}
          >
            {localPrinters.bluetooth === "printing"
              ? "Printing…"
              : btReady
                ? "Ready"
                : "Not Found"}
          </p>
          {isConnected && btReady && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 mt-1 mx-auto text-destructive hover:text-destructive"
              title="Disconnect kitchen printer"
              onClick={() => emitCompanionPrinterDisconnect("bt")}
            >
              <Unplug className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Connection Help */}
      {!isConnected && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 border border-dashed rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            Open the <strong>Rendy Companion</strong> app on your device to
            enable automatic printing.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return (
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0 h-5 gap-1 font-bold"
        >
          <CheckCircle2 className="h-3 w-3" /> ONLINE
        </Badge>
      );
    case "printing":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] px-2 py-0 h-5 gap-1 font-bold"
        >
          <Loader2 className="h-3 w-3 animate-spin" /> PRINTING
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0 h-5 gap-1 text-muted-foreground font-bold"
        >
          <XCircle className="h-3 w-3" /> OFFLINE
        </Badge>
      );
  }
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
