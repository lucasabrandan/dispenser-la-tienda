import React, { useState, useEffect, useCallback } from 'react';
import { LuPin, LuCircleCheck, LuChartColumn, LuPartyPopper, LuClipboardList, LuCar, LuMapPin, LuUndo2, LuBuilding2, LuBanknote, LuStickyNote, LuCalendar } from 'react-icons/lu';
import { useOrdenes } from '../../hooks/useOrdenes';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import { getTodayISO, MESES_ES, fechaAR } from '../../utils/dateUtils';
import ModalRegistrarTrabajo from './ModalRegistrarTrabajo';
import SwipeColumns from '../ui/SwipeColumns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { buildGoogleMapsRouteUrl } from '../../utils/clienteUtils';
import DireccionMapa from '../ui/DireccionMapa';
import ConfirmarHorarioSheet from '../servicio/ConfirmarHorarioSheet';
import { resumenVentanas } from '../../utils/ordenes';
import SalidaTecnicoSheet from './SalidaTecnicoSheet';
import MiAgenda from './MiAgenda';
import { enviarOEncolar } from '../../utils/pendientesOffline';
import HistorialSerieSheet from './HistorialSerieSheet';
import CerrarDiaSheet from './CerrarDiaSheet';
import QueLlevarHoy from './QueLlevarHoy';
import CargaPorSerieSheet from './CargaPorSerieSheet';
import { etapaColor, colorTecnico } from '../../utils/estados';
import { useAuth } from '../../context/AuthContext';

const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-chip', tx: 'text-muted' },
    NORMAL:  { bg: 'bg-[#DBEAFE] dark:bg-[#1E3A5F]', tx: 'text-[#2563EB] dark:text-[#60A5FA]' },
    ALTA:    { bg: 'bg-[var(--warning-bg)]',           tx: 'text-[var(--warning-tx)]' },
    URGENTE: { bg: 'bg-[var(--danger-bg)]',            tx: 'text-[var(--danger-tx)]' },
};

const ESTADO_LABEL = {
    PENDIENTE: 'Asignado', EN_CAMINO: 'En camino', EN_SITIO: 'En el lugar',
    COMPLETADA: 'Hecho', CANCELADA: 'Devuelta', NO_ATENDIDO: 'No atendió',
};

// Mismos colores de etapa que ve el admin en Trabajos (utils/estados.js · ETAPAS)
const BORDER_COLOR = {
    PENDIENTE:   etapaColor('PENDIENTE'),
    EN_CAMINO:   etapaColor('EN_CAMINO'),
    EN_SITIO:    etapaColor('EN_SITIO'),
    COMPLETADA:  etapaColor('COMPLETADA'),
    CANCELADA:   '#A8A29E',
    NO_ATENDIDO: '#F87171',
};

// El color del boton ya no varia por etapa (antes: azul/ambar/verde) — es
// siempre la misma accion "avanzar el siguiente paso", y la etapa actual ya
// se lee en el borde/dot de la card (BORDER_COLOR). Mismo criterio que se
// aplico a ServicioCard.jsx.
const SIGUIENTE_ESTADO = {
    // Un color por paso (2-oct-2026: todo rojo se confundía): azul salir, ámbar llegué, verde cerrar
    PENDIENTE:  { estado: 'EN_CAMINO', label: 'Salir', bg: '#2563EB', Icon: LuCar },
    EN_CAMINO:  { estado: 'EN_SITIO',  label: 'Llegué', bg: '#B45309', Icon: LuMapPin },
    EN_SITIO:   { estado: 'COMPLETADA', label: 'Completar', bg: '#15803D', Icon: LuCircleCheck },
};

// Paso atrás por si el técnico tocó la orden equivocada (solo uno, y nunca desde COMPLETADA)
const ESTADO_ANTERIOR = {
    EN_CAMINO: { estado: 'PENDIENTE', label: 'Deshacer "Salí"' },
    EN_SITIO:  { estado: 'EN_CAMINO', label: 'Deshacer "Llegué"' },
};

function OrdenCard({ orden, onAvanzar, onEjecutar, onRegistrarTrabajo, onNoAtendido, onNoPuedo, onVerServicio, onHorarioConfirmado, seleccionando, seleccionada, onToggleSel }) {
    const [expandido, setExpandido] = useState(false);
    const [confirmandoHorario, setConfirmandoHorario] = useState(false);
    const aCoordinar = !!orden.horarioACoordinar;

    const pr  = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const sig = SIGUIENTE_ESTADO[orden.estado];
    const esFinal = orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA';

    return (
        <div className={`rounded-2xl overflow-hidden bg-card border border-black/10 dark:border-white/[0.12] transition-all ${seleccionando && seleccionada ? 'ring-2 ring-brand-red' : ''} ${['EN_CAMINO', 'EN_SITIO'].includes(orden.estado) ? 'shadow-lg' : ''}`}
            style={{ borderLeft: `6px solid ${BORDER_COLOR[orden.estado] || '#A8A29E'}` }}
            onClick={seleccionando ? () => onToggleSel(orden.id) : undefined}>
            <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                    {seleccionando && (
                        <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${seleccionada ? 'bg-brand-red border-brand-red' : 'border-muted bg-transparent'}`}>
                            {seleccionada && <span className="text-white text-label font-black">✓</span>}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {ESTADO_LABEL[orden.estado] && (
                                <span className="text-label font-black px-2 py-0.5 rounded-md uppercase text-[#1C1917]"
                                    style={{ background: BORDER_COLOR[orden.estado] }}>
                                    {ESTADO_LABEL[orden.estado]}
                                </span>
                            )}
                            {orden.prioridad && orden.prioridad !== 'NORMAL' && (
                                <span className={`text-label font-black px-2 py-0.5 rounded-md uppercase ${pr.bg} ${pr.tx}`}>
                                    {orden.prioridad}
                                </span>
                            )}
                        </div>
                        <p className="font-black text-body-lg text-ink leading-tight">{orden.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-body font-black text-ink">{aCoordinar ? 'A coordinar' : (orden.horaEstimada || '—')}</p>
                        <p className="text-caption text-muted">{fechaAR(orden.fechaProgramada)}</p>
                    </div>
                </div>

                {!esFinal && orden.clienteNombre && (
                    <p className="text-body text-secondary font-bold flex items-center gap-1"><LuBuilding2 size={13} />{orden.clienteNombre}</p>
                )}

                {!esFinal && orden.montoEstimado && (
                    <p className="text-body font-black text-brand-amber mt-0.5 flex items-center gap-1">
                        <LuBanknote size={14} /> ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
                    </p>
                )}

                {!esFinal && orden.direccion && (
                    <DireccionMapa direccion={orden.direccion} className="mt-1.5" />
                )}

                {/* Horario pedido por el cliente (presupuesto con fecha tentativa):
                    antes el técnico no lo veía en ningún lado. Confirmar acá fija
                    día y hora en el presupuesto y en esta orden. */}
                {!esFinal && aCoordinar && (
                    <div className="mt-2.5 p-3 rounded-xl border border-[var(--estado-curso)] bg-[var(--warning-bg)]">
                        <p className="text-label font-bold text-[var(--warning-tx)]">El cliente puede</p>
                        {resumenVentanas(orden.ventanasCliente).map(linea => (
                            <p key={linea} className="text-body font-bold text-ink">{linea}</p>
                        ))}
                        <button onClick={e => { e.stopPropagation(); setConfirmandoHorario(true); }}
                            className="mt-2 w-full h-10 rounded-lg font-bold text-body text-ink border border-black/10 dark:border-white/[0.12] active:scale-95">
                            Confirmar día y hora
                        </button>
                    </div>
                )}
                {confirmandoHorario && (
                    <ConfirmarHorarioSheet
                        servicio={{ id: orden.presupuestoId, ventanasDisponibles: orden.ventanasCliente, clienteNombre: orden.clienteNombre }}
                        onCerrar={() => setConfirmandoHorario(false)}
                        onConfirmado={() => { setConfirmandoHorario(false); onHorarioConfirmado && onHorarioConfirmado(); }}
                    />
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
                    <p className="mt-2 text-caption text-brand-green flex items-center gap-1">
                        <LuStickyNote size={12} />{orden.notasTecnico}
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

            {!esFinal && sig && !seleccionando && (
                <div className="flex flex-col gap-2 px-4 py-3 bg-panel border-t border-black/[0.06] dark:border-white/[0.06]" onClick={e => e.stopPropagation()}>
                    {orden.estado === 'EN_SITIO' ? (
                        <>
                            {/* Un solo botón con un solo texto — antes decía "Registrar trabajo"
                                o "Ejecutar trabajo" según un dato invisible (si venía de un
                                presupuesto). Adentro se decide solo qué formulario abrir. */}
                            <button onClick={() => orden.presupuestoId ? onEjecutar(orden) : onRegistrarTrabajo(orden)}
                                style={{ background: '#15803D' }}
                                className="w-full py-2.5 rounded-xl font-black text-body text-white active:scale-95 transition-all">
                                Cerrar trabajo
                            </button>
                            <p className="text-caption text-center text-muted font-bold">
                                Completá los datos del trabajo para cerrar la orden
                            </p>
                        </>
                    ) : (
                        <button onClick={() => onAvanzar(orden.id, sig.estado)}
                            style={{ background: sig.bg }}
                            className="w-full py-2.5 rounded-xl font-black text-body text-white active:scale-95 transition-all flex items-center justify-center gap-1.5">
                            <sig.Icon size={16} /> {sig.label}
                        </button>
                    )}
                    {(orden.estado === 'EN_CAMINO' || orden.estado === 'EN_SITIO') && (
                        <button onClick={() => onNoAtendido(orden)}
                            className="w-full py-2 rounded-xl font-bold text-label text-muted bg-chip active:scale-95 transition-all">
                            El cliente no atendió
                        </button>
                    )}
                    {/* Motivo del técnico, no del cliente: la visita vuelve al admin */}
                    {onNoPuedo && (
                        <button onClick={() => onNoPuedo(orden)}
                            className="w-full py-2 rounded-xl font-bold text-label text-muted border border-black/10 dark:border-line active:scale-95 transition-all">
                            No puedo ir
                        </button>
                    )}
                    {ESTADO_ANTERIOR[orden.estado] && (
                        <button onClick={() => onAvanzar(orden.id, ESTADO_ANTERIOR[orden.estado].estado)}
                            className="w-full py-1.5 flex items-center justify-center gap-1 font-bold text-caption text-muted active:opacity-60">
                            <LuUndo2 size={13} /> {ESTADO_ANTERIOR[orden.estado].label}
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
                className="w-full flex items-center justify-between px-4 py-3 active:bg-[#EFEDEA] dark:active:bg-[#161615] transition-colors">
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
    // Agenda (calendario) fusionada acá — antes era su propia pantalla en el menú (2-oct-2026)
    { id: 'agenda',      label: 'Agenda',      fullLabel: 'Agenda',      color: '#3B82F6', Icon: LuCalendar },
    { id: 'historial',   label: 'Completadas', fullLabel: 'Completadas', color: '#16A34A', Icon: LuCircleCheck },
    { id: 'rendimiento', label: 'Rendimiento', fullLabel: 'Rendimiento', color: '#D48800', Icon: LuChartColumn },
];

export default function MisOrdenes({ tecnicoId, onEjecutarOrden }) {
    const { ordenes, cargando, avanzarEstado, recargar } = useOrdenes({ tecnicoId });
    const { usuario } = useAuth();
    const [tab, setTab] = useState('activas');

    // "Elegir para ruta": mismo patron que ya tiene Presupuestos (admin) —
    // el tecnico marca varias visitas pendientes y arma una sola ruta con
    // todas las paradas en Google Maps, en vez de abrir "Ver ruta" de a una
    // y tener que adivinar el mejor orden a mano.
    const [modoSeleccion, setModoSeleccion] = useState(false);
    const [seleccionados, setSeleccionados] = useState(new Set());
    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const abrirRuta = (items) => {
        const url = buildGoogleMapsRouteUrl(items.map(o => o.direccion));
        if (!url) { toast.error('Ninguna de las elegidas tiene dirección cargada'); return; }
        window.open(url, '_blank');
    };

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
    const [buscarSerie, setBuscarSerie] = useState(false);
    const [cerrarDia, setCerrarDia] = useState(false);
    const [cargaSerie, setCargaSerie] = useState(false);
    const [masAcciones, setMasAcciones] = useState(false);
    const [salida, setSalida] = useState(null); // { modo: 'orden'|'hoy'|'mensaje', orden? }
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
                const r = await enviarOEncolar('patch', `/ordenes/${ordenEjecutandoId}/estado`, { estado: 'COMPLETADA' }, `Visita #${ordenEjecutandoId} → COMPLETADA`);
                if (r.encolado) toast('Sin señal: la visita se marca completada cuando vuelva la conexión', { icon: '📶' });
                else toast.success('¡Trabajo completado! Revisá tu rendimiento.');
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
    // Criterio de orden (2-oct-2026): lo pendiente como agenda (próximo primero, ya viene
    // así del backend); lo terminado como historial (lo más nuevo primero).
    const historialOrdenado = [...historial].sort((a, b) =>
        `${b.fechaProgramada || ''} ${b.horaEstimada || ''}`.localeCompare(`${a.fechaProgramada || ''} ${a.horaEstimada || ''}`));
    const lista   = tab === 'activas' ? activas : historialOrdenado;

    // "Todos"/"Ninguno" — mismo patrón que useRepuestoManager.js / ServicioManager.jsx:
    // selecciona todas las visitas activas visibles, no un listado sin filtrar.
    const todosSeleccionados = activas.length > 0 && seleccionados.size === activas.length;
    const seleccionarTodos = () => {
        setSeleccionados(todosSeleccionados ? new Set() : new Set(activas.map(o => o.id)));
    };

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
    // Envuelve setTab para salir del modo selección al cambiar de pestaña —
    // "Elegir para ruta" solo tiene sentido en Activas (usado tanto por el
    // swipe como por el tap directo en SwipeColumns más abajo).
    const cambiarTab = (t) => { setTab(t); setModoSeleccion(false); setSeleccionados(new Set()); };
    const swipeHandlers = useSwipeGesture(tabIds, tab, cambiarTab);

    return (
        <>
        <div className="min-h-screen pb-28 bg-page" {...swipeHandlers}>
            <div className="max-w-2xl mx-auto px-4 pt-4">
                {/* Header */}
                {modoSeleccion ? (
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <p className="text-body-lg font-black text-ink">
                                {seleccionados.size} seleccionada{seleccionados.size !== 1 ? 's' : ''}
                            </p>
                            <p className="text-caption text-muted">Tocá las visitas que querés incluir</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={seleccionarTodos}
                                className="h-9 px-3 rounded-xl font-bold text-label text-secondary bg-chip active:scale-95 transition-all">
                                {todosSeleccionados ? 'Ninguno' : 'Todos'}
                            </button>
                            {seleccionados.size > 0 && (
                                <button onClick={() => abrirRuta(activas.filter(o => seleccionados.has(o.id)))}
                                    className="h-9 px-3 rounded-xl font-black text-label text-white bg-brand-red active:scale-95 transition-all flex items-center gap-1">
                                    <LuMapPin size={14} /> Ver ruta
                                </button>
                            )}
                            <button onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
                                className="h-9 px-3 rounded-xl font-bold text-label text-secondary bg-chip active:scale-95 transition-all">
                                Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h1 className="text-body-lg font-black text-ink flex items-center gap-2">
                                Hoy
                                {usuario?.nombre && (
                                    <span className="flex items-center gap-1.5 text-caption font-bold text-secondary">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorTecnico(usuario.nombre) }} />
                                        {usuario.nombre.split(' ')[0]}
                                    </span>
                                )}
                            </h1>
                            <p className="text-caption text-muted">{activas.length} pendiente{activas.length !== 1 ? 's' : ''}</p>
                        </div>
                        {tab === 'activas' && activas.length > 0 && (
                            <button onClick={() => setModoSeleccion(true)}
                                className="h-9 px-3 rounded-xl font-bold text-label text-secondary bg-chip active:scale-95 transition-all shrink-0 flex items-center gap-1">
                                <LuMapPin size={14} /> Elegir para ruta
                            </button>
                        )}
                    </div>
                )}

                {/* SwipeColumns */}
                <div className="mb-4">
                    <SwipeColumns columns={columns} activeId={tab} onChangeColumn={cambiarTab} />
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

                {tab === 'activas' && <QueLlevarHoy ordenesHoy={ordenesHoy} />}

                {/* Herramientas del día — una sola fila compacta (2-oct-2026: antes eran 5
                    botones grandes apilados que empujaban las órdenes para abajo). */}
                {tab === 'activas' && (
                    <div className="mb-4 grid grid-cols-3 gap-2">
                        <button onClick={() => setCargaSerie(true)}
                            className="h-10 rounded-xl text-label font-bold text-ink bg-card border border-black/10 dark:border-white/10 active:scale-95 flex items-center justify-center gap-1">
                            <LuPin size={13} /> Cargar N/S
                        </button>
                        <button onClick={() => setBuscarSerie(true)}
                            className="h-10 rounded-xl text-label font-bold text-ink bg-card border border-black/10 dark:border-white/10 active:scale-95 flex items-center justify-center gap-1">
                            <LuClipboardList size={13} /> Historial N/S
                        </button>
                        <button onClick={() => setMasAcciones(v => !v)}
                            className={`h-10 rounded-xl text-label font-bold border active:scale-95 ${masAcciones ? 'bg-chip text-ink border-transparent' : 'bg-card text-muted border-black/10 dark:border-white/10'}`}>
                            Más {masAcciones ? '▲' : '▼'}
                        </button>
                        {masAcciones && (
                            <div className="col-span-3 grid grid-cols-2 gap-2">
                                <button onClick={() => { setMasAcciones(false); setSalida({ modo: 'mensaje' }); }}
                                    className="h-10 rounded-xl text-label font-bold text-ink border border-black/10 dark:border-white/10 active:scale-95">
                                    Avisar al admin
                                </button>
                                <button onClick={() => { setMasAcciones(false); setSalida({ modo: 'hoy' }); }}
                                    className="h-10 rounded-xl text-label font-bold text-muted border border-black/10 dark:border-white/10 active:scale-95">
                                    No puedo trabajar hoy
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Contenido */}
                {tab === 'agenda' ? (
                    <MiAgenda tecnicoId={tecnicoId} embebido />
                ) : tab === 'rendimiento' ? (
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
                            <div className="space-y-4">
                                {items.map(o => (
                                    <OrdenCard key={o.id} orden={o} onHorarioConfirmado={recargar} onAvanzar={avanzarEstado} onEjecutar={handleEjecutar} onRegistrarTrabajo={setOrdenRegistrando} onNoAtendido={setNoAtendidoOrden} onNoPuedo={(o) => setSalida({ modo: 'orden', orden: o })} onVerServicio={verServicio}
                                        seleccionando={modoSeleccion} seleccionada={seleccionados.has(o.id)} onToggleSel={toggleSeleccion} />
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {/* Cerrar mi día va al final: es lo último que se hace en el día */}
                {tab === 'activas' && !cargando && (
                    <button onClick={() => setCerrarDia(true)}
                        className="mt-2 w-full h-12 rounded-xl text-label font-black uppercase text-white bg-ink dark:text-[#1C1917] active:scale-95">
                        Cerrar mi día
                    </button>
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

        {salida && (
            <SalidaTecnicoSheet modo={salida.modo} orden={salida.orden}
                onCerrar={() => setSalida(null)}
                onListo={() => { setSalida(null); if (recargar) recargar(); }} />
        )}

        {ordenRegistrando && (
            <ModalRegistrarTrabajo
                orden={ordenRegistrando}
                tecnicoId={tecnicoId}
                onGuardado={() => { setOrdenRegistrando(null); if (recargar) recargar(); }}
                onCerrar={() => setOrdenRegistrando(null)}
            />
        )}

        {buscarSerie && <HistorialSerieSheet onClose={() => setBuscarSerie(false)} />}
        {cargaSerie && <CargaPorSerieSheet onClose={() => setCargaSerie(false)} onGuardado={() => cargarHistorial()} />}
        {cerrarDia && (
            <CerrarDiaSheet
                ordenesHoy={[...ordenes, ...historial.filter(h => !ordenes.some(o => o.id === h.id))]
                    .filter(o => o.fechaProgramada === getTodayISO())}
                onClose={() => setCerrarDia(false)} />
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
                <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 bg-card border-t border-black/[0.05] dark:border-white/[0.05]"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip" />
                    {cargandoDetalle ? (
                        <p className="text-center text-muted py-8">Cargando...</p>
                    ) : (
                        <>
                            <h3 className="text-body-lg font-black mb-1 text-ink">
                                Servicio — {servicioDetalle.clienteNombre}
                            </h3>
                            <p className="text-caption text-muted mb-4">#{servicioDetalle.id} · {fechaAR(servicioDetalle.fecha)}</p>
                            <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4">
                                {(servicioDetalle.items || []).map((it, idx) => (
                                    <div key={`${it.equipoSerial || 'det'}-${idx}`} className="p-3.5 rounded-xl bg-page border border-black/[0.04] dark:border-white/[0.04]">
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
