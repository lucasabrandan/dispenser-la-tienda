import React, { useState, useEffect, useCallback } from 'react';
import { LuPin, LuCircleCheck, LuChartColumn, LuPartyPopper, LuClipboardList, LuCar, LuMapPin } from 'react-icons/lu';
import { useOrdenes } from '../../hooks/useOrdenes';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import { getTodayISO, MESES_ES } from '../../utils/dateUtils';
import ModalRegistrarTrabajo from './ModalRegistrarTrabajo';
import SwipeColumns from '../ui/SwipeColumns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-chip', tx: 'text-muted' },
    NORMAL:  { bg: 'bg-[#DBEAFE] dark:bg-[#1E3A5F]', tx: 'text-[#2563EB] dark:text-[#60A5FA]' },
    ALTA:    { bg: 'bg-[var(--warning-bg)]',           tx: 'text-[var(--warning-tx)]' },
    URGENTE: { bg: 'bg-[var(--danger-bg)]',            tx: 'text-[var(--danger-tx)]' },
};

const BORDER_COLOR = {
    PENDIENTE:   '#A8A29E',
    EN_CAMINO:   '#3B82F6',
    EN_SITIO:    '#D48800',
    COMPLETADA:  '#16A34A',
    CANCELADA:   '#D13A28',
    NO_ATENDIDO: '#DC2626',
};

const SIGUIENTE_ESTADO = {
    PENDIENTE:  { estado: 'EN_CAMINO', label: 'Salir', color: 'bg-[#3B82F6]', Icon: LuCar },
    EN_CAMINO:  { estado: 'EN_SITIO',  label: 'Llegué', color: 'bg-brand-amber', Icon: LuMapPin },
    EN_SITIO:   { estado: 'COMPLETADA', label: 'Completar', color: 'bg-[#16A34A]', Icon: LuCircleCheck },
};

function OrdenCard({ orden, onAvanzar, onEjecutar, onRegistrarTrabajo, onNoAtendido, onVerServicio }) {
    const [expandido, setExpandido] = useState(false);

    const pr  = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const sig = SIGUIENTE_ESTADO[orden.estado];
    const esFinal = orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA';

    return (
        <div className="rounded-2xl overflow-hidden bg-card border-[0.5px] border-black/[0.07]"
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${BORDER_COLOR[orden.estado] || '#A8A29E'}` }}>
            <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-label font-black px-2 py-0.5 rounded-md uppercase ${pr.bg} ${pr.tx}`}>
                                {orden.prioridad}
                            </span>
                        </div>
                        <p className="font-black text-body-lg text-ink leading-tight">{orden.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-body font-black text-ink">{orden.horaEstimada || '—'}</p>
                        <p className="text-caption text-muted">{orden.fechaProgramada}</p>
                    </div>
                </div>

                {!esFinal && orden.clienteNombre && (
                    <p className="text-body text-secondary font-bold">🏢 {orden.clienteNombre}</p>
                )}

                {!esFinal && orden.montoEstimado && (
                    <p className="text-body font-black text-brand-amber mt-0.5">
                        💰 ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
                    </p>
                )}

                {!esFinal && orden.direccion && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                        target="_blank" rel="noreferrer"
                        className="text-body text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 flex items-center gap-1 hover:underline">
                        📍 {orden.direccion}
                        <span className="text-label">↗</span>
                    </a>
                )}

                {!esFinal && orden.descripcion && (
                    <>
                        <button onClick={() => setExpandido(v => !v)}
                            className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-bold bg-panel text-secondary active:scale-95 transition-all">
                            <span>Instrucciones</span>
                            <span className="text-label">{expandido ? '▲' : '▼'}</span>
                        </button>
                        {expandido && (
                            <div className="mt-2 p-3 rounded-xl bg-panel">
                                <p className="text-caption text-secondary leading-snug">{orden.descripcion}</p>
                            </div>
                        )}
                    </>
                )}

                {orden.notasTecnico && (
                    <p className="mt-2 text-caption text-brand-green">
                        📝 {orden.notasTecnico}
                    </p>
                )}

                {/* Link al servicio — solo existe el dato para las que vinieron de un
                    presupuesto; las de "Registrar trabajo" todavía no guardan ese id. */}
                {esFinal && orden.estado === 'COMPLETADA' && orden.presupuestoId && (
                    <button onClick={() => onVerServicio(orden)}
                        className="mt-2 text-label font-bold text-[#3B82F6] dark:text-[#60A5FA] active:opacity-60">
                        Ver servicio →
                    </button>
                )}
            </div>

            {!esFinal && sig && (
                <div className="flex flex-col gap-2 px-4 py-3 bg-panel border-t border-black/[0.06] dark:border-white/[0.06]">
                    {orden.estado === 'EN_SITIO' ? (
                        <>
                            {/* Un solo botón con un solo texto — antes decía "Registrar trabajo"
                                o "Ejecutar trabajo" según un dato invisible (si venía de un
                                presupuesto). Adentro se decide solo qué formulario abrir. */}
                            <button onClick={() => orden.presupuestoId ? onEjecutar(orden) : onRegistrarTrabajo(orden)}
                                className="w-full py-2.5 rounded-xl font-black text-body text-white active:scale-95 transition-all bg-brand-red">
                                Cerrar trabajo
                            </button>
                            <p className="text-caption text-center text-muted font-bold">
                                Completá los datos del trabajo para cerrar la orden
                            </p>
                        </>
                    ) : (
                        <button onClick={() => onAvanzar(orden.id, sig.estado)}
                            className={`w-full py-2.5 rounded-xl font-black text-body text-white active:scale-95 transition-all flex items-center justify-center gap-1.5 ${sig.color}`}>
                            <sig.Icon size={16} /> {sig.label}
                        </button>
                    )}
                    {(orden.estado === 'EN_CAMINO' || orden.estado === 'EN_SITIO') && (
                        <button onClick={() => onNoAtendido(orden)}
                            className="w-full py-2 rounded-xl font-bold text-label text-muted bg-chip active:scale-95 transition-all">
                            No atendido
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function MesCard({ d, fmt, labelMes }) {
    const [abierto, setAbierto] = useState(false);
    return (
        <div className="rounded-2xl overflow-hidden bg-card border-[0.5px] border-black/[0.07]"
            >
            <button onClick={() => setAbierto(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-[#EFEDEA] dark:active:bg-[#1C1C1C] transition-colors">
                <div className="flex items-center gap-2">
                    <p className="text-body-lg font-black text-ink capitalize">
                        {labelMes(d.periodo)}
                    </p>
                    <span className="text-label font-bold text-muted bg-panel px-2 py-0.5 rounded-md">
                        {d.cantidadServicios} {d.cantidadServicios === 1 ? 'trabajo' : 'trabajos'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <p className="text-body-lg font-black text-brand-amber">
                        ${fmt(d.totalTecnico)}
                    </p>
                    <span className="text-label text-muted">{abierto ? '▲' : '▼'}</span>
                </div>
            </button>
            {abierto && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-black/[0.06] dark:border-white/[0.06] pt-3">
                    <div className="flex justify-between text-body">
                        <span className="text-secondary">Facturado</span>
                        <span className="font-bold text-ink">${fmt(d.totalFacturado)}</span>
                    </div>
                    <div className="flex justify-between text-body">
                        <span className="text-muted">− Impuestos (30%)</span>
                        <span className="text-brand-red">−${fmt(d.totalImpuestos)}</span>
                    </div>
                    {parseFloat(d.totalRepuestos || 0) > 0 && (
                        <div className="flex justify-between text-body">
                            <span className="text-muted">− Repuestos</span>
                            <span className="text-brand-red">−${fmt(d.totalRepuestos)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-body pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <span className="text-secondary">Ganancia neta</span>
                        <span className="font-bold text-ink">${fmt(d.gananciaNet)}</span>
                    </div>
                    <div className="flex justify-between text-body font-black">
                        <span className="text-brand-amber">Tu parte (50%)</span>
                        <span className="text-brand-amber">${fmt(d.totalTecnico)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function RendimientoTab({ tecnicoId }) {
    const [datos,    setDatos]    = useState([]);
    const [cargando, setCargando] = useState(false);
    const [tick,     setTick]     = useState(0);

    const cargar = () => {
        if (!tecnicoId) return;
        setCargando(true);
        api.get(`/servicios/tecnico/${tecnicoId}/rendimiento`)
            .then(r => setDatos(r.data || []))
            .catch(() => setDatos([]))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [tecnicoId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

    if (cargando) return <p className="text-center text-muted py-12">Cargando...</p>;

    if (datos.length === 0) return (
        <div className="text-center py-12 space-y-3">
            <p className="text-muted">Sin trabajos registrados aún</p>
            <button onClick={() => setTick(t => t + 1)}
                className="text-label font-bold text-brand-red px-4 py-2 rounded-xl border border-[#D13A28]/30 dark:border-[#E8422F]/30 active:scale-95 transition-all">
                Recargar
            </button>
        </div>
    );

    const fmt = (n) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
    const labelMes = (periodo) => {
        const [y, m] = periodo.split('-');
        return `${MESES_ES[parseInt(m)]} ${y}`;
    };

    const totalFact     = datos.reduce((s, d) => s + parseFloat(d.totalFacturado || 0), 0);
    const totalImp      = datos.reduce((s, d) => s + parseFloat(d.totalImpuestos  || 0), 0);
    const totalReps     = datos.reduce((s, d) => s + parseFloat(d.totalRepuestos  || 0), 0);
    const totalNet      = datos.reduce((s, d) => s + parseFloat(d.gananciaNet     || 0), 0);
    const totalTecni    = datos.reduce((s, d) => s + parseFloat(d.totalTecnico    || 0), 0);
    const totalTrabajos = datos.reduce((s, d) => s + d.cantidadServicios, 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => setTick(t => t + 1)}
                    className="text-label font-bold text-muted px-3 py-1.5 rounded-xl bg-panel active:scale-95 transition-all">
                    ↻ Recargar
                </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-card border-[0.5px] border-black/[0.07]"
                >
                <div className="p-4">
                    <p className="text-label font-black text-muted uppercase tracking-widest mb-1">
                        Total acumulado · {totalTrabajos} {totalTrabajos === 1 ? 'trabajo' : 'trabajos'}
                    </p>
                    <p className="text-[42px] font-black text-brand-amber leading-none mb-3">
                        ${fmt(totalTecni)}
                    </p>
                    <div className="space-y-1">
                        <div className="flex justify-between text-body">
                            <span className="text-muted">Facturado</span>
                            <span className="font-bold text-ink">${fmt(totalFact)}</span>
                        </div>
                        <div className="flex justify-between text-body">
                            <span className="text-muted">− Impuestos (30%)</span>
                            <span className="text-brand-red">−${fmt(totalImp)}</span>
                        </div>
                        {totalReps > 0 && (
                            <div className="flex justify-between text-body">
                                <span className="text-muted">− Repuestos</span>
                                <span className="text-brand-red">−${fmt(totalReps)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-body pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                            <span className="text-muted">Ganancia neta</span>
                            <span className="font-bold text-ink">${fmt(totalNet)}</span>
                        </div>
                    </div>
                </div>
                <div className="px-4 py-2 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20">
                    <p className="text-caption text-brand-amber font-bold">
                        Facturado − 30% imp. − repuestos = ganancia ÷ 2
                    </p>
                </div>
            </div>

            <p className="text-label font-black text-muted uppercase tracking-widest px-1">
                Por mes · tocá para ver detalle
            </p>
            {datos.map(d => (
                <MesCard key={d.periodo} d={d} fmt={fmt} labelMes={labelMes} />
            ))}
        </div>
    );
}

const TAB_DEFS = [
    { id: 'activas',     label: 'Activas',     fullLabel: 'Activas',     color: '#D13A28', Icon: LuPin },
    { id: 'historial',   label: 'Completadas', fullLabel: 'Completadas', color: '#16A34A', Icon: LuCircleCheck },
    { id: 'rendimiento', label: 'Rendimiento', fullLabel: 'Rendimiento', color: '#D48800', Icon: LuChartColumn },
];

export default function MisOrdenes({ tecnicoId, onEjecutarOrden }) {
    const { ordenes, cargando, avanzarEstado, recargar } = useOrdenes({ tecnicoId });
    const [tab, setTab] = useState('activas');

    const [historial,        setHistorial]        = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const cargarHistorial = useCallback(() => {
        if (!tecnicoId) return;
        setCargandoHistorial(true);
        api.get(`/ordenes/historial/${tecnicoId}`)
            .then(r => setHistorial((r.data || []).filter(o => o.estado === 'COMPLETADA')))
            .catch(() => setHistorial([]))
            .finally(() => setCargandoHistorial(false));
    }, [tecnicoId]);

    // Cargar historial al montar (resumen del dia) y al cambiar a tab historial
    useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

    const [servicioEjecutando, setServicioEjecutando] = useState(null);
    const [ordenEjecutandoId, setOrdenEjecutandoId] = useState(null);
    const [ordenRegistrando, setOrdenRegistrando] = useState(null);
    const [noAtendidoOrden, setNoAtendidoOrden] = useState(null);
    const [notaNoAtendido, setNotaNoAtendido] = useState('');
    const [servicioDetalle, setServicioDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const verServicio = async (orden) => {
        setCargandoDetalle(true);
        try {
            const res = await api.get(`/servicios/${orden.presupuestoId}`);
            setServicioDetalle(res.data);
        } catch {
            toast.error('No se pudo cargar el servicio');
        } finally {
            setCargandoDetalle(false);
        }
    };

    const handleNoAtendido = async () => {
        if (!noAtendidoOrden) return;
        try {
            await api.patch(`/ordenes/${noAtendidoOrden.id}/estado`, {
                estado: 'NO_ATENDIDO',
                notasTecnico: notaNoAtendido.trim() || 'No atendido',
            });
            toast.success('Orden devuelta al admin');
            setNoAtendidoOrden(null);
            setNotaNoAtendido('');
            if (recargar) recargar();
        } catch {
            toast.error('Error al reportar');
        }
    };

    const handleEjecutar = async (orden) => {
        try {
            const res = await api.get(`/servicios/${orden.presupuestoId}`);
            setServicioEjecutando(res.data);
            setOrdenEjecutandoId(orden.id);
        } catch {
            toast.error('No se pudo cargar el servicio. Intentá de nuevo.');
        }
    };

    const handleConfirmado = async () => {
        if (ordenEjecutandoId) {
            try {
                await api.patch(`/ordenes/${ordenEjecutandoId}/estado`, { estado: 'COMPLETADA' });
                toast.success('¡Trabajo completado! Revisá tu rendimiento.');
            } catch (e) {
                const det = e?.response?.data?.mensaje || e?.message || '';
                toast.error(`No se pudo completar la orden${det ? ': ' + det : ''}. Avisá al admin.`);
            }
        }
        setServicioEjecutando(null);
        setOrdenEjecutandoId(null);
        if (recargar) recargar();
        cargarHistorial();
        setTab('rendimiento');
    };

    const activas = ordenes.filter(o => !['COMPLETADA','CANCELADA','NO_ATENDIDO'].includes(o.estado));
    const lista   = tab === 'activas' ? activas : historial;

    // Resumen del dia
    const ordenesHoy = activas.filter(o => o.fechaProgramada === getTodayISO());
    const completadasHoy = historial.filter(o => o.estado === 'COMPLETADA' && o.fechaProgramada === getTodayISO());
    const proxima = ordenesHoy
        .filter(o => o.horaEstimada)
        .sort((a, b) => (a.horaEstimada || '').localeCompare(b.horaEstimada || ''))[0];

    const porFecha = lista.reduce((acc, o) => {
        const k = o.fechaProgramada;
        if (!acc[k]) acc[k] = [];
        acc[k].push(o);
        return acc;
    }, {});

    const hoy = getTodayISO();
    const formatFecha = (f) => {
        if (f === hoy) return 'Hoy';
        const d = new Date(f + 'T00:00:00');
        return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    // SwipeColumns
    const columns = TAB_DEFS.map(t => ({
        ...t,
        count: t.id === 'activas' ? activas.length : t.id === 'historial' ? historial.length : null,
    }));

    const tabIds = TAB_DEFS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(tabIds, tab, setTab);

    return (
        <>
        <div className="min-h-screen pb-28 bg-page" {...swipeHandlers}>
            <div className="max-w-2xl mx-auto px-4 pt-4">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-body-lg font-black text-ink">Mis Órdenes</h1>
                    <p className="text-caption text-muted">{activas.length} pendiente{activas.length !== 1 ? 's' : ''}</p>
                </div>

                {/* SwipeColumns */}
                <div className="mb-4">
                    <SwipeColumns columns={columns} activeId={tab} onChangeColumn={setTab} />
                </div>

                {/* Resumen del dia */}
                {tab === 'activas' && ordenesHoy.length > 0 && (
                    <div className="mb-4 p-3 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-center">
                                    <p className="text-body-lg font-black text-ink leading-none">{ordenesHoy.length}</p>
                                    <p className="text-label font-black text-muted uppercase">hoy</p>
                                </div>
                                <div className="w-px h-8 bg-black/[0.07] dark:bg-white/[0.07]" />
                                <div className="text-center">
                                    <p className="text-body-lg font-black text-[#16A34A] leading-none">{completadasHoy.length}</p>
                                    <p className="text-label font-black text-muted uppercase">listas</p>
                                </div>
                            </div>
                            {proxima && (
                                <div className="text-right">
                                    <p className="text-label font-black text-muted uppercase">Proxima</p>
                                    <p className="text-body-lg font-black text-brand-amber leading-none">{proxima.horaEstimada}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Contenido */}
                {tab === 'rendimiento' ? (
                    <RendimientoTab tecnicoId={tecnicoId} />
                ) : (tab === 'activas' ? cargando : cargandoHistorial) ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-card" />)}
                    </div>
                ) : lista.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                        {tab === 'activas' ? <LuPartyPopper size={32} className="mb-2 text-muted inline-block" /> : <LuClipboardList size={32} className="mb-2 text-muted inline-block" />}
                        <p className="text-body font-bold text-muted">
                            {tab === 'activas' ? 'Sin órdenes pendientes' : 'Sin historial aún'}
                        </p>
                    </div>
                ) : (
                    Object.entries(porFecha).map(([fecha, items]) => (
                        <div key={fecha} className="mb-5">
                            <p className="text-label font-black text-muted uppercase tracking-wider mb-2 capitalize">
                                {formatFecha(fecha)}
                            </p>
                            <div className="space-y-2">
                                {items.map(o => (
                                    <OrdenCard key={o.id} orden={o} onAvanzar={avanzarEstado} onEjecutar={handleEjecutar} onRegistrarTrabajo={setOrdenRegistrando} onNoAtendido={setNoAtendidoOrden} onVerServicio={verServicio} />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {noAtendidoOrden && (
            <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setNoAtendidoOrden(null)}>
                <div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl p-5 space-y-4"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto bg-chip" />
                    <div>
                        <p className="text-label font-black text-muted uppercase tracking-widest mb-1">No atendido</p>
                        <p className="text-body-lg font-black text-ink">{noAtendidoOrden.titulo}</p>
                    </div>
                    <textarea value={notaNoAtendido} onChange={e => setNotaNoAtendido(e.target.value)}
                        rows={3} placeholder="Motivo (ej: no habia nadie, cerrado, no atendia el telefono...)"
                        className="w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none resize-none placeholder:text-muted" />
                    <div className="flex gap-2">
                        <button onClick={() => setNoAtendidoOrden(null)}
                            className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95 transition-all">
                            Cancelar
                        </button>
                        <button onClick={handleNoAtendido}
                            className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-[#DC2626] active:scale-95 transition-all">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {ordenRegistrando && (
            <ModalRegistrarTrabajo
                orden={ordenRegistrando}
                tecnicoId={tecnicoId}
                onGuardado={() => { setOrdenRegistrando(null); if (recargar) recargar(); }}
                onCerrar={() => setOrdenRegistrando(null)}
            />
        )}

        {servicioEjecutando && (
            <EjecutarOrdenSheet
                servicio={servicioEjecutando}
                onConfirmado={handleConfirmado}
                onCerrar={() => { setServicioEjecutando(null); setOrdenEjecutandoId(null); }}
            />
        )}

        {/* Detalle del servicio — link "Ver servicio" desde Completadas (hallazgo 07) */}
        {(cargandoDetalle || servicioDetalle) && (
            <div className="fixed inset-0 z-[3000] flex items-end bg-black/50" onClick={() => setServicioDetalle(null)}>
                <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 bg-white dark:bg-[#242424] border-t border-black/[0.05] dark:border-white/[0.05]"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip" />
                    {cargandoDetalle ? (
                        <p className="text-center text-muted py-8">Cargando...</p>
                    ) : (
                        <>
                            <h3 className="text-body-lg font-black mb-1 text-ink">
                                Servicio — {servicioDetalle.clienteNombre}
                            </h3>
                            <p className="text-caption text-muted mb-4">#{servicioDetalle.id} · {servicioDetalle.fecha}</p>
                            <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4">
                                {(servicioDetalle.items || []).map((it, idx) => (
                                    <div key={`${it.equipoSerial || 'det'}-${idx}`} className="p-3.5 rounded-xl bg-[#F5F3F1] dark:bg-[#1C1C1C] border border-black/[0.04] dark:border-white/[0.04]">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-body text-brand-red">{it.equipoSerial}</span>
                                            <span className="font-black text-body-lg text-ink">${Number(it.costo || 0).toLocaleString('es-AR')}</span>
                                        </div>
                                        <p className="text-caption text-secondary leading-snug">{it.trabajoRealizado}</p>
                                        {it.repuestosUsados?.length > 0 && (
                                            <p className="text-caption text-muted pt-2 mt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                                                <span className="font-bold">Repuestos: </span>
                                                {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setServicioDetalle(null)}
                                className="w-full py-3 rounded-xl font-bold text-sm text-white active:scale-95 bg-ink dark:text-[#1C1917]">
                                Cerrar
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
        </>
    );
}
