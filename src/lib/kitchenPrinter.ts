// lib/kitchenPrinter.ts
import { ReceiptSettings } from '@/types/receipt';
import { ReceiptData } from './receiptPrinter';
import { toast } from 'sonner';

// Import the missing functions from receiptPrinter
import { printToPrinter, fallbackPrint, tryBluetoothPrint } from './receiptPrinter';

interface KitchenPrintItem {
  name: string;
  quantity: number;
  category: string;
  cookingInstructions?: string;
  modifiers?: string[];
  tableNumber?: string;
  orderNumber: string;
  orderType: string;
  notes?: string;
}

export const formatKitchenReceipt = (
  items: KitchenPrintItem[],
  settings: ReceiptSettings,
  orderNumber: string,
  tableNumber?: string
): string => {
  const kitchenSettings = settings.kitchenPrinter || {
    enabled: true,
    printerName: 'XP-58 Kitchen',
    paperWidth: '58mm',
    copies: 1,
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
    content += `Order #: ${orderNumber}\n`;
  }
  
  content += `Time: ${new Date().toLocaleTimeString()}\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n`;
  
  if (kitchenSettings.printTableNumber && tableNumber) {
    content += `Table: ${tableNumber}\n`;
  }
  
  content += `Type: ${items[0]?.orderType || 'N/A'}\n`;
  content += divider + '\n';

  // Group items by category if enabled
  if (kitchenSettings.separateByCategory) {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, KitchenPrintItem[]>);

    Object.entries(grouped).forEach(([category, categoryItems]) => {
      content += `\n${category.toUpperCase()}\n`;
      content += thinDivider + '\n';
      
      categoryItems.forEach(item => {
        content += `${item.quantity}x ${item.name}\n`;
        
        if (kitchenSettings.printSpecialInstructions) {
          if (item.cookingInstructions) {
            content += `  Note: ${item.cookingInstructions}\n`;
          }
          if (item.modifiers && item.modifiers.length > 0) {
            content += `  Mod: ${item.modifiers.join(', ')}\n`;
          }
          if (item.notes) {
            content += `  Note: ${item.notes}\n`;
          }
        }
      });
    });
  } else {
    items.forEach(item => {
      content += `${item.quantity}x ${item.name}\n`;
      
      if (kitchenSettings.printSpecialInstructions) {
        if (item.cookingInstructions) {
          content += `  Note: ${item.cookingInstructions}\n`;
        }
        if (item.modifiers && item.modifiers.length > 0) {
          content += `  Mod: ${item.modifiers.join(', ')}\n`;
        }
        if (item.notes) {
          content += `  Note: ${item.notes}\n`;
        }
      }
    });
  }

  content += divider + '\n';
  
  // Footer
  content += centerText('*** PLEASE RUSH ***') + '\n';
  content += centerText('Thank you!') + '\n';
  content += centerText(new Date().toLocaleTimeString()) + '\n';
  
  // Add extra feeds for cutting
  content += '\n\n\n';

  return content;
};

// Test Bluetooth connection specifically for kitchen printer
export async function testBluetoothPrinter(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      toast.info('Scanning for Bluetooth printers...');
      
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'XP-58' },
          { namePrefix: 'Xprinter' },
          { services: ['00001101-0000-1000-8000-00805f9b34fb'] }
        ]
      });
      
      toast.success(`Found: ${device.name}`);
      return true;
    } else {
      toast.error('Web Bluetooth not supported in this browser');
      return false;
    }
  } catch (error) {
    console.error('Bluetooth test failed:', error);
    toast.error('No Bluetooth printer found');
    return false;
  }
}

// Print kitchen order with Bluetooth preference
export async function printKitchenOrderBluetooth(
  receipt: ReceiptData,
  settings: ReceiptSettings
): Promise<boolean> {
  try {
    // Fix: Include all required fields in the mapped items
    const kitchenItems: KitchenPrintItem[] = receipt.items
      .filter(item => item.menuType === 'food')
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category || 'Food',
        notes: item.notes,
        orderNumber: receipt.orderNumber,  // Added missing field
        orderType: receipt.orderType,      // Added missing field
        tableNumber: receipt.tableNumber,
        cookingInstructions: item.notes,
        modifiers: []
      }));

    if (kitchenItems.length === 0) return true;

    const content = formatKitchenReceipt(
      kitchenItems,
      settings,
      receipt.orderNumber,
      receipt.tableNumber
    );

    // Try Bluetooth first for kitchen printer
    const printed = await tryBluetoothPrint(content);
    
    if (!printed) {
      // Fallback to browser print with Bluetooth instructions
      return await fallbackPrint(content, 'kitchen');
    }
    
    return printed;
    
  } catch (error) {
    console.error('Kitchen print failed:', error);
    return false;
  }
}

// Print kitchen order
export async function printKitchenOrder(
  receipt: ReceiptData,
  settings: ReceiptSettings
): Promise<boolean> {
  try {
    // Filter only food items for kitchen and ensure all required fields are present
    const kitchenItems: KitchenPrintItem[] = receipt.items
      .filter(item => 
        item.menuType === 'food' || 
        item.category?.toLowerCase().includes('food') ||
        item.category?.toLowerCase().includes('meal') ||
        item.category?.toLowerCase().includes('dish')
      )
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category || 'Food',
        cookingInstructions: item.notes,
        modifiers: [], // You can add modifiers if needed from your data structure
        tableNumber: receipt.tableNumber,
        orderNumber: receipt.orderNumber,  // Required field
        orderType: receipt.orderType,      // Required field
        notes: item.notes
      }));

    if (kitchenItems.length === 0) {
      console.log('No kitchen items to print');
      return true; // Nothing to print, consider it successful
    }

    const kitchenSettings = settings.kitchenPrinter || {
      enabled: true,
      copies: 1
    };
    
    const copies = kitchenSettings.copies || 1;
    let allSuccessful = true;

    for (let i = 0; i < copies; i++) {
      const content = formatKitchenReceipt(
        kitchenItems,
        settings,
        receipt.orderNumber,
        receipt.tableNumber
      );

      // Use the imported printToPrinter function
      const success = await printToPrinter(content, 'kitchen');
      
      if (!success) {
        allSuccessful = false;
        console.error(`Failed to print kitchen copy ${i + 1}`);
      }

      // Small delay between copies
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update receipt as kitchen-printed (only if at least one copy succeeded)
    if (allSuccessful) {
      try {
        await fetch(`/api/receipts/${receipt.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kitchenReceiptPrinted: true })
        });
      } catch (error) {
        console.error('Failed to update kitchen print status:', error);
      }
    }

    return allSuccessful;
  } catch (error) {
    console.error('Failed to print kitchen order:', error);
    return false;
  }
}

// Preview kitchen receipt in browser (for testing)
export function previewKitchenReceipt(
  receipt: ReceiptData,
  settings: ReceiptSettings
): void {
  const kitchenItems: KitchenPrintItem[] = receipt.items
    .filter(item => item.menuType === 'food')
    .map(item => ({
      name: item.name,
      quantity: item.quantity,
      category: item.category || 'Food',
      cookingInstructions: item.notes,
      modifiers: [],
      tableNumber: receipt.tableNumber,
      orderNumber: receipt.orderNumber,  // Added missing field
      orderType: receipt.orderType,      // Added missing field
      notes: item.notes
    }));

  const content = formatKitchenReceipt(
    kitchenItems,
    settings,
    receipt.orderNumber,
    receipt.tableNumber
  );

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Kitchen Order Preview</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 14px; 
              width: ${settings.kitchenPrinter?.paperWidth || '58mm'}; 
              margin: 0 auto; 
              white-space: pre-wrap;
              padding: 10px;
            }
            pre {
              font-family: 'Courier New', monospace;
              font-size: 14px;
            }
            .print-btn {
              text-align: center;
              margin-top: 20px;
              padding: 10px;
              border-top: 1px solid #ccc;
            }
            button {
              padding: 10px 20px;
              background: #000;
              color: #fff;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              margin-right: 10px;
            }
            button:hover {
              opacity: 0.8;
            }
            button.close {
              background: #666;
            }
          </style>
        </head>
        <body>
          <pre>${content}</pre>
          <div class="print-btn">
            <button onclick="window.print()">Print Kitchen Order</button>
            <button class="close" onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
