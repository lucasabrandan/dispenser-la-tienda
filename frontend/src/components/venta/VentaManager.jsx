import React, { useEffect, useState } from 'react';
import { useVentaManager } from '../../hooks/useVentaManager';
import { useMontos } from '../../context/MontosContext';
import VentaList   from './VentaList';
import VentaForm   from './VentaForm';
import FiltrosPanel from '../ui/FiltrosPanel';
import Paginacion   from '../ui/Paginacion';
import { exportarVentasCSV } from '../../utils/exportarCSV';

const ESTADOS_VENTA = [
    { value: 'PRESUPUESTO', label: 'Pendiente' },
    { value: 'REALIZADO',   label: 'Cobrada'   },
    { value: 'RECHAZADO',   label: 'Rechazada' },
];

function MV({ valor }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span>······</span>;
    return <span>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

export default function VentaManager({ clienteInicial = null, onClienteConsumido, abrirCrearDirecto = false, onCrearConsumido }) {
    const {
        cargando, stats,
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
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [statsExpanded, setStatsExpanded] = useState(false);
    const [menuOverflow, setMenuOverflow] = useState(false);

    // Auto-abrir modal cuando viene con cliente preseleccionado desde ClienteManager
    useEffect(() => {
        if (clienteInicial) setModalCrear(true);
    }, [clienteInicial, setModalCrear]);
    useEffect(() => { if (abrirCrearDirecto) { setModalCrear(true); onCrearConsumido?.(); } }, [abrirCrearDirecto]); // eslint-disable-line

    // Duplicar: copia todo menos id/estado/nroDocumento, con fecha de hoy
    const duplicarVenta = (v) => {
        const copia = {
            ...v,
            id: undefined,
            estado: 'PRESUPUESTO',
            nroDocumento: undefined,
            fecha: new Date().toISOString().slice(0, 10),
        };
        setVentaDuplicar(copia);
        setModalCrear(true);
    };
    const cerrarModalDuplicar = () => { cerrarModal(); setVentaDuplicar(null); };

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] pb-28 font-sans transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">
                        Ventas
                    </h2>
                    {/* Búsqueda + acciones */}
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input value={filtros.busqueda} onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, producto, sede..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                            )}
                        </div>
                        <div className="relative">
                            <button onClick={() => setMenuOverflow(v => !v)}
                                className="h-9 w-9 rounded-lg flex items-center justify-center text-[#A8A29E] bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">⋯</button>
                            {menuOverflow && (<>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuOverflow(false)} />
                                <div className="absolute right-0 top-11 z-20 w-44 rounded-xl bg-white dark:bg-[#242424] shadow-lg border border-black/[0.08] dark:border-white/[0.08] py-1">
                                    <button onClick={() => { exportarVentasCSV(filtros.itemsFiltrados); setMenuOverflow(false); }}
                                        className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#F5F3F1] dark:hover:bg-[#2E2E2E]">
                                        📥 Exportar CSV
                                    </button>
                                </div>
                            </>)}
                        </div>
                        <button onClick={() => setModalCrear(true)}
                            className="h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D48800] dark:bg-[#F0A500] shrink-0">
                            + Venta
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

            {/* Stats compacto */}
            <button onClick={() => setStatsExpanded(v => !v)}
                className="w-full flex items-center gap-3 px-3 h-8 rounded-lg bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] text-left active:scale-[0.99]">
                <span className="text-[11px] font-bold text-[#A8A29E]">Mes</span>
                <span className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]"><MV valor={stats.totalMes} /></span>
                <span className="text-[11px] font-bold text-[#A8A29E]">Hoy</span>
                <span className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]"><MV valor={stats.totalHoy} /></span>
                {stats.pendientesCount > 0 && (
                    <span className="text-[11px] font-bold text-[#D48800]">Pend. {stats.pendientesCount}</span>
                )}
                <span className="ml-auto text-[10px] text-[#A8A29E]">{statsExpanded ? '▲' : '▼'}</span>
            </button>

            {statsExpanded && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="rounded-xl p-3 bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Facturado mes</p>
                        <span className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] block"><MV valor={stats.totalMes} /></span>
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{stats.cantidadMes} cobradas</p>
                    </div>
                    <div className="rounded-xl p-3 bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Hoy</p>
                        <span className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] block"><MV valor={stats.totalHoy} /></span>
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{stats.cantidadHoy} ventas</p>
                    </div>
                    <div className={`rounded-xl p-3 bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${stats.pendientesCount > 0 ? 'border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]' : ''}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Pendientes</p>
                        <p className={`text-lg font-black ${stats.pendientesCount > 0 ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>{stats.pendientesCount}</p>
                    </div>
                    <div className={`rounded-xl p-3 bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${stats.pendientesVal > 0 ? 'border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]' : ''}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Por cobrar</p>
                        <span className={`text-lg font-black block ${stats.pendientesVal > 0 ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}><MV valor={stats.pendientesVal} /></span>
                    </div>
                </div>
            )}

            {/* Filtros colapsables */}
            <button onClick={() => setMostrarFiltros(v => !v)}
                className="w-full flex items-center justify-between px-3 h-7 rounded-lg bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-[0.99]">
                <span className="text-[10px] font-bold uppercase text-[#A8A29E]">{mostrarFiltros ? '▲' : '▼'} Filtros</span>
                <span className="text-[10px] font-bold text-[#A8A29E]">{filtros.totalItems} resultados</span>
            </button>

            {mostrarFiltros && (
                <FiltrosPanel hook={filtros} estados={ESTADOS_VENTA} conBusqueda={false} conRango />
            )}

            {cargando ? (
                <div className="text-center py-16 text-[#A8A29E] font-bold">Cargando ventas...</div>
            ) : (
                <VentaList
                    ventas={filtros.itemsPagina}
                    cargando={false}
                    busqueda={filtros.busqueda}     setBusqueda={filtros.setBusqueda}
                    filtroTab="TODOS"               setFiltroTab={() => {}}
                    calcularTotal={calcularTotal}
                    onEditar={abrirEditar}
                    onConfirmar={confirmarVenta}
                    onEliminar={eliminarVenta}
                    onPDF={generarPDF}
                    onDuplicar={duplicarVenta}
                />
            )}

            {/* ── PAGINACIÓN ABAJO ──────────────────────────────────────── */}
            <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

            </div>{/* cierre max-w-6xl */}

            {/* ── MODAL CREAR / EDITAR ──────────────────────────────────── */}
            {modalCrear && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-[#FFFFFF] dark:bg-[#141414] w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
                        {/* Drag handle — indica scroll en mobile */}
                        <div className="md:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <div className="sticky top-0 bg-[#EFEDEA] dark:bg-[#1C1C1C] px-5 py-4 border-b border-black/[0.08] dark:border-white/[0.07] flex justify-between items-center z-10 md:rounded-t-3xl">
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    {ventaDuplicar ? 'Duplicar Venta' : ventaEditar ? 'Editar Venta' : 'Nueva Venta'}
                                </h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                    {ventaDuplicar
                                        ? 'Copia de venta anterior — ajustá y guardá'
                                        : ventaEditar
                                            ? `${ventaEditar.estado === 'REALIZADO' ? 'Venta' : 'Presupuesto'} #${ventaEditar.id}`
                                            : 'Seleccioná cliente y productos'}
                                </p>
                            </div>
                            <button
                                onClick={cerrarModalDuplicar}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90"
                            >
                                ✕
                            </button>
                        </div>
                        <VentaForm
                            onSaved={() => { cerrarModalDuplicar(); cargarVentas(); if (onClienteConsumido) onClienteConsumido(); }}
                            ventaParaEditar={ventaEditar || ventaDuplicar}
                            clienteInicialId={clienteInicial?.id}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
