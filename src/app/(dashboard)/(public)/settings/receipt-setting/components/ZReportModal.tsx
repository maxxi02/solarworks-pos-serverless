// 'use client';

// import { useState } from 'react';
// import { X, Printer, FileText } from 'lucide-react';

// interface Props {
//   session: any;
//   summary: any;
//   settings: any;
//   onClose: () => void;
// }

// const TENDER_LABELS: Record<string, string> = {
//   cash: 'CASH', 
//   credit_card: 'CREDIT', 
//   pay_later: 'PY LTR',
//   online: 'ONLINE', 
//   invoice: 'INVOICE', 
//   e_wallet: 'EWALLET', 
//   pay_in: 'PAYIN'
// };

// export default function ZReportModal({ session, summary, settings, onClose }: Props) {
//   // Format helpers
//   const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
//   const fmtP = (n: number) => `₱${fmt(n)}`;

//   // Get today's earnings from summary
//   const todayEarnings = summary.netSales || 0;
//   const cashInDrawer = summary.cashInDrawer || 0;
//   const totalSales = summary.totalSales || 0;
//   const totalDiscounts = summary.totalDiscounts || 0;

//   const today = new Date().toLocaleDateString('en-PH', { 
//     year: 'numeric', month: '2-digit', day: '2-digit' 
//   });
  
//   const timeNow = new Date().toLocaleTimeString('en-PH', { 
//     hour: '2-digit', minute: '2-digit' 
//   });

//   // Get ZReading settings with defaults
//   const zreading = settings?.zreading || {};
//   const showVAT = zreading.showVAT !== false;
//   const vatPercentage = zreading.vatPercentage || 12;
//   const showBegEndSI = zreading.showBegEndSI !== false;
//   const showVoidSummary = zreading.showVoidSummary !== false;
//   const showReturnSummary = zreading.showReturnSummary !== false;
//   const showCashierSignature = zreading.showCashierSignature !== false;

//   // Discount settings - check kung alin ang enabled
//   const discountSettings = zreading.discounts || {};
//   const showSC = discountSettings.sc !== false;
//   const showPWD = discountSettings.pwd !== false;
//   const showNAAC = discountSettings.naac !== false;
//   const showSoloParent = discountSettings.solo_parent !== false;
//   const showOtherDisc = discountSettings.other !== false;

//   // Payment method settings
//   const paymentSettings = zreading.payments || {};

//   // Filter active tenders based on settings
//   const getActiveTenders = () => {
//     return Object.entries(summary.tenders || {})
//       .filter(([k, v]) => {
//         // Check if payment method is enabled in settings
//         const isEnabled = paymentSettings[k] !== false;
//         // Type guard: check if v is number
//         const value = typeof v === 'number' ? v : 0;
//         // Show only if enabled and has value > 0
//         return isEnabled && (value > 0 || k === 'cash');
//       });
//   };

//   // Filter active discounts based on settings
//   const getActiveDiscounts = () => {
//     const discounts: { key: string; label: string; value: number }[] = [];
    
//     if (showSC && summary.discounts?.sc > 0) {
//       discounts.push({ key: 'sc', label: 'SC:', value: summary.discounts.sc });
//     }
//     if (showPWD && summary.discounts?.pwd > 0) {
//       discounts.push({ key: 'pwd', label: 'PWD:', value: summary.discounts.pwd });
//     }
//     if (showNAAC && summary.discounts?.naac > 0) {
//       discounts.push({ key: 'naac', label: 'NAAC:', value: summary.discounts.naac });
//     }
//     if (showSoloParent && summary.discounts?.solo_parent > 0) {
//       discounts.push({ key: 'solo', label: 'SOLO:', value: summary.discounts.solo_parent });
//     }
//     if (showOtherDisc && summary.discounts?.other > 0) {
//       discounts.push({ key: 'other', label: 'OTHER:', value: summary.discounts.other });
//     }
    
//     return discounts;
//   };

//   // BUILD PRINT HTML
//   const buildPrintHTML = (): string => {
//     const w = '58mm';
//     const fs = '11px';
//     const fsS = '10px';
//     const fsL = '14px';

//     const Row = (label: string, value: string, bold = false) =>
//       `<div style="display:flex;justify-content:space-between;gap:4px;padding:2px 0;font-weight:${bold ? 'bold' : 'normal'};font-size:${fs}">
//         <span style="text-align:left">${label}</span>
//         <span style="text-align:right">${value}</span>
//       </div>`;

//     const Sep = () => `<div style="border-top:2px dashed #000;margin:5px 0"></div>`;
    
//     const Section = (title: string) =>
//       `<div style="text-align:center;font-weight:bold;margin:6px 0 2px;font-size:${fsL}">${title}</div>`;

//     const logoHtml = settings?.showLogo && settings?.logoPreview
//       ? `<div style="text-align:center;margin-bottom:5px">
//            <img src="${settings.logoPreview}" style="max-height:40px;max-width:100%;object-fit:contain;margin:0 auto"/>
//          </div>` : '';

//     const operatorLine = settings?.businessName
//       ? `<div style="text-align:center;font-size:${fsL};font-weight:bold;margin:2px 0">${settings.businessName}</div>` : '';

//     // Short/Over display
//     const totalExpected = summary.cashEarned || 0;
//     const totalCounted = summary.actualCash || summary.cashInDrawer || 0;
//     const totalDiff = totalCounted - totalExpected;
//     const isBalanced = Math.abs(totalDiff) < 0.01;

//     const shortOverHtml = isBalanced
//       ? `<div style="text-align:center;font-weight:bold;color:#166534;font-size:${fsL};margin:3px 0">✓ BALANCED ✓</div>`
//       : totalDiff < 0
//         ? `<div style="text-align:center;font-weight:bold;color:#b91c1c;font-size:${fsL};margin:3px 0">⚠ SHORT: (${fmtP(Math.abs(totalDiff))}) ⚠</div>`
//         : `<div style="text-align:center;font-weight:bold;color:#1d4ed8;font-size:${fsL};margin:3px 0">⚠ OVER: +${fmtP(totalDiff)} ⚠</div>`;

//     // VAT rows if enabled
//     const vatRows = showVAT ? `
//       ${Row('Vatable Sales:', fmtP(totalSales))}
//       ${Row(`VAT (${vatPercentage}%):`, fmtP(totalSales * (vatPercentage/100)))}
//       ${Row('VAT Exempt:', fmtP(summary.vatExempt || 0))}
//       ${Row('Zero Rated:', fmtP(summary.zeroRated || 0))}
//     ` : '';

//     // Discount rows - filtered by settings
//     const activeDiscounts = getActiveDiscounts();
//     const discountRows = activeDiscounts.length > 0 
//       ? activeDiscounts.map(d => Row(d.label, fmtP(d.value))).join('')
//       : Row('No Discounts', '0.00');

//     // Tender rows - filtered by payment settings
//     const activeTenders = getActiveTenders();
//     const tenderRows = activeTenders.length > 0
//       ? activeTenders.map(([k, v]) => {
//           const value = typeof v === 'number' ? v : 0;
//           return Row(`${TENDER_LABELS[k]}:`, fmtP(value));
//         }).join('')
//       : Row('No Payments', '0.00');

//     // Get expected for each tender
//     const getExpected = (k: string) => {
//       if (k === 'cash') return summary.cashEarned || 0;
//       const tenders = summary.tenders as Record<string, number>;
//       return tenders[k] || 0;
//     };

//     // Reconciliation rows - only for enabled payment methods
//     const reconRows = activeTenders.map(([k]) => {
//       const exp = getExpected(k);
//       const cnt = k === 'cash' ? (summary.actualCash || summary.cashInDrawer || 0) : exp;
//       const diff = cnt - exp;
//       const status = Math.abs(diff) < 0.01 ? '✓' : diff < 0 ? `(${fmtP(Math.abs(diff))})` : `+${fmtP(diff)}`;
//       const color = Math.abs(diff) < 0.01 ? '#166534' : diff < 0 ? '#b91c1c' : '#1d4ed8';
      
//       return `<div style="display:flex;justify-content:space-between;gap:4px;padding:2px 0;font-size:${fs}">
//         <span style="width:35%;text-align:left;font-weight:bold">${TENDER_LABELS[k]}</span>
//         <span style="width:20%;text-align:center">${fmtP(exp)}</span>
//         <span style="width:20%;text-align:center">${k === 'cash' ? fmtP(cnt) : '—'}</span>
//         <span style="width:25%;text-align:center;color:${k === 'cash' ? color : '#666'};font-weight:bold">
//           ${k === 'cash' ? status : '—'}
//         </span>
//       </div>`;
//     }).join('');

//     // Calculate total expected
//     const totalExpectedAll = (summary.cashEarned || 0) +
//       activeTenders.filter(([k]) => k !== 'cash').reduce((s, [, v]) => {
//         const value = typeof v === 'number' ? v : 0;
//         return s + value;
//       }, 0);

//     return `<!DOCTYPE html>
// <html>
// <head><title>Z-Report</title>
// <style>
//   * { margin:0;padding:0;box-sizing:border-box; }
//   body {
//     font-family:'Courier New',Courier,monospace;
//     font-size:${fs};
//     color:#000;
//     background:#fff;
//     width:58mm;
//     padding:3mm;
//     line-height:1.5;
//   }
//   @media print {
//     body { padding:2mm; }
//     @page { margin:0;size:58mm auto; }
//   }
//   .c { text-align:center; }
//   .b { font-weight:bold; }
// </style>
// </head>
// <body>

// ${logoHtml}
// ${operatorLine}
// ${settings?.locationAddress ? `<div style="text-align:center;font-size:${fs};margin:2px 0">${settings.locationAddress}</div>` : ''}
// ${settings?.taxPin ? `<div style="text-align:center;font-size:${fs};margin:2px 0">TIN: ${settings.taxPin}</div>` : ''}
// <div style="text-align:center;font-size:${fs};margin:2px 0">MIN: ${session?.min || '_____'}</div>
// <div style="text-align:center;font-size:${fs};margin:2px 0">S/N: ${session?.sn || '_____'}</div>

// ${Sep()}
// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">Z-READING REPORT</div>
// ${Sep()}

// ${Row('Date:', today)}
// ${Row('Time:', timeNow)}
// ${Row('Cashier:', session?.cashierName || '—')}
// ${Row('Register:', session?.registerName || '—')}

// ${showBegEndSI ? `
// ${Row('Beg SI:', session?.begSI || '0')}
// ${Row('End SI:', session?.endSI || '0')}
// ` : ''}

// ${Row('Opened:', session?.openedAt?.split(',')[0] || '—')}
// ${Row('Closed:', session?.closedAt?.split(',')[0] || '—')}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">TODAY'S SALES</div>
// ${Row('Gross Sales:', fmtP(totalSales))}
// ${Row('Discounts:', fmtP(totalDiscounts))}
// ${showReturnSummary ? Row('Returns:', fmtP(summary.totalRefunds || 0)) : ''}
// ${showVoidSummary ? Row('Voids:', fmtP(summary.totalVoids || 0)) : ''}
// ${vatRows}
// ${Row('NET SALES:', fmtP(todayEarnings), true)}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">CASH SUMMARY</div>
// ${Row('Opening Fund:', fmtP(summary.openingFund || 0))}
// ${Row('Cash Sales:', fmtP(summary.cashEarned || 0))}
// ${Row('Cash Out:', fmtP(summary.cashOuts || 0))}
// ${Row('Cash in Drawer:', fmtP(cashInDrawer), true)}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">PAYMENT BREAKDOWN</div>
// ${tenderRows}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">DISCOUNTS</div>
// ${discountRows}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">CASH RECONCILIATION</div>
// <div style="display:flex;justify-content:space-between;font-weight:bold;border-bottom:2px solid #000;padding-bottom:2px;margin-bottom:3px;font-size:${fs}">
//   <span style="width:35%;text-align:left">TENDER</span>
//   <span style="width:20%;text-align:center">EXP</span>
//   <span style="width:20%;text-align:center">CNT</span>
//   <span style="width:25%;text-align:center">DIFF</span>
// </div>
// ${reconRows}
// <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:2px solid #000;padding-top:2px;margin-top:3px;font-size:${fs}">
//   <span style="width:35%;text-align:left">TOTAL</span>
//   <span style="width:20%;text-align:center">${fmtP(totalExpectedAll)}</span>
//   <span style="width:20%;text-align:center">${fmtP(summary.actualCash || summary.cashInDrawer || 0)}</span>
//   <span style="width:25%;text-align:center;color:${isBalanced ? '#166534' : totalDiff < 0 ? '#b91c1c' : '#1d4ed8'};font-weight:bold">
//     ${isBalanced ? '✓' : totalDiff < 0 ? `(${fmtP(Math.abs(totalDiff))})` : `+${fmtP(totalDiff)}`}
//   </span>
// </div>
// ${Sep()}

// ${shortOverHtml}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">DAILY SUMMARY</div>
// ${Row('Total Sales:', fmtP(totalSales))}
// ${Row('Total Discount:', fmtP(totalDiscounts))}
// ${showReturnSummary ? Row('Total Returns:', fmtP(summary.totalRefunds || 0)) : ''}
// ${showVoidSummary ? Row('Total Voids:', fmtP(summary.totalVoids || 0)) : ''}
// ${Row('Net Income:', fmtP(todayEarnings), true)}
// ${Sep()}

// ${settings?.receiptMessage ? 
//   `<div style="text-align:center;font-style:italic;font-size:${fs};margin-bottom:3px">${settings.receiptMessage}</div>` : ''}

// ${showCashierSignature ? `
// <div style="display:flex;justify-content:space-between;margin-top:20px;gap:8px">
//   ${['Cashier','Manager','Verified'].map(l =>
//     `<div style="flex:1;text-align:center;font-size:${fs}">
//        <div style="border-top:2px solid #000;padding-top:2px;margin-top:15px">${l}</div>
//      </div>`
//   ).join('')}
// </div>
// ` : ''}

// ${Sep()}
// <div style="text-align:center;font-size:${fs};margin:2px 0">${settings?.disclaimer || 'Dizlog - RigelSoft PH'}</div>
// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin-top:4px">*** END OF Z-REPORT ***</div>

// </body>
// </html>`;
//   };

//   const handlePrint = () => {
//     const html = buildPrintHTML();
//     const win = window.open('', '_blank', 'width=400,height=600');
//     if (!win) return;
//     win.document.write(html);
//     win.document.close();
//     win.focus();
//     setTimeout(() => { win.print(); win.close(); }, 300);
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2">
//       <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 shadow-xl">

//         {/* Header */}
//         <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-zinc-800 rounded-t-lg">
//           <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
//             <FileText className="h-5 w-5 text-orange-500" /> 
//             Z-Report Preview
//           </h3>
//           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
//             <X className="h-5 w-5" />
//           </button>
//         </div>

//         {/* Today's Earnings Summary */}
//         <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-4 border-b border-orange-100 dark:border-orange-800/30">
//           <div className="text-center mb-2 text-xs text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider">
//             Today's Earnings
//           </div>
//           <div className="text-center">
//             <span className="text-3xl font-black text-gray-900 dark:text-white">
//               {fmtP(todayEarnings)}
//             </span>
//           </div>
//           <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
//             <span>Gross: {fmtP(totalSales)}</span>
//             <span>Disc: {fmtP(totalDiscounts)}</span>
//           </div>
//         </div>

//         <div className="p-4 max-h-[70vh] overflow-y-auto">
//           {/* Z-Report Preview */}
//           <div className="font-mono text-sm bg-white dark:bg-black p-3 border border-gray-200 dark:border-gray-700 rounded">
            
//             {/* Header */}
//             {settings?.showLogo && settings?.logoPreview && (
//               <div className="flex justify-center mb-2">
//                 <img src={settings.logoPreview} alt="Logo" className="h-8 object-contain" />
//               </div>
//             )}
//             <div className="text-center font-bold text-base">{settings?.businessName || 'Business Name'}</div>
//             <div className="text-center text-xs">{settings?.locationAddress}</div>
//             {settings?.taxPin && <div className="text-center text-xs">TIN: {settings.taxPin}</div>}
            
//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>
//             <div className="text-center font-bold text-base">Z-READING REPORT</div>
//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Date/Time */}
//             <div className="flex justify-between text-sm py-1">
//               <span>Date:</span>
//               <span>{today}</span>
//             </div>
//             <div className="flex justify-between text-sm py-1">
//               <span>Time:</span>
//               <span>{timeNow}</span>
//             </div>
//             <div className="flex justify-between text-sm py-1">
//               <span>Cashier:</span>
//               <span>{session?.cashierName || '—'}</span>
//             </div>
            
//             {showBegEndSI && (
//               <>
//                 <div className="flex justify-between text-sm py-1">
//                   <span>Beg SI:</span>
//                   <span>{session?.begSI || '0'}</span>
//                 </div>
//                 <div className="flex justify-between text-sm py-1">
//                   <span>End SI:</span>
//                   <span>{session?.endSI || '0'}</span>
//                 </div>
//               </>
//             )}
            
//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Sales Summary */}
//             <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
//               <div className="flex justify-between text-sm py-1">
//                 <span>GROSS SALES:</span>
//                 <span className="font-bold">{fmtP(totalSales)}</span>
//               </div>
//               <div className="flex justify-between text-sm py-1">
//                 <span>DISCOUNTS:</span>
//                 <span className="text-green-600">-{fmtP(totalDiscounts)}</span>
//               </div>
//               {showReturnSummary && (
//                 <div className="flex justify-between text-sm py-1">
//                   <span>RETURNS:</span>
//                   <span className="text-red-600">-{fmtP(summary.totalRefunds || 0)}</span>
//                 </div>
//               )}
//               {showVoidSummary && (
//                 <div className="flex justify-between text-sm py-1">
//                   <span>VOIDS:</span>
//                   <span className="text-red-600">-{fmtP(summary.totalVoids || 0)}</span>
//                 </div>
//               )}
//               {showVAT && (
//                 <>
//                   <div className="flex justify-between text-sm py-1">
//                     <span>VAT ({vatPercentage}%):</span>
//                     <span>{fmtP(totalSales * (vatPercentage/100))}</span>
//                   </div>
//                 </>
//               )}
//               <div className="border-t border-dashed border-orange-200 dark:border-orange-800 my-2" />
//               <div className="flex justify-between font-bold text-base py-1">
//                 <span>NET SALES:</span>
//                 <span>{fmtP(todayEarnings)}</span>
//               </div>
//             </div>

//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Cash Summary */}
//             <div className="flex justify-between text-sm py-1">
//               <span>Opening Fund:</span>
//               <span>{fmtP(summary.openingFund || 0)}</span>
//             </div>
//             <div className="flex justify-between text-sm py-1">
//               <span>Cash Sales:</span>
//               <span>{fmtP(summary.cashEarned || 0)}</span>
//             </div>
//             <div className="flex justify-between text-sm py-1">
//               <span>Cash Out:</span>
//               <span className="text-red-600">-{fmtP(summary.cashOuts || 0)}</span>
//             </div>
//             <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-300 dark:border-gray-700 pt-2 mt-2">
//               <span>Cash in Drawer:</span>
//               <span>{fmtP(cashInDrawer)}</span>
//             </div>

//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Payment Breakdown - FILTERED BY SETTINGS */}
//             {getActiveTenders().map(([k, v]) => {
//               const value = typeof v === 'number' ? v : 0;
//               return (
//                 <div key={k} className="flex justify-between text-sm py-1">
//                   <span>{TENDER_LABELS[k]}:</span>
//                   <span>{fmtP(value)}</span>
//                 </div>
//               );
//             })}

//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Discounts - FILTERED BY SETTINGS */}
//             {getActiveDiscounts().length > 0 ? (
//               <>
//                 <div className="text-center font-bold text-base mb-2">DISCOUNTS</div>
//                 {getActiveDiscounts().map(d => (
//                   <div key={d.key} className="flex justify-between text-sm py-1">
//                     <span>{d.label}</span>
//                     <span>{fmtP(d.value)}</span>
//                   </div>
//                 ))}
//               </>
//             ) : (
//               <div className="text-center text-sm text-gray-500 py-2">No discounts</div>
//             )}

//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Daily Summary */}
//             <div className="flex justify-between text-sm py-1">
//               <span>TOTAL SALES:</span>
//               <span>{fmtP(totalSales)}</span>
//             </div>
//             <div className="flex justify-between text-sm py-1">
//               <span>TOTAL DISCOUNT:</span>
//               <span className="text-green-600">{fmtP(totalDiscounts)}</span>
//             </div>
//             {showReturnSummary && (
//               <div className="flex justify-between text-sm py-1">
//                 <span>TOTAL RETURNS:</span>
//                 <span className="text-red-600">{fmtP(summary.totalRefunds || 0)}</span>
//               </div>
//             )}
//             {showVoidSummary && (
//               <div className="flex justify-between text-sm py-1">
//                 <span>TOTAL VOIDS:</span>
//                 <span className="text-red-600">{fmtP(summary.totalVoids || 0)}</span>
//               </div>
//             )}
//             <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-300 dark:border-gray-700 pt-2 mt-2">
//               <span>NET INCOME:</span>
//               <span>{fmtP(todayEarnings)}</span>
//             </div>

//             <div className="text-center my-2 text-sm">{"=".repeat(32)}</div>

//             {/* Message */}
//             {settings?.receiptMessage && (
//               <div className="text-center text-sm italic mb-2">
//                 {settings.receiptMessage}
//               </div>
//             )}

//             {/* Signatures - CONDITIONAL */}
//             {showCashierSignature && (
//               <div className="grid grid-cols-3 gap-2 mt-4">
//                 {['Cashier','Manager','Verified'].map(l => (
//                   <div key={l} className="text-center text-xs">
//                     <div className="border-t-2 border-gray-800 pt-1 mt-4">{l}</div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             <div className="text-center text-xs mt-2">{settings?.disclaimer || 'Dizlog - RigelSoft PH'}</div>
//             <div className="text-center font-bold text-base mt-2">*** END ***</div>
//           </div>

//           {/* Action Buttons */}
//           <div className="space-y-3 mt-4">
//             <div className="flex gap-3">
//               <button
//                 onClick={handlePrint}
//                 className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded"
//               >
//                 <Printer className="h-4 w-4" /> PRINT
//               </button>
//               <button
//                 onClick={onClose}
//                 className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-bold rounded hover:bg-gray-50 dark:hover:bg-zinc-800"
//               >
//                 CLOSE
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React from 'react'

const ZReportModal = () => {
  return (
    <div>ZReportModal</div>
  )
}

export default ZReportModal