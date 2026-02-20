
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  colorClass: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass, trend }) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-all hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold mt-1 text-slate-800 dark:text-white">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} dark:bg-indigo-600/20 dark:text-indigo-400`}>
          <i className={`${icon} text-xl`}></i>
        </div>
      </div>
      {trend && (
        <div className="flex items-center text-sm">
          <span className={`flex items-center gap-1 ${trend.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            <i className={`fa-solid ${trend.isUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
            {trend.value}
          </span>
          <span className="text-slate-400 ml-2">since last month</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
