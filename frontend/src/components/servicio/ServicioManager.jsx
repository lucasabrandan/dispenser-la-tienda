import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { LuClipboardList, LuFileText, LuCircleCheck, LuArchive, LuSearch, LuSettings2, LuDownload, LuUpload, LuWrench, LuCopy, LuPencil, LuLayers, LuHourglass, LuCar, LuMapPin, LuUser } from 'react-icons/lu';
import { useServicioManager } from '../../hooks/useServicioManager';
import { useOrdenes } from '../../hooks/useOrdenes';
import { useAuth } from '../../context/AuthContext';
import { exportarServiciosCSV } from '../../utils/exportarCSV';
import { getUsuarios } from '../../services/api';
import api from '../../services/api';
import ServicioForm from '../servicio/ServicioForm';
import ServicioCard from '../servicio/ServicioCard';
import { OrdenCard } from '../ordenes/OrdenCard';
import OrdenForm from '../ordenes/OrdenForm';
import SwipeColumns from '../ui/SwipeColumns';
import Paginacion from '../ui/Paginacion';
import FiltrosPanel from '../ui/FiltrosPanel';
import ModalFirmasPDF from '../ui/ModalFirmasPDF';
import ImportadorServiciosModal from '../servicio/ImportadorServiciosModal';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import EjecutarAdminSheet from '../servicio/EjecutarAdminSheet';
import CobroSheet from '../servicio/CobroSheet';
import DetalleSheet from '../servicio/DetalleSheet';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import ConfirmDialog from '../ui/ConfirmDialog';

// "Presupuestos" (estado PRESUPUESTO) ya no es un tab acá — es la pantalla dedicada del
// sidebar (con Cotizar / Ver ruta), para no mostrar la misma data pendiente en dos lugares.
// Servicio Tecnico arranca directamente en lo que ya esta aprobado / en curso de cobro.
const TABS_SERVICIO = [
    { id: 'PENDIENTE_FACTURACION', label: 'Por cobrar',   short: 'x Cobrar', color: '#8B5CF6', Icon: LuClipboardList },
    { id: 'FACTURADO',             label: 'Facturados',   short: 'Fact.',    color: '#6366F1', Icon: LuFileText },
    { id: 'COBRADO',               label: 'Cobrados',     short: 'Cobrado',  color: '#16A34A', Icon: LuCircleCheck },
    { id: 'ARCHIVADO',             label: 'Archivados',   short: 'Arch.',    color: '#A8A29E', Icon: LuArchive },
    // "Todo" — hub único (ítem 4 paso 3 / ítem 17 opción 3): un solo lugar para ver
    // cualquier servicio técnico sin importar el estado, en vez de ir a buscarlo a Historial.
    { id: 'TODOS',                 label: 'Todo',         short: 'Todo',     color: '#1C1917', Icon: LuLayers },
];

// Tabs de Despacho fusionados acá (paso 3/N del hub — ver TABS_SERVICIO arriba):
// Pendientes/En camino/En sitio comparten pantalla con Servicio Técnico, pero siguen
// leyendo /ordenes (useOrdenes), no /servicios — son dos modelos de datos distintos,
// por eso quedan separados de TABS_SERVICIO en vez de mezclarse en un solo array.
// Solo para admin: los técnicos ya tienen su propia vista de órdenes (Mis Órdenes).
const TABS_ORDEN = [
    { id: 'PENDIENTE', label: 'Pendientes', short: 'Pend.',     color: '#A8A29E', Icon: LuHourglass },
    { id: 'EN_CAMINO', label: 'En camino',  short: 'En camino', color: '#3B82F6', Icon: LuCar },
    { id: 'EN_SITIO',  label: 'En sitio',   short: 'En sitio',  color: '#D48800', Icon: LuMapPin },
];
const TABS_ORDEN_IDS = new Set(TABS_ORDEN.map(t => t.id));

const ESTADO_API_MAP = {
    COBRADO: 'COBRADO,REALIZADO',
};

export default function ServicioManager({
    clienteInicial = null, onClienteConsumido,
    presupuestoOrigen = null, onPresupuestoOrigenConsumido,
    ordenOrigen = null, onOrdenOrigenConsumido,
    abrirCrearDirecto = false, onCrearConsumido,
}) {
    const { esAdmin } = useAuth();
    const {
        cargando, stats,
        modalCrear, setModalCrear,
        servicioEditar,
        modalDetalle, setModalDetalle,
        modalFirmas, setModalFirmas,
        confirmarFirmasYGenerarPDF,
        cargarServicios,
        confirmarServicio,
        archivarServicio, accionMasiva, eliminarServicio,
        generarPDF, calcularTotal, abrirEditar, cerrarModal,
        filtros, usuarioId, setUsuarioId,
        ordenServicio, setOrdenServicio,
    } = useServicioManager();

    const TABS = esAdmin ? [...TABS_ORDEN, ...TABS_SERVICIO] : TABS_SERVICIO;

    // Ordenes (Pendientes/En camino/En sitio) — mismo hook que ya usaba DespachoManager.jsx,
    // deshabilitado para técnicos (enabled: esAdmin) para no pegarle a /ordenes de más.
    const {
        ordenes,
        tecnicos: tecnicosOrden,
        cargando: cargandoOrdenes,
        modalCrear: modalCrearOrden, setModalCrear: setModalCrearOrden,
        ordenEditar, abrirEditar: abrirEditarOrden, cerrarModal: cerrarModalOrden,
        crear: crearOrden, actualizar: actualizarOrden, eliminar: eliminarOrden, avanzarEstado,
    } = useOrdenes({ enabled: esAdmin });

    const [servicioEjecutar, setServicioEjecutar]             = useState(null);
    const [servicioEjecutarSimple, setServicioEjecutarSimple] = useState(null);
    const [servicioDuplicar, setServicioDuplicar]   = useState(null);
    const [modalImportar, setModalImportar]         = useState(false);
    const [confirmEliminar, setConfirmEliminar]     = useState(null);
    const [confirmArchivar, setConfirmArchivar]     = useState(null); // id de servicio, o null
    const [confirmMasivo, setConfirmMasivo]         = useState(null); // 'ARCHIVADO', o null
    const [servicioCobro, setServicioCobro]         = useState(null);
    const [tecnicos, setTecnicos]                   = useState([]);
    const [modoSeleccion, setModoSeleccion]         = useState(false);
    const [seleccionados, setSeleccionados]         = useState(new Set());
    const [mostrarFiltros, setMostrarFiltros]       = useState(false);
    const [mostrarBusqueda, setMostrarBusqueda]     = useState(false);
    const [menuOverflow, setMenuOverflow]           = useState(false);
    const [tabCounts, setTabCounts]                 = useState({});
    const [tabAntesBusqueda, setTabAntesBusqueda]   = useState(null);

    // tabActual vive en estado propio (no en filtros.estado): los 3 tabs de Orden
    // (Pendientes/En camino/En sitio) no son estados válidos para /servicios, así que
    // filtros.estado solo se actualiza cuando el tab activo es de tipo Servicio — evita
    // que useServicioManager dispare un fetch con un estado que el backend no reconoce.
    const [tabActual, setTabActual] = useState('PENDIENTE_FACTURACION');
    const esTabOrden = (id) => TABS_ORDEN_IDS.has(id);
    const esTabOrdenActual = esTabOrden(tabActual);
    const enBusquedaGlobal = tabActual === 'TODOS' && !!filtros.busqueda;

    // Auto-switch a TODOS cuando se escribe búsqueda, volver al tab anterior al borrar
    useEffect(() => {
        if (filtros.busqueda && tabActual !== 'TODOS') {
            setTabAntesBusqueda(tabActual);
            setTabActual('TODOS');
            filtros.setEstado('TODOS');
        } else if (!filtros.busqueda && tabActual === 'TODOS' && tabAntesBusqueda) {
            setTabActual(tabAntesBusqueda);
            if (!esTabOrden(tabAntesBusqueda)) filtros.setEstado(tabAntesBusqueda);
            setTabAntesBusqueda(null);
        }
    }, [filtros.busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cargar conteos por estado (para las SwipeColumns) — solo tabs de Servicio;
    // los de Orden (Pendientes/En camino/En sitio) se cuentan abajo con ordenCounts,
    // a partir de la misma lista que ya trae useOrdenes (sin pegarle de nuevo a la API).
    const fetchTabCounts = useCallback(async () => {
        try {
            const results = await Promise.all(
                TABS_SERVICIO.map(t => api.get('/servicios', {
                    params: {
                        tipo: 'TECNICA', page: 0, size: 1,
                        // "Todo" no filtra por estado — cuenta todos los servicios técnicos
                        ...(t.id !== 'TODOS' ? { estado: ESTADO_API_MAP[t.id] || t.id } : {}),
                    }
                }).catch(() => ({ data: { totalElements: 0 } })))
            );
            const counts = {};
            TABS_SERVICIO.forEach((t, i) => { counts[t.id] = results[i].data.totalElements || 0; });
            setTabCounts(counts);
        } catch (err) { console.warn('Servicios: error cargando conteos tabs', err); }
    }, []);

    useEffect(() => { fetchTabCounts(); }, [fetchTabCounts]);

    // Actualizar count del tab activo cuando cambian los items (solo tabs de Servicio)
    useEffect(() => {
        if (!esTabOrdenActual) {
            setTabCounts(prev => ({ ...prev, [tabActual]: filtros.totalItems }));
        }
    }, [filtros.totalItems, tabActual]); // eslint-disable-line react-hooks/exhaustive-deps

    // Conteos de los tabs de Orden — reactivos, calculados en el cliente igual que
    // ya hacía DespachoManager.jsx (counts), no hay un endpoint de conteo por estado.
    const ordenCounts = useMemo(() => ({
        PENDIENTE: ordenes.filter(o => o.estado === 'PENDIENTE').length,
        EN_CAMINO: ordenes.filter(o => o.estado === 'EN_CAMINO').length,
        EN_SITIO:  ordenes.filter(o => o.estado === 'EN_SITIO').length,
    }), [ordenes]);

    // Agrupado por técnico para el tab de Orden activo — mismo patrón que
    // DespachoManager.jsx (grupos/activasPorTecnico), acá acotado al tab activo.
    const ordenesDelTabActual = useMemo(
        () => ordenes.filter(o => o.estado === tabActual),
        [ordenes, tabActual]
    );
    const gruposOrdenes = useMemo(() => ordenesDelTabActual.reduce((acc, o) => {
        const key = `${o.tecnicoId}__${o.tecnicoNombre}`;
        (acc[key] = acc[key] || []).push(o);
        return acc;
    }, {}), [ordenesDelTabActual]);
    const activasPorTecnico = useMemo(() => ordenes.reduce((acc, o) => {
        if (!['COMPLETADA', 'CANCELADA', 'NO_ATENDIDO'].includes(o.estado)) {
            acc[o.tecnicoId] = (acc[o.tecnicoId] || 0) + 1;
        }
        return acc;
    }, {}), [ordenes]);

    // Long-press para selección masiva
    const longPressRef = React.useRef(null);
    const iniciarLongPress = (id) => {
        longPressRef.current = setTimeout(() => {
            setModoSeleccion(true);
            setSeleccionados(new Set([id]));
        }, 500);
    };
    const cancelarLongPress = () => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
    };

    const cambiarTab = (id) => {
        // Si toca un tab específico estando en búsqueda global, limpiar búsqueda
        if (id !== 'TODOS' && enBusquedaGlobal) {
            filtros.setBusqueda('');
            setTabAntesBusqueda(null);
        }
        setTabActual(id);
        // Los tabs de Orden (Pendientes/En camino/En sitio) no son estados válidos
        // para /servicios — no tocar filtros.estado, que sigue en el último tab
        // de Servicio visitado (fetch de fondo inofensivo, no se muestra).
        if (!esTabOrden(id)) filtros.setEstado(id);
        setModoSeleccion(false);
        setSeleccionados(new Set());
    };

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const ejecutarMasiva = async (accion) => {
        setConfirmMasivo(null);
        await accionMasiva([...seleccionados], accion);
        setSeleccionados(new Set());
        setModoSeleccion(false);
        fetchTabCounts();
    };

    // Tab de Orden activo → el botón "+ Nuevo"/FAB crea una Orden, no un Servicio.
    const abrirCrear = () => { if (esTabOrdenActual) setModalCrearOrden(true); else setModalCrear(true); };

    const [servicioEjecutarAdmin, setServicioEjecutarAdmin] = useState(null);
    const abrirEjecutar = (s) => {
        if (esAdmin) setServicioEjecutarAdmin(s);
        else         setServicioEjecutarSimple(s);
    };
    const abrirEditarCompleto = () => {
        const s = servicioEjecutarAdmin;
        setServicioEjecutarAdmin(null);
        setServicioEjecutar(s);
        setModalCrear(true);
    };
    const cerrarModalCompleto = () => { cerrarModal(); setServicioEjecutar(null); setServicioDuplicar(null); };

    const duplicarServicio = (s) => {
        const copia = {
            ...s, id: undefined, estado: 'PRESUPUESTO', nroDocumento: undefined,
            fecha: new Date().toISOString().slice(0, 10),
            presupuestoOrigenId: undefined, ordenId: undefined,
        };
        setServicioDuplicar(copia);
        setModalCrear(true);
    };

    // Refrescar conteos al confirmar/eliminar
    const confirmarConRefresh = async (...args) => {
        await confirmarServicio(...args);
        fetchTabCounts();
    };

    useEffect(() => { if (esAdmin) getUsuarios().then(r => setTecnicos(r.data)).catch(() => {}); }, [esAdmin]);
    useEffect(() => { if (clienteInicial)    setModalCrear(true); }, [clienteInicial]);
    useEffect(() => { if (presupuestoOrigen) setModalCrear(true); }, [presupuestoOrigen]);
    useEffect(() => { if (ordenOrigen)       setModalCrear(true); }, [ordenOrigen]);
    useEffect(() => { if (abrirCrearDirecto) { setModalCrear(true); onCrearConsumido?.(); } }, [abrirCrearDirecto]); // eslint-disable-line

    // Swipe en contenido para cambiar tab
    const columnIds = TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(columnIds, tabActual, cambiarTab);

    // Columnas para SwipeColumns — "Todo" ya es un tab fijo más (ver TABS arriba), no hace
    // falta inyectarlo aparte cuando hay búsqueda activa (antes se armaba un "Todos" sintético
    // con ícono de lupa solo mientras se buscaba; ahora el auto-switch a TODOS en cambiarTab/
    // el useEffect de más arriba simplemente resalta este mismo tab). Los 3 tabs de Orden
    // fusionados desde Despacho toman su conteo de ordenCounts, no de tabCounts (API distinta).
    const columns = TABS.map(t => ({
        id: t.id,
        label: t.short,
        fullLabel: t.label,
        count: TABS_ORDEN_IDS.has(t.id) ? (ordenCounts[t.id] ?? null) : (tabCounts[t.id] ?? null),
        color: t.color,
        Icon: t.Icon,
    }));

    return (
        <div className="min-h-screen pb-28 font-sans bg-page transition-colors"
            {...swipeHandlers}>

            {/* ═══ HEADER ═══ */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    {/* Desktop: título */}
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink mb-2.5">
                        Servicio Técnico
                    </h2>

                    {/* Barra de acciones */}
                    <div className="flex items-center gap-1.5">
                        {/* Búsqueda — mobile: toggle, desktop: siempre visible */}
                        <button onClick={() => setMostrarBusqueda(v => !v)}
                            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${mostrarBusqueda || filtros.busqueda ? 'bg-brand-red text-white' : 'bg-white dark:bg-[#2E2E2E] text-muted'}`}>
                            <LuSearch size={15} />
                        </button>
                        <div className={`${mostrarBusqueda ? 'flex' : 'hidden'} md:flex relative flex-1`}>
                            <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input
                                value={filtros.busqueda}
                                onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, S/N, ubicación..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-white dark:bg-[#2E2E2E] text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                                autoFocus={mostrarBusqueda}
                            />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-label font-bold">✕</button>
                            )}
                        </div>

                        {/* Filtros toggle */}
                        <button onClick={() => setMostrarFiltros(v => !v)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] text-sm ${mostrarFiltros ? 'bg-brand-red text-white' : 'bg-white dark:bg-[#2E2E2E] text-muted'}`}>
                            <LuSettings2 size={15} />
                        </button>

                        {/* Menú overflow */}
                        <div className="relative">
                            <button onClick={() => setMenuOverflow(v => !v)}
                                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                                ⋯
                            </button>
                            {menuOverflow && (
                                <>
                                    <div className="fixed inset-0 bg-black/40 z-[60] md:bg-transparent" onClick={() => setMenuOverflow(false)} />
                                    {/* Mobile: bottom-sheet, Desktop: dropdown */}
                                    <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl p-2 pb-6 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bottom-auto md:rounded-xl md:p-0 md:py-1.5 md:w-52 bg-white dark:bg-[#242424] shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08] md:border">
                                        <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-chip md:hidden" />
                                        <button onClick={() => { exportarServiciosCSV(filtros.itemsFiltrados); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-body-lg md:text-body font-bold text-ink hover:bg-[#F5F3F1] dark:hover:bg-[#2E2E2E] active:bg-[#E8E5E0] rounded-xl md:rounded-none flex items-center gap-2.5">
                                            <LuDownload size={15} /> Exportar CSV
                                        </button>
                                        <button onClick={() => { setModalImportar(true); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-body-lg md:text-body font-bold text-ink hover:bg-[#F5F3F1] dark:hover:bg-[#2E2E2E] active:bg-[#E8E5E0] rounded-xl md:rounded-none flex items-center gap-2.5">
                                            <LuUpload size={15} /> Importar históricos
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {esAdmin && (
                            <button onClick={abrirCrear}
                                className="hidden md:flex h-9 px-4 rounded-lg font-bold text-label text-white uppercase items-center transition-all active:scale-95 bg-brand-red shrink-0">
                                + Nuevo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* ═══ SWIPE COLUMNS (mobile) / PIPELINE TABS (desktop) ═══ */}
                <SwipeColumns columns={columns} activeId={tabActual} onChangeColumn={cambiarTab} />

                {/* ═══ FILTROS COLAPSABLES ═══ (no aplica a los tabs de Orden — período/orden
                    de Servicio no tienen sentido ahí; fecha/técnico de Orden queda para más
                    adelante) */}
                {mostrarFiltros && !esTabOrdenActual && (
                    <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        {/* Período + rango — mismo componente que ya usan Historial y
                            Presupuestos, en vez de reimplementarlo acá aparte. */}
                        <FiltrosPanel hook={filtros} estados={[]} conBusqueda={false} conRango />
                        {esAdmin && tecnicos.length > 0 && (
                            <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
                                className="w-full h-8 px-2 rounded-lg text-label font-bold outline-none bg-panel text-ink border border-black/[0.05] dark:border-white/[0.05]">
                                <option value="">Todos los técnicos</option>
                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-label font-bold text-muted uppercase shrink-0">Orden</span>
                            <select value={ordenServicio} onChange={e => setOrdenServicio(e.target.value)}
                                className="flex-1 h-8 px-2 rounded-lg text-label font-bold outline-none bg-panel text-ink border border-black/[0.05] dark:border-white/[0.05]">
                                <option value="fechaServicio,desc">Más reciente primero</option>
                                <option value="fechaServicio,asc">Más antiguo primero</option>
                                <option value="total,desc">Mayor monto primero</option>
                                <option value="total,asc">Menor monto primero</option>
                            </select>
                        </div>
                        <p className="text-caption text-center text-muted font-bold">{filtros.totalItems} resultados</p>
                    </div>
                )}

                {/* ═══ SELECCIÓN MASIVA ═══ (solo Servicio — selección masiva de Ordenes
                    queda en Despacho por ahora) */}
                {modoSeleccion && !esTabOrdenActual && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <span className="text-caption font-bold text-ink flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        {seleccionados.size > 0 && tabActual !== 'ARCHIVADO' && (
                            <button onClick={() => setConfirmMasivo('ARCHIVADO')}
                                className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95">
                                Archivar
                            </button>
                        )}
                        {seleccionados.size > 0 && esAdmin && (
                            <button onClick={() => setConfirmEliminar({ ids: [...seleccionados], modo: 'masivo' })}
                                className="h-7 px-3 rounded-lg font-bold text-label text-brand-red active:scale-95">
                                Eliminar
                            </button>
                        )}
                        <button onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
                            className="h-7 px-3 rounded-lg font-bold text-label text-muted active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ═══ LISTA ═══ */}
                {esTabOrdenActual ? (
                    cargandoOrdenes ? (
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-card" />)}
                        </div>
                    ) : Object.keys(gruposOrdenes).length === 0 ? (
                        <div className="text-center py-16 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                            {(() => { const EmptyIcon = TABS_ORDEN.find(t => t.id === tabActual)?.Icon || LuClipboardList; return <EmptyIcon size={32} className="mb-2 text-muted inline-block" />; })()}
                            <p className="text-body font-bold text-muted">Sin {TABS_ORDEN.find(t => t.id === tabActual)?.label?.toLowerCase()}</p>
                        </div>
                    ) : (
                        Object.entries(gruposOrdenes).map(([key, items]) => {
                            const [tecId, nombre] = key.split('__');
                            const activas = activasPorTecnico[tecId] || 0;
                            return (
                                <div key={key} className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-label font-black text-ink uppercase tracking-wider flex items-center gap-1">
                                            <LuUser size={12} /> {nombre}
                                        </p>
                                        {activas > 0 && (
                                            <span className="text-label font-black px-2 py-0.5 rounded-full bg-brand-red text-white">
                                                {activas} activa{activas > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {items.map(o => (
                                            <OrdenCard key={o.id} orden={o}
                                                onEditar={abrirEditarOrden}
                                                onEliminar={eliminarOrden}
                                                onAvanzar={avanzarEstado}
                                                seleccionando={false}
                                                seleccionada={false}
                                                onToggleSel={() => {}} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : cargando ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 rounded-2xl animate-pulse bg-card" />
                        ))}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        {(() => { const EmptyIcon = TABS.find(t => t.id === tabActual)?.Icon || LuClipboardList; return <EmptyIcon size={32} className="mb-2 text-muted inline-block" />; })()}
                        <p className="text-body font-bold text-muted">Sin {TABS.find(t => t.id === tabActual)?.label?.toLowerCase() || 'resultados'}</p>
                        <p className="text-caption text-muted mt-1">Deslizá para ver otros estados</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtros.itemsPagina.map(s => (
                            <div key={s.id}
                                onTouchStart={() => iniciarLongPress(s.id)}
                                onTouchEnd={cancelarLongPress}
                                onTouchMove={cancelarLongPress}
                                onMouseDown={() => iniciarLongPress(s.id)}
                                onMouseUp={cancelarLongPress}
                                onMouseLeave={cancelarLongPress}
                            >
                            <ServicioCard servicio={s}
                                modoSeleccion={modoSeleccion}
                                seleccionado={seleccionados.has(s.id)}
                                onToggleSelect={toggleSeleccion}
                                onEditar={esAdmin ? abrirEditar : null}
                                onEjecutar={abrirEjecutar}
                                onCobrar={confirmarConRefresh}
                                onDuplicar={esAdmin ? duplicarServicio : null}
                                onArchivar={setConfirmArchivar}
                                onEliminar={esAdmin ? (id) => setConfirmEliminar({ ids: [id], modo: 'uno' }) : null}
                                onGenerarPDF={generarPDF}
                                onDetalle={setModalDetalle}
                                calcularTotal={calcularTotal}
                                onAbrirCobro={esAdmin ? setServicioCobro : null}
                            />
                            </div>
                        ))}
                    </div>
                )}

                {!esTabOrdenActual && (
                    <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
                )}
            </div>

            {/* FAB — solo mobile, solo admin */}
            {esAdmin && (
                <button
                    onClick={abrirCrear}
                    className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-brand-red active:scale-90 transition-all z-20"
                    aria-label="Nuevo servicio"
                >+</button>
            )}

            {/* ═══ MODALES ═══ */}

            {modalCrear && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/55">
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-[#FFFFFF] dark:bg-[#141414]">
                        <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 z-20 bg-[#FFFFFF] dark:bg-[#141414]">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-panel border-b border-black/[0.08]">
                            <div>
                                <h3 className="text-title font-black text-ink">
                                    {servicioEjecutar ? (<><LuWrench size={16} className="inline -mt-1 mr-1" /> Ejecutar Trabajo</>) : servicioDuplicar ? (<><LuCopy size={16} className="inline -mt-1 mr-1" /> Duplicar Presupuesto</>) : servicioEditar ? (<><LuPencil size={16} className="inline -mt-1 mr-1" /> Editar Presupuesto</>) : (<><LuWrench size={16} className="inline -mt-1 mr-1" /> Nuevo Servicio</>)}
                                </h3>
                                <p className="text-caption text-muted mt-0.5">
                                    {servicioEjecutar
                                        ? `Ppto #${servicioEjecutar.id} · modificá y confirmá`
                                        : servicioDuplicar
                                            ? 'Copia del servicio anterior · ajustá y guardá'
                                            : servicioEditar
                                                ? `Presupuesto #${servicioEditar.id}`
                                                : 'Cargá el trabajo a realizar'}
                                </p>
                            </div>
                            <button onClick={cerrarModalCompleto}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">✕</button>
                        </div>
                        <ServicioForm
                            onSaved={() => {
                                cerrarModalCompleto();
                                cargarServicios();
                                fetchTabCounts();
                                if (onClienteConsumido) onClienteConsumido();
                                if (onPresupuestoOrigenConsumido) onPresupuestoOrigenConsumido();
                                if (onOrdenOrigenConsumido) onOrdenOrigenConsumido();
                            }}
                            servicioParaEditar={servicioEditar || servicioEjecutar || servicioDuplicar}
                            clienteInicialId={clienteInicial?.id}
                            presupuestoOrigen={presupuestoOrigen}
                            ordenOrigen={ordenOrigen}
                            modoEjecucion={!!servicioEjecutar}
                        />
                    </div>
                </div>
            )}

            {(modalCrearOrden || ordenEditar) && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-card rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="md:hidden flex justify-center -mt-2 mb-4">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <h2 className="text-body-lg font-black text-ink mb-5">
                            {ordenEditar ? 'Editar orden' : 'Nueva orden'}
                        </h2>
                        <OrdenForm
                            orden={ordenEditar}
                            tecnicos={tecnicosOrden}
                            onGuardar={ordenEditar ? (f) => actualizarOrden(ordenEditar.id, f) : crearOrden}
                            onCancelar={cerrarModalOrden} />
                    </div>
                </div>
            )}

            {modalDetalle && (
                <DetalleSheet servicio={modalDetalle} onCerrar={() => setModalDetalle(null)} />
            )}

            {modalFirmas && (
                <ModalFirmasPDF onConfirm={confirmarFirmasYGenerarPDF} onCancel={() => setModalFirmas(false)} />
            )}

            {servicioEjecutarSimple && (
                <EjecutarOrdenSheet
                    servicio={servicioEjecutarSimple}
                    onConfirmado={() => { setServicioEjecutarSimple(null); cargarServicios(); fetchTabCounts(); }}
                    onCerrar={() => setServicioEjecutarSimple(null)}
                />
            )}

            {servicioEjecutarAdmin && (
                <EjecutarAdminSheet
                    servicio={servicioEjecutarAdmin}
                    calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        await confirmarConRefresh(servicioEjecutarAdmin.id, estadoDestino, extras);
                        setServicioEjecutarAdmin(null);
                    }}
                    onEditarCompleto={abrirEditarCompleto}
                    onCerrar={() => setServicioEjecutarAdmin(null)}
                />
            )}

            {modalImportar && (
                <ImportadorServiciosModal
                    onCerrar={() => setModalImportar(false)}
                    onImportado={() => { filtros.cargar?.(); fetchTabCounts(); }}
                />
            )}

            {servicioCobro && (
                <CobroSheet
                    servicio={servicioCobro}
                    calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        await confirmarConRefresh(servicioCobro.id, estadoDestino, extras);
                        setServicioCobro(null);
                    }}
                    onCerrar={() => setServicioCobro(null)}
                />
            )}

            {confirmEliminar && (
                <ConfirmDialog
                    titulo={`Eliminar ${confirmEliminar.ids.length > 1 ? `${confirmEliminar.ids.length} servicios` : 'servicio'}`}
                    mensaje="Esta acción no se puede deshacer. Se eliminarán permanentemente el servicio, todos sus ítems, repuestos usados y registros asociados."
                    textoConfirmar="Sí, eliminar"
                    onCancelar={() => setConfirmEliminar(null)}
                    onConfirmar={async () => {
                        const ids = confirmEliminar.ids;
                        setConfirmEliminar(null);
                        setSeleccionados(new Set());
                        setModoSeleccion(false);
                        await Promise.all(ids.map(id => eliminarServicio(id)));
                        fetchTabCounts();
                    }}
                />
            )}

            {confirmArchivar && (
                <ConfirmDialog
                    titulo="Archivar servicio"
                    mensaje="Quedará en la pestaña Archivados."
                    textoConfirmar="Sí, archivar"
                    onCancelar={() => setConfirmArchivar(null)}
                    onConfirmar={async () => {
                        const id = confirmArchivar;
                        setConfirmArchivar(null);
                        await archivarServicio(id);
                    }}
                />
            )}

            {confirmMasivo && (
                <ConfirmDialog
                    titulo={`Archivar ${seleccionados.size} servicio${seleccionados.size !== 1 ? 's' : ''}`}
                    textoConfirmar="Sí, archivar"
                    onCancelar={() => setConfirmMasivo(null)}
                    onConfirmar={() => ejecutarMasiva(confirmMasivo)}
                />
            )}
        </div>
    );
}
