
import React, { useState, useMemo } from 'react';
import { StockMovement, SHOPS, ShopName } from '../types';

interface MovementTrackerProps {
  movements: StockMovement[];
  initialShop: ShopName;
  onViewReference: (referenceId: string) => void;
}

const MovementTracker: React.FC<MovementTrackerProps> = ({ movements, initialShop, onViewReference }) => {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedShop, setSelectedShop] = useState<ShopName>(initialShop);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return movements.filter(m => {
      const movementDate = m.date.split('T')[0];
      const isWithinRange = movementDate >= fromDate && movementDate <= toDate;
      const isSameShop = selectedShop === 'Master' || m.shop === selectedShop;
      const matchesSearch = m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (m.referenceId && m.referenceId.toLowerCase().includes(searchTerm.toLowerCase()));
      return isWithinRange && isSameShop && matchesSearch;
    });
  }, [movements, fromDate, toDate, selectedShop, searchTerm]);

  const summary = useMemo(() => {
    let inwards = 0;
    let outwards = 0;
    filtered.forEach(m => {
      if (m.type === 'IN') inwards += m.quantity;
      if (m.type === 'OUT') outwards += m.quantity;
      if (m.type === 'ADJUST') {
          if (m.quantity > 0) inwards += m.quantity;
          else outwards += Math.abs(m.quantity);
      }
    });
    return { inwards, outwards };
  }, [filtered]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Search & Filter Dashboard */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex-grow space-y-6">
            <div className="flex flex-col gap-2">
               <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Product Movement Audit</h2>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Detailed Stock Lifecycle Tracking</p>
               <button 
                 onClick={handleExportPDF}
                 className="no-print w-fit flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
               >
                 <i className="fa-solid fa-file-pdf"></i> Download Movement PDF
               </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Terminal</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs appearance-none"
                    value={selectedShop}
                    onChange={(e) => setSelectedShop(e.target.value as ShopName)}
                  >
                    {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">From Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">To Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
               </div>
               <div className="lg:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Search Identifier</label>
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                      type="text" 
                      placeholder="Name, SKU or Reference..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
               </div>
            </div>
          </div>
          
          <div className="flex gap-4 lg:mb-1">
             <div className="bg-emerald-50 px-6 py-5 rounded-[2rem] border border-emerald-100 flex flex-col items-center min-w-[140px] shadow-sm">
                <i className="fa-solid fa-arrow-down-long text-emerald-400 mb-2"></i>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Total Inward</p>
                <p className="text-3xl font-black text-emerald-700">{summary.inwards}</p>
             </div>
             <div className="bg-rose-50 px-6 py-5 rounded-[2rem] border border-rose-100 flex flex-col items-center min-w-[140px] shadow-sm">
                <i className="fa-solid fa-arrow-up-long text-rose-400 mb-2"></i>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Total Outward</p>
                <p className="text-3xl font-black text-rose-700">{summary.outwards}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Movement List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-6">Date & Time</th>
                <th className="px-8 py-6">Product & SKU</th>
                <th className="px-8 py-6">Terminal</th>
                <th className="px-8 py-6">Nature</th>
                <th className="px-8 py-6">Quantity</th>
                <th className="px-8 py-6">Reference / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-xs">{new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-800 text-sm uppercase truncate max-w-[200px]">{m.itemName}</p>
                    <p className="text-[10px] font-black text-indigo-400 tracking-wider">SKU: {m.sku}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                        m.shop === 'Master' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
                    }`}>
                      {m.shop}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2.5">
                       <div className={`w-2.5 h-2.5 rounded-full ring-4 ${
                         m.type === 'IN' ? 'bg-emerald-500 ring-emerald-100' : 
                         m.type === 'OUT' ? 'bg-rose-500 ring-rose-100' : 'bg-amber-500 ring-amber-100'
                       }`}></div>
                       <span className="text-[10px] font-black uppercase text-slate-800 tracking-tight">
                         {m.type === 'IN' ? 'Inward Entry' : m.type === 'OUT' ? 'Stock Out' : 'Adjustment'}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className={`text-lg font-black ${m.type === 'IN' ? 'text-emerald-600' : m.type === 'OUT' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : ''}{m.quantity}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="max-w-[240px]">
                        {m.referenceId ? (
                           <button 
                             onClick={() => onViewReference(m.referenceId!)}
                             className="text-[10px] font-black text-indigo-600 uppercase truncate hover:underline flex items-center gap-2 no-print"
                           >
                              <i className="fa-solid fa-receipt text-[8px]"></i>
                              Ref: {m.referenceId}
                           </button>
                        ) : (
                           <p className="text-[10px] font-black text-slate-400 uppercase">Manual Action</p>
                        )}
                        {m.referenceId && <p className="print-only text-[10px] font-black text-indigo-600 uppercase">REF: {m.referenceId}</p>}
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-1 line-clamp-2 italic">
                            "{m.note || 'No additional notes provided.'}"
                        </p>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                        <i className="fa-solid fa-boxes-stacked text-6xl mb-4 text-slate-300"></i>
                        <p className="font-black uppercase tracking-[0.4em] text-slate-400">Zero Movements Detected</p>
                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest no-print">Adjust filters or terminal selection</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Disclaimer */}
      <div className="flex justify-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center gap-4">
              <span className="w-8 h-px bg-slate-200"></span>
              Official Audit Trail - StockMaster Intelligence
              <span className="w-8 h-px bg-slate-200"></span>
          </p>
      </div>
    </div>
  );
};

export default MovementTracker;
