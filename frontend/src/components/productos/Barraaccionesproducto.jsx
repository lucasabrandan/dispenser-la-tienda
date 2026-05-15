import React from 'react';

export default function BarraAccionesProductos({
    totalProductos, modoSeleccion, seleccionados, todosSeleccionados,
    busqueda, productosFiltrados, ordenProducto, onOrdenChange,
    onExportarTodos, onNuevo, onActivarSeleccion, onCancelarSeleccion,
    onSeleccionarTodos, onExportarSeleccionados, onAbrirModalPrecio,
    onEliminarSeleccionados, onBusquedaChange,
}) {
    return (
        <div className="mb-5">
            {/* Título */}
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-4xl font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-tighter leading-none">Productos</h2>
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.3em] mt-1">{totalProductos} en catálogo</p>
                </div>
            </div>

            {/* Botones normales / barra de selección */}
            {!modoSeleccion ? (
                <div className="flex gap-2 mb-4">
                    <button onClick={onNuevo}
                        className="flex-1 md:flex-none bg-[#D13A28] dark:bg-[#E8422F] text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase shadow hover:opacity-90 transition-all active:scale-95">
                        + Nuevo
                    </button>
                    <button onClick={onExportarTodos}
                        className="flex-1 md:flex-none bg-[#D48800] dark:bg-[#F0A500] text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase shadow hover:opacity-90 transition-all active:scale-95">
                        Lista PDF
                    </button>
                    <button onClick={onActivarSeleccion}
                        className="flex-1 md:flex-none bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] px-4 py-2.5 rounded-xl font-black text-[11px] uppercase hover:opacity-80 transition-all active:scale-95">
                        Seleccionar
                    </button>
                </div>
            ) : (
                <div className="bg-[#D13A28]/5 dark:bg-[#E8422F]/5 border border-[#D13A28]/20 dark:border-[#E8422F]/20 rounded-2xl p-3 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F] uppercase">
                            {seleccionados.size} seleccionados
                        </span>
                        <button onClick={onCancelarSeleccion}
                            className="text-[11px] text-[#A8A29E] font-bold hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">
                            ✕ Cancelar
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={onSeleccionarTodos}
                            className="bg-[#FFFFFF] dark:bg-[#242424] text-[#1C1917] dark:text-[#F0EEE9] px-3 py-1.5 rounded-lg text-[10px] font-bold border border-black/[0.07] dark:border-white/[0.07] hover:opacity-80 transition-all">
                            {todosSeleccionados ? '✕ Deselec. todos' : '✓ Todos'}
                        </button>
                        <button onClick={onExportarSeleccionados} disabled={seleccionados.size === 0}
                            className="bg-[#D48800] dark:bg-[#F0A500] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:opacity-90 transition-all disabled:opacity-40">
                            Exportar PDF
                        </button>
                        <button onClick={onAbrirModalPrecio} disabled={seleccionados.size === 0}
                            className="bg-[#D13A28] dark:bg-[#E8422F] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:opacity-90 transition-all disabled:opacity-40">
                            Actualizar %
                        </button>
                        <button onClick={onEliminarSeleccionados} disabled={seleccionados.size === 0}
                            className="bg-[#D13A28]/20 dark:bg-[#E8422F]/20 text-[#D13A28] dark:text-[#E8422F] px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-[#D13A28] hover:text-white dark:hover:bg-[#E8422F] transition-all disabled:opacity-40">
                            Eliminar
                        </button>
                    </div>
                </div>
            )}

            {/* Buscador */}
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm">🔍</span>
                <input
                    type="text"
                    value={busqueda}
                    onChange={e => onBusquedaChange(e.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    className="
                        w-full pl-11 pr-10 py-3.5 rounded-2xl outline-none transition-all
                        bg-[#FFFFFF] dark:bg-[#242424]
                        border border-black/[0.07] dark:border-white/[0.07]
                        text-[13px] font-bold text-[#1C1917] dark:text-[#F0EEE9]
                        placeholder-[#A8A29E]
                        focus:border-[#D13A28] dark:focus:border-[#E8422F]
                        focus:ring-2 focus:ring-[#D13A28]/20
                    "
                />
                {busqueda && (
                    <button onClick={() => onBusquedaChange('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors text-base">
                        ✕
                    </button>
                )}
            </div>

            {busqueda && (
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase mt-2">
                    {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''} para "{busqueda}"
                </p>
            )}

            {/* Ordenamiento */}
            <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider shrink-0">Orden</span>
                <select
                    value={ordenProducto}
                    onChange={e => onOrdenChange(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl text-[12px] font-bold border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none"
                >
                    <option value="nombre_asc">Nombre A → Z</option>
                    <option value="nombre_desc">Nombre Z → A</option>
                    <option value="precio_desc">Precio mayor primero</option>
                    <option value="precio_asc">Precio menor primero</option>
                    <option value="sku_asc">SKU A → Z</option>
                </select>
            </div>
        </div>
    );
}
