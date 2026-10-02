import React, { useState } from 'react';
import { LuInbox, LuStickyNote, LuMapPin } from 'react-icons/lu';
import { M } from '../servicio/ServicioUI';
import AgendaCard from './AgendaCard';
import { MAX_TRABAJOS, calcTotal, getIniciales, agruparPor } from './estadoConstants';
import { colorTecnico } from '../../utils/estados';

const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]';

function DiaBtn({ d, diaSel, onSelect }) {
    const pct = Math.min(d.horasUsadas / d.horasTotal, 1);
    const sel = d.fecha === diaSel;
    const ocupacion = d.horasUsadas <= 0 ? 'libre' : `${Math.round(d.horasUsadas)}/${d.horasTotal}h`;
    // Seleccionado = borde rojo con tinte suave (antes: bloque blanco que encandilaba).
    // La ocupación se lee en el texto; ámbar si está cargado, rojo si está lleno.
    const colorOcup = pct >= 1 ? 'text-brand-red' : pct >= 0.5 ? 'text-brand-amber' : 'text-muted';
    return (
        <button onClick={() => onSelect(d.fecha)}
            className={`rounded-xl h-16 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border ${
                sel ? 'border-brand-red bg-[rgba(232,66,47,0.10)]' : 'border-transparent'
            }`}>
            <span className={`text-label font-bold uppercase ${sel || d.esHoy ? 'text-brand-red' : 'text-muted'}`}>
                {d.dia.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
            </span>
            <span className="text-body-lg font-black text-ink leading-none">{d.dia.getDate()}</span>
            <span className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${colorOcup}`}>{ocupacion}</span>
                {d.notas?.length > 0 && <span className="w-1 h-1 rounded-full bg-brand-amber" />}
            </span>
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
                <p className="text-caption font-bold text-muted mb-2">Agenda</p>
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
            <p className="text-caption font-bold text-muted mb-2">Agenda</p>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
                {planificador.slice(0, 6).map(d => <DiaBtn key={d.fecha} d={d} diaSel={fechaActiva} onSelect={setDiaSel} />)}
            </div>
            {planificador.length > 6 && (
                <>
                    <button onClick={() => setSemana2(v => !v)}
                        className="w-full flex items-center justify-center h-8 rounded-lg text-caption font-bold text-muted active:opacity-70 mb-1">
                        {semana2 ? 'Ocultar semana siguiente' : 'Ver semana siguiente'}
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
                            <span className={`text-caption font-bold ${libres <= 0 ? 'text-brand-red' : libres <= 2 ? 'text-brand-amber' : 'text-muted'}`}>
                                {libres <= 0 ? 'Completo' : `${Math.round(libres)}h libres`}
                            </span>
                        </div>

                        {sinNada ? (
                            // Chico cuando no hay nada que mostrar (Lucas, 7-sep-2026:
                            // el cuadro grande no ameritaba tanto espacio solo para decir
                            // que no hay actividad). Con contenido real, el bloque de abajo
                            // ocupa el espacio que necesite.
                            <div className={`${card} flex items-center justify-center gap-2 py-3`}>
                                <LuInbox size={14} className="text-muted" />
                                <p className="text-caption font-bold text-muted">Sin actividad este dia</p>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-1">
                                {tecnicos.map(tecNombre => {
                                    const tecItems = gruposItems[tecNombre] || [];
                                    const tecNotas = gruposNotas[tecNombre] || [];
                                    const color = colorTecnico(tecNombre);
                                    const totalTec = tecItems.reduce((sum, s) => sum + (calcTotal(s) || 0), 0);
                                    // Servicios y ventas en una sola lista (la venta lleva un
                                    // iconito de carrito); sin subtítulos ni cajas anidadas.
                                    const trabajos = [...tecItems].sort((a, b) =>
                                        String(a.horaServicio || '99').localeCompare(String(b.horaServicio || '99')));
                                    return (
                                        <div key={tecNombre} className="pt-3 border-t border-line first:border-t-0 first:pt-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: color }}>
                                                    <span className="text-caption font-black text-[#111110] leading-none">{getIniciales(tecNombre)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <p className="text-body-lg font-extrabold text-ink truncate">{tecNombre}</p>
                                                        {tecItems.length > 0 && (
                                                            <M valor={totalTec} className="text-body-lg font-extrabold text-ink shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1 rounded-full bg-line overflow-hidden">
                                                            <div className="h-full rounded-full transition-all"
                                                                style={{ background: color, width: `${Math.min((tecItems.length / MAX_TRABAJOS) * 100, 100)}%` }} />
                                                        </div>
                                                        <span className="text-label font-bold text-muted shrink-0">
                                                            {tecItems.length > 0 ? `${tecItems.length} trabajo${tecItems.length !== 1 ? 's' : ''}` : `${tecNotas.length} nota${tecNotas.length !== 1 ? 's' : ''}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {trabajos.length > 0 && (
                                                <div className="mt-1">
                                                    {trabajos.map((s, i) => (
                                                        <AgendaCard key={s.id} s={s} primera={i === 0}
                                                            onClick={() => setVistaActual(s.servicioTipo === 'VENTA' ? 'venta' : 'servicio-tecnico')} />
                                                    ))}
                                                </div>
                                            )}
                                            {tecNotas.length > 0 && (
                                                <div className="mt-2 space-y-1.5">
                                                    {tecNotas.map(n => <NotaCard key={`nota-${n.id}`} n={n} />)}
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
