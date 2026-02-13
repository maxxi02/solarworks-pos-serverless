// OrdersPage.tsx

"use client";

import { useAttendance } from "@/hooks/useAttendance";
import { ClockInCard } from "./_components/ClockInCard";
import { AlertTriangle, ShoppingCart, CheckCircle2, Clock } from "lucide-react";

const OrdersPage = () => {
    const { isClockedIn, isLoading, attendance } = useAttendance();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // If not clocked in, show the clock-in requirement
    if (!isClockedIn) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-2xl mx-auto mt-12">
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 text-center mb-6 shadow-lg">
                        <AlertTriangle className="h-20 w-20 text-yellow-600 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-gray-800 mb-3">
                            Clock In Required
                        </h2>
                        <p className="text-gray-600 text-lg mb-2">
                            You must clock in before accessing the Orders page
                        </p>
                        <p className="text-sm text-gray-500">
                            This ensures accurate time tracking for your shift
                        </p>
                    </div>
                    <ClockInCard />
                </div>
            </div>
        );
    }

    // User is clocked in - show the full OrdersPage
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Status Bar - Compact */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-700">
                                    Clocked In
                                </span>
                            </div>

                            {attendance && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                        Since {new Date(attendance.clockInTime).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            )}

                            {attendance?.status === "pending" && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                    Pending Approval
                                </span>
                            )}

                            {attendance?.status === "confirmed" && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Confirmed
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                // You can add a modal or expand to show full attendance details
                                const elem = document.getElementById("attendance-details");
                                elem?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            View Details
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Collapsible Attendance Details */}
                <details className="bg-white rounded-lg shadow-sm" id="attendance-details">
                    <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 rounded-lg font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Attendance Details
                    </summary>
                    <div className="px-6 pb-4 pt-2">
                        <ClockInCard />
                    </div>
                </details>

                {/* Main Orders Content */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <ShoppingCart className="h-7 w-7 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
                    </div>

                    {/* Your existing orders functionality here */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Sample Order Card */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">Order #1234</h3>
                                        <p className="text-sm text-gray-500">Table 5</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                        Pending
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600 mb-3">
                                    <p>• 2x Burger</p>
                                    <p>• 1x Fries</p>
                                    <p>• 2x Soda</p>
                                </div>
                                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-medium transition-colors">
                                    Mark as Served
                                </button>
                            </div>

                            {/* Add more order cards or your actual order components */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                                <div className="text-center text-gray-400">
                                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No more pending orders</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                New Order
                            </button>
                            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                                View All Orders
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 Reminder</p>
                    <p>
                        Don't forget to clock out at the end of your shift!
                        {attendance?.status === "pending" && " Your attendance is pending admin confirmation."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;