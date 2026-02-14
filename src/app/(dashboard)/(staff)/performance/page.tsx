"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  CalendarDays, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer
} from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Attendance, AttendanceStats } from "@/types/attendance";

interface AttendanceHistoryItem extends Attendance {
  formattedDate?: string;
  formattedClockIn?: string;
  formattedClockOut?: string;
}

const MyPerformancePage = () => {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<AttendanceStats | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch today's status
      const statusRes = await fetch("/api/attendance/status");
      const statusData = await statusRes.json();
      if (statusData.success) {
        setTodayAttendance(statusData.attendance);
      }

      // Fetch monthly stats
      const statsRes = await fetch("/api/attendance/stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setMonthlyStats(statsData.stats);
      }

      // Fetch attendance history (last 30 days)
      const historyRes = await fetch("/api/attendance/history?limit=30");
      const historyData = await historyRes.json();
      if (historyData.success) {
        const formatted = historyData.history.map((item: Attendance) => ({
          ...item,
          formattedDate: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          formattedClockIn: new Date(item.clockInTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          formattedClockOut: item.clockOutTime
            ? new Date(item.clockOutTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Not clocked out",
        }));
        setAttendanceHistory(formatted);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get chart data for last 7 days
  const getChartData = () => {
    const last7Days = attendanceHistory.slice(0, 7).reverse();
    return last7Days.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours: item.hoursWorked || 0,
    }));
  };

  // Get dates with attendance for calendar
  const getAttendanceDates = () => {
    return attendanceHistory
      .filter((item) => item.status === "confirmed")
      .map((item) => new Date(item.date));
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
        <h1 className="text-3xl font-bold tracking-tight">My Performance</h1>
        <p className="text-muted-foreground mt-1">
          Track your attendance, hours worked, and performance metrics
        </p>
      </div>

      {/* Today's Status Alert */}
      {todayAttendance && !todayAttendance.clockOutTime && (
        <Alert>
          <Timer className="h-4 w-4" />
          <AlertDescription>
            You're currently clocked in since{" "}
            {new Date(todayAttendance.clockInTime).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Don't forget to clock out when you leave!
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Hours This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyStats?.totalHours.toFixed(1) || 0}h
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        {/* Days Present */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Present</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats?.daysPresent || 0}</div>
            <p className="text-xs text-muted-foreground">Confirmed days</p>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyStats?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        {/* Average Hours per Day */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyStats?.daysPresent && monthlyStats.daysPresent > 0
                ? (monthlyStats.totalHours / monthlyStats.daysPresent).toFixed(1)
                : 0}
              h
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Calendar Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours Worked Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hours Worked (Last 7 Days)</CardTitle>
            <CardDescription>Your daily work hours over the past week</CardDescription>
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
                No data available for the past 7 days
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>
              Days you've been present this month (highlighted in blue)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                attended: getAttendanceDates(),
              }}
              modifiersStyles={{
                attended: {
                  backgroundColor: "#3b82f6",
                  color: "white",
                  borderRadius: "0.375rem",
                },
              }}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>
      </div>

      {/* TODO: Sales Performance Section - Coming Soon */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sales Performance
          </CardTitle>
          <CardDescription>Track your sales metrics and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">🚧 Coming Soon!</p>
            <p className="text-xs mt-2">
              Sales tracking and performance metrics will be available here
            </p>
          </div>
          {/* TODO: Integrate sales data when sales module is complete */}
          {/* TODO: Display metrics like total sales, conversion rate, top products */}
          {/* TODO: Add sales chart showing trends over time */}
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance History</CardTitle>
          <CardDescription>Your clock in/out records for the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Clock In</th>
                    <th className="text-left py-3 px-4 font-medium">Clock Out</th>
                    <th className="text-left py-3 px-4 font-medium">Hours</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record) => (
                    <tr key={record._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{record.formattedDate}</td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {record.formattedClockIn}
                      </td>
                      <td className="py-3 px-4">
                        {record.clockOutTime ? (
                          <span className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            {record.formattedClockOut}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Not clocked out</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {record.hoursWorked ? `${record.hoursWorked.toFixed(2)}h` : "-"}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPerformancePage;