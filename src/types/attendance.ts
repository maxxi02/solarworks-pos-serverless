// types/attendance.ts - UPDATED with shift support

export type AttendanceStatus = "pending" | "confirmed" | "rejected";
export type Shift = "morning" | "afternoon";

export interface Attendance {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  shift?: Shift; // NEW: morning (12AM-11:59AM) or afternoon (12PM-11:59PM)
  clockInTime: Date;
  clockOutTime?: Date;
  hoursWorked?: number;
  status: AttendanceStatus;
  adminNote?: string;
  confirmedBy?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceWithUser extends Attendance {
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export interface ClockInResponse {
  success: boolean;
  attendance?: Attendance;
  message?: string;
  alreadyClockedIn?: boolean;
  currentShift?: Shift;
}

export interface ClockOutResponse {
  success: boolean;
  attendance?: Attendance;
  message?: string;
  hoursWorked?: number;
}

export interface AttendanceStats {
  totalHours: number;
  daysPresent: number;
  pendingApprovals: number;
  confirmedDays: number;
  shiftsWorked: number; // NEW: Total number of shifts worked
}

// Helper function to get current shift
export function getCurrentShift(): Shift {
  const now = new Date();
  const hours = now.getHours();
  // Morning shift: 12:00 AM - 11:59 AM (0-11)
  // Afternoon shift: 12:00 PM - 11:59 PM (12-23)
  return hours < 12 ? "morning" : "afternoon";
}

// Helper function to get shift label
export function getShiftLabel(shift?: Shift): string {
  if (!shift) return "";
  return shift === "morning" ? "Morning Shift" : "Afternoon Shift";
}

// Helper function to get shift time range
export function getShiftTimeRange(shift?: Shift): string {
  if (!shift) return "";
  return shift === "morning" ? "12:00 AM - 11:59 AM" : "12:00 PM - 11:59 PM";
}
