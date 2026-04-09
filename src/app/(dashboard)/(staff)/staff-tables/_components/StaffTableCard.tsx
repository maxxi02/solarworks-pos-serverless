"use client";

import { QrCode, Power, PowerOff } from "lucide-react";
import { Table } from "@/hooks/useTables";

interface StaffTableCardProps {
  table: Table;
  onViewQR: (table: Table) => void;
  onToggleAvailability: (tableId: string, currentStatus: string) => void;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> =
  {
    available: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    occupied: {
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      dot: "bg-amber-500",
    },
    reserved: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      dot: "bg-blue-500",
    },
    unavailable: {
      bg: "bg-red-500/10",
      text: "text-red-500",
      dot: "bg-red-500",
    },
  };

export function StaffTableCard({
  table,
  onViewQR,
  onToggleAvailability,
}: StaffTableCardProps) {
  const statusStyle = statusColors[table.status] || statusColors.available;
  const isUnavailable = table.status === "unavailable";

  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-all ${isUnavailable ? "opacity-75 grayscale-[0.5]" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-foreground text-lg">{table.label}</h3>
          <p className="text-muted-foreground text-xs font-mono mt-0.5">
            {table.tableId}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {table.status}
        </span>
      </div>

      {/* QR Preview (Clickable to view larger) */}
      <div
        onClick={() => onViewQR(table)}
        className="flex items-center justify-center py-6 rounded-lg bg-white cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="text-center">
          <QrCode className="w-16 h-16 text-black/80 mx-auto" />
          <p className="text-black/40 text-[10px] mt-2 font-mono truncate max-w-[150px] mx-auto">
            {table.tableId}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onToggleAvailability(table.tableId, table.status)}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
            isUnavailable
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : table.status === "occupied" || table.status === "reserved"
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                : "bg-red-500 text-white hover:bg-red-600"
          }`}
        >
          {isUnavailable ? (
            <>
              <Power className="w-4 h-4" />
              Make Available
            </>
          ) : table.status === "occupied" || table.status === "reserved" ? (
            <>
              <Power className="w-4 h-4" />
              Clear Table
            </>
          ) : (
            <>
              <PowerOff className="w-4 h-4" />
              Make Unavailable
            </>
          )}
        </button>

        <button
          onClick={() => onViewQR(table)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-accent transition-colors"
        >
          <QrCode className="w-3.5 h-3.5" />
          View QR Code
        </button>
      </div>
    </div>
  );
}
