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
  Search,
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
import { LeaveCalendar } from "@/components/attendance/LeaveCalendar";
import {
  exportToCSV,
  generateFilename,
} from "@/utils/export-attendance";
import { DataTable } from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { AttendanceModal } from "@/components/attendance/AttendanceModal";
import { StaffCard } from "@/components/attendance/StaffCard";
import { AttendanceSummaryBar } from "@/components/attendance/AttendanceSummaryBar";
import { ClockInModal } from "@/components/attendance/ClockInModal";
import type { LeaveRequest } from "@/models/leave-request.model";
import type { ShiftSchedule } from "@/models/shift-schedule.model";
import type { OvertimeRequest } from "@/models/overtime-request.model";
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
  const [dailyFilter, setDailyFilter] = useState<"all" | "present" | "absent">("all");

  // ── Shared filters ─────────────────────────────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trackingDate, setTrackingDate] = useState<Date>(new Date());

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedStaffModal, setSelectedStaffModal] = useState<StaffMember | null>(null);

  // ── Roster search / filter ─────────────────────────────────────────────────
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState<"all" | "in" | "out" | "leave">("all");
  const [clockInTarget, setClockInTarget] = useState<{ staffId: string; name: string; isCurrentlyIn: boolean } | null>(null);

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

  // ── Overtime Requests tab ──────────────────────────────────────────────────
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]); // pending only
  const [allOvertimeRequests, setAllOvertimeRequests] = useState<OvertimeRequest[]>([]); // all (for dashboard)
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [overtimeModal, setOvertimeModal] = useState<{ open: boolean; id: string; action: "approved" | "rejected" } | null>(null);
  const [overtimeReviewNote, setOvertimeReviewNote] = useState("");
  const [overtimeProcessing, setOvertimeProcessing] = useState(false);

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

  const fetchOvertimeRequests = async () => {
    setOvertimeLoading(true);
    try {
      // Fetch pending-only for the approval tab
      const res = await fetch("/api/attendance/admin/overtime");
      const data = await res.json();
      if (data.success) setOvertimeRequests(data.records || []);
    } catch { toast.error("Failed to load overtime requests"); }
    finally { setOvertimeLoading(false); }
  };

  const fetchAllOvertimeRequests = async () => {
    try {
      // Fetch all (pending + approved) for the dashboard hours tracking table
      const res = await fetch("/api/attendance/admin/overtime?all=true");
      const data = await res.json();
      if (data.success) setAllOvertimeRequests(data.records || []);
    } catch { /* silently fail */ }
  };

  useEffect(() => {
    if (activeTab === "overtime") fetchOvertimeRequests();
    // For dashboard: load all OT records to show approved hours in daily tracking
    if (activeTab === "dashboard") fetchAllOvertimeRequests();
  }, [activeTab]);

  const handleOvertimeReview = async () => {
    if (!overtimeModal) return;
    setOvertimeProcessing(true);
    try {
      const res = await fetch("/api/attendance/admin/overtime/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overtimeId: overtimeModal.id, status: overtimeModal.action, reviewNote: overtimeReviewNote }),
      });
      const data = await res.json();
      if (data.success) {
        const actionLabel = overtimeModal.action === "approved" ? "approved ✓" : "rejected";
        toast.success(`Overtime request ${actionLabel}`);
        // Remove from list immediately — the tab is a "pending only" action queue
        setOvertimeRequests(prev => prev.filter(r => r._id !== overtimeModal.id));
        setOvertimeModal(null);
        setOvertimeReviewNote("");
      } else { toast.error(data.message); }
    } catch { toast.error("Network error"); }
    finally { setOvertimeProcessing(false); }
  };

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
      // Filter out rejected leaves so they disappear from the admin view
      if (data.success) setLeaveRequests((data.records || []).filter((r: any) => r.status !== "rejected"));
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
        if (leaveModal.action === "rejected") {
          // Immediately remove rejected leave requests from view
          setLeaveRequests(prev => prev.filter(r => r._id !== leaveModal.id));
        } else {
          setLeaveRequests(prev => prev.map(r => r._id === leaveModal.id ? { ...r, status: leaveModal.action } : r));
        }
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Staff Attendance</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage clock-ins, schedules, leave &amp; overtime requests
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#161616] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-zinc-400">Live</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto gap-1 rounded-2xl border border-white/[0.06] bg-[#161616] p-1.5 flex flex-wrap">
          <TabsTrigger
            value="pending"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 transition-all data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-900/30"
          >
            <Clock className="h-3.5 w-3.5" />
            Pending
            {pendingRecords.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                {pendingRecords.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 transition-all data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-900/30"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Staff Roster
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 transition-all data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-900/30"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Schedule
          </TabsTrigger>
          <TabsTrigger
            value="leave"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 transition-all data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-900/30"
          >
            <FileText className="h-3.5 w-3.5" />
            Leave Requests
            {leaveRequests.filter(r => r.status === "pending").length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                {leaveRequests.filter(r => r.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="overtime"
            className="gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 transition-all data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-900/30"
          >
            <Zap className="h-3.5 w-3.5" />
            Overtime
            {overtimeRequests.filter(r => r.status === "pending").length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                {overtimeRequests.filter(r => r.status === "pending").length}
              </span>
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


        {/* ── Dashboard/Staff Roster Tab ────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5">

          {/* Summary bar */}
          <AttendanceSummaryBar
            total={dailyStaff.length}
            clockedIn={dailyStaff.filter(s => s.isCurrentlyIn).length}
            notIn={dailyStaff.filter(s => !s.isCurrentlyIn && s.status === "absent").length}
            onLeave={leaveRequests.filter(r => r.status === "approved" && r.startDate <= dailyDate && r.endDate >= dailyDate).length}
          />

          {/* Search + Filter + Refresh row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search staff by name…"
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#161616] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-red-600/60 focus:ring-1 focus:ring-red-600/30 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "in", "out", "leave"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setRosterFilter(f)}
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold capitalize transition-colors ${
                    rosterFilter === f
                      ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                      : "border border-white/[0.08] bg-[#161616] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                  }`}
                >
                  {f === "in" ? "Clocked In" : f === "out" ? "Not In" : f === "leave" ? "On Leave" : "All"}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDailyData}
              disabled={dailyLoading}
              className="shrink-0 rounded-xl border-white/[0.08] bg-[#161616] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${dailyLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Staff card grid */}
          {dailyLoading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {Array(8).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-2xl" />
              ))}
            </div>
          ) : (() => {
            const approvedLeaveStaffIds = new Set(
              leaveRequests
                .filter(r => r.status === "approved" && r.startDate <= dailyDate && r.endDate >= dailyDate)
                .map((r: any) => r.userId)
            );

            const filtered = dailyStaff.filter(s => {
              const matchesSearch = s.name.toLowerCase().includes(rosterSearch.toLowerCase());
              if (!matchesSearch) return false;
              if (rosterFilter === "in") return s.isCurrentlyIn;
              if (rosterFilter === "out") return !s.isCurrentlyIn && !approvedLeaveStaffIds.has(s.staffId);
              if (rosterFilter === "leave") return approvedLeaveStaffIds.has(s.staffId);
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users className="h-12 w-12 text-zinc-700 mb-4" />
                  <p className="text-sm font-medium text-zinc-400">No staff match your filters</p>
                  <p className="text-xs text-zinc-600 mt-1">Try adjusting the search or filter</p>
                </div>
              );
            }

            return (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {filtered.map(s => (
                  <StaffCard
                    key={s.staffId}
                    staffId={s.staffId}
                    name={s.name}
                    role={s.role}
                    image={s.image}
                    status={s.status}
                    isCurrentlyIn={s.isCurrentlyIn}
                    clockInTime={s.clockInTime}
                    clockOutTime={s.clockOutTime}
                    shift={s.shift}
                    hoursWorked={s.hoursWorked}
                    onClockIn={(staffId, name) => setClockInTarget({ staffId, name, isCurrentlyIn: s.isCurrentlyIn })}
                    onClick={() => {
                      setSelectedStaff(s.staffId);
                      setSelectedStaffModal({ id: s.staffId, name: s.name, email: "", role: s.role });
                    }}
                  />
                ))}
              </div>
            );
          })()}

          {/* ── Staff Hours Tracking (Day-by-Day) ─────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-primary" />
                    Daily Hours Tracking
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Hours logged per staff per day.
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => {
                    const d = new Date(trackingDate);
                    d.setDate(d.getDate() - 1);
                    setTrackingDate(d);
                  }}>
                    ← Prev Day
                  </Button>
                  <span className="text-sm font-bold min-w-[120px] text-center">
                    {trackingDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => {
                    const d = new Date(trackingDate);
                    d.setDate(d.getDate() + 1);
                    setTrackingDate(d);
                  }} disabled={trackingDate.toDateString() === new Date().toDateString()}>
                    Next Day →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {dashboardLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : records.length === 0 ? (
                <EmptyState icon={Clock} title="No records in range" description="Adjust the main date range filters above to load attendance data." />
              ) : (() => {
                const targetDateStr = trackingDate.toISOString().split("T")[0];
                const dayRecords = records.filter(r => r.date === targetDateStr);
                
                if (dayRecords.length === 0) {
                  return <EmptyState icon={Clock} title="No records for this day" description={`No staff clocked in on ${trackingDate.toLocaleDateString()}.`} />;
                }
                // Build a per-date+userId map for approved OT requests
                const approvedOtByDateUser = new Map<string, number>();
                allOvertimeRequests.filter(r => r.status === "approved").forEach(r => {
                  const key = `${r.date}__${r.userId}`;
                  approvedOtByDateUser.set(key, (approvedOtByDateUser.get(key) ?? 0) + r.requestedHours);
                });

                // Sort records by staff name
                const sorted = [...dayRecords].sort((a, b) => {
                  return (a.user?.name ?? "").localeCompare(b.user?.name ?? "");
                });

                const formatT = (d: string | Date | undefined) =>
                  d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";

                return (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">No.</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clock In</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clock Out</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Regular Hours</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">OT Hours</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Approved OT</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sorted.map((r, idx) => {
                            const hours = r.hoursWorked ?? 0;
                            const regH = Math.min(9, hours);
                            const otH = Math.max(0, hours - 9);
                            const approvedOt = approvedOtByDateUser.get(`${r.date}__${r.userId}`) ?? 0;
                            const total = hours;

                            return (
                              <tr key={r._id} className="hover:bg-accent/40 transition-colors">
                                <td className="px-4 py-3 font-medium text-muted-foreground text-xs">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-3">

                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                      {(r.user?.name ?? "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-semibold leading-tight">{r.user?.name ?? "Unknown"}</p>
                                      {r.shift && <p className="text-[10px] text-muted-foreground capitalize">{r.shift} shift</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1">
                                    <LogIn className="h-3 w-3 text-green-500" />
                                    {formatT(r.clockInTime)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                  {r.clockOutTime ? (
                                    <span className="inline-flex items-center gap-1">
                                      <LogOut className="h-3 w-3 text-rose-500" />
                                      {formatT(r.clockOutTime)}
                                    </span>
                                  ) : (
                                    <span className="text-xs italic text-muted-foreground/60">Still in</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-medium">{hours > 0 ? `${regH.toFixed(2)} h` : "—"}</span>
                                </td>
                                <td className="px-4 py-3">
                                  {otH > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                                      <Zap className="h-3 w-3" />
                                      {otH.toFixed(2)} h
                                    </span>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {approvedOt > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                      <CheckCircle className="h-3 w-3" />
                                      {approvedOt.toFixed(1)} h
                                    </span>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-bold">{total > 0 ? `${total.toFixed(2)} h` : "—"}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
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
            <LeaveCalendar 
              requests={leaveRequests} 
              isAdmin={true} 
              onApprove={(id) => { 
                setLeaveModal({ open: true, id, action: "approved" }); 
                setLeaveReviewNote(""); 
              }} 
              onReject={(id) => { 
                setLeaveModal({ open: true, id, action: "rejected" }); 
                setLeaveReviewNote(""); 
              }} 
            />
          )}
        </TabsContent>

        {/* ── Overtime Requests Tab ───────────────────────────────────────────── */}
        <TabsContent value="overtime" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Pending Overtime Requests
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Approve to automatically save hours to daily tracking · Reject to decline
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchOvertimeRequests} disabled={overtimeLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${overtimeLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Pending count banner */}
          {overtimeRequests.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {overtimeRequests.length} request{overtimeRequests.length !== 1 ? "s" : ""} awaiting your review
                </p>
                <p className="text-xs text-muted-foreground">Approved requests will be automatically added to the staff's daily hour tracking.</p>
              </div>
            </div>
          )}

          {overtimeLoading ? (
            <div className="grid gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          ) : overtimeRequests.length === 0 ? (
            <div className="grid place-items-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-5">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">No pending overtime requests. All submissions have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overtimeRequests.map(req => (
                <div key={req._id} className="group relative overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 hover:border-amber-500/40">
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-l-xl" />

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 pl-5">
                    {/* Avatar + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-700 dark:text-amber-400">
                        {req.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{req.userName}</p>
                          <Badge className="bg-yellow-500 hover:bg-yellow-500 text-[10px] px-2 py-0.5">Pending</Badge>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20">
                            <Timer className="h-3 w-3" />
                            {req.requestedHours}h overtime
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(req.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </div>
                        <p className="text-sm text-foreground/80 leading-snug">{req.reason}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0 sm:ml-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-1.5 shadow-sm"
                        onClick={() => { setOvertimeModal({ open: true, id: req._id, action: "approved" }); setOvertimeReviewNote(""); }}
                      >
                        <CheckCircle className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => { setOvertimeModal({ open: true, id: req._id, action: "rejected" }); setOvertimeReviewNote(""); }}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Clock In/Out Confirmation Modal ──────────────────────────────────── */}
      <ClockInModal
        open={!!clockInTarget}
        staffName={clockInTarget?.name ?? ""}
        isClockOut={clockInTarget?.isCurrentlyIn ?? false}
        onCancel={() => setClockInTarget(null)}
        onConfirm={async () => {
          if (!clockInTarget) return;
          try {
            const endpoint = clockInTarget.isCurrentlyIn
              ? "/api/attendance/admin/clock-out"
              : "/api/attendance/admin/clock-in";
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ staffId: clockInTarget.staffId }),
            });
            const data = await res.json();
            if (data.success) {
              toast.success(clockInTarget.isCurrentlyIn ? `${clockInTarget.name} clocked out` : `${clockInTarget.name} clocked in`);
              fetchDailyData();
            } else {
              toast.error(data.message || "Action failed");
            }
          } catch {
            toast.error("Network error");
          } finally {
            setClockInTarget(null);
          }
        }}
      />

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

      {/* ── Overtime Review Modal ────────────────────────────────────────── */}
      <AttendanceModal
        open={!!overtimeModal?.open}
        title={overtimeModal?.action === "approved" ? "Approve Overtime Request" : "Reject Overtime Request"}
        description={overtimeModal?.action === "approved" ? "The staff member will be notified that their overtime has been approved." : "The staff member will be notified that their overtime request was rejected."}
        confirmLabel={overtimeModal?.action === "approved" ? "Approve" : "Reject"}
        confirmVariant={overtimeModal?.action === "approved" ? "default" : "destructive"}
        isLoading={overtimeProcessing}
        onConfirm={handleOvertimeReview}
        onCancel={() => { setOvertimeModal(null); setOvertimeReviewNote(""); }}
      >
        <div className="space-y-2">
          <Label htmlFor="ot-review-note">Note for Staff (Optional)</Label>
          <Textarea
            id="ot-review-note"
            placeholder="Add a note for the staff member..."
            value={overtimeReviewNote}
            onChange={e => setOvertimeReviewNote(e.target.value)}
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