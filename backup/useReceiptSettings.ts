// hooks/useReceiptSettings.ts
import { useState, useEffect } from 'react';

interface ReceiptSettings {
  _id?: string;
  storeName: string;
  storeAddress: string;
  storeContact: string;
  storeEmail: string;
  taxType: 'VAT' | 'Non-VAT' | 'Percentage Tax';
  taxRate: number;
  showTax: boolean;
  showDiscount: boolean;
  showChange: boolean;
  receiptFooter: string;
  printerType: 'thermal' | 'a4' | 'receipt';
  paperSize: '58mm' | '80mm' | 'A4';
  receiptWidth?: '58mm' | '80mm';   // ← add
  autoPrint: boolean;
  printCopy: number;
  headerTemplate: string;
  footerTemplate: string;
  showLogo: boolean;
  logoSize?: string;
  logoUrl?: string;
  logoPreview?: string;             // ← add
  businessName?: string;            // ← add
  locationAddress?: string;         // ← add
  phoneNumber?: string;             // ← add
  businessPermit?: string;
  tinNumber: string;
  cashierName: string;
  managerName: string;
  receiptMessage?: string;          // ← add
  showBusinessHours?: boolean;      // ← add
  businessHours?: string;           // ← add
  showTaxPIN?: boolean;             // ← add
  taxPin?: string;                  // ← add
  sections?: {                      // ← add
    storeName?: { header?: boolean; disabled?: boolean };
    locationAddress?: { header?: boolean; disabled?: boolean };
    phoneNumber?: { header?: boolean; disabled?: boolean };
    barcode?: { header?: boolean; disabled?: boolean };
    message?: { footer?: boolean; disabled?: boolean };
  };
  updatedAt?: Date;
}
export const useReceiptSettings = () => {
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/receipt-settings');
      if (!response.ok) throw new Error('Failed to fetch receipt settings');
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching receipt settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, isLoading, error, refetch: fetchSettings };
};