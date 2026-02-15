// lib/receiptPrinter.ts
import { ReceiptSettings } from '@/types/receipt';
import { toast } from 'sonner';

export interface ReceiptData {
  id: string;
  orderNumber: string;
  customerName: string;
  items: Array<{
    _id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount?: boolean;
    category?: string;
    menuType?: 'food' | 'drink';
    notes?: string;
  }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: 'cash' | 'gcash' | 'split';
  splitPayment?: { cash: number; gcash: number };
  orderType: 'dine-in' | 'takeaway';
  tableNumber?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
  seniorPwdCount?: number;
  orderNote?: string;
  cashier: string;
  cashierId?: string;
  seniorPwdIds?: string[];
  isReprint?: boolean;
  reprintCount?: number;
  customerReceiptPrinted?: boolean;
  kitchenReceiptPrinted?: boolean;
}

export interface PrinterConfig {
  type: 'customer' | 'kitchen';
  connectionType: 'usb' | 'bluetooth';
  printerName?: string;
  paperWidth: '58mm' | '80mm';
}

interface PrintOptions {
  settings: ReceiptSettings;
  receipt: ReceiptData;
  copies?: number;
  printerType?: 'customer' | 'kitchen';
  connectionType?: 'usb' | 'bluetooth';
}

// REMOVE THIS LINE - it's causing circular dependency
// export { tryBluetoothPrint, fallbackPrint } from './receiptPrinter';

export const formatReceiptForPrinter = (options: PrintOptions): string => {
  const { settings, receipt, printerType = 'customer' } = options;
  
  // For kitchen printer, use kitchen format
  if (printerType === 'kitchen') {
    return formatKitchenReceipt(receipt, settings);
  }
  
  const is58mm = settings.receiptWidth === '58mm';
  const lineWidth = is58mm ? 32 : 42;
  
  const centerText = (text: string): string => {
    const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const formatLine = (left: string, right: string): string => {
    const maxLeftWidth = lineWidth - 12; // Reserve space for right text
    const leftTrim = left.length > maxLeftWidth ? left.substring(0, maxLeftWidth - 3) + '...' : left;
    const rightTrim = right.length > 10 ? right.substring(0, 10) : right;
    const dots = lineWidth - leftTrim.length - rightTrim.length;
    return leftTrim + ' '.repeat(Math.max(0, dots)) + rightTrim;
  };

  const divider = '-'.repeat(lineWidth);
  const doubleDivider = '='.repeat(lineWidth);

  let content = '';

  // Header
  if (settings.sections?.storeName?.header && !settings.sections?.storeName?.disabled) {
    content += centerText(settings.businessName) + '\n';
  }

  if (settings.sections?.locationAddress?.header && !settings.sections?.locationAddress?.disabled) {
    // Split long address into multiple lines
    const address = settings.locationAddress;
    if (address.length > lineWidth) {
      const words = address.split(' ');
      let line = '';
      words.forEach(word => {
        if ((line + word).length <= lineWidth) {
          line += (line ? ' ' : '') + word;
        } else {
          content += centerText(line) + '\n';
          line = word;
        }
      });
      if (line) content += centerText(line) + '\n';
    } else {
      content += centerText(address) + '\n';
    }
  }

  if (settings.sections?.phoneNumber?.header && !settings.sections?.phoneNumber?.disabled) {
    content += centerText(settings.phoneNumber) + '\n';
  }

  content += doubleDivider + '\n';

  // Order Details
  content += `Order #: ${receipt.orderNumber}\n`;
  content += `Date: ${new Date(receipt.timestamp).toLocaleString()}\n`;
  content += `Cashier: ${receipt.cashier}\n`;
  content += `Customer: ${receipt.customerName}\n`;
  
  if (settings.sections?.transactionType?.header && !settings.sections?.transactionType?.disabled) {
    content += `Type: ${receipt.orderType.toUpperCase()}\n`;
  }
  
  if (receipt.tableNumber) {
    content += `Table: ${receipt.tableNumber}\n`;
  }
  
  if (receipt.orderNote && settings.sections?.orderNote?.footer && !settings.sections?.orderNote?.disabled) {
    content += `Notes: ${receipt.orderNote}\n`;
  }

  content += divider + '\n';

  // Customer Info (if enabled)
  if (settings.sections?.customerInfo?.footer && !settings.sections?.customerInfo?.disabled) {
    if (receipt.seniorPwdIds?.length) {
      content += `Senior/PWD IDs: ${receipt.seniorPwdIds.join(', ')}\n`;
    }
    content += divider + '\n';
  }

  // Items Header
  content += 'ITEM                     QTY   AMOUNT\n';
  
  // Items
  receipt.items.forEach(item => {
    const itemTotal = item.hasDiscount 
      ? item.price * item.quantity * 0.8 
      : item.price * item.quantity;
    
    const itemName = item.name.length > 20 ? item.name.substring(0, 18) + '..' : item.name;
    const itemNamePadded = itemName.padEnd(20);
    const qty = item.quantity.toString().padStart(3);
    const amount = itemTotal.toFixed(2).padStart(8);
    
    content += `${itemNamePadded} ${qty}  ${amount}\n`;
    
    if (item.hasDiscount) {
      content += `  (20% Senior/PWD discount)\n`;
    }
    
    if (settings.showSKU) {
      content += `  SKU: ${item._id.substring(0, 8)}\n`;
    }
    
    if (item.notes) {
      content += `  Note: ${item.notes}\n`;
    }
  });

  content += divider + '\n';

  // Totals
  content += formatLine('Subtotal:', receipt.subtotal.toFixed(2)) + '\n';
  
  if (receipt.discountTotal > 0) {
    content += formatLine('Discount:', `-${receipt.discountTotal.toFixed(2)}`) + '\n';
  }
  
  if (settings.showTaxPIN) {
    const taxAmount = receipt.total * 0.12; // 12% VAT
    content += formatLine('VAT (12%):', taxAmount.toFixed(2)) + '\n';
  }
  
  content += formatLine('TOTAL:', receipt.total.toFixed(2)) + '\n';

  if (settings.showTaxPIN) {
    content += `VAT Reg TIN: ${settings.taxPin}\n`;
  }

  content += divider + '\n';

  // Payment
  content += `Payment: ${receipt.paymentMethod.toUpperCase()}\n`;
  if (receipt.paymentMethod === 'split' && receipt.splitPayment) {
    content += `  Cash: ${receipt.splitPayment.cash.toFixed(2)}\n`;
    content += `  GCash: ${receipt.splitPayment.gcash.toFixed(2)}\n`;
  }

  content += doubleDivider + '\n';

  // Footer
  if (settings.sections?.barcode?.footer && !settings.sections?.barcode?.disabled) {
    content += '\n' + centerText(`[${receipt.orderNumber}]`) + '\n';
  }

  if (settings.showBusinessHours) {
    // Split business hours if too long
    const hours = settings.businessHours;
    if (hours.length > lineWidth) {
      const parts = hours.split(': ');
      if (parts.length === 2) {
        content += centerText(parts[0] + ':') + '\n';
        content += centerText(parts[1]) + '\n';
      } else {
        content += centerText(hours) + '\n';
      }
    } else {
      content += centerText(hours) + '\n';
    }
  }

  if (settings.sections?.message?.footer && !settings.sections?.message?.disabled) {
    content += centerText(settings.receiptMessage) + '\n';
  }

  if (!settings.sections?.disclaimer?.disabled) {
    const disclaimer = settings.disclaimer;
    if (disclaimer.length > lineWidth) {
      // Split disclaimer into multiple lines
      const words = disclaimer.split(' ');
      let line = '';
      words.forEach(word => {
        if ((line + word).length <= lineWidth) {
          line += (line ? ' ' : '') + word;
        } else {
          content += centerText(line) + '\n';
          line = word;
        }
      });
      if (line) content += centerText(line) + '\n';
    } else {
      content += centerText(disclaimer) + '\n';
    }
  }

  if (receipt.isReprint) {
    content += centerText('*** REPRINTED RECEIPT ***') + '\n';
  }

  // Add line feeds for cutting
  content += '\n\n\n';

  return content;
};

// Helper function for kitchen receipt
function formatKitchenReceipt(receipt: ReceiptData, settings: ReceiptSettings): string {
  const kitchenSettings = settings.kitchenPrinter || {
    paperWidth: '58mm',
    printOrderNumber: true,
    printTableNumber: true,
    printSpecialInstructions: true,
    separateByCategory: true
  };
  
  const lineWidth = kitchenSettings.paperWidth === '58mm' ? 32 : 42;
  
  const centerText = (text: string): string => {
    const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
    return ' '.repeat(padding) + text;
  };

  const divider = '='.repeat(lineWidth);
  const thinDivider = '-'.repeat(lineWidth);

  let content = '';

  // Header
  content += centerText('*** KITCHEN ORDER ***') + '\n';
  content += divider + '\n';

  // Order info
  if (kitchenSettings.printOrderNumber) {
    content += `Order #: ${receipt.orderNumber}\n`;
  }
  
  content += `Time: ${new Date().toLocaleTimeString()}\n`;
  
  if (kitchenSettings.printTableNumber && receipt.tableNumber) {
    content += `Table: ${receipt.tableNumber}\n`;
  }
  
  content += `Type: ${receipt.orderType}\n`;
  content += divider + '\n';

  // Filter food items for kitchen
  const foodItems = receipt.items.filter(item => 
    item.menuType === 'food' || 
    item.category?.toLowerCase().includes('food') ||
    item.category?.toLowerCase().includes('meal') ||
    item.category?.toLowerCase().includes('dish')
  );

  if (foodItems.length === 0) {
    content += centerText('NO FOOD ITEMS') + '\n';
    content += divider + '\n';
    return content;
  }

  // Group by category
  if (kitchenSettings.separateByCategory) {
    const grouped = foodItems.reduce((acc, item) => {
      const category = item.category || 'Food';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof foodItems>);

    Object.entries(grouped).forEach(([category, items]) => {
      content += `\n${category.toUpperCase()}\n`;
      content += thinDivider + '\n';
      
      items.forEach(item => {
        content += `${item.quantity}x ${item.name}\n`;
        
        if (kitchenSettings.printSpecialInstructions) {
          if (item.notes) {
            content += `  Note: ${item.notes}\n`;
          }
        }
      });
    });
  } else {
    foodItems.forEach(item => {
      content += `${item.quantity}x ${item.name}\n`;
      
      if (kitchenSettings.printSpecialInstructions) {
        if (item.notes) {
          content += `  Note: ${item.notes}\n`;
        }
      }
    });
  }

  content += divider + '\n';
  content += centerText('*** PLEASE RUSH ***') + '\n';
  content += '\n\n\n';

  return content;
}

// ESC/POS Commands
export const getESCPOSCommands = (text: string): Uint8Array => {
  const encoder = new TextEncoder();
  
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;
  
  // ESC/POS commands
  const commands = [
    ESC, 0x40, // Initialize printer
    ESC, 0x61, 0x00, // Left alignment (0x00 = left, 0x01 = center, 0x02 = right)
    ESC, 0x21, 0x00, // Normal text (0x00 = normal, 0x08 = bold, 0x20 = double height)
  ];
  
  // Convert text to bytes and add line feeds
  const textBytes = encoder.encode(text);
  
  // Cut paper command (GS V m)
  const cutCommands = [GS, 0x56, 0x00]; // Full cut
  
  return new Uint8Array([...commands, ...textBytes, LF, LF, ...cutCommands]);
};

// Print function with dual printer support
export async function printReceipt(
  receipt: ReceiptData,
  settings: ReceiptSettings
): Promise<{ customer: boolean; kitchen: boolean }> {
  const results = { customer: false, kitchen: false };

  try {
    // Print customer receipt
    if (settings.printReceipt) {
      const customerContent = formatReceiptForPrinter({
        settings,
        receipt,
        printerType: 'customer'
      });
      
      results.customer = await printToPrinter(customerContent, 'customer');
      
      if (results.customer) {
        console.log('Customer receipt printed successfully');
      } else {
        console.error('Failed to print customer receipt');
      }
    }

    // Print kitchen order (if enabled and has food items)
    if (settings.kitchenPrinter?.enabled) {
      const hasFood = receipt.items.some(item => 
        item.menuType === 'food' || 
        item.category?.toLowerCase().includes('food') ||
        item.category?.toLowerCase().includes('meal') ||
        item.category?.toLowerCase().includes('dish')
      );
      
      if (hasFood) {
        const kitchenContent = formatReceiptForPrinter({
          settings,
          receipt,
          printerType: 'kitchen'
        });
        
        // Print multiple copies if configured
        const copies = settings.kitchenPrinter.copies || 1;
        let kitchenSuccess = true;
        
        for (let i = 0; i < copies; i++) {
          const success = await printToPrinter(kitchenContent, 'kitchen');
          if (!success) {
            kitchenSuccess = false;
          }
          // Small delay between copies
          if (i < copies - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        results.kitchen = kitchenSuccess;
        
        if (results.kitchen) {
          console.log('Kitchen order printed successfully');
        } else {
          console.error('Failed to print kitchen order');
        }
      } else {
        console.log('No food items, skipping kitchen print');
        results.kitchen = true; // Nothing to print, consider it successful
      }
    }

    // Update print status in database
    try {
      await fetch(`/api/receipts/${receipt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerReceiptPrinted: results.customer,
          kitchenReceiptPrinted: results.kitchen,
          ...(receipt.isReprint ? { reprintCount: (receipt.reprintCount || 0) + 1 } : {})
        })
      });
    } catch (error) {
      console.error('Failed to update print status:', error);
    }

    return results;
  } catch (error) {
    console.error('Printing failed:', error);
    return results;
  }
}

// Universal print function
export async function printToPrinter(
  content: string, 
  printerType: 'customer' | 'kitchen'
): Promise<boolean> {
  
  // Determine connection type based on printer
  const connectionType = printerType === 'kitchen' ? 'bluetooth' : 'usb';
  
  console.log(`Printing to ${printerType} printer via ${connectionType}...`);
  
  // Try appropriate connection method
  if (connectionType === 'bluetooth') {
    return await tryBluetoothPrint(content);
  } else {
    return await tryUSBPrint(content);
  }
}

// WebUSB printing
async function tryUSBPrint(content: string): Promise<boolean> {
  try {
    // Try WebUSB first (for Chrome/Edge)
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [{ vendorId: 0x0416 }] // Xprinter vendor ID
        });
        
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        
        const commands = getESCPOSCommands(content);
        await device.transferOut(1, commands);
        await device.close();
        
        toast.success(`USB printer connected and printing`);
        return true;
      } catch (usbError) {
        console.log('USB printing failed, trying OTG fallback:', usbError);
      }
    }
    
    // Fallback for USB-OTG (most common on Android tablets)
    return await tryOTGPrint(content);
    
  } catch (error) {
    console.error('USB print failed:', error);
    return await fallbackPrint(content, 'customer');
  }
}

async function tryOTGPrint(content: string): Promise<boolean> {
  // For Android tablets, try to use the USB device directly
  try {
    // On Android Chrome, this might work through WebUSB
    // The false return will trigger fallback print
    console.log('Attempting USB-OTG direct connection...');
    
    // You could add a toast notification here
    toast.info('Please ensure USB printer is connected via OTG cable');
    
    return false; // Return false to trigger fallback print with instructions
  } catch (error) {
    return false;
  }
}

// WebSerial printing
async function tryWebSerialPrint(content: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      const writer = port.writable.getWriter();
      const commands = getESCPOSCommands(content);
      
      await writer.write(commands);
      writer.releaseLock();
      await port.close();
      
      return true;
    }
  } catch (error) {
    console.log('WebSerial printing failed:', error);
  }
  return false;
}

// Bluetooth Printing (for kitchen printer)
export async function tryBluetoothPrint(content: string): Promise<boolean> {
  try {
    // Check if Web Bluetooth API is supported
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        // Request Bluetooth device
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { namePrefix: 'XP-58' }, // Xprinter naming convention
            { services: ['00001101-0000-1000-8000-00805f9b34fb'] } // Serial Port Profile
          ],
          optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
        });
        
        console.log('Bluetooth device selected:', device.name);
        
        // Connect to the printer
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb');
        
        // Send data
        const commands = getESCPOSCommands(content);
        await characteristic.writeValue(commands);
        
        // Disconnect
        await server.disconnect();
        
        toast.success(`Kitchen printer connected via Bluetooth`);
        return true;
      } catch (btError) {
        console.log('Web Bluetooth failed:', btError);
      }
    }
    
    // For Android tablets, many POS apps handle Bluetooth natively
    console.log('Bluetooth printing requires app integration or fallback');
    return false;
    
  } catch (error) {
    console.error('Bluetooth print failed:', error);
    return await fallbackPrint(content, 'kitchen');
  }
}

// Enhanced fallback print with printer type
export async function fallbackPrint(content: string, printerType: 'customer' | 'kitchen'): Promise<boolean> {
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const title = printerType === 'kitchen' ? 'Kitchen Order' : 'Customer Receipt';
      const instructions = printerType === 'kitchen' 
        ? 'This should print on the KITCHEN printer (Bluetooth)'
        : 'This should print on the CUSTOMER printer (USB)';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - Print Preview</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 58mm; 
                margin: 0 auto; 
                white-space: pre-wrap;
                padding: 5px;
              }
              .printer-info {
                background: ${printerType === 'kitchen' ? '#fff3cd' : '#d1ecf1'};
                border: 1px solid ${printerType === 'kitchen' ? '#ffeeba' : '#bee5eb'};
                color: ${printerType === 'kitchen' ? '#856404' : '#0c5460'};
                padding: 10px;
                margin-bottom: 10px;
                text-align: center;
                font-size: 14px;
                font-weight: bold;
              }
              pre {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                margin: 0;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            <div class="printer-info">
              <div>🔹 ${title} 🔹</div>
              <div style="font-size: 11px; margin-top: 5px;">${instructions}</div>
              <div style="font-size: 10px; margin-top: 3px;">Connection: ${printerType === 'kitchen' ? 'Bluetooth' : 'USB'}</div>
            </div>
            <pre>${content}</pre>
            <div style="text-align:center; margin-top:20px; padding:10px; border-top:1px solid #ccc;">
              <button onclick="window.print()" style="padding:10px 20px; background:#000; color:#fff; border:none; border-radius:5px; cursor:pointer; margin-right:10px;">
                Print ${title}
              </button>
              <button onclick="window.close()" style="padding:10px 20px; background:#666; color:#fff; border:none; border-radius:5px; cursor:pointer;">
                Close
              </button>
            </div>
            <script>
              // Auto-open print dialog
              setTimeout(() => {
                if (confirm('Make sure the ${printerType === 'kitchen' ? 'Bluetooth' : 'USB'} printer is ready. Click OK to print.')) {
                  window.print();
                }
              }, 1000);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Fallback print failed:', error);
    return false;
  }
}

// Preview receipt in browser
export function previewReceipt(
  receipt: ReceiptData,
  settings: ReceiptSettings,
  type: 'customer' | 'kitchen' = 'customer'
): void {
  const content = formatReceiptForPrinter({
    settings,
    receipt,
    printerType: type
  });

  const title = type === 'kitchen' ? 'Kitchen Order Preview' : 'Receipt Preview';
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 14px; 
              width: ${settings.receiptWidth}; 
              margin: 0 auto; 
              white-space: pre-wrap;
              padding: 20px;
            }
            pre {
              font-family: 'Courier New', monospace;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <pre>${content}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}