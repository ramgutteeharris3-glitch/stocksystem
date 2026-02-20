
import React, { useState, useEffect } from 'react';
import { InventoryItem, Category } from '../types';
import { generateDescription } from '../services/geminiService';

interface ItemFormProps {
  item?: InventoryItem;
  onSave: (item: Partial<InventoryItem>) => void;
  onClose: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onSave, onClose }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl transition-colors">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{item ? 'Edit Product' : 'Register Product'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Price (Reg.)</label>
              <input 
                type="number"
                step="0.01"
                required
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-200"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Promo Price</label>
              <input 
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border border-indigo-100 dark:border-indigo-900/50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-indigo-50 dark:bg-indigo-900/20 font-black text-indigo-600 dark:text-indigo-400"
                value={formData.promoPrice}
                onChange={e => setFormData(prev => ({ ...prev, promoPrice: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Offer (Auto-mentions on Receipt)</label>
              <input 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                value={formData.offers}
                onChange={e => setFormData(prev => ({ ...prev, offers: e.target.value }))}
                placeholder="e.g. Buy 1 Get 1 Free"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Initial Qty</label>
              <input 
                type="number"
                required
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                value={formData.quantity}
                onChange={e => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Min. Alert</label>
              <input 
                type="number"
                required
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                value={formData.minQuantity}
                onChange={e => setFormData(prev => ({ ...prev, minQuantity: parseInt(e.target.value) }))}
              />
            </div>

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
                rows={2}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 dark:bg-slate-800 text-sm resize-none font-medium text-slate-600 dark:text-slate-300"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your product briefly..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase text-[10px] tracking-widest"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none uppercase text-[10px] tracking-widest"
            >
              Commit Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemForm;
