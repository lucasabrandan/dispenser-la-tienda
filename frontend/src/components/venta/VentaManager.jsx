import React, { useEffect, useState } from 'react';
import { useVentaManager } from '../../hooks/useVentaManager';
import VentaStats  from './VentaStats';
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

export default function VentaManager({ clienteInicial = null, onClienteConsumido }) {
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

    // Auto-abrir modal cuando viene con cliente preseleccionado desde ClienteManager
    useEffect(() => {
        if (clienteInicial) setModalCrear(true);
    }, [clienteInicial, setModalCrear]);

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
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-6">

            {/* ── HEADER ───────────────────────────────────────────────── */}
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">
                        Ventas
                    </h2>
                    <p className="text-[11px] font-medium text-[#A8A29E] mt-0.5">
                        Gestión comercial
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportarVentasCSV(filtros.itemsFiltrados)}
                        title="Exportar a CSV"
                        className="h-8 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                    >
                        CSV
                    </button>
                    <button
                        onClick={() => setModalCrear(true)}
                        className="h-8 px-4 rounded-lg font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D48800] dark:bg-[#F0A500]"
                    >
                        + Nueva Venta
                    </button>
                </div>
            </div>

            <VentaStats stats={stats} />

            {/* ── FILTROS ───────────────────────────────────────────────── */}
            <FiltrosPanel hook={filtros} estados={ESTADOS_VENTA} conBusqueda conRango placeholderBusqueda="Cliente, S/N, sede..." />
            <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

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
