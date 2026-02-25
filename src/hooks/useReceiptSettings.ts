// hooks/useReceiptSettings.ts
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Define the ReceiptSettings type para complete
export interface ReceiptSettings {
  businessName: string;
  locationAddress: string;
  phoneNumber: string;
  taxPin: string;
  showLogo: boolean;
  showTaxPIN: boolean;
  showSKU: boolean;
  showReferenceNumber: boolean;
  showBusinessHours: boolean;
  emailReceipt: boolean;
  printReceipt: boolean;
  receiptWidth: '58mm' | '80mm';
  logo: string | null;
  logoPreview: string;
  logoSize: 'small' | 'medium' | 'large';
  receiptMessage: string;
  disclaimer: string;
  businessHours: string;
  sections: Record<string, { header: boolean; footer: boolean; disabled: boolean }>;
  customerPrinter: {
    connectionType: 'usb' | 'bluetooth' | 'network';
    paperWidth: '58mm' | '80mm';
  };
  kitchenPrinter: {
    enabled: boolean;
    printerName: string;
    connectionType: 'usb' | 'bluetooth' | 'network';
    paperWidth: '58mm' | '80mm';
    copies: number;
    printOrderNumber: boolean;
    printTableNumber: boolean;
    printSpecialInstructions: boolean;
    separateByCategory: boolean;
  };
  // Z-READING SETTINGS - ito ang importante para sa starting fund
  zreading: {
    // Starting Fund Settings
    defaultOpeningFund: number;      // ← Dito nakalagay ang starting fund amount
    requireOpeningFund: boolean;      // ← Required ba maglagay ng starting fund
    openingFundEditable: boolean;     // ← Pwedeng baguhin ng cashier ang starting fund
    
    // VAT Settings
    showVAT: boolean;
    vatPercentage: number;
    
    // Discount Settings
    showDiscounts: boolean;
    discountTypes: {
      sc: boolean;        // Senior Citizen
      pwd: boolean;       // PWD
      naac: boolean;      // NAAC
      soloParent: boolean; // Solo Parent
      other: boolean;     // Other Discounts
    };
    soloParentPercentage: number;
    
    // Payment Methods to show in Z-Report
    showPayments: {
      cash: boolean;
      gcash: boolean;
      split: boolean;
      creditCard: boolean;
      payLater: boolean;
      online: boolean;
      invoice: boolean;
    };
    
    // Additional Sections
    showBeginningEndingSI: boolean;
    showVoidSummary: boolean;
    showReturnSummary: boolean;
    showCashierSignature: boolean;
    showManagerSignature: boolean;
    showGrandTotal: boolean;
    showBreakdown: boolean;
    
    // Footer
    zreportFooter: string;
    includeDisclaimer: boolean;
  };
}

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
  logo: null,
  logoPreview: '',
  logoSize: 'medium',
  receiptMessage: 'Thank You for visiting Rendezvous Cafe!',
  disclaimer: 'Prices include 12% VAT. No refunds or exchanges on food items.',
  businessHours: 'Monday - Sunday: 7:00 AM - 10:00 PM',
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
  // Z-READING DEFAULTS - may starting fund na 2000
  zreading: {
    // Starting Fund
    defaultOpeningFund: 2000,
    requireOpeningFund: true,
    openingFundEditable: true,
    
    // VAT
    showVAT: true,
    vatPercentage: 12,
    
    // Discounts
    showDiscounts: true,
    discountTypes: {
      sc: true,
      pwd: true,
      naac: true,
      soloParent: true,
      other: true
    },
    soloParentPercentage: 10,
    
    // Payment Methods
    showPayments: {
      cash: true,
      gcash: true,
      split: true,
      creditCard: true,
      payLater: true,
      online: true,
      invoice: true
    },
    
    // Additional Sections
    showBeginningEndingSI: true,
    showVoidSummary: true,
    showReturnSummary: true,
    showCashierSignature: true,
    showManagerSignature: false,
    showGrandTotal: true,
    showBreakdown: true,
    
    // Footer
    zreportFooter: 'This is a computer generated report.',
    includeDisclaimer: true
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
        // Deep merge para hindi mawala ang nested objects
        setSettings(prev => ({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          customerPrinter: { ...DEFAULT_SETTINGS.customerPrinter, ...data.settings?.customerPrinter },
          kitchenPrinter: { ...DEFAULT_SETTINGS.kitchenPrinter, ...data.settings?.kitchenPrinter },
          zreading: {  // ← I-merge din ang zreading settings
            ...DEFAULT_SETTINGS.zreading,
            ...data.settings?.zreading,
            discountTypes: { 
              ...DEFAULT_SETTINGS.zreading.discountTypes, 
              ...data.settings?.zreading?.discountTypes 
            },
            showPayments: { 
              ...DEFAULT_SETTINGS.zreading.showPayments, 
              ...data.settings?.zreading?.showPayments 
            }
          }
        }));
        localStorage.setItem('receipt_settings', JSON.stringify(data.settings));
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('receipt_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings(prev => ({
            ...DEFAULT_SETTINGS,
            ...parsed,
            customerPrinter: { ...DEFAULT_SETTINGS.customerPrinter, ...parsed?.customerPrinter },
            kitchenPrinter: { ...DEFAULT_SETTINGS.kitchenPrinter, ...parsed?.kitchenPrinter },
            zreading: {  // ← I-merge din ang zreading
              ...DEFAULT_SETTINGS.zreading,
              ...parsed?.zreading,
              discountTypes: { 
                ...DEFAULT_SETTINGS.zreading.discountTypes, 
                ...parsed?.zreading?.discountTypes 
              },
              showPayments: { 
                ...DEFAULT_SETTINGS.zreading.showPayments, 
                ...parsed?.zreading?.showPayments 
              }
            }
          }));
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
        setSettings(prev => ({
          ...DEFAULT_SETTINGS,
          ...parsed,
          customerPrinter: { ...DEFAULT_SETTINGS.customerPrinter, ...parsed?.customerPrinter },
          kitchenPrinter: { ...DEFAULT_SETTINGS.kitchenPrinter, ...parsed?.kitchenPrinter },
          zreading: {  // ← I-merge din ang zreading
            ...DEFAULT_SETTINGS.zreading,
            ...parsed?.zreading,
            discountTypes: { 
              ...DEFAULT_SETTINGS.zreading.discountTypes, 
              ...parsed?.zreading?.discountTypes 
            },
            showPayments: { 
              ...DEFAULT_SETTINGS.zreading.showPayments, 
              ...parsed?.zreading?.showPayments 
            }
          }
        }));
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

  // FIXED: updateNestedSetting - para sa customerPrinter at kitchenPrinter
  const updateNestedSetting = (
    section: 'customerPrinter' | 'kitchenPrinter',
    field: string,
    value: any
  ) => {
    setSettings(prev => {
      const sectionData = prev[section];
      if (sectionData && typeof sectionData === 'object') {
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  // NEW: updateZReadingSetting - para sa zreading settings (including starting fund)
  const updateZReadingSetting = (
    field: keyof ReceiptSettings['zreading'],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      zreading: {
        ...prev.zreading,
        [field]: value
      }
    }));
  };

  // NEW: updateZReadingNestedSetting - para sa nested zreading objects (discountTypes, showPayments)
  const updateZReadingNestedSetting = (
    parent: 'discountTypes' | 'showPayments',
    field: string,
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      zreading: {
        ...prev.zreading,
        [parent]: {
          ...prev.zreading[parent],
          [field]: value
        }
      }
    }));
  };

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

  // HELPER FUNCTIONS - para sa Cash Management
  const getOpeningFund = (): number => {
    return settings.zreading?.defaultOpeningFund ?? 2000;
  };

  const isOpeningFundRequired = (): boolean => {
    return settings.zreading?.requireOpeningFund ?? true;
  };

  const isOpeningFundEditable = (): boolean => {
    return settings.zreading?.openingFundEditable ?? true;
  };

  const getVATPercentage = (): number => {
    return settings.zreading?.vatPercentage ?? 12;
  };

  const getSoloParentPercentage = (): number => {
    return settings.zreading?.soloParentPercentage ?? 10;
  };

  const shouldShowDiscount = (type: keyof ReceiptSettings['zreading']['discountTypes']): boolean => {
    return settings.zreading?.discountTypes?.[type] ?? true;
  };

  const shouldShowPayment = (type: keyof ReceiptSettings['zreading']['showPayments']): boolean => {
    return settings.zreading?.showPayments?.[type] ?? true;
  };

  return {
    settings,
    isLoading,
    isSaving,
    error,
    saveSettings,
    updateSetting,
    updateNestedSetting,
    updateZReadingSetting,        // ← BAGO: para sa zreading fields
    updateZReadingNestedSetting,   // ← BAGO: para sa nested zreading
    updateSectionPosition,
    resetToDefaults,
    testPrint,
    DEFAULT_SETTINGS,
    refreshSettings: loadSettings,
    // Helper functions para sa cash management
    getOpeningFund,                // ← GAMITIN ITO para makuha ang starting fund
    isOpeningFundRequired,
    isOpeningFundEditable,
    getVATPercentage,
    getSoloParentPercentage,
    shouldShowDiscount,
    shouldShowPayment
  };
}