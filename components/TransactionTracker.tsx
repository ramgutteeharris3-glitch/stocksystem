
import React, { useState, useMemo } from 'react';
import { Transaction, ShopName } from '../types';

interface TransactionTrackerProps {
  transactions: Transaction[];
  currentShop: ShopName;
  onEdit: (txn: Transaction) => void;
  onCancel: (txn: Transaction) => void;
}

const TransactionTracker: React.FC<TransactionTrackerProps> = ({ transactions, currentShop, onEdit, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const isShopMatch = currentShop === 'Global' || t.shop === currentShop || t.toShop === currentShop;
      const isSearchMatch = 
        t.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.deliveryNoteNumber && t.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.transferNoteNumber && t.transferNoteNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customerAddress && t.customerAddress.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.salesperson.toLowerCase().includes(searchTerm.toLowerCase());
      return isShopMatch && isSearchMatch;
    });
  }, [transactions, currentShop, searchTerm]);

  const stats = useMemo(() => {
    const relevant = transactions.filter(t => currentShop === 'Global' || t.shop === currentShop || t.toShop === currentShop);
    const active = relevant.filter(t => t.status !== 'CANCELLED');
    const revenue = active.reduce((acc, t) => acc + (t.type === 'RECEIPT' ? t.total : 0), 0);
    const transferCount = active.filter(t => t.type !== 'RECEIPT').length;
    return { revenue, count: active.length, transferCount };
  }, [transactions, currentShop]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Net Sales Revenue</p>
          <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">MUR {stats.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Total Documents</p>
          <div className="flex items-center justify-between">
            <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.count}</p>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stats.transferCount} Transfers</span>
          </div>
        </div>
        <div className="bg-slate-900 dark:bg-indigo-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Active Terminal</p>
          <p className="text-2xl font-black text-white uppercase">{currentShop}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Audit Log & Traceability</h2>
            <button 
              onClick={handleExportPDF}
              className="no-print w-fit flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-slate-600 transition-all"
            >
              <i className="fa-solid fa-file-pdf"></i> Export Audit Log PDF
            </button>
          </div>
          <div className="relative group no-print">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"></i>
            <input 
              type="text" placeholder="Recall by Doc #, Name or Address..."
              className="pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 w-full lg:w-[400px] font-bold text-sm shadow-inner text-slate-900 dark:text-white transition-all"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-10 py-6">Type & Identifiers</th>
                <th className="px-10 py-6">Customer / Lifecycle</th>
                <th className="px-10 py-6">Initiating Shop</th>
                <th className="px-10 py-6">Destination</th>
                <th className="px-10 py-6 text-right">Value (Sales)</th>
                <th className="px-10 py-6 text-right no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length > 0 ? filtered.map((txn) => (
                <tr key={txn.id} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group ${txn.status === 'CANCELLED' ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center no-print ${
                         txn.type === 'RECEIPT' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                         txn.type === 'WAREHOUSE_TRANSFER' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                         'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                       }`}>
                          <i className={`fa-solid ${
                            txn.type === 'RECEIPT' ? 'fa-cash-register' : 
                            txn.type === 'WAREHOUSE_TRANSFER' ? 'fa-truck-ramp-box' :
                            'fa-right-left'
                          }`}></i>
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                            {txn.type === 'RECEIPT' ? (
                              <>
                                <p className="font-black text-slate-900 dark:text-white text-xs">REC: {txn.receiptNumber.toUpperCase()}</p>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col gap-0.5">
                                  {txn.deliveryNoteNumber && <p className="font-black text-slate-900 dark:text-white text-xs">DN: {txn.deliveryNoteNumber.toUpperCase()}</p>}
                                  {txn.transferNoteNumber && <p className="font-black text-indigo-600 dark:text-indigo-400 text-xs">WT: {txn.transferNoteNumber.toUpperCase()}</p>}
                                </div>
                              </>
                            )}
                            {txn.status === 'CANCELLED' && (
                              <span className="text-[8px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded uppercase">Cancelled</span>
                            )}
                          </div>
                          {txn.type === 'RECEIPT' && txn.invoiceNumber && <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">INV: {txn.invoiceNumber}</p>}
                          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{txn.type.replace('_', ' ')}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <p className="font-black text-slate-900 dark:text-white text-xs">{new Date(txn.date).toLocaleDateString('en-GB')}</p>
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{txn.customerName || 'Guest Customer'}</p>
                      {txn.customerAddress && (
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium leading-tight italic">
                          {txn.customerAddress}
                        </p>
                      )}
                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">By: {txn.salesperson}</p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className="font-black text-slate-700 dark:text-slate-300 text-xs uppercase">{txn.shop}</span>
                  </td>
                  <td className="px-10 py-8">
                    {txn.toShop ? (
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800">{txn.toShop}</span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700 font-bold uppercase text-[10px]">End Customer</span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="font-black text-slate-900 dark:text-white text-lg tracking-tighter">
                      {txn.type === 'RECEIPT' ? `MUR ${txn.total.toFixed(2)}` : 
                       txn.type === 'WAREHOUSE_TRANSFER' ? 'TRANSFER' : '--'}
                    </p>
                  </td>
                  <td className="px-10 py-8 text-right no-print">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(txn)} className="w-12 h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                        <i className="fa-solid fa-file-pen text-lg"></i>
                      </button>
                      {txn.status !== 'CANCELLED' && (
                        <button onClick={() => onCancel(txn)} className="w-12 h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-300 hover:text-rose-600 transition-all">
                          <i className="fa-solid fa-ban text-lg"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] font-black opacity-30">Empty Audit Log</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionTracker;
