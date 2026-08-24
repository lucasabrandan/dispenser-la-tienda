import React, { useEffect, useState, useCallback } from 'react';
import { useServicioManager } from '../../hooks/useServicioManager';
import { useAuth } from '../../context/AuthContext';
import { exportarServiciosCSV } from '../../utils/exportarCSV';
import { getUsuarios } from '../../services/api';
import api from '../../services/api';
import ServicioForm from '../servicio/ServicioForm';
import ServicioCard from '../servicio/ServicioCard';
import SwipeColumns from '../ui/SwipeColumns';
import Paginacion from '../ui/Paginacion';
import ModalFirmasPDF from '../ui/ModalFirmasPDF';
import ImportadorServiciosModal from '../servicio/ImportadorServiciosModal';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';
import EjecutarAdminSheet from '../servicio/EjecutarAdminSheet';
import CobroSheet from '../servicio/CobroSheet';
import DetalleSheet from '../servicio/DetalleSheet';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import DateInput from '../ui/DateInput';

// "Presupuestos" (estado PRESUPUESTO) ya no es un tab acá — es la pantalla dedicada del
// sidebar (con Cotizar / Ver ruta), para no mostrar la misma data pendiente en dos lugares.
// Servicio Tecnico arranca directamente en lo que ya esta aprobado / en curso de cobro.
const TABS = [
    { id: 'PENDIENTE_FACTURACION', label: 'Por cobrar',   short: 'x Cobrar', color: '#8B5CF6', icon: '📋' },
    { id: 'FACTURADO',             label: 'Facturados',   short: 'Fact.',    color: '#6366F1', icon: '📄' },
    { id: 'COBRADO',               label: 'Cobrados',     short: 'Cobrado',  color: '#16A34A', icon: '✅' },
    { id: 'ARCHIVADO',             label: 'Archivados',   short: 'Arch.',    color: '#A8A29E', icon: '🗄️' },
];

const PERIODOS = [
    { id: 'MES',     label: 'Este mes'  },
    { id: 'MES_ANT', label: 'Mes ant.'  },
    { id: 'ANO',     label: 'Este año'  },
    { id: 'TODO',    label: 'Todo'      },
];

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

    const [servicioEjecutar, setServicioEjecutar]             = useState(null);
    const [servicioEjecutarSimple, setServicioEjecutarSimple] = useState(null);
    const [servicioDuplicar, setServicioDuplicar]   = useState(null);
    const [modalImportar, setModalImportar]         = useState(false);
    const [confirmEliminar, setConfirmEliminar]     = useState(null);
    const [servicioCobro, setServicioCobro]         = useState(null);
    const [tecnicos, setTecnicos]                   = useState([]);
    const [modoSeleccion, setModoSeleccion]         = useState(false);
    const [seleccionados, setSeleccionados]         = useState(new Set());
    const [mostrarFiltros, setMostrarFiltros]       = useState(false);
    const [mostrarBusqueda, setMostrarBusqueda]     = useState(false);
    const [menuOverflow, setMenuOverflow]           = useState(false);
    const [tabCounts, setTabCounts]                 = useState({});
    const [tabAntesBusqueda, setTabAntesBusqueda]   = useState(null);

    const tabActual = filtros.estado || 'PENDIENTE_FACTURACION';
    const enBusquedaGlobal = tabActual === 'TODOS' && !!filtros.busqueda;

    // Auto-switch a TODOS cuando se escribe búsqueda, volver al tab anterior al borrar
    useEffect(() => {
        if (filtros.busqueda && tabActual !== 'TODOS') {
            setTabAntesBusqueda(tabActual);
            filtros.setEstado('TODOS');
        } else if (!filtros.busqueda && tabActual === 'TODOS' && tabAntesBusqueda) {
            filtros.setEstado(tabAntesBusqueda);
            setTabAntesBusqueda(null);
        }
    }, [filtros.busqueda]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cargar conteos por estado (para las SwipeColumns)
    const fetchTabCounts = useCallback(async () => {
        try {
            const results = await Promise.all(
                TABS.map(t => api.get('/servicios', {
                    params: { tipo: 'TECNICA', estado: ESTADO_API_MAP[t.id] || t.id, page: 0, size: 1 }
                }).catch(() => ({ data: { totalElements: 0 } })))
            );
            const counts = {};
            TABS.forEach((t, i) => { counts[t.id] = results[i].data.totalElements || 0; });
            setTabCounts(counts);
        } catch (err) { console.warn('Servicios: error cargando conteos tabs', err); }
    }, []);

    useEffect(() => { fetchTabCounts(); }, [fetchTabCounts]);

    // Actualizar count del tab activo cuando cambian los items
    useEffect(() => {
        setTabCounts(prev => ({ ...prev, [tabActual]: filtros.totalItems }));
    }, [filtros.totalItems, tabActual]);

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
        filtros.setEstado(id);
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
        await accionMasiva([...seleccionados], accion);
        setSeleccionados(new Set());
        setModoSeleccion(false);
        fetchTabCounts();
    };

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
    const columnIds = enBusquedaGlobal ? ['TODOS', ...TABS.map(t => t.id)] : TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(columnIds, tabActual, cambiarTab);

    // Columnas para SwipeColumns — agrega "Todos" cuando hay búsqueda
    const columns = [
        ...(enBusquedaGlobal ? [{
            id: 'TODOS', label: 'Todos', fullLabel: 'Todos', color: '#1C1917',
            count: filtros.totalItems, icon: '🔍',
        }] : []),
        ...TABS.map(t => ({
            id: t.id,
            label: t.short,
            fullLabel: t.label,
            count: tabCounts[t.id] ?? null,
            color: t.color,
            icon: t.icon,
        })),
    ];

    return (
        <div className="min-h-screen pb-28 font-sans bg-[#F5F3F1] dark:bg-[#141414] transition-colors"
            {...swipeHandlers}>

            {/* ═══ HEADER ═══ */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    {/* Desktop: título */}
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9] mb-2.5">
                        Servicio Técnico
                    </h2>

                    {/* Barra de acciones */}
                    <div className="flex items-center gap-1.5">
                        {/* Búsqueda — mobile: toggle, desktop: siempre visible */}
                        <button onClick={() => setMostrarBusqueda(v => !v)}
                            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${mostrarBusqueda || filtros.busqueda ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                            🔍
                        </button>
                        <div className={`${mostrarBusqueda ? 'flex' : 'hidden'} md:flex relative flex-1`}>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input
                                value={filtros.busqueda}
                                onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, S/N, ubicación..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                                autoFocus={mostrarBusqueda}
                            />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                            )}
                        </div>

                        {/* Filtros toggle */}
                        <button onClick={() => setMostrarFiltros(v => !v)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] text-sm ${mostrarFiltros ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                            ⚙
                        </button>

                        {/* Menú overflow */}
                        <div className="relative">
                            <button onClick={() => setMenuOverflow(v => !v)}
                                className="h-9 w-9 rounded-lg flex items-center justify-center text-[#A8A29E] bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                                ⋯
                            </button>
                            {menuOverflow && (
                                <>
                                    <div className="fixed inset-0 bg-black/40 z-[60] md:bg-transparent" onClick={() => setMenuOverflow(false)} />
                                    {/* Mobile: bottom-sheet, Desktop: dropdown */}
                                    <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl p-2 pb-6 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bottom-auto md:rounded-xl md:p-0 md:py-1.5 md:w-52 bg-white dark:bg-[#242424] shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08] md:border">
                                        <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-[#E8E5E0] dark:bg-[#2E2E2E] md:hidden" />
                                        <button onClick={() => { exportarServiciosCSV(filtros.itemsFiltrados); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-[14px] md:text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#F5F3F1] dark:hover:bg-[#2E2E2E] active:bg-[#E8E5E0] rounded-xl md:rounded-none">
                                            📥 Exportar CSV
                                        </button>
                                        <button onClick={() => { setModalImportar(true); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-[14px] md:text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#F5F3F1] dark:hover:bg-[#2E2E2E] active:bg-[#E8E5E0] rounded-xl md:rounded-none">
                                            📤 Importar históricos
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {esAdmin && (
                            <button onClick={() => setModalCrear(true)}
                                className="hidden md:flex h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase items-center transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] shrink-0">
                                + Nuevo
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* ═══ SWIPE COLUMNS (mobile) / PIPELINE TABS (desktop) ═══ */}
                <SwipeColumns columns={columns} activeId={tabActual} onChangeColumn={cambiarTab} />

                {/* ═══ FILTROS COLAPSABLES ═══ */}
                {mostrarFiltros && (
                    <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                            {PERIODOS.map(p => (
                                <button key={p.id}
                                    onClick={() => filtros.aplicarRapido(p.id)}
                                    className={`shrink-0 h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${filtros.periodoRapido === p.id ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]'}`}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center">
                            <DateInput value={filtros.desde}
                                onChange={v => filtros.aplicarRango(v, filtros.hasta)}
                                className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]" />
                            <span className="text-[10px] text-[#A8A29E]">a</span>
                            <DateInput value={filtros.hasta}
                                onChange={v => filtros.aplicarRango(filtros.desde, v)}
                                className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]" />
                        </div>
                        {esAdmin && tecnicos.length > 0 && (
                            <select value={usuarioId} onChange={e => setUsuarioId(e.target.value)}
                                className="w-full h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]">
                                <option value="">Todos los técnicos</option>
                                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#A8A29E] uppercase shrink-0">Orden</span>
                            <select value={ordenServicio} onChange={e => setOrdenServicio(e.target.value)}
                                className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]">
                                <option value="fechaServicio,desc">Más reciente primero</option>
                                <option value="fechaServicio,asc">Más antiguo primero</option>
                                <option value="total,desc">Mayor monto primero</option>
                                <option value="total,asc">Menor monto primero</option>
                            </select>
                        </div>
                        <p className="text-[10px] text-center text-[#A8A29E] font-bold">{filtros.totalItems} resultados</p>
                    </div>
                )}

                {/* ═══ SELECCIÓN MASIVA ═══ */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        {seleccionados.size > 0 && tabActual !== 'ARCHIVADO' && (
                            <button onClick={() => ejecutarMasiva('ARCHIVADO')}
                                className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                Archivar
                            </button>
                        )}
                        {seleccionados.size > 0 && esAdmin && (
                            <button onClick={() => setConfirmEliminar({ ids: [...seleccionados], modo: 'masivo' })}
                                className="h-7 px-3 rounded-lg font-bold text-[10px] text-[#D13A28] dark:text-[#E8422F] active:scale-95">
                                Eliminar
                            </button>
                        )}
                        <button onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] text-[#A8A29E] active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ═══ LISTA ═══ */}
                {cargando ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 rounded-2xl animate-pulse bg-[#FFFFFF] dark:bg-[#242424]" />
                        ))}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-3xl mb-2">{TABS.find(t => t.id === tabActual)?.icon || '📋'}</p>
                        <p className="text-[13px] font-bold text-[#A8A29E]">Sin {TABS.find(t => t.id === tabActual)?.label?.toLowerCase() || 'resultados'}</p>
                        <p className="text-[11px] text-[#A8A29E] mt-1">Deslizá para ver otros estados</p>
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
                                onArchivar={archivarServicio}
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

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {/* FAB — solo mobile, solo admin */}
            {esAdmin && (
                <button
                    onClick={() => setModalCrear(true)}
                    className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-90 transition-all z-20"
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
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    {servicioEjecutar ? '🔧 Ejecutar Trabajo' : servicioDuplicar ? '⧉ Duplicar Presupuesto' : servicioEditar ? '✏️ Editar Presupuesto' : '🔧 Nuevo Servicio'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
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
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90">✕</button>
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
                <>
                    <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-5">
                                <p className="text-[36px] mb-2">⚠️</p>
                                <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">
                                    Eliminar {confirmEliminar.ids.length > 1 ? `${confirmEliminar.ids.length} servicios` : 'servicio'}
                                </h3>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-[#D13A28]/20 mb-4 space-y-1.5">
                                <p className="text-[11px] font-black text-[#D13A28] uppercase tracking-wide">Esta acción no se puede deshacer</p>
                                <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">
                                    Se eliminarán permanentemente el servicio, todos sus ítems, repuestos usados y registros asociados.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminar(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={async () => {
                                    const ids = confirmEliminar.ids;
                                    setConfirmEliminar(null);
                                    setSeleccionados(new Set());
                                    setModoSeleccion(false);
                                    await Promise.all(ids.map(id => eliminarServicio(id)));
                                    fetchTabCounts();
                                }}
                                    className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
