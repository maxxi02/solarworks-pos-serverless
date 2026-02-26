import { NextRequest, NextResponse } from 'next/server';
import MONGODB from '@/config/db';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CashOut {
  amount: number;
  reason: string;
  date: Date;
}

interface Session {
  openingFund: number;
  cashierName: string;
  registerName: string;
  openedAt: Date;
  status: 'open' | 'closed';
  cashOuts: CashOut[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  actualCash?: number;
  expectedCash?: number;
  difference?: number;
  closeStatus?: string;
  closingNotes?: string;
  snapshot?: object;
}

const col = () => MONGODB.collection<Session>('sessions');

// ─── GET /api/sessions ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await col().findOne(
      { status: 'open' },
      { sort: { openedAt: -1 } }
    );
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch session' }, { status: 500 });
  }
}

// ─── POST /api/sessions ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { openingFund = 0, cashierName = 'Cashier', registerName = 'Main Register' } = body;

    await col().updateMany(
      { status: 'open' },
      { $set: { status: 'closed', closedAt: new Date() } }
    );

    const now = new Date();
    const newSession: Omit<Session, '_id'> = {
      openingFund,
      cashierName,
      registerName,
      openedAt:  now,
      status:    'open',
      cashOuts:  [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await col().insertOne(newSession as Session);
    const session = { ...newSession, _id: result.insertedId };

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to open session' }, { status: 500 });
  }
}

// ─── PATCH /api/sessions ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const openSession = await col().findOne(
      { status: 'open' },
      { sort: { openedAt: -1 } }
    );
    if (!openSession) {
      return NextResponse.json(
        { success: false, error: 'No open session found' },
        { status: 404 }
      );
    }

    // ── Cash Out ────────────────────────────────────────────────────────────
    if (action === 'cash_out') {
      const { amount, reason } = body;
      if (!amount || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
      }

      await col().updateOne(
        { _id: openSession._id },
        {
          $push: { cashOuts: { amount, reason, date: new Date() } },
          $set:  { updatedAt: new Date() },
        }
      );

      const updated = await col().findOne({ _id: openSession._id });
      return NextResponse.json({ success: true, data: updated });
    }

    // ── Close Register ──────────────────────────────────────────────────────
    if (action === 'close') {
      const {
        actualCash, expectedCash, difference,
        closeStatus, closingNotes, snapshot,
      } = body;

      await col().updateOne(
        { _id: openSession._id },
        {
          $set: {
            status:       'closed',
            closedAt:     new Date(),
            actualCash,
            expectedCash,
            difference,
            closeStatus,
            closingNotes: closingNotes || '',
            snapshot:     snapshot    || {},
            updatedAt:    new Date(),
          },
        }
      );

      const updated = await col().findOne({ _id: openSession._id });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
  }
}