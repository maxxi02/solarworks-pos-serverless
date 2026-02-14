// lib/models/attendance.model.ts

import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";
import type { Attendance, AttendanceStatus } from "@/types/attendance";

const COLLECTION_NAME = "attendance";
const TEMP_COLLECTION_NAME = "attendance_temp"; // For unconfirmed records
const REJECTED_COLLECTION_NAME = "attendance_rejected"; // For audit trail

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

  // Clock in a staff member (saves to temp collection)
  static async clockIn(userId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const tempCollection = this.getTempCollection();

    // Check if already clocked in today (in temp or confirmed)
    const existingTemp = await tempCollection.findOne({
      userId,
      date: today,
    });

    const collection = this.getCollection();
    const existingConfirmed = await collection.findOne({
      userId,
      date: today,
    });

    if (existingTemp || existingConfirmed) {
      return null; // Already clocked in
    }

    const now = new Date();
    const attendance: Omit<Attendance, "_id"> = {
      userId,
      date: today,
      clockInTime: now,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const result = await tempCollection.insertOne(attendance);

    return {
      ...attendance,
      _id: result.insertedId.toString(),
    };
  }

  // Clock out a staff member (updates record in either temp or confirmed collection)
  static async clockOut(userId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split("T")[0];
    const tempCollection = this.getTempCollection();
    const collection = this.getCollection();

    // First check temp collection
    let attendance = await tempCollection.findOne({
      userId,
      date: today,
    });

    let isInTempCollection = true;

    // If not in temp, check confirmed collection
    if (!attendance) {
      attendance = await collection.findOne({
        userId,
        date: today,
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

  // Get today's attendance for a user (check both temp and confirmed)
  static async getTodayAttendance(userId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split("T")[0];

    // First check temp collection
    const tempCollection = this.getTempCollection();
    let attendance = await tempCollection.findOne({
      userId,
      date: today,
    });

    // If not in temp, check confirmed collection
    if (!attendance) {
      const collection = this.getCollection();
      attendance = await collection.findOne({
        userId,
        date: today,
      });
    }

    if (!attendance) return null;

    return {
      ...attendance,
      _id: attendance._id.toString(),
    } as Attendance;
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
      .sort({ clockInTime: -1 })
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

    delete (confirmedRecord as { _id?: ObjectId })._id; // Remove _id for insert

    // Insert into permanent collection
    const result = await collection.insertOne(confirmedRecord);

    // Delete from temp collection
    await tempCollection.deleteOne({ _id: new ObjectId(attendanceId) });

    return {
      ...confirmedRecord,
      _id: result.insertedId.toString(),
    } as Attendance;
  }

  // Reject attendance - saves to rejected collection for audit trail, then deletes from temp
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

    delete (rejectedRecord as { _id?: ObjectId })._id; // Remove _id for insert

    // Insert into rejected collection (for audit)
    await rejectedCollection.insertOne(rejectedRecord);

    // Delete from temp collection
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
  }> {
    const collection = this.getCollection();
    const tempCollection = this.getTempCollection();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

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
    const daysPresent = confirmedRecords.length;
    const pendingApprovals = pendingRecords.length;
    const confirmedDays = confirmedRecords.filter(
      (r) => r.status === "confirmed",
    ).length;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      daysPresent,
      pendingApprovals,
      confirmedDays,
    };
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
