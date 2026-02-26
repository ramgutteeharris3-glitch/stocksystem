
import React, { useState, useEffect } from 'react';
import { InventoryItem, Category, SHOPS } from '../types';
import { generateDescription } from '../services/geminiService';

interface ItemFormProps {
  item?: InventoryItem;
  onSave: (item: Partial<InventoryItem>) => void;
  onClose: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onSave, onClose }) => {
  const isNew = !item || !item.id;
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    sku: '',
    category: Category.OTHER,
    quantity: 0,
    minQuantity: 5,
    price: 0,
    promoPrice: 0,
    offers: '',
    description: '',
    stocks: {},
    ...item
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDescription = async () => {
    if (!formData.name) return;
    setIsGenerating(true);
    const desc = await generateDescription(formData.name);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleStockChange = (shop: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      stocks: {
        ...(prev.stocks || {}),
        [shop]: numValue
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-colors max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{isNew ? 'Register Product' : 'Edit Product'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Product Name</label>
                <input 
                  required
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. MacBook Pro M3"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">SKU Code</label>
                <input 
                  required
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white"
                  value={formData.sku}
                  onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="PROD-001"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select 
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {Object.values(Category).map(cat => <option key={cat} value={cat} className="dark:bg-slate-800">{cat}</option>)}
                </select>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Pricing & Offers</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Price (Reg.)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-200"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Promo Price</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-indigo-100 dark:border-indigo-900/50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-indigo-900/10 font-black text-indigo-600 dark:text-indigo-400"
                    value={formData.promoPrice}
                    onChange={e => setFormData(prev => ({ ...prev, promoPrice: parseFloat(e.target.value) }))}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Offer</label>
                  <input 
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                    value={formData.offers}
                    onChange={e => setFormData(prev => ({ ...prev, offers: e.target.value }))}
                    placeholder="e.g. Buy 1 Get 1 Free"
                  />
                </div>
              </div>
            </div>

            {/* Manual Stock Management Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Manual Stock Levels</h4>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Min. Alert:</label>
                  <input 
                    type="number"
                    className="w-16 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-bold text-center"
                    value={formData.minQuantity}
                    onChange={e => setFormData(prev => ({ ...prev, minQuantity: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SHOPS.filter(s => s !== 'Global').map(shop => (
                  <div key={shop} className="space-y-1">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate">{shop}</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white"
                      value={formData.stocks?.[shop] || 0}
                      onChange={e => handleStockChange(shop, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Section */}
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Info</label>
                <button 
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || !formData.name}
                  className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 transition-all"
                >
                  <i className={`fa-solid fa-bolt-lightning ${isGenerating ? 'animate-pulse' : ''}`}></i>
                  Auto-Generate
                </button>
              </div>
              <textarea 
                rows={4}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 text-sm resize-none font-medium text-slate-600 dark:text-slate-300"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your product briefly..."
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none uppercase text-[10px] tracking-widest"
            >
              {isNew ? 'Register Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
