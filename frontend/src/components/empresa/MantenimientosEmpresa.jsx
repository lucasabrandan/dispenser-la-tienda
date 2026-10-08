import React, { useEffect, useMemo, useState } from 'react';
import { LuCalendarClock, LuMapPin, LuCircleAlert, LuCircleCheck, LuClock } from 'react-icons/lu';
import api from '../../services/api';

// Próximos mantenimientos (Portal Empresa, 8-oct-2026): para cada equipo, cuándo le
// toca la sanitización (cada 6 meses) o el cambio de filtro (cada 12), desde su
// última visita. Desde acá se pide el service con un toque. Le llega además un aviso
// 15 días antes de que venza.
const fmt = (iso) => { if (!iso) return ''; const [a, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const TIPO = { FILTRO: 'Cambio de filtro', SANITIZACION: 'Sanitización' };
const GRUPOS = [
    { id: 'VENCIDO', titulo: 'Vencidos', icono: LuCircleAlert, color: '#C9341F' },
    { id: 'PRONTO', titulo: 'Próximos 30 días', icono: LuClock, color: '#D48800' },
    { id: 'AL_DIA', titulo: 'Al día', icono: LuCircleCheck, color: '#16A34A' },
    { id: 'SIN_DATOS', titulo: 'Sin visitas registradas', icono: LuCalendarClock, color: '#78716C' },
];

const cuando = (m) => {
    if (m.dias == null) return 'Todavía no lo atendimos';
    if (m.dias < 0) return `Venció hace ${-m.dias} día${m.dias === -1 ? '' : 's'} (${fmt(m.vence)})`;
    if (m.dias === 0) return 'Vence hoy';
    return `Vence en ${m.dias} día${m.dias === 1 ? '' : 's'} (${fmt(m.vence)})`;
};

export default function MantenimientosEmpresa({ onPedir }) {
    const [lista, setLista] = useState(null);
    useEffect(() => { api.get('/empresa/mantenimientos').then(r => setLista(Array.isArray(r.data) ? r.data : [])).catch(() => setLista([])); }, []);
    const grupos = useMemo(() => GRUPOS.map(g => ({ ...g, items: (lista || []).filter(m => m.estado === g.id) })).filter(g => g.items.length), [lista]);

    if (!lista) return <p className="py-16 text-center text-muted text-body">Cargando…</p>;
    if (!lista.length) return <p className="py-16 text-center text-body text-muted">Todavía no hay equipos cargados.</p>;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                {GRUPOS.slice(0, 3).map(g => {
                    const n = (lista || []).filter(m => m.estado === g.id).length;
                    return (
                        <div key={g.id} className="p-3.5 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06]">
                            <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-muted"><g.icono size={12} style={{ color: g.color }} />{g.titulo}</p>
                            <p className="text-2xl font-black text-ink">{n}</p>
                        </div>
                    );
                })}
            </div>
            <p className="text-caption text-muted px-1">Sanitización cada 6 meses y cambio de filtro cada 12, desde la última visita. Te avisamos 15 días antes.</p>
            {grupos.map(g => (
                <section key={g.id} className="space-y-2">
                    <p className="flex items-center gap-1.5 px-1 text-label font-black uppercase tracking-widest" style={{ color: g.color }}><g.icono size={14} />{g.titulo} · {g.items.length}</p>
                    {g.items.map(m => (
                        <div key={m.serie} className="p-3.5 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-body font-black text-ink">N/S {m.serie}{m.tipo && TIPO[m.tipo] ? <span className="text-muted font-bold"> · {TIPO[m.tipo]}</span> : null}</p>
                                <p className="flex items-center gap-1 text-caption text-muted truncate"><LuMapPin size={12} className="shrink-0" />{m.sede || m.direccion || '—'}</p>
                                <p className="text-label font-bold" style={{ color: g.id === 'AL_DIA' ? undefined : g.color }}>{cuando(m)}</p>
                            </div>
                            {g.id !== 'AL_DIA' && (
                                <button type="button" onClick={() => onPedir(m)}
                                    className="shrink-0 h-10 px-3 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95">Pedir service</button>
                            )}
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
}
