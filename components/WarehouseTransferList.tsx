
import React from 'react';
import { WarehouseTransfer, ShopName } from '../types';

interface WarehouseTransferListProps {
  transfers: WarehouseTransfer[];
  currentShop: ShopName;
  onEdit: (transfer: WarehouseTransfer) => void;
  onDelete: (transfer: WarehouseTransfer) => void;
}

const WarehouseTransferList: React.FC<WarehouseTransferListProps> = ({ transfers, currentShop, onEdit, onDelete }) => {
  const filtered = transfers.filter(t => {
    if (currentShop === 'Global') return true;
    return t.fromShop === currentShop || t.items.some(item => item.toShop === currentShop);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Warehouse Transfers</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
            Audit Trail of Inward Stock Movements
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 px-6 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800">
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Total Transfers</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{filtered.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6">Note Number</th>
                <th className="px-8 py-6">From</th>
                <th className="px-8 py-6">Destinations</th>
                <th className="px-8 py-6">Items</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length > 0 ? filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 dark:text-white text-xs">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-indigo-600 dark:text-indigo-400 text-sm uppercase">{t.transferNoteNumber}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      {t.fromShop}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(t.items.map(i => i.toShop))).map(shop => (
                        <span key={shop} className="text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                          {shop}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-700 dark:text-slate-300 text-xs">{t.items.length} Products</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${
                      t.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onEdit(t)}
                        className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                        title="Edit Transfer"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button 
                        onClick={() => onDelete(t)}
                        className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                        title="Delete Transfer"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                        <i className="fa-solid fa-truck-ramp-box text-6xl mb-4 text-slate-300 dark:text-slate-700"></i>
                        <p className="font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">No Warehouse Transfers</p>
                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Upload a transfer note to begin</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WarehouseTransferList;
