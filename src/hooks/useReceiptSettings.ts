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
  // Customer printer defaults
  customerPrinter: {
    connectionType: 'usb',
    paperWidth: '58mm'
  },
  // Kitchen printer defaults
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

  // Load settings from API
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📡 Loading receipt settings from API...');
      const response = await fetch('/api/settings/receipt');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Settings loaded from API:', data);
        
        // Merge with defaults to ensure all fields exist
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          customerPrinter: {
            ...DEFAULT_SETTINGS.customerPrinter,
            ...data.settings?.customerPrinter
          },
          kitchenPrinter: {
            ...DEFAULT_SETTINGS.kitchenPrinter,
            ...data.settings?.kitchenPrinter
          }
        });
        
        // Backup to localStorage
        localStorage.setItem('receipt_settings', JSON.stringify(data.settings));
      } else {
        console.warn('⚠️ API returned error, falling back to localStorage');
        // Fallback to localStorage
        const saved = localStorage.getItem('receipt_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            customerPrinter: {
              ...DEFAULT_SETTINGS.customerPrinter,
              ...parsed?.customerPrinter
            },
            kitchenPrinter: {
              ...DEFAULT_SETTINGS.kitchenPrinter,
              ...parsed?.kitchenPrinter
            }
          });
          toast.info('Using locally saved settings');
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load receipt settings:', error);
      setError('Failed to load settings from server');
      
      // Fallback to localStorage
      const saved = localStorage.getItem('receipt_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          customerPrinter: {
            ...DEFAULT_SETTINGS.customerPrinter,
            ...parsed?.customerPrinter
          },
          kitchenPrinter: {
            ...DEFAULT_SETTINGS.kitchenPrinter,
            ...parsed?.kitchenPrinter
          }
        });
        toast.info('Using locally saved settings (offline mode)');
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings to API
  const saveSettings = async (newSettings: ReceiptSettings): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError(null);
      
      console.log('📡 Saving settings to API...');
      const response = await fetch('/api/settings/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      // Get response text first for debugging
      const responseText = await response.text();
      console.log('📥 API Response:', response.status, responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse response as JSON:', responseText);
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        setSettings(data.settings);
        
        // Backup to localStorage
        localStorage.setItem('receipt_settings', JSON.stringify(data.settings));
        
        toast.success('Settings saved successfully');
        return true;
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error) {
      console.error('❌ Failed to save receipt settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to save settings to server');
      
      // Fallback to localStorage
      localStorage.setItem('receipt_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      toast.warning('Settings saved locally (offline mode)');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Update single setting
  const updateSetting = <K extends keyof ReceiptSettings>(
    key: K,
    value: ReceiptSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Update nested setting
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
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  // Update section positioning
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

  // Reset to defaults
  const resetToDefaults = async (): Promise<boolean> => {
    const confirmed = window.confirm('Are you sure you want to reset all settings to default?');
    if (!confirmed) return false;
    
    return await saveSettings(DEFAULT_SETTINGS);
  };

  // Test print (for debugging)
  const testPrint = async (type: 'customer' | 'kitchen') => {
    toast.info(`Testing ${type} printer connection...`);
    // This will be implemented by the printer system
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