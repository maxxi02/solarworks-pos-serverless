"use client";

import React, { useState, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   DOMAIN TYPES
───────────────────────────────────────────────────────────────────────────── */

type ConnectionType = "bluetooth" | "usb" | null;
type PrinterStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

interface PrintJob {
  _id?: string;
  content: string;
  timestamp: Date;
  status: "pending" | "success" | "failed";
  connectionType: ConnectionType;
}

/* ─────────────────────────────────────────────────────────────────────────────
   WEB-BLUETOOTH SHIMS
   The lib.dom.d.ts definitions for Web Bluetooth are incomplete / wrong in many
   TS versions.  We redeclare the parts we actually use so the compiler is happy.
───────────────────────────────────────────────────────────────────────────── */

interface BTCharProps {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BTCharacteristic {
  uuid: string;
  properties: BTCharProps;
  value: DataView | null;
  writeValue(value: ArrayBuffer): Promise<void>;
  writeValueWithoutResponse(value: ArrayBuffer): Promise<void>;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<BTCharacteristic>;
  stopNotifications(): Promise<BTCharacteristic>;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

interface BTService {
  uuid: string;
  device: BluetoothDevice;
  // Note: the correct API name is getCharacteristic (singular) for one UUID,
  // or getCharacteristics (plural, no arg) for all.
  getCharacteristics(): Promise<BTCharacteristic[]>;
  getCharacteristic(uuid: string): Promise<BTCharacteristic>;
}

interface BTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BTService>;
  getPrimaryServices(): Promise<BTService[]>;
}

interface BTDevice {
  id: string;
  name?: string;
  gatt?: BTServer;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
}

interface BTRequestDeviceFilter {
  name?: string;
  namePrefix?: string;
  // "services" IS a valid filter key per the Web Bluetooth spec —
  // it just happens to be missing from some TS lib versions.
  services?: string[];
}

interface BTRequestDeviceOptions {
  // Provide EITHER filters OR acceptAllDevices (not both)
  filters?: BTRequestDeviceFilter[];
  acceptAllDevices?: boolean;
  optionalServices?: string[];
}

interface WebBluetooth {
  requestDevice(options: BTRequestDeviceOptions): Promise<BTDevice>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   WEBUSB SHIMS
───────────────────────────────────────────────────────────────────────────── */

interface USBEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
  packetSize: number;
}

interface USBAlternateInterface {
  alternateSetting: number;
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

interface WebUSBDevice {
  productName: string | null;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  // Use ArrayBuffer (not Uint8Array) to avoid SharedArrayBuffer compat issues
  transferOut(
    endpointNumber: number,
    data: ArrayBuffer,
  ): Promise<{ bytesWritten: number }>;
}

interface WebUSBRequestDeviceOptions {
  filters: Array<{ classCode?: number; vendorId?: number; productId?: number }>;
}

interface WebUSB {
  requestDevice(options: WebUSBRequestDeviceOptions): Promise<WebUSBDevice>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   NAVIGATOR AUGMENTATION  (cast via unknown — never mutate the global)
───────────────────────────────────────────────────────────────────────────── */

interface AugmentedNavigator {
  bluetooth: WebBluetooth;
  usb: WebUSB;
}

function getBluetooth(): WebBluetooth | null {
  return "bluetooth" in navigator
    ? (navigator as unknown as AugmentedNavigator).bluetooth
    : null;
}

function getUSB(): WebUSB | null {
  return "usb" in navigator
    ? (navigator as unknown as AugmentedNavigator).usb
    : null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ESC/POS HELPERS
   All intermediate arrays use new Uint8Array([...]).buffer so we always hand
   an ArrayBuffer — never a Uint8Array — to the printer APIs, avoiding the
   SharedArrayBuffer assignability error.
───────────────────────────────────────────────────────────────────────────── */

function bytes(...vals: number[]): ArrayBuffer {
  return new Uint8Array(vals).buffer as ArrayBuffer;
}

const ESC = 0x1b;
const GS = 0x1d;

const escInit = (): ArrayBuffer => bytes(ESC, 0x40);
const escAlign = (a: 0 | 1 | 2): ArrayBuffer => bytes(ESC, 0x61, a);
const escBold = (on: boolean): ArrayBuffer => bytes(ESC, 0x45, on ? 1 : 0);
const escSize = (w: 0 | 1, h: 0 | 1): ArrayBuffer =>
  bytes(GS, 0x21, (w << 4) | h);
const escFeed = (n = 3): ArrayBuffer => bytes(ESC, 0x64, n);
const escCut = (): ArrayBuffer => bytes(GS, 0x56, 0x41, 0x05);

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

function buildPrintBuffer(content: string): ArrayBuffer {
  return concatBuffers([
    escInit(),
    escAlign(1),
    escBold(true),
    escSize(1, 1),
    encodeText("RECEIPT\n"),
    escBold(false),
    escSize(0, 0),
    encodeText("--------------------\n"),
    escAlign(0),
    encodeText(content + "\n"),
    escAlign(1),
    encodeText("--------------------\n"),
    encodeText("Printed: " + new Date().toLocaleString() + "\n"),
    escFeed(4),
    escCut(),
  ]);
}

/* Slice an ArrayBuffer into a chunk of up to `size` bytes starting at `offset` */
function sliceBuffer(
  buf: ArrayBuffer,
  offset: number,
  size: number,
): ArrayBuffer {
  return buf.slice(offset, offset + size);
}

/* ─────────────────────────────────────────────────────────────────────────────
   API HELPER  — saves job via your existing /api/print-jobs route
───────────────────────────────────────────────────────────────────────────── */

async function saveJobToApi(job: Omit<PrintJob, "_id">): Promise<void> {
  try {
    await fetch("/api/print-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
  } catch (err) {
    console.error("Failed to save print job:", err);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export default function PrinterPage() {
  const [status, setStatus] = useState<PrinterStatus>("disconnected");
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);
  const [content, setContent] = useState(
    "Hello from Thermal Printer!\nLine 2\nLine 3",
  );
  const [log, setLog] = useState<string[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);

  const btCharRef = useRef<BTCharacteristic | null>(null);
  const btDeviceRef = useRef<BTDevice | null>(null);
  const usbDeviceRef = useRef<WebUSBDevice | null>(null);
  const usbEndpointRef = useRef<number>(1);

  const addLog = (msg: string) =>
    setLog((prev) =>
      [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50),
    );

  /* ── Bluetooth ────────────────────────────────────────────────────────── */

  const connectBluetooth = useCallback(async () => {
    const bt = getBluetooth();
    if (!bt) {
      addLog("Web Bluetooth not supported in this browser.");
      setStatus("error");
      return;
    }

    try {
      setStatus("connecting");
      addLog("Requesting Bluetooth device…");

      // ── Strategy: acceptAllDevices + declare every known thermal printer
      //    service as optional. This avoids filter mismatches that cause the
      //    browser to silently cancel or reject the connection.
      const KNOWN_SERVICES = [
        "000018f0-0000-1000-8000-00805f9b34fb", // common ESC/POS BT
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Xprinter / HOIN
        "49535343-fe7d-4ae5-8fa9-9fafd205e455", // common serial over BLE
        "0000ffe0-0000-1000-8000-00805f9b34fb", // HM-10 / CC254x
        "0000ff00-0000-1000-8000-00805f9b34fb", // generic printer BLE
      ];

      const device = await bt.requestDevice({
        // acceptAllDevices lets the user pick ANY paired device —
        // no UUID filter mismatch, no silent cancel.
        acceptAllDevices: true,
        optionalServices: KNOWN_SERVICES,
      } as BTRequestDeviceOptions);

      btDeviceRef.current = device;
      addLog(`Found device: ${device.name ?? "Unknown"}`);

      const server = await device.gatt!.connect();
      addLog("GATT connected");

      // ── Auto-discover: try all known service UUIDs, then fall back to
      //    getPrimaryServices() which returns whatever the device actually has.
      let characteristic: BTCharacteristic | null = null;

      // Pass 1 — known UUIDs
      for (const uuid of KNOWN_SERVICES) {
        try {
          const service = await server.getPrimaryService(uuid);
          const chars = await service.getCharacteristics();
          characteristic =
            chars.find(
              (c: BTCharacteristic) =>
                c.properties.write || c.properties.writeWithoutResponse,
            ) ?? null;
          if (characteristic) {
            addLog(`Service matched: ${uuid.slice(4, 8).toUpperCase()}`);
            break;
          }
        } catch {
          /* not available on this device */
        }
      }

      // Pass 2 — enumerate all services the device exposes
      if (!characteristic) {
        addLog("Known UUIDs not found, enumerating all services…");
        try {
          const services = await server.getPrimaryServices();
          addLog(`Device exposes ${services.length} service(s)`);
          for (const service of services) {
            addLog(`  Trying service: ${service.uuid}`);
            try {
              const chars = await service.getCharacteristics();
              characteristic =
                chars.find(
                  (c: BTCharacteristic) =>
                    c.properties.write || c.properties.writeWithoutResponse,
                ) ?? null;
              if (characteristic) {
                addLog(`  → Using: ${service.uuid}`);
                break;
              }
            } catch {
              /* no readable characteristics */
            }
          }
        } catch (e) {
          addLog(
            `Service enumeration failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      if (!characteristic)
        throw new Error("No writable characteristic found on this device");

      btCharRef.current = characteristic;
      addLog(`Characteristic: ${characteristic.uuid}`);
      addLog(
        `Write: ${characteristic.properties.write} | WriteNoResp: ${characteristic.properties.writeWithoutResponse}`,
      );

      setConnectionType("bluetooth");
      setStatus("connected");
      addLog("Bluetooth printer ready ✓");

      device.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
        setConnectionType(null);
        btCharRef.current = null;
        addLog("Bluetooth disconnected");
      });
    } catch (err: unknown) {
      setStatus("error");
      addLog(
        `Bluetooth error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, []);

  /* ── USB ──────────────────────────────────────────────────────────────── */

  const connectUSB = useCallback(async () => {
    const usb = getUSB();
    if (!usb) {
      addLog("WebUSB not supported in this browser.");
      setStatus("error");
      return;
    }

    try {
      setStatus("connecting");
      addLog("Requesting USB device…");

      const device = await usb.requestDevice({ filters: [{ classCode: 7 }] });

      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);

      const iface = device.configuration!.interfaces[0];
      await device.claimInterface(iface.interfaceNumber);

      const endpoint = iface.alternate.endpoints.find(
        (e: USBEndpoint) => e.direction === "out" && e.type === "bulk",
      );
      if (!endpoint) throw new Error("No bulk OUT endpoint found");

      usbDeviceRef.current = device;
      usbEndpointRef.current = endpoint.endpointNumber;

      setConnectionType("usb");
      setStatus("connected");
      addLog(`USB printer ready ✓ (${device.productName ?? "Unknown"})`);
    } catch (err: unknown) {
      setStatus("error");
      addLog(`USB error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  /* ── Disconnect ───────────────────────────────────────────────────────── */

  const disconnect = useCallback(async () => {
    if (connectionType === "bluetooth") {
      try {
        btDeviceRef.current?.gatt?.disconnect();
      } catch {
        /* ignore */
      }
    }
    if (connectionType === "usb" && usbDeviceRef.current) {
      try {
        await usbDeviceRef.current.close();
      } catch {
        /* ignore */
      }
    }
    setStatus("disconnected");
    setConnectionType(null);
    addLog("Disconnected");
  }, [connectionType]);

  /* ── Print ────────────────────────────────────────────────────────────── */

  const print = useCallback(async () => {
    if (status !== "connected") return;
    setStatus("printing");
    addLog("Building print buffer…");

    const job: Omit<PrintJob, "_id"> = {
      content,
      timestamp: new Date(),
      status: "pending",
      connectionType,
    };

    try {
      const buffer = buildPrintBuffer(content);
      addLog(`Buffer: ${buffer.byteLength} bytes`);

      if (connectionType === "bluetooth" && btCharRef.current) {
        const CHUNK = 512;
        const char = btCharRef.current;

        for (let offset = 0; offset < buffer.byteLength; offset += CHUNK) {
          const chunk = sliceBuffer(buffer, offset, CHUNK);
          if (char.properties.writeWithoutResponse) {
            await char.writeValueWithoutResponse(chunk);
          } else {
            await char.writeValue(chunk);
          }
          // Small delay to avoid BT buffer overflow
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
        }
      } else if (connectionType === "usb" && usbDeviceRef.current) {
        await usbDeviceRef.current.transferOut(usbEndpointRef.current, buffer);
      }

      job.status = "success";
      addLog("Print job sent ✓");
    } catch (err: unknown) {
      job.status = "failed";
      addLog(
        `Print error: ${err instanceof Error ? err.message : String(err)}`,
      );
      setStatus("error");
    } finally {
      await saveJobToApi(job);
      setJobs((prev) => [{ ...job, _id: Date.now().toString() }, ...prev]);
      if (job.status === "success") setStatus("connected");
    }
  }, [status, content, connectionType]);

  /* ── Render ───────────────────────────────────────────────────────────── */

  const statusColor: Record<PrinterStatus, string> = {
    disconnected: "#6b7280",
    connecting: "#f59e0b",
    connected: "#10b981",
    printing: "#3b82f6",
    error: "#ef4444",
  };

  const statusLabel: Record<PrinterStatus, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting…",
    connected: `Connected via ${connectionType ?? ""}`,
    printing: "Printing…",
    error: "Error",
  };

  const isConnectDisabled =
    status === "connected" || status === "connecting" || status === "printing";

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.headerLeft}>
            <PrinterSVG />
            <div>
              <h1 style={S.title}>ThermalPrint</h1>
              <p style={S.subtitle}>Bluetooth &amp; USB Thermal Printer</p>
            </div>
          </div>
          <div
            style={{
              ...S.statusBadge,
              borderColor: statusColor[status],
              color: statusColor[status],
            }}
          >
            <span style={{ ...S.statusDot, background: statusColor[status] }} />
            {statusLabel[status]}
          </div>
        </div>
      </header>

      <main style={S.main}>
        {/* Connection */}
        <section style={S.card}>
          <h2 style={S.cardTitle}>Connection</h2>
          <div style={S.btnRow}>
            <button
              style={{
                ...S.btn,
                ...(connectionType === "bluetooth" && status === "connected"
                  ? S.btnActive
                  : {}),
              }}
              onClick={connectBluetooth}
              disabled={isConnectDisabled}
            >
              <BluetoothIcon /> Connect Bluetooth
            </button>
            <button
              style={{
                ...S.btn,
                ...(connectionType === "usb" && status === "connected"
                  ? S.btnActive
                  : {}),
              }}
              onClick={connectUSB}
              disabled={isConnectDisabled}
            >
              <UsbIcon /> Connect USB
            </button>
            {(status === "connected" || status === "printing") && (
              <button style={{ ...S.btn, ...S.btnDanger }} onClick={disconnect}>
                Disconnect
              </button>
            )}
          </div>
        </section>

        {/* Print content */}
        <section style={S.card}>
          <h2 style={S.cardTitle}>Print Content</h2>
          <div style={S.previewWrap}>
            <div style={S.receipt}>
              <div style={S.receiptHeader}>RECEIPT</div>
              <div style={S.receiptDiv}>--------------------</div>
              <pre style={S.receiptPre}>{content}</pre>
              <div style={S.receiptDiv}>--------------------</div>
              <div style={S.receiptFooter}>{new Date().toLocaleString()}</div>
            </div>
            <textarea
              style={S.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter content to print…"
              rows={6}
            />
          </div>
          <button
            style={{
              ...S.printBtn,
              ...(status !== "connected" ? S.printBtnDisabled : {}),
              ...(status === "printing" ? S.printBtnActive : {}),
            }}
            onClick={print}
            disabled={status !== "connected"}
          >
            {status === "printing" ? (
              <>
                <span style={S.spinner} /> Printing…
              </>
            ) : (
              <>
                <PrintIcon /> Print Now
              </>
            )}
          </button>
        </section>

        {/* Log + History */}
        <div style={S.grid}>
          <section style={{ ...S.card, flex: 1, minWidth: 260 }}>
            <h2 style={S.cardTitle}>Device Log</h2>
            <div style={S.logBox}>
              {log.length === 0 && <span style={S.muted}>No activity yet</span>}
              {log.map((l, i) => (
                <div key={i} style={S.logLine}>
                  {l}
                </div>
              ))}
            </div>
          </section>

          <section style={{ ...S.card, flex: 1, minWidth: 260 }}>
            <h2 style={S.cardTitle}>Print History</h2>
            <div style={S.logBox}>
              {jobs.length === 0 && <span style={S.muted}>No jobs yet</span>}
              {jobs.map((j) => (
                <div key={j._id} style={S.jobRow}>
                  <span
                    style={{
                      ...S.jobIcon,
                      color:
                        j.status === "success"
                          ? "#10b981"
                          : j.status === "failed"
                            ? "#ef4444"
                            : "#f59e0b",
                    }}
                  >
                    {j.status === "success"
                      ? "✓"
                      : j.status === "failed"
                        ? "✗"
                        : "…"}
                  </span>
                  <div>
                    <div style={S.jobContent}>
                      {j.content.slice(0, 42)}
                      {j.content.length > 42 ? "…" : ""}
                    </div>
                    <div style={S.jobMeta}>
                      {j.connectionType?.toUpperCase()} ·{" "}
                      {new Date(j.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer style={S.footer}>
        ⚠️ Requires Chrome / Edge — Web Bluetooth &amp; WebUSB require HTTPS or
        localhost.
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG ICONS
───────────────────────────────────────────────────────────────────────────── */

function PrinterSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect
        x="4"
        y="11"
        width="24"
        height="14"
        rx="3"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <rect x="8" y="4" width="16" height="9" rx="2" fill="#334155" />
      <rect x="8" y="18" width="16" height="5" rx="1" fill="#0f172a" />
      <circle cx="23" cy="17" r="2" fill="#10b981" />
    </svg>
  );
}
function BluetoothIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
    </svg>
  );
}
function UsbIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="7" r="1" />
      <circle cx="14" cy="7" r="1" />
      <path d="M8 7H6v10l6 4 6-4V7h-2" />
      <line x1="12" y1="7" x2="12" y2="21" />
    </svg>
  );
}
function PrintIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "'DM Mono','Fira Code',monospace",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    borderBottom: "1px solid #1e293b",
    background: "#0f172a",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#f8fafc",
  },
  subtitle: { margin: 0, fontSize: 12, color: "#64748b", marginTop: 2 },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid",
    borderRadius: 99,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 500,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  main: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    flex: 1,
    width: "100%",
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: 24,
  },
  cardTitle: {
    margin: "0 0 18px",
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#94a3b8",
  },
  btnRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "10px 18px",
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnActive: {
    borderColor: "#10b981",
    color: "#10b981",
    background: "rgba(16,185,129,0.08)",
  },
  btnDanger: { borderColor: "#ef4444", color: "#ef4444" },
  previewWrap: { display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" },
  receipt: {
    background: "#fff",
    color: "#111",
    fontFamily: "'Courier New',monospace",
    fontSize: 12,
    lineHeight: 1.6,
    borderRadius: 6,
    padding: "16px 20px",
    minWidth: 200,
    maxWidth: 240,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    flexShrink: 0,
  },
  receiptHeader: {
    textAlign: "center",
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 4,
  },
  receiptDiv: { textAlign: "center", color: "#555", margin: "4px 0" },
  receiptPre: {
    margin: "6px 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  receiptFooter: {
    textAlign: "center",
    fontSize: 10,
    color: "#777",
    marginTop: 4,
  },
  textarea: {
    flex: 1,
    minWidth: 220,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#e2e8f0",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.6,
    padding: "12px 14px",
    resize: "vertical",
    outline: "none",
  },
  printBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  printBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  printBtnActive: { background: "linear-gradient(135deg,#6366f1,#4338ca)" },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  grid: { display: "flex", gap: 24, flexWrap: "wrap" },
  logBox: {
    background: "#0f172a",
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    overflowY: "auto",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.7,
    border: "1px solid #334155",
  },
  logLine: {
    color: "#94a3b8",
    borderBottom: "1px solid #1e293b",
    paddingBottom: 2,
    marginBottom: 2,
  },
  muted: { color: "#334155" },
  jobRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "6px 0",
    borderBottom: "1px solid #1e293b",
  },
  jobIcon: { fontSize: 16, fontWeight: 700, lineHeight: 1.2, minWidth: 16 },
  jobContent: { fontSize: 13, color: "#cbd5e1" },
  jobMeta: { fontSize: 11, color: "#475569", marginTop: 2 },
  footer: {
    textAlign: "center",
    padding: "20px 24px",
    fontSize: 12,
    color: "#475569",
    borderTop: "1px solid #1e293b",
  },
};
