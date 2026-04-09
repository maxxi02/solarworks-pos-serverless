// hooks/usePrinterStatus.ts
// Subscribes to live USB + Bluetooth printer status from printerManager.
// Uses event-based updates (onStatusChange) as the primary mechanism,
// with a 10s interval as a safety net for silent hardware disconnects.

import { useEffect, useState } from "react";
import {
  printerManager,
  PrinterManagerStatus,
} from "@/lib/printers/printerManager";

export function usePrinterStatus(): PrinterManagerStatus {
  const [status, setStatus] = useState<PrinterManagerStatus>(
    printerManager.getStatus(),
  );

  useEffect(() => {
    // Primary: react immediately to any status change event
    const unsub = printerManager.onStatusChange(setStatus);

    // Safety net: sync state every 10s in case a silent disconnect is missed
    const interval = setInterval(() => {
      setStatus(printerManager.getStatus());
    }, 10_000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return status;
}
