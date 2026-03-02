"use client";

import { useState } from "react";
import { Plus, QrCode, Truck, User } from "lucide-react";
import { useTables, Table } from "@/hooks/useTables";
import { toast } from "react-hot-toast";
import { TableCard } from "./_components/TableCard";
import { CreateTableModal } from "./_components/CreateTableModal";
import { QRPreviewModal } from "./_components/QRPreviewModal";

export default function TablesPage() {
    const { tables, isLoading, createTable, updateTable, deleteTable, generateQR } = useTables();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [qrPreview, setQrPreview] = useState<{ url: string; label: string } | null>(null);

    const handleCreateTable = async (label: string, qrType: string) => {
        try {
            await createTable(label, qrType);
            toast.success(`Table "${label}" created!`);
            setShowCreateModal(false);
        } catch {
            toast.error("Failed to create table");
        }
    };

    const handleDeleteTable = async (tableId: string) => {
        try {
            await deleteTable(tableId);
            toast.success("Table deleted");
        } catch {
            toast.error("Failed to delete table");
        }
    };

    const handleGenerateWalkInQR = async () => {
        try {
            const result = await generateQR("walk-in");
            setQrPreview({ url: result.qrCodeUrl, label: result.label });
        } catch {
            toast.error("Failed to generate QR");
        }
    };

    const handleGenerateDriveThruQR = async () => {
        try {
            const result = await generateQR("drive-thru");
            setQrPreview({ url: result.qrCodeUrl, label: result.label });
        } catch {
            toast.error("Failed to generate QR");
        }
    };

    const handleGenerateTakeAwayQR = async () => {
        try {
            const result = await generateQR("take-away");
            setQrPreview({ url: result.qrCodeUrl, label: result.label });
        } catch {
            toast.error("Failed to generate QR");
        }
    };

    const handleMarkAvailable = async (tableId: string) => {
        try {
            await updateTable(tableId, { status: "available" });
            toast.success("Table marked as available");
        } catch {
            toast.error("Failed to update table status");
        }
    };

    const dineInTables = tables.filter((t) => t.qrType === "dine-in");

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tables & QR Management</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your restaurant layout and generate ordering QR codes.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    Add New Table
                </button>
            </div>

            {/* Quick QR Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    General QR Codes
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                        onClick={handleGenerateWalkInQR}
                        className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-sm">Walk-In QR</p>
                                <p className="text-xs text-muted-foreground">For on-site orders</p>
                            </div>
                        </div>
                        <QrCode className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>

                    <button
                        onClick={handleGenerateDriveThruQR}
                        className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-sm">Drive-Thru QR</p>
                                <p className="text-xs text-muted-foreground">For vehicle orders</p>
                            </div>
                        </div>
                        <QrCode className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>

                    <button
                        onClick={handleGenerateTakeAwayQR}
                        className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-sm">Take-Away QR</p>
                                <p className="text-xs text-muted-foreground">For self-pickup</p>
                            </div>
                        </div>
                        <QrCode className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                </div>
            </div>

            {/* Tables Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                    Dine-In Tables ({dineInTables.length})
                </h2>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rounded-xl bg-card border border-border animate-pulse h-64" />
                        ))}
                    </div>
                ) : dineInTables.length === 0 ? (
                    <div className="text-center py-16 bg-card rounded-xl border border-border">
                        <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No tables yet</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            Create your first table to generate a QR code
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 text-primary font-semibold text-sm hover:underline"
                        >
                            + Create Table
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {dineInTables.map((table) => (
                            <TableCard
                                key={table.tableId}
                                table={table}
                                onViewQR={(t) => setQrPreview({ url: t.qrCodeUrl, label: t.label })}
                                onDelete={handleDeleteTable}
                                onMarkAvailable={handleMarkAvailable}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateTableModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateTable}
                />
            )}

            {qrPreview && (
                <QRPreviewModal
                    url={qrPreview.url}
                    label={qrPreview.label}
                    onClose={() => setQrPreview(null)}
                />
            )}
        </div>
    );
}
