// lib/printers/bluetoothPrinter.ts
// Web Bluetooth driver for XPrinter 58IIB (Kitchen Bluetooth Printer)
// Chrome/Edge only — must be served over HTTPS

import {
  buildReceiptBytes,
  buildKitchenOrderLines,
  ReceiptBuildInput,
} from "./escpos";

// ─── Web Bluetooth type extensions ───────────────────────────────
// TypeScript's built-in Bluetooth types are incomplete.
// We define our own standalone interfaces and cast navigator
// using Omit to avoid the conflicting built-in 'bluetooth' property.

interface BluetoothCharacteristicProperties {
  write: boolean;
  writeWithoutResponse: boolean;
  read: boolean;
  notify: boolean;
  indicate: boolean;
}

interface BTCharacteristic {
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  value: DataView | null;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  readValue(): Promise<DataView>;
}

interface BTService {
  uuid: string;
  getCharacteristic(uuid: string): Promise<BTCharacteristic>;
  getCharacteristics(uuid?: string): Promise<BTCharacteristic[]>;
}

interface BTGATTServer {
  connected: boolean;
  connect(): Promise<BTGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BTService>;
}

interface BTDevice {
  id: string;
  name?: string;
  gatt?: BTGATTServer;
  addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
  removeEventListener(type: 'gattserverdisconnected', listener: () => void): void;
}

interface NavigatorBluetooth {
  requestDevice(options: {
    filters: Array<{ namePrefix?: string; services?: string[] }>;
    optionalServices?: string[];
  }): Promise<BTDevice>;
}

// Use Omit to strip the conflicting built-in 'bluetooth' property,
// then re-add it with our complete type. This avoids the extends conflict.
type NavigatorWithBluetooth = Omit<Navigator, 'bluetooth'> & {
  bluetooth: NavigatorBluetooth;
};

// ─── UUIDs ────────────────────────────────────────────────────────

const SPP_SERVICE = "00001101-0000-1000-8000-00805f9b34fb";
const CUSTOM_PRINT_SERVICE = "e7810a71-73ae-499d-8c15-faa9aef0c3f2";
const CUSTOM_PRINT_CHAR = "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f";

export type BTStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

class BluetoothPrinterManager {
  private device: BTDevice | null = null;
  private characteristic: BTCharacteristic | null = null;
  private status: BTStatus = "disconnected";
  private listeners: Array<(s: BTStatus) => void> = [];

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  getStatus(): BTStatus {
    return this.status;
  }

  onStatusChange(cb: (s: BTStatus) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private setStatus(s: BTStatus) {
    this.status = s;
    this.listeners.forEach((l) => l(s));
  }

  async requestAndConnect(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error("[BT] Web Bluetooth not supported");
      return false;
    }

    try {
      this.setStatus("connecting");

      // Cast using our Omit-based type — no extends conflict
      const nav = navigator as unknown as NavigatorWithBluetooth;
      const device = await nav.bluetooth.requestDevice({
        filters: [
          { namePrefix: "XP-58" },
          { namePrefix: "XPrinter" },
          { namePrefix: "Printer" },
          { namePrefix: "RPP" },
        ],
        optionalServices: [SPP_SERVICE, CUSTOM_PRINT_SERVICE],
      });

      return await this.connectDevice(device);
    } catch (err) {
      if (err instanceof Error && err.name === "NotFoundError") {
        console.log("[BT] No device selected");
      } else {
        console.error("[BT] requestDevice failed:", err);
      }
      this.setStatus("disconnected");
      return false;
    }
  }

  private async connectDevice(device: BTDevice): Promise<boolean> {
    try {
      this.device = device;

      device.addEventListener("gattserverdisconnected", () => {
        this.characteristic = null;
        this.setStatus("disconnected");
        console.log("[BT] Printer disconnected");
        setTimeout(() => this.reconnect(), 3000);
      });

      const server = await device.gatt!.connect();
      console.log("[BT] GATT connected");

      let characteristic: BTCharacteristic | null = null;

      // Try XPrinter native service first, fall back to SPP
      try {
        const service = await server.getPrimaryService(CUSTOM_PRINT_SERVICE);
        characteristic = await service.getCharacteristic(CUSTOM_PRINT_CHAR);
        console.log("[BT] Using XPrinter native service");
      } catch {
        try {
          const service = await server.getPrimaryService(SPP_SERVICE);
          const chars = await service.getCharacteristics();
          characteristic =
            chars.find(
              (c: BTCharacteristic) =>
                c.properties.write || c.properties.writeWithoutResponse,
            ) ?? null;
          console.log("[BT] Using SPP service");
        } catch (err) {
          console.error("[BT] Could not find print service/characteristic:", err);
          this.setStatus("error");
          return false;
        }
      }

      if (!characteristic) {
        console.error("[BT] No writable characteristic found");
        this.setStatus("error");
        return false;
      }

      this.characteristic = characteristic;
      this.setStatus("connected");
      console.log(`[BT] Connected to ${device.name}`);
      return true;
    } catch (err) {
      console.error("[BT] connectDevice failed:", err);
      this.setStatus("error");
      return false;
    }
  }

  async reconnect(): Promise<boolean> {
    if (!this.device) return false;
    console.log("[BT] Attempting reconnect...");
    return this.connectDevice(this.device);
  }

  async print(data: Uint8Array): Promise<boolean> {
    if (!this.characteristic) {
      console.error("[BT] Not connected — no characteristic");
      return false;
    }

    try {
      this.setStatus("printing");

      const CHUNK_SIZE = 100;

      for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.slice(offset, offset + CHUNK_SIZE);

        try {
          if (this.characteristic.properties.writeWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(chunk);
          } else {
            await this.characteristic.writeValue(chunk);
          }
        } catch (writeErr) {
          console.error("[BT] chunk write error:", writeErr);
          this.setStatus("error");
          return false;
        }

        await delay(20);
      }

      this.setStatus("connected");
      return true;
    } catch (err) {
      console.error("[BT] print failed:", err);
      this.setStatus("error");
      return false;
    }
  }

  async printKitchenOrder(input: ReceiptBuildInput): Promise<boolean> {
    const lines = buildKitchenOrderLines(input);
    const bytes = buildReceiptBytes(lines);
    return this.print(bytes);
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.setStatus("disconnected");
  }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "printing";
  }

  getDeviceName(): string | null {
    return this.device?.name ?? null;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const bluetoothPrinter = new BluetoothPrinterManager();