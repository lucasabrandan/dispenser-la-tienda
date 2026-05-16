import React from 'react';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

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
    const precioNegro = Number(r.precio) || Number(r.precioLista) || 0;
    const netoCliente = Number(r.precioNetoCliente) || 0;
    const fotoSrc = r.fotoUrl ? construirUrlFoto(r.fotoUrl) : null;

    return (
        <div
            className={`bg-[#FFFFFF] dark:bg-[#242424] p-3 rounded-2xl border shadow-sm flex items-center gap-4 transition-all duration-200 ${
                estaSeleccionado
                    ? 'border-[#D13A28] dark:border-[#E8422F] ring-2 ring-[#D13A28]/20'
                    : 'border-black/[0.07] dark:border-white/[0.07]'
            }`}
            onClick={() => modoSeleccion && onToggleSeleccion(r.id)}
        >
            {/* Checkbox de seleccion */}
            {modoSeleccion && (
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    estaSeleccionado
                        ? 'bg-[#D13A28] dark:bg-[#E8422F] border-[#D13A28] dark:border-[#E8422F]'
                        : 'border-[#A8A29E]/40'
                }`}>
                    {estaSeleccionado && <span className="text-white text-xs font-black">✓</span>}
                </div>
            )}

            {/* Imagen */}
            <div className="min-w-[70px] h-[70px] rounded-xl bg-[#F5F3F1] dark:bg-[#1C1C1C] flex justify-center items-center overflow-hidden border border-black/[0.07] dark:border-white/[0.07] flex-shrink-0">
                {fotoSrc
                    ? <img src={fotoSrc} className="w-full h-full object-cover" alt={r.nombre} />
                    : <span className="text-2xl opacity-50">📦</span>
                }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F] tracking-wide">
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

                <h4 className="text-[15px] text-[#1C1917] dark:text-[#F0EEE9] font-extrabold leading-tight truncate">
                    {r.nombre}
                </h4>

                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-baseline gap-2">
                        {/* Precio efectivo */}
                        <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                            $ {Math.round(precioNegro).toLocaleString('es-AR')}
                        </span>
                        {/* Precio neto cliente (facturado) */}
                        {netoCliente > 0 && (
                            <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                                +IVA: $ {Math.round(netoCliente).toLocaleString('es-AR')}
                            </span>
                        )}
                    </div>

                    {!modoSeleccion && (
                        <div className="flex gap-2">
                            <button
                                onClick={e => { e.stopPropagation(); onEditar(r); }}
                                className="p-2 rounded-lg bg-[#F5F3F1] dark:bg-[#1C1C1C] text-[#A8A29E] hover:bg-[#D13A28] hover:text-white transition-all"
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
