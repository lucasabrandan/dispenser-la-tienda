import React from 'react';
import { formatearPrecio, formatearPrecioCompacto } from '../../utils/formatearPrecio';

export default function StatCard({ label, value, sub, variante, ocultar }) {
    const num = Math.round(Number(value || 0));
    const estilos = {
        gold:    { wrap: 'bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-[#D48800]/20 dark:border-[#F0A500]/20', val: 'text-brand-amber' },
        red:     { wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/20 dark:border-[#E8422F]/20', val: 'text-brand-red' },
        redBold: { wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/30 ring-2 ring-[#D13A28]/20 dark:ring-[#E8422F]/20', val: 'text-brand-red' },
        muted:   { wrap: 'bg-card border-black/[0.07] dark:border-white/[0.07]', val: 'text-ink' },
    };
    const { wrap, val } = estilos[variante] || estilos.muted;
    const display = ocultar ? '••••' : `$${formatearPrecioCompacto(num)}`;
    const displayFull = ocultar ? '••••' : `$${formatearPrecio(num)}`;
    return (
        <div className={`p-4 sm:p-5 rounded-[1.5rem] border ${wrap}`}>
            <p className="text-label font-black uppercase text-muted tracking-widest mb-2 sm:mb-3">{label}</p>
            <p className={`text-lg sm:text-2xl font-black ${val} hidden sm:block`}>{displayFull}</p>
            <p className={`text-lg font-black ${val} sm:hidden`}>{display}</p>
            <p className="text-label font-bold text-muted uppercase mt-1">{sub}</p>
        </div>
    );
}
