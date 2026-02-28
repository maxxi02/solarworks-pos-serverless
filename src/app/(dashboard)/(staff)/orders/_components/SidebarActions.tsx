"use client";

import React from "react";
import {
    Clock,
    History,
    Save,
    AlertTriangle,
    RefreshCw,
    Eye,
    Utensils,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ClockInCard } from "./ClockInCard";
import { PrinterStatus } from "./Printerstatus";
import { SavedOrder, StockAlert, ReceiptOrder } from "./pos.types";

interface SidebarActionsProps {
    attendance: any;
    attendanceLoading: boolean;
    clockOut: () => void;
    playSuccess: () => void;
    settings: any;
    savedOrders: SavedOrder[];
    stockAlerts: StockAlert[];
    showOrderHistory: () => void;
    showSavedOrders: () => void;
    showStockAlertsModal: () => void;
    onRefreshStock: () => void;
    currentReceipt: ReceiptOrder | null;
    onReprintReceipt: (order: SavedOrder) => void;
    onPreviewReceipt: (type: "customer" | "kitchen") => void;
}

export const SidebarActions = ({
    attendance,
    attendanceLoading,
    clockOut,
    playSuccess,
    settings,
    savedOrders,
    stockAlerts,
    showOrderHistory,
    showSavedOrders,
    showStockAlertsModal,
    onRefreshStock,
    currentReceipt,
    onReprintReceipt,
    onPreviewReceipt,
}: SidebarActionsProps) => {
    return (
        <div className="space-y-6 overflow-y-auto h-[calc(100vh-80px)] p-2" data-lenis-prevent>
            {/* Shift Status */}
            <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Shift
                </p>
                <ClockInCard />
                {!attendance?.clockOutTime && (
                    <Button
                        onClick={() => {
                            clockOut();
                            playSuccess();
                        }}
                        disabled={attendanceLoading}
                        variant="destructive"
                        className="w-full"
                    >
                        {attendanceLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Ending shift…
                            </>
                        ) : (
                            "Clock Out – End Shift"
                        )}
                    </Button>
                )}
            </div>

            <Separator />

            {/* Printer */}
            <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Printer
                </p>
                {settings && <PrinterStatus settings={settings} />}
            </div>

            <Separator />

            {/* Orders */}
            <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Orders
                </p>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={showOrderHistory}
                >
                    <History className="w-4 h-4" /> Order History
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={showSavedOrders}
                >
                    <Save className="w-4 h-4" /> Saved Orders ({savedOrders.length})
                </Button>
            </div>

            <Separator />

            {/* Stock */}
            <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Stock
                </p>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={showStockAlertsModal}
                >
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Stock Alerts
                    {stockAlerts.length > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                            {stockAlerts.length}
                        </Badge>
                    )}
                </Button>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={onRefreshStock}
                >
                    <RefreshCw className="w-4 h-4" /> Refresh Stock
                </Button>
            </div>

            <Separator />

            {/* Test Printing & Preview */}
            <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Receipts
                </p>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                        savedOrders.length
                            ? onReprintReceipt(savedOrders[0])
                            : null
                    }
                >
                    <RefreshCw className="w-4 h-4" /> Test Print (Reprint Last)
                </Button>
                {currentReceipt && (
                    <>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => onPreviewReceipt("customer")}
                        >
                            <Eye className="w-4 h-4" /> Preview Customer Receipt
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => onPreviewReceipt("kitchen")}
                        >
                            <Utensils className="w-4 h-4" /> Preview Kitchen Order
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
