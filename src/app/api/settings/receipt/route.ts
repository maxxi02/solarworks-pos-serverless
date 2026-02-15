// app/api/settings/receipt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, withDatabase } from '@/config/db-Connect';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { WithId, Document } from 'mongodb'; // Import MongoDB types

// Collection name
const COLLECTION = 'receiptSettings';

export async function GET() {
  console.log('📋 GET /api/settings/receipt - Started');
  
  try {
    console.log('🔐 Attempting to get session...');
    let session = null;
    try {
      session = await auth.api.getSession({
        headers: await headers()
      });
      console.log('✅ Session found:', session ? 'Yes' : 'No');
    } catch (authError) {
      console.error('❌ Auth error:', authError);
    }

    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Database connected');
    
    // Get the collection
    const collection = db.collection(COLLECTION);
    
    // Get settings (creates default if none exists)
    console.log('🔍 Finding settings...');
    let settings = await collection.findOne({});
    
    if (!settings) {
      console.log('🆕 No settings found, creating default settings...');
      const defaultSettings = {
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
        customerPrinter: {
          connectionType: 'usb',
          paperWidth: '58mm'
        },
        kitchenPrinter: {
          enabled: true,
          printerName: 'XP-58 Kitchen',
          connectionType: 'bluetooth',
          paperWidth: '58mm',
          copies: 1,
          printOrderNumber: true,
          printTableNumber: true,
          printSpecialInstructions: true,
          separateByCategory: true
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(session?.user && { createdBy: session.user.id })
      };
      
      const result = await collection.insertOne(defaultSettings);
      settings = { ...defaultSettings, _id: result.insertedId };
      console.log('✅ Default settings created with ID:', result.insertedId);
    } else {
      console.log('✅ Settings found with ID:', settings._id);
    }

    // Create a response object without _id (safer approach than delete)
    const { _id, ...settingsWithoutId } = settings;

    return NextResponse.json({ settings: settingsWithoutId });
    
  } catch (error) {
    console.error('❌ Failed to fetch receipt settings:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('📝 POST /api/settings/receipt - Started');
  
  try {
    console.log('🔐 Attempting to get session...');
    let session = null;
    try {
      session = await auth.api.getSession({
        headers: await headers()
      });
      console.log('✅ Session found:', session ? 'Yes' : 'No');
    } catch (authError) {
      console.error('❌ Auth error:', authError);
    }

    // Connect to database
    const db = await connectToDatabase();
    console.log('✅ Database connected');
    
    const data = await request.json();
    console.log('📦 Received data keys:', Object.keys(data));

    // Add metadata
    const updateData = {
      ...data,
      updatedAt: new Date(),
      ...(session?.user && { updatedBy: session.user.id })
    };

    // Get the collection
    const collection = db.collection(COLLECTION);
    
    console.log('💾 Saving settings to database...');
    
    // Update or create settings
    const result = await collection.updateOne(
      {}, // empty filter to get the single settings document
      { $set: updateData },
      { upsert: true } // create if doesn't exist
    );

    // Fetch the updated document
    const updatedSettings = await collection.findOne({});
    
    console.log('✅ Settings saved successfully. Matched:', result.matchedCount, 'Modified:', result.modifiedCount, 'Upserted:', result.upsertedCount);

    // Create a response object without _id
    const { _id, ...settingsWithoutId } = updatedSettings || {};

    return NextResponse.json({ 
      success: true, 
      settings: settingsWithoutId,
      message: 'Settings saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Failed to save receipt settings:', error);
    return NextResponse.json({ 
      error: 'Failed to save settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}