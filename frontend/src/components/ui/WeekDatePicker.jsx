import React, { useState, useMemo } from 'react';
import { lunesDeLaSemana, formatDateISO } from '../../utils/dateUtils';

/**
 * WeekDatePicker
 * Selector de fecha por semana — mismo lenguaje visual que el Planificador del
 * Panel y MiAgenda (grilla Lun-Sáb, tarjeta blanca con sombra/borde, hoy con
 * anillo, seleccionado en oscuro). Arranca siempre en la semana actual
 * (calendario real, no "hoy + 7 días") y deja navegar hacia adelante o hacia
 * atrás con las flechas — para la carga histórica se puede ir para atrás las
 * semanas que hagan falta.
 */
export default function WeekDatePicker({ value, onChange }) {
    const hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const lunesHoy = useMemo(() => lunesDeLaSemana(hoy), [hoy]);
    const [offsetSemanas, setOffsetSemanas] = useState(0);

    const lunesVisible = useMemo(() => {
        const d = new Date(lunesHoy);
        d.setDate(d.getDate() + offsetSemanas * 7);
        return d;
    }, [lunesHoy, offsetSemanas]);

    const dias = useMemo(() => Array.from({ length: 6 }, (_, i) => {
        const d = new Date(lunesVisible);
        d.setDate(d.getDate() + i);
        return d;
    }), [lunesVisible]);

    const hoyISO = formatDateISO(hoy);
    const rangoLabel = `${dias[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${dias[5].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <button type="button" onClick={() => setOffsetSemanas(o => o - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-black text-secondary bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-90">
                    ‹
                </button>
                <div className="text-center leading-tight">
                    <p className="text-[11px] font-bold text-ink capitalize">{rangoLabel}</p>
                    {offsetSemanas !== 0 && (
                        <button type="button" onClick={() => setOffsetSemanas(0)}
                            className="text-[9px] font-bold text-brand-red underline">
                            Volver a esta semana
                        </button>
                    )}
                </div>
                <button type="button" onClick={() => setOffsetSemanas(o => o + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-black text-secondary bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-90">
                    ›
                </button>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
                {dias.map(d => {
                    const iso = formatDateISO(d);
                    const sel = value === iso;
                    const esHoy = iso === hoyISO;
                    return (
                        <button key={iso} type="button" onClick={() => onChange(iso)}
                            className={`rounded-lg py-2 text-center transition-all active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${esHoy ? 'ring-2 ring-brand-red' : ''} ${sel ? 'bg-ink' : 'bg-white dark:bg-[#242424]'}`}>
                            <p className={`text-[9px] font-bold uppercase ${sel ? 'text-white dark:text-[#1C1917]' : 'text-muted'}`}>
                                {d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
                            </p>
                            <p className={`text-[13px] font-black ${sel ? 'text-white dark:text-[#1C1917]' : 'text-ink'}`}>
                                {d.getDate()}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
