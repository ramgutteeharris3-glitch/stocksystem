
import React, { useMemo, useState, useRef } from 'react';
import { InventoryItem, SHOPS, ShopName } from '../types';

interface ShopComparisonProps {
  items: InventoryItem[];
  currentShop: ShopName;
}

interface RequisitionItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  sourceShop: ShopName;
  availableStock: number;
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
  const [mode, setMode] = useState<'gap' | 'audit' | 'side-by-side' | 'finder'>('gap');
  const [targetShop, setTargetShop] = useState<ShopName>(currentShop === 'Global' ? 'Master' : currentShop);
  const [shopA, setShopA] = useState<ShopName>(currentShop === 'Global' ? 'Master' : currentShop);
  const [shopB, setShopB] = useState<ShopName>(SHOPS[2] as ShopName); // Default to another shop
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [requisitionList, setRequisitionList] = useState<RequisitionItem[]>([]);
  const [requesterName, setRequesterName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ item: InventoryItem, shop: ShopName } | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 20);
  }, [items, searchQuery]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const confirmRequisition = () => {
    if (!pendingItem) return;
    const qty = parseInt(pendingQty) || 1;
    const { item, shop } = pendingItem;

    const existing = requisitionList.find(r => r.id === item.id && r.sourceShop === shop);
    if (existing) {
      setRequisitionList(prev => prev.map(r => (r.id === item.id && r.sourceShop === shop) ? { ...r, quantity: r.quantity + qty } : r));
    } else {
      setRequisitionList(prev => [...prev, {
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: qty,
        sourceShop: shop,
        availableStock: Number(item.stocks?.[shop]) || 0
      }]);
    }
    showToast(`Added ${qty}x ${item.name} to request list`);
    setPendingItem(null);
    setPendingQty('1');

    // Auto-scroll to list if it's the first item
    if (requisitionList.length === 0) {
      setTimeout(() => {
        document.getElementById('requisition-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const addToRequisition = (item: InventoryItem, sourceShop: ShopName) => {
    setPendingItem({ item, shop: sourceShop });
    setPendingQty('1');
  };

  const updateReqQuantity = (id: string, sourceShop: ShopName, qty: number) => {
    setRequisitionList(prev => prev.map(r => (r.id === id && r.sourceShop === sourceShop) ? { ...r, quantity: Math.max(1, qty) } : r));
  };

  const removeReqItem = (id: string, sourceShop: ShopName) => {
    setRequisitionList(prev => prev.filter(r => !(r.id === id && r.sourceShop === sourceShop)));
  };

  const downloadCSV = () => {
    const date = new Date().toLocaleDateString('en-GB');
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
    let fileName = `comparison_${mode}_${new Date().getTime()}.csv`;
    
    if (mode === 'side-by-side') {
      csvContent += `Comparison Report: ${shopA} vs ${shopB}\n`;
      csvContent += `Date: ${date}\n\n`;
      csvContent += `Product,SKU,${shopA} Stock,${shopB} Stock\n`;
      
      items.forEach(item => {
        const qtyA = Number(item.stocks?.[shopA]) || 0;
        const qtyB = Number(item.stocks?.[shopB]) || 0;
        if (qtyA > 0 || qtyB > 0) {
          csvContent += `"${item.name.replace(/"/g, '""')}","${item.sku}",${qtyA},${qtyB}\n`;
        }
      });
    } else if (mode === 'gap') {
      csvContent += `Gap Analysis Report for ${targetShop}\n`;
      csvContent += `Date: ${date}\n\n`;
      csvContent += `Product,SKU,Category,Available Sources\n`;
      
      missingItems.forEach(item => {
        const sources = item.sources.map(s => `${s.shop}(${s.qty})`).join('; ');
        csvContent += `"${item.name.replace(/"/g, '""')}","${item.sku}","${item.category}","${sources}"\n`;
      });
    } else if (mode === 'finder') {
      csvContent += `Stock Finder Report for "${searchQuery}"\n`;
      csvContent += `Date: ${date}\n\n`;
      const shops = SHOPS.filter(s => s !== 'Global');
      csvContent += `Product,SKU,${shops.join(',')}\n`;
      
      filteredItems.forEach(item => {
        const stocks = shops.map(s => Number(item.stocks?.[s]) || 0).join(',');
        csvContent += `"${item.name.replace(/"/g, '""')}","${item.sku}",${stocks}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Download Started");
  };

  const downloadRequisitionCSV = () => {
    const date = new Date().toLocaleDateString('en-GB');
    let csvContent = "\uFEFF";
    csvContent += `Stock Requisition Form\n`;
    csvContent += `Requesting Shop: ${currentShop}\n`;
    csvContent += `Date: ${date}\n`;
    csvContent += `Requested By: ${requesterName || 'N/A'}\n\n`;
    csvContent += `Product,SKU,Source Shop,Requested Qty\n`;
    
    requisitionList.forEach(item => {
      csvContent += `"${item.name.replace(/"/g, '""')}","${item.sku}","${item.sourceShop}",${item.quantity}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `requisition_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Requisition CSV Downloaded");
  };

  const handleExport = () => {
    downloadCSV();
  };

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {toast && (
        <div className="fixed top-24 right-8 z-[110] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 no-print">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-check text-xs"></i>
          </div>
          <p className="text-xs font-black uppercase tracking-widest">{toast}</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Comparison & Audit</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Cross-shop stock gaps and pricing synchronization</p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={handleExport}
            className="px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-file-csv"></i>
            Download CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
            title="Print View"
          >
            <i className="fa-solid fa-print"></i>
          </button>
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
              onClick={() => setMode('finder')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'finder' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
            >
              Stock Finder
            </button>
            <button 
              onClick={() => setMode('audit')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'audit' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
            >
              Price & Stock Audit
            </button>
          </div>
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
                            <button 
                              key={src.shop} 
                              onClick={() => addToRequisition(item, src.shop as ShopName)}
                              className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group/src"
                            >
                              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{src.shop}</span>
                              <span className="w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-md font-bold">{src.qty}</span>
                              <i className="fa-solid fa-plus text-[8px] text-indigo-400 opacity-0 group-hover/src:opacity-100 transition-opacity"></i>
                            </button>
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
                      <td className="px-8 py-6 text-center font-black text-slate-700 dark:text-slate-300">
                        <button 
                          onClick={() => addToRequisition(item, shopA)}
                          className="hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                          {qtyA}
                          {qtyA > 0 && <i className="fa-solid fa-plus text-[8px] no-print"></i>}
                        </button>
                      </td>
                      <td className="px-8 py-6 text-center font-black text-slate-700 dark:text-slate-300">
                        <button 
                          onClick={() => addToRequisition(item, shopB)}
                          className="hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                          {qtyB}
                          {qtyB > 0 && <i className="fa-solid fa-plus text-[8px] no-print"></i>}
                        </button>
                      </td>
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
      ) : mode === 'finder' ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 block">Global Stock Finder</label>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="text"
                placeholder="Search product name or SKU across all outlets..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {searchQuery && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Product</th>
                      {SHOPS.filter(s => s !== 'Global').map(shop => (
                        <th key={shop} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{shop}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800 dark:text-white text-xs uppercase">{item.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.sku}</p>
                        </td>
                        {SHOPS.filter(s => s !== 'Global').map(shop => {
                          const stock = Number(item.stocks?.[shop]) || 0;
                          return (
                            <td key={shop} className="px-4 py-6 text-center">
                              <button 
                                onClick={() => addToRequisition(item, shop as ShopName)}
                                className={`w-10 h-10 rounded-xl text-[10px] font-black flex items-center justify-center transition-all ${
                                  stock > 10 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                  stock > 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                                  'bg-slate-50 text-slate-300 dark:bg-slate-800'
                                } hover:scale-110 active:scale-95`}
                              >
                                {stock}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {pendingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                  <i className="fa-solid fa-cart-plus text-indigo-600 dark:text-indigo-400"></i>
                </div>
                <button onClick={() => setPendingItem(null)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Add to Requisition</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Requesting from {pendingItem.shop}</p>
              
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{pendingItem.item.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{pendingItem.item.sku}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Available Stock</span>
                  <span className="text-sm font-black text-indigo-600">{pendingItem.item.stocks?.[pendingItem.shop] || 0}</span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Quantity Needed</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setPendingQty(prev => Math.max(1, parseInt(prev) - 1).toString())}
                    className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    <i className="fa-solid fa-minus"></i>
                  </button>
                  <input 
                    type="number"
                    className="flex-grow h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-center font-black text-xl focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                    value={pendingQty}
                    onChange={(e) => setPendingQty(e.target.value)}
                    autoFocus
                  />
                  <button 
                    onClick={() => setPendingQty(prev => (parseInt(prev) + 1).toString())}
                    className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
              </div>

              <button 
                onClick={confirmRequisition}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                Add to Request List
              </button>
            </div>
          </div>
        </div>
      )}

      {requisitionList.length > 0 && (
        <div id="requisition-section" className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center justify-between no-print">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Requisition List</h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={downloadRequisitionCSV}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
              >
                <i className="fa-solid fa-file-csv"></i>
                Download CSV
              </button>
              <button 
                onClick={() => window.print()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
              >
                <i className="fa-solid fa-print"></i>
                Print Form
              </button>
              <button 
                onClick={() => setRequisitionList([])}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-8">
            {/* Requisition Header - Visible in Print */}
            <div className="mb-8 pb-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock Requisition Form</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Internal Transfer Request</p>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Requesting Shop</p>
                    <p className="text-sm font-black text-indigo-600 uppercase">{currentShop}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Request</p>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 no-print">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Requester Name</label>
                <input 
                  type="text"
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                />
              </div>
              
              <div className="print-only">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested By</p>
                <p className="text-sm font-black text-slate-800">{requesterName || '____________________'}</p>
              </div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Source Shop</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Requested Qty</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {requisitionList.map(item => (
                  <tr key={`${item.id}-${item.sourceShop}`} className="group">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-800 dark:text-white text-xs uppercase">{item.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">SKU: {item.sku}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg">
                        {item.sourceShop}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-3 no-print">
                        <button 
                          onClick={() => updateReqQuantity(item.id, item.sourceShop, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <input 
                          type="number"
                          className="w-12 text-center bg-transparent font-black text-sm outline-none text-slate-900 dark:text-white"
                          value={item.quantity}
                          onChange={(e) => updateReqQuantity(item.id, item.sourceShop, parseInt(e.target.value) || 1)}
                        />
                        <button 
                          onClick={() => updateReqQuantity(item.id, item.sourceShop, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </button>
                      </div>
                      <span className="print-only font-black text-sm">{item.quantity}</span>
                    </td>
                    <td className="px-8 py-6 text-right no-print">
                      <button 
                        onClick={() => removeReqItem(item.id, item.sourceShop)}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 print-only mt-8">
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="h-px bg-slate-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase">Requested By</p>
                </div>
                <div className="text-center">
                  <div className="h-px bg-slate-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase">Approved By</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopComparison;
