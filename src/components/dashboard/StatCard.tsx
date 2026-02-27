'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'stable' | 'attention';
    icon?: ReactNode;
    isCurrency?: boolean;
    isLoading?: boolean;
    alert?: string;
}

export function StatCard({
    title,
    value,
    change,
    trend,
    icon,
    isCurrency,
    isLoading,
    alert
}: StatCardProps) {
    const getTrendIcon = (t: string) =>
        t === 'up' ? <TrendingUp className="h-4 w-4" /> :
            t === 'down' ? <TrendingDown className="h-4 w-4" /> : null;

    const trendColor = trend === 'up' ? 'text-green-500' :
        trend === 'down' ? 'text-red-500' :
            trend === 'attention' ? 'text-amber-500' : 'text-muted-foreground';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {isCurrency ? (
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-lg font-bold text-green-600">₱</span>
                    </div>
                ) : icon}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                    </div>
                ) : (
                    <>
                        <div className={`text-2xl font-bold ${trend === 'attention' ? 'text-amber-500' : ''}`}>
                            {value}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                            {getTrendIcon(trend)}
                            <span className={trendColor}>{change}</span>
                        </div>
                        {alert && (
                            <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
                                {alert}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
