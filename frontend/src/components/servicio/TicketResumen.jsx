import React from 'react';
import { useMontos } from '../../context/MontosContext';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
}

export default function TicketResumen({
    ticketItems,
    estaBloqueado, idEdicion, esPresupuesto,
    descuentoPorcentaje, setDescuentoPorcentaje,
    leyenda, setLeyenda,
    calcularGananciaRepuesto, calcularResumenGanancia,
    editarItem, eliminarItem,
    handleFinalizar, dispararPDF,
}) {
    if (ticketItems.length === 0) return null;

    const resumen        = calcularResumenGanancia();
    const totalBruto     = ticketItems.reduce((a, b) => a + b.totalCalculado, 0);
    const descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
    const totalFinal     = totalBruto - descuentoMonto;

    const cardCls = "rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424]";
    const borderSt = { border: '0.5px solid rgba(0,0,0,0.07)' };
    const inputCls = "p-3 rounded-xl text-sm font-medium text-[#1C1917] dark:text-[#F0EEE9] outline-none bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07] focus:ring-2 focus:ring-[#D13A28] placeholder-[#A8A29E]";

    return (
        <>
            {/* ── DESCUENTO ─────────────────────────────────────────────── */}
            {!estaBloqueado && (
                <div className={`${cardCls} mt-4`} style={borderSt}>
                    <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-3">
                        Descuento (%)
                    </label>
                    <div className="flex items-center gap-3">
                        <input type="number" min="0" max="100" value={descuentoPorcentaje}
                            onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                            className={`${inputCls} w-20 h-12 text-center font-black text-2xl`}
                        />
                        <span className="font-black text-[#A8A29E] text-xl">%</span>
                        {descuentoPorcentaje > 0 && (
                            <div className="flex-1 text-right">
                                <p className="text-[10px] font-bold text-[#A8A29E] uppercase">Descuento</p>
                                <p className="text-lg font-black" style={{ color: '#D13A28' }}>
                                    - ${descuentoMonto.toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-3">
                        {[5, 10, 15, 20].map(p => (
                            <button key={p} onClick={() => setDescuentoPorcentaje(p)}
                                className="flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all active:scale-95"
                                style={descuentoPorcentaje === p
                                    ? { background: '#D13A28', color: '#fff' }
                                    : { background: '#C0BCB6', color: '#57534E' }
                                }>
                                {p}%
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── ITEMS DEL TICKET ──────────────────────────────────────── */}
            <div className="mt-4 mb-4">
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-3 px-1">
                    Resumen del remito
                </p>

                {ticketItems.map((it, idx) => (
                    <div key={idx} className={`${cardCls} mb-3 flex justify-between items-start`} style={borderSt}>
                        <div className="flex-1 pr-4">
                            <p className="font-black text-sm tracking-tight"
                               style={{ color: it.equipoSerial && it.equipoSerial !== 'MOSTRADOR' ? '#D13A28' : '#1E8A4A' }}>
                                {it.equipoSerial && it.equipoSerial !== 'MOSTRADOR'
                                    ? `S/N: ${it.equipoSerial}`
                                    : 'Sin equipo registrado'}
                            </p>
                            <p className="text-xs mt-1 text-[#57534E] dark:text-[#9E9A94] leading-relaxed font-medium">
                                {it.resumenTexto}
                            </p>

                            {it.repuestosUsados?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {it.repuestosUsados.map((r, ri) => {
                                        const g = calcularGananciaRepuesto(r, r.cantidad);
                                        return (
                                            <div key={ri} className="flex justify-between text-[9px] font-bold text-[#A8A29E]">
                                                <span>{r.cantidad}x {r.nombre}</span>
                                                {g.ganancia > 0 && <span style={{ color: '#1E8A4A' }}>+${g.ganancia.toFixed(0)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <M valor={it.totalCalculado}
                               className="text-2xl font-black mt-3 text-[#1C1917] dark:text-[#F0EEE9] block tracking-tighter" />
                        </div>

                        {!estaBloqueado && (
                            <div className="flex flex-col gap-2 shrink-0">
                                <button onClick={() => editarItem(idx)}
                                    className="px-3 py-2 rounded-xl font-bold text-[10px] uppercase active:scale-95"
                                    style={{ background: '#FDECEA', color: '#B02E1E' }}>
                                    Editar
                                </button>
                                <button onClick={() => eliminarItem(idx)}
                                    className="px-3 py-2 rounded-xl font-bold text-[10px] uppercase active:scale-95 bg-rose-100 text-rose-600">
                                    Quitar
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* PANEL GANANCIA — solo visible si hay margen positivo */}
                {resumen.gananciaBruta > 0 && (
                    <div className="rounded-2xl p-4 mt-2"
                         style={{ background: '#0D2E1C', border: '0.5px solid rgba(42,157,92,0.3)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                           style={{ color: '#5DD68F' }}>
                            Rentabilidad del remito
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[9px] font-bold text-[#A8A29E] uppercase">Total venta</p>
                                <M valor={resumen.totalVenta} className="font-black text-[#F0EEE9]" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-[#A8A29E] uppercase">Costo total</p>
                                <span className="font-black text-[#F0EEE9]">${resumen.totalCosto.toFixed(0)}</span>
                            </div>
                            {resumen.descuento > 0 && (
                                <div>
                                    <p className="text-[9px] font-bold text-[#A8A29E] uppercase">Descuento {descuentoPorcentaje}%</p>
                                    <span className="font-black" style={{ color: '#F5796C' }}>- ${resumen.descuento.toFixed(0)}</span>
                                </div>
                            )}
                            <div>
                                <p className="text-[9px] font-bold text-[#A8A29E] uppercase">Ganancia neta</p>
                                <span className="font-black text-lg" style={{ color: '#5DD68F' }}>
                                    ${resumen.gananciaBruta.toFixed(0)}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <p className="text-[9px] font-bold text-[#A8A29E] uppercase mb-1">Margen final</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, resumen.margenFinal)}%`, background: '#2A9D5C' }} />
                                    </div>
                                    <span className="font-black text-sm" style={{ color: '#5DD68F' }}>{resumen.margenFinal}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── LEYENDA ───────────────────────────────────────────────── */}
            {!estaBloqueado && (
                <div className={`${cardCls} mb-4`} style={borderSt}>
                    <label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">
                        Observaciones / Condiciones (opcional)
                    </label>
                    <textarea value={leyenda} onChange={e => setLeyenda(e.target.value)}
                        placeholder="Ej: Forma de pago: 50% adelanto, 50% al finalizar. Garantía 90 días sobre mano de obra..."
                        className={`${inputCls} w-full resize-none min-h-[100px]`}
                    />
                    <p className="text-[9px] text-[#A8A29E] mt-1.5">Este texto aparecerá al final del PDF generado.</p>
                </div>
            )}

            {/* ── BARRA FINAL FIJA ─────────────────────────────────────── */}
            <div className="fixed bottom-[72px] left-3 right-3 z-[1000]">
                <div className="p-4 pl-5 pr-4 rounded-2xl flex justify-between items-center shadow-2xl bg-[#1C1917] dark:bg-[#0F0F0F]"
                     style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <div>
                        <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest">
                            Total final{' '}
                            {descuentoPorcentaje > 0 && <span style={{ color: '#F5796C' }}>(-{descuentoPorcentaje}%)</span>}
                        </p>
                        <M valor={totalFinal} className="text-3xl font-black text-white tracking-tighter block" />
                        {descuentoPorcentaje > 0 && (
                            <p className="text-[10px] text-[#5C5954] line-through">${totalBruto.toLocaleString()}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={dispararPDF}
                            className="w-12 h-12 rounded-xl text-xl flex items-center justify-center active:scale-90 transition-transform bg-[#2E2E2E]">
                            📄
                        </button>
                        {!estaBloqueado && (
                            <>
                                <button onClick={() => handleFinalizar(false)}
                                    className="h-12 px-4 rounded-xl font-black text-[11px] text-white active:scale-95 bg-[#2E2E2E]">
                                    {idEdicion ? 'Actualizar' : 'Guardar'}
                                </button>
                                <button onClick={() => handleFinalizar(true)}
                                    className="h-12 px-5 rounded-xl font-black text-xs text-white active:scale-95"
                                    style={{ background: esPresupuesto ? '#D13A28' : '#1E8A4A' }}>
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