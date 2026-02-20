
import React, { useState, useMemo } from 'react';
import { InventoryItem, StockMovement, ShopName, SHOPS } from '../types';

interface ItemHistoryModalProps {
  item: InventoryItem;
  movements: StockMovement[];
  onClose: () => void;
}

const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({ item, movements, onClose }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => m.itemId === item.id)
      .filter(m => {
        const mDate = m.date.split('T')[0];
        return mDate >= startDate && mDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, item.id, startDate, endDate]);

  const stockDistribution = useMemo(() => {
    return Object.entries(item.stocks || {}).map(([shop, qty]) => ({ shop, qty }));
  }, [item.stocks]);

  const totalStock = stockDistribution.reduce((acc, s) => acc + (Number(s.qty) || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors">
        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
              <i className="fa-solid fa-clock-rotate-left text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">{item.name}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-black uppercase tracking-[0.2em]">
                Product Code: <span className="text-indigo-600 dark:text-indigo-400">{item.sku || 'N/A'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all">
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-10 space-y-10 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Current Stock Status */}
            <div className="space-y-6">
              <div className="bg-slate-900 dark:bg-slate-800 rounded-[2rem] p-8 text-white shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Network Stock</p>
                <h4 className="text-5xl font-black tracking-tighter">{totalStock.toLocaleString()}</h4>
                <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                  {stockDistribution.map(s => (
                    <div key={s.shop} className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{s.shop}</span>
                      <span className="text-xs font-black">{s.qty.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] p-8 border border-indigo-100 dark:border-indigo-900/50">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Current Pricing</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Standard Price</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">MUR {item.price.toLocaleString()}</p>
                  </div>
                  {item.promoPrice && (
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase">Promo Price</p>
                      <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">MUR {item.promoPrice.toLocaleString()}</p>
                    </div>
                  )}
                  {item.offers && (
                    <div className="pt-4 border-t border-indigo-200/50 dark:border-indigo-900/50">
                      <p className="text-[9px] font-black text-amber-500 uppercase">Active Offers</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{item.offers}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: History Timeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">From Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">To Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Found</p>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{filteredMovements.length} Events</p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredMovements.length > 0 ? filteredMovements.map((m, idx) => {
                  const isPriceChange = m.note?.includes('Price Change') || m.note?.includes('Promo Change');
                  const isOfferChange = m.note?.includes('Offer Change');
                  
                  return (
                    <div key={m.id} className="relative pl-8 group">
                      {/* Timeline Line */}
                      {idx !== filteredMovements.length - 1 && (
                        <div className="absolute left-[11px] top-8 bottom-[-16px] w-[2px] bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors"></div>
                      )}
                      
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-2 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 shadow-sm flex items-center justify-center z-10 ${
                        isPriceChange ? 'bg-amber-500' : 
                        isOfferChange ? 'bg-purple-500' : 
                        m.type === 'IN' ? 'bg-emerald-500' : 
                        m.type === 'OUT' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}>
                        <i className={`text-[8px] text-white fa-solid ${
                          isPriceChange ? 'fa-tag' : 
                          isOfferChange ? 'fa-gift' : 
                          m.type === 'IN' ? 'fa-plus' : 
                          m.type === 'OUT' ? 'fa-minus' : 'fa-equals'
                        }`}></i>
                      </div>

                      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              {new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1">
                              {m.note || (m.type === 'IN' ? 'Stock Inbound' : m.type === 'OUT' ? 'Stock Outbound' : 'Stock Adjustment')}
                            </h5>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                              m.type === 'IN' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                              m.type === 'OUT' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : ''}{m.quantity}
                            </span>
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">{m.shop}</p>
                          </div>
                        </div>
                        {m.referenceId && (
                          <p className="text-[9px] font-mono text-indigo-400 dark:text-indigo-300 uppercase tracking-tighter">Ref: {m.referenceId}</p>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center opacity-20 grayscale">
                    <i className="fa-solid fa-timeline text-6xl mb-4"></i>
                    <p className="text-sm font-black uppercase tracking-[0.4em]">No history found in range</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
          <button onClick={onClose} className="px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl">
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemHistoryModal;
