"use client";

import { useState, useEffect, useCallback } from "react";

export interface Table {
  _id: string;
  tableId: string;
  label: string;
  qrCodeUrl: string;
  qrType: "dine-in" | "walk-in" | "drive-thru";
  status: "available" | "occupied" | "reserved";
  currentSessionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function useTables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const generateQR = useCallback(async (qrType: "walk-in" | "drive-thru") => {
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
  }, []);

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
