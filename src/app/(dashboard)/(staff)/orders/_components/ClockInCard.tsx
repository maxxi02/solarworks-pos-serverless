// components/ClockInCard.tsx

"use client";

import { useAttendance } from "@/hooks/useAttendance";
import { AlertCircle, Loader2, Timer } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";

export function ClockInCard() {
    const { attendance, isClockedIn, isLoading, error } = useAttendance();
    const [currentDuration, setCurrentDuration] = useState("00:00:00");

    useEffect(() => {
        if (!attendance?.clockInTime || attendance.clockOutTime) {
            setCurrentDuration("00:00:00");
            return;
        }

        const update = () => {
            const diff = Date.now() - new Date(attendance.clockInTime).getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCurrentDuration(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
        };

        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [attendance?.clockInTime, attendance?.clockOutTime]);

    const formatTime = (date: string | Date) =>
        format(new Date(date), "h:mm a");

    if (isLoading && !attendance) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading attendance…</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    const statusVariant =
        attendance?.status === "pending" ? "secondary" :
            attendance?.status === "confirmed" ? "default" :
                attendance?.status === "rejected" ? "destructive" : "outline";

    return (
        <Card className="border-none shadow-sm bg-transparent">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className={`h-3 w-3 rounded-full ${isClockedIn ? "bg-green-500" : "bg-gray-400"}`} />
                        <h3 className="font-medium">Today's Attendance</h3>
                    </div>

                    {attendance && (
                        <Badge variant={statusVariant} className="text-xs font-medium">
                            {attendance.status === "pending" && "Awaiting Approval"}
                            {attendance.status === "confirmed" && "Confirmed"}
                            {attendance.status === "rejected" && "Rejected"}
                        </Badge>
                    )}
                </div>

                {isClockedIn && attendance ? (
                    <div className="space-y-4">
                        {/* Live Timer */}
                        {!attendance.clockOutTime && (
                            <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-5 text-center border border-blue-100">
                                <div className="flex items-center justify-center gap-2 mb-1.5">
                                    <Timer className="h-4 w-4 text-blue-600 animate-pulse" />
                                    <span className="text-xs font-medium uppercase tracking-wide text-blue-700">
                                        Time Elapsed
                                    </span>
                                </div>
                                <div className="text-4xl font-bold font-mono tracking-tight text-blue-700">
                                    {currentDuration}
                                </div>
                                <div className="text-xs text-blue-600/80 mt-1">HH:MM:SS</div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Clocked In</p>
                                <p className="font-medium">{formatTime(attendance.clockInTime)}</p>
                            </div>

                            {attendance.clockOutTime ? (
                                <div>
                                    <p className="text-muted-foreground">Clocked Out</p>
                                    <p className="font-medium">{formatTime(attendance.clockOutTime)}</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <p className="font-medium text-green-600">Currently on shift</p>
                                </div>
                            )}
                        </div>

                        {attendance.clockOutTime && (
                            <div className="pt-2 border-t">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Total hours</span>
                                    <span className="font-semibold text-lg">{attendance.hoursWorked?.toFixed(2) ?? "—"} hrs</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-3 text-center text-muted-foreground">
                        Not clocked in today
                    </div>
                )}
            </CardContent>
        </Card>
    );
}