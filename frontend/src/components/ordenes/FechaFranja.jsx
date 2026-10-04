import React, { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { formatDateISO, getTodayISO, lunesDeLaSemana } from '../../utils/dateUtils';

// Día + horario con la misma forma que Nueva visita y Reprogramar (3-oct-2026):
// semana Lun–Sáb y "Mañana / Tarde / Hora exacta". La hora se guarda como
// "Mañana", "Tarde" o "HH:MM" (horaEstimada).
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const chip = (on) => `h-10 px-3.5 rounded-full inline-flex items-center text-label font-bold border-2 active:scale-95 ${on ? 'border-brand-red bg-[rgba(232,66,47,0.10)] text-ink' : 'border-transparent bg-chip text-secondary'}`;

export default function FechaFranja({ fecha, hora, onFecha, onHora }) {
    const hoy = getTodayISO();
    const [offset, setOffset] = useState(() => {
        if (!fecha) return 0;
        const a = lunesDeLaSemana(new Date()), b = lunesDeLaSemana(new Date(fecha + 'T12:00:00'));
        return Math.round((b - a) / (7 * 86400000));
    });
    const semana = useMemo(() => {
        const l = lunesDeLaSemana(new Date());
        l.setDate(l.getDate() + offset * 7);
        return DIAS.map((n, i) => { const d = new Date(l); d.setDate(l.getDate() + i); return { n, num: d.getDate(), mes: d.getMonth() + 1, iso: formatDateISO(d) }; });
    }, [offset]);
    const esHora = !!hora && String(hora).includes(':');
    const franja = esHora ? 'hora' : (/tarde/i.test(hora || '') ? 'Tarde' : (hora ? 'Mañana' : ''));

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior" className="w-7 h-14 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronLeft size={16} /></button>
                <div className="flex-1 grid grid-cols-6 gap-1">
                    {semana.map(d => {
                        const sel = d.iso === fecha;
                        return (
                            <button key={d.iso} type="button" onClick={() => onFecha(d.iso)}
                                className={`h-14 rounded-xl flex flex-col items-center justify-center text-label font-black active:scale-95 ${sel ? 'bg-[#C9341F] text-white' : 'bg-chip text-muted'} ${d.iso < hoy && !sel ? 'opacity-40' : ''} ${d.iso === hoy && !sel ? 'ring-2 ring-[#C9341F]/50' : ''}`}>
                                {d.n}<span className={`text-body ${sel ? 'text-white' : 'text-ink'}`}>{d.num}</span>
                            </button>
                        );
                    })}
                </div>
                <button type="button" onClick={() => setOffset(o => o + 1)} aria-label="Semana siguiente" className="w-7 h-14 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronRight size={16} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => onHora('Mañana')} className={chip(franja === 'Mañana')}>Mañana</button>
                <button type="button" onClick={() => onHora('Tarde')} className={chip(franja === 'Tarde')}>Tarde</button>
                <button type="button" onClick={() => onHora(esHora ? hora : '09:00')} className={chip(franja === 'hora')}>Hora exacta</button>
                {esHora && <input type="time" value={hora} onChange={e => onHora(e.target.value)} className="h-10 px-3 rounded-xl bg-chip text-ink text-body font-bold outline-none" />}
            </div>
        </div>
    );
}
