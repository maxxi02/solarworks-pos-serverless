'use client';

import { useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  session: any;
  summary: any;
  settings: any;
  onClose: () => void;
  onConfirmClose?: () => void;
}

const TENDER_LABELS: Record<string, string> = {
  cash: 'CASH', 
  credit_card: 'CREDIT', 
  pay_later: 'PY LTR',
  online: 'ONLINE', 
  invoice: 'INVOICE', 
  e_wallet: 'EWALLET', 
  pay_in: 'PAYIN'
};

export default function ZReportModal({ session, summary, settings, onClose, onConfirmClose }: Props) {
  // Format helpers
  const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtP = (n: number) => `₱${fmt(n)}`;

  // Get values from summary with fallbacks
  const todayEarnings = summary.netSales || 0;
  const totalSales = summary.totalSales || 0;
  const totalDiscounts = summary.totalDiscounts || 0;
  
  // Get actual cash from summary
  const actualCash = summary.actualCash || 0;
  const expectedCash = summary.expectedCash || summary.cashEarned || 0;
  const difference = actualCash - expectedCash;
  const isBalanced = Math.abs(difference) < 0.01;

  const today = new Date().toLocaleDateString('en-PH', { 
    year: 'numeric', month: '2-digit', day: '2-digit' 
  });
  
  const timeNow = new Date().toLocaleTimeString('en-PH', { 
    hour: '2-digit', minute: '2-digit' 
  });

  // Get ZReading settings with defaults
  const zreading = settings?.zreading || {};
  const showVAT = zreading.showVAT !== false;
  const vatPercentage = zreading.vatPercentage || 12;
  const showBegEndSI = zreading.showBegEndSI !== false;
  const showVoidSummary = zreading.showVoidSummary !== false;
  const showReturnSummary = zreading.showReturnSummary !== false;
  const showCashierSignature = zreading.showCashierSignature !== false;

  // Discount settings
  const discountSettings = zreading.discounts || {};
  const showSC = discountSettings.sc !== false;
  const showPWD = discountSettings.pwd !== false;
  const showNAAC = discountSettings.naac !== false;
  const showSoloParent = discountSettings.solo_parent !== false;
  const showOtherDisc = discountSettings.other !== false;

  // Payment method settings
  const paymentSettings = zreading.payments || {};

  // Filter active tenders
  const getActiveTenders = () => {
    return Object.entries(summary.tenders || {})
      .filter(([k, v]) => {
        const isEnabled = paymentSettings[k] !== false;
        const value = typeof v === 'number' ? v : 0;
        return isEnabled && (value > 0 || k === 'cash');
      });
  };

  // Filter active discounts
  const getActiveDiscounts = () => {
    const discounts: { key: string; label: string; value: number }[] = [];
    
    if (showSC && summary.discounts?.sc > 0) {
      discounts.push({ key: 'sc', label: 'SC:', value: summary.discounts.sc });
    }
    if (showPWD && summary.discounts?.pwd > 0) {
      discounts.push({ key: 'pwd', label: 'PWD:', value: summary.discounts.pwd });
    }
    if (showNAAC && summary.discounts?.naac > 0) {
      discounts.push({ key: 'naac', label: 'NAAC:', value: summary.discounts.naac });
    }
    if (showSoloParent && summary.discounts?.solo_parent > 0) {
      discounts.push({ key: 'solo', label: 'SOLO:', value: summary.discounts.solo_parent });
    }
    if (showOtherDisc && summary.discounts?.other > 0) {
      discounts.push({ key: 'other', label: 'OTHER:', value: summary.discounts.other });
    }
    
    return discounts;
  };

  const is58mm = settings.receiptWidth === '58mm';
  const dash = '-'.repeat(is58mm ? 24 : 32);

  const handlePrint = () => {
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

    const shortOverHtml = isBalanced
      ? `<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:3px 0;color:#000000;">✓ BALANCED ✓</div>`
      : difference < 0
        ? `<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:3px 0;color:#000000;">⚠ SHORT: (${fmtP(Math.abs(difference))}) ⚠</div>`
        : `<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:3px 0;color:#000000;">⚠ OVER: +${fmtP(difference)} ⚠</div>`;

    const html = `<!DOCTYPE html>
<html>
<head><title>Z-Report</title>
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
  div, span, p, h1, h2, h3, h4, h5, h6 {
    color:#000000;
  }
  @media print {
    body { padding:2mm; }
    @page { margin:0;size:58mm auto; }
  }
</style>
</head>
<body>

${logoHtml}
<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:2px 0;color:#000000;">${settings?.businessName || 'Business Name'}</div>
${settings?.locationAddress ? `<div style="text-align:center;font-size:${fs};margin:2px 0;color:#000000;">${settings.locationAddress}</div>` : ''}
${settings?.taxPin ? `<div style="text-align:center;font-size:${fs};margin:2px 0;color:#000000;">TIN: ${settings.taxPin}</div>` : ''}

${Sep()}
<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;color:#000000;">Z-READING REPORT</div>
${Sep()}

${Row('Date:', today)}
${Row('Time:', timeNow)}
${Row('Cashier:', session?.cashierName || '—')}
${Row('Register:', session?.registerName || '—')}
${Row('Opened:', session?.openedAt?.split(',')[0] || '—')}
${Row('Closed:', session?.closedAt?.split(',')[0] || '—')}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;color:#000000;">TODAY'S SALES</div>
${Row('Gross Sales:', fmtP(totalSales))}
${Row('Discounts:', fmtP(totalDiscounts))}
${showReturnSummary ? Row('Returns:', fmtP(summary.totalRefunds || 0)) : ''}
${showVoidSummary ? Row('Voids:', fmtP(summary.totalVoids || 0)) : ''}
${Row('NET SALES:', fmtP(todayEarnings), true)}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;color:#000000;">CASH SUMMARY</div>
${Row('Opening Fund:', fmtP(summary.openingFund || 0))}
${Row('Cash Sales:', fmtP(summary.cashEarned || 0))}
${showReturnSummary ? Row('Cash Refunds:', fmtP(summary.totalRefunds || 0)) : ''}
${Row('Expected Cash:', fmtP(expectedCash), true)}
${Row('COUNTED CASH:', fmtP(actualCash), true)}
${Row('DIFFERENCE:', fmtP(difference), true)}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;color:#000000;">PAYMENT BREAKDOWN</div>
${getActiveTenders().map(([k, v]) => {
  const value = typeof v === 'number' ? v : 0;
  return Row(`${TENDER_LABELS[k]}:`, fmtP(value));
}).join('')}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;color:#000000;">DISCOUNTS</div>
${getActiveDiscounts().length > 0 
  ? getActiveDiscounts().map(d => Row(d.label, fmtP(d.value))).join('')
  : Row('No Discounts', '0.00')}
${Sep()}

${shortOverHtml}
${Sep()}

<div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0;color:#000000;">DAILY SUMMARY</div>
${Row('Total Transactions:', (summary.transactions || 0).toString())}
${Row('Total Items:', (summary.items || 0).toString())}
${Row('Net Income:', fmtP(todayEarnings), true)}
${Sep()}

${settings?.receiptMessage ? 
  `<div style="text-align:center;font-style:italic;font-size:${fs};margin-bottom:3px;color:#000000;">${settings.receiptMessage}</div>` : ''}

${showCashierSignature ? `
<div style="display:flex;justify-content:space-between;margin-top:15px;gap:8px">
  <div style="flex:1;text-align:center;font-size:${fs};color:#000000;">
    <div style="border-top:2px solid #000000;padding-top:2px;margin-top:15px;color:#000000;">Cashier</div>
  </div>
  <div style="flex:1;text-align:center;font-size:${fs};color:#000000;">
    <div style="border-top:2px solid #000000;padding-top:2px;margin-top:15px;color:#000000;">Manager</div>
  </div>
</div>
` : ''}

${Sep()}
<div style="text-align:center;font-size:${fs};margin:2px 0;color:#000000;">${settings?.disclaimer || 'Dizlog - RigelSoft PH'}</div>
<div style="text-align:center;font-weight:bold;font-size:${fsL};margin-top:4px;color:#000000;">*** END OF Z-REPORT ***</div>

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
  };

  const handlePrintAndClose = () => {
    handlePrint();
    if (onConfirmClose) {
      setTimeout(() => {
        onConfirmClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${is58mm ? 'max-w-[320px]' : 'max-w-[380px]'} rounded-xl bg-white border shadow-xl overflow-hidden`}>
        
        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-base flex items-center gap-2 text-black">
            <FileText className="h-5 w-5 text-orange-500" />
            <span>Z-Report Preview</span>
          </h3>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-200" onClick={onClose}>
            <X className="h-5 w-5 text-black" />
          </Button>
        </div>

        {/* Z-Report Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div id="zreport-content" className={`font-mono ${is58mm ? 'text-[10px]' : 'text-xs'} bg-white p-4 text-black`}>

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
            <div className="text-center font-bold text-sm mb-1 text-black">Z-READING REPORT</div>
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
                <span className="text-black">{session?.openedAt?.split(',')[0] || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Closed:</span>
                <span className="text-black">{session?.closedAt?.split(',')[0] || '—'}</span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* TODAY'S SALES */}
            <div className="bg-orange-50 p-2 rounded mb-2">
              <div className="text-center font-bold text-xs mb-1 text-black">TODAY'S SALES</div>
              <div className="flex justify-between text-[10px]">
                <span className="text-black">Gross Sales:</span>
                <span className="font-bold text-black">{fmtP(totalSales)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-black">Discounts:</span>
                <span className="text-black">-{fmtP(totalDiscounts)}</span>
              </div>
              {showReturnSummary && summary.totalRefunds > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-black">Returns:</span>
                  <span className="text-black">-{fmtP(summary.totalRefunds)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-orange-200 my-1" />
              <div className="flex justify-between font-bold text-xs">
                <span className="text-black">NET SALES:</span>
                <span className="text-black">{fmtP(todayEarnings)}</span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* CASH SUMMARY */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">CASH SUMMARY</div>
              <div className="flex justify-between">
                <span className="text-black">Opening Fund:</span>
                <span className="text-black">{fmtP(summary.openingFund || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Cash Sales:</span>
                <span className="text-black">{fmtP(summary.cashEarned || 0)}</span>
              </div>
              {showReturnSummary && summary.totalRefunds > 0 && (
                <div className="flex justify-between">
                  <span className="text-black">Cash Refunds:</span>
                  <span className="text-black">-{fmtP(summary.totalRefunds)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-gray-300 my-1" />
              <div className="flex justify-between font-bold">
                <span className="text-black">EXPECTED CASH:</span>
                <span className="text-black">{fmtP(expectedCash)}</span>
              </div>
              <div className="flex justify-between bg-blue-50 -mx-2 px-2 py-1 rounded font-bold">
                <span className="text-black">COUNTED CASH:</span>
                <span className="text-black">{fmtP(actualCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">DIFFERENCE:</span>
                <span className="text-black">
                  {difference < 0 ? `(${fmtP(Math.abs(difference))})` : fmtP(difference)}
                </span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* PAYMENT BREAKDOWN */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">PAYMENT BREAKDOWN</div>
              {getActiveTenders().map(([k, v]) => {
                const value = typeof v === 'number' ? v : 0;
                return (
                  <div key={k} className="flex justify-between">
                    <span className="text-black">{TENDER_LABELS[k]}:</span>
                    <span className="text-black">{fmtP(value)}</span>
                  </div>
                );
              })}
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* DISCOUNTS */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">DISCOUNTS</div>
              {getActiveDiscounts().length > 0 ? (
                getActiveDiscounts().map(d => (
                  <div key={d.key} className="flex justify-between">
                    <span className="text-black">{d.label}</span>
                    <span className="text-black">{fmtP(d.value)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-[8px] text-black">No discounts</div>
              )}
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* STATUS */}
            <div className={`text-center font-bold text-sm mb-1 text-black`}>
              {isBalanced ? '✓ BALANCED ✓' : difference < 0 ? `⚠ SHORT: (${fmtP(Math.abs(difference))}) ⚠` : `⚠ OVER: +${fmtP(difference)} ⚠`}
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* DAILY SUMMARY */}
            <div className="mb-1 text-[10px] text-black">
              <div className="text-center font-bold text-xs mb-1 text-black">DAILY SUMMARY</div>
              <div className="flex justify-between">
                <span className="text-black">Total Transactions:</span>
                <span className="text-black">{summary.transactions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">Total Items:</span>
                <span className="text-black">{summary.items || 0}</span>
              </div>
              <div className="flex justify-between font-bold mt-1">
                <span className="text-black">NET INCOME:</span>
                <span className="text-black">{fmtP(todayEarnings)}</span>
              </div>
            </div>

            <div className="text-center mb-1 text-black">{dash}</div>

            {/* Footer Sections */}
            {settings.receiptMessage && (
              <div className="mt-2 text-center text-[8px] text-black"><div className="text-black">{settings.receiptMessage}</div></div>
            )}

            {/* Signatures */}
            {showCashierSignature && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center text-[8px] text-black">
                  <div className="border-t border-gray-400 pt-1 mt-2 text-black">Cashier</div>
                </div>
                <div className="text-center text-[8px] text-black">
                  <div className="border-t border-gray-400 pt-1 mt-2 text-black">Manager</div>
                </div>
              </div>
            )}

            {settings.disclaimer && (
              <div className="mt-1 text-center text-[8px] text-black"><div className="text-black">{settings.disclaimer}</div></div>
            )}

            <div className="text-center font-bold text-xs mt-2 text-black">*** END OF Z-REPORT ***</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 bg-gray-50 p-3 sticky bottom-0">
          <div className="flex gap-2">
            <Button 
              onClick={handlePrintAndClose}
              className="flex-1 gap-2 h-11 text-base font-bold bg-orange-600 hover:bg-orange-700 text-white" 
              size="default"
            >
              <Printer className="w-5 h-5 text-white" />PRINT & CLOSE
            </Button>
            <Button 
              onClick={onConfirmClose || onClose} 
              variant="outline" 
              className="flex-1 h-11 text-base font-bold border-gray-300 text-gray-700 hover:bg-gray-50" 
              size="default"
            >
              CLOSE ONLY
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}