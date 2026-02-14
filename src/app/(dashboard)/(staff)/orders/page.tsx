// app/orders/page.tsx  (or wherever OrdersPage lives)

"use client";

import { useAttendance } from "@/hooks/useAttendance";
import { ClockInCard } from "./_components/ClockInCard";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    ShoppingCart,
    Clock,
    CheckCircle2,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function OrdersPage() {
    const { isClockedIn, isLoading, attendance, clockIn, clockOut } = useAttendance();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container max-w-7xl mx-auto p-6">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 w-48 bg-muted rounded"></div>
                        <div className="h-64 bg-muted rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Not clocked in → full-screen prompt + clock-in button
    if (!isClockedIn) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-lg w-full">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center shadow-sm">
                        <AlertTriangle className="h-16 w-16 text-yellow-600 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-3">Clock In Required</h2>
                        <p className="text-muted-foreground mb-6">
                            You need to start your shift before accessing orders and other features.
                        </p>

                        <Button
                            onClick={clockIn}
                            disabled={isLoading}
                            size="lg"
                            className="w-full sm:w-auto"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Start Shift (Clock In)"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Clocked in → normal page with Sheet for attendance controls
    return (
        <div className="min-h-screen bg-background">
            {/* Top status bar */}
            <div className="border-b bg-card sticky top-0 z-20 backdrop-blur-sm">
                <div className="container max-w-7xl mx-auto px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-medium">On Shift</span>
                            </div>

                            {attendance && (
                                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                        Since {new Date(attendance.clockInTime).toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            )}

                            {attendance?.status === "pending" && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                    Pending Approval
                                </Badge>
                            )}

                            {attendance?.status === "confirmed" && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    Confirmed
                                </Badge>
                            )}
                        </div>

                        {/* Sheet trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    Attendance
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>

                            <SheetContent side="right" className="w-full sm:w-[420px] sm:max-w-[420px]">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-primary" />
                                        Shift Controls
                                    </SheetTitle>
                                </SheetHeader>

                                <div className="space-y-6">
                                    <ClockInCard />

                                    <Separator />

                                    <div className="space-y-4">
                                        {!attendance?.clockOutTime ? (
                                            <Button
                                                onClick={clockOut}
                                                disabled={isLoading}
                                                variant="destructive"
                                                size="lg"
                                                className="w-full"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Ending shift…
                                                    </>
                                                ) : (
                                                    "Clock Out – End Shift"
                                                )}
                                            </Button>
                                        ) : (
                                            <div className="text-center text-muted-foreground py-4">
                                                Shift completed
                                            </div>
                                        )}

                                        <p className="text-xs text-center text-muted-foreground">
                                            Remember to clock out at the end of your shift.
                                            {attendance?.status === "pending" && (
                                                <span className="block mt-1 text-yellow-700">
                                                    Your current attendance is awaiting manager approval.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container max-w-7xl mx-auto p-6 space-y-8">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="h-7 w-7 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                </div>

                {/* Your orders content here */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Example order card */}
                    <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-semibold">Order #1234</h3>
                                <p className="text-sm text-muted-foreground">Table 5 • 12:45 PM</p>
                            </div>
                            <Badge variant="outline">Preparing</Badge>
                        </div>
                        <div className="space-y-1.5 text-sm mb-5">
                            <p>• 2× Cheeseburger</p>
                            <p>• 1× Large Fries</p>
                            <p>• 2× Cola</p>
                        </div>
                        <Button className="w-full">Mark as Served</Button>
                    </div>

                    {/* Placeholder for empty state */}
                    <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[220px]">
                        <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                        <p>No pending orders right now</p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 pt-6 border-t">
                    <Button size="lg" className="gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        New Order
                    </Button>
                    <Button variant="outline" size="lg">
                        View All Orders
                    </Button>
                </div>

                {/* Reminder */}
                <div className="bg-muted/40 border rounded-lg p-5 text-sm">
                    <p className="font-medium mb-1">Quick reminder</p>
                    <p className="text-muted-foreground">
                        Please clock out when your shift ends.{" "}
                        {attendance?.status === "pending" && "Your current shift is still pending approval."}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default OrdersPage;