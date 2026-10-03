import React, { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { colorTecnico, etapaColor, estadoLabel } from '../../utils/estados';
import { formatDateISO, getTodayISO, lunesDeLaSemana } from '../../utils/dateUtils';

// Agenda del Panel (3-oct-2026): semana Lun–Sáb, un punto en los días con visitas,
// y abajo las visitas del día elegido. Color del borde = etapa, punto = técnico.
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const VISIBLES = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'COMPLETADA', 'NO_ATENDIDO'];

export default function AgendaSemana({ ordenes = [], cargando, onVerTrabajos }) {
    const hoy = getTodayISO();
    const [offset, setOffset] = useState(0);
    const [dia, setDia] = useState(hoy);

    const semana = useMemo(() => {
        const l = lunesDeLaSemana(new Date());
        l.setDate(l.getDate() + offset * 7);
        return DIAS.map((n, i) => {
            const d = new Date(l); d.setDate(l.getDate() + i);
            return { nombre: n, num: d.getDate(), iso: formatDateISO(d) };
        });
    }, [offset]);

    const porDia = useMemo(() => {
        const m = {};
        ordenes.filter(o => VISIBLES.includes(o.estado) && o.fechaProgramada).forEach(o => {
            const k = String(o.fechaProgramada).slice(0, 10);
            (m[k] = m[k] || []).push(o);
        });
        Object.values(m).forEach(l => l.sort((a, b) => String(a.horaEstimada || '99').localeCompare(String(b.horaEstimada || '99'))));
        return m;
    }, [ordenes]);

    const delDia = porDia[dia] || [];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior"
                    className="w-8 h-12 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronLeft size={16} /></button>
                <div className="flex-1 grid grid-cols-6 gap-1.5">
                    {semana.map(d => {
                        const sel = d.iso === dia;
                        const n = (porDia[d.iso] || []).length;
                        return (
                            <button key={d.iso} type="button" onClick={() => setDia(d.iso)} aria-pressed={sel}
                                className={`h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 text-label font-black transition-all active:scale-95 ${sel ? 'bg-[#C9341F] text-white' : 'bg-chip text-muted'} ${d.iso === hoy && !sel ? 'ring-2 ring-[#C9341F]/50' : ''}`}>
                                {d.nombre}
                                <span className={`text-body ${sel ? 'text-white' : 'text-ink'}`}>{d.num}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${n ? (sel ? 'bg-white' : 'bg-brand-red') : 'bg-transparent'}`} />
                            </button>
                        );
                    })}
                </div>
                <button type="button" onClick={() => setOffset(o => o + 1)} aria-label="Semana siguiente"
                    className="w-8 h-12 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronRight size={16} /></button>
            </div>

            {cargando ? (
                <div className="h-14 rounded-xl bg-chip animate-pulse" />
            ) : delDia.length === 0 ? (
                <p className="py-4 text-center text-caption text-muted">Sin visitas este día</p>
            ) : (
                <div className="space-y-2">
                    {delDia.map(o => (
                        <button key={o.id} type="button" onClick={onVerTrabajos}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-chip text-left active:scale-[0.99]"
                            style={{ borderLeft: `4px solid ${etapaColor(o.estado)}` }}>
                            <span className="w-11 shrink-0 text-caption font-black text-ink">{o.horaEstimada ? String(o.horaEstimada).slice(0, 5) : '—'}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-body font-bold text-ink truncate">{o.clienteNombre || o.titulo || `Visita #${o.id}`}</span>
                                <span className="flex items-center gap-1.5 text-caption text-muted">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.tecnicoNombre ? colorTecnico(o.tecnicoNombre) : '#78716C' }} />
                                    {(o.tecnicoNombre || 'Sin técnico').split(' ')[0]} · {estadoLabel(o.estado).toLowerCase()}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
