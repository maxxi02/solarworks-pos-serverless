/**
 * Possible attendance record statuses
 */
export type AttendanceStatus = "pending" | "confirmed" | "rejected";

/**
 * Shift classification (based on clock-in time)
 */
export type Shift = "morning" | "afternoon";

/**
 * Base shape of an attendance record (as stored in DB / returned from API)
 */
export interface Attendance {
  _id: string; // always string on client
  userId: string; // always string on client
  date: string; // YYYY-MM-DD
  shift?: Shift; // morning (00:00–11:59) / afternoon (12:00–23:59)
  clockInTime: string | Date; // ISO string preferred, Date accepted
  clockOutTime?: string | Date;
  hoursWorked?: number; // decimal hours (e.g. 7.83)
  status: AttendanceStatus;
  adminNote?: string | null;
  confirmedBy?: string; // admin/manager userId
  confirmedAt?: string | Date;
  rejectedBy?: string; // added for completeness
  rejectedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface StaffEarnings {
  staffId: string;
  name: string;
  email: string;
  totalEarnings: number;
  regularEarnings: number;
  overtimeEarnings: number;
  totalHours: number;
  daysPresent: number;
  recordCount: number;
}

/**
 * Attendance record enriched with basic user information
 * (most commonly used shape in admin UI and staff views)
 */
export interface AttendanceWithUser extends Attendance {
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    phoneNumber?: string;
    salaryPerHour?: number;
    // Add more fields from your User model if you display them
  };
}

/**
 * Shape returned from clock-in endpoint
 */
export interface ClockInResponse {
  success: boolean;
  attendance?: Attendance;
  message?: string;
  alreadyClockedIn?: boolean;
  currentShift?: Shift;
  reason?: string; // e.g. "Already clocked in for this shift"
}

/**
 * Shape returned from clock-out endpoint
 */
export interface ClockOutResponse {
  success: boolean;
  attendance?: Attendance;
  message?: string;
  hoursWorked?: number;
  earlyLeave?: boolean;
}

/**
 * Monthly / period stats for a user (used in staff dashboard or reports)
 */
export interface AttendanceStats {
  totalHours: number;
  daysPresent: number;
  pendingApprovals: number;
  confirmedDays: number;
  shiftsWorked: number;
  averageHoursPerShift?: number;
  totalShiftsPossible?: number; // optional – e.g. days in period
  rejectionCount?: number; // optional – track rejections
  // ── Payroll stats (added) ────────────────────────
  totalEarnings: number;
  regularEarnings: number;
  overtimeEarnings: number;
  averageDailyEarnings: number;
}

/**
 * Minimal shape used in admin dropdowns / filters
 */
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

/**
 * Shape of stats returned from /api/attendance/admin/dashboard
 */
export interface DashboardStats {
  totalRecords: number;
  totalHours: number;
  uniqueStaff: number;
  averageHours: number;
  pendingCount?: number; // optional – can be added
  mostActiveStaff?: {
    id: string;
    name: string;
    hours: number;
  };
  // ── Payroll stats (added) ────────────────────────
  totalEarnings: number;
  regularEarnings: number;
  overtimeEarnings: number;
  averageDailyEarnings: number;
}

/**
 * Helper: Determine current shift based on local time
 */
export function getCurrentShift(): Shift {
  const hours = new Date().getHours();
  return hours < 12 ? "morning" : "afternoon";
}

/**
 * Human-readable shift name
 */
export function getShiftLabel(shift?: Shift): string {
  if (!shift) return "—";
  return shift === "morning" ? "Morning Shift" : "Afternoon Shift";
}

/**
 * Shift time range description
 */
export function getShiftTimeRange(shift?: Shift): string {
  if (!shift) return "—";
  return shift === "morning" ? "12:00 AM – 11:59 AM" : "12:00 PM – 11:59 PM";
}

/**
 * Format shift + date into readable string
 * e.g. "Morning Shift – Feb 14, 2026"
 */
export function formatShiftDate(
  attendance: Pick<Attendance, "date" | "shift">,
): string {
  const dateStr = new Date(attendance.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${getShiftLabel(attendance.shift)} – ${dateStr}`;
}

export interface UserBasicInfo {
  id: string;
  name: string;
  email: string;
  role?: string;
  salaryPerHour?: number; // ← added here too
}

export interface EnrichedAttendance extends Attendance {
  _id: string;
  user?: UserBasicInfo;
  // ── Payroll fields (added) ───────────────────────
  dailyEarnings?: number;       // total for this record
  regularEarnings?: number;
  overtimeEarnings?: number;
  overtimeHours?: number;
}

export type AttendanceRecord = Attendance;
