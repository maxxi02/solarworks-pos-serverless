'use client';

import { useState } from 'react';
import { X, FileText, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { ReceiptSettings } from '@/types/receipt';
import { useSocket } from '@/provider/socket-provider';
import { CompanionPrintButton } from '@/components/ui/companion-print-button';

interface Session {
  id?: string;
  _id?: string;
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  registerName: string;
  openingFund: number;
  actualCash?: number;
  expectedCash?: number;
  difference?: number;
  closeStatus?: string;
  status?: 'open' | 'closed' | string;
  cashOuts?: { amount: number; reason: string; date: string }[];
  snapshot?: {
    totalSales?: number;
    netSales?: number;
    totalDiscounts?: number;
    totalRefunds?: number;
    cashSales?: number;
    gcashSales?: number;
    splitSales?: number;
    transactions?: number;
    items?: number;
  };
}

interface Summary {
  totalSales: number;
  netSales: number;
  totalDiscounts: number;
  totalRefunds: number;
  cashSales?: number;
  gcashSales?: number;
  splitSales?: number;
  cashInDrawer: number;
  expectedCash: number;
  difference: number;
  closeStatus: string;
  openingFund: number;
  cashOuts: number;
  transactions: number;
  items: number;
  actualCash: number;
  presentAccumulatedSales?: number;
  previousAccumulatedSales?: number;
  tenders?: {
    cash: number;
    credit_card: number;
    pay_later: number;
    online: number;
    invoice: number;
    e_wallet: number;
    pay_in: number;
    gcash?: number;
  };
  discounts?: {
    sc: number;
    pwd: number;
    naac: number;
    solo_parent: number;
    other: number;
  };
}

interface ZReportModalProps {
  session: Session;
  summary: Summary;
  settings: ReceiptSettings;
  includeXReceipt?: boolean;
  onClose: () => void;
  onConfirmClose?: () => void;
}

export default function ZReportModal({
  session,
  summary,
  settings,
  includeXReceipt = false,
  onClose,
  onConfirmClose,
}: ZReportModalProps) {
  const { emitPrintZReport, companionStatus, isConnected } = useSocket();
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);

  const is58mm = settings.receiptWidth === '58mm';
  const zreading = settings.zreading;

  // Format currency
  const fmtP = (n: number) => `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  // Handle print via companion app
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const baseReportData = {
        businessName: settings.businessName || "RENDEZVOUS CAFE",
        locationAddress: settings.locationAddress || "123 Coffee St.",
        taxPin: settings.taxPin || "123-456-789-000",
        today: new Date().toLocaleDateString(),
        timeNow: new Date().toLocaleTimeString(),
        cashierName: session.cashierName,
        registerName: session.registerName,
        openedAt: session.openedAt,
        closedAt: session.closedAt || new Date().toISOString(),
        totalSales: summary.totalSales,
        totalDiscounts: summary.totalDiscounts,
        totalRefunds: summary.totalRefunds || 0,
        totalVoids: summary.cashOuts || 0, // Using cashOuts as voids for brevity
        netSales: summary.netSales,
        openingFund: summary.openingFund,
        cashEarned: summary.cashSales || summary.tenders?.cash || 0,
        expectedCash: summary.expectedCash,
        actualCash: summary.actualCash,
        difference: summary.difference,
        tenders: summary.tenders,
        discounts: summary.discounts,
        transactions: summary.transactions,
        items: summary.items,
        receiptMessage: settings.receiptMessage || "Thank you!",
        disclaimer: settings.disclaimer || "This is an official receipt",
        showCashierSignature: zreading.showCashierSignature,
      };

      if (isConnected && (companionStatus.usb || companionStatus.bt)) {
        if (includeXReceipt) {
          emitPrintZReport({ ...baseReportData, isXReading: true });
          // A short delay helps avoid jamming the thermal printer buffer
          await new Promise((resume) => setTimeout(resume, 1500));
        }
        
        emitPrintZReport({ ...baseReportData, isXReading: false });
        setHasPrinted(true);
      } else {
        // Fallback: browser print
        window.print();
        setHasPrinted(true);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Get status info
  const getStatusInfo = () => {
    switch (summary.closeStatus) {
      case 'balanced':
        return { icon: CheckCircle, color: 'text-green-600', label: 'Balanced' };
      case 'short':
        return { icon: AlertCircle, color: 'text-red-600', label: 'Short' };
      case 'over':
        return { icon: TrendingUp, color: 'text-blue-600', label: 'Over' };
      default:
        return { icon: FileText, color: 'text-gray-600', label: 'Preview' };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/90 p-4">
      <div
        className={`w-full ${is58mm ? 'max-w-[320px]' : 'max-w-[400px]'} rounded-lg bg-background border border-border shadow-md overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/50 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className={`h-5 w-5 ${statusInfo.color}`} />
            <h3 className="text-lg font-bold text-foreground">{includeXReceipt ? 'X + Z Report' : 'Z-Report'}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cashier Info Banner */}
        <div className="px-5 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-xs font-bold">
              {session.cashierName?.[0]?.toUpperCase() ?? 'C'}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none">Cashier</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{session.cashierName}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground leading-none">Register</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{session.registerName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto" data-lenis-prevent>
          <div
            className={`font-mono ${is58mm ? 'text-xs' : 'text-sm'} bg-background p-4 border-2 border-dashed border-border rounded-lg`}
            style={{ lineHeight: '1.5' }}
          >
            {/* Header Section */}
            {settings.showLogo && settings.logoPreview && (
              <div className="mb-3 flex justify-center">
                <img src={settings.logoPreview} alt="Logo" className="h-12 object-contain" />
              </div>
            )}

            {settings.sections.storeName?.header && !settings.sections.storeName?.disabled && (
              <div className="text-center font-black text-lg mb-1">{settings.businessName}</div>
            )}

            {settings.sections.locationAddress?.header && !settings.sections.locationAddress?.disabled && (
              <div className="text-center mb-1 text-xs font-bold">{settings.locationAddress}</div>
            )}

            {settings.sections.phoneNumber?.header && !settings.sections.phoneNumber?.disabled && (
              <div className="text-center mb-2 text-xs font-bold">{settings.phoneNumber}</div>
            )}

            <div className="text-center font-bold text-xs text-gray-500 my-2">
              {'•'.repeat(is58mm ? 28 : 36)}
            </div>

            {/* Report Title */}
            <div className="text-center font-black text-base mb-2">
              Z-READING REPORT
            </div>

            {/* Session Info */}
            <div className="mb-2 text-xs space-y-1 font-bold">
              <div className="flex justify-between">
                <span className="font-extrabold">Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Cashier:</span>
                <span>{session.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Register:</span>
                <span>{session.registerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold">Session:</span>
                <span>{session.openedAt}</span>
              </div>
            </div>

            <div className="text-center font-bold text-xs text-gray-500 my-2">
              {'•'.repeat(is58mm ? 28 : 36)}
            </div>

            {/* Sales Summary */}
            <div className="mb-2 text-xs">
              <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                <span>SALES SUMMARY</span>
                <span></span>
              </div>

              <div className="flex justify-between font-bold mb-1">
                <span>Total Sales:</span>
                <span>{fmtP(summary.totalSales)}</span>
              </div>

              {zreading?.showDiscounts && summary.totalDiscounts > 0 && (
                <div className="flex justify-between text-green-600 font-bold mb-1">
                  <span>Discounts:</span>
                  <span>-{fmtP(summary.totalDiscounts)}</span>
                </div>
              )}

              {summary.totalRefunds > 0 && (
                <div className="flex justify-between text-red-600 font-bold mb-1">
                  <span>Refunds:</span>
                  <span>-{fmtP(summary.totalRefunds)}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold border-t border-dashed border-gray-400 pt-1 mt-1">
                <span>Net Sales:</span>
                <span>{fmtP(summary.netSales)}</span>
              </div>
            </div>

            {/* VAT Section */}
            {zreading?.showVAT && (
              <>
                <div className="text-center font-bold text-xs text-gray-500 my-2">
                  {'•'.repeat(is58mm ? 28 : 36)}
                </div>

                <div className="mb-2 text-xs">
                  <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                    <span>VAT ({zreading.vatPercentage}%)</span>
                    <span></span>
                  </div>

                  <div className="flex justify-between font-bold mb-1">
                    <span>VATTable Sales:</span>
                    <span>{fmtP(summary.netSales / (1 + zreading.vatPercentage / 100))}</span>
                  </div>

                  <div className="flex justify-between font-bold mb-1">
                    <span>VAT Amount:</span>
                    <span>{fmtP(summary.netSales - summary.netSales / (1 + zreading.vatPercentage / 100))}</span>
                  </div>

                  <div className="flex justify-between font-extrabold border-t border-dashed border-gray-400 pt-1 mt-1">
                    <span>VAT-Exempt:</span>
                    <span>₱0.00</span>
                  </div>
                </div>
              </>
            )}

            {/* Discount Breakdown */}
            {zreading?.showDiscounts && summary.discounts && (
              <>
                <div className="text-center font-bold text-xs text-gray-500 my-2">
                  {'•'.repeat(is58mm ? 28 : 36)}
                </div>

                <div className="mb-2 text-xs">
                  <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                    <span>DISCOUNT BREAKDOWN</span>
                    <span></span>
                  </div>

                  {zreading.discountTypes.sc && summary.discounts.sc > 0 && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>SC:</span>
                      <span>{fmtP(summary.discounts.sc)}</span>
                    </div>
                  )}

                  {zreading.discountTypes.pwd && summary.discounts.pwd > 0 && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>PWD:</span>
                      <span>{fmtP(summary.discounts.pwd)}</span>
                    </div>
                  )}

                  {zreading.discountTypes.naac && summary.discounts.naac > 0 && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>NAAC:</span>
                      <span>{fmtP(summary.discounts.naac)}</span>
                    </div>
                  )}

                  {zreading.discountTypes.soloParent && summary.discounts.solo_parent > 0 && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Solo Parent:</span>
                      <span>{fmtP(summary.discounts.solo_parent)}</span>
                    </div>
                  )}

                  {zreading.discountTypes.other && summary.discounts.other > 0 && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Other:</span>
                      <span>{fmtP(summary.discounts.other)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Payment Methods */}
            {zreading?.showPayments && (
              <>
                <div className="text-center font-bold text-xs text-gray-500 my-2">
                  {'•'.repeat(is58mm ? 28 : 36)}
                </div>

                <div className="mb-2 text-xs">
                  <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                    <span>PAYMENT METHODS</span>
                    <span></span>
                  </div>

                  {zreading.showPayments.cash && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Cash:</span>
                      <span>{fmtP(summary.tenders?.cash || summary.cashSales || 0)}</span>
                    </div>
                  )}

                  {zreading.showPayments.gcash && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>GCash:</span>
                      <span>{fmtP(summary.tenders?.gcash || summary.gcashSales || 0)}</span>
                    </div>
                  )}

                  {zreading.showPayments.creditCard && summary.tenders?.credit_card && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Credit Card:</span>
                      <span>{fmtP(summary.tenders.credit_card)}</span>
                    </div>
                  )}

                  {zreading.showPayments.online && summary.tenders?.online && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Online:</span>
                      <span>{fmtP(summary.tenders.online)}</span>
                    </div>
                  )}

                  {zreading.showPayments.payLater && summary.tenders?.pay_later && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Pay Later:</span>
                      <span>{fmtP(summary.tenders.pay_later)}</span>
                    </div>
                  )}

                  {zreading.showPayments.invoice && summary.tenders?.invoice && (
                    <div className="flex justify-between font-bold mb-1">
                      <span>Invoice:</span>
                      <span>{fmtP(summary.tenders.invoice)}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Cash Management */}
            <div className="text-center font-bold text-xs text-gray-500 my-2">
              {'•'.repeat(is58mm ? 28 : 36)}
            </div>

            <div className="mb-2 text-xs">
              <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                <span>CASH MANAGEMENT</span>
                <span></span>
              </div>

              <div className="flex justify-between font-bold mb-1">
                <span>Opening Fund:</span>
                <span>{fmtP(summary.openingFund)}</span>
              </div>

              <div className="flex justify-between font-bold mb-1">
                <span>Cash Sales:</span>
                <span>{fmtP(summary.tenders?.cash || summary.cashSales || 0)}</span>
              </div>

              {summary.cashOuts > 0 && (
                <div className="flex justify-between text-red-600 font-bold mb-1">
                  <span>Cash Outs:</span>
                  <span>-{fmtP(summary.cashOuts)}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold border-t border-dashed border-gray-400 pt-1 mt-1">
                <span>Expected Cash:</span>
                <span>{fmtP(summary.expectedCash)}</span>
              </div>

              <div className="flex justify-between font-bold mb-1">
                <span>Actual Cash:</span>
                <span>{fmtP(summary.actualCash)}</span>
              </div>

              {summary.difference !== 0 && (
                <div className={`flex justify-between font-extrabold ${summary.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>{summary.difference > 0 ? 'Overage:' : 'Shortage:'}</span>
                  <span>{fmtP(Math.abs(summary.difference))}</span>
                </div>
              )}
            </div>

            {/* Transaction Stats */}
            <div className="text-center font-bold text-xs text-gray-500 my-2">
              {'•'.repeat(is58mm ? 28 : 36)}
            </div>

            <div className="mb-2 text-xs">
              <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                <span>STATISTICS</span>
                <span></span>
              </div>

              <div className="flex justify-between font-bold mb-1">
                <span>Transactions:</span>
                <span>{summary.transactions}</span>
              </div>

              <div className="flex justify-between font-bold mb-1">
                <span>Items Sold:</span>
                <span>{summary.items}</span>
              </div>

              {zreading?.showBeginningEndingSI && (
                <>
                  <div className="flex justify-between font-bold mb-1">
                    <span>Beginning SI:</span>
                    <span>0</span>
                  </div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>Ending SI:</span>
                    <span>{summary.transactions}</span>
                  </div>
                </>
              )}
            </div>

            {/* Accumulated Sales */}
            {summary.presentAccumulatedSales !== undefined && (
              <>
                <div className="text-center font-bold text-xs text-gray-500 my-2">
                  {'•'.repeat(is58mm ? 28 : 36)}
                </div>

                <div className="mb-2 text-xs">
                  <div className="flex justify-between font-extrabold border-b border-dashed border-gray-400 pb-1 mb-1">
                    <span>ACCUMULATED SALES</span>
                    <span></span>
                  </div>

                  <div className="flex justify-between font-bold mb-1">
                    <span>Previous:</span>
                    <span>{fmtP(summary.previousAccumulatedSales || 0)}</span>
                  </div>

                  <div className="flex justify-between font-bold mb-1">
                    <span>Current:</span>
                    <span>{fmtP(summary.presentAccumulatedSales)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Status */}
            <div className="text-center font-bold text-xs text-gray-500 my-2">
              {'•'.repeat(is58mm ? 28 : 36)}
            </div>

            <div className="mb-2 text-xs">
              <div className={`text-center font-black ${statusInfo.color}`}>
                STATUS: {statusInfo.label.toUpperCase()}
              </div>
            </div>

            {/* Cashier signature line */}
            {zreading?.showCashierSignature && (
              <div className="mt-4 pt-2 border-t border-dashed border-gray-400">
                <div className="flex justify-between text-xs">
                  <div className="text-center">
                    <div className="mb-6">Cashier</div>
                    <div className="border-t border-gray-400 w-24 mx-auto"></div>
                  </div>
                  {zreading?.showManagerSignature && (
                    <div className="text-center">
                      <div className="mb-6">Manager</div>
                      <div className="border-t border-gray-400 w-24 mx-auto"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {zreading?.includeDisclaimer && zreading?.zreportFooter && (
              <div className="mt-2 text-center font-bold text-xs text-gray-500">
                {zreading.zreportFooter}
              </div>
            )}

            {settings.sections.disclaimer?.disabled === false && settings.disclaimer && (
              <div className="mt-1 text-center font-bold text-xs text-gray-500">
                {settings.disclaimer}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            <span className={`font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>

          {summary.difference !== 0 && (
            <div className="mt-2 text-center text-xs text-muted-foreground">
              {summary.difference > 0
                ? `Over by ${fmtP(summary.difference)}`
                : `Short by ${fmtP(Math.abs(summary.difference))}`}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-border bg-background hover:bg-muted text-foreground font-medium text-sm rounded-md transition-colors"
            >
              {onConfirmClose ? 'Back' : 'Close'}
            </button>

            {onConfirmClose ? (
              <div className="flex-1">
                <CompanionPrintButton
                  onClick={async () => { await handlePrint(); onConfirmClose(); }}
                  isPrinting={isPrinting}
                  hasPrinted={hasPrinted}
                  label={includeXReceipt ? 'Print X + Z & Close' : 'Print Z & Close'}
                />
              </div>
            ) : (
              <div className="flex-1">
                <CompanionPrintButton
                  onClick={handlePrint}
                  isPrinting={isPrinting}
                  hasPrinted={hasPrinted}
                  label={includeXReceipt ? 'Print X + Z Reports' : 'Print Z-Report'}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
