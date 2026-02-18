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
  autoPrint: boolean;
  printCopy: number;
  headerTemplate: string;
  footerTemplate: string;
  showLogo: boolean;
  logoUrl?: string;
  businessPermit?: string;
  tinNumber: string;
  cashierName: string;
  managerName: string;
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