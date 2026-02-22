// types/receipt.ts (create this file)
export interface ReceiptSettings {
  logoSize: string;
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
  receiptWidth: '80mm' | '58mm';
  sections: {
    [key: string]: { header: boolean; footer: boolean; disabled: boolean };
  };
  receiptMessage: string;
  disclaimer: string;
  businessHours: string;
  logo: string | null;
  logoPreview: string;
  customerPrinter: {
    connectionType: 'usb' | 'bluetooth';
    paperWidth: '80mm' | '58mm';
  };
  kitchenPrinter: {
    enabled: boolean;
    printerName: string;
    connectionType: 'bluetooth' | 'usb';
    paperWidth: '80mm' | '58mm';
    copies: number;
    printOrderNumber: boolean;
    printTableNumber: boolean;
    printSpecialInstructions: boolean;
    separateByCategory: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}