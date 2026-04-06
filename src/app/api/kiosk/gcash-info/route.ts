import { NextResponse } from "next/server";
import { MONGODB } from "@/config/db";

export async function GET() {
  try {
    const settings = await MONGODB.collection("receiptSettings").findOne({});
    const gcash = settings?.gcashSettings ?? {};
    return NextResponse.json({
      accountName: gcash.accountName ?? "",
      accountNumber: gcash.accountNumber ?? "",
      qrImage: gcash.qrImage ?? null,
    });
  } catch {
    return NextResponse.json({ accountName: "", accountNumber: "", qrImage: null });
  }
}
