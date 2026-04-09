"use client";

import { useState } from "react";
import { QrCode, Search, Filter } from "lucide-react";
import { useTables, Table } from "@/hooks/useTables";
import { toast } from "sonner";
import { StaffTableCard } from "./_components/StaffTableCard";
import { QRPreviewModal } from "../../(admin)/tables/_components/QRPreviewModal";

export default function StaffTablesPage() {
  const { tables, isLoading, updateTable } = useTables();
  const [searchTerm, setSearchTerm] = useState("");
  const [qrPreview, setQrPreview] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const handleToggleAvailability = async (
    tableId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus =
        currentStatus === "available" ? "unavailable" : "available";
      await updateTable(tableId, { status: newStatus });
      toast.success(
        newStatus === "available"
          ? "Table is now available"
          : "Table marked as unavailable",
      );
    } catch {
      toast.error("Failed to update table status");
    }
  };

  const dineInTables = tables.filter((t) => t.qrType === "dine-in");

  const filteredTables = dineInTables.filter(
    (t) =>
      t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tableId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Table Availability
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage dine-in tables and toggle their availability for customers.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tables by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Dine-In Tables Only</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-card border border-border animate-pulse h-72"
              />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No tables found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Wait for admin to create tables"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map((table) => (
              <StaffTableCard
                key={table.tableId}
                table={table}
                onViewQR={(t) =>
                  setQrPreview({ url: t.qrCodeUrl, label: t.label })
                }
                onToggleAvailability={handleToggleAvailability}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR Preview Modal (Reused from Admin) */}
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
