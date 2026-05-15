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
        seleccionados, modoSeleccion, setModoSeleccion,
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

    return (
        <div className="min-h-screen bg-[#F5F3F1] dark:bg-[#141414] p-4 pb-32 font-sans transition-colors">

            {/* METRICAS */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[#FFFFFF] dark:bg-[#242424] p-4 rounded-2xl border border-l-4 border-black/[0.07] dark:border-white/[0.07] border-l-[#D13A28] dark:border-l-[#E8422F] shadow-sm">
                    <p className="text-[10px] font-extrabold text-[#A8A29E] uppercase">Capital invertido</p>
                    <p className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] mt-1">
                        $ {Math.round(valorTotalInventario).toLocaleString('es-AR')}
                    </p>
                </div>
                <div className={`bg-[#FFFFFF] dark:bg-[#242424] p-4 rounded-2xl border border-l-4 shadow-sm border-black/[0.07] dark:border-white/[0.07] ${
                    itemsBajoStock > 0 ? 'border-l-rose-500' : 'border-l-emerald-500'
                }`}>
                    <p className="text-[10px] font-extrabold text-[#A8A29E] uppercase">Stock critico</p>
                    <p className={`text-lg font-black mt-1 ${itemsBajoStock > 0 ? 'text-rose-500' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                        {itemsBajoStock} prod.
                    </p>
                </div>
            </div>

            {/* BARRA DE BUSQUEDA + ACCIONES */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">🔍</span>
                    <input
                        placeholder="Buscar por nombre o SKU..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full py-3.5 pl-11 pr-4 bg-[#FFFFFF] dark:bg-[#242424] rounded-xl border border-black/[0.07] dark:border-white/[0.07] text-sm font-semibold text-[#1C1917] dark:text-[#F0EEE9] outline-none focus:ring-2 focus:ring-[#D13A28]/20"
                    />
                </div>
                <button
                    onClick={() => setStockSheetOpen(true)}
                    title="Ajustar stock"
                    className="bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] text-[#A8A29E] w-11 rounded-xl flex justify-center items-center text-lg transition-all active:scale-95"
                >📦</button>
                <button
                    onClick={abrirNuevo}
                    className="bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-90 text-white w-14 rounded-xl flex justify-center items-center text-2xl font-bold shadow-md shadow-[#D13A28]/30 transition-all active:scale-95"
                >+</button>
            </div>

            {/* BARRA SELECCION */}
            {!modoSeleccion ? (
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setModoSeleccion(true)}
                        className="py-2 px-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl text-xs font-black uppercase">
                        Seleccionar
                    </button>
                    <button onClick={exportarTodos}
                        className="py-2 px-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl text-xs font-black uppercase">
                        Lista
                    </button>
                    <button onClick={exportarCatalogoTodos}
                        className="py-2 px-4 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] rounded-xl text-xs font-black uppercase">
                        Catalogo
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
                        <RepuestoCard
                            key={r.id}
                            repuesto={r}
                            modoSeleccion={modoSeleccion}
                            estaSeleccionado={seleccionados.has(r.id)}
                            onEditar={abrirEditar}
                            onEliminar={eliminar}
                            onToggleSeleccion={toggleSeleccion}
                        />
                    ))
                )}
            </div>
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} irA={irA} next={next} prev={prev} />

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