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
}
