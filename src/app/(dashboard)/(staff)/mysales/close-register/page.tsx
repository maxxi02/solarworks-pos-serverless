// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Save, DollarSign, Receipt,} from 'lucide-react';
// import { toast } from 'sonner';
// import ZReportModal from '@/app/(dashboard)/(public)/settings/receipt-setting/components/ZReportModal';
// import { useReceiptSettings } from '@/hooks/useReceiptSettings';

// interface Payment {
//   _id: string;
//   orderNumber: string;
//   total: number;
//   paymentMethod: string;
//   status: string;
//   items: any[];
//   discount?: number;
//   discountTotal?: number;
//   createdAt: string;
// }

// export default function CloseRegisterPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const { settings } = useReceiptSettings();
  
//   const [actualCash, setActualCash] = useState<number | ''>('');
//   const [notes, setNotes] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [isClosing, setIsClosing] = useState(false);
//   const [showZReport, setShowZReport] = useState(false);
//   const [session, setSession] = useState<any>({});
//   const [summaryData, setSummaryData] = useState<any>({});
  
//   const [summary, setSummary] = useState({
//     openingFund: 0,
//     cashSales: 0,
//     refunds: 0,
//     expectedCash: 0,
//     transactions: 0,
//     items: 0,
//     openedAt: '',
//     cashierName: 'Cashier',
//     // Add these para sa Z-Report
//     totalSales: 0,
//     totalDiscounts: 0,
//     gcashSales: 0,
//     splitSales: 0,
//     cashInDrawer: 0
//   });

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     setLoading(true);
//     try {
//       // Get session from localStorage
//       const savedSession = JSON.parse(localStorage.getItem('pos_session') || '{}');
//       setSession(savedSession);
      
//       // Fetch today's payments from API
//       const response = await fetch('/api/payments');
//       const result = await response.json();
      
//       if (result.success && result.data) {
//         const payments = result.data.payments;
//         const today = new Date().toDateString();
        
//         // Filter today's payments
//         const todayPayments = payments.filter((p: Payment) => {
//           const date = new Date(p.createdAt).toDateString();
//           return date === today;
//         });

//         // Separate completed and refunded
//         const completed = todayPayments.filter((p: Payment) => p.status === 'completed');
//         const refunded = todayPayments.filter((p: Payment) => p.status === 'refunded');

//         // Calculate totals
//         const totalSales = completed.reduce((sum: number, p: Payment) => sum + p.total, 0);
//         const totalDiscounts = completed.reduce((sum: number, p: Payment) => sum + (p.discountTotal || p.discount || 0), 0);
        
//         // Calculate cash sales
//         const cashSales = completed
//           .filter((p: Payment) => p.paymentMethod === 'cash')
//           .reduce((sum: number, p: Payment) => sum + p.total, 0);
        
//         // Calculate GCash sales
//         const gcashSales = completed
//           .filter((p: Payment) => p.paymentMethod === 'gcash')
//           .reduce((sum: number, p: Payment) => sum + p.total, 0);
        
//         // Calculate Split sales
//         const splitSales = completed
//           .filter((p: Payment) => p.paymentMethod === 'split')
//           .reduce((sum: number, p: Payment) => sum + p.total, 0);

//         // Calculate refunds
//         const refunds = refunded
//           .filter((p: Payment) => p.paymentMethod === 'cash')
//           .reduce((sum: number, p: Payment) => sum + p.total, 0);

//         // Expected cash = opening fund + cash sales - refunds
//         const expectedCash = (savedSession.openingFund || 0) + cashSales - refunds;
        
//         // Cash in drawer = opening fund + cash sales - refunds
//         const cashInDrawer = (savedSession.openingFund || 0) + cashSales - refunds;

//         setSummary({
//           openingFund: savedSession.openingFund || 0,
//           cashSales,
//           refunds,
//           expectedCash,
//           totalSales,
//           totalDiscounts,
//           gcashSales,
//           splitSales,
//           cashInDrawer,
//           transactions: completed.length,
//           items: completed.reduce((sum: number, p: Payment) => sum + (p.items?.length || 0), 0),
//           openedAt: savedSession.openedAt || '',
//           cashierName: savedSession.cashierName || 'Cashier'
//         });

//         // Prepare data for Z-Report
//         setSummaryData({
//           totalSales,
//           netSales: totalSales - totalDiscounts - refunds,
//           totalDiscounts,
//           totalRefunds: refunds,
//           cashEarned: cashSales,
//           cashInDrawer,
//           cashOuts: 0,
//           transactions: completed.length,
//           items: completed.reduce((sum: number, p: Payment) => sum + (p.items?.length || 0), 0),
//           tenders: {
//             cash: cashSales,
//             gcash: gcashSales,
//             split: splitSales,
//             credit_card: 0,
//             pay_later: 0,
//             online: 0,
//             invoice: 0,
//             e_wallet: 0,
//             pay_in: 0
//           },
//           discounts: {
//             sc: completed.reduce((sum: number, p: Payment) => sum + (p.discountTotal || 0), 0),
//             pwd: 0,
//             naac: 0,
//             solo_parent: 0,
//             other: 0
//           },
//           openingFund: savedSession.openingFund || 0,
//           actualCash: expectedCash // Default to expected
//         });

//         // Auto-fill actual cash with expected
//         setActualCash(expectedCash);
//       }
//     } catch (error) {
//       console.error('Error loading data:', error);
//       toast.error('Failed to load closing data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const counted = actualCash === '' ? 0 : actualCash;
//   const difference = counted - summary.expectedCash;
//   const isBalanced = Math.abs(difference) < 0.01;

//   const getStatus = () => {
//     if (actualCash === '') return 'incomplete';
//     if (isBalanced) return 'balanced';
//     return difference < 0 ? 'short' : 'over';
//   };

//   const status = getStatus();

//   const handleCloseRegister = () => {
//     if (status === 'incomplete') {
//       toast.error('Please enter actual cash amount');
//       return;
//     }

//     if (status !== 'balanced') {
//       if (!confirm(`Warning: Register is ${status === 'short' ? 'SHORT' : 'OVER'} by ₱${Math.abs(difference).toFixed(2)}. Continue?`)) {
//         return;
//       }
//     }

//     // Update session with actual cash and difference
//     const updatedSession = {
//       ...session,
//       status: 'closed',
//       closedAt: new Date().toISOString(),
//       actualCash: counted,
//       expectedCash: summary.expectedCash,
//       difference: difference,
//       closeStatus: status,
//       closingNotes: notes
//     };
    
//     localStorage.setItem('pos_session', JSON.stringify(updatedSession));
//     setSession(updatedSession);

//     // Update summary data with actual cash
//     setSummaryData((prev: any) => ({
//       ...prev,
//       actualCash: counted,
//       expectedCash: summary.expectedCash,
//       difference: difference,
//       closeStatus: status
//     }));

//     // Show Z-Report modal
//     setShowZReport(true);
//   };

//   const handlePrintZReportModal = () => {
//     // Print Z-Report
//     const zReportWindow = window.open('', '_blank', 'width=400,height=600');
//     if (!zReportWindow) return;

//     // Get the Z-Report HTML from the modal's print function
//     const html = buildZReportHTML();
//     zReportWindow.document.write(html);
//     zReportWindow.document.close();
//     zReportWindow.focus();
    
//     setTimeout(() => { 
//       zReportWindow.print(); 
//       setTimeout(() => {
//         zReportWindow.close();
//       }, 500);
//     }, 300);
//   };

//   const handleZReportClose = () => {
//     setShowZReport(false);
//     // Redirect to reports page
//     router.push('/dashboard/reports');
//   };

//   const handleConfirmClose = () => {
//     // This is called from ZReportModal when user clicks "PRINT & CLOSE"
//     setShowZReport(false);
//     toast.success('Register closed successfully!');
//     router.push('/dashboard/reports');
//   };

//   // Build Z-Report HTML for printing (same as sa ZReportModal)
//   const buildZReportHTML = (): string => {
//     const fs = '11px';
//     const fsL = '14px';

//     const Row = (label: string, value: string, bold = false) =>
//       `<div style="display:flex;justify-content:space-between;gap:4px;padding:2px 0;font-weight:${bold ? 'bold' : 'normal'};font-size:${fs}">
//         <span style="text-align:left">${label}</span>
//         <span style="text-align:right">${value}</span>
//       </div>`;

//     const Sep = () => `<div style="border-top:2px dashed #000;margin:5px 0"></div>`;

//     const today = new Date().toLocaleDateString('en-PH', { 
//       year: 'numeric', month: '2-digit', day: '2-digit' 
//     });
    
//     const timeNow = new Date().toLocaleTimeString('en-PH', { 
//       hour: '2-digit', minute: '2-digit' 
//     });

//     const logoHtml = settings?.showLogo && settings?.logoPreview
//       ? `<div style="text-align:center;margin-bottom:5px">
//            <img src="${settings.logoPreview}" style="max-height:40px;max-width:100%;object-fit:contain;margin:0 auto"/>
//          </div>` : '';

//     // Short/Over display
//     const totalDiff = difference;
//     const isBalanced = Math.abs(totalDiff) < 0.01;

//     const shortOverHtml = isBalanced
//       ? `<div style="text-align:center;font-weight:bold;color:#166534;font-size:${fsL};margin:3px 0">✓ BALANCED ✓</div>`
//       : totalDiff < 0
//         ? `<div style="text-align:center;font-weight:bold;color:#b91c1c;font-size:${fsL};margin:3px 0">⚠ SHORT: (${fmtP(Math.abs(totalDiff))}) ⚠</div>`
//         : `<div style="text-align:center;font-weight:bold;color:#1d4ed8;font-size:${fsL};margin:3px 0">⚠ OVER: +${fmtP(totalDiff)} ⚠</div>`;

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
// </style>
// </head>
// <body>

// ${logoHtml}
// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:2px 0">${settings?.businessName || 'Business Name'}</div>
// ${settings?.locationAddress ? `<div style="text-align:center;font-size:${fs};margin:2px 0">${settings.locationAddress}</div>` : ''}

// ${Sep()}
// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">Z-READING REPORT</div>
// ${Sep()}

// ${Row('Date:', today)}
// ${Row('Time:', timeNow)}
// ${Row('Cashier:', session?.cashierName || '—')}
// ${Row('Opened:', summary.openedAt?.split(',')[0] || '—')}
// ${Row('Closed:', new Date().toLocaleString().split(',')[0])}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">TODAY'S SALES</div>
// ${Row('Gross Sales:', fmtP(summary.totalSales))}
// ${Row('Discounts:', fmtP(summary.totalDiscounts))}
// ${Row('Returns:', fmtP(summary.refunds))}
// ${Row('NET SALES:', fmtP(summary.totalSales - summary.totalDiscounts - summary.refunds), true)}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">CASH SUMMARY</div>
// ${Row('Opening Fund:', fmtP(summary.openingFund))}
// ${Row('Cash Sales:', fmtP(summary.cashSales))}
// ${Row('Cash Refunds:', fmtP(summary.refunds))}
// ${Row('Expected Cash:', fmtP(summary.expectedCash), true)}
// ${Row('Counted Cash:', fmtP(counted), true)}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">PAYMENT BREAKDOWN</div>
// ${Row('CASH:', fmtP(summary.cashSales))}
// ${Row('GCASH:', fmtP(summary.gcashSales))}
// ${Row('SPLIT:', fmtP(summary.splitSales))}
// ${Sep()}

// ${shortOverHtml}
// ${Sep()}

// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin:4px 0">DAILY SUMMARY</div>
// ${Row('Total Transactions:', summary.transactions.toString())}
// ${Row('Total Items:', summary.items.toString())}
// ${Row('Net Income:', fmtP(summary.totalSales - summary.totalDiscounts - summary.refunds), true)}
// ${Sep()}

// ${settings?.receiptMessage ? 
//   `<div style="text-align:center;font-style:italic;font-size:${fs};margin-bottom:3px">${settings.receiptMessage}</div>` : ''}

// <div style="display:flex;justify-content:space-between;margin-top:15px;gap:8px">
//   <div style="flex:1;text-align:center;font-size:${fs}">
//     <div style="border-top:2px solid #000;padding-top:2px;margin-top:15px">Cashier</div>
//   </div>
//   <div style="flex:1;text-align:center;font-size:${fs}">
//     <div style="border-top:2px solid #000;padding-top:2px;margin-top:15px">Manager</div>
//   </div>
// </div>

// ${Sep()}
// <div style="text-align:center;font-size:${fs};margin:2px 0">${settings?.disclaimer || 'Dizlog - RigelSoft PH'}</div>
// <div style="text-align:center;font-weight:bold;font-size:${fsL};margin-top:4px">*** END OF Z-REPORT ***</div>

// </body>
// </html>`;
//   };

//   const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
//   const fmtP = (n: number) => `₱${fmt(n)}`;

//   const StatusCard = () => {
//     const icons = {
//       incomplete: <AlertCircle className="h-8 w-8 text-gray-400" />,
//       balanced: <CheckCircle className="h-8 w-8 text-green-500" />,
//       short: <XCircle className="h-8 w-8 text-red-500" />,
//       over: <AlertCircle className="h-8 w-8 text-blue-500" />
//     };

//     const messages = {
//       incomplete: {
//         title: 'Enter Cash Amount',
//         desc: 'Please enter the actual cash in drawer',
//         color: 'gray'
//       },
//       balanced: {
//         title: '✓ BALANCED',
//         desc: `Expected: ${fmtP(summary.expectedCash)} | Counted: ${fmtP(counted)}`,
//         color: 'green'
//       },
//       short: {
//         title: `⚠ SHORT by ${fmtP(Math.abs(difference))}`,
//         desc: `Expected: ${fmtP(summary.expectedCash)} | Counted: ${fmtP(counted)}`,
//         color: 'red'
//       },
//       over: {
//         title: `⚠ OVER by ${fmtP(difference)}`,
//         desc: `Expected: ${fmtP(summary.expectedCash)} | Counted: ${fmtP(counted)}`,
//         color: 'blue'
//       }
//     };

//     const msg = messages[status];

//     return (
//       <div className={`bg-${msg.color}-50 dark:bg-${msg.color}-900/10 border border-${msg.color}-200 dark:border-${msg.color}-800 rounded-lg p-4`}>
//         <div className="flex items-center gap-3">
//           {icons[status]}
//           <div>
//             <h3 className={`font-bold text-${msg.color}-700 dark:text-${msg.color}-300 text-lg`}>
//               {msg.title}
//             </h3>
//             <p className={`text-sm text-${msg.color}-600 dark:text-${msg.color}-400`}>
//               {msg.desc}
//             </p>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//           <p className="text-gray-600 dark:text-gray-400">Loading closing data...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
//       <div className="max-w-2xl mx-auto">
        
//         {/* Header */}
//         <div className="mb-6">
//           <button
//             onClick={() => router.back()}
//             className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
//           >
//             <ArrowLeft className="h-4 w-4" />
//             Back
//           </button>
          
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Close Register</h1>
//               <p className="text-gray-600 dark:text-gray-400 mt-1">
//                 Enter the actual cash in drawer
//               </p>
//             </div>
            
//             <div className="text-right">
//               <div className="text-sm text-gray-500">Cashier: {summary.cashierName}</div>
//             </div>
//           </div>
//         </div>

//         {/* Session Info */}
//         <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
//           <div className="grid grid-cols-3 gap-4">
//             <div>
//               <div className="text-xs text-blue-600 dark:text-blue-400">Opened</div>
//               <div className="font-bold text-blue-900 dark:text-blue-300">{summary.openedAt || '—'}</div>
//             </div>
//             <div>
//               <div className="text-xs text-blue-600 dark:text-blue-400">Opening Fund</div>
//               <div className="font-bold text-blue-900 dark:text-blue-300">{fmtP(summary.openingFund)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-blue-600 dark:text-blue-400">Transactions</div>
//               <div className="font-bold text-blue-900 dark:text-blue-300">{summary.transactions}</div>
//             </div>
//           </div>
//         </div>

//         {/* Refund Warning */}
//         {summary.refunds > 0 && (
//           <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
//             <div className="flex items-center gap-3">
//               <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
//               <div>
//                 <p className="text-sm font-medium text-red-800 dark:text-red-300">
//                   Refunds today: {fmtP(summary.refunds)}
//                 </p>
//                 <p className="text-xs text-red-600 dark:text-red-400">
//                   Refunds deducted from expected cash
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Status Card */}
//         <StatusCard />

//         {/* Cash Count */}
//         <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 mt-6">
//           <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//             <DollarSign className="h-5 w-5 text-green-500" />
//             Cash Count
//           </h2>

//           <div className="space-y-6">
//             {/* Expected Cash Breakdown */}
//             <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
//               <div className="text-sm text-gray-500 mb-2">Expected Cash Calculation</div>
//               <div className="space-y-2 text-sm">
//                 <div className="flex justify-between">
//                   <span>Opening Fund:</span>
//                   <span className="font-medium">{fmtP(summary.openingFund)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Cash Sales:</span>
//                   <span className="text-green-600 font-medium">+{fmtP(summary.cashSales)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Cash Refunds:</span>
//                   <span className="text-red-600 font-medium">-{fmtP(summary.refunds)}</span>
//                 </div>
//                 <div className="border-t border-gray-300 dark:border-gray-600 my-2 pt-2 flex justify-between font-bold">
//                   <span>Expected Cash:</span>
//                   <span className="text-blue-600">{fmtP(summary.expectedCash)}</span>
//                 </div>
//               </div>
//             </div>

//             {/* Actual Cash Input */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                 Actual Cash Counted
//               </label>
//               <div className="relative">
//                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
//                 <input
//                   type="number"
//                   min="0"
//                   step="0.01"
//                   value={actualCash}
//                   onChange={(e) => setActualCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
//                   placeholder="0.00"
//                   className={`w-full pl-8 pr-4 py-3 text-lg border rounded-lg bg-white dark:bg-zinc-800
//                     ${actualCash !== '' 
//                       ? isBalanced 
//                         ? 'border-green-300 dark:border-green-700 ring-1 ring-green-200' 
//                         : difference < 0 
//                           ? 'border-red-300 dark:border-red-700 ring-1 ring-red-200' 
//                           : 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-200'
//                       : 'border-gray-300 dark:border-gray-600'
//                     }`}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Notes */}
//         <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 mt-6">
//           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//             Closing Notes (Optional)
//           </label>
//           <textarea
//             value={notes}
//             onChange={(e) => setNotes(e.target.value)}
//             rows={3}
//             className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
//             placeholder="Add any notes about this closing..."
//           />
//         </div>

//         {/* Actions */}
//         <div className="flex gap-4 mt-6">
//           <button
//             onClick={() => router.back()}
//             className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
//           >
//             Cancel
//           </button>
          
//           <button
//             onClick={handleCloseRegister}
//             disabled={status === 'incomplete' || isClosing}
//             className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2
//               ${status === 'balanced' 
//                 ? 'bg-green-600 hover:bg-green-700 text-white' 
//                 : status === 'short'
//                   ? 'bg-red-600 hover:bg-red-700 text-white'
//                   : status === 'over'
//                     ? 'bg-blue-600 hover:bg-blue-700 text-white'
//                     : 'bg-gray-400 cursor-not-allowed text-white'
//               }`}
//           >
//             <Save className="h-4 w-4" />
//             {status === 'balanced' ? 'Close Register' :
//              status === 'short' ? 'Close (Short)' :
//              status === 'over' ? 'Close (Over)' : 'Enter Amount'}
//           </button>
//         </div>

//         {/* Preview Z-Report Button */}
//         {actualCash !== '' && summary.cashSales > 0 && (
//           <div className="mt-4 text-center">
//             <button
//               onClick={() => {
//                 // Update summary data and show preview
//                 setSummaryData((prev: any) => ({
//                   ...prev,
//                   actualCash: counted,
//                   expectedCash: summary.expectedCash,
//                   difference: difference,
//                   closeStatus: status
//                 }));
//                 setShowZReport(true);
//               }}
//               className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 mx-auto"
//             >
//               <Receipt className="h-4 w-4" />
//               Preview Z-Report before closing
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Z-Report Modal */}
//       {showZReport && (
//         <ZReportModal
//           session={{
//             ...session,
//             openedAt: summary.openedAt,
//             cashierName: summary.cashierName,
//             registerName: session.registerName || 'Main Register',
//             openingFund: summary.openingFund,
//             closedAt: new Date().toISOString()
//           }}
//           summary={{
//             ...summaryData,
//             actualCash: counted,
//             expectedCash: summary.expectedCash,
//             difference: difference,
//             closeStatus: status
//           }}
//           settings={settings}
//           onClose={handleZReportClose}
//           onConfirmClose={handleConfirmClose}
//         />
//       )}
//     </div>
//   );
// }
import React from 'react'

const page = () => {
  return (
    <div>page</div>
  )
}

export default page