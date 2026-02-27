'use client';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from '@/lib/format-utils';

interface DailyData {
    date: string;
    revenue: number;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface SalesTrendChartProps {
    data: DailyData[];
    period: PeriodFilter;
    onPeriodChange: (period: PeriodFilter) => void;
    isLoading?: boolean;
}

export function SalesTrendChart({
    data,
    period,
    onPeriodChange,
    isLoading
}: SalesTrendChartProps) {
    const periodLabels = {
        day: 'Today',
        week: 'This Week',
        month: 'This Month',
        quarter: 'This Quarter',
        year: 'This Year'
    };

    return (
        <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales Trend</CardTitle>
                <div className="flex gap-1 overflow-x-auto">
                    {(['day', 'week', 'month', 'quarter', 'year'] as PeriodFilter[]).map((p) => (
                        <Button
                            key={p}
                            variant={period === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPeriodChange(p)}
                            className="capitalize"
                        >
                            {p}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="h-80">
                {isLoading ? (
                    <div className="h-full w-full bg-gray-100 animate-pulse rounded-md" />
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                interval={period === 'year' ? 'preserveEnd' : undefined}
                            />
                            <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                formatter={(v) => formatCurrency(v as number)}
                                labelFormatter={formatDate}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        No sales data for {periodLabels[period]}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
