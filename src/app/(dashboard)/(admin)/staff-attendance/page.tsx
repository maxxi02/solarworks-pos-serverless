"use client";

import { useState, useEffect } from "react";
import type { AttendanceWithUser } from "@/types/attendance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileDown,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart } from "recharts";
import {
  exportToCSV,
  exportToJSON,
  exportToTXT,
  generateFilename,
} from '@/utils/export-attendance'

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
  // Pending Approvals State
  const [pendingRecords, setPendingRecords] = useState<AttendanceWithUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard State
  const [records, setRecords] = useState<AttendanceWithUser[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Filters
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchPendingAttendance();
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab, selectedStaff, startDate, endDate]);

  const fetchPendingAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setPendingLoading(true);
      }
      setPendingError(null);

      const response = await fetch("/api/attendance/admin/pending");
      const data = await response.json();

      if (data.success) {
        setPendingRecords(data.records);
      } else {
        setPendingError(data.message || "Failed to fetch attendance records");
      }
    } catch (err) {
      setPendingError("Network error. Please try again.");
      console.error("Fetch error:", err);
    } finally {
      setPendingLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await fetch("/api/attendance/admin/staff-list");
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff);
      }
    } catch (err) {
      console.error("Fetch staff error:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      setDashboardError(null);

      const params = new URLSearchParams();
      if (selectedStaff !== "all") {
        params.append("staffId", selectedStaff);
      }
      if (startDate) {
        params.append("startDate", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString().split("T")[0]);
      }

      const response = await fetch(`/api/attendance/admin/dashboard?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.records);
        setStats(data.stats);
      } else {
        setDashboardError(data.message);
      }
    } catch (err) {
      setDashboardError("Failed to fetch dashboard data");
      console.error("Fetch error:", err);
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
      const response = await fetch("/api/attendance/admin/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId, status, adminNote }),
      });

      const data = await response.json();

      if (data.success) {
        setPendingRecords((prev) =>
          prev.filter((record) => record._id !== attendanceId)
        );
      } else {
        setPendingError(data.message || "Failed to update status");
      }
    } catch (err) {
      setPendingError("Network error. Please try again.");
      console.error("Update status error:", err);
    }
  };

  const handleExport = (format: "csv" | "json" | "txt") => {
    if (records.length === 0) {
      alert("No data to export");
      return;
    }

    const selectedStaffName = staff.find((s) => s.id === selectedStaff)?.name;
    const filename = generateFilename(
      startDate?.toISOString().split("T")[0],
      endDate?.toISOString().split("T")[0],
      selectedStaffName
    );

    switch (format) {
      case "csv":
        exportToCSV(records, filename);
        break;
      case "json":
        exportToJSON(records, filename);
        break;
      case "txt":
        exportToTXT(records, filename);
        break;
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getChartData = () => {
    const dateMap = new Map<string, number>();
    records.forEach((record) => {
      const date = new Date(record.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dateMap.set(date, (dateMap.get(date) || 0) + (record.hoursWorked || 0));
    });

    return Array.from(dateMap.entries())
      .map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 100) / 100,
      }))
      .slice(0, 14)
      .reverse();
  };

  const getStaffHoursData = () => {
    const staffMap = new Map<string, { name: string; hours: number }>();
    records.forEach((record) => {
      const staffName = record.user?.name || "Unknown";
      const existing = staffMap.get(record.userId);
      if (existing) {
        existing.hours += record.hoursWorked || 0;
      } else {
        staffMap.set(record.userId, {
          name: staffName,
          hours: record.hoursWorked || 0,
        });
      }
    });

    return Array.from(staffMap.values())
      .map((item) => ({
        name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
        hours: Math.round(item.hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (pendingLoading && activeTab === "pending") {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Staff Attendance Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Review attendance, approve submissions, and analyze attendance data
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approvals
            {pendingRecords.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRecords.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard & Reports
          </TabsTrigger>
        </TabsList>

        {/* PENDING APPROVALS TAB */}
        <TabsContent value="pending" className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-end">
            <Button
              onClick={() => fetchPendingAttendance(true)}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Error Alert */}
          {pendingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{pendingError}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingRecords.length}</div>
                <p className="text-xs text-muted-foreground">Awaiting your review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Staff</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(pendingRecords.map((r) => r.userId)).size}
                </div>
                <p className="text-xs text-muted-foreground">Staff members pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pendingRecords
                    .reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
                    .toFixed(1)}
                  h
                </div>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Attendance Records</CardTitle>
              <CardDescription>
                Review and approve or reject staff attendance submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRecords.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                  <p className="text-muted-foreground">
                    No pending attendance records to review
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Staff Member</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Clock In</th>
                        <th className="text-left py-3 px-4 font-medium">Clock Out</th>
                        <th className="text-left py-3 px-4 font-medium">Hours</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecords.map((record) => (
                        <tr
                          key={record._id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">
                                {record.user?.name || "Unknown"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {record.user?.email}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{formatDate(record.date)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full" />
                              {formatTime(record.clockInTime)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {record.clockOutTime ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-red-500 rounded-full" />
                                {formatTime(record.clockOutTime)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Not clocked out
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {record.hoursWorked
                              ? `${record.hoursWorked.toFixed(2)}h`
                              : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateStatus(record._id, "confirmed")
                                }
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleUpdateStatus(record._id, "rejected")
                                }
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("txt")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export as TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Error Alert */}
          {dashboardError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dashboardError}</AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Staff Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Staff Member
                  </label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Staff" />
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

                {/* Date Range Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate ? startDate.toLocaleDateString() : "Select date"}
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {endDate ? endDate.toLocaleDateString() : "Select date"}
                  </Button>
                </div>
              </div>

              {showDatePicker && (
                <div className="mt-4 flex gap-4 justify-center">
                  <div>
                    <p className="text-sm font-medium mb-2">Start Date</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">End Date</p>
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

          {dashboardLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalRecords || 0}</div>
                    <p className="text-xs text-muted-foreground">Attendance entries</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.totalHours.toFixed(1) || 0}h
                    </div>
                    <p className="text-xs text-muted-foreground">Combined work hours</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.uniqueStaff || 0}</div>
                    <p className="text-xs text-muted-foreground">Unique employees</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats?.averageHours.toFixed(1) || 0}h
                    </div>
                    <p className="text-xs text-muted-foreground">Per attendance record</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Hours Trend</CardTitle>
                    <CardDescription>Daily total hours worked (last 14 days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getChartData().length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: "#3b82f6" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Staff Hours Comparison</CardTitle>
                    <CardDescription>Top 10 staff by total hours worked</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getStaffHoursData().length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getStaffHoursData()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="hours" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Records Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    Detailed view of all attendance entries matching your filters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {records.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Staff Member</th>
                            <th className="text-left py-3 px-4 font-medium">Date</th>
                            <th className="text-left py-3 px-4 font-medium">Clock In</th>
                            <th className="text-left py-3 px-4 font-medium">Clock Out</th>
                            <th className="text-left py-3 px-4 font-medium">Hours</th>
                            <th className="text-left py-3 px-4 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((record) => (
                            <tr
                              key={record._id}
                              className="border-b hover:bg-muted/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">
                                    {record.user?.name || "Unknown"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {record.user?.email}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">{formatDate(record.date)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  {formatTime(record.clockInTime)}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {record.clockOutTime ? (
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    {formatTime(record.clockOutTime)}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Not clocked out
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-medium">
                                {record.hoursWorked
                                  ? `${record.hoursWorked.toFixed(2)}h`
                                  : "-"}
                              </td>
                              <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No attendance records found for the selected filters
                      </p>
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

export default AdminAttendancePage;