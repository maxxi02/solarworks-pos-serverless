'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Receipt {
    orderNumber: string;
    total: number;
    cashier: string;
    createdAt: string;
    paymentMethod: string;
}

interface RecentReceiptsProps {
    receipts: Receipt[];
    isLoading?: boolean;
}

export function RecentReceipts({ receipts, isLoading }: RecentReceiptsProps) {
    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                    Recent Receipts
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <a href="/receipts" className="text-xs">View All</a>
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 w-full bg-gray-50 animate-pulse rounded" />
                        ))}
                    </div>
                ) : receipts.length > 0 ? (
                    <div className="space-y-4">
                        {receipts.map((r, i) => (
                            <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{r.orderNumber}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDateTime(r.createdAt)} • {r.cashier}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{formatCurrency(r.total)}</p>
                                        <Badge variant="outline" className="text-[10px] h-4">
                                            {r.paymentMethod}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        No recent transactions found.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
