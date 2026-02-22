'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Inventory } from '@/models/Inventory';
import { UnitCategory } from '@/lib/unit-conversion';

// ─── Types (mirror rendezvous-server/events/inventoryEvents.ts) ───────────────
// Keep these in sync if you ever change the server-side types.

export interface InventoryAdjustment {
  itemId: string;
  itemName: string;
  adjustmentType: 'restock' | 'usage' | 'waste' | 'correction';
  quantity: number;       // value in base unit (already converted)
  unit: string;           // base unit  e.g. "g"
  displayUnit: string;    // display unit e.g. "kg"
  newStock: number;       // updated currentStock in base unit
  status: 'critical' | 'low' | 'warning' | 'ok';
  performedBy: string;
  notes?: string;
  timestamp: Date;
}

export interface InventoryAlert {
  itemId: string;
  itemName: string;
  category: string;
  currentStock: number;   // base unit
  minStock: number;       // base unit
  reorderPoint: number;   // base unit
  unit: string;           // base unit
  displayUnit: string;    // display unit
  unitCategory: UnitCategory;
  status: 'critical' | 'low' | 'warning';
  location: string;
}

export interface InventoryItemCreated {
  itemId: string;
  name: string;
  category: string;
  currentStock: number;   // base unit
  unit: string;           // base unit
  displayUnit: string;    // display unit
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

// ─── Hook Options ─────────────────────────────────────────────────────────────

interface UseInventorySocketOptions {
  userId: string;
  userName?: string;
  /** Called when any session adjusts stock — use to sync local inventory state */
  onInventoryAdjusted?: (data: InventoryAdjustment) => void;
  /** Called when a critical/low alert is broadcast */
  onInventoryAlert?: (data: InventoryAlert) => void;
  /** Called when any session adds a new item — usually triggers a full reload */
  onItemCreated?: (data: InventoryItemCreated) => void;
  /** Called when any session deletes an item */
  onItemDeleted?: (data: InventoryItemDeleted) => void;
  /** Called after a bulk import completes on any session */
  onBulkImported?: (data: InventoryBulkImport) => void;
}

// ─── Singleton Socket ─────────────────────────────────────────────────────────
// One connection is shared across all hook instances on the same page.

let _socket: Socket | null = null;

function getSocket(userId: string, userName?: string): Socket {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:8080';

  if (!_socket || !_socket.connected) {
    _socket = io(url, {
      auth: { userId, userName },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }

  return _socket;
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
}: UseInventorySocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket(userId, userName);
    socketRef.current = socket;

    // ── Connect ────────────────────────────────────────────────

    const handleConnect = () => {
      console.log('📦 [inventory socket] connected:', socket.id);
      socket.emit('user:online');
      socket.emit('inventory:subscribe');
      socket.emit('inventory:alerts:subscribe');
    };

    const handleConnectError = (err: Error) => {
      console.error('❌ [inventory socket] connection error:', err.message);
    };

    const handleDisconnect = (reason: string) => {
      console.warn('📦 [inventory socket] disconnected:', reason);
    };

    // ── Inventory events ───────────────────────────────────────

    const handleAdjusted = (data: InventoryAdjustment) => {
      onInventoryAdjusted?.(data);
    };

    const handleAlert = (data: InventoryAlert) => {
      const emoji = data.status === 'critical' ? '🚨' : '⚠️';
      toast.warning(`${emoji} ${data.itemName} is ${data.status}`, {
        description: `Stock: ${data.currentStock} ${data.unit} (${data.displayUnit})`,
        duration: 6000,
      });
      onInventoryAlert?.(data);
    };

    const handleItemCreated = (data: InventoryItemCreated) => {
      onItemCreated?.(data);
    };

    const handleItemDeleted = (data: InventoryItemDeleted) => {
      onItemDeleted?.(data);
    };

    const handleBulkImported = (data: InventoryBulkImport) => {
      onBulkImported?.(data);
    };

    // ── Register listeners ─────────────────────────────────────

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('inventory:adjusted', handleAdjusted);
    socket.on('inventory:alert', handleAlert);
    socket.on('inventory:item:created', handleItemCreated);
    socket.on('inventory:item:deleted', handleItemDeleted);
    socket.on('inventory:bulk:imported', handleBulkImported);

    // If already connected when effect runs, join rooms immediately
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('inventory:adjusted', handleAdjusted);
      socket.off('inventory:alert', handleAlert);
      socket.off('inventory:item:created', handleItemCreated);
      socket.off('inventory:item:deleted', handleItemDeleted);
      socket.off('inventory:bulk:imported', handleBulkImported);
      socket.emit('inventory:unsubscribe');
      socket.emit('inventory:alerts:unsubscribe');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ─── Emit helpers ─────────────────────────────────────────────────────────
  // Call these after each successful API action so other sessions update.

  /**
   * Emit after adjustStock() API call succeeds.
   * Pass the full Inventory item + the API response to build the payload.
   */
  const emitAdjusted = useCallback(
    (
      item: Inventory,
      adjustmentType: InventoryAdjustment['adjustmentType'],
      quantity: number,         // converted quantity in base unit
      newStock: number,
      status: InventoryAdjustment['status'],
      performedBy: string,
      notes?: string
    ) => {
      const payload: InventoryAdjustment = {
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
      };
      socketRef.current?.emit('inventory:adjusted:trigger', payload);
    },
    []
  );

  /**
   * Emit after createInventoryItem() API call succeeds.
   */
  const emitItemCreated = useCallback(
    (item: Inventory, createdBy: string) => {
      const payload: InventoryItemCreated = {
        itemId: item._id!.toString(),
        name: item.name,
        category: item.category,
        currentStock: item.currentStock,
        unit: item.unit,
        displayUnit: item.displayUnit,
        unitCategory: item.unitCategory,
        createdBy,
      };
      socketRef.current?.emit('inventory:item:created:trigger', payload);
    },
    []
  );

  /**
   * Emit after deleteInventoryItem() API call succeeds.
   */
  const emitItemDeleted = useCallback(
    (itemId: string, itemName: string, deletedBy: string) => {
      const payload: InventoryItemDeleted = { itemId, name: itemName, deletedBy };
      socketRef.current?.emit('inventory:item:deleted:trigger', payload);
    },
    []
  );

  /**
   * Emit after a bulk import finishes.
   */
  const emitBulkImported = useCallback(
    (importedCount: number, failedCount: number, importedBy: string) => {
      const payload: InventoryBulkImport = {
        importedCount,
        failedCount,
        importedBy,
        timestamp: new Date(),
      };
      socketRef.current?.emit('inventory:bulk:imported:trigger', payload);
    },
    []
  );

  return {
    emitAdjusted,
    emitItemCreated,
    emitItemDeleted,
    emitBulkImported,
  };
}