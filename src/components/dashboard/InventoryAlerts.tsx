'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { LowStockAlert } from '@/types';

interface InventoryAlertsProps {
    items: LowStockAlert[];
    isLoading?: boolean;
}

export function InventoryAlerts({ items, isLoading }: InventoryAlertsProps) {
    if (!isLoading && items.length === 0) return null;

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Low Stock Alerts ({items.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-12 w-full bg-gray-50 animate-pulse rounded" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((alert, index) => {
                            const itemName = alert.itemName || 'Unknown Item';
                            const itemLocation = alert.location || 'Unknown';
                            const itemUnit = alert.unit || 'pcs';
                            const currentStock = alert.currentStock || 0;
                            const status = alert.status || 'low';

                            return (
                                <div key={alert.itemId || index} className="flex items-center justify-between border-b pb-3 last:border-0">
                                    <div>
                                        <p className="font-medium">{itemName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {itemLocation} • Min: {alert.minStock} {itemUnit}
                                        </p>
                                    </div>
                                    <Badge variant={status === 'critical' ? 'destructive' : 'outline'}>
                                        {currentStock} {itemUnit} left
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
