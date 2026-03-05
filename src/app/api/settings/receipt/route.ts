import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/config/db-Connect';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const COLLECTION = 'receiptSettings';

const DEFAULT_SETTINGS = {
  businessName: 'Rendezvous Cafe',
  locationAddress: 'Rendezvous Café, Talisay - Tanauan Road, Natatas, Tanauan City, Batangas, Philippines',
  phoneNumber: '+63639660049893',
  taxPin: '123-456-789-000',
  showLogo: true,
  showTaxPIN: true,
  showSKU: false,
  showReferenceNumber: true,
  showBusinessHours: true,
  emailReceipt: true,
  printReceipt: true,
  receiptWidth: '58mm',
  sections: {
    locationAddress: { header: true, footer: false, disabled: false },
    storeName: { header: true, footer: false, disabled: false },
    transactionType: { header: true, footer: false, disabled: false },
    phoneNumber: { header: false, footer: false, disabled: false },
    message: { header: false, footer: true, disabled: false },
    payLaterDueDate: { header: false, footer: false, disabled: true },
    orderType: { header: false, footer: false, disabled: true },
    disclaimer: { header: false, footer: false, disabled: false },
    barcode: { header: true, footer: false, disabled: false },
    orderNote: { header: false, footer: true, disabled: false },
    customerInfo: { header: false, footer: true, disabled: false },
  },
  receiptMessage: 'Thank You for visiting Rendezvous Cafe!',
  disclaimer: 'Prices include 12% VAT. No refunds or exchanges on food items.',
  businessHours: 'Monday - Sunday: 7:00 AM - 10:00 PM',
  logo: null,
  logoPreview: '',
  customerPrinter: { connectionType: 'usb', paperWidth: '58mm' },
  kitchenPrinter: {
    enabled: true,
    printerName: 'XP-58 Kitchen',
    connectionType: 'bluetooth',
    paperWidth: '58mm',
    copies: 1,
    printOrderNumber: true,
    printTableNumber: true,
    printSpecialInstructions: true,
    separateByCategory: true,
  },
};

export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection(COLLECTION);

    let settings = await collection.findOne({});

    if (!settings) {
      const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
      const newDoc = {
        ...DEFAULT_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(session?.user && { createdBy: session.user.id }),
      };
      const result = await collection.insertOne(newDoc);
      settings = { ...newDoc, _id: result.insertedId };
    }

    const { _id, ...rest } = settings;
    return NextResponse.json({ settings: rest });
  } catch (error) {
    console.error('Receipt settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const [db, data] = await Promise.all([
      connectToDatabase(),
      request.json(),
    ]);

    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

    const collection = db.collection(COLLECTION);
    await collection.updateOne(
      {},
      { $set: { ...data, updatedAt: new Date(), ...(session?.user && { updatedBy: session.user.id }) } },
      { upsert: true }
    );

    const updated = await collection.findOne({});
    const { _id, ...rest } = updated || {};

    return NextResponse.json({ success: true, settings: rest, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Receipt settings POST error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}