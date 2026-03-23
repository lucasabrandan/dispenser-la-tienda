import React from 'react';
import Select from 'react-select';

/**
 * SeccionRepuestos
 * Maneja: buscador de repuestos, lista con ganancias por línea,
 * descripción del trabajo y campo de mano de obra / envío.
 */
export default function SeccionRepuestos({
    db,
    itemActual, setItemActual,
    repuestoElegido, setRepuestoElegido,
    esPresupuesto, estaBloqueado,
    selectStyles,
    sumarRepuesto,
    actualizarCantidad,
    quitarRepuesto,
    agregarAlTicket,
    calcularGananciaRepuesto,
}) {
    return (
        <>
            {/* BUSCADOR DE REPUESTOS */}
            {!estaBloqueado && (
                <div className="flex gap-2 items-end mb-5">
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                            Agregar Repuesto — nombre o SKU
                        </label>
                        <Select
                            styles={selectStyles}
                            options={db.repuestos?.map(r => ({
                                ...r,
                                label: `${r.sku ? `[${r.sku}] ` : ''}${r.nombre}`,
                                value: r.id
                            }))}
                            filterOption={(option, inputValue) => {
                                const val = inputValue.toLowerCase();
                                return (
                                    option.data.nombre?.toLowerCase().includes(val) ||
                                    option.data.sku?.toLowerCase().includes(val)
                                );
                            }}
                            formatOptionLabel={opt => (
                                <div className="flex justify-between items-center">
                                    <div>
                                        {opt.sku && <span className="text-[9px] font-black text-blue-400 mr-2 uppercase">{opt.sku}</span>}
                                        <span className="font-bold text-sm">{opt.nombre}</span>
                                    </div>
                                    <span className="text-emerald-500 font-black text-xs">${opt.precio}</span>
                                </div>
                            )}
                            onChange={setRepuestoElegido}
                            value={repuestoElegido}
                            placeholder="Buscar por nombre o SKU..."
                        />
                    </div>
                    <button
                        onClick={sumarRepuesto}
                        className="h-[55px] w-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-2xl font-black shadow-lg active:scale-90 transition-transform"
                    >+</button>
                </div>
            )}

            {/* LISTA DE REPUESTOS CON GANANCIA */}
            {itemActual.repuestosUsados.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mb-5">
                    {itemActual.repuestosUsados.map((r, i) => {
                        const g = calcularGananciaRepuesto(r, r.cantidad);
                        return (
                            <div key={i} className="py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{r.nombre}</div>
                                        <div className="text-[10px] text-slate-400 font-bold">${r.precio} c/u</div>
                                    </div>
                                    <input
                                        disabled={estaBloqueado}
                                        type="number" min="1" value={r.cantidad}
                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                        className="w-12 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-center font-black text-slate-900 dark:text-white mr-3"
                                    />
                                    <div className="font-black text-sm w-16 text-right text-slate-900 dark:text-white">
                                        ${g.subtotal.toLocaleString()}
                                    </div>
                                    {!estaBloqueado && (
                                        <button onClick={() => quitarRepuesto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                                    )}
                                </div>
                                {g.ganancia > 0 && (
                                    <div className="flex gap-3 mt-1 ml-1">
                                        <span className="text-[9px] font-black text-emerald-500">Ganancia: ${g.ganancia.toFixed(0)}</span>
                                        <span className="text-[9px] font-bold text-slate-400">Margen: {g.margen}%</span>
                                        <span className="text-[9px] font-bold text-slate-400">Costo: ${g.costoTotal.toFixed(0)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DESCRIPCIÓN DEL TRABAJO */}
            <textarea
                disabled={estaBloqueado}
                placeholder="Descripción detallada del trabajo..."
                value={itemActual.trabajo}
                onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
            />

            {/* MANO DE OBRA / ENVÍO */}
            <div className="bg-slate-900 dark:bg-slate-800 p-5 rounded-2xl mb-5 shadow-inner">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {esPresupuesto ? 'Mano de Obra ($)' : 'Costo de Envío ($)'}
                </label>
                <input
                    disabled={estaBloqueado}
                    type="number" min="0"
                    value={itemActual.costoExtra}
                    onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1"
                />
            </div>

            {/* BOTÓN SUMAR AL TICKET */}
            {!estaBloqueado && (
                <button
                    onClick={agregarAlTicket}
                    className="w-full h-14 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
                >
                    SUMAR AL TICKET +
                </button>
            )}
        </>
    );
}