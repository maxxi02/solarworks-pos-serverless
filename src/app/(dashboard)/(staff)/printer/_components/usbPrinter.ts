// src/lib/printers/usbPrinter.ts

import { connectToDatabase } from "@/config/db-Connect";

/* ─────────────────────────────────────────────────────────────────────────────
   WEBUSB TYPE SHIMS  (not in default TS lib)
───────────────────────────────────────────────────────────────────────────── */

interface USBEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
  packetSize: number;
}

interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  endpoints: USBEndpoint[];
}

interface USBInterface {
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  claimed: boolean;
}

interface USBConfiguration {
  configurationValue: number;
  interfaces: USBInterface[];
}

export interface WebUSBDevice {
  vendorId: number;
  productId: number;
  productName: string | null;
  manufacturerName: string | null;
  serialNumber: string | null;
  opened: boolean;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: ArrayBuffer,
  ): Promise<{ bytesWritten: number }>;
  transferIn(
    endpointNumber: number,
    length: number,
  ): Promise<{ data: DataView }>;
}

interface WebUSBNavigator {
  usb: {
    requestDevice(options: {
      filters: Array<{ classCode?: number; vendorId?: number }>;
    }): Promise<WebUSBDevice>;
    getDevices(): Promise<WebUSBDevice[]>;
  };
}

function getUSBApi() {
  if (typeof navigator === "undefined" || !("usb" in navigator)) return null;
  return (navigator as unknown as WebUSBNavigator).usb;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ESC/POS BUFFER HELPERS  (all return ArrayBuffer to avoid SharedArrayBuffer)
───────────────────────────────────────────────────────────────────────────── */

function bytes(...vals: number[]): ArrayBuffer {
  return new Uint8Array(vals).buffer as ArrayBuffer;
}

function encodeText(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

function concatBuffers(parts: ArrayBuffer[]): ArrayBuffer {
  const total = parts.reduce((s, b) => s + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return result.buffer as ArrayBuffer;
}

const ESC = 0x1b;
const GS = 0x1d;

export const escpos = {
  init: (): ArrayBuffer => bytes(ESC, 0x40),
  align: (a: 0 | 1 | 2): ArrayBuffer => bytes(ESC, 0x61, a),
  bold: (on: boolean): ArrayBuffer => bytes(ESC, 0x45, on ? 1 : 0),
  size: (w: 0 | 1, h: 0 | 1): ArrayBuffer => bytes(GS, 0x21, (w << 4) | h),
  feed: (n = 3): ArrayBuffer => bytes(ESC, 0x64, n),
  cut: (): ArrayBuffer => bytes(GS, 0x56, 0x41, 0x05),
  text: (s: string): ArrayBuffer => encodeText(s),
};

export function buildReceiptBuffer(content: string): ArrayBuffer {
  return concatBuffers([
    escpos.init(),
    escpos.align(1),
    escpos.bold(true),
    escpos.size(1, 1),
    escpos.text("RECEIPT\n"),
    escpos.bold(false),
    escpos.size(0, 0),
    escpos.text("--------------------\n"),
    escpos.align(0),
    escpos.text(content + "\n"),
    escpos.align(1),
    escpos.text("--------------------\n"),
    escpos.text("Printed: " + new Date().toLocaleString() + "\n"),
    escpos.feed(4),
    escpos.cut(),
  ]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONNECTION STATE ENUM
───────────────────────────────────────────────────────────────────────────── */

export type USBConnectionState =
  | "disconnected"
  | "opening" // ← device.open() in progress
  | "configuring" // ← selectConfiguration / claimInterface in progress
  | "connected"
  | "printing"
  | "closing"
  | "error";

/* ─────────────────────────────────────────────────────────────────────────────
   USB PRINTER MANAGER
───────────────────────────────────────────────────────────────────────────── */

export class USBPrinterManager {
  private device: WebUSBDevice | null = null;
  private endpointNumber: number = 1;
  private state: USBConnectionState = "disconnected";

  // ── Observers ──────────────────────────────────────────────────────────────
  private listeners: Array<(state: USBConnectionState, msg: string) => void> =
    [];

  onStateChange(fn: (state: USBConnectionState, msg: string) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(state: USBConnectionState, msg: string) {
    this.state = state;
    for (const fn of this.listeners) fn(state, msg);
    console.log(`[USBPrinter] ${state}: ${msg}`);
  }

  getState() {
    return this.state;
  }
  getDevice() {
    return this.device;
  }

  // ── Guard: prevent concurrent open/close calls ─────────────────────────────
  private isTransitioning(): boolean {
    return (
      this.state === "opening" ||
      this.state === "configuring" ||
      this.state === "closing"
    );
  }

  /* ── Request (user-gesture required) ─────────────────────────────────────── */
  async requestDevice(): Promise<WebUSBDevice> {
    const usb = getUSBApi();
    if (!usb) throw new Error("WebUSB is not supported in this browser.");

    const device = await usb.requestDevice({ filters: [{ classCode: 7 }] });
    return device;
  }

  /* ── Connect ──────────────────────────────────────────────────────────────── */
  async connectDevice(device: WebUSBDevice): Promise<void> {
    // ── GUARD: bail out if a state transition is already in progress ──────────
    if (this.isTransitioning()) {
      throw new InvalidStateError(
        "A connection operation is already in progress. Please wait.",
      );
    }

    // ── GUARD: already connected to this exact device ─────────────────────────
    if (this.state === "connected" && this.device === device && device.opened) {
      this.emit(
        "connected",
        "Already connected — reusing existing connection.",
      );
      return;
    }

    // ── Disconnect previous device cleanly first ──────────────────────────────
    if (this.device && this.device !== device) {
      await this.disconnect().catch(() => {
        /* best-effort */
      });
    }

    try {
      // ── STEP 1: open ───────────────────────────────────────────────────────
      if (!device.opened) {
        this.emit("opening", "Opening USB device…");
        await device.open();
      } else {
        this.emit("opening", "Device already open, skipping open()…");
      }

      // ── STEP 2: configure ──────────────────────────────────────────────────
      this.emit("configuring", "Selecting configuration…");

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      const iface = device.configuration!.interfaces[0];

      // Only claim if not already claimed
      if (!iface.claimed) {
        await device.claimInterface(iface.interfaceNumber);
      }

      // Locate bulk-OUT endpoint
      const endpoint = iface.alternate.endpoints.find(
        (e: USBEndpoint) => e.direction === "out" && e.type === "bulk",
      );
      if (!endpoint)
        throw new Error("No bulk OUT endpoint found on this device.");

      this.device = device;
      this.endpointNumber = endpoint.endpointNumber;

      this.emit(
        "connected",
        `Connected: ${device.productName ?? "USB Printer"} (endpoint ${endpoint.endpointNumber})`,
      );
    } catch (err: unknown) {
      this.emit(
        "error",
        `Connection failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  /* ── Auto-connect: reconnect to previously authorised devices ─────────────── */
  async autoConnect(): Promise<boolean> {
    // GUARD: don't auto-connect if already busy
    if (this.isTransitioning() || this.state === "connected") return false;

    const usb = getUSBApi();
    if (!usb) return false;

    try {
      const devices = await usb.getDevices();
      // Filter to printer class (classCode 7) — getDevices() returns all
      // previously authorised USB devices regardless of class.
      const printers = devices.filter((d) => {
        // Heuristic: check configuration for printer-class interface
        const iface = d.configuration?.interfaces?.[0];
        return iface?.alternate?.interfaceClass === 7;
      });

      if (printers.length === 0) return false;

      // Try the first available printer
      await this.connectDevice(printers[0]);
      return true;
    } catch (err) {
      console.warn("[USBPrinter] autoConnect failed:", err);
      return false;
    }
  }

  /* ── Print ────────────────────────────────────────────────────────────────── */
  async print(content: string): Promise<void> {
    if (this.state !== "connected" || !this.device) {
      throw new Error("Printer is not connected.");
    }

    this.emit("printing", `Sending ${content.length} chars to printer…`);

    try {
      const buffer = buildReceiptBuffer(content);
      await this.device.transferOut(this.endpointNumber, buffer);

      // Save to DB
      const db = await connectToDatabase();
      await db.collection("print_jobs").insertOne({
        content,
        connectionType: "usb",
        status: "success",
        timestamp: new Date(),
        createdAt: new Date(),
      });

      this.emit("connected", "Print job sent ✓");
    } catch (err: unknown) {
      this.emit(
        "error",
        `Print failed: ${err instanceof Error ? err.message : String(err)}`,
      );

      // Log failure to DB
      try {
        const db = await connectToDatabase();
        await db.collection("print_jobs").insertOne({
          content,
          connectionType: "usb",
          status: "failed",
          timestamp: new Date(),
          createdAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        });
      } catch {
        /* don't throw over a logging failure */
      }

      throw err;
    }
  }

  /* ── Disconnect ───────────────────────────────────────────────────────────── */
  async disconnect(): Promise<void> {
    if (this.isTransitioning()) {
      console.warn(
        "[USBPrinter] disconnect() called while transitioning — ignoring.",
      );
      return;
    }

    if (!this.device) {
      this.emit("disconnected", "No device to disconnect.");
      return;
    }

    this.emit("closing", "Closing USB device…");

    try {
      const iface = this.device.configuration?.interfaces?.[0];
      if (iface?.claimed) {
        await this.device
          .releaseInterface(iface.interfaceNumber)
          .catch(() => {});
      }
      if (this.device.opened) {
        await this.device.close();
      }
    } catch (err) {
      console.warn("[USBPrinter] Error during disconnect:", err);
    } finally {
      this.device = null;
      this.emit("disconnected", "USB printer disconnected.");
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM ERROR  — makes it easy to check for this specific error in callers
───────────────────────────────────────────────────────────────────────────── */

export class InvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateError";
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SINGLETON  — one manager instance for the whole app
───────────────────────────────────────────────────────────────────────────── */

export const usbPrinterManager = new USBPrinterManager();
