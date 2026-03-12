import React from 'react';

export default function BarraAccionesProductos({
  totalProductos,
  modoSeleccion,
  seleccionados,
  todosSeleccionados,
  busqueda,
  productosFiltrados,
  onExportarTodos,
  onNuevo,
  onActivarSeleccion,
  onCancelarSeleccion,
  onSeleccionarTodos,
  onExportarSeleccionados,
  onAbrirModalPrecio,
  onEliminarSeleccionados,
  onBusquedaChange,
}) {
  return (
    <div className="mb-4">
      {/* TÍTULO */}
      <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-0.5">📦 PRODUCTOS</h1>
      <p className="text-xs text-slate-400 mb-3">{totalProductos} productos en total</p>

      {/* BOTONES NORMALES / BARRA SELECCIÓN */}
      {!modoSeleccion ? (
        <div className="flex gap-2 mb-3">
          <button
            onClick={onExportarTodos}
            className="flex-1 md:flex-none bg-purple-600 text-white px-3 py-2.5 rounded-xl font-black text-xs shadow hover:bg-purple-700 transition-all active:scale-95"
          >
            📥 Lista PDF
          </button>
          <button
            onClick={onNuevo}
            className="flex-1 md:flex-none bg-emerald-600 text-white px-3 py-2.5 rounded-xl font-black text-xs shadow hover:bg-emerald-700 transition-all active:scale-95"
          >
            ➕ Nuevo
          </button>
          <button
            onClick={onActivarSeleccion}
            className="flex-1 md:flex-none bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2.5 rounded-xl font-black text-xs shadow hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
          >
            ☑️ Seleccionar
          </button>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase">
              {seleccionados.size} seleccionados
            </span>
            <button
              onClick={onCancelarSeleccion}
              className="text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ✕ Cancelar
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onSeleccionarTodos}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
            >
              {todosSeleccionados ? '✕ Deselec. todos' : '✓ Todos'}
            </button>
            <button
              onClick={onExportarSeleccionados}
              disabled={seleccionados.size === 0}
              className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-purple-700 transition-all disabled:opacity-40"
            >
              📥 Exportar
            </button>
            <button
              onClick={onAbrirModalPrecio}
              disabled={seleccionados.size === 0}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-700 transition-all disabled:opacity-40"
            >
              💰 Actualizar %
            </button>
            <button
              onClick={onEliminarSeleccionados}
              disabled={seleccionados.size === 0}
              className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-rose-700 transition-all disabled:opacity-40"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      )}

      {/* BUSCADOR */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          value={busqueda}
          onChange={e => onBusquedaChange(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 outline-none transition-all"
        />
        {busqueda && (
          <button
            onClick={() => onBusquedaChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white text-base leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* CONTADOR BÚSQUEDA */}
      {busqueda && (
        <p className="text-xs text-slate-400 mt-2">
          {productosFiltrados.length} resultado(s) para "{busqueda}"
        </p>
      )}
    </div>
  );
}
