"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { StockAlert } from "./pos.types";

interface StockAlertsModalProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    stockAlerts: StockAlert[];
    onRefresh: () => void;
}

export const StockAlertsModal = ({
    isOpen,
    onClose,
    stockAlerts,
    onRefresh,
}: StockAlertsModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Stock Alerts ({stockAlerts.length})
                    </DialogTitle>
                    <DialogDescription>
                        Items that are low or critically out of stock.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-3">
                    {stockAlerts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No stock alerts at the moment.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stockAlerts.map((alert) => (
                                <div
                                    key={alert.itemId}
                                    className="flex items-start justify-between p-3 border rounded-lg"
                                >
                                    <div className="space-y-1">
                                        <p className="font-medium text-sm">{alert.itemName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Current: {alert.currentStock} {alert.unit} · Min:{" "}
                                            {alert.minStock} {alert.unit}
                                        </p>
                                        {alert.location && (
                                            <p className="text-xs text-muted-foreground">
                                                📍 {alert.location}
                                            </p>
                                        )}
                                    </div>
                                    <Badge
                                        variant={
                                            alert.status === "critical" ? "destructive" : "secondary"
                                        }
                                        className="shrink-0 ml-2"
                                    >
                                        {alert.outOfStock ? "Out of Stock" : alert.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter>
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={onRefresh}
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
