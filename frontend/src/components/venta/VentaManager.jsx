import React from 'react';
import { useVentaManager } from '../../hooks/useVentaManager';
import VentaStats from './VentaStats';
import VentaList  from './VentaList';
import VentaForm  from './VentaForm';

/**
 * VentaManager
 * Módulo completo de Ventas.
 * 
 * Estructura:
 * ┌─ Stats del mes (4 métricas) ──────────────────┐
 * ├─ Botón nueva venta ────────────────────────────┤
 * ├─ Lista con filtros (Todas / Cobradas / Pendientes)┤
 * │   · Ver detalle de productos                    │
 * │   · Editar presupuesto pendiente                │
 * │   · Confirmar / cobrar                          │
 * │   · Generar PDF                                 │
 * │   · Eliminar                                    │
 * └────────────────────────────────────────────────┘
 */
export default function VentaManager() {
    const {
        ventas, cargando, stats,
        busqueda, setBusqueda,
        filtroTab, setFiltroTab,
        modalCrear, setModalCrear,
        ventaEditar,
        cargarVentas,
        confirmarVenta,
        eliminarVenta,
        generarPDF,
        calcularTotal,
        abrirEditar,
        cerrarModal,
    } = useVentaManager();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-28 font-sans transition-colors">

            {/* HEADER */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                        Ventas
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                        Gestión comercial
                    </p>
                </div>
                <button
                    onClick={() => setModalCrear(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-8 rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                    + Nueva Venta
                </button>
            </div>

            {/* STATS */}
            <VentaStats stats={stats} />

            {/* ALERTA PENDIENTES */}
            {stats.pendientesCount > 0 && (
                <div
                    className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 flex items-center gap-3 cursor-pointer transition-all hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => setFiltroTab('PENDIENTES')}
                >
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                            {stats.pendientesCount} presupuesto{stats.pendientesCount > 1 ? 's' : ''} pendiente{stats.pendientesCount > 1 ? 's' : ''} de cobro
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                            ${stats.pendientesVal.toLocaleString()} por cobrar · Click para ver
                        </p>
                    </div>
                </div>
            )}

            {/* LISTA */}
            <VentaList
                ventas={ventas}
                cargando={cargando}
                busqueda={busqueda}     setBusqueda={setBusqueda}
                filtroTab={filtroTab}   setFiltroTab={setFiltroTab}
                calcularTotal={calcularTotal}
                onEditar={abrirEditar}
                onConfirmar={confirmarVenta}
                onEliminar={eliminarVenta}
                onPDF={generarPDF}
            />

            {/* MODAL CREAR / EDITAR */}
            {modalCrear && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-slate-50 dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
                        {/* Header del modal */}
                        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-10 md:rounded-t-3xl">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    {ventaEditar ? '✏️ Editar Venta' : '🛒 Nueva Venta'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {ventaEditar ? `Presupuesto #${ventaEditar.id}` : 'Seleccioná cliente y productos'}
                                </p>
                            </div>
                            <button
                                onClick={cerrarModal}
                                className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        {/* VentaForm dentro del modal */}
                        <VentaForm
                            onSaved={() => { cerrarModal(); cargarVentas(); }}
                            ventaParaEditar={ventaEditar}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}