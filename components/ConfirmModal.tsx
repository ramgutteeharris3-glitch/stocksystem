
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel,
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors scale-in-center">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 ${isDanger ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            <i className={`fa-solid ${isDanger ? 'fa-triangle-exclamation' : 'fa-circle-info'} text-2xl`}></i>
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3 p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors uppercase text-[10px] tracking-widest border border-slate-200 dark:border-slate-700"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-black rounded-xl transition-colors shadow-lg shadow-rose-100 dark:shadow-none uppercase text-[10px] tracking-widest`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
