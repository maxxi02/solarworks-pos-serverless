// lib/receiptPrinter.ts
export interface ReceiptData {
  orderNumber: string;
  date: Date;
  cashier: string;
  customerName: string;
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  notes?: string;
}

class ReceiptPrinter {
  private settings: any;

  constructor(settings: any) {
    this.settings = settings;
  }

  // Generate HTML receipt for web printing
  generateHTMLReceipt(data: ReceiptData): string {
    const { settings } = this;
    const date = new Date(data.date).toLocaleString('en-PH', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${data.orderNumber}</title>
        <style>
          @page {
            size: ${settings.paperSize === '58mm' ? '58mm' : settings.paperSize === '80mm' ? '80mm' : 'A4'};
            margin: 0.5cm;
          }
          body {
            font-family: ${settings.printerType === 'thermal' ? "'Courier New', monospace" : 'Arial, sans-serif'};
            font-size: ${settings.printerType === 'thermal' ? '12px' : '14px'};
            width: ${settings.paperSize === '58mm' ? '48mm' : settings.paperSize === '80mm' ? '70mm' : '210mm'};
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .store-name {
            font-size: ${settings.printerType === 'thermal' ? '16px' : '20px'};
            font-weight: bold;
          }
          .receipt-title {
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .items {
            width: 100%;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
          }
          .total-row {
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: ${settings.printerType === 'thermal' ? '11px' : '12px'};
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings.showLogo && settings.logoUrl ? 
            `<img src="${settings.logoUrl}" alt="Store Logo" style="max-width: 100px; max-height: 100px;" />` 
            : ''}
          <div class="store-name">${settings.storeName}</div>
          <div>${settings.storeAddress}</div>
          <div>${settings.storeContact} | ${settings.storeEmail}</div>
          ${settings.businessPermit ? `<div>Permit: ${settings.businessPermit}</div>` : ''}
          <div>TIN: ${settings.tinNumber}</div>
          <div class="divider"></div>
        </div>

        <div class="receipt-title">SALES INVOICE</div>
        
        <div>
          <div>Order #: ${data.orderNumber}</div>
          <div>Date: ${date}</div>
          <div>Cashier: ${settings.cashierName}</div>
          <div>Customer: ${data.customerName}</div>
          <div>Order Type: ${data.orderType.toUpperCase()}</div>
          ${data.tableNumber ? `<div>Table: ${data.tableNumber}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="items">
          <div class="item-row" style="font-weight: bold;">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          
          ${data.items.map(item => `
            <div class="item-row">
              <span>${item.name}</span>
              <span>${item.quantity}</span>
              <span>₱${item.price.toFixed(2)}</span>
              <span>₱${item.total.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="divider"></div>

        <div>
          <div class="item-row">
            <span>Subtotal:</span>
            <span>₱${data.subtotal.toFixed(2)}</span>
          </div>
          ${settings.showTax ? `
            <div class="item-row">
              <span>Tax (${data.taxRate}%):</span>
              <span>₱${data.tax.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item-row total-row">
            <span>TOTAL:</span>
            <span>₱${data.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <div>Payment Method: ${data.paymentMethod.toUpperCase()}</div>
          ${data.amountPaid ? `<div>Amount Paid: ₱${data.amountPaid.toFixed(2)}</div>` : ''}
          ${data.change !== undefined ? `<div>Change: ₱${data.change.toFixed(2)}</div>` : ''}
          ${data.notes ? `<div>Notes: ${data.notes}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="footer">
          <div>${settings.receiptFooter}</div>
          <div style="margin-top: 10px;">
            ${settings.managerName ? `Manager: ${settings.managerName}` : ''}
          </div>
          <div style="margin-top: 20px; font-size: 10px;">
            Thank you for dining with us!
          </div>
          <div style="margin-top: 5px; font-size: 8px;">
            This serves as your official receipt
          </div>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px;">Print Receipt</button>
          <button onclick="window.close()" style="padding: 10px 20px;">Close</button>
        </div>
      </body>
      </html>
    `;
  }

  // Print receipt
  printReceipt(data: ReceiptData): void {
    const html = this.generateHTMLReceipt(data);
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Auto print if enabled
      if (this.settings.autoPrint) {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  }

  // Generate thermal printer ESC/POS commands (for direct printer connection)
  generateESCPOSCommands(data: ReceiptData): Uint8Array {
    // Implementation for direct ESC/POS printing
    // This would require additional libraries like 'esc-pos-encoder'
    return new Uint8Array([]);
  }
}

export default ReceiptPrinter;