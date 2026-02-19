
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Customer Database</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Active CRM Profiles: <span className="text-indigo-600">{customers.length}</span>
            </p>
          </div>
          <div className="relative group no-print">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input 
              type="text" placeholder="Search by name, email, or phone..."
              className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 w-full lg:w-[400px] font-bold text-sm"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="px-10 py-6">Customer Profile</th>
                <th className="px-10 py-6">Contact Info</th>
                <th className="px-10 py-6">Last Visit</th>
                <th className="px-10 py-6 text-right">Lifetime Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-10 py-8">
                    <p className="font-black text-slate-900 text-sm uppercase">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">{c.address || 'No address provided'}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-indigo-600 text-xs">{c.email}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{c.phone}</p>
                  </td>
                  <td className="px-10 py-8">
                    <p className="font-bold text-slate-700 text-xs">{new Date(c.lastVisit).toLocaleDateString('en-GB')}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Transaction Logged</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="font-black text-slate-900 text-lg tracking-tighter">MUR {c.totalSpent.toLocaleString()}</p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-40">No Customer Profiles Found</td>
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
