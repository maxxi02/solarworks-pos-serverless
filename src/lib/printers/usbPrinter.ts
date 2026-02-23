// lib/printers/usbPrinter.ts
// WebUSB driver for XPrinter 58IIH (USB Receipt Printer)
// Chrome/Edge only — must be served over HTTPS

import {
  buildReceiptBytes,
  buildCustomerReceiptLines,
  ReceiptBuildInput,
} from "./escpos";

// ─── WebUSB type extensions ───────────────────────────────────────
// TypeScript's built-in DOM lib does not include WebUSB types.
// We define only what we need here.

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBInterface {
  interfaceNumber: number;
  alternates: USBAlternateInterface[];
}

interface USBEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: "ok" | "stall" | "babble";
}

interface USBDevice {
  vendorId: number;
  productId: number;
  manufacturerName?: string;
  productName?: string;
  opened: boolean;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: BufferSource,
  ): Promise<USBOutTransferResult>;
}

interface USBDeviceDisconnectEvent {
  device: USBDevice;
}

interface NavigatorUSB {
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
  addEventListener(
    type: "disconnect",
    listener: (event: USBDeviceDisconnectEvent) => void,
  ): void;
}

// Omit the potentially conflicting built-in 'usb' property, then add ours
type NavigatorWithUSB = Omit<Navigator, "usb"> & {
  usb: NavigatorUSB;
};

// ─── Vendor IDs ───────────────────────────────────────────────────

const XPRINTER_VENDOR_IDS: number[] = [
  0x0416, // XPrinter / Winbond (most common)
  0x0483, // STMicroelectronics
  0x04b8, // Epson fallback
  0x1504, // XPrinter variant
];

export type USBPrinterStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

class USBPrinterManager {
  private device: USBDevice | null = null;
  private endpointOut: number = 1;
  private status: USBPrinterStatus = "disconnected";
  private statusListeners: Array<(s: USBPrinterStatus) => void> = [];

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "usb" in navigator;
  }

  getStatus(): USBPrinterStatus {
    return this.status;
  }

  onStatusChange(cb: (s: USBPrinterStatus) => void) {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  private setStatus(s: USBPrinterStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  async requestAndConnect(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error("[USB] WebUSB not supported in this browser");
      return false;
    }

    try {
      this.setStatus("connecting");

      const nav = navigator as unknown as NavigatorWithUSB;
      const device = await nav.usb.requestDevice({
        filters: XPRINTER_VENDOR_IDS.map((vendorId) => ({ vendorId })),
      });

      return await this.connectDevice(device);
    } catch (err) {
      if (err instanceof Error && err.name === "NotFoundError") {
        console.log("[USB] No device selected by user");
      } else {
        console.error("[USB] requestDevice failed:", err);
      }
      this.setStatus("disconnected");
      return false;
    }
  }

  async autoConnect(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const nav = navigator as unknown as NavigatorWithUSB;
      const devices = await nav.usb.getDevices();
      const printer = devices.find((d) =>
        XPRINTER_VENDOR_IDS.includes(d.vendorId),
      );

      if (printer) {
        return await this.connectDevice(printer);
      }
    } catch (err) {
      console.error("[USB] autoConnect failed:", err);
    }
    return false;
  }

  private async connectDevice(device: USBDevice): Promise<boolean> {
    try {
      this.device = device;

      if (!device.opened) {
        await device.open();
      }

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find and claim interface + locate OUT endpoint
      let claimed = false;
      for (const iface of device.configuration?.interfaces ?? []) {
        try {
          await device.claimInterface(iface.interfaceNumber);

          for (const alt of iface.alternates) {
            for (const ep of alt.endpoints) {
              if (ep.direction === "out") {
                this.endpointOut = ep.endpointNumber;
              }
            }
          }
          claimed = true;
          break;
        } catch {
          // Try next interface
        }
      }

      if (!claimed) {
        console.error("[USB] Could not claim any interface");
        this.setStatus("error");
        return false;
      }

      this.setStatus("connected");
      console.log(
        `[USB] Connected to ${device.productName} (${device.manufacturerName})`,
      );

      // Listen for disconnect
      const nav = navigator as unknown as NavigatorWithUSB;
      nav.usb.addEventListener("disconnect", (e: USBDeviceDisconnectEvent) => {
        if (e.device === this.device) {
          this.device = null;
          this.setStatus("disconnected");
          console.log("[USB] Printer disconnected");
        }
      });

      return true;
    } catch (err) {
      console.error("[USB] connectDevice failed:", err);
      this.setStatus("error");
      return false;
    }
  }

  async print(data: Uint8Array): Promise<boolean> {
    if (!this.device || this.status === "disconnected") {
      console.error("[USB] Not connected");
      return false;
    }

    try {
      this.setStatus("printing");

      const CHUNK_SIZE = 64;
      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE);
        await this.device.transferOut(this.endpointOut, chunk);
        if (offset + CHUNK_SIZE < data.length) {
          await delay(10);
        }
      }

      this.setStatus("connected");
      return true;
    } catch (err) {
      console.error("[USB] print failed:", err);
      this.setStatus("error");
      setTimeout(() => this.autoConnect(), 2000);
      return false;
    }
  }

  async printReceipt(input: ReceiptBuildInput): Promise<boolean> {
    const lines = buildCustomerReceiptLines(input);
    const bytes = buildReceiptBytes(lines);
    return this.print(bytes);
  }

  async disconnect() {
    if (this.device?.opened) {
      await this.device.close();
    }
    this.device = null;
    this.setStatus("disconnected");
  }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "printing";
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton
export const usbPrinter = new USBPrinterManager();
