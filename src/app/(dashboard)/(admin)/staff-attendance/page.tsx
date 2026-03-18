"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { AttendanceWithUser } from "@/types/attendance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  Download,
  Filter,
  Calendar as CalendarIcon,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Trash2,
  FileText,
  CalendarDays,
  UserCheck,
  UserX,
  Timer,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  LogIn,
  LogOut,
  Zap,
} from "lucide-react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
} from "recharts";
import {
  exportToCSV,
  generateFilename,
} from "@/utils/export-attendance";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AttendanceModal } from "@/components/attendance/AttendanceModal";
import type { LeaveRequest } from "@/models/leave-request.model";
import type { ShiftSchedule } from "@/models/shift-schedule.model";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardStats {
  totalRecords: number;
  totalHours: number;
  uniqueStaff: number;
  averageHours: number;
}

interface DailyStaffStatus {
  staffId: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  status: "present" | "absent" | "late";
  clockInTime: string | null;
  clockOutTime: string | null;
  hoursWorked: number | null;
  attendanceStatus: "confirmed" | "pending" | null;
  isCurrentlyIn: boolean;
  shift: string | null;
  overtimeHours: number;
}

interface DailySummary {
  date: string;
  totalStaff: number;
  present: number;
  absent: number;
  late: number;
  currentlyIn: number;
}

const AdminAttendancePage = () => {
  // ── Pending tab ────────────────────────────────────────────────────────────
  const [pendingRecords, setPendingRecords] = useState<AttendanceWithUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingRefreshing, setPendingRefreshing] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingLastRefresh, setPendingLastRefresh] = useState(new Date());

  // ── Dashboard tab ──────────────────────────────────────────────────────────
  const [records, setRecords] = useState<AttendanceWithUser[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLastRefresh, setDashboardLastRefresh] = useState(new Date());

  // ── Daily View state ───────────────────────────────────────────────────────
  const [dailyDate, setDailyDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dailyStaff, setDailyStaff] = useState<DailyStaffStatus[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyFilter, setDailyFilter] = useState<"all" | "present" | "absent" | "late">("all");

  // ── Shared filters ─────────────────────────────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedStaffModal, setSelectedStaffModal] = useState<StaffMember | null>(null);

  // ── Leave Requests tab ─────────────────────────────────────────────────────
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveModal, setLeaveModal] = useState<{ open: boolean; id: string; action: "approved" | "rejected" } | null>(null);
  const [leaveReviewNote, setLeaveReviewNote] = useState("");
  const [leaveProcessing, setLeaveProcessing] = useState(false);

  // ── Schedule tab ───────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleStaffFilter, setScheduleStaffFilter] = useState<string>("all");
  const [scheduleWeekStart, setScheduleWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // start of this week (Sunday)
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftForm, setShiftForm] = useState({ staffId: "", date: "", dateTo: "", startTime: "08:00", endTime: "17:00", notes: "" });
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [deleteShiftId, setDeleteShiftId] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStaffList();
    fetchPendingAttendance();
  }, []);

  // Fetch daily view whenever tab is active or date changes
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDailyData();
      fetchDashboardData();
      const interval = setInterval(() => fetchDailyData(), 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, dailyDate]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab, selectedStaff, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "pending") {
      const interval = setInterval(() => fetchPendingAttendance(true), 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "leave") fetchLeaveRequests();
  }, [activeTab]);

  const weekEnd = new Date(scheduleWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const fetchSchedules = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const start = scheduleWeekStart.toISOString().split("T")[0];
      const end = weekEnd.toISOString().split("T")[0];
      let url = `/api/attendance/admin/schedules?startDate=${start}&endDate=${end}`;
      if (scheduleStaffFilter !== "all") {
        url += `&staffId=${scheduleStaffFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setSchedules(data.schedules || []);
    } catch { toast.error("Failed to load schedules"); }
    finally { setScheduleLoading(false); }
  }, [scheduleWeekStart, scheduleStaffFilter]);

  useEffect(() => {
    if (activeTab === "schedule") fetchSchedules();
  }, [activeTab, fetchSchedules]);

  const fetchLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      const res = await fetch("/api/attendance/admin/leave");
      const data = await res.json();
      if (data.success) setLeaveRequests(data.records || []);
    } catch { toast.error("Failed to load leave requests"); }
    finally { setLeaveLoading(false); }
  };

  const handleLeaveReview = async () => {
    if (!leaveModal) return;
    setLeaveProcessing(true);
    try {
      const res = await fetch("/api/attendance/admin/leave/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId: leaveModal.id, status: leaveModal.action, reviewNote: leaveReviewNote }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Leave request ${leaveModal.action}`);
        setLeaveRequests(prev => prev.map(r => r._id === leaveModal.id ? { ...r, status: leaveModal.action } : r));
        setLeaveModal(null);
        setLeaveReviewNote("");
      } else { toast.error(data.message); }
    } catch { toast.error("Network error"); }
    finally { setLeaveProcessing(false); }
  };

  const handleCreateShift = async () => {
    const selectedMember = staff.find(s => s.id === shiftForm.staffId);
    if (!shiftForm.staffId || !shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error("Please fill all required fields"); return;
    }
    setShiftSubmitting(true);
    try {
      const res = await fetch("/api/attendance/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...shiftForm, staffName: selectedMember?.name ?? "" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Shift assigned successfully");
        setShowShiftModal(false);
        setShiftForm({ staffId: "", date: "", dateTo: "", startTime: "08:00", endTime: "17:00", notes: "" });
        fetchSchedules();
      } else { toast.error(data.message); }
    } catch { toast.error("Network error"); }
    finally { setShiftSubmitting(false); }
  };

  const handleDeleteShift = async () => {
    if (!deleteShiftId) return;
    try {
      const res = await fetch(`/api/attendance/admin/schedules/${deleteShiftId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Shift removed");
        setSchedules(prev => prev.filter(s => s._id !== deleteShiftId));
        setDeleteShiftId(null);
      } else { toast.error(data.message); }
    } catch { toast.error("Network error"); }
  };

  const fetchPendingAttendance = async (silent = false) => {
    if (!silent) setPendingLoading(true);
    setPendingRefreshing(true);
    setPendingError(null);

    try {
      const res = await fetch("/api/attendance/admin/pending");
      if (!res.ok) throw new Error("Failed to fetch pending records");

      const data = await res.json();
      if (data.success) {
        setPendingRecords(data.records || []);
        setPendingLastRefresh(new Date());
      } else {
        setPendingError(data.message || "Failed to load pending records");
      }
    } catch (err) {
      setPendingError("Network error – please try again");
      console.error(err);
    } finally {
      setPendingLoading(false);
      setPendingRefreshing(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      // Use the same endpoint as staff-management which is confirmed to work
      const res = await fetch("/api/admin/staff");
      if (!res.ok) return;

      const data = await res.json();
      if (data.success) {
        // /api/admin/staff returns `data` array with _id field
        setStaff(
          (data.data || []).map((u: { _id?: string; id?: string; name: string; email: string; role: string }) => ({
            id: u.id || u._id?.toString() || "",
            name: u.name,
            email: u.email,
            role: u.role,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  const fetchDailyData = async () => {
    setDailyLoading(true);
    try {
      const res = await fetch(`/api/attendance/admin/daily?date=${dailyDate}`);
      const data = await res.json();
      if (data.success) {
        setDailyStaff(data.staff || []);
        setDailySummary(data.summary || null);
      }
    } catch {
      // silently fail
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setDashboardLoading(true);
    setDashboardError(null);

    try {
      const params = new URLSearchParams();
      if (selectedStaff !== "all") params.set("staffId", selectedStaff);
      if (startDate) params.set("startDate", startDate.toISOString().split("T")[0]);
      if (endDate) params.set("endDate", endDate.toISOString().split("T")[0]);

      const res = await fetch(`/api/attendance/admin/dashboard?${params}`);
      if (!res.ok) throw new Error("Dashboard fetch failed");

      const data = await res.json();

      if (data.success) {
        setRecords(data.records || []);
        setStats(data.stats || null);
        setDashboardLastRefresh(new Date());
      } else {
        setDashboardError(data.message || "Failed to load dashboard data");
      }
    } catch (err) {
      setDashboardError("Network error – please try again");
      console.error(err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleUpdateStatus = async (attendanceId: string, status: "confirmed" | "rejected") => {
    try {
      const res = await fetch("/api/attendance/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status }),
      });

      if (!res.ok) throw new Error("Update failed");

      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Failed to update attendance status");
        return;
      }

      setPendingRecords((prev) => prev.filter((r) => r._id !== attendanceId));
      toast.success(status === "confirmed" ? "Attendance confirmed" : "Attendance rejected");

      // Refresh dashboard if we're currently viewing it
      if (activeTab === "dashboard") {
        fetchDashboardData(true);
      }
    } catch (err) {
      toast.error("Failed to update – network error");
      console.error(err);
    }
  };

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatTime = (date: Date | string | undefined) =>
    date ? new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";

  const formatDate = (date: Date | string | undefined) =>
    date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-600 hover:bg-green-600">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 hover:bg-yellow-500">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // ── Chart Data Preparers ───────────────────────────────────────────────────
  const getDailyHoursTrend = () => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      if (!r.date || !r.hoursWorked) return;
      const key = new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map.set(key, (map.get(key) || 0) + r.hoursWorked);
    });

    return Array.from(map, ([date, hours]) => ({
      date,
      hours: Math.round(hours * 100) / 100,
    }))
      .slice(-14)
      .reverse();
  };

  const getTopStaffByHours = () => {
    const map = new Map<string, { name: string; hours: number }>();

    records.forEach((r) => {
      if (!r.hoursWorked) return;
      const name = r.user?.name || "Unknown";
      const entry = map.get(r.userId) || { name, hours: 0 };
      entry.hours += r.hoursWorked;
      map.set(r.userId, entry);
    });

    return Array.from(map.values())
      .map((v) => ({
        name: v.name.length > 18 ? v.name.slice(0, 15) + "…" : v.name,
        hours: Math.round(v.hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const pendingColumns: ColumnDef<AttendanceWithUser>[] = [
    {
      accessorKey: "user.name",
      header: "Staff",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.user?.name ?? "Unknown"}
          <div className="text-xs text-muted-foreground mt-0.5">
            {row.original.user?.email ?? "—"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      accessorKey: "clockInTime",
      header: "Clock In",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          {formatTime(getValue() as string)}
        </div>
      ),
    },
    {
      accessorKey: "clockOutTime",
      header: "Clock Out",
      cell: ({ getValue }) =>
        getValue() ? (
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            {formatTime(getValue() as string)}
          </div>
        ) : (
          <span className="italic text-muted-foreground text-sm">Not clocked out</span>
        ),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ getValue }) =>
        getValue() ? `${Number(getValue()).toFixed(2)} h` : "—",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleUpdateStatus(row.original._id, "confirmed")}
          >
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleUpdateStatus(row.original._id, "rejected")}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const dashboardColumns: ColumnDef<AttendanceWithUser>[] = [
    {
      accessorKey: "user.name",
      header: "Staff",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user?.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.user?.email ?? "—"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      accessorKey: "clockInTime",
      header: "In",
      cell: ({ getValue }) => formatTime(getValue() as string),
    },
    {
      accessorKey: "clockOutTime",
      header: "Out",
      cell: ({ getValue }) => (getValue() ? formatTime(getValue() as string) : "—"),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ getValue }) =>
        getValue() ? `${Number(getValue()).toFixed(2)} h` : "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue() as string),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Attendance</h1>
          <p className="text-muted-foreground">
            Review pending entries and view attendance analytics
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingRecords.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-2 text-xs">
                {pendingRecords.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-2">
            <FileText className="h-4 w-4" />
            Leave Requests
            {leaveRequests.filter(r => r.status === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-2 text-xs">
                {leaveRequests.filter(r => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Pending Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="pending" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Last updated:{" "}
              {Math.round((Date.now() - pendingLastRefresh.getTime()) / 60000)} min ago
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPendingAttendance(true)}
              disabled={pendingRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${pendingRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {pendingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{pendingError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              title="Pending"
              value={pendingRecords.length}
              icon={Clock}
              desc="Awaiting review"
            />
            <StatCard
              title="Unique Staff"
              value={new Set(pendingRecords.map((r) => r.userId)).size}
              icon={Users}
              desc="With pending entries"
            />
            <StatCard
              title="Total Hours"
              value={`${pendingRecords
                .reduce((s, r) => s + (r.hoursWorked || 0), 0)
                .toFixed(1)} h`}
              icon={Clock}
              desc="Pending approval"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pending Attendance Records</CardTitle>
              <CardDescription>
                Review clock-ins/clock-outs and confirm or reject
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              {pendingRecords.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="All caught up!"
                  description="No pending attendance records to review"
                />
              ) : (
                <DataTable
                  columns={pendingColumns}
                  data={pendingRecords}
                  enablePagination={true}
                  emptyMessage="No pending records"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* ── Dashboard/Staff Roster Tab ──────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Staff Roster</h2>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDailyData}
                disabled={dailyLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${dailyLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle>All Staff Members</CardTitle>
              <CardDescription>
                Click on a staff member to view their complete attendance history.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {dailyLoading ? (
                <div className="grid gap-3">
                  {Array(6).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">Avatar</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff Name</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Today's Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dailyStaff.map(s => {
                          const statusColor =
                            s.status === "present"
                              ? { badge: "bg-green-600 hover:bg-green-600", dot: "bg-green-500" }
                              : s.status === "late"
                                ? { badge: "bg-amber-500 hover:bg-amber-500", dot: "bg-amber-500" }
                                : { badge: "bg-rose-600 hover:bg-rose-600", dot: "bg-gray-300" };

                          return (
                            <tr
                              key={s.staffId}
                              className="hover:bg-accent/50 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedStaff(s.staffId);
                                setSelectedStaffModal({
                                  id: s.staffId,
                                  name: s.name,
                                  email: "",
                                  role: s.role,
                                });
                              }}
                            >
                              <td className="px-4 py-3">
                                <div className="relative inline-block">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {s.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColor.dot}`} />
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-foreground">
                                {s.name}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground capitalize">
                                {s.role}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={`text-[10px] px-2 py-0.5 ${statusColor.badge}`}>
                                  {s.status === "present" ? "Present" : s.status === "late" ? "Late" : "Absent"}
                                </Badge>
                                {s.isCurrentlyIn && (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-400 text-blue-600 ml-2">
                                    On Floor
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal for viewing specific staff records */}
          <Dialog open={!!selectedStaffModal} onOpenChange={(open) => {
            if (!open) {
              setSelectedStaffModal(null);
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 border-0 shadow-2xl overflow-hidden bg-background sm:rounded-2xl">
              <DialogHeader className="shrink-0 mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {selectedStaffModal?.name?.charAt(0).toUpperCase()}
                  </div>
                  {selectedStaffModal?.name}'s Attendance Records
                </DialogTitle>
                <DialogDescription>
                  Detailed log of clock in and clock out times
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-4 mb-4 shrink-0 flex-col sm:flex-row">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
                  <Button variant="outline" className="justify-start font-normal bg-muted/30 border-muted-foreground/20 hover:bg-muted" onClick={() => setShowDatePicker((prev) => !prev)}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Select start date"}
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</label>
                  <Button variant="outline" className="justify-start font-normal bg-muted/30 border-muted-foreground/20 hover:bg-muted" onClick={() => setShowDatePicker((prev) => !prev)}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Select end date"}
                  </Button>
                </div>
                <div className="flex flex-col justify-end">
                  <Button variant="outline" onClick={() => {
                    const filename = selectedStaffModal?.name?.replace(/\s+/g, "-") + "-attendance.csv";
                    const csvHeaders = ["Staff Name", "Email", "Date", "Clock In", "Clock Out", "Hours Worked", "Status"];
                    const rows = records.map((r) => [
                      r.user?.name || "Unknown",
                      r.user?.email || "",
                      formatDate(r.date),
                      formatTime(r.clockInTime),
                      r.clockOutTime ? formatTime(r.clockOutTime) : "Not clocked out",
                      r.hoursWorked ? r.hoursWorked.toFixed(2) : "—",
                      r.status,
                    ]);
                    exportToCSV([csvHeaders, ...rows], filename);
                    toast.success("Attendance exported as CSV");
                  }} disabled={dashboardLoading || records.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto min-h-0 min-w-0 rounded-xl border border-border/50 bg-card">
                {records.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                    <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <h3 className="text-lg font-semibold">No records found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">No attendance records were found for this staff member in the selected date range.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={dashboardColumns}
                    data={records}
                    enablePagination
                    enableSorting
                    emptyMessage="No records match the current filters"
                    loading={dashboardLoading}
                    loadingMessage="Loading attendance records..."
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Schedule Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(scheduleWeekStart);
                d.setDate(d.getDate() - 7);
                setScheduleWeekStart(new Date(d));
              }}>← Prev</Button>
              <span className="text-sm font-medium">
                {scheduleWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}
                {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(scheduleWeekStart);
                d.setDate(d.getDate() + 7);
                setScheduleWeekStart(new Date(d));
              }}>Next →</Button>
            </div>

            <div className="flex items-center gap-3">
              <Select value={scheduleStaffFilter} onValueChange={setScheduleStaffFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowShiftModal(true)}>
                <PlusCircle className="h-4 w-4" /> Assign Shift
              </Button>
            </div>
          </div>

          {scheduleLoading ? (
            <div className="grid gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : schedules.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No shifts this week" description="Use 'Assign Shift' to schedule staff for this week" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date(scheduleWeekStart);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split("T")[0];
                const daySchedules = schedules.filter((s: any) => s.date === dateStr);
                const isToday = new Date().toISOString().split("T")[0] === dateStr;

                return (
                  <div key={dateStr} className={`flex flex-col rounded-xl border bg-card overflow-hidden shadow-sm ${isToday ? 'ring-2 ring-primary/50 border-transparent' : 'border-border'}`}>
                    <div className={`py-2 text-center border-b ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                      <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      <div className="text-xl font-bold leading-tight">{date.getDate()}</div>
                    </div>
                    <div className="flex-1 p-2 space-y-2 min-h-[140px]">
                      {daySchedules.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-xs text-muted-foreground/60 italic">No shifts</span>
                        </div>
                      ) : (
                        daySchedules.map((s: any) => (
                          <div key={s._id} className="relative group text-left text-xs bg-background rounded-md border p-2 shadow-sm hover:border-primary/50 transition-colors">
                            <Button size="icon" variant="ghost" 
                              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteShiftId(s._id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="font-semibold text-foreground pr-5 truncate">{s.staffName}</div>
                            <div className="text-primary/80 font-medium mt-0.5">{s.startTime} – {s.endTime}</div>
                            {s.notes && <div className="text-muted-foreground text-[10px] mt-1 line-clamp-2" title={s.notes}>{s.notes}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Leave Requests Tab ─────────────────────────────────────────────── */}
        <TabsContent value="leave" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {leaveRequests.filter(r => r.status === "pending").length} pending review
            </div>
            <Button variant="outline" size="sm" onClick={fetchLeaveRequests} disabled={leaveLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${leaveLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {leaveLoading ? (
            <div className="grid gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : leaveRequests.length === 0 ? (
            <EmptyState icon={FileText} title="No leave requests" description="No staff have submitted leave requests yet" />
          ) : (
            <div className="space-y-3">
              {leaveRequests.map(req => (
                <Card key={req._id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{req.userName}</p>
                        {req.status === "pending" && <Badge className="bg-yellow-500 hover:bg-yellow-500">Pending</Badge>}
                        {req.status === "approved" && <Badge className="bg-green-600 hover:bg-green-600">Approved</Badge>}
                        {req.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {req.startDate} {req.startDate !== req.endDate ? `→ ${req.endDate}` : ""}
                      </p>
                      <p className="text-sm">{req.reason}</p>
                      {req.reviewNote && <p className="text-xs text-muted-foreground italic">Note: {req.reviewNote}</p>}
                    </div>
                    {req.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => { setLeaveModal({ open: true, id: req._id, action: "approved" }); setLeaveReviewNote(""); }}>
                          <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive"
                          onClick={() => { setLeaveModal({ open: true, id: req._id, action: "rejected" }); setLeaveReviewNote(""); }}>
                          <XCircle className="mr-1.5 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Assign Shift Modal ────────────────────────────────────────────────── */}
      <AttendanceModal
        open={showShiftModal}
        title="Assign Shift"
        description="Schedule a shift for a staff member"
        confirmLabel="Assign Shift"
        isLoading={shiftSubmitting}
        onConfirm={handleCreateShift}
        onCancel={() => { setShowShiftModal(false); }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Staff Member *</Label>
            <Select value={shiftForm.staffId} onValueChange={v => setShiftForm(f => ({ ...f, staffId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shift-start-date">Start Date *</Label>
              <Input id="shift-start-date" type="date" value={shiftForm.date}
                onChange={e => setShiftForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end-date">End Date (Optional)</Label>
              <Input id="shift-end-date" type="date" value={shiftForm.dateTo}
                min={shiftForm.date} // End date shouldn't be before start date
                onChange={e => setShiftForm(f => ({ ...f, dateTo: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shift-start">Start Time *</Label>
              <Input id="shift-start" type="time" value={shiftForm.startTime}
                onChange={e => setShiftForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">End Time *</Label>
              <Input id="shift-end" type="time" value={shiftForm.endTime}
                onChange={e => setShiftForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-notes">Notes (Optional)</Label>
            <Input id="shift-notes" placeholder="e.g., Cover counter, kitchen duty" value={shiftForm.notes}
              onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </AttendanceModal>

      {/* ── Delete Shift Confirmation Modal ──────────────────────────────────── */}
      <AttendanceModal
        open={!!deleteShiftId}
        title="Remove Shift"
        description="Are you sure you want to remove this shift? This action cannot be undone."
        confirmLabel="Remove Shift"
        confirmVariant="destructive"
        onConfirm={handleDeleteShift}
        onCancel={() => setDeleteShiftId(null)}
      />

      {/* ── Leave Review Modal ────────────────────────────────────────────────── */}
      <AttendanceModal
        open={!!leaveModal?.open}
        title={leaveModal?.action === "approved" ? "Approve Leave Request" : "Reject Leave Request"}
        description={leaveModal?.action === "approved" ? "The staff member will be notified that their leave has been approved." : "The staff member will be notified that their request was rejected."}
        confirmLabel={leaveModal?.action === "approved" ? "Approve" : "Reject"}
        confirmVariant={leaveModal?.action === "approved" ? "default" : "destructive"}
        isLoading={leaveProcessing}
        onConfirm={handleLeaveReview}
        onCancel={() => { setLeaveModal(null); setLeaveReviewNote(""); }}
      >
        <div className="space-y-2">
          <Label htmlFor="review-note">Note for Staff (Optional)</Label>
          <Textarea
            id="review-note"
            placeholder="Add a note for the staff member..."
            value={leaveReviewNote}
            onChange={e => setLeaveReviewNote(e.target.value)}
            rows={3}
          />
        </div>
      </AttendanceModal>
    </div>
  );
};

// ── Helper Components ────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  desc,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <Icon className="mx-auto mb-5 h-14 w-14 text-muted-foreground/60" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export default AdminAttendancePage;