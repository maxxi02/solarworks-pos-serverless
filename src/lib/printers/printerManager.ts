// lib/printers/printerManager.ts
// Unified manager — routes jobs to USB (receipt) or Bluetooth (kitchen)
// Also handles Socket.IO relay fallback for remote printing

import { usbPrinter, USBPrinterStatus } from './usbPrinter';
import { bluetoothPrinter, BTStatus } from './bluetoothPrinter';
import { ReceiptBuildInput } from './escpos';

export type PrintTarget = 'receipt' | 'kitchen' | 'both';

export interface PrinterManagerStatus {
  usb: USBPrinterStatus;
  bluetooth: BTStatus;
}

export interface PrintResult {
  receipt: boolean;
  kitchen: boolean;
}

class PrinterManager {
  private statusListeners: Array<(s: PrinterManagerStatus) => void> = [];

  constructor() {
    // Bubble up status changes
    usbPrinter.onStatusChange(() => this.notifyListeners());
    bluetoothPrinter.onStatusChange(() => this.notifyListeners());
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.statusListeners.forEach(l => l(status));
  }

  onStatusChange(cb: (s: PrinterManagerStatus) => void) {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  getStatus(): PrinterManagerStatus {
    return {
      usb: usbPrinter.getStatus(),
      bluetooth: bluetoothPrinter.getStatus(),
    };
  }

  isUSBSupported() { return usbPrinter.isSupported(); }
  isBTSupported() { return bluetoothPrinter.isSupported(); }

  async connectUSB(): Promise<boolean> {
    return usbPrinter.requestAndConnect();
  }

  async connectBluetooth(): Promise<boolean> {
    return bluetoothPrinter.requestAndConnect();
  }

  async autoConnectAll(): Promise<void> {
    // Auto-connect USB (no user gesture needed if previously granted)
    await usbPrinter.autoConnect();
    // BT requires user gesture for initial connect — skip autoconnect
  }

  async printReceipt(input: ReceiptBuildInput): Promise<boolean> {
    if (!usbPrinter.isConnected()) {
      console.warn('[PrinterManager] USB not connected, trying auto-connect...');
      const ok = await usbPrinter.autoConnect();
      if (!ok) {
        console.error('[PrinterManager] USB printer unavailable');
        return false;
      }
    }
    return usbPrinter.printReceipt(input);
  }

  async printKitchenOrder(input: ReceiptBuildInput): Promise<boolean> {
    if (!bluetoothPrinter.isConnected()) {
      console.warn('[PrinterManager] BT not connected');
      return false;
    }
    return bluetoothPrinter.printKitchenOrder(input);
  }

  async printBoth(input: ReceiptBuildInput): Promise<PrintResult> {
    const [receipt, kitchen] = await Promise.allSettled([
      this.printReceipt(input),
      this.printKitchenOrder(input),
    ]);

    return {
      receipt: receipt.status === 'fulfilled' ? receipt.value : false,
      kitchen: kitchen.status === 'fulfilled' ? kitchen.value : false,
    };
  }

  // Directly print raw bytes (for socket relay)
  async printRawToUSB(bytes: number[]): Promise<boolean> {
    return usbPrinter.print(new Uint8Array(bytes));
  }

  async printRawToBluetooth(bytes: number[]): Promise<boolean> {
    return bluetoothPrinter.print(new Uint8Array(bytes));
  }

  async disconnectAll() {
    await usbPrinter.disconnect();
    await bluetoothPrinter.disconnect();
  }
}

export const printerManager = new PrinterManager();