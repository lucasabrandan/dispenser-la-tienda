import React, { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { colorTecnico, etapaColor, estadoLabel } from '../../utils/estados';
import { formatDateISO, getTodayISO, lunesAgenda } from '../../utils/dateUtils';
import AvatarTecnico from '../ui/AvatarTecnico';
import { useBloqueos, labelFranja } from '../../utils/bloqueos';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

// Agenda del Panel (3-oct-2026): semana Lun–Sáb, un punto en los días con visitas,
// y abajo las visitas del día elegido. Color del borde = etapa, punto = técnico.
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const VISIBLES = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'COMPLETADA', 'NO_ATENDIDO'];

export default function AgendaSemana({ ordenes = [], cargando, onAbrir }) {
    const hoy = getTodayISO();
    // Domingo → se marca el lunes (la grilla es lun–sáb)
    const diaHoy = (() => { const d = new Date(); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return formatDateISO(d); })();
    const [offset, setOffset] = useState(0);
    const [dia, setDia] = useState(diaHoy);
    const enHoy = offset === 0 && dia === diaHoy;
    const volverHoy = () => { setOffset(0); setDia(diaHoy); };
    // Deslizar sobre la semana: semana anterior / siguiente
    const swipeSemana = useSwipeGesture(['-1', '0', '1'], '0', id => setOffset(o => o + Number(id)));

    const semana = useMemo(() => {
        const l = lunesAgenda();
        l.setDate(l.getDate() + offset * 7);
        // Una semana (5-oct-2026, Lucas: dos semanas era mucho para el Panel)
        return DIAS.map((n, i) => {
            const d = new Date(l); d.setDate(l.getDate() + i);
            return { nombre: n, num: d.getDate(), iso: formatDateISO(d), mes: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '') };
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
    // Técnicos ocupados por trabajo propio (5-oct-2026)
    const bloqueos = useBloqueos(semana[0].iso, semana[semana.length - 1].iso);
    const ocupadosDia = bloqueos.filter(b => b.fecha === dia);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-caption font-bold text-muted">
                    {offset === 0 ? 'Esta semana' : offset === 1 ? 'La semana que viene' : `Semana del ${semana[0].num} ${semana[0].mes}`}
                </span>
                {!enHoy && (
                    <button type="button" onClick={volverHoy}
                        className="h-8 px-3 rounded-lg border border-brand-red text-label font-black text-ink active:scale-95">Hoy</button>
                )}
            </div>
            <div className="flex items-center gap-1.5" data-noswipe {...swipeSemana}>
                <button type="button" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior"
                    className="w-8 h-14 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronLeft size={16} /></button>
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
                    className="w-8 h-14 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronRight size={16} /></button>
            </div>

            {ocupadosDia.map((b, i) => (
                <p key={i} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-caption font-bold text-muted">
                    <AvatarTecnico nombre={b.tecnicoNombre} size={16} />
                    {(b.tecnicoNombre || '').split(' ')[0]} no está disponible ({labelFranja(b.franja)}) · trabajo propio
                </p>
            ))}
            {cargando ? (
                <div className="h-14 rounded-xl bg-chip animate-pulse" />
            ) : delDia.length === 0 ? (
                <p className="py-4 text-center text-caption text-muted">Sin visitas este día</p>
            ) : (
                <div className="space-y-2">
                    {delDia.map(o => (
                        <button key={o.id} type="button" onClick={() => onAbrir?.(o)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-chip text-left active:scale-[0.99]"
                            style={{ borderLeft: `4px solid ${etapaColor(o.estado)}` }}>
                            <span className="w-11 shrink-0 text-caption font-black text-ink">{o.horaEstimada ? (String(o.horaEstimada).includes(':') ? String(o.horaEstimada).slice(0, 5) : String(o.horaEstimada).slice(0, 3) + '.') : '—'}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-body font-bold text-ink truncate">{o.clienteNombre || o.titulo || `Visita #${o.id}`}</span>
                                <span className="flex items-center gap-1.5 text-caption text-muted">
                                    <AvatarTecnico nombre={o.tecnicoNombre} size={16} />
                                    {(o.tecnicoNombre || 'Sin técnico').split(' ')[0]} · {estadoLabel(o.estado).toLowerCase()}
                                    {o.estado === 'PENDIENTE' && (o.confirmadaEn ? ' · ✓ confirmó' : ' · sin confirmar')}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
