
import React, { useMemo } from 'react';
import { Transaction, ShopName, StockMovement } from '../types';

interface NotificationCenterProps {
  transactions: Transaction[];
  movements: StockMovement[];
  currentShop: ShopName;
  onEditTransaction: (txn: Transaction) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ transactions, movements, currentShop, onEditTransaction }) => {
  const pendingActions = useMemo(() => {
    return transactions.filter(t => {
      const isShopMatch = currentShop === 'Global' || t.shop === currentShop;
      if (!isShopMatch) return false;
      if (t.status === 'CANCELLED') return false;

      if (t.type === 'RECEIPT' && !t.invoiceNumber) {
        return true;
      }
      if (t.type === 'DELIVERY_NOTE' && !t.transferNoteNumber) {
        return true;
      }
      return false;
    });
  }, [transactions, currentShop]);

  const priceAlerts = useMemo(() => {
    return movements.filter(m => 
      m.note && (
        m.note.includes('Price Change') || 
        m.note.includes('Promo Change') || 
        m.note.includes('Offer Change')
      )
    ).slice(0, 20); // Show last 20 changes
  }, [movements]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Compliance Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Compliance Alerts</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Unlinked Documents & Pending Administrative Actions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl">
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                {pendingActions.length} Critical Alerts
              </p>
            </div>
          </div>
        </div>

        {pendingActions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check-double text-emerald-600 dark:text-emerald-400 text-xl"></i>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Documents Linked</h3>
            <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 max-w-xs mx-auto uppercase font-bold tracking-wider">No unlinked receipts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingActions.map(txn => (
              <div 
                key={txn.id} 
                onClick={() => onEditTransaction(txn)}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                      txn.type === 'RECEIPT' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                    }`}>
                      <i className={`fa-solid ${txn.type === 'RECEIPT' ? 'fa-file-invoice-dollar' : 'fa-truck-ramp-box'} text-xl`}></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          txn.type === 'RECEIPT' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {txn.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Ref: {txn.receiptNumber}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {txn.customerName}
                      </h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Issued on {new Date(txn.date).toLocaleDateString()} at {txn.shop}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50 px-4 py-3 rounded-2xl text-right">
                      <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Missing Link</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
                        {txn.type === 'RECEIPT' ? 'Invoice Number Required' : 'WT Number Required'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Price Monitor Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Price Monitor</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Real-time tracking of pricing and offer adjustments</p>
          </div>
        </div>

        {priceAlerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-slate-400 dark:text-slate-500 text-[11px] uppercase font-bold tracking-wider">No recent price adjustments recorded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priceAlerts.map(alert => (
              <div key={alert.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0 text-indigo-600">
                    <i className="fa-solid fa-tag"></i>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Price Sync Alert</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(alert.date).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{alert.itemName}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {alert.note}
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SKU: {alert.sku}</span>
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verified Global</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationCenter;
