import React from 'react';

export default function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
    
    // Función que devuelve las clases de Tailwind según el "variant"
    const getVariantClasses = () => {
        switch(variant) {
            case 'primary': 
                return 'bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-900/20 dark:bg-blue-600 dark:hover:bg-blue-500 dark:shadow-blue-500/30';
            case 'success': 
                return 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 dark:bg-emerald-600 dark:hover:bg-emerald-500';
            case 'danger': 
                return 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20 dark:bg-rose-600 dark:hover:bg-rose-500';
            case 'secondary': 
                return 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700';
            default: 
                return 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500';
        }
    };

    return (
        <button 
            onClick={onClick} 
            className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-[13px] font-extrabold uppercase tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${getVariantClasses()} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}