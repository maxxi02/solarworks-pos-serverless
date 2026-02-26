// lib/printers/bluetoothPrinter.ts
// Web Bluetooth driver for XPrinter 58IIB (Kitchen Bluetooth Printer)
// Chrome/Edge only — must be served over HTTPS

import {
  buildReceiptBytes,
  buildKitchenOrderLines,
  ReceiptBuildInput,
} from "./escpos";

// ─── Web Bluetooth type extensions ───────────────────────────────

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
  getPrimaryServices(uuid?: string): Promise<BTService[]>;
}

interface BTDevice {
  id: string;
  name?: string;
  gatt?: BTGATTServer;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
  removeEventListener(
    type: "gattserverdisconnected",
    listener: () => void,
  ): void;
}

interface NavigatorBluetooth {
  requestDevice(
    options: {
      filters?: Array<{ namePrefix?: string; services?: string[] }>;
      optionalServices?: string[];
      acceptAllDevices?: boolean;
    } & (
      | { acceptAllDevices: true; filters?: never }
      | {
          filters: Array<{ namePrefix?: string; services?: string[] }>;
          acceptAllDevices?: never;
        }
    ),
  ): Promise<BTDevice>;
}

type NavigatorWithBluetooth = Omit<Navigator, "bluetooth"> & {
  bluetooth: NavigatorBluetooth;
};

// ─── UUIDs ────────────────────────────────────────────────────────
// XPrinter 58IIB BLE native service — the only one available over BLE.
// SPP (00001101...) is Classic Bluetooth only and cannot be used here.

const CUSTOM_PRINT_SERVICE = "e7810a71-73ae-499d-8c15-faa9aef0c3f2";
const CUSTOM_PRINT_CHAR = "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f";

export type BTStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

// ─── Manager ─────────────────────────────────────────────────────

class BluetoothPrinterManager {
  private device: BTDevice | null = null;
  private characteristic: BTCharacteristic | null = null;
  private status: BTStatus = "disconnected";
  private listeners: Array<(s: BTStatus) => void> = [];

  // ── Public API ──

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  getStatus(): BTStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === "connected" || this.status === "printing";
  }

  getDeviceName(): string | null {
    return this.device?.name ?? null;
  }

  onStatusChange(cb: (s: BTStatus) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  async requestAndConnect(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error("[BT] Web Bluetooth not supported in this browser");
      return false;
    }

    try {
      this.setStatus("connecting");

      const nav = navigator as unknown as NavigatorWithBluetooth;
      const device = await nav.bluetooth.requestDevice({
        filters: [
          { namePrefix: "XP-58" },
          { namePrefix: "XPrinter" },
          { namePrefix: "Printer" },
          { namePrefix: "RPP" },
        ],
        // Only declare the BLE service we actually use.
        // SPP (Classic BT) is intentionally excluded — it is not available over BLE.
        optionalServices: [CUSTOM_PRINT_SERVICE],
      });

      return await this.connectDevice(device);
    } catch (err) {
      if (err instanceof Error && err.name === "NotFoundError") {
        console.log("[BT] User cancelled device selection");
      } else {
        console.error("[BT] requestDevice failed:", err);
      }
      this.setStatus("disconnected");
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
      console.error("[BT] Not connected — call requestAndConnect() first");
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
          console.error("[BT] Chunk write error at offset", offset, writeErr);
          this.setStatus("error");
          return false;
        }

        await delay(20);
      }

      this.setStatus("connected");
      return true;
    } catch (err) {
      console.error("[BT] print() failed:", err);
      this.setStatus("error");
      return false;
    }
  }

  async printKitchenOrder(input: ReceiptBuildInput): Promise<boolean> {
    const lines = buildKitchenOrderLines(input);
    const bytes = buildReceiptBytes(lines);
    return this.print(bytes);
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.setStatus("disconnected");
  }
  async diagnose(): Promise<void> {
    const nav = navigator as unknown as NavigatorWithBluetooth;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
    });
    const server = await device.gatt!.connect();
    console.log("[BT] Device name:", device.name);
    const services = await server.getPrimaryServices();
    for (const service of services) {
      console.log("[BT] SERVICE:", service.uuid);
      try {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          console.log(
            "  CHAR:",
            c.uuid,
            "write:",
            c.properties.write,
            "writeNoResp:",
            c.properties.writeWithoutResponse,
          );
        }
      } catch (e) {
        console.warn("  Could not read chars:", e);
      }
    }
  }
  // ── Private ──

  private setStatus(s: BTStatus): void {
    this.status = s;
    this.listeners.forEach((l) => l(s));
  }

  private async connectDevice(device: BTDevice): Promise<boolean> {
    try {
      this.device = device;

      device.addEventListener("gattserverdisconnected", () => {
        this.characteristic = null;
        this.setStatus("disconnected");
        console.log("[BT] Printer disconnected — will retry in 3s");
        setTimeout(() => this.reconnect(), 3000);
      });

      const server = await device.gatt!.connect();
      console.log("[BT] GATT connected");

      // Diagnostic: log all advertised services to help debug UUID issues
      try {
        const allServices = await server.getPrimaryServices();
        console.log(
          "[BT] Advertised services:",
          allServices.map((s: BTService) => s.uuid),
        );
      } catch (diagErr) {
        console.warn("[BT] Could not enumerate services:", diagErr);
      }

      // Connect to the XPrinter BLE native service
      let service: BTService;
      try {
        service = await server.getPrimaryService(CUSTOM_PRINT_SERVICE);
        console.log("[BT] Found XPrinter native service");
      } catch (err) {
        console.error(
          "[BT] XPrinter service not found. Check that CUSTOM_PRINT_SERVICE UUID is correct.",
          "\n     Expected:",
          CUSTOM_PRINT_SERVICE,
          "\n     Error:",
          err,
        );
        this.setStatus("error");
        return false;
      }

      // Get the print characteristic
      let characteristic: BTCharacteristic;
      try {
        characteristic = await service.getCharacteristic(CUSTOM_PRINT_CHAR);
        console.log("[BT] Found print characteristic:", CUSTOM_PRINT_CHAR);
      } catch (err) {
        // Fallback: find any writable characteristic on the service
        console.warn(
          "[BT] Specific char not found, scanning for writable char:",
          err,
        );
        try {
          const allChars = await service.getCharacteristics();
          console.log(
            "[BT] Available characteristics:",
            allChars.map((c: BTCharacteristic) => ({
              uuid: c.uuid,
              write: c.properties.write,
              writeWithoutResponse: c.properties.writeWithoutResponse,
            })),
          );

          const writable = allChars.find(
            (c: BTCharacteristic) =>
              c.properties.write || c.properties.writeWithoutResponse,
          );

          if (!writable) {
            console.error("[BT] No writable characteristic found on service");
            this.setStatus("error");
            return false;
          }

          characteristic = writable;
          console.log(
            "[BT] Using fallback writable characteristic:",
            writable.uuid,
          );
        } catch (scanErr) {
          console.error("[BT] Failed to scan characteristics:", scanErr);
          this.setStatus("error");
          return false;
        }
      }

      this.characteristic = characteristic;
      this.setStatus("connected");
      console.log(`[BT] Ready — connected to "${device.name}"`);
      return true;
    } catch (err) {
      console.error("[BT] connectDevice() failed:", err);
      this.setStatus("error");
      return false;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Singleton ───────────────────────────────────────────────────

export const bluetoothPrinter = new BluetoothPrinterManager();
