'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from '@/lib/format-utils';
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
    _id: string;
    user?: {
        name: string;
        email: string;
        role?: string;
    };
    date: string;
    clockInTime: string;
    status: string;
}

interface AttendanceApprovalsProps {
    pending: AttendanceRecord[];
    isLoading?: boolean;
}

export function AttendanceApprovals({ pending, isLoading }: AttendanceApprovalsProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    if (!isLoading && pending.length === 0) return null;

    // Pagination logic
    const totalPages = Math.ceil(pending.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = pending.slice(startIndex, startIndex + itemsPerPage);

    const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Attendance ({pending.length})
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                    <a href="/staff-attendance" className="text-xs font-semibold text-primary">
                        View All
                    </a>
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-12 w-full bg-gray-50 animate-pulse rounded" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {currentItems.map(r => (
                                <div key={r._id} className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-slate-50/50 transition-colors rounded-lg p-1 px-2">
                                    <div>
                                        <p className="font-medium">{r.user?.name || 'Unknown'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(r.date)} • {new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                        Pending
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </p>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={goToPrevPage}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={goToNextPage}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
