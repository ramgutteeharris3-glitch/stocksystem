
import React, { useMemo, useState, useRef } from 'react';
import { InventoryItem, SHOPS, ShopName } from '../types';

interface ShopComparisonProps {
  items: InventoryItem[];
  currentShop: ShopName;
}

interface AuditResult {
  sku: string;
  name: string;
  shop: string;
  type: 'PRICE' | 'PROMO' | 'OFFER' | 'STOCK';
  systemValue: string | number;
  csvValue: string | number;
  severity: 'high' | 'medium' | 'low';
}

const ShopComparison: React.FC<ShopComparisonProps> = ({ items, currentShop }) => {
  const [mode, setMode] = useState<'gap' | 'audit' | 'side-by-side'>('gap');
  const [targetShop, setTargetShop] = useState<ShopName>(currentShop === 'Global' ? 'Master' : currentShop);
  const [shopA, setShopA] = useState<ShopName>(currentShop === 'Global' ? 'Master' : currentShop);
  const [shopB, setShopB] = useState<ShopName>(SHOPS[2] as ShopName); // Default to another shop
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const missingItems = useMemo(() => {
    const actualShops = SHOPS.filter(s => s !== 'Global');
    
    return items.filter(item => {
      const stockInTarget = Number(item.stocks?.[targetShop]) || 0;
      if (stockInTarget > 0) return false;
      return actualShops.some(shop => (Number(item.stocks?.[shop]) || 0) > 2);
    }).map(item => {
      const sources = actualShops
        .filter(shop => (Number(item.stocks?.[shop]) || 0) > 2)
        .map(shop => ({ shop, qty: Number(item.stocks?.[shop]) }));
      
      return { ...item, sources };
    });
  }, [items, targetShop]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Assume header: SKU, Shop, Price, PromoPrice, Offers, Stock
      const results: AuditResult[] = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const skuIdx = headers.indexOf('sku');
      const shopIdx = headers.indexOf('shop');
      const priceIdx = headers.indexOf('price');
      const promoIdx = headers.indexOf('promoprice');
      const offerIdx = headers.indexOf('offers');
      const stockIdx = headers.indexOf('stock');

      if (skuIdx === -1 || shopIdx === -1) {
        alert('Invalid CSV format. Required columns: SKU, Shop');
        setIsProcessing(false);
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const sku = cols[skuIdx];
        const shop = cols[shopIdx];
        
        const item = items.find(it => it.sku.toLowerCase() === sku.toLowerCase());
        if (!item) continue;

        // Price Comparison
        if (priceIdx !== -1) {
          const csvPrice = Number(cols[priceIdx]);
          if (!isNaN(csvPrice) && csvPrice !== item.price) {
            results.push({
              sku, name: item.name, shop, type: 'PRICE',
              systemValue: item.price, csvValue: csvPrice, severity: 'high'
            });
          }
        }

        // Promo Comparison
        if (promoIdx !== -1) {
          const csvPromo = Number(cols[promoIdx]);
          const sysPromo = item.promoPrice || 0;
          if (!isNaN(csvPromo) && csvPromo !== sysPromo) {
            results.push({
              sku, name: item.name, shop, type: 'PROMO',
              systemValue: sysPromo, csvValue: csvPromo, severity: 'medium'
            });
          }
        }

        // Offer Comparison
        if (offerIdx !== -1) {
          const csvOffer = cols[offerIdx];
          const sysOffer = item.offers || '';
          if (csvOffer !== sysOffer) {
            results.push({
              sku, name: item.name, shop, type: 'OFFER',
              systemValue: sysOffer, csvValue: csvOffer, severity: 'medium'
            });
          }
        }

        // Stock Comparison
        if (stockIdx !== -1) {
          const csvStock = Number(cols[stockIdx]);
          const sysStock = Number(item.stocks?.[shop]) || 0;
          if (!isNaN(csvStock) && csvStock !== sysStock) {
            results.push({
              sku, name: item.name, shop, type: 'STOCK',
              systemValue: sysStock, csvValue: csvStock, severity: 'low'
            });
          }
        }
      }

      setAuditResults(results);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Comparison & Audit</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Cross-shop stock gaps and pricing synchronization</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <button 
            onClick={() => setMode('gap')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'gap' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
          >
            Gap Analysis
          </button>
          <button 
            onClick={() => setMode('side-by-side')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'side-by-side' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
          >
            Side-by-Side
          </button>
          <button 
            onClick={() => setMode('audit')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'audit' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
          >
            Price & Stock Audit
          </button>
        </div>
      </div>

      {mode === 'gap' ? (
        <>
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 w-fit">
            <span className="text-[9px] font-black text-slate-500 uppercase px-3">Target Shop:</span>
            <div className="flex flex-wrap gap-1 max-w-4xl">
              {SHOPS.filter(s => s !== 'Global').map(shop => (
                <button
                  key={shop}
                  onClick={() => setTargetShop(shop)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    targetShop === shop 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {shop}
                </button>
              ))}
            </div>
          </div>

          {missingItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-check-double text-emerald-600 dark:text-emerald-400 text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Range Complete</h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 max-w-xs mx-auto">
                {targetShop} currently has all items that are well-stocked in other locations.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Details</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Sources (&gt;2 units)</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {missingItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.sku}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.category}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2">
                          {item.sources.map(src => (
                            <div key={src.shop} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 px-2 py-1 rounded-lg">
                              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{src.shop}</span>
                              <span className="w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-md font-bold">{src.qty}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
                          Plan Transfer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : mode === 'side-by-side' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Shop A (Reference)</label>
              <div className="flex flex-wrap gap-2">
                {SHOPS.filter(s => s !== 'Global').map(shop => (
                  <button
                    key={shop}
                    onClick={() => setShopA(shop)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${
                      shopA === shop 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    {shop}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Shop B (Comparison)</label>
              <div className="flex flex-wrap gap-2">
                {SHOPS.filter(s => s !== 'Global').map(shop => (
                  <button
                    key={shop}
                    onClick={() => setShopB(shop)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${
                      shopB === shop 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    {shop}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Details</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{shopA} Stock</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{shopB} Stock</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map(item => {
                  const qtyA = Number(item.stocks?.[shopA]) || 0;
                  const qtyB = Number(item.stocks?.[shopB]) || 0;
                  const diff = qtyB - qtyA;
                  
                  if (qtyA === 0 && qtyB === 0) return null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.sku}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center font-black text-slate-700 dark:text-slate-300">{qtyA}</td>
                      <td className="px-8 py-6 text-center font-black text-slate-700 dark:text-slate-300">{qtyB}</td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                          diff > 0 ? 'bg-emerald-100 text-emerald-700' : 
                          diff < 0 ? 'bg-rose-100 text-rose-700' : 
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Data Integrity Audit</h3>
                <p className="text-indigo-100 text-xs mt-1 uppercase font-bold tracking-widest">Upload shop-level CSV to detect price and stock discrepancies</p>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
                >
                  <i className={`fa-solid ${isProcessing ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                  {isProcessing ? 'Processing...' : 'Upload Audit CSV'}
                </button>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">CSV Format Required</p>
                <p className="text-[10px] font-bold">SKU, Shop, Price, PromoPrice, Offers, Stock</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">Price Detection</p>
                <p className="text-[10px] font-bold">Compares CSV prices against Master Pricelist</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-200 mb-1">Stock Verification</p>
                <p className="text-[10px] font-bold">Validates physical shop stock against system records</p>
              </div>
            </div>
          </div>

          {auditResults.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product / Shop</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discrepancy Type</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">System Value</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">CSV Value</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditResults.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{res.name}</span>
                          <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">{res.shop} • {res.sku}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                          res.type === 'PRICE' ? 'bg-rose-100 text-rose-700' : 
                          res.type === 'STOCK' ? 'bg-amber-100 text-amber-700' : 
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {res.type} MISMATCH
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-slate-500">{res.systemValue}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{res.csvValue}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                          res.severity === 'high' ? 'bg-rose-600 text-white' :
                          res.severity === 'medium' ? 'bg-amber-500 text-white' :
                          'bg-slate-400 text-white'
                        }`}>
                          {res.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !isProcessing && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <i className="fa-solid fa-file-csv text-2xl"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">No Audit Data</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 uppercase font-bold tracking-wider">Upload a CSV file to begin the cross-shop verification process.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopComparison;
