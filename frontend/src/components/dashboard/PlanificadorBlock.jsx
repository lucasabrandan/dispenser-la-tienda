import React, { useState } from 'react';
import { M } from '../servicio/ServicioUI';
import { LuWrench, LuShoppingCart, LuMapPin, LuClock, LuStickyNote } from 'react-icons/lu';
import { ESTADO_COLORS, ESTADO_BORDER, DEFAULT_COLOR, calcTotal, getIniciales, estadoPredominante } from './estadoConstants';

const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]';

function DiaBtn({ d, diaSel, onSelect }) {
    const pct = Math.min(d.horasUsadas / d.horasTotal, 1);
    const barColor = pct === 0 ? 'bg-[#16A34A]' : pct < 0.5 ? 'bg-[#16A34A]' : pct < 0.75 ? 'bg-[#D48800]' : 'bg-[#D13A28]';
    const sel = d.fecha === diaSel;
    return (
        <button onClick={() => onSelect(sel ? null : d.fecha)}
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

export default function PlanificadorBlock({ planificador, setVistaActual, cargando }) {
    const [diaSel, setDiaSel] = useState(null);
    const [semana2, setSemana2] = useState(false);

    // Mientras carga, no mostrar los dias en 0hs — se confunde con un dia
    // de verdad libre. Mismo criterio que ya usa MiAgenda.jsx.
    if (cargando) {
        return (
            <div>
                <p className="text-label font-bold uppercase tracking-wider text-muted mb-2">Planificador</p>
                <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-14 rounded-lg animate-pulse bg-card border border-black/[0.05] dark:border-white/[0.05]" />)}
                </div>
            </div>
        );
    }

    return (
        <div>
            <p className="text-label font-bold uppercase tracking-wider text-muted mb-2">Planificador</p>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
                {planificador.slice(0, 6).map(d => <DiaBtn key={d.fecha} d={d} diaSel={diaSel} onSelect={setDiaSel} />)}
            </div>
            {planificador.length > 6 && (
                <>
                    <button onClick={() => setSemana2(v => !v)}
                        className="w-full flex items-center justify-center gap-1 h-6 rounded-lg text-label font-bold uppercase text-muted bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-[0.99] mb-2">
                        {semana2 ? '▲ Ocultar' : '▼ Semana siguiente'}
                    </button>
                    {semana2 && (
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                            {planificador.slice(6).map(d => <DiaBtn key={d.fecha} d={d} diaSel={diaSel} onSelect={setDiaSel} />)}
                        </div>
                    )}
                </>
            )}
            {diaSel && (() => {
                const dia = planificador.find(d => d.fecha === diaSel);
                if (!dia) return null;
                const libres = dia.horasTotal - dia.horasUsadas;
                return (
                    <div className={`${card} p-3 mt-2`}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-body font-bold text-ink capitalize">
                                {dia.dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            <span className={`text-label font-bold px-2 py-0.5 rounded-md ${
                                libres <= 0 ? 'bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171]'
                                : libres <= 2 ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]'
                                : 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0F2A1A] dark:text-[#4ADE80]'
                            }`}>
                                {libres <= 0 ? 'Completo' : `${Math.round(libres)}h libres`}
                            </span>
                        </div>
                        {dia.items.length === 0 && (!dia.notas || dia.notas.length === 0) ? (
                            <p className="text-caption text-muted text-center py-3">Dia libre</p>
                        ) : (
                            <div className="space-y-3">
                                {/* Servicios agrupados por tecnico */}
                                {(() => {
                                    const grupos = {};
                                    dia.items.forEach(s => {
                                        const tec = s.items?.[0]?.tecnico || s.usuarioNombre || 'Sin asignar';
                                        if (!grupos[tec]) grupos[tec] = [];
                                        grupos[tec].push(s);
                                    });
                                    return Object.entries(grupos).map(([tecNombre, tecItems]) => {
                                        const color = ESTADO_COLORS[estadoPredominante(tecItems)] || DEFAULT_COLOR;
                                        const totalTec = tecItems.reduce((sum, s) => sum + (calcTotal(s) || 0), 0);
                                        return (
                                            <div key={tecNombre} className="space-y-1.5">
                                                <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg ${color.bg}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color.avatar}`}>
                                                        <span className="text-label font-black text-white leading-none">{getIniciales(tecNombre)}</span>
                                                    </div>
                                                    <p className={`text-body-lg font-black tracking-tight leading-tight flex-1 ${color.text}`}>
                                                        {tecNombre}
                                                    </p>
                                                    <span className="text-label font-bold text-muted">{tecItems.length} trabajo{tecItems.length !== 1 ? 's' : ''}</span>
                                                    <M valor={totalTec} className={`text-body font-black shrink-0 ${color.text}`} />
                                                </div>
                                                {tecItems.map(s => {
                                                    const horas = s.duracionMinutos ? `${Math.round(s.duracionMinutos / 60 * 10) / 10}h` : `~${s.servicioTipo === 'TECNICA' ? '2' : '1'}h`;
                                                    const esPendiente = s.estado === 'PRESUPUESTO';
                                                    return (
                                                        <div key={s.id}
                                                            onClick={() => setVistaActual(s.servicioTipo === 'TECNICA' ? 'servicio-tecnico' : 'venta')}
                                                            className="rounded-lg p-2.5 ml-2 bg-[#F5F3F1] dark:bg-[#1C1C1C] border border-black/[0.05] dark:border-white/[0.05] cursor-pointer active:scale-[0.98] transition-transform border-l-[3px]"
                                                            style={{ borderLeftColor: ESTADO_BORDER[s.estado] || '#A8A29E' }}>
                                                            <div className="flex items-start gap-2">
                                                                <span className="mt-0.5">{s.servicioTipo === 'TECNICA' ? <LuWrench size={14} /> : <LuShoppingCart size={14} />}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className="text-body font-bold text-ink truncate">{s.clienteNombre}</p>
                                                                        <span className={`text-label font-bold shrink-0 px-1.5 py-0.5 rounded ${esPendiente ? 'bg-[#D48800]/10 text-brand-amber' : 'bg-[#16A34A]/10 text-[#16A34A]'}`}>
                                                                            {esPendiente ? 'Pendiente' : s.estado?.replace('_', ' ')}
                                                                        </span>
                                                                    </div>
                                                                    {s.sedeNombre && <p className="text-caption text-muted truncate">{s.sedeNombre}</p>}
                                                                    {s.sedeDireccion && (
                                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.sedeDireccion)}`}
                                                                            target="_blank" rel="noopener noreferrer"
                                                                            className="text-caption text-brand-red truncate block mt-0.5 active:opacity-70"
                                                                            onClick={e => e.stopPropagation()}>
                                                                            <LuMapPin size={11} className="inline -mt-0.5 mr-0.5" />{s.sedeDireccion}
                                                                        </a>
                                                                    )}
                                                                    {s.items?.[0]?.trabajoRealizado && (
                                                                        <p className="text-caption text-muted mt-1 line-clamp-2">{s.items[0].trabajoRealizado}</p>
                                                                    )}
                                                                    <div className="flex items-center gap-3 mt-1.5">
                                                                        <span className="text-label font-bold text-muted flex items-center gap-1"><LuClock size={11} />{horas}</span>
                                                                        <M valor={calcTotal(s)} className="text-caption font-black text-ink ml-auto" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    });
                                })()}

                                {/* Notas de agenda de tecnicos (solo admin ve esto) */}
                                {dia.notas?.length > 0 && (() => {
                                    const gruposNotas = {};
                                    dia.notas.forEach(n => {
                                        const tec = n.tecnicoNombre || 'Sin asignar';
                                        if (!gruposNotas[tec]) gruposNotas[tec] = [];
                                        gruposNotas[tec].push(n);
                                    });
                                    return (
                                        <>
                                            <p className="text-label font-black text-brand-amber uppercase tracking-wider px-1 pt-1">Agenda de tecnicos</p>
                                            {Object.entries(gruposNotas).map(([tecNombre, tecNotas]) => (
                                                <div key={`notas-${tecNombre}`} className="space-y-1.5">
                                                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#D48800]/10 dark:bg-[#F0A500]/10">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-brand-amber">
                                                            <span className="text-label font-black text-white leading-none">{getIniciales(tecNombre)}</span>
                                                        </div>
                                                        <p className="text-body font-black text-brand-amber flex-1">{tecNombre}</p>
                                                        <span className="text-label font-bold text-muted">{tecNotas.length} nota{tecNotas.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    {tecNotas.map(n => (
                                                        <div key={`nota-${n.id}`}
                                                            className={`rounded-lg p-2.5 ml-2 border border-black/[0.05] dark:border-white/[0.05] border-l-[3px] ${
                                                                n.completada
                                                                    ? 'bg-panel opacity-50'
                                                                    : 'bg-[#F5F3F1] dark:bg-[#1C1C1C]'
                                                            }`}
                                                            style={{ borderLeftColor: n.completada ? '#16A34A' : '#D48800' }}>
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
                                                    ))}
                                                </div>
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
