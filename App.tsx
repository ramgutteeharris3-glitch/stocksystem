
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, InventoryStats, AIInsight, SHOPS, ShopName, Transaction, StockMovement, DocumentType, Customer } from './types';
import { INITIAL_ITEMS } from './constants';
import StatCard from './components/StatCard';
import InventoryTable from './components/InventoryTable';
import ItemForm from './components/ItemForm';
import ImportModal from './components/ImportModal';
import ReceiptModal from './components/ReceiptModal';
import TransferModal from './components/TransferModal';
import VatRefundModal from './components/VatRefundModal';
import TransactionTracker from './components/TransactionTracker';
import MovementTracker from './components/MovementTracker';
import SalesLedger from './components/SalesLedger';
import CustomerList from './components/CustomerList';
import { analyzeInventory } from './services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('inventory_data_v3');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('inventory_transactions_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('inventory_movements_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('inventory_customers_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'inventory' | 'tracker' | 'movements' | 'ledger' | 'customers'>('inventory');
  const [currentShop, setCurrentShop] = useState<ShopName>('Master');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isVatRefundOpen, setIsVatRefundOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('inventory_data_v3', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('inventory_transactions_v3', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('inventory_movements_v2', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('inventory_customers_v1', JSON.stringify(customers));
  }, [customers]);

  const stats = useMemo<InventoryStats>(() => {
    const isMaster = currentShop === 'Master';
    
    const filteredItems = items.map(item => ({
      ...item,
      currentQuantity: isMaster 
        ? Object.values(item.stocks || {}).reduce((a: number, b: number) => a + (Number(b) || 0), 0)
        : (Number(item.stocks?.[currentShop]) || 0)
    }));

    const totalItems = filteredItems.reduce((acc: number, item) => acc + item.currentQuantity, 0);
    const totalValue = filteredItems.reduce((acc: number, item) => acc + (item.currentQuantity * (Number(item.promoPrice) || Number(item.price) || 0)), 0);
    const lowStockCount = filteredItems.filter(item => item.currentQuantity <= item.minQuantity).length;
    
    const categories: Record<string, number> = {};
    items.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
    });

    return {
      totalItems,
      totalValue,
      lowStockCount,
      categoryDistribution: Object.entries(categories).map(([name, value]) => ({ name, value }))
    };
  }, [items, currentShop]);

  const runLocalAudit = async () => {
    if (items.length === 0) return;
    setIsAnalyzing(true);
    try {
      const data = await analyzeInventory(items);
      setInsights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runLocalAudit();
  }, [items]);

  const createMovement = (itemId: string, itemName: string, sku: string, shop: string, type: 'IN' | 'OUT' | 'ADJUST', quantity: number, refId?: string, note?: string): StockMovement => ({
    id: Math.random().toString(36).substr(2, 9).toUpperCase(),
    itemId,
    itemName,
    sku: sku.toUpperCase().trim(),
    shop,
    type,
    quantity,
    date: new Date().toISOString(),
    referenceId: refId,
    note
  });

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSaveItem = (itemData: Partial<InventoryItem>) => {
    const timestamp = new Date().toISOString();
    const normalizedSku = itemData.sku?.toUpperCase().trim() || '';
    const cleanPrice = Number(itemData.price) || 0;
    const cleanPromo = itemData.promoPrice ? Number(itemData.promoPrice) : undefined;
    
    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? { 
        ...i, 
        ...itemData, 
        price: cleanPrice,
        promoPrice: cleanPromo,
        sku: normalizedSku,
        lastUpdated: timestamp 
      } as InventoryItem : i));
    } else {
      const newItem: InventoryItem = {
        ...itemData as InventoryItem,
        id: Math.random().toString(36).substr(2, 9),
        sku: normalizedSku,
        price: cleanPrice,
        promoPrice: cleanPromo,
        stocks: itemData.stocks || {},
        lastUpdated: timestamp
      };
      setItems(prev => [...prev, newItem]);
      
      if (itemData.quantity && itemData.quantity > 0) {
        setMovements(prev => [
          createMovement(newItem.id, newItem.name, newItem.sku, 'Master', 'IN', itemData.quantity!, undefined, 'Initial stock entry'),
          ...prev
        ]);
      }
    }
    setIsFormOpen(false);
    setEditingItem(undefined);
  };

  const processStockChange = (txn: Transaction, isRevert: boolean) => {
    const multiplier = isRevert ? -1 : 1;
    const timestamp = new Date().toISOString();
    
    setItems(prevItems => {
      return prevItems.map(item => {
        const txnItem = txn.items.find(ti => ti.itemId === item.id);
        if (txnItem) {
          const stocks = { ...(item.stocks || {}) };
          const change = (txnItem.quantity || 0) * multiplier;
          stocks[txn.shop] = (Number(stocks[txn.shop]) || 0) - change;
          return { ...item, stocks, lastUpdated: timestamp };
        }
        return item;
      });
    });

    if (!isRevert) {
      const newMovements = txn.items.map(ti => createMovement(
        ti.itemId, 
        ti.name, 
        ti.sku, 
        txn.shop, 
        (txn.type === 'RECEIPT' || txn.type === 'DELIVERY_NOTE' || txn.type === 'WAREHOUSE_TRANSFER' || txn.type === 'VAT_REFUND') ? 'OUT' : 'IN', 
        ti.quantity, 
        txn.receiptNumber, 
        `${txn.type} - ${txn.toShop ? 'To: ' + txn.toShop : 'Sale'}`
      ));
      setMovements(prev => [...newMovements, ...prev]);
    } else {
      // FIX: Remove old movements associated with this receipt number when reverting
      setMovements(prev => prev.filter(m => m.referenceId !== txn.receiptNumber));
    }
  };

  const updateCustomerDatabase = (txn: Transaction, oldTxn?: Transaction) => {
    if (!txn.customerName || txn.customerName === 'Guest') return;

    setCustomers(prev => {
      const existingIdx = prev.findIndex(c => c.name === txn.customerName || (txn.customerEmail && c.email === txn.customerEmail));
      const timestamp = new Date().toISOString();
      const newAmount = txn.total || 0;
      const oldAmount = oldTxn ? (oldTxn.total || 0) : 0;

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          email: txn.customerEmail || updated[existingIdx].email,
          phone: txn.customerPhone || updated[existingIdx].phone,
          address: txn.customerAddress || updated[existingIdx].address,
          lastVisit: timestamp,
          // Correctly subtract old amount if this is an edit
          totalSpent: updated[existingIdx].totalSpent - oldAmount + newAmount
        };
        return updated;
      } else {
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          name: txn.customerName,
          email: txn.customerEmail || '',
          phone: txn.customerPhone || '',
          address: txn.customerAddress || '',
          lastVisit: timestamp,
          totalSpent: newAmount
        }];
      }
    });
  };

  const handleIssueDocument = (docData: Transaction) => {
    const existingTxn = transactions.find(t => t.id === docData.id);
    const duplicateByNumber = transactions.find(t => t.receiptNumber.trim().toLowerCase() === docData.receiptNumber.trim().toLowerCase() && t.id !== docData.id);
    
    if (duplicateByNumber) {
        alert("Validation Error: This document number already exists.");
        return;
    }

    // 1. Revert previous version's impact
    if (existingTxn) {
      processStockChange(existingTxn, true);
    }
    
    // 2. Apply new version's impact
    processStockChange(docData, false);
    updateCustomerDatabase(docData, existingTxn);
    
    // 3. Update transactions list (replace if existing, prepend if new)
    setTransactions(prev => {
      if (existingTxn) return prev.map(t => t.id === docData.id ? docData : t);
      return [docData, ...prev];
    });

    setIsReceiptOpen(false);
    setIsTransferOpen(false);
    setIsVatRefundOpen(false);
    setIsViewOnly(false);
    setEditingTransaction(undefined);
  };

  const handleBulkImport = (newItems: Partial<InventoryItem>[], targetShop: ShopName, mode: 'MASTER_PRICELIST' | 'SHOP_RESTOCK') => {
    const timestamp = new Date().toISOString();
    const importMovements: StockMovement[] = [];

    setItems(prev => {
      let updatedList = [...prev];
      newItems.forEach(importItem => {
        const normalizedSku = (importItem.sku || '').toUpperCase().trim();
        const normalizedName = (importItem.name || '').toUpperCase().trim();
        const cleanPrice = Number(importItem.price) || 0;
        const cleanPromo = Number(importItem.promoPrice) || 0;
        const cleanOffers = importItem.offers || '';
        
        if (mode === 'MASTER_PRICELIST') {
          let matchedIndices: number[] = [];
          
          if (normalizedSku) {
            const skuIdx = updatedList.findIndex(i => i.sku.toUpperCase().trim() === normalizedSku);
            if (skuIdx > -1) matchedIndices.push(skuIdx);
          }
          
          updatedList.forEach((item, idx) => {
            if (matchedIndices.includes(idx)) return;
            const existingName = item.name.toUpperCase().trim();
            if (existingName.startsWith(normalizedName)) {
               matchedIndices.push(idx);
            }
          });

          if (matchedIndices.length > 0) {
            matchedIndices.forEach(idx => {
              updatedList[idx] = { 
                ...updatedList[idx], 
                price: cleanPrice,
                promoPrice: cleanPromo,
                offers: cleanOffers || updatedList[idx].offers,
                lastUpdated: timestamp 
              };
            });
          } else {
            updatedList.push({
              id: Math.random().toString(36).substr(2, 9),
              name: importItem.name || 'New Product',
              sku: normalizedSku,
              category: importItem.category || 'Other',
              stocks: {},
              minQuantity: 5,
              price: cleanPrice,
              promoPrice: cleanPromo,
              offers: cleanOffers,
              description: importItem.description || '',
              lastUpdated: timestamp
            });
          }
        } else {
          // SHOP_RESTOCK Mode
          const change = Number(importItem.quantity);
          if (isNaN(change)) return;

          const existingIdx = updatedList.findIndex(i => {
             const iSku = i.sku.toUpperCase().trim();
             const iName = i.name.toUpperCase().trim();
             if (normalizedSku && iSku && normalizedSku === iSku) return true;
             if (normalizedName && iName && normalizedName === iName) return true;
             return false;
          });

          if (existingIdx > -1) {
            const currentItem = updatedList[existingIdx];
            const updatedStocks = { ...(currentItem.stocks || {}) };
            updatedStocks[targetShop] = (Number(updatedStocks[targetShop]) || 0) + change;
            
            // If the stock load includes Price/Offer data, update it too
            updatedList[existingIdx] = { 
              ...currentItem, 
              stocks: updatedStocks,
              price: cleanPrice || currentItem.price,
              promoPrice: cleanPromo || currentItem.promoPrice,
              offers: cleanOffers || currentItem.offers,
              lastUpdated: timestamp 
            };
            importMovements.push(createMovement(currentItem.id, currentItem.name, currentItem.sku, targetShop, 'IN', change, 'BULK_IMPORT', `Stock Load at ${targetShop}`));
          } else {
            const newItem: InventoryItem = {
              id: Math.random().toString(36).substr(2, 9),
              name: importItem.name || 'New Product',
              sku: normalizedSku,
              category: 'Other',
              stocks: { [targetShop]: change },
              minQuantity: 5,
              price: cleanPrice, 
              promoPrice: cleanPromo,
              offers: cleanOffers,
              description: 'Created during stock load',
              lastUpdated: timestamp
            };
            updatedList.push(newItem);
            importMovements.push(createMovement(newItem.id, newItem.name, newItem.sku, targetShop, 'IN', change, 'BULK_IMPORT', `New Item Stock Load at ${targetShop}`));
          }
        }
      });
      return updatedList;
    });
    
    setMovements(prev => [...importMovements, ...prev]);
    setIsImportOpen(false);
  };

  const handleEditTransaction = (txn: Transaction) => {
    setIsViewOnly(false);
    setEditingTransaction(txn);
    if (txn.type === 'RECEIPT') setIsReceiptOpen(true);
    else if (txn.type === 'VAT_REFUND') setIsVatRefundOpen(true);
    else setIsTransferOpen(true);
  };

  const handleViewReference = (referenceId: string) => {
    const txn = transactions.find(t => t.receiptNumber === referenceId || t.id === referenceId || t.invoiceNumber === referenceId);
    if (txn) {
      setIsViewOnly(true);
      setEditingTransaction(txn);
      if (txn.type === 'RECEIPT') setIsReceiptOpen(true);
      else if (txn.type === 'VAT_REFUND') setIsVatRefundOpen(true);
      else setIsTransferOpen(true);
    } else {
      alert("No printable document found for this reference.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
            <i className="fa-solid fa-boxes-packing text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">StockMaster <span className="text-indigo-600">Local</span></h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Offline Intelligent Hub</p>
              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">v2.5 Pro</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl gap-1 mr-4 border border-slate-200/50">
             <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
               Inventory
             </button>
             <button onClick={() => setActiveTab('tracker')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'tracker' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
               Tracker
             </button>
             <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'ledger' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
               Ledger
             </button>
             <button onClick={() => setActiveTab('customers')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'customers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
               Customers
             </button>
             <button onClick={() => setActiveTab('movements')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'movements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
               Log
             </button>
          </div>

          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/50">
            <button onClick={() => { setIsViewOnly(false); setEditingTransaction(undefined); setIsReceiptOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white shadow-sm rounded-lg font-bold text-xs hover:bg-indigo-700 transition-all">
              <i className="fa-solid fa-cash-register"></i> Sell
            </button>
            <button onClick={() => { setIsViewOnly(false); setEditingTransaction(undefined); setIsTransferOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 shadow-sm rounded-lg font-bold text-xs hover:bg-slate-50 transition-all border border-slate-200">
              <i className="fa-solid fa-right-left text-indigo-500"></i> Transfer
            </button>
            <button onClick={() => { setIsViewOnly(false); setEditingTransaction(undefined); setIsVatRefundOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white shadow-sm rounded-lg font-bold text-xs hover:bg-emerald-700 transition-all">
              <i className="fa-solid fa-passport"></i> VAT
            </button>
          </div>
          <button onClick={() => setIsImportOpen(true)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
            <i className="fa-solid fa-file-import"></i> Bulk Import
          </button>
        </div>
      </nav>

      <div className="bg-white border-b border-slate-100 px-8 py-2 overflow-x-auto scrollbar-hide flex gap-2 shop-tabs">
        {SHOPS.map(shop => (
          <button key={shop} onClick={() => setCurrentShop(shop)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${currentShop === shop ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            {shop === 'Master' ? <i className="fa-solid fa-globe mr-2"></i> : <i className="fa-solid fa-shop mr-2 text-[10px] opacity-60"></i>}
            {shop}
          </button>
        ))}
      </div>

      <main className="flex-grow p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {activeTab === 'inventory' ? (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
              <StatCard title={currentShop === 'Master' ? "Total Assets" : `${currentShop} Value`} value={`MUR ${stats.totalValue.toLocaleString()}`} icon="fa-solid fa-coins" colorClass="bg-indigo-50 text-indigo-600" />
              <StatCard title="Total Units" value={stats.totalItems} icon="fa-solid fa-warehouse" colorClass="bg-emerald-50 text-emerald-600" />
              <StatCard title="Product Range" value={items.length} icon="fa-solid fa-barcode" colorClass="bg-slate-100 text-slate-600" />
              <StatCard title="Low Stock" value={stats.lowStockCount} icon="fa-solid fa-bell-concierge" colorClass="bg-rose-50 text-rose-600" />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3">
                <InventoryTable items={items} currentShop={currentShop} onEdit={handleEditItem} onDelete={(id) => setItems(prev => prev.filter(i => i.id !== id))} />
              </div>

              <div className="space-y-6 no-print">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                   <div className="relative z-10 space-y-6">
                     <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                            <i className="fa-solid fa-bolt text-indigo-400"></i>
                          </div>
                          <div>
                            <h3 className="font-black text-lg text-slate-800">Smart Audit</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Analysis</p>
                          </div>
                        </div>
                     </div>
                     <div className="space-y-4">
                       {insights.length > 0 ? insights.map((insight, idx) => (
                         <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all">
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${insight.type === 'warning' ? 'text-rose-500' : insight.type === 'success' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                              {insight.title}
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{insight.content}</p>
                         </div>
                       )) : (
                         <p className="text-xs text-slate-400">No recent insights.</p>
                       )}
                     </div>
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                   <h3 className="font-black text-slate-800 mb-6 flex items-center justify-between">
                     Distribution Map
                     <i className="fa-solid fa-chart-pie text-indigo-100 text-xl"></i>
                   </h3>
                   <div className="h-56 relative">
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                        <PieChart>
                          <Pie data={stats.categoryDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                            {stats.categoryDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'tracker' ? (
          <TransactionTracker transactions={transactions} currentShop={currentShop} onEdit={handleEditTransaction} />
        ) : activeTab === 'ledger' ? (
          <SalesLedger transactions={transactions} currentShop={currentShop} />
        ) : activeTab === 'customers' ? (
          <CustomerList customers={customers} />
        ) : (
          <MovementTracker movements={movements} initialShop={currentShop} onViewReference={handleViewReference} />
        )}
      </main>

      {isFormOpen && (
        <ItemForm item={editingItem} onSave={handleSaveItem} onClose={() => setIsFormOpen(false)} />
      )}

      {isImportOpen && (
        <ImportModal initialShop={currentShop} onImport={handleBulkImport} onClose={() => setIsImportOpen(false)} />
      )}

      {isReceiptOpen && (
        <ReceiptModal items={items} transactions={transactions} initialShop={currentShop} initialTransaction={editingTransaction} isViewOnly={isViewOnly} onIssue={handleIssueDocument} onClose={() => { setIsReceiptOpen(false); setIsViewOnly(false); setEditingTransaction(undefined); }} />
      )}

      {isTransferOpen && (
        <TransferModal items={items} transactions={transactions} initialShop={currentShop} initialTransaction={editingTransaction} isViewOnly={isViewOnly} onIssue={handleIssueDocument} onClose={() => { setIsTransferOpen(false); setIsViewOnly(false); setEditingTransaction(undefined); }} />
      )}

      {isVatRefundOpen && (
        <VatRefundModal items={items} transactions={transactions} initialShop={currentShop} initialTransaction={editingTransaction} isViewOnly={isViewOnly} onIssue={handleIssueDocument} onClose={() => { setIsVatRefundOpen(false); setIsViewOnly(false); setEditingTransaction(undefined); }} />
      )}
    </div>
  );
};

export default App;
