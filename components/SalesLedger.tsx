
import React, { useState, useMemo } from 'react';
import { Transaction, ShopName } from '../types';

interface SalesLedgerProps {
  transactions: Transaction[];
  currentShop: ShopName;
}

const SalesLedger: React.FC<SalesLedgerProps> = ({ transactions, currentShop }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredLines = useMemo(() => {
    // 1. Filter transactions by date and shop (only Receipts and VAT Refunds contribute to sales revenue)
    const dayTransactions = transactions.filter(t => {
      const isDateMatch = t.date.startsWith(selectedDate);
      const isShopMatch = currentShop === 'Global' || t.shop === currentShop;
      const isSalesType = t.type === 'RECEIPT' || t.type === 'VAT_REFUND';
      return isDateMatch && isShopMatch && isSalesType;
    });

    // 2. Flatten into line items with matching receipt logic
    return dayTransactions.flatMap(t => 
      t.items.map(item => {
        // Line-item math matching the "VAT Inclusive" model from ReceiptModal
        const lineTotalInclVat = item.price * item.quantity;
        // If there's a transaction-level discount, we apply it proportionally to the line item for the ledger
        const discountedLineTotal = lineTotalInclVat * (1 - (t.discount || 0) / 100);
        const lineExclVat = discountedLineTotal / 1.15;
        const lineVatAmount = discountedLineTotal - lineExclVat;

        return {
          date: t.date,
          receiptNumber: t.receiptNumber,
          invoiceNumber: t.invoiceNumber || 'N/A',
          productCode: item.sku || item.itemId,
          description: item.name,
          paymentMethod: t.paymentMethod,
          priceInclVat: item.price,
          quantity: item.quantity,
          lineTotal: discountedLineTotal,
          vatAmount: lineVatAmount,
          exclVat: lineExclVat,
          shop: t.shop,
          salesperson: t.salesperson
        };
      })
    );
  }, [transactions, selectedDate, currentShop]);

  const totals = useMemo(() => {
    return filteredLines.reduce((acc, curr) => {
      acc.grossTotal += curr.lineTotal;
      acc.totalVat += curr.vatAmount;
      acc.totalExcl += curr.exclVat;
      return acc;
    }, { grossTotal: 0, totalVat: 0, totalExcl: 0 });
  }, [filteredLines]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 transition-colors">
      {/* Financial Summary Cards - Matching Receipt Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Net Sales (Incl. VAT)</p>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">MUR {totals.grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tax Revenue (VAT 15%)</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">MUR {totals.totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Taxable Base (Excl. VAT)</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">MUR {totals.totalExcl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-indigo-600 dark:bg-indigo-900 p-8 rounded-[2.5rem] shadow-xl text-white transition-colors">
          <p className="text-[10px] font-black text-indigo-200 dark:text-indigo-300 uppercase tracking-widest mb-2">Daily Volume</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black">{filteredLines.length}</p>
            <span className="text-[10px] font-bold uppercase opacity-60">Lines Processed</span>
          </div>
        </div>
      </div>

      {/* Ledger Controls */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Daily Sales Ledger</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
              Terminal: <span className="text-indigo-600 dark:text-indigo-400">{currentShop}</span> • Official Record
            </p>
          </div>
          
          <div className="flex items-center gap-4 no-print">
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all">
                <i className="fa-solid fa-calendar-day text-indigo-500 dark:text-indigo-400"></i>
                <input 
                  type="date" 
                  className="bg-transparent font-black text-sm outline-none text-slate-700 dark:text-slate-200"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
             </div>
             <button 
               onClick={() => window.print()}
               className="px-6 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
             >
               <i className="fa-solid fa-print"></i> Export Ledger
             </button>
          </div>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-black tracking-widest border-y border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-6">Receipt / Invoice</th>
                <th className="px-8 py-6">Product Details</th>
                <th className="px-8 py-6">Salesperson</th>
                <th className="px-8 py-6 text-right">Qty</th>
                <th className="px-8 py-6 text-right">Excl. VAT</th>
                <th className="px-8 py-6 text-right">VAT (15%)</th>
                <th className="px-8 py-6 text-right">Total (Incl.)</th>
                <th className="px-8 py-6">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLines.length > 0 ? filteredLines.map((item, idx) => (
                <tr key={`${item.receiptNumber}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">#{item.receiptNumber}</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">INV: {item.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="max-w-[200px]">
                      <p className="font-bold text-slate-800 dark:text-white text-xs uppercase truncate">{item.description}</p>
                      <p className="font-mono text-[9px] text-slate-400 dark:text-slate-500 uppercase">{item.productCode}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{item.salesperson}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-slate-700 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-8 py-6 text-right font-bold text-slate-500 dark:text-slate-400 text-xs">
                    {item.exclVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-slate-500 dark:text-slate-400 text-xs">
                    {item.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-indigo-600 dark:text-indigo-400 text-xs">
                    {item.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[8px] font-black uppercase text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
                      {item.paymentMethod}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                        <i className="fa-solid fa-receipt text-6xl mb-4 text-slate-300 dark:text-slate-700"></i>
                        <p className="font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Zero Ledger Entries</p>
                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Date: {selectedDate}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Print Footer */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-10">
          <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">
              Daily Sales Audit Report • Generated {new Date().toLocaleString()} • StockMaster Local
          </p>
          <div className="flex items-center gap-4 no-print">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Synchronized with local storage</p>
          </div>
      </div>
    </div>
  );
};

export default SalesLedger;
