
import React, { useState } from 'react';
import { InventoryItem, ShopName } from '../types';

interface InventoryTableProps {
  items: InventoryItem[];
  currentShop: ShopName;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onDownload: () => void;
  onViewHistory: (item: InventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, currentShop, onEdit, onDelete, onDownload, onViewHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroStock, setHideZeroStock] = useState(true);

  const getStockCount = (item: InventoryItem) => {
    if (currentShop === 'Master') {
      return Object.values(item.stocks || {}).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    }
    return Number(item.stocks?.[currentShop]) || 0;
  };

  const filteredItems = items.filter(item => {
    const stock = getStockCount(item);
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Core Logic: Ignore items with 0 stock if hideZeroStock is active
    const passesStockFilter = hideZeroStock ? stock > 0 : true;
    
    return matchesSearch && passesStockFilter;
  });

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Inventory Terminal</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-md uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                {currentShop === 'Master' ? 'Global Network' : `Loc: ${currentShop}`}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                Showing {filteredItems.length} of {items.length} total
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleExportPDF}
            className="no-print flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
          >
            <i className="fa-solid fa-file-pdf"></i> Export View
          </button>

          <button 
            onClick={onDownload}
            className="no-print flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <i className="fa-solid fa-file-csv"></i> Download Stock
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 no-print">
          {/* Enhanced Stock Filter Toggle */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className={`text-[9px] font-black uppercase tracking-widest ${hideZeroStock ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {hideZeroStock ? 'In-Stock Only' : 'All Items'}
            </span>
            <button 
              onClick={() => setHideZeroStock(!hideZeroStock)}
              className={`w-10 h-5 rounded-full transition-all relative ${hideZeroStock ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hideZeroStock ? 'right-1' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="relative group w-full md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors group-focus-within:text-indigo-500"></i>
            <input 
              type="text" 
              placeholder="Live product search..."
              className="pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.25rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 w-full transition-all font-bold text-xs text-slate-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-8 py-6">Identity</th>
              <th className="px-8 py-6">Product Code</th>
              <th className="px-8 py-6">{currentShop === 'Master' ? 'Global Stock' : 'Shop Stock'}</th>
              <th className="px-8 py-6">Pricing Index</th>
              <th className="px-8 py-6 text-right no-print">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.length > 0 ? filteredItems.map(item => {
              const stock = getStockCount(item);
              const isLow = stock <= item.minQuantity;
              const hasDistribution = item.stocks && Object.keys(item.stocks).length > 0;
              const hasPromo = item.promoPrice && item.promoPrice > 0;

              return (
                <tr key={item.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group cursor-pointer" onClick={() => onViewHistory(item)}>
                  <td className="px-8 py-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase text-xs">{item.name}</p>
                        {item.offers && (
                          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 uppercase tracking-tighter shadow-sm">
                            {item.offers}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">{item.category}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {item.sku ? (
                      <span className="text-[10px] font-mono font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl shadow-sm uppercase">
                        {item.sku}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-slate-300 dark:text-slate-700 tracking-tighter italic">No Serial</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black ${isLow ? 'text-rose-600' : 'text-slate-900 dark:text-white'} tracking-tighter`}>
                          {stock.toLocaleString()}
                        </span>
                        {isLow && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-lg no-print">
                            <i className="fa-solid fa-triangle-exclamation text-[9px] text-rose-500"></i>
                            <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase">Low</span>
                          </div>
                        )}
                      </div>
                      {currentShop === 'Master' && hasDistribution && (
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-widest">
                          Distributed in {Object.keys(item.stocks || {}).length} hubs
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      {hasPromo ? (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">MUR {item.promoPrice?.toLocaleString()}</p>
                            <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black uppercase">Promo</span>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 line-through font-bold">REG: MUR {item.price.toLocaleString()}</p>
                        </>
                      ) : (
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 tracking-tight">MUR {item.price.toLocaleString()}</p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                         <i className="fa-solid fa-vault text-[9px] text-slate-300 dark:text-slate-700"></i>
                         <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-tighter">Val: MUR {(stock * (item.promoPrice || item.price)).toLocaleString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right no-print">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onEdit(item)} className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg hover:shadow-indigo-50 dark:hover:shadow-none rounded-2xl transition-all flex items-center justify-center">
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button onClick={() => onDelete(item.id)} className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 hover:shadow-lg hover:shadow-rose-50 dark:hover:shadow-none rounded-2xl transition-all flex items-center justify-center">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="py-32 text-center">
                   <div className="flex flex-col items-center justify-center opacity-20 grayscale">
                      <i className="fa-solid fa-filter-circle-xmark text-6xl mb-4"></i>
                      <p className="text-sm font-black uppercase tracking-[0.4em]">No products match filter</p>
                      {hideZeroStock && <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Toggle "All Items" to see products with zero stock</p>}
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
