import React, { useState, useEffect, useCallback } from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import DeslizarAcciones from '../ui/DeslizarAcciones';
import ContactarClienteSheet from './ContactarClienteSheet';
import { LuCircleCheck, LuPartyPopper, LuClipboardList, LuCar, LuMapPin, LuUndo2, LuBuilding2, LuBanknote, LuStickyNote, LuMessageSquare, LuCalendarX, LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { useOrdenes } from '../../hooks/useOrdenes';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import { getTodayISO, fechaAR } from '../../utils/dateUtils';
import ModalRegistrarTrabajo from './ModalRegistrarTrabajo';
import { buildGoogleMapsRouteUrl } from '../../utils/clienteUtils';
import DireccionMapa from '../ui/DireccionMapa';
import ConfirmarHorarioSheet from '../servicio/ConfirmarHorarioSheet';
import { resumenVentanas } from '../../utils/ordenes';
import SalidaTecnicoSheet from './SalidaTecnicoSheet';
import { enviarOEncolar } from '../../utils/pendientesOffline';
import CerrarDiaSheet from './CerrarDiaSheet';
import QueLlevarHoy from './QueLlevarHoy';
import CargaPorSerieSheet from './CargaPorSerieSheet';
import EquiposDeVisita from './EquiposDeVisita';
import { etapaColor, etapaDeEstado, estiloEtiqueta } from '../../utils/estados';
import { PAGINA, PantallaHeader, BotonHerramienta, Herramientas } from '../ui/Pantalla';

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
    CANCELADA:   'var(--etapa-hacer)',
    NO_ATENDIDO: 'var(--alerta)',
};

// El color del boton ya no varia por etapa (antes: azul/ambar/verde) — es
// siempre la misma accion "avanzar el siguiente paso", y la etapa actual ya
// se lee en el borde/dot de la card (BORDER_COLOR). Mismo criterio que se
// aplico a ServicioCard.jsx.
const SIGUIENTE_ESTADO = {
    // Opción 1 de color (3-oct-2026): salir y llegar = azul "en marcha"; cerrar = verde "listo"
    PENDIENTE:  { estado: 'EN_CAMINO', label: 'Salir', bg: 'var(--etapa-marcha)', Icon: LuCar },
    EN_CAMINO:  { estado: 'EN_SITIO',  label: 'Llegué', bg: 'var(--etapa-marcha)', Icon: LuMapPin },
    EN_SITIO:   { estado: 'COMPLETADA', label: 'Completar', bg: 'var(--etapa-listo)', Icon: LuCircleCheck },
};

// Paso atrás por si el técnico tocó la orden equivocada (solo uno, y nunca desde COMPLETADA)
const ESTADO_ANTERIOR = {
    EN_CAMINO: { estado: 'PENDIENTE', label: 'Deshacer "Salí"' },
    EN_SITIO:  { estado: 'EN_CAMINO', label: 'Deshacer "Llegué"' },
};

function OrdenCard({ orden, onAvanzar, onEjecutar, onRegistrarTrabajo, onProblema, onConfirmar, onVerServicio, onHorarioConfirmado, seleccionando, seleccionada, onToggleSel }) {
    const [expandido, setExpandido] = useState(false);
    const [confirmandoHorario, setConfirmandoHorario] = useState(false);
    const [contactando, setContactando] = useState(false);
    const aCoordinar = !!orden.horarioACoordinar;

    const pr  = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const sig = SIGUIENTE_ESTADO[orden.estado];
    const esFinal = orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA';

    // Deslizar la tarjeta (5-oct-2026): → hace el paso que sigue, ← abre el mapa
    const fechaOk = !orden.fechaProgramada || orden.fechaProgramada >= getTodayISO();
    const pideOkVoy = !aCoordinar && orden.estado === 'PENDIENTE' && !orden.confirmadaEn && !!onConfirmar && fechaOk;
    const listo = 'var(--etapa-listo)';
    let derecha = null;
    if (!esFinal && !seleccionando) {
        if (aCoordinar) derecha = { label: 'Confirmar día y hora', color: listo, Icon: LuCircleCheck, accion: () => setConfirmandoHorario(true) };
        else if (orden.estado === 'PENDIENTE' && !orden.confirmadaEn && onConfirmar && fechaOk) derecha = { label: 'Ok, voy', color: listo, Icon: LuCircleCheck, accion: () => onConfirmar(orden) };
        else if (orden.estado === 'EN_SITIO') derecha = { label: 'Cerrar trabajo', color: listo, Icon: LuCircleCheck, accion: () => (orden.presupuestoId ? onEjecutar(orden) : onRegistrarTrabajo(orden)) };
        else if (sig) derecha = { label: sig.label, color: sig.bg, Icon: sig.Icon, accion: () => onAvanzar(orden.id, sig.estado) };
    }
    const izquierda = !esFinal && !seleccionando && orden.direccion
        ? { label: 'Mapa', color: '#3B82F6', Icon: LuMapPin, accion: () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orden.direccion)}`, '_blank') }
        : null;

    return (
        <DeslizarAcciones derecha={derecha} izquierda={izquierda}>
        <div id={`orden-${orden.id}`} className={`rounded-2xl overflow-hidden bg-card border border-black/10 dark:border-white/[0.12] transition-all ${seleccionando && seleccionada ? 'ring-2 ring-brand-red' : ''} ${['EN_CAMINO', 'EN_SITIO'].includes(orden.estado) ? 'shadow-lg' : ''}`}
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
                                <span className="text-label font-black px-2 py-0.5 rounded-md uppercase"
                                    style={etapaDeEstado(orden.estado) ? estiloEtiqueta(etapaDeEstado(orden.estado)) : { background: BORDER_COLOR[orden.estado], color: '#fff' }}>
                                    {ESTADO_LABEL[orden.estado]}
                                </span>
                            )}
                            {orden.estado === 'PENDIENTE' && orden.confirmadaEn && (
                                <span className="text-label font-black px-2 py-0.5 rounded-md bg-chip text-secondary">✓ Confirmada</span>
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
                        {aCoordinar ? <p className="text-body font-black text-ink">A coordinar</p>
                            : orden.horaEstimada ? <p className="text-body font-black text-ink">{orden.horaEstimada}</p>
                            : <p className="text-caption font-bold text-muted">Sin horario</p>}
                        <p className="text-caption text-muted">{fechaAR(orden.fechaProgramada)}</p>
                    </div>
                </div>

                {!esFinal && orden.clienteNombre && !String(orden.titulo || '').includes(orden.clienteNombre) && (
                    <p className="text-body text-secondary font-bold flex items-center gap-1"><LuBuilding2 size={13} />{orden.clienteNombre}</p>
                )}

                {/* Visita de cliente con tarifa mensual: los equipos a atender */}
                {!esFinal && orden.equiposSerie && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {orden.equiposSerie.split(',').filter(Boolean).map(ns => (
                            <span key={ns} className="px-2 py-0.5 rounded-md bg-chip text-label font-black text-ink">{ns}</span>
                        ))}
                    </div>
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
                            className="mt-2 w-full h-11 rounded-xl font-black text-body text-ink bg-card border-2 border-[color:var(--etapa-listo)] active:scale-95">
                            ✓ Confirmar día y hora
                        </button>
                        <p className="mt-1.5 text-caption text-muted">Primero elegí cuándo vas; con eso el admin ya sabe que confirmaste.</p>
                    </div>
                )}
                {contactando && <ContactarClienteSheet orden={orden} onCerrar={() => setContactando(false)} />}
                {confirmandoHorario && (
                    <ConfirmarHorarioSheet
                        servicio={{ id: orden.presupuestoId, ventanasDisponibles: orden.ventanasCliente, clienteNombre: orden.clienteNombre }}
                        onCerrar={() => setConfirmandoHorario(false)}
                        onConfirmado={() => { setConfirmandoHorario(false); onHorarioConfirmado && onHorarioConfirmado(); }}
                    />
                )}

                {!esFinal && <EquiposDeVisita ordenId={orden.id} />}

                {!esFinal && orden.descripcion && (
                    <>
                        <button onClick={() => setExpandido(v => !v)}
                            className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-bold bg-panel text-secondary active:scale-95 transition-all">
                            <span>Instrucciones</span>
                            {expandido ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
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
                    {/* "Ok, voy" (5-oct-2026): el admin ve quién confirmó su visita */}
                    {/* Con fecha "a coordinar" el paso es Confirmar día y hora (arriba): sin "Ok, voy" ni "Salir" (5-oct-2026) */}
                    {/* Un solo botón grande, el paso que sigue: primero "Ok, voy"; recién después "Salir" (5-oct-2026) */}
                    {pideOkVoy && (
                        <button onClick={() => onConfirmar(orden)}
                            className="w-full py-2.5 rounded-xl font-black text-body text-ink bg-card border-2 border-[color:var(--etapa-listo)] active:scale-95 transition-all">
                            ✓ Ok, voy
                        </button>
                    )}
                    {orden.estado === 'EN_SITIO' ? (
                        <>
                            {/* Un solo botón con un solo texto — antes decía "Registrar trabajo"
                                o "Ejecutar trabajo" según un dato invisible (si venía de un
                                presupuesto). Adentro se decide solo qué formulario abrir. */}
                            <button onClick={() => orden.presupuestoId ? onEjecutar(orden) : onRegistrarTrabajo(orden)}
                                style={{ background: 'var(--etapa-listo)' }}
                                className="w-full py-2.5 rounded-xl font-black text-body text-white active:scale-95 transition-all">
                                Cerrar trabajo
                            </button>
                            <p className="text-caption text-center text-muted font-bold">
                                Completá los datos del trabajo para cerrar la orden
                            </p>
                        </>
                    ) : aCoordinar || pideOkVoy ? null : (
                        <button onClick={() => onAvanzar(orden.id, sig.estado)}
                            style={{ background: sig.bg }}
                            className="w-full py-2.5 rounded-xl font-black text-body text-white active:scale-95 transition-all flex items-center justify-center gap-1.5">
                            <sig.Icon size={16} /> {sig.label}
                        </button>
                    )}
                    {/* Todo lo que sale mal, en un solo lugar (4-oct-2026): antes eran
                        3 botones sueltos (no atendió / no puedo ir / volver atrás). */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Contactar al cliente pasa por el admin: el técnico no tiene el teléfono (5-oct-2026) */}
                        <button onClick={() => setContactando(true)}
                            className="py-2 rounded-xl font-bold text-label text-secondary bg-chip active:scale-95 transition-all inline-flex items-center justify-center gap-1.5">
                            <LuMessageSquare size={14} /> Contactar al cliente
                        </button>
                        <button onClick={() => onProblema(orden)}
                            className="py-2 rounded-xl font-bold text-label text-muted bg-chip active:scale-95 transition-all">
                            Hubo un problema
                        </button>
                    </div>
                </div>
            )}
        </div>
        </DeslizarAcciones>
    );
}

export default function MisOrdenes({ tecnicoId, onEjecutarOrden }) {
    const { ordenes, cargando, avanzarEstado, recargar } = useOrdenes({ tecnicoId });
    const tab = 'activas'; // sin pestañas (4-oct-2026): agenda/completadas/rendimiento → "Mi mes"
    const [problema, setProblema] = useState(null); // orden con "Hubo un problema" abierto
    const [diasAbiertos, setDiasAbiertos] = useState(() => new Set());

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
    const [, setCargandoHistorial] = useState(false);

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

    // Llegó tocando una notificación: mostrar y resaltar esa visita (5-oct-2026)
    useEffect(() => {
        const resaltar = () => {
            let id = null;
            try { id = sessionStorage.getItem('resaltarOrden'); } catch { /* */ }
            if (!id) return;
            const o = ordenes.find(x => String(x.id) === id);
            if (!o) return; // todavía no cargó, o ya no está activa
            try { sessionStorage.removeItem('resaltarOrden'); } catch { /* */ }
            if (o.fechaProgramada) setDiasAbiertos(prev => new Set(prev).add(o.fechaProgramada));
            setTimeout(() => {
                const el = document.getElementById(`orden-${id}`);
                if (!el) return;
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-4', 'ring-[#C9341F]');
                setTimeout(() => el.classList.remove('ring-4', 'ring-[#C9341F]'), 2500);
            }, 150);
        };
        resaltar();
        window.addEventListener('resaltar-orden', resaltar);
        return () => window.removeEventListener('resaltar-orden', resaltar);
    }, [ordenes]);

    const [servicioEjecutando, setServicioEjecutando] = useState(null);
    const [ordenEjecutandoId, setOrdenEjecutandoId] = useState(null);
    const [ordenRegistrando, setOrdenRegistrando] = useState(null);
    const [noAtendidoOrden, setNoAtendidoOrden] = useState(null);
    const [cerrarDia, setCerrarDia] = useState(false);
    const [cargaSerie, setCargaSerie] = useState(false);
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

    // La orden se marca COMPLETADA apenas se guarda el trabajo (antes era al tocar
    // "Listo" y si el técnico cerraba la pantalla quedaba abierta).
    const completarOrdenEjecutando = async () => {
        if (!ordenEjecutandoId) return;
        try {
            const r = await enviarOEncolar('patch', `/ordenes/${ordenEjecutandoId}/estado`, { estado: 'COMPLETADA' }, `Visita #${ordenEjecutandoId} → COMPLETADA`);
            if (r.encolado) toast('Sin señal: la visita se marca completada cuando vuelva la conexión', { icon: '📶' });
        } catch (e) {
            const det = e?.response?.data?.mensaje || e?.message || '';
            toast.error(`No se pudo completar la orden${det ? ': ' + det : ''}. Avisá al admin.`);
        }
    };

    // "Ok, voy": el técnico confirma la visita que le asignaron
    const confirmarVisita = async (o) => {
        try {
            await api.patch(`/ordenes/${o.id}/confirmar`);
            toast.success('Listo, el admin ya sabe que vas');
            if (recargar) recargar();
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo confirmar'); }
    };

    const handleConfirmado = () => {
        setServicioEjecutando(null);
        setOrdenEjecutandoId(null);
        if (recargar) recargar();
        cargarHistorial();
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
    const fechaLarga = (() => { const t = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); })();
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



    const pull = usePullToRefresh(() => recargar?.());

    return (
        <>
        <div className={PAGINA} {...pull.handlers}>
            {pull.indicador}
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
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
                    <div className="mb-4">
                        <PantallaHeader subtituloEnCelular titulo="Hoy"
                            subtitulo={`${fechaLarga} · ${activas.length} pendiente${activas.length !== 1 ? 's' : ''}`}>
                            {tab === 'activas' && activas.length > 0 && (
                                <BotonHerramienta icono={LuMapPin} onClick={() => setModoSeleccion(true)} textoEnCelular>Elegir para ruta</BotonHerramienta>
                            )}
                        </PantallaHeader>
                    </div>
                )}

                {/* Resumen del día: siempre a la vista, grande (5-oct-2026) */}
                {tab === 'activas' && (
                    <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
                        {[
                            ['Visitas hoy', ordenesHoy.length, 'text-ink'],
                            ['Listas', completadasHoy.length, 'text-[#16A34A]'],
                            ['Próxima', proxima?.horaEstimada || '—', 'text-brand-amber'],
                        ].map(([l, v, c]) => (
                            <div key={l} className="p-3 md:p-4 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                                <p className="text-label font-black text-muted uppercase tracking-widest">{l}</p>
                                <p className={`mt-1 text-2xl md:text-3xl font-black leading-none ${c}`}>{v}</p>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'activas' && <QueLlevarHoy ordenesHoy={ordenesHoy} />}

                {/* Herramientas del día (5-oct-2026): "Cargar N/S" e "Historial N/S" pasaron
                    al Panel del admin. La carga por N/S se abre sola al cerrar una visita con
                    equipos; el técnico solo trabaja lo que le asignan. */}
                {tab === 'activas' && (
                    <div className="mb-4">
                        <Herramientas>
                            <BotonHerramienta icono={LuMessageSquare} onClick={() => setSalida({ modo: 'mensaje' })} textoEnCelular>Avisar al admin</BotonHerramienta>
                            <BotonHerramienta icono={LuCalendarX} onClick={() => setSalida({ modo: 'hoy' })} textoEnCelular>No puedo trabajar hoy</BotonHerramienta>
                        </Herramientas>
                    </div>
                )}

                {/* Contenido */}
                {cargando ? (
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
                    Object.entries(porFecha).map(([fecha, items]) => {
                        // Hoy y lo atrasado, abierto. Los días que vienen, plegados (4-oct-2026)
                        const futuro = fecha > hoy;
                        const abierto = !futuro || diasAbiertos.has(fecha);
                        return (
                        <div key={fecha} className="mb-5">
                            {futuro ? (
                                <button onClick={() => setDiasAbiertos(prev => { const n = new Set(prev); n.has(fecha) ? n.delete(fecha) : n.add(fecha); return n; })}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-card border border-black/[0.06] dark:border-white/[0.06] mb-2 active:scale-[0.99]">
                                    <span className="text-label font-black text-muted uppercase tracking-wider capitalize">{formatFecha(fecha)}</span>
                                    <span className="text-label font-bold text-secondary inline-flex items-center gap-1">{items.length} visita{items.length !== 1 ? 's' : ''} {abierto ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}</span>
                                </button>
                            ) : (
                                <p className="text-label font-black text-muted uppercase tracking-wider mb-2 capitalize">
                                    {fecha < hoy ? `Atrasada · ${formatFecha(fecha)}` : formatFecha(fecha)}
                                </p>
                            )}
                            {abierto && <div className="space-y-4">
                                {items.map(o => (
                                    <OrdenCard key={o.id} orden={o} onHorarioConfirmado={recargar} onAvanzar={avanzarEstado} onEjecutar={handleEjecutar} onRegistrarTrabajo={(o) => (o.equiposSerie ? setCargaSerie(o) : setOrdenRegistrando(o))} onProblema={setProblema} onConfirmar={confirmarVisita} onVerServicio={verServicio}
                                        seleccionando={modoSeleccion} seleccionada={seleccionados.has(o.id)} onToggleSel={toggleSeleccion} />
                                ))}
                            </div>}
                        </div>
                        );
                    })
                )}

                {/* Cerrar mi día va al final: es lo último que se hace en el día */}
                {tab === 'activas' && !cargando && (
                    <button onClick={() => setCerrarDia(true)}
                        className="mt-2 mx-auto block h-10 px-6 rounded-xl text-label font-bold text-secondary bg-card border border-black/10 dark:border-white/10 active:scale-95">
                        Cerrar mi día
                    </button>
                )}
            </div>
        </div>

        {noAtendidoOrden && (
            <div className="fixed inset-0 z-[3000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6"
                onClick={() => setNoAtendidoOrden(null)}>
                <div className="w-full max-w-md bg-card rounded-t-3xl md:rounded-3xl shadow-2xl p-5 space-y-4"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto bg-chip md:hidden" />
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

        {cargaSerie && <CargaPorSerieSheet orden={cargaSerie === true ? null : cargaSerie}
            onClose={() => setCargaSerie(false)}
            onGuardado={() => {
                // Visita con equipos: al guardar la carga, la visita queda cerrada
                if (cargaSerie !== true) avanzarEstado(cargaSerie.id, 'COMPLETADA');
                cargarHistorial();
            }} />}
        {cerrarDia && (
            <CerrarDiaSheet
                ordenesHoy={[...ordenes, ...historial.filter(h => !ordenes.some(o => o.id === h.id))]
                    .filter(o => o.fechaProgramada === getTodayISO())}
                onClose={() => setCerrarDia(false)} />
        )}

        {problema && (
            <div className="fixed inset-0 z-[3000] flex items-end md:items-center bg-black/50 md:justify-center md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6" onClick={() => setProblema(null)}>
                <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl md:rounded-3xl p-5 pb-8 bg-card space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-chip md:hidden" />
                    <p className="text-body-lg font-black text-ink">¿Qué pasó?</p>
                    <p className="text-caption text-muted mb-2">{problema.clienteNombre || problema.titulo}</p>
                    {(problema.estado === 'EN_CAMINO' || problema.estado === 'EN_SITIO') && (
                        <button onClick={() => { setNoAtendidoOrden(problema); setProblema(null); }}
                            className="w-full p-4 rounded-2xl text-left bg-chip active:scale-[0.98]">
                            <p className="text-body font-black text-ink">El cliente no atendió</p>
                            <p className="text-caption text-muted">Queda registrado y el admin la reprograma</p>
                        </button>
                    )}
                    <button onClick={() => { setSalida({ modo: 'orden', orden: problema }); setProblema(null); }}
                        className="w-full p-4 rounded-2xl text-left bg-chip active:scale-[0.98]">
                        <p className="text-body font-black text-ink">No puedo ir</p>
                        <p className="text-caption text-muted">La visita vuelve al admin para reasignarla</p>
                    </button>
                    <button onClick={() => { setSalida({ modo: 'mensaje', orden: problema }); setProblema(null); }}
                        className="w-full p-4 rounded-2xl text-left bg-chip active:scale-[0.98]">
                        <p className="text-body font-black text-ink">Avisar algo al admin</p>
                        <p className="text-caption text-muted">Falta un repuesto, otro problema, una duda</p>
                    </button>
                    {ESTADO_ANTERIOR[problema.estado] && (
                        <button onClick={() => { avanzarEstado(problema.id, ESTADO_ANTERIOR[problema.estado].estado); setProblema(null); }}
                            className="w-full p-3 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-label text-muted active:opacity-60">
                            <LuUndo2 size={14} /> Me equivoqué: {ESTADO_ANTERIOR[problema.estado].label.toLowerCase()}
                        </button>
                    )}
                </div>
            </div>
        )}

        {servicioEjecutando && (
            <EjecutarOrdenSheet
                servicio={servicioEjecutando}
                onGuardado={completarOrdenEjecutando}
                onConfirmado={handleConfirmado}
                onCerrar={handleConfirmado}
            />
        )}

        {/* Detalle del servicio — link "Ver servicio" desde Completadas (hallazgo 07) */}
        {(cargandoDetalle || servicioDetalle) && (
            <div className="fixed inset-0 z-[3000] flex items-end md:items-center bg-black/50 md:justify-center md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6" onClick={() => setServicioDetalle(null)}>
                <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl md:rounded-3xl p-5 bg-card border-t border-black/[0.05] dark:border-white/[0.05]"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip md:hidden" />
                    {cargandoDetalle ? (
                        <p className="text-center text-muted py-8">Cargando...</p>
                    ) : (
                        <>
                            <h3 className="text-body-lg font-black mb-1 text-ink">
                                Servicio — {servicioDetalle.clienteNombre}
                            </h3>
                            <p className="text-caption text-muted mb-4">#{servicioDetalle.id} · {fechaAR(servicioDetalle.fecha)}</p>
                            <div className="max-h-[calc(var(--vh,1vh)*50)] overflow-y-auto space-y-2 mb-4">
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
