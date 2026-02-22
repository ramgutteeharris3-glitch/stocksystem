
import React, { useState } from 'react';
import { InventoryItem, SHOPS, ShopName, Category } from '../types';

type ImportMode = 'MASTER_PRICELIST' | 'SHOP_RESTOCK';

interface ImportModalProps {
  initialShop: ShopName;
  onImport: (items: Partial<InventoryItem>[], targetShop: ShopName, mode: ImportMode) => void;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ initialShop, onImport, onClose }) => {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [previewItems, setPreviewItems] = useState<Partial<InventoryItem>[]>([]);
  const [targetShop, setTargetShop] = useState<ShopName>(initialShop === 'Global' ? 'Plouis' : initialShop);
  const [mode, setMode] = useState<ImportMode>('MASTER_PRICELIST');
  const [skippedLines, setSkippedLines] = useState<{ line: string; reason: string }[]>([]);

  const parseCleanNumber = (val: string | undefined): number => {
    if (val === undefined || val === null || val.trim() === '') return 0;
    const cleaned = val.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleSmartPaste = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setSkippedLines([]);
    
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const results: Partial<InventoryItem>[] = [];
    const skipped: { line: string; reason: string }[] = [];

    lines.forEach((line, index) => {
      // Split by comma, semicolon, or tab
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      
      if (parts.length < 2) {
        skipped.push({ line: `Line ${index + 1}: ${line.substring(0, 30)}...`, reason: 'Insufficient columns (need at least 2)' });
        return;
      }

      // Header Detection
      const firstCol = parts[0].toUpperCase();
      const secondCol = (parts[1] || '').toUpperCase();
      const headerKeywords = ['SKU', 'ITEMCODE', 'CODE', 'PRODUCT', 'ITEM', 'DESCRIPTION', 'NAME', 'PRICE', 'QTY', 'QUANTITY', 'UNITPRICE'];
      if (headerKeywords.some(key => firstCol === key || secondCol === key)) {
        skipped.push({ line: `Line ${index + 1}: ${line.substring(0, 30)}...`, reason: 'Header row detected' });
        return;
      }

      let sku = '';
      let name = '';
      let price = 0;
      let promo = 0;
      let qty = 0;
      let offers = '';

      /**
       * SMART MULTI-COLUMN MAPPING
       * Format A (6+ Columns): SKU, Description, Qty, Price, PromoPrice, Offers
       * Format B (2 Columns): Description, Value (Price or Qty)
       * Format C (3 Columns): SKU, Description, Value
       * Format D (4-5 Columns): SKU, Description, Price, Qty, [Promo]
       */
      if (parts.length >= 6) {
        sku = parts[0].toUpperCase().replace(/\s+/g, '');
        name = parts[1];
        qty = Math.floor(parseCleanNumber(parts[2]));
        price = parseCleanNumber(parts[3]);
        promo = parseCleanNumber(parts[4]);
        offers = parts[5] || '';
      } else if (parts.length === 2) {
        name = parts[0];
        const val = parseCleanNumber(parts[1]);
        if (mode === 'MASTER_PRICELIST') price = val;
        else qty = Math.floor(val);
      } else if (parts.length === 3) {
        sku = parts[0].toUpperCase().replace(/\s+/g, '');
        name = parts[1];
        const val = parseCleanNumber(parts[2]);
        if (mode === 'MASTER_PRICELIST') price = val;
        else qty = Math.floor(val);
      } else if (parts.length === 4 || parts.length === 5) {
        sku = parts[0].toUpperCase();
        name = parts[1];
        price = parseCleanNumber(parts[2]);
        qty = Math.floor(parseCleanNumber(parts[3]));
        if (parts[4]) promo = parseCleanNumber(parts[4]);
      }

      if (!name && !sku) {
        skipped.push({ line: `Line ${index + 1}: ${line.substring(0, 30)}...`, reason: 'Missing both Name and SKU' });
        return;
      }

      results.push({
        sku: sku || '',
        name: name || 'Unnamed Product',
        price: price,
        promoPrice: promo,
        quantity: qty,
        offers: offers,
        category: Category.OTHER,
        minQuantity: 5,
        description: name || ''
      });
    });

    setPreviewItems(results);
    setSkippedLines(skipped);
    setIsParsing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setRawText(event.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors">
        <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Bulk Import Engine</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-black uppercase tracking-[0.2em]">
              Process: <span className="text-indigo-600 dark:text-indigo-400">{mode === 'MASTER_PRICELIST' ? 'Price Override' : `Stock Override [${targetShop}]`}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-400 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all"><i className="fa-solid fa-xmark text-2xl"></i></button>
        </div>

        <div className="flex-grow overflow-y-auto p-10 space-y-10 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px]">1</span>
                  Select Mode
                </label>
                <div className="flex gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button onClick={() => { setMode('MASTER_PRICELIST'); setPreviewItems([]); }} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-2 ${mode === 'MASTER_PRICELIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <i className="fa-solid fa-tags text-lg"></i>
                    Prices Override
                  </button>
                  <button onClick={() => { setMode('SHOP_RESTOCK'); setPreviewItems([]); }} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-2 ${mode === 'SHOP_RESTOCK' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <i className="fa-solid fa-truck-ramp-box text-lg"></i>
                    Stock Override
                  </button>
                </div>
              </div>

              {mode === 'SHOP_RESTOCK' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px]">2</span>
                    Target Terminal
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {SHOPS.filter(s => s !== 'Master').map(shop => (
                      <button key={shop} onClick={() => setTargetShop(shop)} className={`px-2 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${targetShop === shop ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-50 dark:border-slate-700'}`}>{shop}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                     <span className="w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center text-[8px]">{mode === 'SHOP_RESTOCK' ? '3' : '2'}</span>
                     Raw Data
                   </label>
                </div>
                
                <div className="relative">
                  <textarea
                    className="w-full h-72 p-6 font-mono text-[11px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 resize-none shadow-inner outline-none transition-all text-slate-900 dark:text-white"
                    placeholder="Accepted Format (6 Columns):\nProduct Code, Description, Quantity, Price, Promo, Offers\n\nOr just Description, Value"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer bg-white dark:bg-slate-800 px-4 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase text-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm text-slate-600 dark:text-slate-300">
                    <i className="fa-solid fa-file-csv mr-2"></i> CSV File <input type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleSmartPaste} disabled={isParsing || !rawText.trim()} className="flex-1 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black dark:hover:bg-indigo-700 transition-all disabled:opacity-20">
                    {isParsing ? <i className="fa-solid fa-spinner animate-spin mr-2"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>}
                    Process Data
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-800/50">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pre-Sync Preview</label>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full uppercase">{previewItems.length} Records</span>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6 scrollbar-hide space-y-6">
                {previewItems.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-3">
                    <i className="fa-solid fa-circle-info text-amber-600 dark:text-amber-400 mt-0.5"></i>
                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed uppercase tracking-wide">
                      Note: Items with 0 stock will be imported but may be hidden in the main table. Toggle "All Items" in the inventory view to see them.
                    </p>
                  </div>
                )}

                {skippedLines.length > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation"></i> Skipped {skippedLines.length} Lines
                    </p>
                    <div className="space-y-2">
                      {skippedLines.map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-[9px] font-medium">
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{s.line}</span>
                          <span className="text-rose-500 dark:text-rose-400 font-black uppercase">{s.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewItems.length > 0 ? (
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-black">
                        <th className="pb-2 px-2">Identifier</th>
                        <th className="pb-2 px-2 text-right">New Qty</th>
                        <th className="pb-2 px-2 text-right">New Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item, i) => (
                        <tr key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden group">
                          <td className="py-3 px-4 rounded-l-xl">
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-[10px] uppercase truncate max-w-[200px]">{item.name}</p>
                            <p className="font-mono text-[8px] text-indigo-400 dark:text-indigo-300 uppercase tracking-tighter">{item.sku || 'No SKU'}</p>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-black text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">{item.quantity}</span>
                          </td>
                          <td className="py-3 px-4 text-right rounded-r-xl">
                            <span className="font-black text-[10px] text-slate-900 dark:text-white">{item.price?.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-4 opacity-30">
                    <i className="fa-solid fa-layer-group text-6xl"></i>
                    <p className="uppercase text-[10px] font-black tracking-[0.3em]">Waiting for data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-10 py-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">Cancel</button>
          <button onClick={() => onImport(previewItems, targetShop, mode)} disabled={previewItems.length === 0} className="flex-1 py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-20 flex items-center justify-center gap-3">
            <i className="fa-solid fa-cloud-arrow-up"></i> Commit Sync
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
