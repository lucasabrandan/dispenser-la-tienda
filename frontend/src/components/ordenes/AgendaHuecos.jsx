import React, { useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { colorTecnico, etapaColor } from '../../utils/estados';
import { formatDateISO, getTodayISO, lunesDeLaSemana, lunesAgenda } from '../../utils/dateUtils';
import AvatarTecnico from '../ui/AvatarTecnico';
import { useBloqueos, estaOcupado } from '../../utils/bloqueos';

// "Elegí el hueco" (3-oct-2026): la semana arriba y, para el día elegido, una
// columna por técnico con mañana y tarde y lo que ya tiene cada uno. Se toca
// "+ Acá" y queda elegido técnico, día y franja. Lo usan Nueva visita y
// Reprogramar, así fecha y horario se eligen igual en toda la app.
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ABIERTAS = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'COMPLETADA'];
export const franjaDe = (h) => {
    const s = String(h || '');
    if (/tarde/i.test(s)) return 'Tarde';
    const hh = parseInt(s.slice(0, 2), 10);
    return !isNaN(hh) && hh >= 13 ? 'Tarde' : 'Mañana';
};

export default function AgendaHuecos({ tecnicos = [], ordenes = [], fecha, onFecha, hueco, onHueco, direccion = null, excluirId = null }) {
    const hoy = getTodayISO();
    // Arranca en la semana de la fecha elegida
    const [offset, setOffset] = useState(() => {
        if (!fecha) return 0;
        const a = lunesAgenda(), b = lunesDeLaSemana(new Date(fecha + 'T12:00:00'));
        return Math.round((b - a) / (7 * 86400000));
    });
    const semana = useMemo(() => {
        const l = lunesAgenda();
        l.setDate(l.getDate() + offset * 7);
        // Una semana lun–sáb, igual que la agenda del Panel (6-oct-2026)
        return DIAS.map((n, i) => { const d = new Date(l); d.setDate(l.getDate() + i); return { n, num: d.getDate(), iso: formatDateISO(d), mes: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '') }; });
    }, [offset]);
    // Días que el técnico marcó como ocupados por trabajo propio (5-oct-2026)
    const bloqueos = useBloqueos(semana[0].iso, semana[semana.length - 1].iso);
    const delDia = (iso) => ordenes.filter(o => o.id !== excluirId && ABIERTAS.includes(o.estado) && String(o.fechaProgramada).slice(0, 10) === iso);
    const visitasDia = delDia(fecha);
    const sede = direccion ? { direccion } : null;
    const setFecha = (iso) => onFecha(iso);
    const setHueco = (h) => onHueco(h);

    const diaHoy = (() => { const d = new Date(); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return formatDateISO(d); })();
    const enHoy = offset === 0 && fecha === diaHoy;
    return (<>
                        <div className="flex items-center justify-between gap-2 px-1">
                            <span className="text-caption font-bold text-muted">
                                {offset === 0 ? 'Esta semana' : offset === 1 ? 'La semana que viene' : `Semana del ${semana[0].num} ${semana[0].mes}`}
                            </span>
                            {!enHoy && (
                                <button type="button" onClick={() => { setOffset(0); setFecha(diaHoy); }}
                                    className="h-8 px-3 rounded-lg border border-brand-red text-label font-black text-ink active:scale-95">Hoy</button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior" className="w-8 h-16 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronLeft size={16} /></button>
                            <div className="flex-1 grid grid-cols-6 gap-1.5">
                                {semana.map(d => {
                                    const sel = d.iso === fecha;
                                    const vs = delDia(d.iso);
                                    return (
                                        <button key={d.iso} type="button" disabled={d.iso < hoy} onClick={() => { setFecha(d.iso); setHueco(null); }}
                                            className={`h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 text-label font-black active:scale-95 disabled:opacity-30 ${sel ? 'bg-[#C9341F] text-white' : 'bg-chip text-muted'} ${d.iso === hoy && !sel ? 'ring-2 ring-[#C9341F]/50' : ''}`}>
                                            {d.n}<span className={`text-body ${sel ? 'text-white' : 'text-ink'}`}>{d.num}</span>
                                            <span className="flex gap-0.5 h-1.5">
                                                {vs.slice(0, 4).map(o => <span key={o.id} className="w-1.5 h-1.5 rounded-full" style={{ background: colorTecnico(o.tecnicoNombre) }} />)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button type="button" onClick={() => setOffset(o => o + 1)} aria-label="Semana siguiente" className="w-8 h-16 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronRight size={16} /></button>
                        </div>

                        <p className="text-caption text-muted">Tocá un hueco libre para darle la visita a ese técnico.</p>
                        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(tecnicos.length, 3))}, minmax(0, 1fr))` }}>
                            {tecnicos.map(t => {
                                const suyas = visitasDia.filter(o => o.tecnicoId === t.id || o.tecnicoNombre === t.nombre);
                                const mismaZona = sede?.direccion && suyas.some(o => (o.direccion || '').toLowerCase().includes(String(sede.direccion).split(',').pop().trim().toLowerCase()));
                                return (
                                    <div key={t.id} className="min-w-0 space-y-1.5">
                                        <p className="flex items-center gap-1.5 text-body font-black text-ink truncate">
                                            <AvatarTecnico nombre={t.nombre} size={22} />{t.nombre.split(' ')[0]}
                                            <span className="text-caption text-muted font-bold">{suyas.length}</span>
                                        </p>
                                        {mismaZona && <p className="text-label font-black text-[#16A34A] dark:text-[#4ADE80]">Ya va por esa zona</p>}
                                        {['Mañana', 'Tarde'].map(fr => {
                                            const lista = suyas.filter(o => franjaDe(o.horaEstimada) === fr);
                                            const on = hueco?.tecnicoId === t.id && hueco?.franja === fr;
                                            const ocupado = estaOcupado(bloqueos, t.id, fecha, fr);
                                            return (
                                                <div key={fr} className="space-y-1.5">
                                                    <p className="text-label font-black uppercase tracking-widest text-muted pt-1">{fr}</p>
                                                    {lista.map(o => (
                                                        <div key={o.id} className="px-2.5 py-2 rounded-xl bg-card" style={{ borderLeft: `4px solid ${etapaColor(o.estado)}` }}>
                                                            <p className="text-caption font-black text-ink truncate">{o.clienteNombre || o.titulo}</p>
                                                            <p className="text-label text-muted truncate">{o.horaEstimada || ''}</p>
                                                        </div>
                                                    ))}
                                                    {ocupado ? (
                                                        <div className="w-full h-11 rounded-xl bg-chip text-label font-black text-muted flex items-center justify-center text-center leading-tight px-1">
                                                            Ocupado · trabajo propio
                                                        </div>
                                                    ) : (
                                                    <button type="button" onClick={() => setHueco({ tecnicoId: t.id, franja: fr })}
                                                        className={`w-full h-11 rounded-xl border-2 border-dashed text-label font-black active:scale-95 ${on ? 'border-brand-red bg-[rgba(232,66,47,0.10)] text-brand-red' : 'border-black/15 dark:border-white/15 text-muted'}`}>
                                                        {on ? '✓ Acá' : '+ Acá'}
                                                    </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

    </>);
}
