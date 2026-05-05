import React, { useState, useEffect } from 'react';
import { Label, BackBtn, M, DSCard } from './ServicioUI';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// ── Panel de rentabilidad discreto ───────────────────────────────────────────
// Light: texto dorado "Ver rentabilidad" con chevron
// Dark:  puntito gris casi invisible
function RentabilidadPanel({ resumen, descuentoPorcentaje }) {
    const [abierto, setAbierto] = useState(false);

    if (resumen.gananciaBruta <= 0) return null;

    return (
        <div>
            {/* ── LIGHT: trigger dorado con chevron ── */}
            <button
                onClick={() => setAbierto(!abierto)}
                className="
                    w-full flex items-center justify-between py-2.5 px-0
                    transition-all active:scale-[0.99]
                    dark:hidden
                "
            >
                <span className="text-[11px] font-semibold tracking-wide text-[#A8855A]">
                    Ver rentabilidad del ticket
                </span>
                <span className={`text-[10px] text-[#A8855A] transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}>
                    ▾
                </span>
            </button>

            {/* ── DARK: puntito + texto muted ── */}
            <button
                onClick={() => setAbierto(!abierto)}
                className="
                    hidden dark:flex items-center gap-2 py-2.5 px-0
                    transition-all active:scale-[0.99]
                "
            >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200 ${abierto ? 'bg-[#5DD68F]' : 'bg-[#5C5954]'}`} />
                <span className={`text-[11px] font-medium transition-colors duration-200 ${abierto ? 'text-[#9E9A94]' : 'text-[#5C5954]'}`}>
                    rentabilidad del ticket
                </span>
            </button>

            {/* ── Panel expandido — LIGHT ── */}
            {abierto && (
                <div className="dark:hidden mt-1 rounded-xl overflow-hidden border border-[#A8855A]/20">
                    <div className="p-3 bg-[#FFF4D6]/60">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {[
                                { label: 'Venta',    val: resumen.totalVenta,   green: false },
                                { label: 'Costo',    val: resumen.totalCosto,   green: false },
                                { label: 'Ganancia', val: resumen.gananciaBruta, green: true },
                                { label: 'Margen',   val: null, pct: resumen.margenFinal, green: true },
                            ].map((item, i) => (
                                <div key={i} className="bg-[#A8855A]/10 rounded-lg px-3 py-2">
                                    <p className="text-[9px] uppercase tracking-wide font-bold text-[#A8855A] mb-1">{item.label}</p>
                                    {item.pct !== undefined
                                        ? <p className="text-[14px] font-black text-[#5C3D00]">{item.pct}%</p>
                                        : <M valor={Math.round(item.val)} className={`text-[14px] font-black ${item.green ? 'text-[#5C3D00]' : 'text-[#1C1917]'}`} />
                                    }
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="flex justify-between text-[9px] text-[#A8855A] mb-1">
                                <span>Margen</span><span>{resumen.margenFinal}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-[#A8855A]/15 overflow-hidden">
                                <div className="h-full rounded-full bg-[#C47A00] transition-all"
                                     style={{ width: `${Math.min(100, parseFloat(resumen.margenFinal))}%` }} />
                            </div>
                        </div>
                        <p className="text-[9px] text-[#A8A29E] mt-2">Solo visible para vos.</p>
                    </div>
                </div>
            )}

            {/* ── Panel expandido — DARK ── */}
            {abierto && (
                <div className="hidden dark:block mt-1 rounded-xl p-3 bg-[#0D2E1C] border border-[#2A9D5C]/20">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {[
                            { label: 'Venta',    val: resumen.totalVenta,    green: false },
                            { label: 'Costo',    val: resumen.totalCosto,    green: false },
                            { label: 'Ganancia', val: resumen.gananciaBruta, green: true },
                            { label: 'Margen',   val: null, pct: resumen.margenFinal, green: true },
                        ].map((item, i) => (
                            <div key={i}>
                                <p className="text-[9px] uppercase tracking-wide font-bold text-[#5C5954] mb-1">{item.label}</p>
                                {item.pct !== undefined
                                    ? <p className={`text-[14px] font-black ${item.green ? 'text-[#5DD68F]' : 'text-[#F0EEE9]'}`}>{item.pct}%</p>
                                    : <M valor={Math.round(item.val)} className={`text-[14px] font-black ${item.green ? 'text-[#5DD68F]' : 'text-[#F0EEE9]'}`} />
                                }
                            </div>
                        ))}
                    </div>
                    <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#2A9D5C]"
                             style={{ width: `${Math.min(100, parseFloat(resumen.margenFinal))}%` }} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PasoResumen({ hook, onBack, onGuardar, onConfirmar, dispararPDF, modoEjecucion = false }) {
    const {
        ticketItems,
        descuentoPorcentaje, setDescuentoPorcentaje,
        leyenda, setLeyenda,
        calcularGananciaRepuesto, calcularResumenGanancia,
        idEdicion, eliminarItem,
        tecnicoSeleccionado, setTecnicoSeleccionado,
    } = hook;

    const { esAdmin } = useAuth();
    const [tecnicos, setTecnicos] = useState([]);

    useEffect(() => {
        if (esAdmin) {
            api.get('/admin/usuarios')
                .then(r => setTecnicos((r.data || []).filter(u => u.activo)))
                .catch(() => {});
        }
    }, [esAdmin]);

    const resumen        = calcularResumenGanancia();
    const totalBruto     = ticketItems.reduce((a, b) => a + b.totalCalculado, 0);
    const descuentoMonto = Math.round((totalBruto * descuentoPorcentaje) / 100);
    const totalFinal     = totalBruto - descuentoMonto;

    const inputCls = `
        w-full block px-3.5 py-2.5 rounded-xl text-[13px] font-medium outline-none
        bg-[#C0BCB6] dark:bg-[#1C1C1C]
        text-[#1C1917] dark:text-[#F0EEE9]
        border border-black/10 dark:border-white/[0.08]
        placeholder-[#A8A29E]
        focus:border-[#D13A28] dark:focus:border-[#E8422F]
        focus:ring-2 focus:ring-[#D13A28]/20
        transition-all resize-none
    `;

    return (
        <div className="flex flex-col gap-4 px-5 pb-36">

            {/* ── Equipos ──────────────────────────────────────────────── */}
            <div>
                <Label>Equipos en el ticket</Label>
                <div className="flex flex-col gap-2">
                    {ticketItems.map((it, idx) => (
                        <div key={idx} className="rounded-2xl overflow-hidden bg-[#D8D4CE] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                            <div className="p-4 flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-black text-[13px] text-[#D13A28] dark:text-[#E8422F]">
                                        {it.equipoSerial && it.equipoSerial !== 'SIN-SN' ? `S/N: ${it.equipoSerial}` : 'Sin S/N'}
                                    </p>
                                    <p className="text-[11px] mt-1 text-[#57534E] dark:text-[#9E9A94] leading-relaxed">
                                        {it.resumenTexto}
                                    </p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="mt-1.5 space-y-0.5">
                                            {it.repuestosUsados.map((r, ri) => {
                                                const g = calcularGananciaRepuesto(r, r.cantidad);
                                                return (
                                                    <div key={ri} className="flex justify-between text-[10px]">
                                                        <span className="text-[#A8A29E]">{r.cantidad}x {r.nombre}</span>
                                                        {g.ganancia > 0 && <span className="text-[#1E8A4A]">+${Math.round(g.ganancia)}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <M valor={it.totalCalculado} className="text-[18px] font-black block text-[#1C1917] dark:text-[#F0EEE9]" />
                                    <button onClick={() => eliminarItem(idx)}
                                        className="text-[10px] mt-1 font-bold text-rose-500 hover:text-rose-600">
                                        Quitar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Descuento ─────────────────────────────────────────────── */}
            <DSCard>
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
                            <p className="text-lg font-black text-[#D13A28] dark:text-[#E8422F]">-${descuentoMonto.toLocaleString()}</p>
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
            </DSCard>

            {/* ── Rentabilidad discreta ─────────────────────────────────── */}
            <RentabilidadPanel resumen={resumen} descuentoPorcentaje={descuentoPorcentaje} />

            {/* ── Técnico (solo admin) ──────────────────────────────────── */}
            {esAdmin && tecnicos.length > 0 && (
                <DSCard>
                    <Label>Técnico responsable</Label>
                    <select
                        value={tecnicoSeleccionado?.id || ''}
                        onChange={e => {
                            const t = tecnicos.find(u => u.id === Number(e.target.value));
                            setTecnicoSeleccionado(t ? { id: t.id, nombre: t.nombre } : null);
                        }}
                        className={inputCls}
                    >
                        <option value=''>— Yo mismo (admin) —</option>
                        {tecnicos.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre} · {t.rol === 'ADMIN' ? 'Admin' : 'Técnico'}</option>
                        ))}
                    </select>
                    {tecnicoSeleccionado && (
                        <p className="text-[10px] mt-1.5 font-bold text-[#D48800] dark:text-[#F0A500]">
                            El servicio se registrará a nombre de {tecnicoSeleccionado.nombre}
                        </p>
                    )}
                </DSCard>
            )}

            {/* ── Observaciones ─────────────────────────────────────────── */}
            <DSCard>
                <Label>Observaciones (opcional)</Label>
                <textarea
                    value={leyenda}
                    onChange={e => setLeyenda(e.target.value)}
                    placeholder="Ej: Garantía 90 días sobre MO, 50% adelanto..."
                    rows={3}
                    className={inputCls}
                />
                <p className="text-[9px] mt-1.5 text-[#A8A29E]">Aparece al pie del PDF.</p>
            </DSCard>

            <BackBtn onClick={onBack} />

            {/* ── Barra fija ────────────────────────────────────────────── */}
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
                            className="w-11 h-11 rounded-xl text-lg flex items-center justify-center active:scale-90 bg-[#2E2E2E]">
                            📄
                        </button>
                        {!modoEjecucion && (
                            <button onClick={onGuardar}
                                className="h-11 px-4 rounded-xl font-black text-[11px] text-white active:scale-95 bg-[#2E2E2E]">
                                {idEdicion ? 'Actualizar' : 'Guardar'}
                            </button>
                        )}
                        <button onClick={onConfirmar}
                            className="h-11 px-5 rounded-xl font-black text-xs text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">
                            {modoEjecucion ? '✓ Confirmar trabajo' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}