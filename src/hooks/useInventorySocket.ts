"use client";

import { useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "@/provider/socket-provider";
import { toast } from "sonner";
import { Inventory } from "@/models/Inventory";
import { UnitCategory } from "@/lib/unit-conversion";

// ─── Types (mirror rendezvous-server/events/inventoryEvents.ts) ───────────────

export interface InventoryAdjustment {
  itemId: string;
  itemName: string;
  adjustmentType: "restock" | "usage" | "waste" | "correction";
  quantity: number;
  unit: string;
  displayUnit: string;
  newStock: number;
  status: "critical" | "low" | "warning" | "ok";
  performedBy: string;
  notes?: string;
  timestamp: Date;
}

export interface InventoryAlert {
  itemId: string;
  itemName: string;
  category: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  unit: string;
  displayUnit: string;
  unitCategory: UnitCategory;
  status: "critical" | "low" | "warning";
  location: string;
}

export interface InventoryItemCreated {
  itemId: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  displayUnit: string;
  unitCategory: UnitCategory;
  createdBy: string;
}

export interface InventoryItemDeleted {
  itemId: string;
  name: string;
  deletedBy: string;
}

export interface InventoryBulkImport {
  importedCount: number;
  failedCount: number;
  importedBy: string;
  timestamp: Date;
}

export interface AuditEntry {
  _id: string;
  itemId: string;
  itemName: string;
  type:
    | "restock"
    | "usage"
    | "waste"
    | "correction"
    | "deduction"
    | "adjustment";
  quantity: number;
  unit: string;
  originalQuantity?: number;
  originalUnit?: string;
  previousStock: number;
  newStock: number;
  notes?: string;
  conversionNote?: string;
  reference?: {
    type: "order" | "manual" | "return" | "adjustment" | "rollback";
    id?: string;
    number?: string;
  };
  transactionId?: string;
  performedBy: string;
  createdAt: string;
}

// ─── Hook Options ─────────────────────────────────────────────────────────────

interface UseInventorySocketOptions {
  userId: string;
  userName?: string;
  onInventoryAdjusted?: (data: InventoryAdjustment) => void;
  onInventoryAlert?: (data: InventoryAlert) => void;
  onItemCreated?: (data: InventoryItemCreated) => void;
  onItemDeleted?: (data: InventoryItemDeleted) => void;
  onBulkImported?: (data: InventoryBulkImport) => void;
  onAuditEntry?: (data: AuditEntry) => void;
  subscribeToAudit?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInventorySocket({
  userId,
  userName,
  onInventoryAdjusted,
  onInventoryAlert,
  onItemCreated,
  onItemDeleted,
  onBulkImported,
  onAuditEntry,
  subscribeToAudit = false,
  onConnect,
  onDisconnect,
}: UseInventorySocketOptions) {
  const { socket } = useSocket();
  const socketRef = useRef<Socket | null>(null);

  // Store every callback in a ref, synced on every render.
  // Socket listeners call the ref instead of the function directly.
  // This means onAuditEntry (and all others) always see the LATEST values of
  // searchQuery, pagination.page, selectedType, etc. — not the stale values
  // frozen at mount time when the useEffect registered the listener.
  const onInventoryAdjustedRef = useRef(onInventoryAdjusted);
  const onInventoryAlertRef = useRef(onInventoryAlert);
  const onItemCreatedRef = useRef(onItemCreated);
  const onItemDeletedRef = useRef(onItemDeleted);
  const onBulkImportedRef = useRef(onBulkImported);
  const onAuditEntryRef = useRef(onAuditEntry);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Sync refs with the latest props on every render.
  // Intentionally no dep array — these run after every render cheaply.
  useEffect(() => {
    onInventoryAdjustedRef.current = onInventoryAdjusted;
  });
  useEffect(() => {
    onInventoryAlertRef.current = onInventoryAlert;
  });
  useEffect(() => {
    onItemCreatedRef.current = onItemCreated;
  });
  useEffect(() => {
    onItemDeletedRef.current = onItemDeleted;
  });
  useEffect(() => {
    onBulkImportedRef.current = onBulkImported;
  });
  useEffect(() => {
    onAuditEntryRef.current = onAuditEntry;
  });
  useEffect(() => {
    onConnectRef.current = onConnect;
  });
  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  });

  useEffect(() => {
    if (!socket) return;
    socketRef.current = socket;

    // Stable handler functions — defined once per effect run.
    // They delegate to refs so they always call the latest callback.

    const handleConnect = () => {
      console.log("📦 [inventory socket] connected:", socket.id);
      socket.emit("user:online");
      socket.emit("inventory:subscribe");
      socket.emit("inventory:alerts:subscribe");
      if (subscribeToAudit) socket.emit("inventory:audit:subscribe");
      onConnectRef.current?.();
    };

    const handleConnectError = (err: Error) => {
      console.error("❌ [inventory socket] error:", err.message);
      onDisconnectRef.current?.();
    };

    const handleDisconnect = (reason: string) => {
      console.warn("📦 [inventory socket] disconnected:", reason);
      onDisconnectRef.current?.();
    };

    // Each handler calls through its ref — always the latest version
    const handleAdjusted = (data: InventoryAdjustment) =>
      onInventoryAdjustedRef.current?.(data);
    const handleAlert = (data: InventoryAlert) => {
      const emoji = data.status === "critical" ? "🚨" : "⚠️";
      toast.warning(`${emoji} ${data.itemName} is ${data.status}`, {
        description: `Stock: ${data.currentStock} ${data.unit} (${data.displayUnit})`,
        duration: 6000,
      });
      onInventoryAlertRef.current?.(data);
    };
    const handleItemCreated = (data: InventoryItemCreated) =>
      onItemCreatedRef.current?.(data);
    const handleItemDeleted = (data: InventoryItemDeleted) =>
      onItemDeletedRef.current?.(data);
    const handleBulkImported = (data: InventoryBulkImport) =>
      onBulkImportedRef.current?.(data);
    const handleAuditEntry = (data: AuditEntry) =>
      onAuditEntryRef.current?.(data);

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("inventory:adjusted", handleAdjusted);
    socket.on("inventory:alert", handleAlert);
    socket.on("inventory:item:created", handleItemCreated);
    socket.on("inventory:item:deleted", handleItemDeleted);
    socket.on("inventory:bulk:imported", handleBulkImported);
    socket.on("inventory:audit:new", handleAuditEntry);

    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("inventory:adjusted", handleAdjusted);
      socket.off("inventory:alert", handleAlert);
      socket.off("inventory:item:created", handleItemCreated);
      socket.off("inventory:item:deleted", handleItemDeleted);
      socket.off("inventory:bulk:imported", handleBulkImported);
      socket.off("inventory:audit:new", handleAuditEntry);
      socket.emit("inventory:unsubscribe");
      socket.emit("inventory:alerts:unsubscribe");
      if (subscribeToAudit) socket.emit("inventory:audit:unsubscribe");
    };
    // Only re-run when connection identity changes. Callback freshness is handled
    // by the ref pattern above — callbacks are intentionally NOT in deps here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, subscribeToAudit]);

  // ─── Emit helpers ──────────────────────────────────────────────────────────

  const emitAdjusted = useCallback(
    (
      item: Inventory,
      adjustmentType: InventoryAdjustment["adjustmentType"],
      quantity: number,
      newStock: number,
      status: InventoryAdjustment["status"],
      performedBy: string,
      notes?: string,
    ) => {
      socketRef.current?.emit("inventory:adjusted:trigger", {
        itemId: item._id!.toString(),
        itemName: item.name,
        adjustmentType,
        quantity,
        unit: item.unit,
        displayUnit: item.displayUnit,
        newStock,
        status,
        performedBy,
        notes,
        timestamp: new Date(),
      } satisfies InventoryAdjustment);
    },
    [],
  );

  const emitItemCreated = useCallback((item: Inventory, createdBy: string) => {
    socketRef.current?.emit("inventory:item:created:trigger", {
      itemId: item._id!.toString(),
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      unit: item.unit,
      displayUnit: item.displayUnit,
      unitCategory: item.unitCategory,
      createdBy,
    } satisfies InventoryItemCreated);
  }, []);

  const emitItemDeleted = useCallback(
    (itemId: string, itemName: string, deletedBy: string) => {
      socketRef.current?.emit("inventory:item:deleted:trigger", {
        itemId,
        name: itemName,
        deletedBy,
      } satisfies InventoryItemDeleted);
    },
    [],
  );

  const emitBulkImported = useCallback(
    (importedCount: number, failedCount: number, importedBy: string) => {
      socketRef.current?.emit("inventory:bulk:imported:trigger", {
        importedCount,
        failedCount,
        importedBy,
        timestamp: new Date(),
      } satisfies InventoryBulkImport);
    },
    [],
  );

  const emitAuditEntry = useCallback((entry: AuditEntry) => {
    socketRef.current?.emit("inventory:audit:trigger", entry);
  }, []);

  return {
    emitAdjusted,
    emitItemCreated,
    emitItemDeleted,
    emitBulkImported,
    emitAuditEntry,
  };
}
