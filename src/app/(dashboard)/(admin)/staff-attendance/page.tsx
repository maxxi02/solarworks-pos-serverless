"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    UserCheck,
    MapPin,
    UserX,
    RefreshCw,
} from "lucide-react";

type AttendanceStatus =
    | "PENDING_CHECKIN"
    | "PENDING_CHECKOUT"
    | "CLOCKED_IN"
    | "CLOCKED_OUT"
    | "REJECTED"
    | "CANCELLED";

type PendingAttendance = {
    id: string;
    userId: string;
    status: AttendanceStatus;
    requestedCheckInAt?: string;
    requestedCheckOutAt?: string;
    checkInLocation?: { latitude: number; longitude: number };
    checkOutLocation?: { latitude: number; longitude: number };
    workSummary?: string;
    user?: {
        name?: string | null;
        email: string;
    };
};

const ManagerAttendancePage = () => {
    const { data: session, isPending } = useSession();
    const [pendingRequests, setPendingRequests] = useState<PendingAttendance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Fetch pending attendance requests
    const fetchPendingRequests = async () => {
        try {
            const response = await fetch("/api/attendance/pending");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Transform the data to match our interface
                const transformedAttendances = (data.attendances || []).map((attendance: any) => ({
                    id: attendance._id?.toString() || attendance.id,
                    userId: attendance.userId?.toString(),
                    status: attendance.status,
                    requestedCheckInAt: attendance.requestedCheckInAt,
                    requestedCheckOutAt: attendance.requestedCheckOutAt,
                    checkInLocation: attendance.checkInLocation,
                    checkOutLocation: attendance.checkOutLocation,
                    workSummary: attendance.workSummary,
                    user: attendance.user ? {
                        name: attendance.user.name || null,
                        email: attendance.user.email || "unknown@example.com"
                    } : {
                        name: null,
                        email: "unknown@example.com"
                    }
                }));

                console.log("Fetched pending requests:", transformedAttendances.length);
                setPendingRequests(transformedAttendances);
            } else {
                console.error("API returned success: false", data);
            }
        } catch (error) {
            console.error("Failed to fetch pending requests:", error);
            toast.error("Error", {
                description: "Failed to fetch pending attendance requests.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Manual refresh handler
    const handleRefresh = () => {
        setIsLoading(true);
        fetchPendingRequests();
        toast.info("Refreshing", {
            description: "Checking for new requests...",
        });
    };

    // Set up polling - check every 10 seconds for better responsiveness
    useEffect(() => {
        if (session?.user?.id && ["manager", "admin"].includes(session.user.role || "")) {
            fetchPendingRequests();

            // Poll every 10 seconds for better real-time feel
            const pollInterval = setInterval(() => {
                fetchPendingRequests();
            }, 10000); // Changed from 30000 to 10000

            return () => {
                clearInterval(pollInterval);
            };
        }
    }, [session]);

    // Handle approve
    const handleApprove = async (attendanceId: string, approveCheckIn: boolean, approveCheckOut: boolean) => {
        setProcessingId(attendanceId);

        try {
            const response = await fetch("/api/attendance/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceId,
                    approveCheckIn,
                    approveCheckOut,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to approve");
            }

            toast.success("✅ Approved", {
                description: "The attendance request has been approved.",
            });

            // Remove from list and refresh
            setPendingRequests((prev) => prev.filter((req) => req.id !== attendanceId));

            // Fetch again to ensure we have the latest data
            setTimeout(() => fetchPendingRequests(), 1000);
        } catch (error: unknown) {
            const err = error as Error;
            toast.error("Error", {
                description: err.message,
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Handle reject
    const handleReject = async (attendanceId: string) => {
        const reason = window.prompt("Please provide a reason for rejection:");

        if (!reason?.trim()) {
            toast.error("Reason required", {
                description: "You must provide a reason for rejection.",
            });
            return;
        }

        setProcessingId(attendanceId);

        try {
            const response = await fetch("/api/attendance/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceId,
                    reason: reason.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to reject");
            }

            toast.error("❌ Rejected", {
                description: "The attendance request has been rejected.",
            });

            // Remove from list and refresh
            setPendingRequests((prev) => prev.filter((req) => req.id !== attendanceId));

            // Fetch again to ensure we have the latest data
            setTimeout(() => fetchPendingRequests(), 1000);
        } catch (error: unknown) {
            const err = error as Error;
            toast.error("Error", {
                description: err.message,
            });
        } finally {
            setProcessingId(null);
        }
    };

    // Get user display name safely
    const getUserDisplayName = (request: PendingAttendance) => {
        if (!request.user) {
            return "Unknown User";
        }
        return request.user.name || request.user.email || "Unknown User";
    };

    if (isPending) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!session?.user || !["manager", "admin"].includes(session.user.role || "")) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            You don&apos;t have permission to access this page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl p-6">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Staff Attendance Management</h1>
                    <p className="text-muted-foreground">
                        Review and approve staff clock-in/out requests (Auto-refresh every 10s)
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Pending Requests */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Pending Requests
                        </CardTitle>
                        <Badge variant="secondary">{pendingRequests.length} pending</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
                            <h3 className="mb-2 text-lg font-semibold">All Caught Up!</h3>
                            <p className="text-muted-foreground">
                                No pending attendance requests at the moment.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={handleRefresh}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Check Again
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {pendingRequests.map((request) => (
                                <Card key={request.id} className="border-l-4 border-l-yellow-400">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            {/* Staff Info */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {request.user ? (
                                                        <UserCheck className="h-5 w-5 text-muted-foreground" />
                                                    ) : (
                                                        <UserX className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                    <span className="font-medium">
                                                        {getUserDisplayName(request)}
                                                    </span>
                                                    <Badge variant="outline">
                                                        {request.status === "PENDING_CHECKIN" ? "Clock-in" : "Clock-out"}
                                                    </Badge>
                                                </div>

                                                {/* Time */}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>
                                                        Requested: {new Date(
                                                            request.requestedCheckInAt || request.requestedCheckOutAt!
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Location */}
                                                {request.checkInLocation && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        <span>
                                                            Location: {request.checkInLocation.latitude.toFixed(6)},{" "}
                                                            {request.checkInLocation.longitude.toFixed(6)}
                                                        </span>
                                                    </div>
                                                )}
                                                {request.checkOutLocation && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        <span>
                                                            Location: {request.checkOutLocation.latitude.toFixed(6)},{" "}
                                                            {request.checkOutLocation.longitude.toFixed(6)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Work Summary for clock-out */}
                                                {request.workSummary && (
                                                    <div className="mt-2 rounded-lg bg-muted p-3">
                                                        <p className="text-sm font-medium">Work Summary:</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {request.workSummary}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() =>
                                                        handleApprove(
                                                            request.id,
                                                            request.status === "PENDING_CHECKIN",
                                                            request.status === "PENDING_CHECKOUT"
                                                        )
                                                    }
                                                    disabled={processingId === request.id}
                                                >
                                                    {processingId === request.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    )}
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleReject(request.id)}
                                                    disabled={processingId === request.id}
                                                >
                                                    {processingId === request.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ManagerAttendancePage;