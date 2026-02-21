
import React, { useState } from 'react';
import { Customer } from '../types';

interface CustomerListProps {
  customers: Customer[];
}

const CustomerList: React.FC<CustomerListProps> = ({ customers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Customer Database</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
              Active CRM Profiles: <span className="text-indigo-600 dark:text-indigo-400">{customers.length}</span>
            </p>
          </div>
          <div className="relative group no-print">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"></i>
            <input 
              type="text" placeholder="Search by name, email, or phone..."
              className="pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 w-full lg:w-[400px] font-bold text-sm text-slate-900 dark:text-white transition-all shadow-inner"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-10 py-6">Customer Profile</th>
                <th className="px-10 py-6">Contact Info</th>
                <th className="px-10 py-6">Last Visit</th>
                <th className="px-10 py-6 text-right">Lifetime Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-10 py-8">
                    <p className="font-black text-slate-900 dark:text-white text-sm uppercase">{c.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate max-w-[200px]">{c.address || 'No address provided'}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{c.email}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">{c.phone}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{new Date(c.lastVisit).toLocaleDateString('en-GB')}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Transaction Logged</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="font-black text-slate-900 dark:text-white text-lg tracking-tighter">MUR {c.totalSpent.toLocaleString()}</p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest opacity-40">No Customer Profiles Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;
