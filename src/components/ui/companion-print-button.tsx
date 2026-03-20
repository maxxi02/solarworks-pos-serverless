"use client";

import {
  Printer,
  BluetoothOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useSocket } from "@/provider/socket-provider";
import { cn } from "@/lib/utils";

interface CompanionPrintButtonProps {
  /** Called when the user clicks and printing is allowed */
  onClick: () => void;
  /** Whether a print job is currently in-flight */
  isPrinting?: boolean;
  /**
   * Show a "Reprint" label instead of "Print" once the job has
   * completed at least once (optional).
   */
  hasPrinted?: boolean;
  /** Override the default label ("Print") */
  label?: string;
  /** Extra Tailwind classes applied to the root button element */
  className?: string;
  /** Icon size in Tailwind units (default: "w-4 h-4") */
  iconSize?: string;
}

/**
 * A print button that gates itself on the Companion App connection and
 * USB/BT printer availability.  It reads socket state internally so
 * consumers don't need to thread those props.
 *
 * States:
 *  - Companion offline  → disabled, "App Offline" + BluetoothOff icon
 *  - Connected, no printer → disabled, "No Printer Found" + AlertCircle icon
 *  - Printing in-flight → disabled, "Printing…" + spinner
 *  - Ready             → enabled, label + Printer icon
 */
export function CompanionPrintButton({
  onClick,
  isPrinting = false,
  hasPrinted = false,
  label,
  className,
  iconSize = "w-4 h-4",
}: CompanionPrintButtonProps) {
  const { isConnected, companionStatus } = useSocket();

  const canPrint = isConnected && (companionStatus.usb || companionStatus.bt);

  const defaultLabel = hasPrinted ? "Reprint" : (label ?? "Print");

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        onClick={onClick}
        disabled={!canPrint || isPrinting}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
          "text-sm font-bold transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          canPrint
            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98]"
            : "bg-muted text-muted-foreground",
          className,
        )}
      >
        {isPrinting ? (
          <>
            <Loader2 className={cn(iconSize, "animate-spin")} />
            Printing…
          </>
        ) : !isConnected ? (
          <>
            <BluetoothOff className={iconSize} />
            App Offline
          </>
        ) : !canPrint ? (
          <>
            <AlertCircle className={iconSize} />
            No Printer Found
          </>
        ) : hasPrinted ? (
          <>
            <CheckCircle2 className={iconSize} />
            {defaultLabel}
          </>
        ) : (
          <>
            <Printer className={iconSize} />
            {defaultLabel}
          </>
        )}
      </button>

      {/* Inline hint when companion is offline */}
      {!isConnected && (
        <p className="text-[11px] text-muted-foreground text-center leading-tight">
          Open Rendy Companion on your device to enable printing.
        </p>
      )}
    </div>
  );
}
