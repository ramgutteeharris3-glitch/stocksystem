
import React, { useState, useMemo } from 'react';
import { InventoryItem, ShopName, SHOPS, Transaction, DocumentType } from '../types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
}

interface TransferModalProps {
  items: InventoryItem[];
  transactions: Transaction[];
  initialShop: ShopName;
  initialTransaction?: Transaction;
  isViewOnly?: boolean;
  onIssue: (data: Transaction) => void;
  onClose: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ items, transactions, initialShop, initialTransaction, isViewOnly = false, onIssue, onClose }) => {
  const [docType, setDocType] = useState<DocumentType>(initialTransaction?.type || 'DELIVERY_NOTE');
  const [selectedFromShop, setSelectedFromShop] = useState<ShopName>(initialTransaction?.shop || initialShop);
  const [selectedToShop, setSelectedToShop] = useState<ShopName>((initialTransaction?.toShop as ShopName) || (initialShop === 'Bagatelle' ? 'Plouis' : 'Bagatelle'));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>(initialTransaction?.items.map(i => ({
    id: i.itemId,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    sku: i.sku || items.find(inv => inv.id === i.itemId)?.sku || 'N/A'
  })) || []);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [staffName, setStaffName] = useState(initialTransaction?.salesperson || '');
  const [dnNumber, setDnNumber] = useState(initialTransaction?.deliveryNoteNumber || '');
  const [wtNumber, setWtNumber] = useState(initialTransaction?.transferNoteNumber || '');
  const [footerNote, setFooterNote] = useState(initialTransaction?.footerNote || 'Standard Warehouse Transfer');

  const filteredSearch = useMemo(() => {
    if (!searchQuery || isViewOnly) return [];
    return items.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const skuMatch = item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return (nameMatch || skuMatch);
    });
  }, [items, searchQuery, isViewOnly]);

  const addToCart = (item: InventoryItem) => {
    if (isViewOnly) return;
    
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      } else {
        return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, sku: item.sku }];
      }
    });

    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const addManualItem = () => {
    const manualItem: CartItem = {
      id: `manual-${Math.random().toString(36).substr(2, 9)}`,
      name: searchQuery || 'New Item',
      price: 0,
      quantity: 1,
      sku: 'MANUAL'
    };
    setCart(prev => [...prev, manualItem]);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const updateQuantity = (id: string, delta: number) => {
    if (isViewOnly) return;
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const handleFinalize = () => {
    if (isViewOnly || isSubmitting) return;
    if (cart.length === 0) return alert("Items list is empty.");
    if (selectedFromShop === selectedToShop) return alert("Source and Destination shops must be different.");
    if (!dnNumber.trim() && !wtNumber.trim()) return alert("DN or WT Number is mandatory.");

    setIsSubmitting(true);
    
    // Use DN as primary receiptNumber if available, else WT
    const primaryId = dnNumber.trim() || wtNumber.trim();

    onIssue({
      id: initialTransaction?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
      type: docType,
      receiptNumber: primaryId,
      invoiceNumber: '',
      deliveryNoteNumber: dnNumber.trim(),
      transferNoteNumber: wtNumber.trim(),
      date: initialTransaction?.date || new Date().toISOString(),
      shop: selectedFromShop,
      toShop: selectedToShop,
      salesperson: staffName.trim() || 'N/A',
      customerName: `Transfer: ${selectedFromShop} -> ${selectedToShop}`,
      items: cart.map(c => ({ itemId: c.id, name: c.name, sku: c.sku, quantity: c.quantity, price: c.price, parentId: (c as any).parentId })),
      subtotal: 0,
      total: 0,
      discount: 0,
      paymentMethod: 'TRANSFER',
      footerNote: footerNote.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
      <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] w-full ${isViewOnly ? 'max-w-2xl' : 'max-w-6xl'} overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] transition-colors`}>
        
        {!isViewOnly && (
          <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col h-full border-r border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Stock Transfer Designer</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Inventory Re-allocation Note</p>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-8 scrollbar-hide">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
                 <button onClick={() => setDocType('DELIVERY_NOTE')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${docType === 'DELIVERY_NOTE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Delivery Note</button>
                 <button onClick={() => setDocType('WAREHOUSE_TRANSFER')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${docType === 'WAREHOUSE_TRANSFER' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Transfer Note</button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Source Shop (OUT)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHOPS.filter(s => s !== 'Global').map(shop => (
                      <button key={shop} onClick={() => setSelectedFromShop(shop)} className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedFromShop === shop ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                        {shop}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Destination Shop (IN)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SHOPS.filter(s => s !== 'Global').map(shop => (
                      <button key={shop} onClick={() => setSelectedToShop(shop)} className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all ${selectedToShop === shop ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                        {shop}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">DN Number</label>
                    <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-white" value={dnNumber} onChange={e => setDnNumber(e.target.value)} placeholder="DN-XXXX" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">WT Number</label>
                    <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-white" value={wtNumber} onChange={e => setWtNumber(e.target.value)} placeholder="WT-XXXX" />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Staff Member</label>
                 <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-900 dark:text-white" value={staffName} onChange={e => setStaffName(e.target.value)} />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Select Items to Move</label>
                <div className="relative">
                  <input 
                    type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white"
                    placeholder="Search source stock..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setIsDropdownOpen(true);}}
                  />
                  {isDropdownOpen && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto">
                      {filteredSearch.map(item => (
                        <button key={item.id} type="button" onClick={() => addToCart(item)} className="w-full text-left p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center justify-between">
                          <div><p className="font-bold text-slate-800 dark:text-white">{item.name}</p><p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{item.sku}</p></div>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">Stock: {selectedFromShop === 'Master' ? 'N/A' : (item.stocks[selectedFromShop] || 0)}</span>
                        </button>
                      ))}
                      {filteredSearch.length === 0 && (
                        <button type="button" onClick={addManualItem} className="w-full text-left p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-widest">
                          <i className="fa-solid fa-plus-circle"></i> Add "{searchQuery}" as Manual Entry
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex-grow">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{item.sku}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-700 px-2 py-1 rounded-xl border border-slate-100 dark:border-slate-600">
                        <button type="button" onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 text-slate-400 dark:text-slate-500"><i className="fa-solid fa-minus text-xs"></i></button>
                        <span className="w-6 text-center font-black text-slate-800 dark:text-white text-xs">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 text-slate-400 dark:text-slate-500"><i className="fa-solid fa-plus text-xs"></i></button>
                      </div>
                      <button type="button" onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`flex-1 bg-slate-100 dark:bg-slate-950 p-8 flex flex-col items-center justify-start overflow-hidden relative h-full transition-colors`}>
           <div className="w-full flex justify-between items-center mb-6 no-print">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Transfer Note Preview</h4>
              <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 shadow-sm transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
           </div>

           <div className="bg-white w-full max-w-[340px] shadow-2xl p-6 flex flex-col font-mono text-[11px] text-black rounded-sm relative overflow-y-auto max-h-[75vh] scrollbar-hide">
              <div className="text-center space-y-1 mb-6 border-b-2 border-black pb-4">
                 <p className="text-base font-black uppercase">STOCKMASTER LOCAL</p>
                 <p className="font-black text-[14px] mt-2 border-2 border-black py-1">{docType.replace('_', ' ')}</p>
                 <div className="flex flex-col gap-0.5 mt-2">
                    {dnNumber && <p className="font-black">DN NO: {dnNumber.toUpperCase()}</p>}
                    {wtNumber && <p className="font-black">WT NO: {wtNumber.toUpperCase()}</p>}
                 </div>
                 <p className="text-[9px] mt-2">{new Date(initialTransaction?.date || Date.now()).toLocaleString().toUpperCase()}</p>
              </div>

              <div className="mb-4 bg-slate-50 p-2 border border-black space-y-1">
                 <div className="flex justify-between border-b border-black/10 pb-1">
                    <span className="font-black uppercase text-[9px]">From:</span>
                    <span className="font-black text-indigo-600">{selectedFromShop.toUpperCase()}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="font-black uppercase text-[9px]">To:</span>
                    <span className="font-black text-indigo-600">{selectedToShop.toUpperCase()}</span>
                 </div>
              </div>

              <div className="flex-grow py-4 border-t border-dashed border-black">
                 <div className="flex justify-between font-black uppercase border-b border-black mb-2">
                    <span>DESCRIPTION</span>
                    <span>QTY</span>
                 </div>
                 <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between font-black">
                        <span className="uppercase truncate max-w-[150px]">{item.name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="mt-8 pt-4 border-t-2 border-black text-center space-y-4">
                 <p className="text-[9px] font-black uppercase leading-tight italic">"{footerNote}"</p>
                 <div className="flex justify-between pt-6">
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-px bg-black mb-1"></div>
                       <p className="text-[8px] font-black">ISSUED BY</p>
                    </div>
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-px bg-black mb-1"></div>
                       <p className="text-[8px] font-black">RECEIVED BY</p>
                    </div>
                 </div>
              </div>
           </div>

           {!isViewOnly && (
             <div className="w-full max-w-[340px] mt-8 no-print">
               <button onClick={handleFinalize} disabled={isSubmitting} className="w-full py-4 bg-black dark:bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                 <i className="fa-solid fa-file-shield"></i> Validate Transfer
               </button>
             </div>
           )}

           {isViewOnly && (
             <button onClick={() => window.print()} className="w-full max-w-[340px] mt-8 py-3 bg-slate-800 dark:bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 no-print">
               <i className="fa-solid fa-print"></i> Print Note
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
