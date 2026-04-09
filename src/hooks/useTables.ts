"use client";

import { useState, useEffect, useCallback } from "react";

import { useSocket } from "@/provider/socket-provider";

export interface Table {
  _id: string;
  tableId: string;
  label: string;
  qrCodeUrl: string;
  qrType: "dine-in" | "walk-in" | "drive-thru" | "take-away";
  status: "available" | "occupied" | "reserved" | "unavailable";
  currentSessionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function useTables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { onTableUpdated, offTableUpdated } = useSocket();

  const fetchTables = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/tables");
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (!onTableUpdated || !offTableUpdated) return;

    const handleTableUpdate = (updatedTable: any) => {
      setTables((prev) => {
        // Find if table exists; if yes, update it; if no, add it.
        const exists = prev.find((t) => t.tableId === updatedTable.tableId);
        if (exists) {
          return prev.map((t) =>
            t.tableId === updatedTable.tableId ? { ...t, ...updatedTable } : t,
          );
        }
        return [...prev, updatedTable];
      });
    };

    onTableUpdated(handleTableUpdate);
    return () => offTableUpdated(handleTableUpdate);
  }, [onTableUpdated, offTableUpdated]);

  const createTable = useCallback(
    async (label: string, qrType: string = "dine-in") => {
      try {
        const res = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, qrType }),
        });
        if (!res.ok) throw new Error("Failed to create table");
        const newTable = await res.json();
        setTables((prev) => [...prev, newTable]);
        return newTable;
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  const updateTable = useCallback(
    async (tableId: string, data: { label?: string; status?: string }) => {
      try {
        const res = await fetch("/api/tables", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId, ...data }),
        });
        if (!res.ok) throw new Error("Failed to update table");
        const updated = await res.json();
        setTables((prev) =>
          prev.map((t) => (t.tableId === tableId ? { ...t, ...updated } : t)),
        );
        return updated;
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  const deleteTable = useCallback(async (tableId: string) => {
    try {
      const res = await fetch(`/api/tables?tableId=${tableId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete table");
      setTables((prev) => prev.filter((t) => t.tableId !== tableId));
    } catch (err) {
      throw err;
    }
  }, []);

  const generateQR = useCallback(
    async (qrType: "walk-in" | "drive-thru" | "take-away") => {
      try {
        const res = await fetch("/api/tables/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrType }),
        });
        if (!res.ok) throw new Error("Failed to generate QR");
        return await res.json();
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  return {
    tables,
    isLoading,
    error,
    fetchTables,
    createTable,
    updateTable,
    deleteTable,
    generateQR,
  };
}
