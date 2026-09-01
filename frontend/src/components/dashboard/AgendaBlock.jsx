import React, { useState } from 'react';
import { LuInbox, LuWrench, LuShoppingCart, LuStickyNote, LuMapPin } from 'react-icons/lu';
import { M } from '../servicio/ServicioUI';
import AgendaCard from './AgendaCard';
import { IDENTIDAD_COLOR, MAX_TRABAJOS, calcTotal, getIniciales, agruparPor } from './estadoConstants';

const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]';

function DiaBtn({ d, diaSel, onSelect }) {
    const pct = Math.min(d.horasUsadas / d.horasTotal, 1);
    const barColor = pct === 0 ? 'bg-[#16A34A]' : pct < 0.5 ? 'bg-[#16A34A]' : pct < 0.75 ? 'bg-[#D48800]' : 'bg-[#D13A28]';
    const sel = d.fecha === diaSel;
    return (
        <button onClick={() => onSelect(d.fecha)}
            className={`rounded-lg p-2 text-center transition-all active:scale-95 ${
                d.esHoy ? 'ring-2 ring-brand-red' : ''
            } ${sel ? 'bg-ink' : 'bg-card'} shadow-sm border border-black/[0.05] dark:border-white/[0.05]`}>
            <p className={`text-label font-bold uppercase ${sel ? 'text-white dark:text-[#1C1917]' : 'text-muted'}`}>
                {d.dia.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
            </p>
            <p className={`text-body-lg font-black ${sel ? 'text-white dark:text-[#1C1917]' : 'text-ink'}`}>
                {d.dia.getDate()}
            </p>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 mt-1.5">
                <div className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${Math.max(pct * 100, d.items.length > 0 ? 20 : 0)}%` }} />
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
                <p className={`text-label font-bold ${sel ? 'text-white/70 dark:text-black/50' : 'text-muted'}`}>
                    {Math.round(d.horasUsadas)}/{d.horasTotal}h
                </p>
                {d.notas?.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-[#F0A500]' : 'bg-brand-amber'}`} />
                )}
            </div>
        </button>
    );
}

function NotaCard({ n }) {
    return (
        <div className={`rounded-lg p-2.5 ml-2 border border-black/[0.05] dark:border-white/[0.05] border-l-[3px] ${
            n.completada ? 'bg-panel opacity-50' : 'bg-page'
        }`} style={{ borderLeftColor: n.completada ? '#16A34A' : '#D48800' }}>
            <div className="flex items-start gap-2">
                <span className="mt-0.5"><LuStickyNote size={13} /></span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-body font-bold truncate ${n.completada ? 'line-through text-muted' : 'text-ink'}`}>
                            {n.titulo}
                        </p>
                        {n.horaEstimada && (
                            <span className="text-label font-bold text-muted shrink-0">{n.horaEstimada}</span>
                        )}
                    </div>
                    {n.descripcion && (
                        <p className="text-caption text-muted mt-0.5 line-clamp-2">{n.descripcion}</p>
                    )}
                    {n.direccion && (
                        <p className="text-caption text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 truncate flex items-center gap-1"><LuMapPin size={11} />{n.direccion}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Agenda — selector de dia (planificador) arriba, lista del dia elegido abajo,
// arrancando en "hoy". Antes eran dos bloques separados (PlanificadorBlock +
// AgendaBlock) que reimplementaban cada uno su propio agrupamiento por tecnico
// para, en los hechos, mostrar el mismo dato — ver mockup "Rediseño del Panel".
export default function AgendaBlock({ planificador, setVistaActual, cargando }) {
    const [diaSel, setDiaSel] = useState(null);
    const [semana2, setSemana2] = useState(false);

    // Mientras carga, no mostrar los dias en 0hs — se confunde con un dia
    // de verdad libre. Mismo criterio que ya usaba MiAgenda.jsx.
    if (cargando) {
        return (
            <div>
                <p className="text-label font-bold uppercase tracking-wider text-muted mb-2">Agenda</p>
                <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-14 rounded-lg animate-pulse bg-card border border-black/[0.05] dark:border-white/[0.05]" />)}
                </div>
            </div>
        );
    }

    // Por defecto, el dia de hoy (antes esto era "Agenda de hoy", siempre fija).
    const fechaHoy = planificador.find(d => d.esHoy)?.fecha || null;
    const fechaActiva = diaSel || fechaHoy;
    const dia = planificador.find(d => d.fecha === fechaActiva) || null;

    return (
        <div>
            <p className="text-label font-bold uppercase tracking-wider text-muted mb-2">Agenda</p>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
                {planificador.slice(0, 6).map(d => <DiaBtn key={d.fecha} d={d} diaSel={fechaActiva} onSelect={setDiaSel} />)}
            </div>
            {planificador.length > 6 && (
                <>
                    <button onClick={() => setSemana2(v => !v)}
                        className="w-full flex items-center justify-center gap-1 h-6 rounded-lg text-label font-bold uppercase text-muted bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-[0.99] mb-2">
                        {semana2 ? '▲ Ocultar' : '▼ Semana siguiente'}
                    </button>
                    {semana2 && (
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                            {planificador.slice(6).map(d => <DiaBtn key={d.fecha} d={d} diaSel={fechaActiva} onSelect={setDiaSel} />)}
                        </div>
                    )}
                </>
            )}

            {dia && (() => {
                const libres = dia.horasTotal - dia.horasUsadas;
                const sinNada = dia.items.length === 0 && (!dia.notas || dia.notas.length === 0);
                const gruposItems = agruparPor(dia.items, s => s.items?.[0]?.tecnico || s.usuarioNombre);
                const gruposNotas = agruparPor(dia.notas, n => n.tecnicoNombre);
                const tecnicos = Array.from(new Set([...Object.keys(gruposItems), ...Object.keys(gruposNotas)]));

                return (
                    <div className="mt-1">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-body font-bold text-ink capitalize">
                                {dia.esHoy ? 'Hoy, ' : ''}{dia.dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            <span className={`text-label font-bold px-2 py-0.5 rounded-md ${
                                libres <= 0 ? 'bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171]'
                                : libres <= 2 ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]'
                                : 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0F2A1A] dark:text-[#4ADE80]'
                            }`}>
                                {libres <= 0 ? 'Completo' : `${Math.round(libres)}h libres`}
                            </span>
                        </div>

                        {sinNada ? (
                            <div className={`${card} text-center py-8`}>
                                <LuInbox size={24} className="mb-1 text-muted inline-block" />
                                <p className="text-caption font-bold text-muted">Sin actividad este dia</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tecnicos.map(tecNombre => {
                                    const tecItems = gruposItems[tecNombre] || [];
                                    const tecNotas = gruposNotas[tecNombre] || [];
                                    const color = IDENTIDAD_COLOR;
                                    const totalTec = tecItems.reduce((sum, s) => sum + (calcTotal(s) || 0), 0);
                                    const servicios = tecItems.filter(s => s.servicioTipo === 'TECNICA');
                                    const ventas = tecItems.filter(s => s.servicioTipo === 'VENTA');
                                    return (
                                        <div key={tecNombre} className="space-y-1.5">
                                            <div className={`px-3 py-2.5 rounded-xl ${color.bg}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color.avatar}`}>
                                                        <span className="text-label font-black text-white leading-none">{getIniciales(tecNombre)}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-title font-black tracking-tight leading-tight ${color.text}`}>
                                                            {tecNombre}
                                                        </p>
                                                        <p className="text-caption font-bold text-muted">
                                                            {tecItems.length > 0 ? `${tecItems.length} trabajo${tecItems.length !== 1 ? 's' : ''}` : `${tecNotas.length} nota${tecNotas.length !== 1 ? 's' : ''}`}
                                                        </p>
                                                    </div>
                                                    {tecItems.length > 0 && (
                                                        <M valor={totalTec} className={`text-body-lg font-black shrink-0 ${color.text}`} />
                                                    )}
                                                </div>
                                                {tecItems.length > 0 && (
                                                    <div className="mt-2 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${color.bar} ${tecItems.length >= MAX_TRABAJOS ? 'opacity-100' : 'opacity-70'}`}
                                                             style={{ width: `${Math.min((tecItems.length / MAX_TRABAJOS) * 100, 100)}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                            {servicios.length > 0 && (
                                                <div className="ml-3">
                                                    <p className="text-label font-bold text-brand-red uppercase tracking-wider mb-1 px-1 flex items-center gap-1"><LuWrench size={11} /> Servicios</p>
                                                    <div className="space-y-1.5">
                                                        {servicios.map(s => (
                                                            <AgendaCard key={s.id} s={s} onClick={() => setVistaActual('servicio-tecnico')} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {ventas.length > 0 && (
                                                <div className="ml-3">
                                                    <p className="text-label font-bold text-brand-amber uppercase tracking-wider mb-1 px-1 flex items-center gap-1"><LuShoppingCart size={11} /> Ventas / Entregas</p>
                                                    <div className="space-y-1.5">
                                                        {ventas.map(s => (
                                                            <AgendaCard key={s.id} s={s} onClick={() => setVistaActual('venta')} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {tecNotas.length > 0 && (
                                                <div className="ml-3">
                                                    <p className="text-label font-bold text-brand-amber uppercase tracking-wider mb-1 px-1 flex items-center gap-1"><LuStickyNote size={11} /> Notas</p>
                                                    <div className="space-y-1.5">
                                                        {tecNotas.map(n => <NotaCard key={`nota-${n.id}`} n={n} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
