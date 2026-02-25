
import React, { useState, useRef } from 'react';
import { InventoryItem, ShopName, SHOPS, WarehouseTransfer, Category } from '../types';
import { parseTransferNote, generateDescription } from '../services/geminiService';

interface WarehouseTransferModalProps {
  items: InventoryItem[];
  initialShop: ShopName;
  onFinalize: (transfer: WarehouseTransfer, newItems: Partial<InventoryItem>[]) => void;
  onClose: () => void;
  existingTransfer?: WarehouseTransfer;
}

const WarehouseTransferModal: React.FC<WarehouseTransferModalProps> = ({ 
  items, 
  initialShop, 
  onFinalize, 
  onClose,
  existingTransfer 
}) => {
  const [isParsing, setIsParsing] = useState(false);
  const [transferData, setTransferData] = useState<Partial<WarehouseTransfer>>(
    existingTransfer || {
      transferNoteNumber: '',
      date: new Date().toISOString().split('T')[0],
      fromShop: 'Master',
      items: [],
      status: 'ACTIVE'
    }
  );
  const [newItemsToCreate, setNewItemsToCreate] = useState<Partial<InventoryItem>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const parsed = await parseTransferNote(base64);
        
        // Match parsed items with existing inventory
        const processedItems = await Promise.all(parsed.items.map(async (pi) => {
          const cleanSku = pi.sku.trim().toLowerCase();
          const cleanName = pi.name.trim().toLowerCase();

          // Detect existing product by SKU or Name (case-insensitive)
          const existing = items.find(i => 
            i.sku.trim().toLowerCase() === cleanSku || 
            i.name.trim().toLowerCase() === cleanName
          );

          if (!existing) {
            // Check if we already added this to newItemsToCreate
            if (!newItemsToCreate.find(ni => ni.sku?.trim().toLowerCase() === cleanSku || ni.name?.trim().toLowerCase() === cleanName)) {
              const description = await generateDescription(pi.name);
              setNewItemsToCreate(prev => [...prev, {
                name: pi.name.trim(),
                sku: pi.sku.trim(),
                category: Category.OTHER,
                price: 0, // Manual entry required
                minQuantity: 5,
                description,
                stocks: {}
              }]);
            }
          } else {
            // If found, use the existing SKU and Name to ensure consistency
            pi.sku = existing.sku;
            pi.name = existing.name;
          }

          return {
            sku: pi.sku,
            name: pi.name,
            quantity: pi.quantity,
            toShop: pi.toShop as ShopName || initialShop
          };
        }));

        setTransferData(prev => ({
          ...prev,
          transferNoteNumber: parsed.transferNoteNumber,
          date: parsed.date,
          fromShop: parsed.fromShop || prev.fromShop || 'Master',
          items: processedItems
        }));
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert(error?.message || "Failed to parse transfer note. Please try again or enter manually.");
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...(transferData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setTransferData(prev => ({ ...prev, items: newItems }));
  };

  const updateNewItemPrice = (sku: string, price: number) => {
    setNewItemsToCreate(prev => prev.map(ni => ni.sku === sku ? { ...ni, price } : ni));
  };

  const removeItem = (index: number) => {
    const newItems = [...(transferData.items || [])];
    newItems.splice(index, 1);
    setTransferData(prev => ({ ...prev, items: newItems }));
  };

  const handleFinalize = () => {
    if (!transferData.transferNoteNumber) return alert("Transfer Note Number is required.");
    if (!transferData.items || transferData.items.length === 0) return alert("No items in transfer.");
    
    // Check if all new items have prices
    const missingPrices = newItemsToCreate.some(ni => ni.price === 0);
    if (missingPrices) return alert("Please set prices for all new products.");

    onFinalize({
      id: existingTransfer?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
      transferNoteNumber: transferData.transferNoteNumber!,
      date: transferData.date!,
      fromShop: transferData.fromShop!,
      items: transferData.items!,
      status: 'ACTIVE'
    }, newItemsToCreate);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Warehouse Transfer In</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">AI-Powered Note Processing</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <i className="fa-solid fa-xmark text-xl text-slate-400"></i>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-8">
          {!existingTransfer && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] bg-slate-50/50 dark:bg-slate-800/20">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto">
                  <i className={`fa-solid ${isParsing ? 'fa-spinner fa-spin' : 'fa-camera'} text-3xl text-indigo-600`}></i>
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase">Upload Transfer Note</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Capture or upload a photo of the warehouse document</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50"
                >
                  {isParsing ? 'Processing with Gemini AI...' : 'Select Photo'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Transfer Note #</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-900 dark:text-white"
                value={transferData.transferNoteNumber}
                onChange={e => setTransferData(prev => ({ ...prev, transferNoteNumber: e.target.value }))}
                placeholder="e.g. WT-2024-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Date</label>
              <input 
                type="date" 
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-900 dark:text-white"
                value={transferData.date}
                onChange={e => setTransferData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Source Shop (From)</label>
              <select 
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-900 dark:text-white outline-none"
                value={transferData.fromShop}
                onChange={e => setTransferData(prev => ({ ...prev, fromShop: e.target.value }))}
              >
                {SHOPS.filter(s => s !== 'Global').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-list-check text-indigo-500"></i>
              Transfer Items
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Product / SKU</th>
                    <th className="px-6 py-4">Destination Shop</th>
                    <th className="px-6 py-4 text-right">Quantity</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transferData.items?.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</p>
                        <p className="text-[10px] font-black text-indigo-500 uppercase">{item.sku}</p>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          className="bg-transparent font-bold text-xs text-slate-600 dark:text-slate-400 outline-none"
                          value={item.toShop}
                          onChange={e => updateItem(idx, 'toShop', e.target.value)}
                        >
                          {SHOPS.filter(s => s !== 'Global').map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input 
                          type="number" 
                          className="w-20 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg font-black text-right text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {newItemsToCreate.length > 0 && (
            <div className="space-y-4 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl">
              <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-sparkles"></i>
                New Products Detected
              </h4>
              <p className="text-[10px] text-amber-700 dark:text-amber-500 font-bold uppercase">These items will be added to your inventory. Please set their selling price.</p>
              <div className="space-y-3">
                {newItemsToCreate.map((ni, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{ni.name}</p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase">{ni.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Price (MUR)</span>
                      <input 
                        type="number" 
                        className="w-32 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-sm text-indigo-600"
                        value={ni.price}
                        onChange={e => updateNewItemPrice(ni.sku!, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
          <button onClick={onClose} className="px-8 py-4 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-800 dark:hover:text-white transition-all">
            Cancel
          </button>
          <button 
            onClick={handleFinalize}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
          >
            {existingTransfer ? 'Update Transfer' : 'Finalize Transfer In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseTransferModal;
