"use client";

import { QrCode, Trash2 } from "lucide-react";
import { Table } from "@/hooks/useTables";

interface TableCardProps {
    table: Table;
    onViewQR: (table: Table) => void;
    onDelete: (tableId: string) => void;
    onMarkAvailable?: (tableId: string) => void;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    available: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
    occupied: { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500" },
    reserved: { bg: "bg-blue-500/10", text: "text-blue-500", dot: "bg-blue-500" },
};

export function TableCard({ table, onViewQR, onDelete, onMarkAvailable }: TableCardProps) {
    const statusStyle = statusColors[table.status] || statusColors.available;

    return (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-bold text-foreground text-lg">{table.label}</h3>
                    <p className="text-muted-foreground text-xs font-mono mt-0.5">{table.tableId}</p>
                </div>
                <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    {table.status}
                </span>
            </div>

            {/* QR Preview */}
            <div
                onClick={() => onViewQR(table)}
                className="flex items-center justify-center py-6 rounded-lg bg-white cursor-pointer hover:opacity-90 transition-opacity"
            >
                <div className="text-center">
                    <QrCode className="w-16 h-16 text-black/80 mx-auto" />
                    <p className="text-black/50 text-[10px] mt-2 font-mono break-all px-2 max-w-[200px]">
                        {table.qrCodeUrl}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onViewQR(table)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                    <QrCode className="w-3.5 h-3.5" />
                    View QR
                </button>
                {table.status === 'occupied' && onMarkAvailable && (
                    <button
                        onClick={() => onMarkAvailable(table.tableId)}
                        className="flex items-center justify-center px-3 py-2 rounded-lg border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
                        title="Mark as Available"
                    >
                        Mark Available
                    </button>
                )}
                <button
                    onClick={() => onDelete(table.tableId)}
                    className="flex items-center justify-center px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 transition-colors"
                    title="Delete Table"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
