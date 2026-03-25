'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from '@/lib/format-utils';
import { ShoppingCart, RefreshCw, ArrowRight, DollarSign, Smartphone, CreditCard } from "lucide-react";
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';

interface Transaction {
    _id: string;
    orderNumber: string;
    customerName?: string;
    cashier?: string;
    total: number;
    paymentMethod: string;
    orderType?: string;
    status?: string;
    createdAt: string;
    items: { name: string; quantity: number; price: number }[];
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
    cash:  <DollarSign className="h-3 w-3" />,
    gcash: <Smartphone className="h-3 w-3" />,
    split: <CreditCard className="h-3 w-3" />,
};

const STATUS_STYLES: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    refunded:  "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    cancelled: "bg-muted text-muted-foreground border border-border",
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function RecentReceipts() {
    const { data: session } = authClient.useSession();
    const isAdmin = session?.user?.role === 'admin';
    const userId = session?.user?.id;
    const userName = session?.user?.name;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const viewAllHref = isAdmin
        ? '/dashboard/sales/all-transactions'
        : '/transactionhistory';

    async function fetchTransactions() {
        setIsLoading(true);
        try {
            const res = await fetch('/api/payments?limit=5&noStats=true');
            const d = await res.json();
            if (d.success && d.data?.payments) {
                const payments: Transaction[] = isAdmin
                    ? d.data.payments
                    : d.data.payments.filter(
                        (p: Transaction) =>
                            (p as any).cashierId === userId ||
                            p.cashier === userName
                    );
                setTransactions(payments.slice(0, 5));
            }
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (session) fetchTransactions();
    }, [session]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={fetchTransactions}
                        className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href={viewAllHref}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        View All <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
                        ))}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <ShoppingCart className="h-10 w-10 mb-2" />
                        <p className="text-sm">No recent transactions</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transactions.map((t) => {
                            const statusStyle = STATUS_STYLES[t.status || 'completed'] ?? STATUS_STYLES.completed;
                            const paymentIcon = PAYMENT_ICONS[t.paymentMethod?.toLowerCase()] ?? null;

                            return (
                                <div
                                    key={t._id}
                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 gap-3"
                                >
                                    {/* Left */}
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs text-primary">
                                                {t.orderNumber}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wide py-0 h-4">
                                                {t.orderType || 'takeaway'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {t.customerName || 'Walk-in'}
                                            {!isAdmin && t.cashier && (
                                                <span className="ml-1 opacity-60">· {t.cashier}</span>
                                            )}
                                            {isAdmin && t.cashier && (
                                                <span className="ml-1 opacity-60">· {t.cashier}</span>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {formatTime(t.createdAt)}
                                        </p>
                                    </div>

                                    {/* Right */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span className="font-bold text-sm">{formatCurrency(t.total)}</span>
                                        <div className="flex items-center gap-1">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyle}`}>
                                                {t.status || 'completed'}
                                            </span>
                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground capitalize">
                                                {paymentIcon}
                                                {t.paymentMethod}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
