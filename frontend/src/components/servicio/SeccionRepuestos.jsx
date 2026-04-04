import React from 'react';
import Select from 'react-select';

export default function SeccionRepuestos({
    db, itemActual, setItemActual,
    repuestoElegido, setRepuestoElegido,
    esPresupuesto, estaBloqueado,
    selectStyles, sumarRepuesto,
    actualizarCantidad, quitarRepuesto,
    agregarAlTicket, calcularGananciaRepuesto,
}) {
    return (
        <>
            {/* BUSCADOR */}
            {!estaBloqueado && (
                <div className="flex gap-2 items-end mb-4">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">
                            Agregar repuesto — nombre o SKU
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
                                return option.data.nombre?.toLowerCase().includes(val) || option.data.sku?.toLowerCase().includes(val);
                            }}
                            formatOptionLabel={opt => (
                                <div className="flex justify-between items-center">
                                    <div>
                                        {opt.sku && <span className="text-[9px] font-black mr-2 uppercase" style={{ color: '#D13A28' }}>{opt.sku}</span>}
                                        <span className="font-bold text-sm">{opt.nombre}</span>
                                    </div>
                                    <span className="font-black text-xs" style={{ color: '#1E8A4A' }}>${opt.precio}</span>
                                </div>
                            )}
                            onChange={setRepuestoElegido}
                            value={repuestoElegido}
                            placeholder="Buscar por nombre o SKU..."
                        />
                    </div>
                    <button onClick={sumarRepuesto}
                        className="h-12 w-12 rounded-xl text-xl font-black text-white active:scale-90 transition-transform flex-shrink-0"
                        style={{ background: '#D13A28' }}>
                        +
                    </button>
                </div>
            )}

            {/* LISTA REPUESTOS */}
            {itemActual.repuestosUsados.length > 0 && (
                <div className="p-3 rounded-xl mb-4"
                     style={{ background: '#D8D4CE', border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    {itemActual.repuestosUsados.map((r, i) => {
                        const g = calcularGananciaRepuesto(r, r.cantidad);
                        return (
                            <div key={i} className="py-2.5"
                                 style={{ borderBottom: i < itemActual.repuestosUsados.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-[#1C1917] dark:text-[#F0EEE9]">{r.nombre}</p>
                                        <p className="text-[10px] text-[#A8A29E]">${r.precio} c/u</p>
                                    </div>
                                    <input disabled={estaBloqueado} type="number" min="1" value={r.cantidad}
                                        onChange={e => actualizarCantidad(i, e.target.value)}
                                        className="w-11 h-9 rounded-lg text-center font-black text-sm text-[#1C1917] dark:text-[#F0EEE9] mr-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07]"
                                    />
                                    <p className="font-black text-sm w-16 text-right text-[#1C1917] dark:text-[#F0EEE9]">
                                        ${g.subtotal.toLocaleString()}
                                    </p>
                                    {!estaBloqueado && (
                                        <button onClick={() => quitarRepuesto(i)} className="ml-3 text-rose-500 text-lg">✕</button>
                                    )}
                                </div>
                                {g.ganancia > 0 && (
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[9px] font-bold" style={{ color: '#1E8A4A' }}>Ganancia: ${g.ganancia.toFixed(0)}</span>
                                        <span className="text-[9px] text-[#A8A29E]">Margen: {g.margen}%</span>
                                        <span className="text-[9px] text-[#A8A29E]">Costo: ${g.costoTotal.toFixed(0)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DESCRIPCIÓN */}
            <textarea disabled={estaBloqueado}
                placeholder="Descripción detallada del trabajo..."
                value={itemActual.trabajo}
                onChange={e => setItemActual({ ...itemActual, trabajo: e.target.value })}
                className="w-full p-4 rounded-xl mb-4 text-sm font-medium text-[#1C1917] dark:text-[#F0EEE9] outline-none resize-none min-h-[100px] focus:ring-2 focus:ring-[#D13A28] bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07] placeholder-[#A8A29E]"
            />

            {/* MANO DE OBRA */}
            <div className="p-5 rounded-2xl mb-4 bg-[#1C1917] dark:bg-[#0F0F0F]">
                <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">
                    {esPresupuesto ? 'Mano de Obra ($)' : 'Costo de Envío ($)'}
                </label>
                <input disabled={estaBloqueado} type="number" min="0"
                    value={itemActual.costoExtra}
                    onChange={e => setItemActual({ ...itemActual, costoExtra: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-transparent border-none text-white text-4xl font-black outline-none mt-1"
                />
            </div>

            {/* BOTÓN SUMAR */}
            {!estaBloqueado && (
                <button onClick={agregarAlTicket}
                    className="w-full py-4 rounded-xl font-black text-sm text-white active:scale-[0.98] transition-all"
                    style={{ background: '#D13A28' }}>
                    Sumar al ticket +
                </button>
            )}
        </>
    );
}