"use client";

import React from "react";
import { Clock, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarActions } from "./SidebarActions";
import {
    SavedOrder,
    StockAlert,
    ReceiptOrder,
} from "./pos.types";

interface AttendanceBarProps {
    attendance: any;
    attendanceLoading: boolean;
    clockOut: () => void;
    playSuccess: () => void;
    settings: any;
    savedOrders: SavedOrder[];
    stockAlerts: StockAlert[];
    setShowOrderHistory: (val: boolean) => void;
    setShowSavedOrders: (fn: (v: boolean) => boolean) => void;
    setShowStockAlertsModal: (val: boolean) => void;
    onRefreshStock: () => void;
    currentReceipt: ReceiptOrder | null;
    onReprintReceipt: (order: SavedOrder) => void;
    onPreviewReceipt: (type: "customer" | "kitchen") => void;
}

export const AttendanceBar = ({
    attendance,
    attendanceLoading,
    clockOut,
    playSuccess,
    settings,
    savedOrders,
    stockAlerts,
    setShowOrderHistory,
    setShowSavedOrders,
    setShowStockAlertsModal,
    onRefreshStock,
    currentReceipt,
    onReprintReceipt,
    onPreviewReceipt,
}: AttendanceBarProps) => {
    return (
        <div className="border-b bg-card sticky top-0 z-20 backdrop-blur-sm mb-5">
            <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
                {/* Left — shift status */}
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-medium text-base">On Shift</span>
                    </div>
                    {attendance && (
                        <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                            <Clock className="h-5 w-5" />
                            <span className="text-base">
                                Since{" "}
                                {new Date(attendance.clockInTime).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right — single sheet trigger */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-9">
                            <Menu className="h-4 w-4" /> Actions
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-sm">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" /> Controls
                            </SheetTitle>
                        </SheetHeader>

                        <SidebarActions
                            attendance={attendance}
                            attendanceLoading={attendanceLoading}
                            clockOut={clockOut}
                            playSuccess={playSuccess}
                            settings={settings}
                            savedOrders={savedOrders}
                            stockAlerts={stockAlerts}
                            showOrderHistory={() => setShowOrderHistory(true)}
                            showSavedOrders={() => setShowSavedOrders((v) => !v)}
                            showStockAlertsModal={() => setShowStockAlertsModal(true)}
                            onRefreshStock={onRefreshStock}
                            currentReceipt={currentReceipt}
                            onReprintTest={() =>
                                savedOrders.length
                                    ? onReprintReceipt(savedOrders[0])
                                    : null
                            }
                            onPreviewReceipt={onPreviewReceipt}
                        />
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
};
