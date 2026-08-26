import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LuSearch, LuPackage, LuEllipsis, LuListChecks, LuDownload, LuFileText } from 'react-icons/lu';
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
        ordenProductos, setOrdenProductos,
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
        <div className="min-h-screen bg-page pb-32 font-sans transition-colors" {...swipeHandlers}>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink mb-2.5">Productos</h2>
                    <div className="flex gap-1.5 items-center">
                        <div className="relative flex-1">
                            <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input placeholder="Buscar..."
                                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-card text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                            {busqueda && (
                                <button onClick={() => setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-label font-bold">✕</button>
                            )}
                        </div>
                        <button onClick={() => setStockSheetOpen(true)} title="Ajuste stock"
                            className="h-9 w-9 rounded-lg flex items-center justify-center bg-card text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95"><LuPackage size={15} /></button>

                        {/* Menú overflow */}
                        <div className="relative">
                            <button onClick={() => setMenuOverflow(v => !v)}
                                className="h-9 w-9 rounded-lg flex items-center justify-center bg-card text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95"><LuEllipsis size={15} /></button>
                            {menuOverflow && createPortal(
                                <>
                                    <div className="fixed inset-0 bg-black/40 z-[60] md:bg-transparent" onClick={() => setMenuOverflow(false)} />
                                    <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-2xl p-2 pb-6 md:absolute md:inset-auto md:right-0 md:top-full md:mt-1 md:bottom-auto md:rounded-xl md:p-0 md:py-1.5 md:w-52 bg-card shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08] md:border">
                                        <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-chip md:hidden" />
                                        <button onClick={() => { setModoSeleccion(true); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-body-lg md:text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl md:rounded-none flex items-center gap-2.5">
                                            <LuListChecks size={15} /> Seleccionar
                                        </button>
                                        <button onClick={() => { exportarTodos(); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-body-lg md:text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl md:rounded-none flex items-center gap-2.5">
                                            <LuDownload size={15} /> Exportar lista
                                        </button>
                                        <button onClick={() => { exportarCatalogoTodos(); setMenuOverflow(false); }}
                                            className="w-full px-5 py-3.5 md:py-2.5 text-left text-body-lg md:text-body font-bold text-ink active:bg-[#E8E5E0] rounded-xl md:rounded-none flex items-center gap-2.5">
                                            <LuFileText size={15} /> Exportar catálogo
                                        </button>
                                    </div>
                                </>,
                                document.body
                            )}
                        </div>

                        <button onClick={abrirNuevo}
                            className="hidden md:flex h-9 px-4 rounded-lg font-bold text-label text-white uppercase items-center active:scale-95 bg-brand-red">+ Nuevo</button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* Stats + orden */}
                <div className="flex items-center justify-between px-3 h-8 rounded-lg bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <span className="text-caption font-bold text-muted">{productosFiltrados.length} productos</span>
                    <select value={ordenProductos} onChange={e => setOrdenProductos(e.target.value)}
                        className="h-6 px-2 rounded text-label font-bold outline-none bg-transparent text-muted cursor-pointer">
                        <option value="az">A → Z</option>
                        <option value="za">Z → A</option>
                        <option value="precio-asc">Precio ↑</option>
                        <option value="precio-desc">Precio ↓</option>
                    </select>
                </div>

                {/* Barra selección masiva */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] flex-wrap">
                        <span className="text-caption font-bold text-ink">
                            {seleccionados.size} sel.
                        </span>
                        <button onClick={seleccionarTodos}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95">
                            {todosSeleccionados ? 'Ninguno' : 'Todos'}
                        </button>
                        <button onClick={exportarSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95 disabled:opacity-40">
                            Lista
                        </button>
                        <button onClick={exportarCatalogoSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95 disabled:opacity-40">
                            Catálogo
                        </button>
                        <button onClick={() => setModalPrecio(true)} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-[#D48800]/10 text-brand-amber active:scale-95 disabled:opacity-40">
                            % Precio
                        </button>
                        <button onClick={eliminarSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label text-brand-red active:scale-95 disabled:opacity-40">
                            Eliminar
                        </button>
                        <div className="flex-1" />
                        <button onClick={cancelarSeleccion}
                            className="h-7 px-3 rounded-lg font-bold text-label text-muted active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Grid de productos */}
                {productosFiltrados.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="mb-2 flex justify-center"><LuPackage size={28} /></p>
                        <p className="text-body font-bold text-muted">
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
                className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl font-black text-white bg-brand-red active:scale-90 transition-all z-20"
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
