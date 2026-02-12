"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    LogOut,
    Coffee,
    ShoppingCart,
    Users,
    Utensils,
} from "lucide-react";

type AttendanceStatus =
    | "PENDING_CHECKIN"
    | "CLOCKED_IN"
    | "PENDING_CHECKOUT"
    | "CLOCKED_OUT"
    | "REJECTED"
    | "CANCELLED";

type AttendanceRecord = {
    id: string;
    status: AttendanceStatus;
    requestedCheckInAt?: string;
    approvedCheckInAt?: string;
    requestedCheckOutAt?: string;
    approvedCheckOutAt?: string;
    workSummary?: string;
    rejectionReason?: string;
    totalHours?: number;
    checkInLocation?: { latitude: number; longitude: number };
    checkOutLocation?: { latitude: number; longitude: number };
};

interface GeolocationError {
    code?: number;
    message: string;
}

const OrdersPage = () => {
    const { data: session, isPending } = useSession();
    const [location, setLocation] = useState<GeolocationPosition | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
    const [workSummary, setWorkSummary] = useState("");
    const [isClockingIn, setIsClockingIn] = useState(false);
    const [isClockingOut, setIsClockingOut] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState<string>("00:00:00");
    const [activeTab, setActiveTab] = useState<string>("attendance");

    // Get user location
    const getLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser"));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            });
        });
    };

    // Request location permission
    const requestLocation = async () => {
        try {
            setLocationError(null);
            const position = await getLocation();
            setLocation(position);
            toast.success("Location accessed", {
                description: "Your location has been captured successfully.",
            });
            return position;
        } catch (error: unknown) {
            const geoError = error as GeolocationError;
            let message = "Failed to get your location";
            if (geoError.code === 1) {
                message =
                    "Location permission denied. Please enable location access to clock in/out.";
            } else if (geoError.code === 2) {
                message = "Location unavailable. Please try again.";
            } else if (geoError.code === 3) {
                message = "Location request timed out. Please try again.";
            }
            setLocationError(message);
            toast.error("Location error", {
                description: message,
            });
            throw error;
        }
    };

    // Check today's attendance on mount
    useEffect(() => {
        if (session?.user?.id) {
            checkTodayAttendance();
            // Socket listeners removed - debugging
            requestLocation().catch(() => { }); // Request location but don't block

            // Cleanup function - socket cleanup removed
            return () => {
                // Socket cleanup removed
            };
        }
    }, [session]);

    // Timer for tracking clock-in duration
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (
            currentAttendance?.status === "CLOCKED_IN" &&
            currentAttendance.approvedCheckInAt
        ) {
            interval = setInterval(() => {
                const start = new Date(currentAttendance.approvedCheckInAt!).getTime();
                const now = new Date().getTime();
                const diff = now - start;

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setTimeElapsed(
                    `${hours.toString().padStart(2, "0")}:${minutes
                        .toString()
                        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
                );
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [currentAttendance?.status, currentAttendance?.approvedCheckInAt]);

    // Check if user has any attendance record today
    const checkTodayAttendance = async () => {
        try {
            const response = await fetch("/api/attendance/today");
            const data = await response.json();

            if (data.success && data.attendance) {
                setCurrentAttendance(data.attendance);
                setWorkSummary(data.attendance.workSummary || "");

                // Auto-switch to orders tab if clocked in
                if (data.attendance.status === "CLOCKED_IN") {
                    setActiveTab("orders");
                }
            }
        } catch (error) {
            console.error("Failed to check attendance:", error);
        }
    };

    // Socket listeners removed - now using manual refresh or polling

    // Handle clock in
    const handleClockIn = async () => {
        if (!session?.user?.id) {
            toast.error("Authentication required", {
                description: "Please log in to clock in.",
            });
            return;
        }

        setIsClockingIn(true);

        try {
            // Get fresh location
            const position = await requestLocation();

            const response = await fetch("/api/attendance/clock-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: session.user.id,
                    requestedCheckInAt: new Date().toISOString(),
                    checkInLocation: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to clock in");
            }

            setCurrentAttendance(data.attendance);

            toast.success("⏳ Clock-in request sent", {
                description: "Your clock-in request has been submitted and is pending approval.",
            });

            // Refresh attendance data after a delay to check for approval
            setTimeout(() => {
                checkTodayAttendance();
            }, 5000);
        } catch (error: unknown) {
            const err = error as Error;
            toast.error("Clock-in failed", {
                description: err.message,
            });
        } finally {
            setIsClockingIn(false);
        }
    };

    // Handle clock out
    const handleClockOut = async () => {
        if (!currentAttendance?.id) return;

        if (!workSummary.trim()) {
            toast.error("Work summary required", {
                description: "Please provide a summary of your work today.",
            });
            return;
        }

        setIsClockingOut(true);

        try {
            const position = await requestLocation();

            const response = await fetch("/api/attendance/clock-out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attendanceId: currentAttendance.id,
                    workSummary: workSummary.trim(),
                    requestedCheckOutAt: new Date().toISOString(),
                    checkOutLocation: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to clock out");
            }

            setCurrentAttendance((prev) => ({
                ...prev!,
                status: "PENDING_CHECKOUT",
            }));

            toast.success("⏳ Clock-out request sent", {
                description: "Your clock-out request has been submitted and is pending approval.",
            });

            // Refresh attendance data after a delay to check for approval
            setTimeout(() => {
                checkTodayAttendance();
            }, 5000);
        } catch (error: unknown) {
            const err = error as Error;
            toast.error("Clock-out failed", {
                description: err.message,
            });
        } finally {
            setIsClockingOut(false);
        }
    };

    // Get status badge
    const getStatusBadge = (status: AttendanceStatus) => {
        const statusConfig = {
            PENDING_CHECKIN: {
                label: "Pending Clock-in",
                variant: "warning" as const,
                icon: AlertCircle,
            },
            CLOCKED_IN: {
                label: "Clocked In",
                variant: "success" as const,
                icon: CheckCircle2,
            },
            PENDING_CHECKOUT: {
                label: "Pending Clock-out",
                variant: "warning" as const,
                icon: AlertCircle,
            },
            CLOCKED_OUT: {
                label: "Clocked Out",
                variant: "secondary" as const,
                icon: LogOut,
            },
            REJECTED: {
                label: "Rejected",
                variant: "destructive" as const,
                icon: XCircle,
            },
            CANCELLED: {
                label: "Cancelled",
                variant: "secondary" as const,
                icon: XCircle,
            },
        };

        const config = statusConfig[status];
        const Icon = config?.icon || Clock;

        return (
            <Badge variant={config?.variant as any} className="gap-1">
                <Icon className="h-3 w-3" />
                {config?.label || status}
            </Badge>
        );
    };

    if (isPending) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Please log in to access the orders system.
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
                    <h1 className="text-3xl font-bold">Orders & Attendance</h1>
                    <p className="text-muted-foreground">
                        Welcome, {session.user.name || session.user.email}
                    </p>
                </div>
                {currentAttendance && getStatusBadge(currentAttendance.status)}
            </div>

            {/* Location Status */}
            <div className="mb-6 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {location ? (
                    <span className="text-green-600">
                        Location captured ✓
                        <span className="ml-2 text-xs text-muted-foreground">
                            ({location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)})
                        </span>
                    </span>
                ) : locationError ? (
                    <span className="text-destructive">{locationError}</span>
                ) : (
                    <span className="text-muted-foreground">
                        Requesting location...
                    </span>
                )}
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="attendance" className="gap-2">
                        <Clock className="h-4 w-4" />
                        Attendance
                    </TabsTrigger>
                    <TabsTrigger
                        value="orders"
                        className="gap-2"
                        disabled={currentAttendance?.status !== "CLOCKED_IN"}
                    >
                        <Coffee className="h-4 w-4" />
                        Orders
                    </TabsTrigger>
                </TabsList>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Today's Attendance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Clock In Button - Show if no attendance or rejected */}
                            {(!currentAttendance || currentAttendance.status === "REJECTED" || currentAttendance.status === "CLOCKED_OUT") && (
                                <Button
                                    size="lg"
                                    className="w-full"
                                    onClick={handleClockIn}
                                    disabled={isClockingIn || !location}
                                >
                                    {isClockingIn ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Requesting Clock-in...
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="mr-2 h-4 w-4" />
                                            Clock In
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* Active Session */}
                            {currentAttendance?.status === "CLOCKED_IN" && (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-muted p-4 text-center">
                                        <p className="text-sm text-muted-foreground">Time Elapsed</p>
                                        <p className="font-mono text-4xl font-bold">{timeElapsed}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Clocked in at:{" "}
                                            {new Date(currentAttendance.approvedCheckInAt!).toLocaleTimeString()}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Work Summary <span className="text-destructive">*</span>
                                        </label>
                                        <Textarea
                                            placeholder="Describe what you worked on today..."
                                            value={workSummary}
                                            onChange={(e) => setWorkSummary(e.target.value)}
                                            rows={4}
                                        />
                                    </div>

                                    <div className="flex gap-4">
                                        <Button
                                            size="lg"
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => setActiveTab("orders")}
                                        >
                                            <Coffee className="mr-2 h-4 w-4" />
                                            Go to Orders
                                        </Button>
                                        <Button
                                            size="lg"
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={handleClockOut}
                                            disabled={isClockingOut || !location || !workSummary.trim()}
                                        >
                                            {isClockingOut ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Requesting...
                                                </>
                                            ) : (
                                                <>
                                                    <LogOut className="mr-2 h-4 w-4" />
                                                    Clock Out
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Pending States */}
                            {currentAttendance?.status === "PENDING_CHECKIN" && (
                                <div className="rounded-lg bg-yellow-50 p-6 text-center dark:bg-yellow-950/20">
                                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-yellow-600" />
                                    <h3 className="font-semibold">Clock-in Pending Approval</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Your manager will review your clock-in request shortly.
                                    </p>
                                    <p className="mt-4 text-xs text-muted-foreground">
                                        Requested at:{" "}
                                        {new Date(currentAttendance.requestedCheckInAt!).toLocaleTimeString()}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => {
                                            toast.info("Checking for updates...");
                                            checkTodayAttendance();
                                        }}
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Check Status
                                    </Button>
                                </div>
                            )}

                            {currentAttendance?.status === "PENDING_CHECKOUT" && (
                                <div className="rounded-lg bg-yellow-50 p-6 text-center dark:bg-yellow-950/20">
                                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-yellow-600" />
                                    <h3 className="font-semibold">Clock-out Pending Approval</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Your manager will review your clock-out request shortly.
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => {
                                            toast.info("Checking for updates...");
                                            checkTodayAttendance();
                                        }}
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Check Status
                                    </Button>
                                </div>
                            )}

                            {/* Completed */}
                            {currentAttendance?.status === "CLOCKED_OUT" && (
                                <div className="rounded-lg bg-green-50 p-6 text-center dark:bg-green-950/20">
                                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                                    <h3 className="font-semibold">Successfully Clocked Out</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Your attendance has been recorded.
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Total Hours</p>
                                            <p className="font-medium">
                                                {currentAttendance.totalHours?.toFixed(2)} hrs
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Status</p>
                                            <p className="font-medium text-green-600">Completed</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rejected */}
                            {currentAttendance?.status === "REJECTED" && (
                                <div className="rounded-lg bg-destructive/10 p-6 text-center">
                                    <XCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
                                    <h3 className="font-semibold text-destructive">
                                        Request Rejected
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {currentAttendance.rejectionReason ||
                                            "Your attendance request was rejected."}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={handleClockIn}
                                        disabled={isClockingIn}
                                    >
                                        {isClockingIn ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Clock className="mr-2 h-4 w-4" />
                                        )}
                                        Submit New Request
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-6">
                    {currentAttendance?.status === "CLOCKED_IN" ? (
                        <>
                            {/* Quick Stats */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Today's Orders
                                        </CardTitle>
                                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">24</div>
                                        <p className="text-xs text-muted-foreground">
                                            +12% from yesterday
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Pending Orders
                                        </CardTitle>
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">8</div>
                                        <p className="text-xs text-muted-foreground">
                                            Requires attention
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Active Staff
                                        </CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">5</div>
                                        <p className="text-xs text-muted-foreground">
                                            Currently clocked in
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Orders Grid */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Active Orders */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>Active Orders</span>
                                            <Badge variant="secondary">8 pending</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between rounded-lg border p-4"
                                                >
                                                    <div>
                                                        <p className="font-medium">Table {i + 2}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Order #{Math.floor(Math.random() * 1000)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant="outline">In Progress</Badge>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            5 min ago
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Menu Items */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Utensils className="h-5 w-5" />
                                            Quick Menu
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Button variant="outline" className="h-24 flex-col gap-2">
                                                <Coffee className="h-6 w-6" />
                                                <span>New Order</span>
                                            </Button>
                                            <Button variant="outline" className="h-24 flex-col gap-2">
                                                <ShoppingCart className="h-6 w-6" />
                                                <span>View Cart</span>
                                            </Button>
                                            <Button variant="outline" className="h-24 flex-col gap-2">
                                                <Clock className="h-6 w-6" />
                                                <span>Order History</span>
                                            </Button>
                                            <Button variant="outline" className="h-24 flex-col gap-2">
                                                <Users className="h-6 w-6" />
                                                <span>Staff</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                                <h3 className="mb-2 text-lg font-semibold">Access Restricted</h3>
                                <p className="mb-6 text-center text-muted-foreground">
                                    You need to be clocked in and approved to access orders.
                                </p>
                                <Button onClick={() => setActiveTab("attendance")}>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Go to Attendance
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrdersPage;