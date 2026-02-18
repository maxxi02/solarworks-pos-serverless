"use client";

import { Receipt, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReceiptOrder } from './pos.types';
import { formatCurrency, DISCOUNT_RATE } from './pos.utils';

interface ReceiptModalProps {
  receipt: ReceiptOrder | null;
  settings: any;
  onClose: () => void;
  onPrint: () => void;
}

export const ReceiptModal = ({ receipt, settings, onClose, onPrint }: ReceiptModalProps) => {
  if (!receipt || !settings) return null;

  const is58mm = settings.receiptWidth === '58mm';
  const dash = '-'.repeat(is58mm ? 24 : 32);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${is58mm ? 'max-w-[320px]' : 'max-w-[380px]'} rounded-xl bg-white dark:bg-gray-900 border shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            <span>{receipt.isReprint ? 'REPRINT' : 'RECEIPT'}</span>
          </h3>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div id="receipt-content" className={`font-mono ${is58mm ? 'text-[10px]' : 'text-xs'} bg-white dark:bg-black p-4`}>

            {/* Logo */}
            {settings.showLogo && settings.logoPreview && (
              <div className="mb-2 flex justify-center">
                <img src={settings.logoPreview} alt="Logo" className="h-12 object-contain mx-auto" style={{ maxHeight: settings.logoSize || '48px' }} />
              </div>
            )}

            {/* Store Info */}
            {settings.sections?.storeName?.header && !settings.sections?.storeName?.disabled && (
              <div className="text-center font-bold mb-1">{settings.businessName}</div>
            )}
            {settings.sections?.locationAddress?.header && !settings.sections?.locationAddress?.disabled && settings.locationAddress && (
              <div className="text-center mb-1 text-[10px]">{settings.locationAddress}</div>
            )}
            {settings.sections?.phoneNumber?.header && !settings.sections?.phoneNumber?.disabled && settings.phoneNumber && (
              <div className="text-center mb-1 text-[10px]">{settings.phoneNumber}</div>
            )}

            <div className="text-center mb-1">{dash}</div>

            {/* Order Details */}
            <div className="mb-1 text-[10px]">
              {[
                ['Order #:', receipt.orderNumber],
                ['Date:', `${new Date(receipt.timestamp).toLocaleDateString()}, ${new Date(receipt.timestamp).toLocaleTimeString()}`],
                ['Cashier:', receipt.cashier || 'Cashier'],
                ['Customer:', receipt.customerName],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              {settings.sections?.transactionType?.header && !settings.sections?.transactionType?.disabled && (
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="uppercase">{receipt.orderType}</span>
                </div>
              )}
              {settings.sections?.orderType?.header && !settings.sections?.orderType?.disabled && receipt.tableNumber && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span>{receipt.tableNumber}</span>
                </div>
              )}
              {receipt.orderNote && (
                <div className="flex justify-between">
                  <span>Note:</span>
                  <span>{receipt.orderNote}</span>
                </div>
              )}
            </div>

            <div className="text-center mb-1">{dash}</div>

            {/* Senior/PWD IDs */}
            {settings.sections?.customerInfo?.footer && !settings.sections?.customerInfo?.disabled && receipt.seniorPwdIds?.length && (
              <div className="mb-1 text-[10px]">
                <div>Senior/PWD IDs: {receipt.seniorPwdIds.join(', ')}</div>
              </div>
            )}

            {/* Items */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between font-bold mb-1">
                <span>Item</span>
                <span>Qty Amount</span>
              </div>

              {receipt.items.filter(i => !i.hasDiscount).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{item.quantity} {formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}

              {receipt.items.filter(i => i.hasDiscount).map((item, idx) => {
                const discountedPrice = item.price * (1 - DISCOUNT_RATE);
                return (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <span>{item.name}</span>
                      <span>{item.quantity} {formatCurrency(discountedPrice * item.quantity)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 text-[8px] pl-2">
                      <span>  (20% Senior/PWD)</span>
                      <span>-{formatCurrency(item.price * item.quantity * DISCOUNT_RATE)}</span>
                    </div>
                  </div>
                );
              })}

              {settings.showSKU && receipt.items.map(item => (
                <div key={`sku-${item._id}`} className="text-[8px] text-gray-500">
                  SKU: {item._id.slice(-6)}
                </div>
              ))}
            </div>

            <div className="text-center mb-1">{dash}</div>

            {/* Totals */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discountTotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(receipt.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
            </div>

            <div className="text-center mb-1">{dash}</div>

            {/* Payment */}
            <div className="mb-1 text-[10px]">
              <div className="flex justify-between mb-1">
                <span>Payment:</span>
                <span className="uppercase">{receipt.paymentMethod}</span>
              </div>

              {receipt.paymentMethod === 'split' && receipt.splitPayment && (
                <>
                  <div className="space-y-1 text-[8px] mb-1">
                    <div className="flex justify-between"><span>Cash:</span><span>{formatCurrency(receipt.splitPayment.cash)}</span></div>
                    <div className="flex justify-between"><span>GCash:</span><span>{formatCurrency(receipt.splitPayment.gcash)}</span></div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 my-1" />
                  <div className="text-right font-bold">{formatCurrency(receipt.splitPayment.cash + receipt.splitPayment.gcash)}</div>
                  <div className="text-right text-muted-foreground">-{formatCurrency(receipt.total)}</div>
                  <div className="border-t border-dashed border-gray-300 my-1" />
                  {(receipt.splitPayment.cash + receipt.splitPayment.gcash) > receipt.total && (
                    <div className="flex justify-between font-bold">
                      <span>CHANGE:</span>
                      <span className="text-green-600">{formatCurrency((receipt.splitPayment.cash + receipt.splitPayment.gcash) - receipt.total)}</span>
                    </div>
                  )}
                </>
              )}

              {receipt.paymentMethod === 'cash' && receipt.amountPaid && (
                <>
                  <div className="text-right font-bold">{formatCurrency(receipt.amountPaid)}</div>
                  <div className="text-right text-muted-foreground">-{formatCurrency(receipt.total)}</div>
                  <div className="border-t border-dashed border-gray-300 my-1" />
                  <div className="flex justify-between font-bold">
                    <span>CHANGE:</span>
                    <span className="text-green-600">{formatCurrency(receipt.change || 0)}</span>
                  </div>
                </>
              )}

              {receipt.paymentMethod === 'gcash' && (
                <div className="flex justify-between">
                  <span>GCash Received:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
              )}
            </div>

            {/* Footer Sections */}
            {settings.sections?.barcode?.header && !settings.sections?.barcode?.disabled && (
              <div className="mt-2 text-center text-[8px]"><div>[BARCODE: {receipt.orderNumber}]</div></div>
            )}
            {settings.showBusinessHours && settings.businessHours && (
              <div className="mt-2 text-center text-[8px]"><div>{settings.businessHours}</div></div>
            )}
            {settings.showTaxPIN && settings.taxPin && (
              <div className="mt-1 text-center text-[8px]"><div>Tax PIN: {settings.taxPin}</div></div>
            )}
            {settings.sections?.message?.footer && !settings.sections?.message?.disabled && settings.receiptMessage && (
              <div className="mt-2 text-center text-[8px]"><div>{settings.receiptMessage}</div></div>
            )}
            {!settings.sections?.disclaimer?.disabled && settings.disclaimer && (
              <div className="mt-1 text-center text-[8px]"><div>{settings.disclaimer}</div></div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 bg-gray-50 dark:bg-gray-800 p-3 sticky bottom-0">
          <div className="flex gap-2">
            <Button onClick={onPrint} className="flex-1 gap-2 h-11 text-base font-extrabold" size="default">
              <Printer className="w-5 h-5" />PRINT RECEIPT
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 h-11 text-base font-extrabold" size="default">
              CLOSE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};