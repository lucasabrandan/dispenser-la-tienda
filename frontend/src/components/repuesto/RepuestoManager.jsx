import React, { useState } from 'react';
import { useRepuestoManager } from '../../hooks/useRepuestoManager';
import RepuestoCard from './RepuestoCard';
import RepuestoModal from './RepuestoModal';
import StockQuickSheet from './StockQuickSheet';
import ModalPrecioMasivo from '../productos/Modalpreciomasivo';
import Paginacion from '../ui/Paginacion';

/**
 * RepuestoManager
 * Orquestador puro — solo renderiza, sin lógica de negocio.
 * Toda la lógica está en useRepuestoManager.
 */
export default function RepuestoManager() {
    const [stockSheetOpen, setStockSheetOpen] = useState(false);

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
        cancelarSeleccion, toggleExpandido,
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

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] pb-32 font-sans transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">Productos</h2>
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input placeholder="Buscar por nombre o SKU..."
                                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                        </div>
                        <button onClick={() => setStockSheetOpen(true)} title="Stock"
                            className="h-9 w-9 rounded-lg flex items-center justify-center bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">📦</button>
                        <button onClick={abrirNuevo}
                            className="h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">+ Nuevo</button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

            {/* Stats compacto */}
            <div className="flex items-center gap-3 px-3 h-8 rounded-lg bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                <span className="text-[11px] font-bold text-[#A8A29E]">Capital</span>
                <span className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]">$ {Math.round(valorTotalInventario).toLocaleString('es-AR')}</span>
                <span className="text-[11px] text-[#A8A29E]">·</span>
                <span className={`text-[11px] font-bold ${itemsBajoStock > 0 ? 'text-[#D13A28] dark:text-[#E8422F]' : 'text-[#A8A29E]'}`}>
                    {itemsBajoStock} stock crítico
                </span>
            </div>

            {/* Acciones secundarias */}
            {!modoSeleccion ? (
                <div className="flex gap-1.5">
                    <button onClick={() => setModoSeleccion(true)}
                        className="h-7 px-3 rounded-lg font-bold text-[10px] uppercase bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                        Seleccionar
                    </button>
                    <button onClick={exportarTodos}
                        className="h-7 px-3 rounded-lg font-bold text-[10px] uppercase bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                        Lista
                    </button>
                    <button onClick={exportarCatalogoTodos}
                        className="h-7 px-3 rounded-lg font-bold text-[10px] uppercase bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                        Catálogo
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 mb-4 flex-wrap">
                    <button onClick={seleccionarTodos}
                        className="py-2 px-4 bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] rounded-xl text-xs font-black uppercase">
                        {todosSeleccionados ? 'Deseleccionar' : 'Todos'}
                    </button>
                    <button onClick={exportarSeleccionados} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        Lista ({seleccionados.size})
                    </button>
                    <button onClick={exportarCatalogoSeleccionados} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        Catalogo ({seleccionados.size})
                    </button>
                    <button onClick={() => setModalPrecio(true)} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-[#D48800]/10 dark:bg-[#F0A500]/10 text-[#D48800] dark:text-[#F0A500] rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        % Precio
                    </button>
                    <button onClick={eliminarSeleccionados} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        Eliminar ({seleccionados.size})
                    </button>
                    <button onClick={cancelarSeleccion}
                        className="py-2 px-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl text-xs font-black uppercase">
                        Cancelar
                    </button>
                </div>
            )}

            {/* LISTADO */}
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} irA={irA} next={next} prev={prev} />
            <div className="grid gap-3">
                {productosFiltrados.length === 0 ? (
                    <div className="text-center p-10 text-[#A8A29E] font-semibold">
                        {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos. Crea uno.'}
                    </div>
                ) : (
                    productosPagina.map(r => (
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
                    ))
                )}
            </div>
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} irA={irA} next={next} prev={prev} />
            </div>{/* cierre max-w-6xl */}

            {/* MODAL PRECIO MASIVO */}
            {modalPrecio && (
                <ModalPrecioMasivo
                    cantidadSeleccionados={seleccionados.size}
                    ganancia={gananciamasiva}
                    markup={markupMasivo}
                    impuestos={impuestosMasivo}
                    onGananciaChange={setGananciaMasiva}
                    onMarkupChange={setMarkupMasivo}
                    onImpuestosChange={setImpuestosMasivo}
                    onAplicar={aplicarPrecioMasivo}
                    onCerrar={() => setModalPrecio(false)}
                />
            )}

            {/* MODAL CREAR/EDITAR */}
            <RepuestoModal
                isOpen={modalAbierto}
                onClose={cerrarModal}
                onGuardado={cargarProductos}
                repuestoEdicion={productoEdicion}
            />

            {/* SHEET AJUSTE RÁPIDO DE STOCK */}
            <StockQuickSheet
                isOpen={stockSheetOpen}
                onClose={() => setStockSheetOpen(false)}
                repuestos={productos}
                onActualizado={cargarProductos}
            />

            {/* PDF flotante */}
            <button
                onClick={exportarTodos}
                className="fixed bottom-28 right-5 w-14 h-14 rounded-full bg-[#1C1917] dark:bg-[#D13A28] text-white text-2xl shadow-lg flex justify-center items-center z-[100] active:scale-95 transition-transform"
            >📄</button>
        </div>
    );
}