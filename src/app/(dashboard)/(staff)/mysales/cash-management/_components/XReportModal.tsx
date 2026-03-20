'use client';

import { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/provider/socket-provider';
import { CompanionPrintButton } from '@/components/ui/companion-print-button';

interface Props {
  session: any;
  summary: any;
  settings: any;
  expectedCash: number;
  onClose: () => void;
}

const TENDER_LABELS: Record<string, string> = {
  cash: 'CASH',
  gcash: 'GCASH',
  split: 'SPLIT',
  credit_card: 'CREDIT',
  pay_later: 'PY LTR',
  online: 'ONLINE',
  invoice: 'INVOICE',
  e_wallet: 'EWALLET',
  pay_in: 'PAYIN'
};

export default function XReportModal({ session, summary, settings, expectedCash, onClose }: Props) {
  const { emitPrintZReport, companionStatus } = useSocket();
  const [isPrinting, setIsPrinting] = useState(false);
  // Format helpers
  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtP = (n: number) => `₱${fmt(n)}`;

  // Get values from summary
  const todayEarnings = summary.netSales || 0;
  const totalSales = summary.grossSales || summary.totalSales || 0;
  const totalDiscounts = summary.totalDiscounts || 0;
  
  const today = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  const timeNow = new Date().toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit'
  });

  // Get ZReading settings with defaults
  const zreading = settings?.zreading || {};
  const showReturnSummary = zreading.showReturnSummary !== false;

  // Filter active tenders — include all nonzero
  const tenders = {
    cash: summary.cashSales || 0,
    gcash: summary.gcashSales || 0,
    split: summary.splitSales || 0,
  };

  // Revenue totals
  const totalTendered = todayEarnings; // net sales = total tendered
  const cashOuts      = summary.cashOuts || 0;
  const totalRefunds  = summary.totalRefunds || 0;
  
  const getActiveTenders = () => {
    return Object.entries(tenders)
      .filter(([k, v]) => {
        const value = typeof v === 'number' ? v : 0;
        return value > 0 || k === 'cash';
      });
  };

  const is58mm = settings.receiptWidth === '58mm';
  const dash = '-'.repeat(is58mm ? 24 : 32);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const xReportData = {
        businessName: settings?.businessName,
        locationAddress: settings?.locationAddress,
        taxPin: settings?.taxPin,
        today,
        timeNow,
        cashierName: session?.cashierName,
        registerName: session?.registerName || 'Main Register',
        openedAt: session?.openedAt ? new Date(session.openedAt).toLocaleString() : '—',
        totalSales,
        totalDiscounts,
        totalRefunds: summary.totalRefunds || 0,
        totalVoids: summary.totalVoids || 0,
        netSales: todayEarnings,
        openingFund: session?.openingFund || 0,
        cashEarned: summary.cashSales || 0,
        expectedCash,
        tenders,
        transactions: summary.transactionCount || 0,
        items: summary.items || 0,
        receiptMessage: settings?.receiptMessage,
        disclaimer: settings?.disclaimer,
        isXReading: true,
      };

      if (companionStatus.usb || companionStatus.bt) {
        emitPrintZReport(xReportData);
        return;
      }

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) return;

    const fs = '11px';
    const fsL = '14px';

    const Row = (label: string, value: string, bold = false) =>
      `<div style="display:flex;justify-content:space-between;gap:4px;padding:2px 0;font-weight:${bold ? 'bold' : 'normal'};font-size:${fs};color:#000000;">
        <span style="text-align:left;color:#000000;">${label}</span>
        <span style="text-align:right;color:#000000;">${value}</span>
      </div>`;

    const Sep = () => `<div style="border-top:2px dashed #000000;margin:5px 0"></div>`;

    const logoHtml = settings?.showLogo && settings?.logoPreview
      ? `<div style="text-align:center;margin-bottom:5px">
           <img src="${settings.logoPreview}" style="max-height:40px;max-width:100%;object-fit:contain;margin:0 auto"/>
         </div>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><title>X-Reading Report</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box;color:#000000; }
  body {
    font-family:'Courier New',Courier,monospace;
    font-size:${fs};
    color:#000000;
    background:#ffffff;
    width:58mm;
    padding:3mm;
    line-height:1.5;
  }
  @media print {
    body { padding:2mm; }
    @page { margin:0;size:58mm auto; }
  }
</style>
</head>
<body>

${logoHtml}
<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:2px 0;">${settings?.businessName || 'Business Name'}</div>
${settings?.locationAddress ? `<div style="text-align:center;font-size:${fs};margin:2px 0;">${settings.locationAddress}</div>` : ''}
${settings?.taxPin ? `<div style="text-align:center;font-size:${fs};margin:2px 0;">TIN: ${settings.taxPin}</div>` : ''}

${Sep()}
<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;">X-READING REPORT</div>
${Sep()}

${Row('Date:', today)}
${Row('Time:', timeNow)}
${Row('Cashier:', session?.cashierName || '—')}
${Row('Register:', session?.registerName || '—')}
${Row('Opened:', session?.openedAt ? new Date(session.openedAt).toLocaleString() : '—')}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;">Cash</div>
${Row('Opening Amount:', fmtP(session?.openingFund || 0))}
${Row('Cash Sales:', fmtP(tenders.cash))}
${showReturnSummary ? Row('Cash Refunds:', fmtP(totalRefunds)) : ''}
${Row('Pay-Ins:', fmtP(0))}
${Row('Pay-Outs:', fmtP(cashOuts))}
${Row('Previous Closing Amount:', fmtP(expectedCash), true)}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;">Revenue</div>
${Row('Total Transactions:', (summary.transactionCount || 0).toString())}
${Row('Sales:', fmtP(totalSales))}
${Row('Discounts:', fmtP(totalDiscounts))}
${showReturnSummary ? Row('Refunds:', fmtP(totalRefunds)) : ''}
${Row('Service Charge:', fmtP(0))}
${Row('Net Sales:', fmtP(todayEarnings))}
${Row('Total Tendered:', fmtP(totalTendered), true)}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;">Breakdown of Sales</div>
${getActiveTenders().map(([k, v]) => Row(`${TENDER_LABELS[k] || k.toUpperCase()}:`, fmtP(v as number))).join('')}
${Sep()}

${settings?.receiptMessage ? `<div style="text-align:center;font-style:italic;font-size:${fs};margin-bottom:3px;">${settings.receiptMessage}</div>` : ''}
${settings?.disclaimer ? `<div style="text-align:center;font-size:${fs};margin:2px 0;">${settings.disclaimer}</div>` : ''}
<div style="text-align:center;font-weight:bold;font-size:${fsL};margin-top:4px;">*** END OF X-REPORT ***</div>

</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 500);
      }, 300);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${is58mm ? 'max-w-[320px]' : 'max-w-[380px]'} rounded-xl bg-white border shadow-xl overflow-hidden`}>

        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-base flex items-center gap-2 text-black">
            <FileText className="h-5 w-5 text-blue-500" />
            <span>X-Reading Preview</span>
          </h3>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-200" onClick={onClose}>
            <X className="h-5 w-5 text-black" />
          </Button>
        </div>

        {/* X-Report Content */}
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto" data-lenis-prevent>
          <div id="xreport-content" className={`font-mono ${is58mm ? 'text-[10px]' : 'text-xs'} bg-white p-4 text-black`}>

            {/* Logo */}
            {settings.showLogo && settings.logoPreview && (
              <div className="mb-2 flex justify-center">
                <img src={settings.logoPreview} alt="Logo" className="h-12 object-contain mx-auto" style={{ maxHeight: settings.logoSize || '48px' }} />
              </div>
            )}

            {/* Store Info */}
            <div className="text-center font-bold mb-1 text-black">{settings.businessName || 'Business Name'}</div>
            {settings.locationAddress && (
              <div className="text-center mb-1 text-[10px] text-black">{settings.locationAddress}</div>
            )}
            {settings.taxPin && (
              <div className="text-center mb-1 text-[10px] text-black">TIN: {settings.taxPin}</div>
            )}

            <div className="text-center mb-1 text-black">{dash}</div>
            <div className="text-center font-bold text-sm mb-1 text-black">X-READING REPORT</div>
            <div className="text-center mb-1 text-black">{dash}</div>

            {/* Date/Time Details */}
            <div className="mb-1 text-[10px] text-black">
              <div className="flex justify-between">
                <span className="text-black">Date:</span>
                <span className="text-black">{today}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Time:</span>
                <span className="text-black">{timeNow}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Cashier:</span>
                <span className="text-black">{session?.cashierName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Register:</span>
                <span className="text-black">{session?.registerName || 'Main Register'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Opened:</span>
                <span className="text-black">{session?.openedAt ? new Date(session.openedAt).toLocaleString() : '—'}</span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* CASH SECTION */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">Cash</div>
              <div className="flex justify-between">
                <span className="text-black">Opening Amount:</span>
                <span className="text-black">{fmtP(session?.openingFund || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Cash Sales:</span>
                <span className="text-black">{fmtP(tenders.cash)}</span>
              </div>
              {showReturnSummary && totalRefunds > 0 && (
                <div className="flex justify-between">
                  <span className="text-black">Cash Refunds:</span>
                  <span className="text-black">-{fmtP(totalRefunds)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-black">Pay-Ins:</span>
                <span className="text-black">{fmtP(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Pay-Outs:</span>
                <span className="text-black">-{fmtP(cashOuts)}</span>
              </div>
              <div className="border-t border-dashed border-gray-300 my-1" />
              <div className="flex justify-between font-bold">
                <span className="text-black">Previous Closing Amount:</span>
                <span className="text-black">{fmtP(expectedCash)}</span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* REVENUE SECTION */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">Revenue</div>
              <div className="flex justify-between">
                <span className="text-black">Total Transactions:</span>
                <span className="text-black">{summary.transactionCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Sales:</span>
                <span className="text-black">{fmtP(totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Discounts:</span>
                <span className="text-black">-{fmtP(totalDiscounts)}</span>
              </div>
              {showReturnSummary && totalRefunds > 0 && (
                <div className="flex justify-between">
                  <span className="text-black">Refunds:</span>
                  <span className="text-black">-{fmtP(totalRefunds)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-black">Service Charge:</span>
                <span className="text-black">{fmtP(0)}</span>
              </div>
              <div className="border-t border-dashed border-gray-300 my-1" />
              <div className="flex justify-between">
                <span className="text-black">Net Sales:</span>
                <span className="text-black">{fmtP(todayEarnings)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-black">Total Tendered:</span>
                <span className="text-black">{fmtP(totalTendered)}</span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* TENDER BREAKDOWN */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">Breakdown of Sales</div>
              {getActiveTenders().map(([k, v]) => {
                const value = typeof v === 'number' ? v : 0;
                return (
                  <div key={k} className="flex justify-between">
                    <span className="text-black">{TENDER_LABELS[k] || k.toUpperCase()}:</span>
                    <span className="text-black">{fmtP(value)}</span>
                  </div>
                );
              })}
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {settings.receiptMessage && (
              <div className="mt-2 text-center text-[8px] text-black"><div className="text-black">{settings.receiptMessage}</div></div>
            )}

            {settings.disclaimer && (
              <div className="mt-1 text-center text-[8px] text-black"><div className="text-black">{settings.disclaimer}</div></div>
            )}

            <div className="text-center font-bold text-xs mt-2 text-black">*** END OF X-REPORT ***</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 bg-gray-50 p-3 sticky bottom-0">
          <div className="flex gap-2">
            <div className="flex-1">
              <CompanionPrintButton
                onClick={() => { handlePrint(); onClose(); }}
                isPrinting={isPrinting}
                label="PRINT X-READING"
              />
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-11 text-base font-bold border-gray-300 text-gray-700 hover:bg-gray-50"
              size="default"
            >
              CLOSE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
