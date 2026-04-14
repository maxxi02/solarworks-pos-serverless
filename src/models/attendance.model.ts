// lib/models/attendance.model.ts

import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import type { Attendance, AttendanceStatus } from "@/types/attendance";
import { computeOvertimeHours, DAILY_QUOTA_HOURS } from "@/lib/overtime";

const COLLECTION_NAME = "attendance";
const TEMP_COLLECTION_NAME = "attendance_temp";
const REJECTED_COLLECTION_NAME = "attendance_rejected";

// Helper: Manila date string (UTC+8)
function getManilaDateString(): string {
  const now = new Date();
  const manilaDate = new Date(now.getTime() + 8 * 3600 * 1000);
  return manilaDate.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Helper: label-only shift for reporting (NOT used as a gate)
function getCurrentShiftLabel(): "morning" | "afternoon" {
  const now = new Date();
  const manilaDate = new Date(now.getTime() + 8 * 3600 * 1000);
  const hours = manilaDate.getUTCHours();
  return hours < 12 ? "morning" : "afternoon";
}

export class AttendanceModel {
  private static getCollection() {
    return MONGODB.collection(COLLECTION_NAME);
  }

  private static getTempCollection() {
    return MONGODB.collection(TEMP_COLLECTION_NAME);
  }

  private static getRejectedCollection() {
    return MONGODB.collection(REJECTED_COLLECTION_NAME);
  }

  /**
   * Clock in a staff member.
   *
   * IMPORTANT: We check for ANY active (not clocked-out) shift today,
   * regardless of shift label. This prevents the "noon/midnight trick" where
   * shifting from morning→afternoon used to make the system think no active
   * shift existed, causing a second clock-in to be created.
   */
  static async clockIn(userId: string): Promise<Attendance | null> {
    const today = getManilaDateString();
    const shiftLabel = getCurrentShiftLabel(); // for metadata only
    const tempCollection = this.getTempCollection();
    const collection = this.getCollection();

    // Block if ANY unclosed shift exists today (whole-day scope, not shift-scoped)
    const activeTemp = await tempCollection.findOne({
      userId,
      date: today,
      clockOutTime: { $exists: false }, // still active
    });

    const activeConfirmed = await collection.findOne({
      userId,
      date: today,
      clockOutTime: { $exists: false },
    });

    if (activeTemp || activeConfirmed) {
      return null; // Already has an active shift — block the new clock-in
    }

    const now = new Date();
    const attendance: Omit<Attendance, "_id"> & { shift?: string } = {
      userId,
      date: today,
      shift: shiftLabel, // purely for admin reporting; not used as a gate
      clockInTime: now,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const result = await tempCollection.insertOne(attendance);

    return {
      ...attendance,
      _id: result.insertedId.toString(),
    } as Attendance;
  }

  /**
   * Clock out a staff member.
   *
   * Finds the most recent unclosed shift for today (whole-day scope) in either
   * the temp or confirmed collection. No longer filters by shift label so clock-
   * outs work correctly regardless of what time of day it is.
   */
  static async clockOut(userId: string): Promise<Attendance | null> {
    const today = getManilaDateString();
    const tempCollection = this.getTempCollection();
    const collection = this.getCollection();

    // Find active (unclosed) shift in temp collection first
    let attendance = await tempCollection.findOne({
      userId,
      date: today,
      clockOutTime: { $exists: false },
    });

    let isInTempCollection = true;

    // If not in temp, check confirmed collection
    if (!attendance) {
      attendance = await collection.findOne({
        userId,
        date: today,
        clockOutTime: { $exists: false },
      });
      isInTempCollection = false;
    }

    // Not found in either collection or already clocked out
    if (!attendance || attendance.clockOutTime) {
      return null;
    }

    const clockOutTime = new Date();
    const hoursWorked =
      (clockOutTime.getTime() - new Date(attendance.clockInTime).getTime()) /
      (1000 * 60 * 60);

    const updateData = {
      $set: {
        clockOutTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        updatedAt: new Date(),
      },
    };

    // Update in the appropriate collection
    if (isInTempCollection) {
      await tempCollection.updateOne({ _id: attendance._id }, updateData);
      const updated = await tempCollection.findOne({ _id: attendance._id });

      if (!updated) return null;

      return {
        ...updated,
        _id: updated._id.toString(),
      } as Attendance;
    } else {
      await collection.updateOne({ _id: attendance._id }, updateData);
      const updated = await collection.findOne({ _id: attendance._id });

      if (!updated) return null;

      return {
        ...updated,
        _id: updated._id.toString(),
      } as Attendance;
    }
  }

  /**
   * Get today's active attendance for a user (whole-day scope).
   *
   * Returns the most recent unclosed shift. If no unclosed shift exists but a
   * clocked-out shift does, returns that so the status API can correctly report
   * isClockedIn=false. Returns null only if no record at all exists today.
   */
  static async getTodayAttendance(userId: string): Promise<Attendance | null> {
    const today = getManilaDateString();
    const tempCollection = this.getTempCollection();
    const collection = this.getCollection();

    // Priority 1: unclosed shift in temp collection
    let attendance = await tempCollection.findOne(
      { userId, date: today, clockOutTime: { $exists: false } },
    );

    // Priority 2: unclosed shift in confirmed collection
    if (!attendance) {
      attendance = await collection.findOne(
        { userId, date: today, clockOutTime: { $exists: false } },
      );
    }

    // Priority 3: most recent record of any kind today (already clocked out)
    if (!attendance) {
      attendance = await tempCollection.findOne(
        { userId, date: today },
        { sort: { clockInTime: -1 } },
      );
    }
    if (!attendance) {
      attendance = await collection.findOne(
        { userId, date: today },
        { sort: { clockInTime: -1 } },
      );
    }

    if (!attendance) return null;

    return {
      ...attendance,
      _id: attendance._id.toString(),
    } as Attendance;
  }

  // Get all attendance records for today (both shifts)
  static async getAllTodayAttendance(userId: string): Promise<Attendance[]> {
    const today = getManilaDateString();
    const tempCollection = this.getTempCollection();
    const collection = this.getCollection();

    const tempRecords = await tempCollection
      .find({ userId, date: today })
      .toArray();

    const confirmedRecords = await collection
      .find({ userId, date: today })
      .toArray();

    const allRecords = [...tempRecords, ...confirmedRecords];

    return allRecords.map((record) => ({
      ...record,
      _id: record._id.toString(),
    })) as Attendance[];
  }

  // Get all pending attendance records from temp collection (for admin)
  static async getPendingAttendance(): Promise<Attendance[]> {
    const tempCollection = this.getTempCollection();
    const records = await tempCollection
      .find({ status: "pending" })
      .sort({ clockInTime: -1 })
      .toArray();

    return records.map((record) => ({
      ...record,
      _id: record._id.toString(),
    })) as Attendance[];
  }

  // Get attendance records for a specific date (confirmed only)
  static async getAttendanceByDate(date: string): Promise<Attendance[]> {
    const collection = this.getCollection();
    const records = await collection
      .find({ date })
      .sort({ shift: 1, clockInTime: -1 }) // Sort by shift then time
      .toArray();

    return records.map((record) => ({
      ...record,
      _id: record._id.toString(),
    })) as Attendance[];
  }

  // Confirm attendance - moves from temp to permanent collection
  static async confirmAttendance(
    attendanceId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<Attendance | null> {
    const tempCollection = this.getTempCollection();
    const collection = this.getCollection();

    const tempRecord = await tempCollection.findOne({
      _id: new ObjectId(attendanceId),
    });

    if (!tempRecord) return null;

    // Create confirmed record
    const confirmedRecord = {
      ...tempRecord,
      status: "confirmed" as AttendanceStatus,
      confirmedBy: adminUserId,
      confirmedAt: new Date(),
      adminNote,
      updatedAt: new Date(),
    };

    delete (confirmedRecord as { _id?: ObjectId })._id;

    // Insert into permanent collection
    const result = await collection.insertOne(confirmedRecord);

    // Delete from temp collection
    await tempCollection.deleteOne({ _id: new ObjectId(attendanceId) });

    return {
      ...confirmedRecord,
      _id: result.insertedId.toString(),
    } as Attendance;
  }

  // Reject attendance - saves to rejected collection for audit trail
  static async rejectAttendance(
    attendanceId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<boolean> {
    const tempCollection = this.getTempCollection();
    const rejectedCollection = this.getRejectedCollection();

    const tempRecord = await tempCollection.findOne({
      _id: new ObjectId(attendanceId),
    });

    if (!tempRecord) return false;

    // Save to rejected collection for audit trail
    const rejectedRecord = {
      ...tempRecord,
      status: "rejected" as AttendanceStatus,
      rejectedBy: adminUserId,
      rejectedAt: new Date(),
      adminNote,
      updatedAt: new Date(),
    };

    delete (rejectedRecord as { _id?: ObjectId })._id;

    await rejectedCollection.insertOne(rejectedRecord);
    const result = await tempCollection.deleteOne({
      _id: new ObjectId(attendanceId),
    });

    return result.deletedCount > 0;
  }

  // Get user's attendance stats for current month (confirmed only)
  static async getUserMonthlyStats(userId: string): Promise<{
    totalHours: number;
    daysPresent: number;
    pendingApprovals: number;
    confirmedDays: number;
    shiftsWorked: number;
  }> {
    const collection = this.getCollection();
    const tempCollection = this.getTempCollection();

    const manilaDate = new Date(Date.now() + 8 * 3600 * 1000);
    const year = manilaDate.getUTCFullYear();
    const month = manilaDate.getUTCMonth();
    
    const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get confirmed records
    const confirmedRecords = await collection
      .find({
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      })
      .toArray();

    // Get pending records
    const pendingRecords = await tempCollection
      .find({
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      })
      .toArray();

    const totalHours = confirmedRecords.reduce(
      (sum, r) => sum + (r.hoursWorked || 0),
      0,
    );

    // Count unique dates for days present
    const uniqueDates = new Set(confirmedRecords.map((r) => r.date));
    const daysPresent = uniqueDates.size;

    const pendingApprovals = pendingRecords.length;
    const confirmedDays = confirmedRecords.filter(
      (r) => r.status === "confirmed",
    ).length;
    const shiftsWorked = confirmedRecords.length; // Total number of shifts

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      daysPresent,
      pendingApprovals,
      confirmedDays,
      shiftsWorked,
    };
  }

  // Get user's attendance history (both confirmed and pending)
  static async getUserAttendanceHistory(
    userId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 30,
  ): Promise<Attendance[]> {
    const collection = this.getCollection();
    const tempCollection = this.getTempCollection();

    const query: Record<string, unknown> = { userId };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Get confirmed records
    const confirmedRecords = await collection
      .find(query)
      .sort({ date: -1, shift: -1 })
      .limit(limit)
      .toArray();

    // Get pending records
    const pendingRecords = await tempCollection
      .find(query)
      .sort({ date: -1, shift: -1 })
      .toArray();

    // Combine and sort by date and shift
    const allRecords = [...confirmedRecords, ...pendingRecords];
    allRecords.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // If same date, afternoon shift comes before morning
      return (b.shift || "").localeCompare(a.shift || "");
    });

    return allRecords.slice(0, limit).map((record) => ({
      ...record,
      _id: record._id.toString(),
    })) as Attendance[];
  }

  // Get rejected attendance records (for admin audit trail)
  static async getRejectedAttendance(
    userId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]> {
    const rejectedCollection = this.getRejectedCollection();

    const query: Record<string, unknown> = { status: "rejected" };

    if (userId) {
      query.userId = userId;
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const records = await rejectedCollection
      .find(query)
      .sort({ rejectedAt: -1 })
      .toArray();

    return records.map((record) => ({
      ...record,
      _id: record._id.toString(),
    })) as Attendance[];
  }
}

/**
 * Calculate daily earnings for a single confirmed attendance record.
 *
 * OT rules (from @/lib/overtime):
 *  - Regular hours capped at DAILY_QUOTA_HOURS (9h)
 *  - OT = whole hours beyond the 10h threshold (9h quota + 1h buffer)
 *  - 10h 59m → 0 OT; 11h → 1 OT; 12h → 2 OT
 */
export function calculateDailyEarnings(
  record: Attendance,
  hourlyRate: number = 56.25,
): {
  total: number;
  regular: number;
  overtime: number;
  otHours: number;
} {
  if (record.status !== "confirmed") {
    return { total: 0, regular: 0, overtime: 0, otHours: 0 };
  }

  const hours = record.hoursWorked ?? 0;
  if (hours <= 0) {
    return { total: 0, regular: 0, overtime: 0, otHours: 0 };
  }

  // Regular hours capped at the 9-hour daily quota
  const regularHours = Math.min(DAILY_QUOTA_HOURS, hours);
  // OT = whole hours beyond 10h threshold (floor-based)
  const otHours = computeOvertimeHours(hours);

  const regular = regularHours * hourlyRate;
  const overtime = otHours * hourlyRate * 1.25;

  return {
    total: Math.round((regular + overtime) * 100) / 100,
    regular: Math.round(regular * 100) / 100,
    overtime: Math.round(overtime * 100) / 100,
    otHours,
  };
}
