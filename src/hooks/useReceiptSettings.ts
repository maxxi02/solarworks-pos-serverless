// hooks/useReceiptSettings.ts
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ReceiptSettings } from '@/types/receipt';

export const DEFAULT_SETTINGS: ReceiptSettings = {
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
logoSize: 'medium', // or whatever the default should be (e.g., 'small' | 'medium' | 'large')

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
  }
};

export function useReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings/receipt');
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          customerPrinter: { ...DEFAULT_SETTINGS.customerPrinter, ...data.settings?.customerPrinter },
          kitchenPrinter: { ...DEFAULT_SETTINGS.kitchenPrinter, ...data.settings?.kitchenPrinter }
        });
        localStorage.setItem('receipt_settings', JSON.stringify(data.settings));
      } else {
        const saved = localStorage.getItem('receipt_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            customerPrinter: { ...DEFAULT_SETTINGS.customerPrinter, ...parsed?.customerPrinter },
            kitchenPrinter: { ...DEFAULT_SETTINGS.kitchenPrinter, ...parsed?.kitchenPrinter }
          });
          toast.info('Using locally saved settings');
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    } catch {
      setError('Failed to load settings from server');
      const saved = localStorage.getItem('receipt_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          customerPrinter: { ...DEFAULT_SETTINGS.customerPrinter, ...parsed?.customerPrinter },
          kitchenPrinter: { ...DEFAULT_SETTINGS.kitchenPrinter, ...parsed?.kitchenPrinter }
        });
        toast.info('Using locally saved settings (offline mode)');
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (newSettings: ReceiptSettings): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch('/api/settings/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        setSettings(data.settings);
        localStorage.setItem('receipt_settings', JSON.stringify(data.settings));
        toast.success('Settings saved successfully');
        return true;
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save settings to server');
      localStorage.setItem('receipt_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      toast.warning('Settings saved locally (offline mode)');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof ReceiptSettings>(
    key: K,
    value: ReceiptSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // FIXED: This function now properly handles nested object updates with type safety
  const updateNestedSetting = <
    S extends keyof ReceiptSettings,
    F extends keyof ReceiptSettings[S]
  >(
    section: S,
    field: F,
    value: ReceiptSettings[S][F]
  ) => {
    setSettings(prev => {
      const sectionData = prev[section];
      
      // Check if sectionData exists and is an object (not null, not array)
      if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [field]: value
          }
        };
      }
      
      // If sectionData is not an object, log warning and return previous state
      console.warn(`Cannot update nested setting: ${String(section)} is not an object`);
      return prev;
    });
  };

  // Alternative FIX if you're sure all sections being passed are objects:
  // You can use this version if you want to assert that sectionData is always an object
  /*
  const updateNestedSetting = <
    S extends keyof ReceiptSettings,
    F extends keyof ReceiptSettings[S]
  >(
    section: S,
    field: F,
    value: ReceiptSettings[S][F]
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value
      }
    }));
  };
  */

  const updateSectionPosition = (
    sectionKey: string,
    position: 'header' | 'footer' | 'disabled'
  ) => {
    setSettings(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          header: position === 'header',
          footer: position === 'footer',
          disabled: position === 'disabled'
        }
      }
    }));
  };

  const resetToDefaults = async (): Promise<boolean> => {
    if (!window.confirm('Reset all settings to default?')) return false;
    return await saveSettings(DEFAULT_SETTINGS);
  };

  const testPrint = async (type: 'customer' | 'kitchen') => {
    toast.info(`Testing ${type} printer connection...`);
  };

  return {
    settings,
    isLoading,
    isSaving,
    error,
    saveSettings,
    updateSetting,
    updateNestedSetting,
    updateSectionPosition,
    resetToDefaults,
    testPrint,
    DEFAULT_SETTINGS,
    refreshSettings: loadSettings
  };
}