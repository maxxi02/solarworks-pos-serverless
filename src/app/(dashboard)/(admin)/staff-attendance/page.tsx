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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  exportToJSON,
  exportToTXT,
  generateFilename,
} from "@/utils/export-attendance";

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

function LastUpdated({ lastRefresh }: { lastRefresh: Date }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const update = () => {
      setSecondsAgo(Math.round((Date.now() - lastRefresh.getTime()) / 1000));
    };
    update();
    const i = setInterval(update, 10000);
    return () => clearInterval(i);
  }, [lastRefresh]);

  return (
    <div className="text-xs text-muted-foreground">
      Last updated: {secondsAgo < 60 ? `${secondsAgo}s` : `${Math.round(secondsAgo / 60)}m`} ago
    </div>
  );
}

const AdminAttendancePage = () => {
  // ── Pending ────────────────────────────────────────────────────────────────
  const [pendingRecords, setPendingRecords] = useState<AttendanceWithUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingRefreshing, setPendingRefreshing] = useState(false);
  const [pendingLastRefresh, setPendingLastRefresh] = useState(new Date());

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const [records, setRecords] = useState<AttendanceWithUser[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardLastRefresh, setDashboardLastRefresh] = useState(new Date());

  // ── Filters ────────────────────────────────────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── UI State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("pending");

  // ── Initial & staff list fetch ─────────────────────────────────────────────
  useEffect(() => {
    fetchPendingAttendance();
    fetchStaffList();
  }, []);

  // ── Dashboard polling (25s) + filter changes ───────────────────────────────
  useEffect(() => {
    if (activeTab !== "dashboard") return;

    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData(true); // silent
    }, 25000);

    return () => clearInterval(interval);
  }, [activeTab, selectedStaff, startDate, endDate]);

  // ── Pending polling (15s) ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "pending") return;

    const interval = setInterval(() => {
      fetchPendingAttendance(true); // silent
    }, 15000);

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
      setPendingError("Network error. Please try again.");
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

  const handleUpdateStatus = async (
    attendanceId: string,
    status: "confirmed" | "rejected",
    adminNote?: string
  ) => {
    try {
      const res = await fetch("/api/attendance/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status, adminNote }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Failed to update status");
        setPendingError(data.message);
        return;
      }

      // Local optimistic update for pending list
      setPendingRecords((prev) => prev.filter((r) => r._id !== attendanceId));

      // Feedback
      if (status === "confirmed") {
        toast.success("Attendance confirmed and added to records");
        // If viewing dashboard → refresh immediately
        if (activeTab === "dashboard") {
          fetchDashboardData(true);
        }
      } else {
        toast.success("Attendance rejected");
      }
    } catch (err) {
      toast.error("Network error – please try again");
      setPendingError("Failed to update – network issue");
      console.error(err);
    }
  };

  // ── Export & format helpers (unchanged) ────────────────────────────────────
  const handleExport = (format: "csv" | "json" | "txt") => {
    if (records.length === 0) {
      toast.warning("No data to export");
      return;
    }

    const staffName = staff.find((s) => s.id === selectedStaff)?.name;
    const filename = generateFilename(
      startDate?.toISOString().split("T")[0],
      endDate?.toISOString().split("T")[0],
      staffName
    );

    if (format === "csv") exportToCSV(records, filename);
    else if (format === "json") exportToJSON(records, filename);
    else exportToTXT(records, filename);

    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
      .map((v) => ({ name: v.name.length > 15 ? v.name.slice(0, 12) + "…" : v.name, hours: Math.round(v.hours * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-green-600">Confirmed</Badge>;
      case "pending": return <Badge className="bg-yellow-500">Pending</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // ── Early return loading skeleton (only for initial pending load) ───────────
  if (pendingLoading && activeTab === "pending" && pendingRecords.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Attendance</h1>
          <p className="text-muted-foreground">Review, approve and analyze attendance records</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
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
        </TabsList>

        {/* ── PENDING TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="pending" className="space-y-6">
          <div className="flex items-center justify-between">
            <LastUpdated lastRefresh={pendingLastRefresh} />
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

          {/* Stats row */}
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard title="Pending" value={pendingRecords.length} icon={Clock} desc="Awaiting review" />
            <StatCard
              title="Unique Staff"
              value={new Set(pendingRecords.map((r) => r.userId)).size}
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
            <CardContent>
              {pendingRecords.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="All caught up!"
                  description="No pending attendance records"
                />
              ) : (
                <div className="overflow-x-auto">
                  <PendingTable
                    records={pendingRecords}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onApprove={(id) => handleUpdateStatus(id, "confirmed")}
                    onReject={(id) => handleUpdateStatus(id, "rejected")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DASHBOARD TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <LastUpdated lastRefresh={dashboardLastRefresh} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("txt")}>TXT</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {dashboardError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dashboardError}</AlertDescription>
            </Alert>
          )}

          {/* Filters */}
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
                  <label className="mb-1.5 block text-sm font-medium">Start</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker((v) => !v)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? startDate.toLocaleDateString() : "Pick start date"}
                  </Button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">End</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowDatePicker((v) => !v)}
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
              {/* Stats */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Records" value={stats?.totalRecords ?? 0} icon={Clock} desc="Total entries" />
                <StatCard title="Total Hours" value={`${stats?.totalHours?.toFixed(1) ?? 0} h`} icon={Clock} desc="All time tracked" />
                <StatCard title="Staff" value={stats?.uniqueStaff ?? 0} icon={Users} desc="Unique employees" />
                <StatCard title="Avg Hours" value={`${stats?.averageHours?.toFixed(1) ?? 0} h`} icon={TrendingUp} desc="Per record" />
              </div>

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Hours Trend</CardTitle>
                    <CardDescription>Last 14 days</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {getChartData().length > 0 ? (
                      <ResponsiveContainer>
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
                      <ResponsiveContainer>
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

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>Filtered results</CardDescription>
                </CardHeader>
                <CardContent>
                  {records.length === 0 ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="No records found"
                      description="Try adjusting filters or wait for new entries"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead>
                          <tr className="border-b">
                            <th className="px-4 py-3 text-left font-medium">Staff</th>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">In</th>
                            <th className="px-4 py-3 text-left font-medium">Out</th>
                            <th className="px-4 py-3 text-left font-medium">Hours</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r) => (
                            <tr key={r._id} className="border-b hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium">{r.user?.name ?? "—"}</div>
                                <div className="text-sm text-muted-foreground">{r.user?.email ?? "—"}</div>
                              </td>
                              <td className="px-4 py-3">{formatDate(r.date)}</td>
                              <td className="px-4 py-3">{formatTime(r.clockInTime)}</td>
                              <td className="px-4 py-3">
                                {r.clockOutTime ? formatTime(r.clockOutTime) : <span className="italic text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {r.hoursWorked ? `${r.hoursWorked.toFixed(2)} h` : "—"}
                              </td>
                              <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

// ── Small helper components ──────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  desc,
}: {
  title: string;
  value: number | string;
  icon: any;
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
  icon: any;
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

function PendingTable({
  records,
  formatDate,
  formatTime,
  onApprove,
  onReject,
}: {
  records: AttendanceWithUser[];
  formatDate: (d: Date | string) => string;
  formatTime: (d: Date | string) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <table className="w-full min-w-[900px]">
      <thead>
        <tr className="border-b">
          <th className="px-4 py-3 text-left font-medium">Staff</th>
          <th className="px-4 py-3 text-left font-medium">Date</th>
          <th className="px-4 py-3 text-left font-medium">Clock In</th>
          <th className="px-4 py-3 text-left font-medium">Clock Out</th>
          <th className="px-4 py-3 text-left font-medium">Hours</th>
          <th className="px-4 py-3 text-left font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r._id} className="border-b hover:bg-muted/50 transition-colors">
            <td className="px-4 py-3">
              <div className="font-medium">{r.user?.name ?? "Unknown"}</div>
              <div className="text-sm text-muted-foreground">{r.user?.email}</div>
            </td>
            <td className="px-4 py-3">{formatDate(r.date)}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                {formatTime(r.clockInTime)}
              </div>
            </td>
            <td className="px-4 py-3">
              {r.clockOutTime ? (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  {formatTime(r.clockOutTime)}
                </div>
              ) : (
                <span className="italic text-muted-foreground">Not clocked out</span>
              )}
            </td>
            <td className="px-4 py-3 font-medium">
              {r.hoursWorked ? `${r.hoursWorked.toFixed(2)} h` : "—"}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onApprove(r._id)}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onReject(r._id)}>
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default AdminAttendancePage;