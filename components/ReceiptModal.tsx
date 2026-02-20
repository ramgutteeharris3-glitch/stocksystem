
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InventoryItem, ShopName, SHOPS, Transaction } from '../types';

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  promoPrice?: number;
  offers?: string;
  quantity: number;
  sku: string;
}

interface ReceiptModalProps {
  items: InventoryItem[];
  transactions: Transaction[];
  initialShop: ShopName;
  initialTransaction?: Transaction;
  isViewOnly?: boolean;
  onIssue: (data: any) => void;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ items, transactions, initialShop, initialTransaction, isViewOnly = false, onIssue, onClose }) => {
  const [selectedShop, setSelectedShop] = useState<ShopName>(initialTransaction?.shop as ShopName || initialShop);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>(initialTransaction?.items.map(i => {
    const inv = items.find(inv => inv.id === i.itemId);
    return {
      id: i.itemId,
      name: i.name,
      price: Number(i.price) || 0,
      originalPrice: Number(inv?.price) || Number(i.price) || 0,
      promoPrice: i.promoPrice,
      offers: i.offers,
      quantity: i.quantity,
      sku: i.sku || inv?.sku || 'N/A'
    };
  }) || []);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [manualDate, setManualDate] = useState(initialTransaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);

  const [customerName, setCustomerName] = useState(initialTransaction?.customerName || '');
  const [customerEmail, setCustomerEmail] = useState(initialTransaction?.customerEmail || '');
  const [customerAddress, setCustomerAddress] = useState(initialTransaction?.customerAddress || '');
  const [customerPhone, setCustomerPhone] = useState(initialTransaction?.customerPhone || '');
  
  const [salespersonName, setSalespersonName] = useState(initialTransaction?.salesperson || '');
  const [manualReceiptNumber, setManualReceiptNumber] = useState(initialTransaction?.receiptNumber || '');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState(initialTransaction?.invoiceNumber || '');
  const [discount, setDiscount] = useState(initialTransaction?.discount || 0);
  const [paymentMethod, setPaymentMethod] = useState(initialTransaction?.paymentMethod || 'Cash');
  const [paymentReference, setPaymentReference] = useState(initialTransaction?.paymentReference || '');
  const [footerNote, setFooterNote] = useState(initialTransaction?.footerNote || 'Thank you for your business!');

  const subtotalInclVat = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotalInclVat * (1 - discount/100);
  const subtotalExclVat = total / 1.15;
  const vatAmount = total - subtotalExclVat;
  const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);

  const updateCartItem = (id: string, field: keyof CartItem, value: number | string) => {
    if (isViewOnly) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleFinalize = () => {
    if (isViewOnly || isSubmitting) return;
    if (cart.length === 0) return alert("Cart is empty.");
    if (selectedShop === 'Master') return alert("Please select a specific shop terminal, not 'Master'.");

    setIsSubmitting(true);
    
    const finalizedDate = new Date(manualDate);
    if (manualDate === new Date().toISOString().split('T')[0]) {
        const now = new Date();
        finalizedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const finalReceiptNo = manualReceiptNumber.trim() || `R-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const finalSalesperson = salespersonName.trim() || `${selectedShop} Staff`;

    onIssue({
      id: initialTransaction?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
      type: 'RECEIPT',
      items: cart.map(c => ({ 
        itemId: c.id, 
        name: c.name, 
        sku: c.sku, 
        quantity: c.quantity, 
        price: c.price,
        promoPrice: c.promoPrice,
        offers: c.offers
      })),
      shop: selectedShop,
      receiptNumber: finalReceiptNo,
      invoiceNumber: manualInvoiceNumber.trim(),
      salesperson: finalSalesperson,
      customerName: customerName.trim() || 'Guest',
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerPhone: customerPhone.trim(),
      total,
      discount,
      paymentMethod,
      paymentReference: paymentReference.trim(),
      date: finalizedDate.toISOString(),
      footerNote: footerNote
    });
  };

  const filteredSearch = useMemo(() => {
    if (!searchQuery || isViewOnly) return [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery, isViewOnly]);

  const addToCart = (item: InventoryItem) => {
    const existing = cart.find(c => c.id === item.id);
    const itemPrice = Number(item.price) || 0;
    const itemPromo = (item.promoPrice && item.promoPrice > 0) ? Number(item.promoPrice) : null;
    const finalPrice = itemPromo !== null ? itemPromo : itemPrice;

    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { 
        id: item.id, 
        name: item.name, 
        price: finalPrice, 
        originalPrice: itemPrice,
        promoPrice: itemPromo || undefined,
        offers: item.offers,
        quantity: 1, 
        sku: item.sku 
      }]);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
    
    // Maintain focus for continuous entry
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  const formatPrice = (val: number | undefined) => {
    return (Number(val) || 0).toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors">
      <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] transition-colors`}>
        {!isViewOnly && (
          <div className="flex-1 bg-white dark:bg-slate-900 p-8 overflow-y-auto scrollbar-hide space-y-8 border-r dark:border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">Transaction Registry</h3>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Add items and finalize customer record</p>
              </div>
              <div className="flex items-center gap-3 no-print">
                 <div className="flex flex-col items-end">
                   <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Issue Date</label>
                   <input 
                    type="date" 
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={manualDate} 
                    onChange={e => setManualDate(e.target.value)}
                   />
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-shop"></i> Terminal Selection
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SHOPS.filter(s => s !== 'Master').map(shop => (
                  <button 
                    key={shop} 
                    onClick={() => setSelectedShop(shop)}
                    className={`px-2 py-2.5 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${selectedShop === shop ? 'bg-indigo-600 text-white border-indigo-600 shadow-md dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-50 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900'}`}
                  >
                    {shop}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 relative">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1 block">Search to Add Multiple Items</label>
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"></i>
                  <input 
                    ref={searchInputRef}
                    placeholder="Type Product Name or Scan SKU..." 
                    className="w-full pl-11 pr-4 py-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    value={searchQuery} 
                    onChange={e => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} 
                    onFocus={() => setIsDropdownOpen(true)}
                  />
                </div>
                {isDropdownOpen && searchQuery && (
                  <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl z-20 max-h-64 overflow-auto border border-slate-100 dark:border-slate-700 mt-2 p-2 transition-colors">
                    {filteredSearch.map(it => {
                      const hasPromo = it.promoPrice && Number(it.promoPrice) > 0;
                      const shopStock = it.stocks?.[selectedShop] || 0;
                      const inCart = cart.find(c => c.id === it.id);
                      return (
                        <button key={it.id} onClick={() => addToCart(it)} className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors mb-1 last:mb-0 border-b last:border-0 border-slate-50 dark:border-slate-700 flex justify-between items-center group">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{it.name}</p>
                              {hasPromo && <span className="bg-indigo-600 text-white text-[8px] font-black px-1 rounded uppercase">Promo</span>}
                              {inCart && <span className="bg-emerald-500 text-white text-[8px] font-black px-1 rounded uppercase">In Cart (x{inCart.quantity})</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-widest">{it.sku.toUpperCase()}</p>
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                                <i className={`fa-solid fa-layer-group text-[8px] ${shopStock > 0 ? 'text-indigo-400' : 'text-rose-400'}`}></i>
                                <p className={`text-[9px] font-black uppercase ${shopStock > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {selectedShop}: {shopStock} Unit(s)
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-black text-slate-700 dark:text-slate-300 shrink-0">MUR {formatPrice(hasPromo ? it.promoPrice : it.price)}</p>
                            <i className="fa-solid fa-plus-circle text-indigo-300 group-hover:text-indigo-600 text-lg transition-colors"></i>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                Basket Contents 
                <div className="flex gap-4">
                  <span className="text-indigo-600 dark:text-indigo-400">{cart.length} unique items</span>
                  <span className="text-slate-800 dark:text-white">{totalUnits} total units</span>
                </div>
              </label>
              <div className="space-y-3">
                {cart.length > 0 ? cart.map(c => {
                  const originalItem = items.find(it => it.id === c.id);
                  const availableStock = originalItem?.stocks?.[selectedShop] || 0;
                  const isStockWarning = c.quantity > availableStock;

                  return (
                    <div key={c.id} className={`p-4 rounded-2xl border transition-colors space-y-3 ${isStockWarning ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-800 dark:text-white uppercase">{c.name}</p>
                            {isStockWarning && (
                              <span className="flex items-center gap-1 text-[8px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-1.5 py-0.5 rounded uppercase animate-pulse">
                                <i className="fa-solid fa-circle-exclamation"></i> Over Stock
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold tracking-widest">{c.sku.toUpperCase()}</p>
                            <span className={`text-[9px] font-black uppercase ${isStockWarning ? 'text-rose-500' : 'text-indigo-400 dark:text-indigo-500 opacity-60'}`}>
                              Available in {selectedShop}: {availableStock}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => setCart(cart.filter(it => it.id !== c.id))} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Quantity</label>
                          <input type="number" className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white ${isStockWarning ? 'border-rose-400 text-rose-600 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700'}`} value={c.quantity} onChange={e => updateCartItem(c.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Unit Price</label>
                          <input type="number" className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={c.price} onChange={e => updateCartItem(c.id, 'price', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                     <i className="fa-solid fa-cart-arrow-down text-4xl mb-4 text-slate-400 dark:text-slate-500"></i>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">No items added to receipt</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Receipt # <span className="text-[8px] opacity-60 font-bold">(OPTIONAL)</span></label>
                  <input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 focus:border-indigo-500 focus:ring-0 outline-none" value={manualReceiptNumber} onChange={e => setManualReceiptNumber(e.target.value)} placeholder="Auto-generated if empty" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Invoice # <span className="text-[8px] opacity-60 font-bold">(OPTIONAL)</span></label>
                  <input className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 focus:border-indigo-500 focus:ring-0 outline-none" value={manualInvoiceNumber} onChange={e => setManualInvoiceNumber(e.target.value)} placeholder="VAT-XXXX" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-user-tag"></i> Customer Information <span className="text-[8px] opacity-60 font-black tracking-normal ml-auto">(OPTIONAL)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1 block">Full Name</label>
                    <input placeholder="e.g. Jean Dupont" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-all" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1 block">Phone Number</label>
                    <input placeholder="+230 XXX XXXX" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-all" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1 block">Email Address</label>
                    <input placeholder="email@example.com" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-all" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1 block">Residential Address</label>
                    <textarea 
                      placeholder="Line 1, Line 2, City, Country..." 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-all resize-none" 
                      rows={2}
                      value={customerAddress} 
                      onChange={e => setCustomerAddress(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payment & Notes</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Cash', 'Card', 'Juice', 'Transfer'].map(method => (
                    <button key={method} onClick={() => setPaymentMethod(method)} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${paymentMethod === method ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg dark:shadow-none' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                      {method}
                    </button>
                  ))}
                </div>
                {paymentMethod !== 'Cash' && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase ml-1">Reference # <span className="opacity-60 font-bold">(OPTIONAL)</span></label>
                    <input placeholder={`Reference # for ${paymentMethod}`} className="w-full px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-sm font-bold text-slate-900 dark:text-white" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Salesperson</label>
                    <input placeholder="Staff Name" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700" value={salespersonName} onChange={e => setSalespersonName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Discount %</label>
                    <input type="number" placeholder="Discount %" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700" value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-8 flex flex-col items-center justify-between overflow-y-auto scrollbar-hide">
          <div className="w-full flex justify-between items-center no-print mb-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Document Preview</h4>
            <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
          </div>
          
          <div className="bg-white w-full max-w-[340px] shadow-2xl p-8 font-mono text-[11px] text-black rounded-sm print:shadow-none print:border print:border-black flex flex-col min-h-[500px]">
             <div className="text-center mb-8">
                <p className="font-black text-lg tracking-tighter">STOCKMASTER</p>
                <p className="text-[9px] opacity-60">TERMINAL: {selectedShop.toUpperCase()}</p>
                <div className="font-bold border-y border-black py-2 mt-4 uppercase">
                   <p>RECEIPT: {manualReceiptNumber || 'PENDING'}</p>
                   {manualInvoiceNumber && <p className="text-[9px] mt-0.5 opacity-80">VAT INV: {manualInvoiceNumber}</p>}
                </div>
                <p className="text-[8px] mt-2 opacity-60">
                    {new Date(manualDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                </p>
             </div>
             
             <div className="space-y-4 mb-8 flex-grow">
                <div className="flex justify-between border-b border-black pb-1 uppercase font-black text-[9px]">
                  <span>Description</span>
                  <span>Total</span>
                </div>
                {cart.map(c => (
                  <div key={c.id} className="flex flex-col border-b border-black/5 pb-2 mb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start font-bold leading-tight">
                      <div className="flex flex-col">
                        <span className="uppercase">{c.name}</span>
                        <span className="text-[9px] opacity-70">{c.quantity.toFixed(1)} @ {formatPrice(c.price)}</span>
                      </div>
                      <span className="font-black">{(c.price * c.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
             </div>

             <div className="border-t border-black pt-3 space-y-1.5">
                <div className="flex justify-between font-bold"><span>SUBTOTAL (INCL. VAT)</span><span>{subtotalInclVat.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-rose-600 italic"><span>DISCOUNT ({discount}%)</span><span>-{(subtotalInclVat * discount / 100).toFixed(2)}</span></div>}
                
                <div className="border-t border-black/10 pt-2 space-y-1 uppercase text-[9px] font-bold">
                   <div className="flex justify-between"><span>PRICE BEFORE VAT</span><span>{subtotalExclVat.toFixed(2)}</span></div>
                   <div className="flex justify-between"><span>VAT (15%)</span><span>{vatAmount.toFixed(2)}</span></div>
                </div>

                <div className="flex justify-between font-black text-sm border-t-2 border-black pt-2 mb-4"><span>TOTAL MUR</span><span>{total.toFixed(2)}</span></div>
             </div>

             <div className="mt-8 pt-6 border-t border-dashed border-black text-[9px] uppercase font-bold space-y-3">
                <div className="flex justify-between"><span>Settled By:</span><span>{paymentMethod.toUpperCase()}</span></div>
                {paymentReference && <div className="flex justify-between"><span>Reference:</span><span className="truncate max-w-[120px] font-black">{paymentReference.toUpperCase()}</span></div>}
                <div className="pt-4 text-center border-t border-black/5 space-y-1">
                   <p className="opacity-60">Served By: {(salespersonName || `${selectedShop} Staff`).toUpperCase()}</p>
                   <p className="mt-2 text-indigo-600">Customer Details:</p>
                   <p className="font-black">{customerName.toUpperCase() || 'GUEST'}</p>
                   {customerPhone && <p>PH: {customerPhone}</p>}
                   {customerEmail && <p className="lowercase font-medium">{customerEmail}</p>}
                   {customerAddress && <p className="mt-1 opacity-70 italic leading-tight">{customerAddress.toUpperCase()}</p>}
                   <p className="mt-6 text-[10px] font-black">*** END OF RECEIPT ***</p>
                </div>
             </div>
          </div>

          {!isViewOnly && (
            <div className="w-full max-w-[340px] no-print mt-8 space-y-3">
              <button onClick={handleFinalize} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <i className="fa-solid fa-print"></i> Process & Print
              </button>
              <button onClick={onClose} className="w-full py-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-[10px] uppercase border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Abort Entry</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
