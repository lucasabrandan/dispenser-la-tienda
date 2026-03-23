import React from 'react';

/**
 * TicketResumen
 * Lista de items, panel de ganancia, descuento, leyenda y barra final.
 */
export default function TicketResumen({
    ticketItems,
    estaBloqueado, idEdicion, esPresupuesto,
    descuentoPorcentaje, setDescuentoPorcentaje,
    leyenda, setLeyenda,
    calcularGananciaRepuesto,
    calcularResumenGanancia,
    editarItem, eliminarItem,
    handleFinalizar, dispararPDF,
}) {
    if (ticketItems.length === 0) return null;

    const resumen        = calcularResumenGanancia();
    const totalBruto     = ticketItems.reduce((a, b) => a + b.totalCalculado, 0);
    const descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
    const totalFinal     = totalBruto - descuentoMonto;

    return (
        <>
            {/* DESCUENTO */}
            {!estaBloqueado && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mt-4 shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        Descuento (%)
                    </label>
                    <div className="flex items-center gap-3">
                        <input type="number" min="0" max="100" value={descuentoPorcentaje}
                            onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            className="w-24 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-black text-slate-400 text-xl">%</span>
                        {descuentoPorcentaje > 0 && (
                            <div className="flex-1 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Descuento</p>
                                <p className="text-lg font-black text-rose-500">- ${descuentoMonto.toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-3">
                        {[5, 10, 15, 20].map(p => (
                            <button key={p} onClick={() => setDescuentoPorcentaje(p)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                                    descuentoPorcentaje === p ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                {p}%
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ITEMS DEL TICKET */}
            <div className="mt-6 mb-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                    Resumen del Remito
                </h4>

                {ticketItems.map((it, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-3 shadow-sm flex justify-between items-start">
                        <div className="flex-1 pr-4">
                            <div className={`font-black text-sm tracking-tight ${
                                it.equipoSerial && it.equipoSerial !== 'MOSTRADOR' ? 'text-rose-500' : 'text-emerald-500'
                            }`}>
                                {it.equipoSerial && it.equipoSerial !== 'MOSTRADOR'
                                    ? `S/N: ${it.equipoSerial}`
                                    : 'Sin equipo registrado'}
                            </div>
                            <div className="text-xs mt-1.5 text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                                {it.resumenTexto}
                            </div>

                            {it.repuestosUsados?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {it.repuestosUsados.map((r, ri) => {
                                        const g = calcularGananciaRepuesto(r, r.cantidad);
                                        return (
                                            <div key={ri} className="flex justify-between text-[9px] font-bold text-slate-400">
                                                <span>{r.cantidad}x {r.nombre}</span>
                                                {g.ganancia > 0 && <span className="text-emerald-500">+${g.ganancia.toFixed(0)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="text-2xl font-black mt-3 text-slate-900 dark:text-white tracking-tighter">
                                ${it.totalCalculado.toLocaleString()}
                            </div>
                        </div>

                        {!estaBloqueado && (
                            <div className="flex flex-col gap-2 shrink-0">
                                <button onClick={() => editarItem(idx)}
                                    className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl font-black text-[10px] uppercase">
                                    Editar
                                </button>
                                <button onClick={() => eliminarItem(idx)}
                                    className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 p-2.5 rounded-xl font-black text-[10px] uppercase">
                                    Quitar
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* PANEL GANANCIA */}
                {resumen.gananciaBruta > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mt-2">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">📊 Rentabilidad del Remito</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Total Venta</p>
                                <p className="font-black text-slate-800 dark:text-white">${resumen.totalVenta.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Costo Total</p>
                                <p className="font-black text-slate-800 dark:text-white">${resumen.totalCosto.toFixed(0)}</p>
                            </div>
                            {resumen.descuento > 0 && (
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Descuento {descuentoPorcentaje}%</p>
                                    <p className="font-black text-rose-500">- ${resumen.descuento.toFixed(0)}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Ganancia Neta</p>
                                <p className="font-black text-emerald-600 text-lg">${resumen.gananciaBruta.toFixed(0)}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Margen Final</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full"
                                            style={{ width: `${Math.min(100, resumen.margenFinal)}%` }} />
                                    </div>
                                    <span className="font-black text-emerald-600 text-sm">{resumen.margenFinal}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* LEYENDA / OBSERVACIONES */}
            {!estaBloqueado && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-4 shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                        Observaciones / Condiciones (opcional)
                    </label>
                    <textarea
                        value={leyenda}
                        onChange={e => setLeyenda(e.target.value)}
                        placeholder="Ej: Forma de pago: 50% adelanto, 50% al finalizar. Validez del presupuesto: 15 días. El trabajo incluye traslado al local. Garantía 90 días sobre mano de obra..."
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                    />
                    <p className="text-[9px] text-slate-400 font-bold mt-1.5">
                        Este texto aparecerá al final del PDF generado.
                    </p>
                </div>
            )}

            {/* BARRA FINAL */}
            <div className="fixed bottom-[100px] left-4 right-4 z-[1000]">
                <div className="bg-slate-900 dark:bg-slate-800 p-4 pl-6 pr-4 rounded-3xl flex justify-between items-center shadow-2xl border border-slate-700">
                    <div className="text-white">
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                            Total Final{' '}
                            {descuentoPorcentaje > 0 && <span className="text-rose-400">(-{descuentoPorcentaje}%)</span>}
                        </div>
                        <div className="text-3xl font-black tracking-tighter">${totalFinal.toLocaleString()}</div>
                        {descuentoPorcentaje > 0 && (
                            <div className="text-[9px] text-slate-500 line-through">${totalBruto.toLocaleString()}</div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={dispararPDF}
                            className="bg-slate-700 text-white w-14 h-14 rounded-2xl text-2xl flex items-center justify-center active:scale-90 transition-transform">
                            📄
                        </button>
                        {!estaBloqueado && (
                            <>
                                <button onClick={() => handleFinalizar(false)}
                                    className="bg-slate-700 text-white px-4 rounded-2xl font-black text-[11px] active:scale-95 transition-transform">
                                    {idEdicion ? 'Actualizar' : 'Guardar'}
                                </button>
                                <button onClick={() => handleFinalizar(true)}
                                    className={`px-6 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all ${
                                        esPresupuesto ? 'bg-rose-500' : 'bg-emerald-500'
                                    }`}>
                                    Confirmar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}