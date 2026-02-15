"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DollarSign,
  BarChart3,
  PieChart,
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
  Pie,
  PieChart as RePieChart,
  Cell,
} from "recharts";
import {
  exportToCSV,
  generateFilename,
} from "@/utils/export-attendance";
import {
  DataTable,
} from "@/components/data-table"; // Adjust path as needed
import { ColumnDef } from "@tanstack/react-table";

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

interface StaffEarnings {
  staffId: string;
  name: string;
  email: string;
  totalEarnings: number;
  regularEarnings: number;
  overtimeEarnings: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  daysPresent: number;
  recordCount: number;
}

interface EarningsSummary {
  totalPayroll: number;
  totalRegularPay: number;
  totalOvertimePay: number;
  averageEarningsPerStaff: number;
  staffCount: number;
}

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

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

  // ── Earnings tab ───────────────────────────────────────────────────────────
  const [earningsData, setEarningsData] = useState<StaffEarnings[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [earningsLastRefresh, setEarningsLastRefresh] = useState(new Date());

  // ── Shared filters ─────────────────────────────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("pending");

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStaffList();
    fetchPendingAttendance();
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
      const interval = setInterval(() => fetchDashboardData(true), 25000);
      return () => clearInterval(interval);
    }

    if (activeTab === "earnings") {
      fetchEarningsData();
      const interval = setInterval(() => fetchEarningsData(true), 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedStaff, startDate, endDate]);

  useEffect(() => {
    if (activeTab !== "pending") return;
    const interval = setInterval(() => fetchPendingAttendance(true), 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchPendingAttendance = async (silent = false) => {
    if (!silent) setPendingLoading(true);
    setPendingRefreshing(true);
    setPendingError(null);

    try {
      const res = await fetch("/api/attendance/admin/pending");
      const data = await res.json();
      if (data.success) {
        setPendingRecords(data.records);
        setPendingLastRefresh(new Date());
      } else {
        setPendingError(data.message || "Failed to load pending records");
      }
    } catch {
      setPendingError("Network error");
    } finally {
      setPendingLoading(false);
      setPendingRefreshing(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await fetch("/api/attendance/admin/staff-list");
      const data = await res.json();
      if (data.success) setStaff(data.staff);
    } catch (err) {
      console.error("Staff list fetch failed", err);
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
      const data = await res.json();

      if (data.success) {
        setRecords(data.records);
        setStats(data.stats);
        setDashboardLastRefresh(new Date());
      } else {
        setDashboardError(data.message || "Failed to load dashboard");
      }
    } catch {
      setDashboardError("Network error");
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchEarningsData = async (silent = false) => {
    if (!silent) setEarningsLoading(true);
    setEarningsError(null);

    try {
      const params = new URLSearchParams();
      if (selectedStaff !== "all") params.set("staffId", selectedStaff);
      if (startDate) params.set("startDate", startDate.toISOString().split("T")[0]);
      if (endDate) params.set("endDate", endDate.toISOString().split("T")[0]);

      const res = await fetch(`/api/attendance/admin/earnings?${params}`);
      const data = await res.json();

      if (data.success) {
        setEarningsData(data.staffEarnings || []);

        // Calculate summary statistics
        if (data.staffEarnings?.length > 0) {
          const summary: EarningsSummary = {
            totalPayroll: data.staffEarnings.reduce((sum: number, e: StaffEarnings) => sum + e.totalEarnings, 0),
            totalRegularPay: data.staffEarnings.reduce((sum: number, e: StaffEarnings) => sum + e.regularEarnings, 0),
            totalOvertimePay: data.staffEarnings.reduce((sum: number, e: StaffEarnings) => sum + e.overtimeEarnings, 0),
            averageEarningsPerStaff: 0,
            staffCount: data.staffEarnings.length,
          };
          summary.averageEarningsPerStaff = summary.totalPayroll / summary.staffCount;
          setEarningsSummary(summary);
        } else {
          setEarningsSummary(null);
        }

        setEarningsLastRefresh(new Date());
      } else {
        setEarningsError(data.message || "Failed to load earnings data");
      }
    } catch {
      setEarningsError("Network error");
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleUpdateStatus = async (attendanceId: string, status: "confirmed" | "rejected") => {
    try {
      const res = await fetch("/api/attendance/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Failed to update");
        return;
      }

      setPendingRecords(prev => prev.filter(r => r._id !== attendanceId));
      toast.success(status === "confirmed" ? "Attendance confirmed" : "Attendance rejected");

      if (activeTab === "dashboard") fetchDashboardData(true);
      if (activeTab === "earnings") fetchEarningsData(true);
    } catch {
      toast.error("Network error");
    }
  };

  const handleExportEarnings = () => {
    if (earningsData.length === 0) {
      toast.warning("No earnings data to export");
      return;
    }

    const filename = generateFilename(
      startDate?.toISOString().split("T")[0],
      endDate?.toISOString().split("T")[0],
      "earnings-summary"
    );

    const headers = [
      "Staff Name",
      "Email",
      "Total Earnings (₱)",
      "Regular Earnings (₱)",
      "Overtime Earnings (₱)",
      "Total Hours",
      "Regular Hours",
      "Overtime Hours",
      "Days Present",
      "Record Count"
    ];

    const rows = earningsData.map(e => [
      e.name,
      e.email,
      e.totalEarnings.toFixed(2),
      e.regularEarnings.toFixed(2),
      e.overtimeEarnings.toFixed(2),
      e.totalHours.toFixed(2),
      e.regularHours.toFixed(2),
      e.overtimeHours.toFixed(2),
      e.daysPresent.toString(),
      e.recordCount.toString()
    ]);

    exportToCSV([headers, ...rows], filename);
    toast.success("Earnings exported as CSV");
  };


  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatCurrency = (value?: number) => value ? `₱${value.toFixed(2)}` : "₱0.00";

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₱${(value / 1000).toFixed(1)}K`;
    return `₱${value.toFixed(0)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-green-600">Confirmed</Badge>;
      case "pending": return <Badge className="bg-yellow-500">Pending</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChartData = () => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      const key = new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      map.set(key, (map.get(key) || 0) + (r.hoursWorked || 0));
    });
    return Array.from(map, ([date, hours]) => ({ date, hours: Math.round(hours * 100) / 100 }))
      .slice(-14)
      .reverse();
  };

  const getStaffHoursData = () => {
    const map = new Map<string, { name: string; hours: number }>();
    records.forEach((r) => {
      const name = r.user?.name || "Unknown";
      const entry = map.get(r.userId) || { name, hours: 0 };
      entry.hours += r.hoursWorked || 0;
      map.set(r.userId, entry);
    });
    return Array.from(map.values())
      .map((v) => ({
        name: v.name.length > 15 ? v.name.slice(0, 12) + "…" : v.name,
        hours: Math.round(v.hours * 100) / 100
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  };

  const getEarningsPieData = () => {
    if (!earningsSummary) return [];
    return [
      { name: "Regular Pay", value: earningsSummary.totalRegularPay },
      { name: "Overtime Pay", value: earningsSummary.totalOvertimePay },
    ];
  };

  const getTopEarnersData = () => {
    return earningsData
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5)
      .map(e => ({
        name: e.name.length > 12 ? e.name.slice(0, 10) + "…" : e.name,
        earnings: e.totalEarnings,
      }));
  };

  // ── Pending Columns ────────────────────────────────────────────────────────
  const pendingColumns: ColumnDef<AttendanceWithUser>[] = [
    {
      accessorKey: "user.name",
      header: "Staff",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.user?.name ?? "Unknown"}
          <div className="text-sm text-muted-foreground">{row.original.user?.email}</div>
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
      cell: ({ getValue }) => ( // Fix: Remove unused 'row' parameter
        getValue() ? (
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            {formatTime(getValue() as string)}
          </div>
        ) : (
          <span className="italic text-muted-foreground">Not clocked out</span>
        )
      ),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ getValue }) => (
        getValue() ? `${(getValue() as number).toFixed(2)} h` : "—"
      ),
    },
    {
      id: "actions",
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

  // ── Dashboard Columns ──────────────────────────────────────────────────────
  const dashboardColumns: ColumnDef<AttendanceWithUser>[] = [
    {
      accessorKey: "user.name",
      header: "Staff",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user?.name ?? "—"}</div>
          <div className="text-sm text-muted-foreground">{row.original.user?.email ?? "—"}</div>
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
      cell: ({ getValue }) => (
        getValue() ? formatTime(getValue() as string) : <span className="italic text-muted-foreground">—</span>
      ),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ getValue }) => (
        getValue() ? `${(getValue() as number).toFixed(2)} h` : "—"
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => getStatusBadge(getValue() as string),
    },
  ];

  // ── Earnings Columns ───────────────────────────────────────────────────────
  const earningsColumns: ColumnDef<StaffEarnings>[] = [
    {
      accessorKey: "name",
      header: "Staff",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "totalEarnings",
      header: "Total Earnings",
      cell: ({ getValue }) => (
        <div className="text-right font-medium text-emerald-700">
          {formatCurrency(getValue() as number)}
        </div>
      ),
    },
    {
      accessorKey: "regularEarnings",
      header: "Regular Pay",
      cell: ({ getValue }) => (
        <div className="text-right">{formatCurrency(getValue() as number)}</div>
      ),
    },
    {
      accessorKey: "overtimeEarnings",
      header: "Overtime Pay",
      cell: ({ getValue }) => (
        <div className="text-right text-amber-700">{formatCurrency(getValue() as number)}</div>
      ),
    },
    {
      accessorKey: "totalHours",
      header: "Total Hours",
      cell: ({ getValue }) => <div className="text-right font-medium">{(getValue() as number).toFixed(1)} h</div>,
    },
    {
      accessorKey: "regularHours",
      header: "Regular Hrs",
      cell: ({ getValue }) => <div className="text-right">{(getValue() as number).toFixed(1)} h</div>,
    },
    {
      accessorKey: "overtimeHours",
      header: "Overtime Hrs",
      cell: ({ getValue }) => <div className="text-right">{(getValue() as number).toFixed(1)} h</div>,
    },
    {
      accessorKey: "daysPresent",
      header: "Days",
      cell: ({ getValue }) => <div className="text-right">{getValue() as number}</div>,
    },
    {
      accessorKey: "recordCount",
      header: "Records",
      cell: ({ getValue }) => <div className="text-right">{getValue() as number}</div>,
    },
  ];

  // ── Earnings Footer ────────────────────────────────────────────────────────
  const renderEarningsFooter = () => (
    <tfoot className="border-t-2 border-muted bg-muted/20">
      <tr>
        <th className="px-4 py-3 font-medium">TOTAL</th>
        <td className="px-4 py-3 text-right font-bold text-emerald-700">
          {formatCurrency(earningsSummary?.totalPayroll || 0)}
        </td>
        <td className="px-4 py-3 text-right font-medium">
          {formatCurrency(earningsSummary?.totalRegularPay || 0)}
        </td>
        <td className="px-4 py-3 text-right font-medium text-amber-700">
          {formatCurrency(earningsSummary?.totalOvertimePay || 0)}
        </td>
        <td className="px-4 py-3 text-right font-medium">
          {earningsData.reduce((sum, e) => sum + e.totalHours, 0).toFixed(1)} h
        </td>
        <td colSpan={4} />
      </tr>
    </tfoot>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (pendingLoading && activeTab === "pending" && pendingRecords.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Attendance</h1>
          <p className="text-muted-foreground">Manage attendance and view earnings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingRecords.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-2">
                {pendingRecords.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Earnings
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Last updated: {Math.round((Date.now() - pendingLastRefresh.getTime()) / 1000 / 60)}m ago
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPendingAttendance(true)}
              disabled={pendingRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${pendingRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {pendingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{pendingError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard title="Pending" value={pendingRecords.length} icon={Clock} desc="Awaiting review" />
            <StatCard
              title="Unique Staff"
              value={new Set(pendingRecords.map(r => r.userId)).size}
              icon={Users}
              desc="Staff with pending entries"
            />
            <StatCard
              title="Total Hours"
              value={`${pendingRecords.reduce((s, r) => s + (r.hoursWorked || 0), 0).toFixed(1)} h`}
              icon={Clock}
              desc="Pending approval"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pending Attendance</CardTitle>
              <CardDescription>Review and confirm / reject submissions</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {pendingRecords.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="All caught up!"
                  description="No pending attendance records"
                />
              ) : (
                <DataTable
                  columns={pendingColumns}
                  data={pendingRecords}
                  enablePagination={false}
                  emptyMessage="No pending records"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-muted-foreground">
              Last updated: {Math.round((Date.now() - dashboardLastRefresh.getTime()) / 1000 / 60)}m ago
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              if (records.length === 0) {
                toast.warning("No data to export");
                return;
              }
              const filename = generateFilename(
                startDate?.toISOString().split("T")[0],
                endDate?.toISOString().split("T")[0],
                selectedStaff !== "all" ? staff.find(s => s.id === selectedStaff)?.name : "all-staff"
              );

              // Convert records to CSV format
              const headers = ["Staff Name", "Email", "Date", "Clock In", "Clock Out", "Hours Worked", "Status"];
              const rows = records.map(r => [
                r.user?.name || "Unknown",
                r.user?.email || "",
                formatDate(r.date),
                formatTime(r.clockInTime),
                r.clockOutTime ? formatTime(r.clockOutTime) : "Not clocked out",
                r.hoursWorked ? r.hoursWorked.toFixed(2) : "—",
                r.status
              ]);

              exportToCSV([headers, ...rows], filename);
              toast.success("Exported as CSV");
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {dashboardError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dashboardError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Staff</label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Start Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? startDate.toLocaleDateString() : "Pick start date"}
                  </Button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">End Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? endDate.toLocaleDateString() : "Pick end date"}
                  </Button>
                </div>
              </div>

              {showDatePicker && (
                <div className="mt-5 flex flex-wrap justify-center gap-8">
                  <div>
                    <p className="mb-2 text-sm font-medium">Start Date</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">End Date</p>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="rounded-md border"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {dashboardLoading && !records.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Records" value={stats?.totalRecords ?? 0} icon={Clock} desc="Total entries" />
                <StatCard title="Total Hours" value={`${stats?.totalHours?.toFixed(1) ?? 0} h`} icon={Clock} desc="All tracked" />
                <StatCard title="Staff" value={stats?.uniqueStaff ?? 0} icon={Users} desc="Unique employees" />
                <StatCard title="Avg Hours" value={`${stats?.averageHours?.toFixed(1) ?? 0} h`} icon={TrendingUp} desc="Per record" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Hours Trend</CardTitle>
                    <CardDescription>Last 14 days</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getChartData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">No data yet</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Staff by Hours</CardTitle>
                    <CardDescription>Top 10 performers</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getStaffHoursData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getStaffHoursData()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={140} />
                          <Tooltip />
                          <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">No data yet</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>Filtered results</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {records.length === 0 ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="No records found"
                      description="Try adjusting filters or wait for new entries"
                    />
                  ) : (
                    <DataTable
                      columns={dashboardColumns}
                      data={records}
                      enablePagination
                      enableSorting
                      emptyMessage="No records found"
                      loading={dashboardLoading}
                      loadingMessage="Loading records..."
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-muted-foreground">
              Last updated: {Math.round((Date.now() - earningsLastRefresh.getTime()) / 60000)} min ago
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEarningsData(true)}
                disabled={earningsLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${earningsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportEarnings}
                disabled={earningsData.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {earningsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{earningsError}</AlertDescription>
            </Alert>
          )}

          {/* Filters card (reuse same filters) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Staff</label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Start Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? startDate.toLocaleDateString() : "Pick start date"}
                  </Button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">End Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? endDate.toLocaleDateString() : "Pick end date"}
                  </Button>
                </div>
              </div>

              {showDatePicker && (
                <div className="mt-5 flex flex-wrap justify-center gap-8">
                  <div>
                    <p className="mb-2 text-sm font-medium">Start Date</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">End Date</p>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="rounded-md border"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {earningsLoading ? (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : earningsData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No earnings data found for the selected period/filter.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Payroll"
                  value={formatCompactCurrency(earningsSummary?.totalPayroll || 0)}
                  icon={DollarSign}
                  desc="Total earnings (all staff)"
                />
                <StatCard
                  title="Regular Pay"
                  value={formatCompactCurrency(earningsSummary?.totalRegularPay || 0)}
                  icon={DollarSign}
                  desc="Base salary payments"
                />
                <StatCard
                  title="Overtime Pay"
                  value={formatCompactCurrency(earningsSummary?.totalOvertimePay || 0)}
                  icon={TrendingUp}
                  desc="Extra hours compensation"
                />
                <StatCard
                  title="Avg per Staff"
                  value={formatCompactCurrency(earningsSummary?.averageEarningsPerStaff || 0)}
                  icon={Users}
                  desc={`Across ${earningsSummary?.staffCount || 0} staff`}
                />
              </div>

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Pay Breakdown
                    </CardTitle>
                    <CardDescription>Regular vs Overtime</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getEarningsPieData().some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={getEarningsPieData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getEarningsPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">No data available</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top Earners
                    </CardTitle>
                    <CardDescription>Highest paid staff</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getTopEarnersData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getTopEarnersData()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Bar dataKey="earnings" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">No data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Earnings Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff Earnings Summary</CardTitle>
                  <CardDescription>
                    Aggregated confirmed earnings for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataTable
                    columns={earningsColumns}
                    data={earningsData}
                    enablePagination={false}
                    emptyMessage="No earnings data"
                    renderFooter={() => renderEarningsFooter()}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
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
  icon: React.ComponentType<{ className?: string }>; // Fix: Proper icon type
  desc: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>; // Fix: Proper icon type
  title: string;
  description: string;
}) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <Icon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default AdminAttendancePage;