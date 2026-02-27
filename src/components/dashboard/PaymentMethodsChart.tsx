'use client';

import {
    PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/format-utils';

interface PaymentMethod {
    _id: string;
    total: number;
    count: number;
}

interface PaymentMethodsChartProps {
    methods: PaymentMethod[];
    periodLabel: string;
    isLoading?: boolean;
}

const COLORS: Record<string, string> = {
    primary: '#3b82f6',
    cash: '#10b981',
    gcash: '#8b5cf6',
    split: '#f59e0b'
};

export function PaymentMethodsChart({
    methods,
    periodLabel,
    isLoading
}: PaymentMethodsChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-64 w-full bg-gray-100 animate-pulse rounded-md" />
                ) : methods.length > 0 ? (
                    <>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={methods}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        dataKey="total"
                                        label={({ _id, percent }) =>
                                            `${_id} (${((percent || 0) * 100).toFixed(0)}%)`
                                        }
                                    >
                                        {methods.map((entry, i) => (
                                            <Cell key={i} fill={COLORS[entry._id] || '#3b82f6'} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 mt-4">
                            {methods.map(m => (
                                <div key={m._id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[m._id] || '#3b82f6' }}
                                        />
                                        <span className="capitalize">{m._id}</span>
                                    </div>
                                    <span className="font-medium">{formatCurrency(m.total)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No payment data for {periodLabel}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
