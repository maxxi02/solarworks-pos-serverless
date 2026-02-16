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
      const interval = setInterval(() => fetchDashboardData(true), 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedStaff, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "pending") {
      const interval = setInterval(() => fetchPendingAttendance(true), 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

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
      const res = await fetch("/api/attendance/admin/staff-list");
      if (!res.ok) return;

      const data = await res.json();
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
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
                  enablePagination={false}
                  emptyMessage="No pending records"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dashboard Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Last updated:{" "}
              {Math.round((Date.now() - dashboardLastRefresh.getTime()) / 60000)} min ago
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (records.length === 0) {
                  toast.warning("No records to export");
                  return;
                }

                const filename = generateFilename(
                  startDate?.toISOString().split("T")[0],
                  endDate?.toISOString().split("T")[0],
                  selectedStaff !== "all"
                    ? staff.find((s) => s.id === selectedStaff)?.name?.replace(/\s+/g, "-") || "filtered"
                    : "all-staff"
                );

                const headers = [
                  "Staff Name",
                  "Email",
                  "Date",
                  "Clock In",
                  "Clock Out",
                  "Hours Worked",
                  "Status",
                ];

                const rows = records.map((r) => [
                  r.user?.name || "Unknown",
                  r.user?.email || "",
                  formatDate(r.date),
                  formatTime(r.clockInTime),
                  r.clockOutTime ? formatTime(r.clockOutTime) : "Not clocked out",
                  r.hoursWorked ? r.hoursWorked.toFixed(2) : "—",
                  r.status,
                ]);

                exportToCSV([headers, ...rows], filename);
                toast.success("Attendance exported as CSV");
              }}
              disabled={dashboardLoading || records.length === 0}
            >
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

          {/* Filters */}
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ← New: Active range summary */}
              <div className="mb-5 text-sm text-muted-foreground">
                {startDate && endDate ? (
                  <>
                    Showing records from{" "}
                    <span className="font-medium text-foreground">
                      {startDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {endDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </>
                ) : (
                  "Select a date range to filter records"
                )}
              </div>

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
                    onClick={() => setShowDatePicker((prev) => !prev)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? startDate.toLocaleDateString() : "Pick start date"}
                  </Button>
                  {/* ← New: small helper text */}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    First day of the period to include
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">End Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker((prev) => !prev)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? endDate.toLocaleDateString() : "Pick end date"}
                  </Button>
                  {/* ← New: small helper text */}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Last day of the period to include
                  </p>
                </div>
              </div>

              {showDatePicker && (
                <div className="mt-6 flex flex-wrap justify-center gap-10 border-t pt-6">
                  <div>
                    <p className="mb-2 text-sm font-medium text-center">Start Date</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-center">End Date</p>
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

          {dashboardLoading && records.length === 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Records"
                  value={stats?.totalRecords ?? 0}
                  icon={Clock}
                  desc="All entries"
                />
                <StatCard
                  title="Total Hours"
                  value={`${stats?.totalHours?.toFixed(1) ?? "0.0"} h`}
                  icon={Clock}
                  desc="Tracked time"
                />
                <StatCard
                  title="Unique Staff"
                  value={stats?.uniqueStaff ?? 0}
                  icon={Users}
                  desc="Employees"
                />
                <StatCard
                  title="Avg Hours / Record"
                  value={`${stats?.averageHours?.toFixed(1) ?? "0.0"} h`}
                  icon={TrendingUp}
                  desc="Per entry"
                />
              </div>

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Hours Trend</CardTitle>
                    <CardDescription>Last 14 days</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getDailyHoursTrend().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getDailyHoursTrend()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full grid place-items-center text-muted-foreground">
                        No data for selected period
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Staff by Hours</CardTitle>
                    <CardDescription>Top 10</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getTopStaffByHours().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getTopStaffByHours()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={160} />
                          <Tooltip />
                          <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full grid place-items-center text-muted-foreground">
                        No data for selected period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>Filtered results</CardDescription>
                </CardHeader>
                <CardContent className="pt-1">
                  {records.length === 0 ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="No records found"
                      description="Adjust filters or wait for new entries"
                    />
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