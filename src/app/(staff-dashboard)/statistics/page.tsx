'use client';

import * as React from "react";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, Users, Download, DollarSign, TrendingUp, Package, Coffee } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

// Types
interface Staff {
  id: string;
  name: string;
  position: string;
  department: string;
  hourlyRate: number;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  date: Date;
  timeIn: string;
  timeOut: string;
  hoursWorked: number;
  earnings: number;
}

interface EarningsSummary {
  totalEarnings: number;
  averageDailyEarnings: number;
  topEarner: { name: string; amount: number };
  totalHoursWorked: number;
}

interface SalesData {
  date: Date;
  foodSales: number;
  drinkSales: number;
  totalSales: number;
}

export default function StatisticsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"attendance" | "earnings" | "sales">("attendance");
  
  // Staff data with hourly rates
  const staffList: Staff[] = [
    { id: "1", name: "Juan Dela Cruz", position: "Cashier", department: "Front Desk", hourlyRate: 80 },
    { id: "2", name: "Maria Santos", position: "Waitress", department: "Food Service", hourlyRate: 75 },
    { id: "3", name: "Pedro Reyes", position: "Cook", department: "Kitchen", hourlyRate: 100 },
    { id: "4", name: "Ana Torres", position: "Manager", department: "Management", hourlyRate: 150 },
    { id: "5", name: "Luis Gomez", position: "Bartender", department: "Bar", hourlyRate: 85 },
    { id: "6", name: "Sofia Lim", position: "Host", department: "Front Desk", hourlyRate: 70 },
  ];
  
  // Attendance and earnings records
  const attendanceRecords: AttendanceRecord[] = [
    { id: "1", staffId: "1", date: new Date(2024, 0, 15), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 640 },
    { id: "2", staffId: "2", date: new Date(2024, 0, 15), timeIn: "08:30", timeOut: "17:00", hoursWorked: 7.5, earnings: 562.5 },
    { id: "3", staffId: "3", date: new Date(2024, 0, 15), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 800 },
    { id: "4", staffId: "4", date: new Date(2024, 0, 15), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 1200 },
    { id: "5", staffId: "5", date: new Date(2024, 0, 15), timeIn: "09:00", timeOut: "18:00", hoursWorked: 8, earnings: 680 },
    { id: "6", staffId: "6", date: new Date(2024, 0, 15), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 560 },
    { id: "7", staffId: "1", date: new Date(), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 640 },
    { id: "8", staffId: "2", date: new Date(), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 600 },
    { id: "9", staffId: "3", date: new Date(), timeIn: "08:00", timeOut: "16:00", hoursWorked: 7, earnings: 700 },
    { id: "10", staffId: "4", date: new Date(), timeIn: "08:00", timeOut: "18:00", hoursWorked: 9, earnings: 1350 },
    { id: "11", staffId: "5", date: new Date(), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 680 },
    { id: "12", staffId: "6", date: new Date(), timeIn: "08:00", timeOut: "17:00", hoursWorked: 8, earnings: 560 },
  ];

  // Sales data
  const salesData: SalesData[] = [
    { date: new Date(2024, 0, 1), foodSales: 12500, drinkSales: 8500, totalSales: 21000 },
    { date: new Date(2024, 0, 2), foodSales: 14200, drinkSales: 9200, totalSales: 23400 },
    { date: new Date(2024, 0, 3), foodSales: 11800, drinkSales: 7800, totalSales: 19600 },
    { date: new Date(2024, 0, 4), foodSales: 15600, drinkSales: 10500, totalSales: 26100 },
    { date: new Date(2024, 0, 5), foodSales: 13200, drinkSales: 8800, totalSales: 22000 },
    { date: new Date(), foodSales: 14800, drinkSales: 9600, totalSales: 24400 },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Calculate earnings summary
  const calculateEarningsSummary = (): EarningsSummary => {
    const today = selectedDate || new Date();
    const todayRecords = attendanceRecords.filter(record => isSameDay(record.date, today));
    
    const totalEarnings = todayRecords.reduce((sum, record) => sum + record.earnings, 0);
    const totalHoursWorked = todayRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
    
    // Find top earner for today
    const staffEarningsMap: Record<string, number> = {};
    todayRecords.forEach(record => {
      staffEarningsMap[record.staffId] = (staffEarningsMap[record.staffId] || 0) + record.earnings;
    });
    
    let topEarnerId = "";
    let topEarnerAmount = 0;
    Object.entries(staffEarningsMap).forEach(([staffId, amount]) => {
      if (amount > topEarnerAmount) {
        topEarnerId = staffId;
        topEarnerAmount = amount;
      }
    });
    
    const topEarnerStaff = staffList.find(staff => staff.id === topEarnerId);
    
    return {
      totalEarnings,
      averageDailyEarnings: totalEarnings / (todayRecords.length || 1),
      topEarner: {
        name: topEarnerStaff?.name || "No data",
        amount: topEarnerAmount
      },
      totalHoursWorked
    };
  };

  const getMonthlyEarningsSummary = () => {
    const startDate = startOfMonth(selectedMonth);
    const endDate = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
    
    const monthlyStats = daysInMonth.map(day => {
      const dayRecords = attendanceRecords.filter(record => isSameDay(record.date, day));
      const dayEarnings = dayRecords.reduce((sum, record) => sum + record.earnings, 0);
      const dayHours = dayRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
      
      const daySales = salesData.find(sale => isSameDay(sale.date, day));
      
      return {
        date: day,
        earnings: dayEarnings,
        hoursWorked: dayHours,
        staffCount: dayRecords.length,
        foodSales: daySales?.foodSales || 0,
        drinkSales: daySales?.drinkSales || 0,
        totalSales: daySales?.totalSales || 0,
      };
    });

    return monthlyStats;
  };

  const getStaffEarningsForDate = (staffId: string, date: Date) => {
    return attendanceRecords.find(record => 
      record.staffId === staffId && isSameDay(record.date, date)
    );
  };

  const getStaffMonthlyEarnings = (staffId: string) => {
    const monthlyRecords = attendanceRecords.filter(
      record => 
        record.staffId === staffId && 
        record.date.getMonth() === selectedMonth.getMonth() &&
        record.date.getFullYear() === selectedMonth.getFullYear()
    );
    
    const totalEarnings = monthlyRecords.reduce((sum, record) => sum + record.earnings, 0);
    const totalHours = monthlyRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
    const daysWorked = monthlyRecords.length;
    
    return { totalEarnings, totalHours, daysWorked };
  };

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          staff.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === "all" || staff.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const departments = Array.from(new Set(staffList.map(staff => staff.department)));

  const earningsSummary = calculateEarningsSummary();
  const monthlySummary = getMonthlyEarningsSummary();

  const handleExport = () => {
    alert("Export feature would be implemented here");
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Business Statistics</h1>
            <p className="text-muted-foreground">Track attendance, earnings, and sales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="department-filter">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <div className="border rounded-md p-3">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "attendance" | "earnings" | "sales")} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "attendance" ? (
          <>
            {/* Attendance Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Total Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{staffList.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                    Daily Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₱{earningsSummary.totalEarnings.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                    Total Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earningsSummary.totalHoursWorked}h</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Top Earner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">{earningsSummary.topEarner.name}</div>
                  <div className="text-sm text-muted-foreground">₱{earningsSummary.topEarner.amount.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Attendance & Earnings</CardTitle>
                    <CardDescription>
                      {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                    </CardDescription>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Time In</TableHead>
                          <TableHead>Time Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Earnings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStaff.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              No staff found matching your criteria
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStaff.map((staff) => {
                            const attendance = getStaffEarningsForDate(staff.id, selectedDate || new Date());
                            return (
                              <TableRow key={staff.id}>
                                <TableCell className="font-medium">{staff.name}</TableCell>
                                <TableCell>{staff.position}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{staff.department}</Badge>
                                </TableCell>
                                <TableCell>{attendance?.timeIn || "-"}</TableCell>
                                <TableCell>{attendance?.timeOut || "-"}</TableCell>
                                <TableCell>{attendance?.hoursWorked || 0}h</TableCell>
                                <TableCell className="font-medium">
                                  {attendance ? `₱${attendance.earnings.toLocaleString()}` : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                    <CardDescription>View statistics for specific date</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-lg border w-full"
                      captionLayout="dropdown"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : viewMode === "earnings" ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Monthly Earnings Overview</CardTitle>
                    <CardDescription>
                      {format(selectedMonth, "MMMM yyyy")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center font-medium py-2">
                      {day}
                    </div>
                  ))}
                  {monthlySummary.map((day) => {
                    const dayNumber = format(day.date, 'd');
                    const isToday = isSameDay(day.date, new Date());
                    
                    return (
                      <div
                        key={day.date.toString()}
                        className={`min-h-24 p-2 border rounded-lg ${
                          isToday ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                            {dayNumber}
                          </span>
                          {day.earnings > 0 && (
                            <span className="text-xs font-medium text-green-600">
                              ₱{(day.earnings/1000).toFixed(0)}k
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs">
                          {day.earnings > 0 && (
                            <div className="text-green-600 font-medium">₱{day.earnings.toLocaleString()}</div>
                          )}
                          {day.hoursWorked > 0 && (
                            <div className="text-gray-600">{day.hoursWorked}h worked</div>
                          )}
                          {day.staffCount > 0 && (
                            <div className="text-blue-600">{day.staffCount} staff</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Staff Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead className="text-center">Days Worked</TableHead>
                      <TableHead className="text-center">Total Hours</TableHead>
                      <TableHead className="text-center">Total Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map((staff) => {
                      const monthlyData = getStaffMonthlyEarnings(staff.id);
                      
                      return (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell>{staff.position}</TableCell>
                          <TableCell>₱{staff.hourlyRate}/h</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{monthlyData.daysWorked}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {monthlyData.totalHours}h
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            <Badge variant="default" className="bg-green-600">
                              ₱{monthlyData.totalEarnings.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Statistics</CardTitle>
                <CardDescription>Daily sales performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Food Sales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₱{
                        salesData.find(sale => isSameDay(sale.date, selectedDate || new Date()))?.foodSales.toLocaleString() || "0"
                      }</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Coffee className="h-4 w-4 mr-2" />
                        Drink Sales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₱{
                        salesData.find(sale => isSameDay(sale.date, selectedDate || new Date()))?.drinkSales.toLocaleString() || "0"
                      }</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Total Sales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₱{
                        salesData.find(sale => isSameDay(sale.date, selectedDate || new Date()))?.totalSales.toLocaleString() || "0"
                      }</div>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Food Sales</TableHead>
                      <TableHead className="text-right">Drink Sales</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.slice().reverse().map((sale) => (
                      <TableRow key={sale.date.toString()}>
                        <TableCell className="font-medium">
                          {format(sale.date, "MMM d, yyyy")}
                          {isSameDay(sale.date, new Date()) && (
                            <Badge className="ml-2">Today</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{sale.foodSales.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{sale.drinkSales.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₱{sale.totalSales.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}