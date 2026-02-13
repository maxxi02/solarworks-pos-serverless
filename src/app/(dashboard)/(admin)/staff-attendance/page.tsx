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
  const [pendingRequests, setPendingRequests] = useState<PendingAttendance[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending attendance requests
  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/attendance/pending");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.success) {
        const transformed = (data.attendances || []).map((att: any) => ({
          id: att._id?.toString() || att.id,
          userId: att.userId?.toString(),
          status: att.status,
          requestedCheckInAt: att.requestedCheckInAt,
          requestedCheckOutAt: att.requestedCheckOutAt,
          checkInLocation: att.checkInLocation,
          checkOutLocation: att.checkOutLocation,
          workSummary: att.workSummary,
          user: att.user
            ? {
                name: att.user.name || null,
                email: att.user.email || "unknown@example.com",
              }
            : { name: null, email: "unknown@example.com" },
        }));

        setPendingRequests(transformed);
      } else {
        toast.error("Failed to load requests", {
          description: data.message || "Unknown error from server",
        });
      }
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
      toast.error("Connection error", {
        description: "Could not load pending attendance requests.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.info("Refreshing...", {
      description: "Fetching latest requests...",
    });
    fetchPendingRequests();
  };

  // Poll every 10 seconds
  useEffect(() => {
    if (
      session?.user?.id &&
      ["manager", "admin"].includes(session.user.role || "")
    ) {
      fetchPendingRequests();
      const interval = setInterval(fetchPendingRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Approve handler
  const handleApprove = async (
    attendanceId: string,
    approveCheckIn: boolean,
    approveCheckOut: boolean,
  ) => {
    if (!approveCheckIn && !approveCheckOut) return;

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

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Approval failed");
      }

      toast.success("Approved", {
        description: `Status updated to ${data.status || "approved"}`,
      });

      // Only remove if success
      setPendingRequests((prev) =>
        prev.filter((req) => req.id !== attendanceId),
      );

      // Refresh list shortly after
      setTimeout(fetchPendingRequests, 800);
    } catch (err: any) {
      toast.error("Approval failed", {
        description: err.message || "Something went wrong.",
      });
      console.error("Approve error:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Reject handler
  const handleReject = async (attendanceId: string) => {
    const reason = window.prompt("Please enter reason for rejection:");
    if (!reason?.trim()) {
      toast.error("Rejection cancelled", {
        description: "You must provide a reason.",
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

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Rejection failed");
      }

      toast.error("Rejected", {
        description: "Request has been rejected.",
      });

      setPendingRequests((prev) =>
        prev.filter((req) => req.id !== attendanceId),
      );
      setTimeout(fetchPendingRequests, 800);
    } catch (err: any) {
      toast.error("Rejection failed", {
        description: err.message || "Could not reject request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getUserDisplayName = (request: PendingAttendance) => {
    if (!request.user) return "Unknown User";
    return request.user.name || request.user.email || "Unknown User";
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (
    !session?.user ||
    !["manager", "admin"].includes(session.user.role || "")
  ) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 pb-16">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Staff Attendance
          </h1>
          <p className="text-muted-foreground">
            Review and approve pending clock-in / clock-out requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5" />
              Pending Requests
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {pendingRequests.length} pending
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-green-500/80" />
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No pending attendance requests at the moment.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={handleRefresh}
              >
                Check again
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {pendingRequests.map((request) => (
                <Card
                  key={request.id}
                  className="overflow-hidden border-l-4 border-l-yellow-400 dark:border-l-yellow-600"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left - Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          {request.user ? (
                            <UserCheck className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <UserX className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="font-medium text-lg">
                            {getUserDisplayName(request)}
                          </span>
                          <Badge variant="outline">
                            {request.status === "PENDING_CHECKIN"
                              ? "Clock-in"
                              : "Clock-out"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            Requested:{" "}
                            {new Date(
                              request.requestedCheckInAt ||
                                request.requestedCheckOutAt!,
                            ).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>

                        {request.checkInLocation && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>
                              Check-in:{" "}
                              {request.checkInLocation.latitude.toFixed(5)},{" "}
                              {request.checkInLocation.longitude.toFixed(5)}
                            </span>
                          </div>
                        )}

                        {request.checkOutLocation && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>
                              Check-out:{" "}
                              {request.checkOutLocation.latitude.toFixed(5)},{" "}
                              {request.checkOutLocation.longitude.toFixed(5)}
                            </span>
                          </div>
                        )}

                        {request.workSummary && (
                          <div className="mt-3 rounded bg-muted/60 p-3 text-sm">
                            <p className="font-medium mb-1">Work summary:</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {request.workSummary}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right - Actions */}
                      <div className="flex flex-row gap-3 lg:flex-col lg:gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 min-w-[110px]"
                          onClick={() => {
                            if (request.status === "PENDING_CHECKIN") {
                              handleApprove(request.id, true, false);
                            } else if (request.status === "PENDING_CHECKOUT") {
                              handleApprove(request.id, false, true);
                            }
                          }}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="min-w-[110px]"
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
