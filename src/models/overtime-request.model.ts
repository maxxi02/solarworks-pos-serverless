import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export type OvertimeStatus = "pending" | "approved" | "rejected";

export interface OvertimeRequest {
  _id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  requestedHours: number; // e.g. 2.5
  reason: string;
  status: OvertimeStatus;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = "overtime_requests";

export class OvertimeRequestModel {
  private static getCollection() {
    return MONGODB.collection(COLLECTION_NAME);
  }

  static async submit(
    userId: string,
    userName: string,
    date: string,
    requestedHours: number,
    reason: string
  ): Promise<OvertimeRequest> {
    const now = new Date();
    const doc = {
      userId,
      userName,
      date,
      requestedHours,
      reason,
      status: "pending" as OvertimeStatus,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.getCollection().insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() };
  }

  static async getById(id: string): Promise<OvertimeRequest | null> {
    const record = await this.getCollection().findOne({ _id: new ObjectId(id) });
    if (!record) return null;
    return { ...record, _id: record._id.toString() } as OvertimeRequest;
  }

  static async getByUser(userId: string): Promise<OvertimeRequest[]> {
    const records = await this.getCollection()
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    return records.map((r) => ({ ...r, _id: r._id.toString() })) as OvertimeRequest[];
  }

  static async getAll(): Promise<OvertimeRequest[]> {
    const records = await this.getCollection()
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return records.map((r) => ({ ...r, _id: r._id.toString() })) as OvertimeRequest[];
  }

  static async review(
    id: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    reviewNote?: string
  ): Promise<boolean> {
    const result = await this.getCollection().updateOne(
      { _id: new ObjectId(id) },
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
