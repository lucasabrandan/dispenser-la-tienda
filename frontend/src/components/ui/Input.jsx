import React from 'react';

export default function Input({ label, error, className = '', ...props }) {
    return (
        <div className="mb-4 w-full">
            {label && (
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                    {label}
                </label>
            )}
            
            <input 
                {...props} 
                className={`w-full p-3.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[16px] outline-none transition-all duration-200
                ${error 
                    ? 'border-2 border-rose-500 focus:ring-2 focus:ring-rose-500/50' 
                    : 'border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                } ${className}`}
            />
        </div>
    );
}