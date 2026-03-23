import React from 'react';

export default function Card({ children, className = '', ...props }) {
    return (
        <div 
            className={`w-full bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-4 transition-colors duration-300 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}