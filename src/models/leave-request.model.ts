import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  _id: string;
  userId: string;
  userName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = "leave_requests";

export class LeaveRequestModel {
  private static getCollection() {
    return MONGODB.collection(COLLECTION_NAME);
  }

  static async submit(
    userId: string,
    userName: string,
    startDate: string,
    endDate: string,
    reason: string
  ): Promise<LeaveRequest> {
    const now = new Date();
    const doc = {
      userId,
      userName,
      startDate,
      endDate,
      reason,
      status: "pending" as LeaveStatus,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.getCollection().insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() };
  }

  static async getById(leaveId: string): Promise<LeaveRequest | null> {
    const record = await this.getCollection().findOne({ _id: new ObjectId(leaveId) });
    if (!record) return null;
    return { ...record, _id: record._id.toString() } as LeaveRequest;
  }

  static async getByUser(userId: string): Promise<LeaveRequest[]> {
    const records = await this.getCollection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return records.map((r) => ({ ...r, _id: r._id.toString() })) as LeaveRequest[];
  }

  static async getAll(): Promise<LeaveRequest[]> {
    const records = await this.getCollection()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return records.map((r) => ({ ...r, _id: r._id.toString() })) as LeaveRequest[];
  }

  static async review(
    leaveId: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    reviewNote?: string
  ): Promise<boolean> {
    const result = await this.getCollection().updateOne(
      { _id: new ObjectId(leaveId) },
      {
        $set: {
          status,
          reviewedBy,
          reviewNote: reviewNote || "",
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }
}
