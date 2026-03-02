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
            {/* ... other parts ... */}
            {/* Tables Grid */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
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
