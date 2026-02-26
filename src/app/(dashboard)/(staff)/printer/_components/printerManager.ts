// src/lib/printers/printerManager.ts

import { InvalidStateError, usbPrinterManager } from "./usbPrinter";

// import { btPrinterManager } from "./btPrinter"; // add when ready

export type PrinterType = "usb" | "bluetooth";

export interface PrinterStatus {
  usb: ReturnType<typeof usbPrinterManager.getState>;
  bluetooth: "disconnected" | "connected" | "error";
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRINTER MANAGER  — orchestrates USB + Bluetooth
───────────────────────────────────────────────────────────────────────────── */

class PrinterManager {
  // ── Prevent overlapping autoConnectAll calls ───────────────────────────────
  private autoConnecting = false;

  /* ── Auto-connect all available printers ───────────────────────────────── */
  async autoConnectAll(): Promise<void> {
    // GUARD: if a previous autoConnectAll() hasn't finished yet, skip.
    if (this.autoConnecting) {
      console.warn(
        "[PrinterManager] autoConnectAll already in progress — skipping.",
      );
      return;
    }

    this.autoConnecting = true;

    try {
      // Run connections in parallel but isolate each one so a failure in one
      // doesn't abort the other.
      const results = await Promise.allSettled([
        this.safeAutoConnect("usb"),
        // this.safeAutoConnect("bluetooth"),
      ]);

      for (const result of results) {
        if (result.status === "rejected") {
          console.warn(
            "[PrinterManager] autoConnectAll partial failure:",
            result.reason,
          );
        }
      }
    } finally {
      this.autoConnecting = false;
    }
  }

  /* ── Wrapped auto-connect with InvalidStateError handling ──────────────── */
  private async safeAutoConnect(type: PrinterType): Promise<void> {
    try {
      if (type === "usb") {
        await usbPrinterManager.autoConnect();
      }
    } catch (err) {
      if (err instanceof InvalidStateError) {
        // Not a crash — just a race condition. Log and move on.
        console.info(
          `[PrinterManager] ${type} already connecting, skipped auto-connect.`,
        );
        return;
      }
      // Re-throw unexpected errors
      throw err;
    }
  }

  /* ── Print to the first available connected printer ────────────────────── */
  async print(content: string, preferType?: PrinterType): Promise<void> {
    const usbState = usbPrinterManager.getState();

    if (preferType === "usb" || usbState === "connected") {
      await usbPrinterManager.print(content);
      return;
    }

    throw new Error("No printer is currently connected.");
  }

  /* ── Get combined status ────────────────────────────────────────────────── */
  getStatus(): PrinterStatus {
    return {
      usb: usbPrinterManager.getState(),
      bluetooth: "disconnected", // extend when BT manager is added
    };
  }

  /* ── Disconnect all ─────────────────────────────────────────────────────── */
  async disconnectAll(): Promise<void> {
    await Promise.allSettled([usbPrinterManager.disconnect()]);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SINGLETON
───────────────────────────────────────────────────────────────────────────── */

export const printerManager = new PrinterManager();
