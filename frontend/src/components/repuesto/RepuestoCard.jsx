import React from 'react';

/**
 * RepuestoCard
 * Componente presentacional — solo recibe props, no sabe nada de API.
 */
export default function RepuestoCard({
    repuesto,
    modoSeleccion,
    estaSeleccionado,
    onEditar,
    onEliminar,
    onToggleSeleccion,
}) {
    const r = repuesto;
    const bajosStock = Number(r.stock) <= 3;

    return (
        <div
            className={`bg-white dark:bg-slate-800 p-3 rounded-2xl border shadow-sm flex items-center gap-4 transition-all duration-200 ${
                estaSeleccionado
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700'
            }`}
            onClick={() => modoSeleccion && onToggleSeleccion(r.id)}
        >
            {/* Checkbox de selección */}
            {modoSeleccion && (
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    estaSeleccionado
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-slate-300 dark:border-slate-600'
                }`}>
                    {estaSeleccionado && <span className="text-white text-xs font-black">✓</span>}
                </div>
            )}

            {/* Imagen */}
            <div className="min-w-[70px] h-[70px] rounded-xl bg-slate-100 dark:bg-slate-700 flex justify-center items-center overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0">
                {r.imagen
                    ? <img src={r.imagen} className="w-full h-full object-cover" alt={r.nombre} />
                    : <span className="text-2xl opacity-50">📦</span>
                }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-wide">
                        {r.sku}
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        bajosStock
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    }`}>
                        {r.stock} unid.
                    </span>
                </div>

                <h4 className="text-[15px] text-slate-900 dark:text-white font-extrabold leading-tight truncate">
                    {r.nombre}
                </h4>

                <div className="flex justify-between items-center mt-2">
                    <span className="font-black text-lg text-slate-900 dark:text-white">
                        $ {Math.round(Number(r.precio)).toLocaleString('es-AR')}
                    </span>

                    {!modoSeleccion && (
                        <div className="flex gap-2">
                            <button
                                onClick={e => { e.stopPropagation(); onEditar(r); }}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all"
                            >✏️</button>
                            <button
                                onClick={e => { e.stopPropagation(); onEliminar(r.id, r.nombre); }}
                                className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-all"
                            >🗑️</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}