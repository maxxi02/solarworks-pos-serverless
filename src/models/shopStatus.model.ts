// src/models/shopStatus.model.ts
// Singleton document that tracks whether the shop is open or closed for QR ordering.

import { MONGODB } from "@/config/db";

const COLLECTION_NAME = "shop_status";
const SINGLETON_ID = "shop-status-singleton";

export interface ShopStatus {
  _id: string;
  isOpen: boolean;
  updatedAt: Date;
  updatedBy?: string; // name of the staff who changed it (optional)
}

export class ShopStatusModel {
  private static getCollection() {
    return MONGODB.collection(COLLECTION_NAME);
  }

  /** Returns the current shop status. Defaults to open if no record exists yet. */
  static async getStatus(): Promise<ShopStatus> {
    const col = this.getCollection();
    const doc = await col.findOne({ _id: SINGLETON_ID } as any);
    if (!doc) {
      return { _id: SINGLETON_ID, isOpen: true, updatedAt: new Date() };
    }
    return {
      _id: SINGLETON_ID,
      isOpen: doc.isOpen ?? true,
      updatedAt: doc.updatedAt,
      updatedBy: doc.updatedBy,
    };
  }

  /** Sets the shop open/closed state. */
  static async setStatus(
    isOpen: boolean,
    updatedBy?: string,
  ): Promise<ShopStatus> {
    const col = this.getCollection();
    const now = new Date();

    await col.updateOne(
      { _id: SINGLETON_ID } as any,
      { $set: { isOpen, updatedAt: now, updatedBy: updatedBy ?? "" } },
      { upsert: true },
    );

    return { _id: SINGLETON_ID, isOpen, updatedAt: now, updatedBy };
  }
}
