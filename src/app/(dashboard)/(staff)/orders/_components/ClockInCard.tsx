// components/ClockInCard.tsx

"use client";

import { useAttendance } from "@/hooks/useAttendance";
import { Clock, CheckCircle, AlertCircle, Loader2, Timer } from "lucide-react";
import { useEffect, useState } from "react";

export function ClockInCard() {
    const { attendance, isClockedIn, isLoading, error, clockIn, clockOut } = useAttendance();
    const [currentDuration, setCurrentDuration] = useState<string>("00:00:00");

    // Live timer effect
    useEffect(() => {
        if (!attendance?.clockInTime || attendance.clockOutTime) {
            setCurrentDuration("00:00:00");
            return;
        }

        const updateDuration = () => {
            const clockInTime = new Date(attendance.clockInTime).getTime();
            const now = Date.now();
            const diff = now - clockInTime;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCurrentDuration(
                `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            );
        };

        // Update immediately
        updateDuration();

        // Update every second
        const interval = setInterval(updateDuration, 1000);

        return () => clearInterval(interval);
    }, [attendance?.clockInTime, attendance?.clockOutTime]);

    const formatTime = (date: Date | string) => {
        return new Date(date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = () => {
        if (!attendance) return null;

        const statusStyles = {
            pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
            confirmed: "bg-green-100 text-green-800 border-green-300",
            rejected: "bg-red-100 text-red-800 border-red-300",
        };

        return (
            <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[attendance.status]
                    }`}
            >
                {attendance.status === "pending" && "⏳ Awaiting Confirmation"}
                {attendance.status === "confirmed" && "✓ Confirmed"}
                {attendance.status === "rejected" && "✗ Rejected"}
            </span>
        );
    };

    if (isLoading && !attendance) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading attendance status...</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Attendance
                </h2>
                {getStatusBadge()}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {!isClockedIn ? (
                <div className="space-y-4">
                    <p className="text-gray-600">You haven't clocked in today</p>
                    <button
                        onClick={clockIn}
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-6 w-6" />
                                Clock In Now
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Live Timer Display */}
                    {!attendance?.clockOutTime && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Timer className="h-6 w-6 text-blue-600 animate-pulse" />
                                <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                                    Time Elapsed
                                </span>
                            </div>
                            <div className="text-5xl font-bold text-blue-600 font-mono tabular-nums">
                                {currentDuration}
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                HH:MM:SS
                            </div>
                        </div>
                    )}

                    {/* Clock-in Details */}
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                            <CheckCircle className="h-5 w-5" />
                            {attendance?.clockOutTime ? "Shift Completed" : "Currently Clocked In"}
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Clock-in time:</span>
                                <span className="font-semibold text-gray-800">
                                    {attendance && formatTime(attendance.clockInTime)}
                                </span>
                            </div>

                            {attendance?.clockOutTime && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Clock-out time:</span>
                                        <span className="font-semibold text-gray-800">
                                            {formatTime(attendance.clockOutTime)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                        <span className="text-gray-600">Total hours worked:</span>
                                        <span className="font-bold text-green-700 text-lg">
                                            {attendance.hoursWorked?.toFixed(2)} hrs
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Clock Out Button */}
                    {!attendance?.clockOutTime && (
                        <button
                            onClick={clockOut}
                            disabled={isLoading}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Clock className="h-6 w-6" />
                                    Clock Out
                                </>
                            )}
                        </button>
                    )}

                    {/* Pending Notice */}
                    {attendance?.status === "pending" && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                            <p className="font-medium">⏳ Awaiting Admin Confirmation</p>
                            <p className="text-xs mt-1 text-yellow-700">
                                Your attendance will be saved once confirmed by a manager
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}