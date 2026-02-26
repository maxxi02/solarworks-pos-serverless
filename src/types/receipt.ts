// types/receipt.ts (create this file)
export interface ReceiptSettings {
  logoSize: "small" | "medium" | "large";
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
  receiptWidth: "80mm" | "58mm";
  sections: {
    [key: string]: { header: boolean; footer: boolean; disabled: boolean };
  };
  receiptMessage: string;
  disclaimer: string;
  businessHours: string;
  logo: string | null;
  logoPreview: string;
  customerPrinter: {
    connectionType: "usb" | "bluetooth" | "network";
    paperWidth: "80mm" | "58mm";
  };
  kitchenPrinter: {
    enabled: boolean;
    printerName: string;
    connectionType: "bluetooth" | "usb" | "network";
    paperWidth: "80mm" | "58mm";
    copies: number;
    printOrderNumber: boolean;
    printTableNumber: boolean;
    printSpecialInstructions: boolean;
    separateByCategory: boolean;
  };
  zreading: {
    defaultOpeningFund: number;
    requireOpeningFund: boolean;
    openingFundEditable: boolean;
    showVAT: boolean;
    vatPercentage: number;
    showDiscounts: boolean;
    discountTypes: {
      sc: boolean;
      pwd: boolean;
      naac: boolean;
      soloParent: boolean;
      other: boolean;
    };
    soloParentPercentage: number;
    showPayments: {
      cash: boolean;
      gcash: boolean;
      split: boolean;
      creditCard: boolean;
      payLater: boolean;
      online: boolean;
      invoice: boolean;
    };
    showBeginningEndingSI: boolean;
    showVoidSummary: boolean;
    showReturnSummary: boolean;
    showCashierSignature: boolean;
    showManagerSignature: boolean;
    showGrandTotal: boolean;
    showBreakdown: boolean;
    zreportFooter: string;
    includeDisclaimer: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}
