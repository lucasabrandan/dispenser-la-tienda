import React from 'react';
import { LuInbox, LuWrench, LuShoppingCart } from 'react-icons/lu';
import { M } from '../servicio/ServicioUI';
import AgendaCard from './AgendaCard';
import { ESTADO_COLORS, DEFAULT_COLOR, MAX_TRABAJOS, calcTotal, getIniciales, estadoPredominante } from './estadoConstants';

const card = 'rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]';

export default function AgendaBlock({ agendaHoy, setVistaActual, cargando }) {
    // Mientras carga, no mostrar "sin actividad" — se confunde con que
    // de verdad no hay nada. Mismo criterio que ya usa MiAgenda.jsx.
    if (cargando) {
        return (
            <div>
                <p className="text-label font-bold uppercase tracking-wider text-muted mb-2">Agenda de hoy</p>
                <div className="space-y-1.5">
                    {[1, 2].map(i => <div key={i} className={`${card} h-16 animate-pulse`} />)}
                </div>
            </div>
        );
    }

    // Agrupar por tecnico
    const agendaPorTecnico = (() => {
        const grupos = {};
        agendaHoy.forEach(s => {
            const tec = s.items?.[0]?.tecnico || s.usuarioNombre || 'Sin asignar';
            if (!grupos[tec]) grupos[tec] = [];
            grupos[tec].push(s);
        });
        return Object.entries(grupos);
    })();

    return (
        <div>
            <p className="text-label font-bold uppercase tracking-wider text-muted mb-2">Agenda de hoy ({agendaHoy.length})</p>
            {agendaHoy.length === 0 ? (
                <div className={`${card} text-center py-8`}>
                    <LuInbox size={24} className="mb-1 text-muted inline-block" />
                    <p className="text-caption font-bold text-muted">Sin actividad para hoy</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {agendaPorTecnico.map(([tecNombre, tecServicios]) => {
                        const color = ESTADO_COLORS[estadoPredominante(tecServicios)] || DEFAULT_COLOR;
                        const totalTec = tecServicios.reduce((sum, s) => sum + (calcTotal(s) || 0), 0);
                        const servicios = tecServicios.filter(s => s.servicioTipo === 'TECNICA');
                        const ventas = tecServicios.filter(s => s.servicioTipo === 'VENTA');
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
                                                {tecServicios.length} trabajo{tecServicios.length !== 1 ? 's' : ''} hoy
                                            </p>
                                        </div>
                                        <M valor={totalTec} className={`text-body-lg font-black shrink-0 ${color.text}`} />
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${color.bar} ${tecServicios.length >= MAX_TRABAJOS ? 'opacity-100' : 'opacity-70'}`}
                                             style={{ width: `${Math.min((tecServicios.length / MAX_TRABAJOS) * 100, 100)}%` }} />
                                    </div>
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
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
