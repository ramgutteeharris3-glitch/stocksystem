
import React, { useState, useMemo } from 'react';
import { InventoryItem, ShopName, SHOPS, Transaction, TransactionItem } from '../types';

interface CartItem extends TransactionItem {
  id: string;
}

interface VatRefundModalProps {
  items: InventoryItem[];
  transactions: Transaction[];
  initialShop: ShopName;
  initialTransaction?: Transaction;
  isViewOnly?: boolean;
  onIssue: (data: Transaction) => void;
  onClose: () => void;
}

const VatRefundModal: React.FC<VatRefundModalProps> = ({ items, transactions, initialShop, initialTransaction, isViewOnly = false, onIssue, onClose }) => {
  const [selectedShop, setSelectedShop] = useState<ShopName>(initialTransaction?.shop as ShopName || initialShop);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [linkedReceiptNo, setLinkedReceiptNo] = useState(initialTransaction?.receiptNumber || '');
  const [customerEmail, setCustomerEmail] = useState(initialTransaction?.customerEmail || '');
  
  const [cart, setCart] = useState<CartItem[]>(initialTransaction?.items.map(i => ({
    ...i,
    id: i.itemId,
  })) || []);

  const [visitor, setVisitor] = useState(initialTransaction?.visitor || {
    surname: '',
    otherNames: '',
    passportNo: '',
    nationality: '',
    dateOfIssue: '', 
    dateOfExpiry: '',
    flightNo: '',
    departureDate: '',
    permanentAddress: initialTransaction?.customerAddress || '',
  });

  const [serialNo, setSerialNo] = useState(initialTransaction?.receiptNumber || '');
  const [vatInvoice, setVatInvoice] = useState(initialTransaction?.invoiceNumber || '');
  const [salespersonName, setSalespersonName] = useState(initialTransaction?.salesperson || '');
  const [manualDate, setManualDate] = useState(initialTransaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const businessInfo = {
    name: 'Soc A.B Desai & Co A.B Desai &',
    address: 'Tribeca Mall Ebene Tribeca Mall',
    tel: '54224114',
    email: 'desai@intnet.mu',
    vatReg: '20903424',
    brn: 'P07005295',
  };

  const numberToWordsMUR = (amount: number): string => {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Million", "Billion"];
    if (amount === 0) return "Zero MUR";
    let words = "";
    let num = Math.floor(amount);
    const convertThreeDigit = (n: number) => {
      let str = "";
      if (n >= 100) { str += units[Math.floor(n / 100)] + " Hundred "; n %= 100; }
      if (n >= 10 && n <= 19) { str += teens[n - 10] + " "; } 
      else {
        if (n >= 20) { str += tens[Math.floor(n / 10)] + " "; n %= 10; }
        if (n > 0) { str += units[n] + " "; }
      }
      return str;
    };
    let i = 0;
    while (num > 0) {
      let rem = num % 1000;
      if (rem > 0) words = convertThreeDigit(rem) + thousands[i] + " " + words;
      num = Math.floor(num / 1000);
      i++;
    }
    return (words.trim() + " MUR Only").toUpperCase();
  };

  const filteredReceipts = useMemo(() => {
    if (!receiptSearchQuery || isViewOnly) return [];
    return transactions.filter(t => 
      t.type === 'RECEIPT' && 
      (t.receiptNumber.toLowerCase().includes(receiptSearchQuery.toLowerCase()) || 
       t.invoiceNumber.toLowerCase().includes(receiptSearchQuery.toLowerCase()))
    ).slice(0, 5);
  }, [transactions, receiptSearchQuery, isViewOnly]);

  const linkReceipt = (txn: Transaction) => {
    const newCart: CartItem[] = txn.items.map(i => ({
      ...i,
      id: i.itemId,
      brand: '',
      model: '',
      invoiceNo: txn.invoiceNumber || txn.receiptNumber
    }));
    setCart(newCart);
    setVatInvoice(txn.invoiceNumber);
    setLinkedReceiptNo(txn.receiptNumber);
    setSalespersonName(txn.salesperson);
    setCustomerEmail(txn.customerEmail || '');
    
    const parts = (txn.customerName && txn.customerName !== 'Guest') ? txn.customerName.split(' ') : ['', ''];
    setVisitor(prev => ({
      ...prev,
      surname: parts[parts.length - 1] || '',
      otherNames: parts.slice(0, parts.length - 1).join(' ') || '',
      permanentAddress: txn.customerAddress || prev.permanentAddress
    }));

    setReceiptSearchQuery('');
    setIsReceiptDropdownOpen(false);
  };

  const totalInclVat = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalExclVat = totalInclVat / 1.15;
  const vatAmount = totalInclVat - totalExclVat;

  const handleFinalize = () => {
    if (isViewOnly || isSubmitting) return;
    if (cart.length === 0) return alert("Please link a receipt first.");
    if (!serialNo.trim()) return alert("Serial Number (VP) is mandatory.");
    if (!visitor.passportNo) return alert("Passport Number is mandatory.");
    if (!visitor.permanentAddress) return alert("Permanent Address is required.");
    if (selectedShop === 'Master') return alert("Please select a specific shop terminal.");

    setIsSubmitting(true);
    onIssue({
      id: initialTransaction?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
      type: 'VAT_REFUND',
      receiptNumber: serialNo.trim(),
      invoiceNumber: vatInvoice.trim(),
      date: new Date(manualDate).toISOString(),
      shop: selectedShop,
      salesperson: salespersonName.trim(),
      customerName: `${visitor.surname} ${visitor.otherNames}`.trim() || 'Visitor',
      customerEmail: customerEmail.trim(),
      customerAddress: visitor.permanentAddress.trim(),
      items: cart,
      subtotal: totalExclVat,
      total: totalInclVat,
      discount: 0,
      paymentMethod: 'VAT_REFUND_DOC',
      visitor: visitor
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-7xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[95vh]">
        
        {!isViewOnly && (
          <div className="w-full md:w-1/3 bg-white border-r border-slate-100 flex flex-col h-full overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">VAT Refund Processing</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configuration Panel</p>
            </div>

            <div className="flex-grow overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {/* Terminal Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-shop"></i> Processing Terminal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SHOPS.filter(s => s !== 'Master').map(shop => (
                    <button 
                      key={shop} 
                      onClick={() => setSelectedShop(shop)}
                      className={`px-1 py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${selectedShop === shop ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-100'}`}
                    >
                      {shop}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt Linking Section */}
              <div className="space-y-3 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-link"></i> 1. Link Sales Receipt
                </label>
                <div className="relative">
                  <input 
                    className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" 
                    placeholder="Search Receipt #..." 
                    value={receiptSearchQuery} 
                    onChange={e => {setReceiptSearchQuery(e.target.value); setIsReceiptDropdownOpen(true);}}
                  />
                  {isReceiptDropdownOpen && filteredReceipts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 max-h-40 overflow-y-auto">
                       {filteredReceipts.map(txn => (
                         <button key={txn.id} onClick={() => linkReceipt(txn)} className="w-full text-left p-3 hover:bg-indigo-50 border-b last:border-0">
                            <p className="text-[10px] font-black text-slate-900">REC: {txn.receiptNumber}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase">Customer: {txn.customerName} • MUR {txn.total.toFixed(2)}</p>
                         </button>
                       ))}
                    </div>
                  )}
                </div>
                {linkedReceiptNo && (
                   <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-indigo-600 rounded-lg text-[9px] font-black text-white uppercase w-fit">
                      <i className="fa-solid fa-check-circle"></i> Linked: {linkedReceiptNo}
                   </div>
                )}
              </div>

              {/* Form Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Serial No (VP/...)</label>
                  <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={serialNo} onChange={e => setSerialNo(e.target.value)} placeholder="VP/..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Salesperson</label>
                  <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" value={salespersonName} onChange={e => setSalespersonName(e.target.value)} />
                </div>
              </div>

              {/* Visitor Passport Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-passport"></i> 2. Visitor Passport Info
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Surname" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={visitor.surname} onChange={e => setVisitor({...visitor, surname: e.target.value})} />
                  <input placeholder="Other Names" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={visitor.otherNames} onChange={e => setVisitor({...visitor, otherNames: e.target.value})} />
                  <input placeholder="Nationality" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={visitor.nationality} onChange={e => setVisitor({...visitor, nationality: e.target.value})} />
                  <input placeholder="Passport No" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase" value={visitor.passportNo} onChange={e => setVisitor({...visitor, passportNo: e.target.value})} />
                  
                  <div className="col-span-2 space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Passport Date of Issue</label>
                    <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={visitor.dateOfIssue} onChange={e => setVisitor({...visitor, dateOfIssue: e.target.value})} />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Passport Date of Expiry</label>
                    <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={visitor.dateOfExpiry} onChange={e => setVisitor({...visitor, dateOfExpiry: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Contact & Logistics Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-envelope"></i> 3. Contact & Logistics
                </h4>
                <div className="space-y-3">
                  <input placeholder="Email Address" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                  <textarea placeholder="Permanent Home Address (Include Country)" rows={2} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold resize-none" value={visitor.permanentAddress} onChange={e => setVisitor({...visitor, permanentAddress: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Flight No." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase" value={visitor.flightNo} onChange={e => setVisitor({...visitor, flightNo: e.target.value})} />
                    <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={visitor.departureDate} onChange={e => setVisitor({...visitor, departureDate: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white">
              <button onClick={handleFinalize} disabled={isSubmitting || cart.length === 0} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                Finalize Refund Form
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 bg-slate-200 p-8 flex flex-col items-center justify-start overflow-y-auto h-full scrollbar-hide`}>
           <div className="w-full flex justify-between items-center mb-6 no-print">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Official Replica Preview</h4>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-500 shadow-sm"><i className="fa-solid fa-xmark text-xl"></i></button>
           </div>

           <div className="bg-white w-full max-w-[21cm] p-[0.8cm] text-black font-sans text-[9px] leading-tight border border-slate-400 shadow-2xl print:shadow-none print:border-none print:m-0 print:p-[0.5cm]">
              <div className="border border-black p-0.5 min-h-[26cm] flex flex-col">
                <div className="text-center font-black py-1.5 border-b border-black uppercase text-[12px] tracking-wide">
                  VAT PAID SUPPLIES TO VISITOR
                </div>
                
                <div className="grid grid-cols-4 border-b border-black">
                  <div className="p-1.5 border-r border-black">Original</div>
                  <div className="p-1.5 border-r border-black font-bold uppercase">SERIAL NO:</div>
                  <div className="p-1.5 border-r border-black font-bold uppercase">{serialNo}</div>
                  <div className="p-1.5 flex flex-col justify-center">
                    <span className="text-[7px]">Linked Receipt:</span>
                    <span className="font-bold">{linkedReceiptNo || '---'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-1.5 border-r border-black">VAT Registration Number <span className="float-right font-bold ml-4">{businessInfo.vatReg}</span></div>
                  <div className="p-1.5 flex justify-between">
                    <span>Date of Sale:</span>
                    <span className="font-bold">{manualDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-1.5 border-r border-black flex justify-between">
                    <span>Full name of registered person</span>
                    <span className="font-bold underline text-center flex-grow ml-2">{businessInfo.name}</span>
                  </div>
                  <div className="p-1.5 flex justify-between">
                    <span>BRN: {businessInfo.brn}</span>
                    <span>VAT Invoice: <strong>{vatInvoice}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-4 border-b border-black bg-slate-50/20">
                  <div className="p-1.5 border-r border-black">Address:</div>
                  <div className="p-1.5 border-r border-black font-bold text-[8px] leading-none">{businessInfo.address}</div>
                  <div className="p-1.5 border-r border-black">Tel: {businessInfo.tel}</div>
                  <div className="p-1.5">Email: {businessInfo.email}</div>
                </div>

                <div className="flex-grow">
                  <table className="w-full border-collapse border-b border-black">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="border-r border-b border-black p-1 w-6">No</th>
                        <th className="border-r border-b border-black p-1">Item Description</th>
                        <th className="border-r border-b border-black p-1">SKU</th>
                        <th className="border-r border-b border-black p-1 flex flex-col items-center">
                          <span className="text-[8px] uppercase font-black">GOODS DESC.</span>
                        </th>
                        <th className="border-r border-b border-black p-1 w-10">Qty</th>
                        <th className="border-r border-b border-black p-1 text-right w-16">Unit Price</th>
                        <th className="border-b border-black p-1 text-right w-16">Total (MUR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.concat(Array(Math.max(0, 16 - cart.length)).fill({})).map((item: any, idx) => (
                        <tr key={idx} className="h-6 leading-none">
                          <td className="border-r border-black p-1 text-center font-bold text-[8px]">{item.id ? idx + 1 : ''}</td>
                          <td className="border-r border-black p-1 text-center font-bold uppercase text-[8px] flex flex-col items-start gap-0.5">
                            <span>{item.name || ''}</span>
                            {item.offers && <span className="text-[6px] italic leading-none opacity-60">OFFER: {item.offers}</span>}
                          </td>
                          <td className="border-r border-black p-1 text-center font-bold uppercase text-[8px]">{item.sku || ''}</td>
                          <td className="border-r border-black p-1 text-center text-[7px] uppercase font-bold">{item.id ? 'MERCHANDISE' : ''}</td>
                          <td className="border-r border-black p-1 text-center font-bold text-[8px]">{item.quantity ? item.quantity.toFixed(1) : ''}</td>
                          <td className="border-r border-black p-1 text-right font-bold text-[8px]">{item.price ? item.price.toFixed(1) : ''}</td>
                          <td className="p-1 text-right font-bold text-[8px]">{item.price ? (item.price * item.quantity).toFixed(2) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-2 border-r border-black space-y-2 flex flex-col justify-center">
                    <p className="flex justify-between items-end gap-2">
                      <span className="text-[8px] whitespace-nowrap">Total Sales in word:</span>
                      <span className="font-bold underline text-[8px] uppercase border-b border-dotted border-black flex-grow">
                         {numberToWordsMUR(totalInclVat)}
                      </span>
                    </p>
                    <p className="flex justify-between items-center text-[8px]">
                      <span>Issued by:</span>
                      <span className="font-bold underline text-[8px] uppercase">{salespersonName || '---'}</span>
                    </p>
                  </div>
                  <div className="p-2 font-bold space-y-1 text-right">
                    <div className="flex justify-between items-center text-[9px]"><span>Total excl. VAT</span><span>{totalExclVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between items-center text-[9px]"><span>VAT 15%</span><span>{vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between items-center border-t border-black pt-1 text-[10px]"><span>Total</span><span>{totalInclVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                  </div>
                </div>

                <div className="border-b border-black p-3 bg-slate-50/10">
                  <p className="font-black underline mb-3 text-[10px]">VISITOR DETAILS</p>
                  <div className="grid grid-cols-12 gap-x-6 gap-y-2">
                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase">Surname</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.surname}</span>
                    </div>
                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase">Other Names</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.otherNames}</span>
                    </div>
                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase">Passport No</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.passportNo}</span>
                    </div>
                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Nationality</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.nationality}</span>
                    </div>

                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Passport Issue Date</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.dateOfIssue || '---'}</span>
                    </div>
                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Passport Expiry Date</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.dateOfExpiry || '---'}</span>
                    </div>
                    
                    <div className="col-span-12 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Permanent Address</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase text-[7px]">{visitor.permanentAddress || '---'}</span>
                    </div>

                    <div className="col-span-12 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Email Address</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5">{customerEmail || '---'}</span>
                    </div>

                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Flight / Voyage</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5 uppercase">{visitor.flightNo}</span>
                    </div>
                    <div className="col-span-6 flex gap-2 items-end">
                      <span className="text-[8px] uppercase whitespace-nowrap">Date of departure</span>
                      <span className="font-bold border-b border-dotted border-black flex-grow pb-0.5">{visitor.departureDate}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                  <div className="p-3 border-r border-black space-y-3">
                    <p className="font-black text-[9px] mb-2 uppercase">FOR OFFICIAL USE</p>
                    <p>Signature of Customs Officer _____________________________</p>
                    <p>Name ______________________________________________</p>
                    <p>Identity No __________________________________________</p>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="font-black text-[9px] mb-2 uppercase">ACKNOWLEDGEMENT</p>
                    <p>I acknowledge having received the amount of MUR _________________________</p>
                    <p className="pt-8">Signature of Visitor _______________________</p>
                  </div>
                </div>

                <div className="p-3 text-[7px] leading-tight flex-grow bg-slate-50/5">
                   <p className="font-black text-[8px] mb-2 uppercase tracking-tighter">TERMS AND CONDITIONS</p>
                   <ol className="list-decimal pl-4 space-y-1">
                     <li>Visitor must present goods and this document to Customs for refund.</li>
                     <li>Linked Receipt <strong>{linkedReceiptNo || 'N/A'}</strong> must be valid and original.</li>
                   </ol>
                </div>
              </div>
           </div>

           <div className="w-full max-w-[340px] mt-8 flex flex-col gap-3 no-print">
             <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
               <i className="fa-solid fa-file-pdf"></i> Download PDF
             </button>
             {isViewOnly && (
               <button onClick={onClose} className="w-full py-3 bg-white text-slate-500 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                 Close View
               </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default VatRefundModal;
