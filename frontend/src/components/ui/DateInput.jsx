import React from 'react';

/**
 * DateInput — input type="date" nativo (funciona en todos los browsers/mobile)
 * con overlay visual que muestra DD/MM/AAAA en vez del formato del SO.
 *
 * Props: value (ISO YYYY-MM-DD), onChange (string ISO), className
 */
export default function DateInput({ value, onChange, className = '', ...props }) {
    const formatear = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        if (!y || !m || !d) return '';
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="relative">
            {/* Input nativo real — funcional, maneja el picker */}
            <input
                type="date"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className={`${className} text-transparent`}
                style={{ colorScheme: 'dark' }}
                {...props}
            />
            {/* Overlay visual — muestra DD/MM/AAAA */}
            <div className="absolute inset-0 flex items-center pointer-events-none px-3.5">
                <span className={`text-[13px] font-medium ${value ? 'text-[#1C1917] dark:text-[#F0EEE9]' : 'text-[#A8A29E]'}`}>
                    {value ? formatear(value) : 'DD/MM/AAAA'}
                </span>
            </div>
        </div>
    );
}
