import React from 'react';
import { useRepuestoManager } from '../../hooks/useRepuestoManager';
import RepuestoCard from './RepuestoCard';
import RepuestoModal from './RepuestoModal';
import ModalPrecioMasivo from '../productos/Modalpreciomasivo';

/**
 * RepuestoManager
 * Orquestador puro — solo renderiza, sin lógica de negocio.
 * Toda la lógica está en useRepuestoManager.
 */
export default function RepuestoManager() {
    const {
        productosFiltrados,
        modalAbierto, productoEdicion,
        busqueda, setBusqueda,
        seleccionados, modoSeleccion, setModoSeleccion,
        modalPrecio, setModalPrecio,
        porcentajeMasivo, setPorcentajeMasivo,
        tipoPorcentaje, setTipoPorcentaje,
        todosSeleccionados,
        valorTotalInventario, itemsBajoStock,
        cargarProductos, eliminar,
        eliminarSeleccionados, exportarSeleccionados, exportarTodos,
        aplicarPrecioMasivo, toggleSeleccion, seleccionarTodos,
        cancelarSeleccion, toggleExpandido,
        abrirNuevo, abrirEditar, cerrarModal,
    } = useRepuestoManager();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-32 font-sans transition-colors">

            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-blue-500 shadow-sm">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase">Capital invertido</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        $ {valorTotalInventario.toLocaleString()}
                    </p>
                </div>
                <div className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border border-l-4 shadow-sm ${
                    itemsBajoStock > 0
                        ? 'border-slate-200 dark:border-slate-700 border-l-rose-500'
                        : 'border-slate-200 dark:border-slate-700 border-l-emerald-500'
                }`}>
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase">Stock crítico</p>
                    <p className={`text-lg font-black mt-1 ${itemsBajoStock > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                        {itemsBajoStock} prod.
                    </p>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA + ACCIONES */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-50">🔍</span>
                    <input
                        placeholder="Buscar por nombre o SKU..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full py-3.5 pl-11 pr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={abrirNuevo}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-14 rounded-xl flex justify-center items-center text-2xl font-bold shadow-md shadow-blue-500/30 transition-all active:scale-95"
                >+</button>
            </div>

            {/* BARRA SELECCIÓN */}
            {!modoSeleccion ? (
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setModoSeleccion(true)}
                        className="py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase">
                        Seleccionar
                    </button>
                    <button onClick={exportarTodos}
                        className="py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase">
                        📄 PDF todos
                    </button>
                </div>
            ) : (
                <div className="flex gap-2 mb-4 flex-wrap">
                    <button onClick={seleccionarTodos}
                        className="py-2 px-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl text-xs font-black uppercase">
                        {todosSeleccionados ? 'Deseleccionar' : 'Todos'}
                    </button>
                    <button onClick={exportarSeleccionados} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        📄 PDF ({seleccionados.size})
                    </button>
                    <button onClick={() => setModalPrecio(true)} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        % Precio
                    </button>
                    <button onClick={eliminarSeleccionados} disabled={seleccionados.size === 0}
                        className="py-2 px-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl text-xs font-black uppercase disabled:opacity-40">
                        🗑️ ({seleccionados.size})
                    </button>
                    <button onClick={cancelarSeleccion}
                        className="py-2 px-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase">
                        Cancelar
                    </button>
                </div>
            )}

            {/* LISTADO */}
            <div className="grid gap-3">
                {productosFiltrados.length === 0 ? (
                    <div className="text-center p-10 text-slate-400 font-semibold">
                        {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay productos. Creá uno.'}
                    </div>
                ) : (
                    productosFiltrados.map(r => (
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

            {/* MODAL PRECIO MASIVO */}
            {modalPrecio && (
                <ModalPrecioMasivo
                    cantidadSeleccionados={seleccionados.size}
                    porcentajeMasivo={porcentajeMasivo}
                    tipoPorcentaje={tipoPorcentaje}
                    onPorcentajeChange={setPorcentajeMasivo}
                    onTipoChange={setTipoPorcentaje}
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

            {/* PDF flotante */}
            <button
                onClick={exportarTodos}
                className="fixed bottom-28 right-5 w-14 h-14 rounded-full bg-slate-900 dark:bg-blue-600 text-white text-2xl shadow-lg flex justify-center items-center z-[100] active:scale-95 transition-transform"
            >📄</button>
        </div>
    );
}