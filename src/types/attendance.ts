// types/attendance.ts

export type AttendanceStatus = "pending" | "confirmed" | "rejected";

export interface Attendance {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
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
  user: {
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
}
