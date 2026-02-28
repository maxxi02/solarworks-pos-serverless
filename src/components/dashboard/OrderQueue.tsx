'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from '@/lib/format-utils';
import { useSocket } from "@/provider/socket-provider";
import { CustomerOrder } from "@/types/order.type";
import { Utensils, Clock, User } from 'lucide-react';

export function OrderQueue() {
    const { onNewCustomerOrder, offNewCustomerOrder } = useSocket();
    const [orders, setOrders] = useState<CustomerOrder[]>([]);

    useEffect(() => {
        const handleNewOrder = (order: CustomerOrder) => {
            setOrders(prev => [order, ...prev].slice(0, 10)); // Keep latest 10
        };

        onNewCustomerOrder(handleNewOrder);
        return () => offNewCustomerOrder(handleNewOrder);
    }, [onNewCustomerOrder, offNewCustomerOrder]);

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Order Queue</CardTitle>
                <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <Clock className="h-10 w-10 mb-2" />
                        <p className="text-sm">No active orders in queue</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.orderId} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">#{order.orderNumber || order.orderId.slice(-4)}</span>
                                        <Badge variant={order.orderType === 'dine-in' ? 'default' : 'outline'} className="text-[10px]">
                                            {order.orderType}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        {order.customerName}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-sm">{formatCurrency(order.total)}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {order.items.length} items
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
