import React, { useState, useEffect, useCallback } from 'react';
import { useOrdenes } from '../../hooks/useOrdenes';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import { getTodayISO, MESES_ES } from '../../utils/dateUtils';
import ModalRegistrarTrabajo from './ModalRegistrarTrabajo';
import SwipeColumns from '../ui/SwipeColumns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-[#E8E5E0] dark:bg-[#2E2E2E]', tx: 'text-[#A8A29E]' },
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
    PENDIENTE:  { estado: 'EN_CAMINO', label: '🚗 Salir', color: 'bg-[#3B82F6]' },
    EN_CAMINO:  { estado: 'EN_SITIO',  label: '📍 Llegué', color: 'bg-[#D48800] dark:bg-[#F0A500]' },
    EN_SITIO:   { estado: 'COMPLETADA', label: '✓ Completar', color: 'bg-[#16A34A]' },
};

function OrdenCard({ orden, onAvanzar, onEjecutar, onRegistrarTrabajo, onNoAtendido, onVerServicio }) {
    const [expandido, setExpandido] = useState(false);

    const pr  = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const sig = SIGUIENTE_ESTADO[orden.estado];
    const esFinal = orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA';

    return (
        <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] border-[0.5px] border-black/[0.07]"
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${BORDER_COLOR[orden.estado] || '#A8A29E'}` }}>
            <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${pr.bg} ${pr.tx}`}>
                                {orden.prioridad}
                            </span>
                        </div>
                        <p className="font-black text-[15px] text-[#1C1917] dark:text-[#F0EEE9] leading-tight">{orden.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{orden.horaEstimada || '—'}</p>
                        <p className="text-[10px] text-[#A8A29E]">{orden.fechaProgramada}</p>
                    </div>
                </div>

                {!esFinal && orden.clienteNombre && (
                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] font-bold">🏢 {orden.clienteNombre}</p>
                )}

                {!esFinal && orden.montoEstimado && (
                    <p className="text-[12px] font-black text-[#D48800] dark:text-[#F0A500] mt-0.5">
                        💰 ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
                    </p>
                )}

                {!esFinal && orden.direccion && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                        target="_blank" rel="noreferrer"
                        className="text-[12px] text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 flex items-center gap-1 hover:underline">
                        📍 {orden.direccion}
                        <span className="text-[10px]">↗</span>
                    </a>
                )}

                {!esFinal && orden.descripcion && (
                    <>
                        <button onClick={() => setExpandido(v => !v)}
                            className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                            <span>Instrucciones</span>
                            <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                        </button>
                        {expandido && (
                            <div className="mt-2 p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                                <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{orden.descripcion}</p>
                            </div>
                        )}
                    </>
                )}

                {orden.notasTecnico && (
                    <p className="mt-2 text-[11px] text-[#16A34A] dark:text-[#4ADE80]">
                        📝 {orden.notasTecnico}
                    </p>
                )}

                {/* Link al servicio — solo existe el dato para las que vinieron de un
                    presupuesto; las de "Registrar trabajo" todavía no guardan ese id. */}
                {esFinal && orden.estado === 'COMPLETADA' && orden.presupuestoId && (
                    <button onClick={() => onVerServicio(orden)}
                        className="mt-2 text-[11px] font-bold text-[#3B82F6] dark:text-[#60A5FA] active:opacity-60">
                        Ver servicio →
                    </button>
                )}
            </div>

            {!esFinal && sig && (
                <div className="flex flex-col gap-2 px-4 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-t border-black/[0.06] dark:border-white/[0.06]">
                    {orden.estado === 'EN_SITIO' ? (
                        <>
                            {/* Un solo botón con un solo texto — antes decía "Registrar trabajo"
                                o "Ejecutar trabajo" según un dato invisible (si venía de un
                                presupuesto). Adentro se decide solo qué formulario abrir. */}
                            <button onClick={() => orden.presupuestoId ? onEjecutar(orden) : onRegistrarTrabajo(orden)}
                                className="w-full py-2.5 rounded-xl font-black text-[13px] text-white active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                                Cerrar trabajo
                            </button>
                            <p className="text-[10px] text-center text-[#A8A29E] font-bold">
                                Completá los datos del trabajo para cerrar la orden
                            </p>
                        </>
                    ) : (
                        <button onClick={() => onAvanzar(orden.id, sig.estado)}
                            className={`w-full py-2.5 rounded-xl font-black text-[13px] text-white active:scale-95 transition-all ${sig.color}`}>
                            {sig.label}
                        </button>
                    )}
                    {(orden.estado === 'EN_CAMINO' || orden.estado === 'EN_SITIO') && (
                        <button onClick={() => onNoAtendido(orden)}
                            className="w-full py-2 rounded-xl font-bold text-[11px] text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-95 transition-all">
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
        <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] border-[0.5px] border-black/[0.07]"
            >
            <button onClick={() => setAbierto(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-[#EFEDEA] dark:active:bg-[#1C1C1C] transition-colors">
                <div className="flex items-center gap-2">
                    <p className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9] capitalize">
                        {labelMes(d.periodo)}
                    </p>
                    <span className="text-[10px] font-bold text-[#A8A29E] bg-[#EFEDEA] dark:bg-[#1C1C1C] px-2 py-0.5 rounded-md">
                        {d.cantidadServicios} {d.cantidadServicios === 1 ? 'trabajo' : 'trabajos'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[15px] font-black text-[#D48800] dark:text-[#F0A500]">
                        ${fmt(d.totalTecnico)}
                    </p>
                    <span className="text-[10px] text-[#A8A29E]">{abierto ? '▲' : '▼'}</span>
                </div>
            </button>
            {abierto && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-black/[0.06] dark:border-white/[0.06] pt-3">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-[#57534E] dark:text-[#9E9A94]">Facturado</span>
                        <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">${fmt(d.totalFacturado)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-[#A8A29E]">− Impuestos (30%)</span>
                        <span className="text-[#D13A28] dark:text-[#E8422F]">−${fmt(d.totalImpuestos)}</span>
                    </div>
                    {parseFloat(d.totalRepuestos || 0) > 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span className="text-[#A8A29E]">− Repuestos</span>
                            <span className="text-[#D13A28] dark:text-[#E8422F]">−${fmt(d.totalRepuestos)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-[11px] pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <span className="text-[#57534E] dark:text-[#9E9A94]">Ganancia neta</span>
                        <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">${fmt(d.gananciaNet)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black">
                        <span className="text-[#D48800] dark:text-[#F0A500]">Tu parte (50%)</span>
                        <span className="text-[#D48800] dark:text-[#F0A500]">${fmt(d.totalTecnico)}</span>
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

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;

    if (datos.length === 0) return (
        <div className="text-center py-12 space-y-3">
            <p className="text-[#A8A29E]">Sin trabajos registrados aún</p>
            <button onClick={() => setTick(t => t + 1)}
                className="text-[11px] font-bold text-[#D13A28] dark:text-[#E8422F] px-4 py-2 rounded-xl border border-[#D13A28]/30 dark:border-[#E8422F]/30 active:scale-95 transition-all">
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
                    className="text-[11px] font-bold text-[#A8A29E] px-3 py-1.5 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] active:scale-95 transition-all">
                    ↻ Recargar
                </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] border-[0.5px] border-black/[0.07]"
                >
                <div className="p-4">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-1">
                        Total acumulado · {totalTrabajos} {totalTrabajos === 1 ? 'trabajo' : 'trabajos'}
                    </p>
                    <p className="text-[42px] font-black text-[#D48800] dark:text-[#F0A500] leading-none mb-3">
                        ${fmt(totalTecni)}
                    </p>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-[#A8A29E]">Facturado</span>
                            <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">${fmt(totalFact)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-[#A8A29E]">− Impuestos (30%)</span>
                            <span className="text-[#D13A28] dark:text-[#E8422F]">−${fmt(totalImp)}</span>
                        </div>
                        {totalReps > 0 && (
                            <div className="flex justify-between text-[11px]">
                                <span className="text-[#A8A29E]">− Repuestos</span>
                                <span className="text-[#D13A28] dark:text-[#E8422F]">−${fmt(totalReps)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px] pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                            <span className="text-[#A8A29E]">Ganancia neta</span>
                            <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">${fmt(totalNet)}</span>
                        </div>
                    </div>
                </div>
                <div className="px-4 py-2 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20">
                    <p className="text-[10px] text-[#D48800] dark:text-[#F0A500] font-bold">
                        Facturado − 30% imp. − repuestos = ganancia ÷ 2
                    </p>
                </div>
            </div>

            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest px-1">
                Por mes · tocá para ver detalle
            </p>
            {datos.map(d => (
                <MesCard key={d.periodo} d={d} fmt={fmt} labelMes={labelMes} />
            ))}
        </div>
    );
}

const TAB_DEFS = [
    { id: 'activas',     label: 'Activas',     fullLabel: 'Activas',     color: '#D13A28', icon: '📌' },
    { id: 'historial',   label: 'Completadas', fullLabel: 'Completadas', color: '#16A34A', icon: '✅' },
    { id: 'rendimiento', label: 'Rendimiento', fullLabel: 'Rendimiento', color: '#D48800', icon: '📊' },
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
        <div className="min-h-screen pb-28 bg-[#F5F3F1] dark:bg-[#141414]" {...swipeHandlers}>
            <div className="max-w-2xl mx-auto px-4 pt-4">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Mis Órdenes</h1>
                    <p className="text-[11px] text-[#A8A29E]">{activas.length} pendiente{activas.length !== 1 ? 's' : ''}</p>
                </div>

                {/* SwipeColumns */}
                <div className="mb-4">
                    <SwipeColumns columns={columns} activeId={tab} onChangeColumn={setTab} />
                </div>

                {/* Resumen del dia */}
                {tab === 'activas' && ordenesHoy.length > 0 && (
                    <div className="mb-4 p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-center">
                                    <p className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">{ordenesHoy.length}</p>
                                    <p className="text-[9px] font-black text-[#A8A29E] uppercase">hoy</p>
                                </div>
                                <div className="w-px h-8 bg-black/[0.07] dark:bg-white/[0.07]" />
                                <div className="text-center">
                                    <p className="text-[20px] font-black text-[#16A34A] leading-none">{completadasHoy.length}</p>
                                    <p className="text-[9px] font-black text-[#A8A29E] uppercase">listas</p>
                                </div>
                            </div>
                            {proxima && (
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-[#A8A29E] uppercase">Proxima</p>
                                    <p className="text-[18px] font-black text-[#D48800] dark:text-[#F0A500] leading-none">{proxima.horaEstimada}</p>
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
                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-[#FFFFFF] dark:bg-[#242424]" />)}
                    </div>
                ) : lista.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-3xl mb-2">{tab === 'activas' ? '🎉' : '📋'}</p>
                        <p className="text-[13px] font-bold text-[#A8A29E]">
                            {tab === 'activas' ? 'Sin órdenes pendientes' : 'Sin historial aún'}
                        </p>
                    </div>
                ) : (
                    Object.entries(porFecha).map(([fecha, items]) => (
                        <div key={fecha} className="mb-5">
                            <p className="text-[11px] font-black text-[#A8A29E] uppercase tracking-wider mb-2 capitalize">
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
                <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl shadow-2xl p-5 space-y-4"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                    <div>
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-1">No atendido</p>
                        <p className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{noAtendidoOrden.titulo}</p>
                    </div>
                    <textarea value={notaNoAtendido} onChange={e => setNotaNoAtendido(e.target.value)}
                        rows={3} placeholder="Motivo (ej: no habia nadie, cerrado, no atendia el telefono...)"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] text-[13px] font-medium outline-none resize-none placeholder:text-[#A8A29E]" />
                    <div className="flex gap-2">
                        <button onClick={() => setNoAtendidoOrden(null)}
                            className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                            Cancelar
                        </button>
                        <button onClick={handleNoAtendido}
                            className="flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase text-white bg-[#DC2626] active:scale-95 transition-all">
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
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                    {cargandoDetalle ? (
                        <p className="text-center text-[#A8A29E] py-8">Cargando...</p>
                    ) : (
                        <>
                            <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">
                                Servicio — {servicioDetalle.clienteNombre}
                            </h3>
                            <p className="text-[11px] text-[#A8A29E] mb-4">#{servicioDetalle.id} · {servicioDetalle.fecha}</p>
                            <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4">
                                {(servicioDetalle.items || []).map((it, idx) => (
                                    <div key={`${it.equipoSerial || 'det'}-${idx}`} className="p-3.5 rounded-xl bg-[#F5F3F1] dark:bg-[#1C1C1C] border border-black/[0.04] dark:border-white/[0.04]">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                                            <span className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]">${Number(it.costo || 0).toLocaleString('es-AR')}</span>
                                        </div>
                                        <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{it.trabajoRealizado}</p>
                                        {it.repuestosUsados?.length > 0 && (
                                            <p className="text-[10px] text-[#A8A29E] pt-2 mt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                                                <span className="font-bold">Repuestos: </span>
                                                {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setServicioDetalle(null)}
                                className="w-full py-3 rounded-xl font-bold text-sm text-white active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">
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
