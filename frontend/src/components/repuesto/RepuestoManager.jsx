import React, { useState, useCallback } from 'react';
import { useRepuestoManager } from '../../hooks/useRepuestoManager';
import RepuestoCard from './RepuestoCard';
import RepuestoModal from './RepuestoModal';
import StockQuickSheet from './StockQuickSheet';
import ModalPrecioMasivo from '../productos/Modalpreciomasivo';
import Paginacion from '../ui/Paginacion';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

export default function RepuestoManager() {
    const [stockSheetOpen, setStockSheetOpen] = useState(false);
    const [menuOverflow, setMenuOverflow] = useState(false);

    const {
        productos, productosFiltrados, productosPagina,
        pagina, totalPaginas, irA, next, prev,
        modalAbierto, productoEdicion,
        busqueda, setBusqueda,
        seleccionados, setSeleccionados, modoSeleccion, setModoSeleccion,
        modalPrecio, setModalPrecio,
        gananciamasiva, setGananciaMasiva,
        markupMasivo, setMarkupMasivo,
        impuestosMasivo, setImpuestosMasivo,
        todosSeleccionados,
        valorTotalInventario, itemsBajoStock,
        cargarProductos, eliminar,
        eliminarSeleccionados, exportarSeleccionados, exportarTodos,
        exportarCatalogoSeleccionados, exportarCatalogoTodos,
        aplicarPrecioMasivo, toggleSeleccion, seleccionarTodos,
        cancelarSeleccion,
        abrirNuevo, abrirEditar, cerrarModal,
    } = useRepuestoManager();

    // Long-press para selección masiva
    const longPressRef = React.useRef(null);
    const iniciarLP = (id) => {
        longPressRef.current = setTimeout(() => {
            setModoSeleccion(true);
            setSeleccionados(new Set([id]));
        }, 500);
    };
    const cancelarLP = () => { if (longPressRef.current) clearTimeout(longPressRef.current); };

    // Swipe para paginar
    const pageIds = Array.from({ length: totalPaginas }, (_, i) => String(i + 1));
    const handleSwipePage = useCallback((id) => irA(Number(id)), [irA]);
    const swipeHandlers = useSwipeGesture(pageIds, String(pagina), handleSwipePage);

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] pb-32 font-sans transition-colors" {...swipeHandlers}>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9] mb-2.5">Productos</h2>
                    <div className="flex gap-1.5 items-center">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input placeholder="Buscar..."
                                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                            {busqueda && (
                                <button onClick={() => setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                            )}
                        </div>
                        <button onClick={() => setStockSheetOpen(true)} title="Ajuste stock"
                            className="h-9 w-9 rounded-lg flex items-center justify-center bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">📦</button>

                        {/* Menú overflow */}
                        <div className="relative">
                            <button onClick={() => setMenuOverflow(v => !v)}
                                className="h-9 w-9 rounded-lg flex items-center justify-center bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">⋯</button>
                            {menuOverflow && (
                                <>
                                    <div className="fixed inset-0 bg-black/40 z-[60] md:bg-transparent" onClick={() => setMenuOverflow(false)} />
                                    <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl p-2 pb-6 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bottom-auto md:rounded-xl md:p-0 md:py-1.5 md:w-52 bg-white dark:bg-[#242424] shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08] md:border">
                                        <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-[#E8E5E0] dark:bg-[#2E2E2E] md:hidden" />
                                        <button onClick={() => { setModoSeleccion(true); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-[14px] md:text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#E8E5E0] rounded-xl md:rounded-none">
                                            ☑ Seleccionar
                                        </button>
                                        <button onClick={() => { exportarTodos(); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-[14px] md:text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#E8E5E0] rounded-xl md:rounded-none">
                                            📥 Exportar lista
                                        </button>
                                        <button onClick={() => { exportarCatalogoTodos(); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-[14px] md:text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9] active:bg-[#E8E5E0] rounded-xl md:rounded-none">
                                            📄 Exportar catálogo
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={abrirNuevo}
                            className="hidden md:flex h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase items-center active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">+ Nuevo</button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* Stats */}
                <div className="flex items-center justify-between px-3 h-8 rounded-lg bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#A8A29E]">{productosFiltrados.length} productos</span>
                        <span className="text-[11px] text-[#A8A29E]">·</span>
                        <span className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]">${Math.round(valorTotalInventario).toLocaleString('es-AR')}</span>
                    </div>
                    {itemsBajoStock > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F]">
                            {itemsBajoStock} bajo stock
                        </span>
                    )}
                </div>

                {/* Barra selección masiva */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] flex-wrap">
                        <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">
                            {seleccionados.size} sel.
                        </span>
                        <button onClick={seleccionarTodos}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            {todosSeleccionados ? 'Ninguno' : 'Todos'}
                        </button>
                        <button onClick={exportarSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 disabled:opacity-40">
                            Lista
                        </button>
                        <button onClick={exportarCatalogoSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 disabled:opacity-40">
                            Catálogo
                        </button>
                        <button onClick={() => setModalPrecio(true)} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#D48800]/10 text-[#D48800] dark:text-[#F0A500] active:scale-95 disabled:opacity-40">
                            % Precio
                        </button>
                        <button onClick={eliminarSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] text-[#D13A28] dark:text-[#E8422F] active:scale-95 disabled:opacity-40">
                            Eliminar
                        </button>
                        <div className="flex-1" />
                        <button onClick={cancelarSeleccion}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] text-[#A8A29E] active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Grid de productos */}
                {productosFiltrados.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-3xl mb-2">📦</p>
                        <p className="text-[13px] font-bold text-[#A8A29E]">
                            {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos. Creá uno.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {productosPagina.map(r => (
                            <div key={r.id}
                                onTouchStart={() => iniciarLP(r.id)} onTouchEnd={cancelarLP} onTouchMove={cancelarLP}
                                onMouseDown={() => iniciarLP(r.id)} onMouseUp={cancelarLP} onMouseLeave={cancelarLP}>
                                <RepuestoCard
                                    repuesto={r}
                                    modoSeleccion={modoSeleccion}
                                    estaSeleccionado={seleccionados.has(r.id)}
                                    onEditar={abrirEditar}
                                    onEliminar={eliminar}
                                    onToggleSeleccion={toggleSeleccion}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <Paginacion pagina={pagina} totalPaginas={totalPaginas} irA={irA} next={next} prev={prev} />
            </div>

            {/* FAB Nuevo — mobile */}
            <button onClick={abrirNuevo}
                className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-90 transition-all z-20"
                aria-label="Nuevo producto">+</button>

            {/* Modales */}
            {modalPrecio && (
                <ModalPrecioMasivo
                    cantidadSeleccionados={seleccionados.size}
                    ganancia={gananciamasiva} markup={markupMasivo} impuestos={impuestosMasivo}
                    onGananciaChange={setGananciaMasiva} onMarkupChange={setMarkupMasivo} onImpuestosChange={setImpuestosMasivo}
                    onAplicar={aplicarPrecioMasivo} onCerrar={() => setModalPrecio(false)}
                />
            )}
            <RepuestoModal isOpen={modalAbierto} onClose={cerrarModal} onGuardado={cargarProductos} repuestoEdicion={productoEdicion} />
            <StockQuickSheet isOpen={stockSheetOpen} onClose={() => setStockSheetOpen(false)} repuestos={productos} onActualizado={cargarProductos} />
        </div>
    );
}
