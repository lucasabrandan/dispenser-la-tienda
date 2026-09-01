import React, { useState } from 'react';
import { Label, BackBtn, M } from '../servicio/ServicioUI';
import { useAuth } from '../../context/AuthContext';
import { LuTruck, LuFileText } from 'react-icons/lu';

// ── Panel de rentabilidad discreta (solo admin) ──────────────────────────────
// Mismo panel que ya tiene Servicio (PasoResumen.jsx) — se duplica en vez de
// extraerse a un componente compartido porque la forma del desglose es distinta
// (Servicio anida repuestos dentro de ticketItems, Venta tiene "productos" plano),
// mismo criterio ya usado en el proyecto para no forzar una abstracción prematura
// entre estructuras de datos distintas.
function RentabilidadPanel({ resumen, desglose, onEditarCosto }) {
    const [abierto, setAbierto] = useState(false);
    if (resumen.gananciaBruta <= 0) return null;

    return (
        <div>
            <button onClick={() => setAbierto(!abierto)}
                className="w-full flex items-center justify-between py-2 px-0 transition-all active:scale-[0.99] dark:hidden">
                <span className="text-label font-semibold tracking-wide text-[#A8855A]">Ver rentabilidad de la venta</span>
                <span className={`text-label text-[#A8855A] transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>▾</span>
            </button>
            <button onClick={() => setAbierto(!abierto)}
                className="hidden dark:flex items-center gap-2 py-2 px-0 transition-all active:scale-[0.99]">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200 ${abierto ? 'bg-[#5DD68F]' : 'bg-[#5C5954]'}`} />
                <span className={`text-label font-medium transition-colors duration-200 ${abierto ? 'text-[#9E9A94]' : 'text-[#5C5954]'}`}>
                    rentabilidad de la venta
                </span>
            </button>

            {abierto && (
                <>
                    <div className="dark:hidden mt-1 rounded-xl overflow-hidden border border-[#A8855A]/20">
                        <div className="p-3 bg-[#FFF4D6]/60">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {[
                                    { label: 'Venta',    val: resumen.totalVenta,    green: false },
                                    { label: 'Costo',    val: resumen.totalCosto,    green: false },
                                    { label: 'Ganancia', val: resumen.gananciaBruta, green: true  },
                                    { label: 'Margen',   val: null, pct: resumen.margenFinal, green: true },
                                ].map((item, i) => (
                                    <div key={i} className="bg-[#A8855A]/10 rounded-lg px-3 py-2">
                                        <p className="text-label uppercase tracking-wide font-bold text-[#A8855A] mb-1">{item.label}</p>
                                        {item.pct !== undefined
                                            ? <p className="text-body-lg font-black text-[#5C3D00]">{item.pct}%</p>
                                            : <M valor={Math.round(item.val)} className={`text-body-lg font-black ${item.green ? 'text-[#5C3D00]' : 'text-[#1C1917]'}`} />
                                        }
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="flex justify-between text-label text-[#A8855A] mb-1">
                                    <span>Margen</span><span>{resumen.margenFinal}%</span>
                                </div>
                                <div className="h-1 rounded-full bg-[#A8855A]/15 overflow-hidden">
                                    <div className="h-full rounded-full bg-[#C47A00] transition-all"
                                         style={{ width: `${Math.min(100, parseFloat(resumen.margenFinal))}%` }} />
                                </div>
                            </div>
                            {desglose.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-[#A8855A]/20">
                                    <p className="text-label uppercase tracking-wide font-bold text-[#A8855A] mb-2">Desglose por producto</p>
                                    <div className="space-y-2">
                                        {desglose.map(d => (
                                            <div key={d.key} className="bg-[#A8855A]/10 rounded-lg px-3 py-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-caption font-bold text-[#1C1917] truncate">{d.repuesto.nombre}</p>
                                                    <p className="text-caption text-[#A8855A] shrink-0">{d.repuesto.cantidad} u.</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-label text-[#A8855A]">Costo</span>
                                                        <input type="text" inputMode="decimal"
                                                            value={d.repuesto.costo ?? ''}
                                                            onChange={e => onEditarCosto(d.idx, e.target.value)}
                                                            className="w-16 h-7 rounded-md text-center text-caption font-bold bg-white border border-[#A8855A]/30 text-[#1C1917] outline-none focus:border-[#A8855A]" />
                                                    </div>
                                                    <p className="text-caption font-black text-[#5C3D00]">
                                                        <M valor={Math.round(d.ganancia.ganancia)} /> &middot; {d.ganancia.margen}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-caption text-muted mt-2">Solo visible para vos.</p>
                        </div>
                    </div>
                    <div className="hidden dark:block mt-1 rounded-xl p-3 bg-[#0D2E1C] border border-[#2A9D5C]/20">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {[
                                { label: 'Venta',    val: resumen.totalVenta,    green: false },
                                { label: 'Costo',    val: resumen.totalCosto,    green: false },
                                { label: 'Ganancia', val: resumen.gananciaBruta, green: true  },
                                { label: 'Margen',   val: null, pct: resumen.margenFinal, green: true },
                            ].map((item, i) => (
                                <div key={i}>
                                    <p className="text-label uppercase tracking-wide font-bold text-[#5C5954] mb-1">{item.label}</p>
                                    {item.pct !== undefined
                                        ? <p className={`text-body-lg font-black ${item.green ? 'text-[#5DD68F]' : 'text-[#F0EEE9]'}`}>{item.pct}%</p>
                                        : <M valor={Math.round(item.val)} className={`text-body-lg font-black ${item.green ? 'text-[#5DD68F]' : 'text-[#F0EEE9]'}`} />
                                    }
                                </div>
                            ))}
                        </div>
                        <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-[#2A9D5C]"
                                 style={{ width: `${Math.min(100, parseFloat(resumen.margenFinal))}%` }} />
                        </div>
                        {desglose.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#2A9D5C]/20">
                                <p className="text-label uppercase tracking-wide font-bold text-[#5C5954] mb-2">Desglose por producto</p>
                                <div className="space-y-2">
                                    {desglose.map(d => (
                                        <div key={d.key} className="bg-white/[0.03] rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-caption font-bold text-[#F0EEE9] truncate">{d.repuesto.nombre}</p>
                                                <p className="text-caption text-[#5C5954] shrink-0">{d.repuesto.cantidad} u.</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-label text-[#5C5954]">Costo</span>
                                                    <input type="text" inputMode="decimal"
                                                        value={d.repuesto.costo ?? ''}
                                                        onChange={e => onEditarCosto(d.idx, e.target.value)}
                                                        className="w-16 h-7 rounded-md text-center text-caption font-bold bg-[#141414] border border-[#2A9D5C]/30 text-[#F0EEE9] outline-none focus:border-[#2A9D5C]" />
                                                </div>
                                                <p className="text-caption font-black text-[#5DD68F]">
                                                    <M valor={Math.round(d.ganancia.ganancia)} /> &middot; {d.ganancia.margen}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoResumenVenta({ hook, mostrador, onBack }) {
    const {
        productos, envioNum, subtotalProductos,
        descuentoPorcentaje, setDescuentoPorcentaje,
        descuentoMonto, totalFinal,
        leyenda, setLeyenda,
        calcularGananciaRepuesto, calcularResumenGanancia, editarCostoProducto,
        guardarVenta, dispararPDF,
    } = hook;

    const { esAdmin } = useAuth();
    const resumen = calcularResumenGanancia();
    // Desglose por producto para el panel de rentabilidad — mismo criterio que
    // Servicio (PasoResumen.jsx): el costo editado acá se guarda de verdad en
    // "productos", no es una simulación, viaja como costo real al confirmar.
    const desglose = productos.map((p, idx) => ({
        key: p.id ?? idx,
        idx,
        repuesto: p,
        ganancia: calcularGananciaRepuesto(p, p.cantidad),
    }));

    const textareaCls = `
        w-full block px-3.5 py-2.5 rounded-xl text-body font-medium outline-none resize-none
        bg-chip
        text-ink
        border border-black/10 dark:border-white/10
        placeholder-muted
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/20
        transition-all
    `;

    return (
        <div className="flex flex-col gap-4 px-5 pb-36">

            {/* ── Resumen de productos ── */}
            <div>
                <Label>Resumen del pedido</Label>
                <div className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07] bg-card">
                    {productos.map((p, i) => (
                        <div key={i} className="px-4 py-2.5 border-b border-black/[0.07] dark:border-white/[0.07] last:border-0 flex justify-between items-center">
                            <span className="text-body font-medium text-ink">
                                {p.cantidad}× {p.nombre}
                            </span>
                            <M valor={p.subtotal} className="text-body font-black text-ink" />
                        </div>
                    ))}
                    {envioNum > 0 && (
                        <div className="px-4 py-2.5 flex justify-between items-center">
                            <span className="text-body font-medium text-muted flex items-center gap-1"><LuTruck size={13} /> Envío</span>
                            <M valor={envioNum} className="text-body font-black text-muted" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Descuento ── */}
            <div className="rounded-2xl p-4 bg-card border border-black/[0.07] dark:border-white/[0.07]">
                <Label>Descuento (%)</Label>
                <div className="flex items-center gap-3 mb-3">
                    <input
                        type="text" inputMode="decimal"
                        value={descuentoPorcentaje}
                        onChange={e => setDescuentoPorcentaje(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="w-20 h-12 rounded-xl text-center font-black text-2xl outline-none bg-[#E8E5E0] dark:bg-[#1C1C1C] text-ink border border-black/10 dark:border-white/[0.08] focus:border-[#D13A28] focus:ring-2 focus:ring-[#D13A28]/20"
                    />
                    <span className="font-black text-xl text-muted">%</span>
                    {descuentoPorcentaje > 0 && (
                        <div className="flex-1 text-right">
                            <p className="text-label font-bold uppercase text-muted">Descuento</p>
                            <p className="text-lg font-black text-brand-red">
                                -${Math.round(descuentoMonto).toLocaleString('es-AR')}
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {[5, 10, 15, 20].map(p => (
                        <button key={p} onClick={() => setDescuentoPorcentaje(p)}
                            className={`flex-1 py-2 rounded-xl text-label font-bold transition-all active:scale-95 ${
                                descuentoPorcentaje === p
                                    ? 'bg-brand-red text-white'
                                    : 'bg-chip text-secondary'
                            }`}>
                            {p}%
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Rentabilidad — solo admin (mismo criterio que Servicio: sin card
                propia, el panel se muestra colapsado como un link chico) ── */}
            {esAdmin && <RentabilidadPanel resumen={resumen} desglose={desglose} onEditarCosto={editarCostoProducto} />}

            {/* ── Observaciones ── */}
            <div className="rounded-2xl p-4 bg-card border border-black/[0.07] dark:border-white/[0.07]">
                <Label>Observaciones (opcional)</Label>
                <textarea
                    value={leyenda}
                    onChange={e => setLeyenda(e.target.value)}
                    placeholder="Ej: Sin cargo por envío, pago en cuotas..."
                    rows={3}
                    className={textareaCls}
                />
                <p className="text-caption mt-1.5 text-muted">Aparece al pie del PDF.</p>
            </div>

            <BackBtn onClick={onBack} />

            {/* ── Barra fija de confirmación ── */}
            <div className="hide-on-keyboard fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3">
                <div className="p-4 rounded-2xl shadow-2xl bg-[#1C1917] dark:bg-[#0F0F0F] border border-white/[0.06]">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="text-label font-bold uppercase tracking-widest text-[#5C5954]">
                                Total final
                                {descuentoPorcentaje > 0 && (
                                    <span className="text-[#F5796C] ml-1">(-{descuentoPorcentaje}%)</span>
                                )}
                            </p>
                            <M valor={totalFinal} className="text-3xl font-black text-white tracking-tighter block" />
                        </div>
                        <button onClick={dispararPDF}
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white active:scale-90 bg-[#2E2E2E] shrink-0">
                            <LuFileText size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => guardarVenta(false, mostrador.sedeId)}
                            className="h-11 rounded-xl font-black text-label text-white active:scale-95 bg-[#2E2E2E]">
                            Pendiente
                        </button>
                        <button onClick={() => guardarVenta(true, mostrador.sedeId)}
                            className="h-11 rounded-xl font-black text-label text-white active:scale-95 bg-brand-red">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
