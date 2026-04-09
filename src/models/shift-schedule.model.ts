import { MONGODB } from "@/config/db";
import { ObjectId } from "mongodb";

export interface ShiftSchedule {
  _id: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION_NAME = "shift_schedules";

export class ShiftScheduleModel {
  private static getCollection() {
    return MONGODB.collection(COLLECTION_NAME);
  }

  static async create(data: {
    staffId: string;
    staffName: string;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
    createdBy: string;
  }): Promise<ShiftSchedule> {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.getCollection().insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() };
  }

  static async createMany(data: {
    staffId: string;
    staffName: string;
    dateFrom: string;
    dateTo: string;
    startTime: string;
    endTime: string;
    notes?: string;
    createdBy: string;
  }): Promise<number> {
    const now = new Date();
    const docs: any[] = [];
    
    // Create one record per day in the range
    const cursor = new Date(data.dateFrom);
    const end = new Date(data.dateTo);
    
    // Safety break to prevent infinite loops by maxing at 365 days
    let limit = 0;
    while (cursor <= end && limit < 365) {
      docs.push({
        staffId: data.staffId,
        staffName: data.staffName,
        date: cursor.toISOString().split("T")[0],
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      limit++;
    }

    if (docs.length === 0) return 0;

    const result = await this.getCollection().insertMany(docs);
    return result.insertedCount;
  }

  static async getByDateRange(
    startDate: string,
    endDate: string,
    staffId?: string
  ): Promise<ShiftSchedule[]> {
    const query: Record<string, unknown> = {
      date: { $gte: startDate, $lte: endDate },
    };
    if (staffId) query.staffId = staffId;

    const records = await this.getCollection()
      .find(query)
      .sort({ date: 1, startTime: 1 })
      .toArray();

    return records.map((r) => ({ ...r, _id: r._id.toString() })) as ShiftSchedule[];
  }

  static async delete(scheduleId: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({
      _id: new ObjectId(scheduleId),
    });
    return result.deletedCount > 0;
  }

  static async deleteByDateRange(
    startDate: string,
    endDate: string,
    staffId: string
  ): Promise<number> {
    const result = await this.getCollection().deleteMany({
      date: { $gte: startDate, $lte: endDate },
      staffId: staffId,
    });
    return result.deletedCount;
  }
}
