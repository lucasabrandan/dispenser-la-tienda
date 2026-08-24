import React, { useEffect, useState, useCallback } from 'react';
import { useVentaManager } from '../../hooks/useVentaManager';
import { useAuth } from '../../context/AuthContext';
import VentaList   from './VentaList';
import VentaForm   from './VentaForm';
import Paginacion   from '../ui/Paginacion';
import SwipeColumns from '../ui/SwipeColumns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { exportarVentasCSV } from '../../utils/exportarCSV';
import api from '../../services/api';

const TABS = [
    { id: 'PRESUPUESTO', label: 'Pendientes', short: 'Pend.',   color: '#D48800', icon: '💰' },
    { id: 'REALIZADO',   label: 'Cobradas',   short: 'Cobradas', color: '#16A34A', icon: '✅' },
    { id: 'ARCHIVADO',   label: 'Archivadas', short: 'Arch.',   color: '#A8A29E', icon: '🗄️' },
];

const ESTADO_API_MAP = {
    REALIZADO: 'REALIZADO',
};

export default function VentaManager({ clienteInicial = null, onClienteConsumido, abrirCrearDirecto = false, onCrearConsumido }) {
    const { esAdmin } = useAuth();
    const {
        cargando,
        modalCrear, setModalCrear,
        ventaEditar,
        cargarVentas,
        confirmarVenta,
        eliminarVenta,
        generarPDF,
        calcularTotal,
        abrirEditar,
        cerrarModal,
        filtros,
    } = useVentaManager();

    const [ventaDuplicar, setVentaDuplicar] = useState(null);
    const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [menuOverflow, setMenuOverflow] = useState(false);
    const [tabCounts, setTabCounts] = useState({});

    const tabActual = filtros.estado || 'PRESUPUESTO';

    // Cargar conteos por estado
    const fetchTabCounts = useCallback(async () => {
        try {
            const results = await Promise.all(
                TABS.map(t => api.get('/servicios', {
                    params: { tipo: 'VENTA', estado: ESTADO_API_MAP[t.id] || t.id, page: 0, size: 1 }
                }).catch(() => ({ data: { totalElements: 0 } })))
            );
            const counts = {};
            TABS.forEach((t, i) => { counts[t.id] = results[i].data.totalElements || 0; });
            setTabCounts(counts);
        } catch (err) { console.warn('Ventas: error cargando conteos tabs', err); }
    }, []);

    useEffect(() => { fetchTabCounts(); }, [fetchTabCounts]);
    useEffect(() => {
        setTabCounts(prev => ({ ...prev, [tabActual]: filtros.totalItems }));
    }, [filtros.totalItems, tabActual]);

    const cambiarTab = (id) => {
        filtros.setEstado(id);
    };

    useEffect(() => { if (clienteInicial) setModalCrear(true); }, [clienteInicial, setModalCrear]);
    useEffect(() => { if (abrirCrearDirecto) { setModalCrear(true); onCrearConsumido?.(); } }, [abrirCrearDirecto]); // eslint-disable-line

    const duplicarVenta = (v) => {
        setVentaDuplicar({
            ...v, id: undefined, estado: 'PRESUPUESTO', nroDocumento: undefined,
            fecha: new Date().toISOString().slice(0, 10),
        });
        setModalCrear(true);
    };
    const cerrarModalDuplicar = () => { cerrarModal(); setVentaDuplicar(null); };

    const confirmarConRefresh = async (...args) => {
        await confirmarVenta(...args);
        fetchTabCounts();
    };

    const columns = TABS.map(t => ({
        id: t.id, label: t.short, fullLabel: t.label,
        count: tabCounts[t.id] ?? null, color: t.color, icon: t.icon,
    }));

    const columnIds = TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(columnIds, tabActual, cambiarTab);

    return (
        <div className="min-h-screen bg-page pb-28 font-sans transition-colors"
            {...swipeHandlers}>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink mb-2.5">
                        Ventas
                    </h2>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setMostrarBusqueda(v => !v)}
                            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${mostrarBusqueda || filtros.busqueda ? 'bg-brand-amber text-white' : 'bg-white dark:bg-[#2E2E2E] text-muted'}`}>
                            🔍
                        </button>
                        <div className={`${mostrarBusqueda ? 'flex' : 'hidden'} md:flex relative flex-1`}>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">🔍</span>
                            <input value={filtros.busqueda} onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, producto, sede..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                                autoFocus={mostrarBusqueda} />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">✕</button>
                            )}
                        </div>

                        <div className="relative">
                            <button onClick={() => setMenuOverflow(v => !v)}
                                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">⋯</button>
                            {menuOverflow && (
                                <>
                                    <div className="fixed inset-0 bg-black/40 z-[60] md:bg-transparent" onClick={() => setMenuOverflow(false)} />
                                    <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl p-2 pb-6 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bottom-auto md:rounded-xl md:p-0 md:py-1.5 md:w-52 bg-white dark:bg-[#242424] shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08] md:border">
                                        <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-chip md:hidden" />
                                        <button onClick={() => { exportarVentasCSV(filtros.itemsFiltrados); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-[14px] md:text-[13px] font-bold text-ink active:bg-[#E8E5E0] rounded-xl md:rounded-none">
                                            📥 Exportar CSV
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {esAdmin && (
                            <button onClick={() => setModalCrear(true)}
                                className="hidden md:flex h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase items-center active:scale-95 bg-brand-amber shrink-0">
                                + Venta
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* SwipeColumns */}
                <SwipeColumns columns={columns} activeId={tabActual} onChangeColumn={cambiarTab} />

                {/* Filtros colapsables */}
                {mostrarFiltros && (
                    <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-[10px] text-center text-muted font-bold">{filtros.totalItems} resultados</p>
                    </div>
                )}

                {/* Lista */}
                {cargando ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-card" />)}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-3xl mb-2">{TABS.find(t => t.id === tabActual)?.icon || '🛒'}</p>
                        <p className="text-[13px] font-bold text-muted">Sin {TABS.find(t => t.id === tabActual)?.label?.toLowerCase() || 'ventas'}</p>
                    </div>
                ) : (
                    <VentaList
                        ventas={filtros.itemsPagina}
                        cargando={false}
                        busqueda={filtros.busqueda} setBusqueda={filtros.setBusqueda}
                        filtroTab="TODOS" setFiltroTab={() => {}}
                        calcularTotal={calcularTotal}
                        onEditar={abrirEditar}
                        onConfirmar={confirmarConRefresh}
                        onEliminar={eliminarVenta}
                        onPDF={generarPDF}
                        onDuplicar={duplicarVenta}
                    />
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {/* FAB — mobile */}
            {esAdmin && (
                <button onClick={() => setModalCrear(true)}
                    className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-brand-amber active:scale-90 transition-all z-20"
                    aria-label="Nueva venta">+</button>
            )}

            {/* Modal crear/editar */}
            {modalCrear && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-[#FFFFFF] dark:bg-[#141414] w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <div className="sticky top-0 bg-panel px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.07] flex justify-between items-center z-10 md:rounded-t-3xl">
                            <div>
                                <h3 className="text-[15px] font-black text-ink">
                                    {ventaDuplicar ? 'Duplicar Venta' : ventaEditar ? 'Editar Venta' : 'Nueva Venta'}
                                </h3>
                                <p className="text-[11px] text-muted mt-0.5">
                                    {ventaDuplicar ? 'Copia — ajustá y guardá'
                                        : ventaEditar ? `#${ventaEditar.id}`
                                        : 'Seleccioná cliente y productos'}
                                </p>
                            </div>
                            <button onClick={cerrarModalDuplicar}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">✕</button>
                        </div>
                        <VentaForm
                            onSaved={() => { cerrarModalDuplicar(); cargarVentas(); fetchTabCounts(); if (onClienteConsumido) onClienteConsumido(); }}
                            ventaParaEditar={ventaEditar || ventaDuplicar}
                            clienteInicialId={clienteInicial?.id}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
