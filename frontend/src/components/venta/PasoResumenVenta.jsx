import React from 'react';
import { Label, BackBtn, M } from '../servicio/ServicioUI';

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoResumenVenta({ hook, mostrador, onBack }) {
    const {
        productos, envioNum, subtotalProductos,
        descuentoPorcentaje, setDescuentoPorcentaje,
        descuentoMonto, totalFinal,
        leyenda, setLeyenda,
        guardarVenta, dispararPDF,
    } = hook;

    const textareaCls = `
        w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none resize-none
        bg-[#C0BCB6] dark:bg-[#2E2E2E]
        text-[#1C1917] dark:text-[#F0EEE9]
        border border-black/10 dark:border-white/10
        placeholder-[#A8A29E]
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/20
        transition-all
    `;

    return (
        <div className="flex flex-col gap-4 px-5 pb-36">

            {/* ── Resumen de productos ── */}
            <div>
                <Label>Resumen del pedido</Label>
                <div className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-[#EDEAE6] dark:bg-[#242424]">
                    {productos.map((p, i) => (
                        <div key={i} className="px-4 py-2.5 border-b border-black/[0.07] dark:border-white/[0.07] last:border-0 flex justify-between items-center">
                            <span className="text-[13px] font-medium text-[#1C1917] dark:text-[#F0EEE9]">
                                {p.cantidad}× {p.nombre}
                            </span>
                            <M valor={p.subtotal} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                        </div>
                    ))}
                    {envioNum > 0 && (
                        <div className="px-4 py-2.5 flex justify-between items-center">
                            <span className="text-[13px] font-medium text-[#A8A29E]">🚚 Envío</span>
                            <M valor={envioNum} className="text-[13px] font-black text-[#A8A29E]" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Descuento ── */}
            <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                <Label>Descuento (%)</Label>
                <div className="flex items-center gap-3 mb-3">
                    <input
                        type="number" min="0" max="100"
                        value={descuentoPorcentaje}
                        onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 h-12 rounded-xl text-center font-black text-2xl outline-none bg-[#C0BCB6] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/10 dark:border-white/[0.08] focus:border-[#D13A28] focus:ring-2 focus:ring-[#D13A28]/20"
                    />
                    <span className="font-black text-xl text-[#A8A29E]">%</span>
                    {descuentoPorcentaje > 0 && (
                        <div className="flex-1 text-right">
                            <p className="text-[10px] font-bold uppercase text-[#A8A29E]">Descuento</p>
                            <p className="text-lg font-black text-[#D13A28] dark:text-[#E8422F]">
                                -${descuentoMonto.toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {[5, 10, 15, 20].map(p => (
                        <button key={p} onClick={() => setDescuentoPorcentaje(p)}
                            className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                                descuentoPorcentaje === p
                                    ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                    : 'bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                            }`}>
                            {p}%
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Observaciones ── */}
            <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                <Label>Observaciones (opcional)</Label>
                <textarea
                    value={leyenda}
                    onChange={e => setLeyenda(e.target.value)}
                    placeholder="Ej: Sin cargo por envío, pago en cuotas..."
                    rows={3}
                    className={textareaCls}
                />
                <p className="text-[9px] mt-1.5 text-[#A8A29E]">Aparece al pie del PDF.</p>
            </div>

            <BackBtn onClick={onBack} />

            {/* ── Barra fija de confirmación ── */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3">
                <div className="p-4 rounded-2xl flex justify-between items-center shadow-2xl bg-[#1C1917] dark:bg-[#0F0F0F] border border-white/[0.06]">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#5C5954]">
                            Total final
                            {descuentoPorcentaje > 0 && (
                                <span className="text-[#F5796C] ml-1">(-{descuentoPorcentaje}%)</span>
                            )}
                        </p>
                        <M valor={totalFinal} className="text-3xl font-black text-white tracking-tighter block" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={dispararPDF}
                            className="h-11 px-3 rounded-xl font-bold text-[11px] text-white flex items-center gap-1.5 active:scale-90 bg-[#2E2E2E]">
                            📄 PDF
                        </button>
                        <button onClick={() => guardarVenta(false, mostrador.sedeId)}
                            className="h-11 px-4 rounded-xl font-black text-[11px] text-white active:scale-95 bg-[#2E2E2E]">
                            Pendiente
                        </button>
                        <button onClick={() => guardarVenta(true, mostrador.sedeId)}
                            className="h-11 px-5 rounded-xl font-black text-xs text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
