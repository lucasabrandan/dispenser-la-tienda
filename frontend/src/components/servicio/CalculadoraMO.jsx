import React, { useState, useMemo } from 'react';

export default function CalculadoraMO({ desglose, esVisita, pctIVA, itemActual, setItemActual }) {
    const [abierto, setAbierto] = useState(false);
    const [modoReverso, setModoReverso] = useState(false);
    const [gananciaDeseada, setGananciaDeseada] = useState('');
    const divisor = esVisita ? 1 : 2;

    // Reverso: "quiero ganar X" -> calcula precio con IVA
    const reverso = useMemo(() => {
        const deseada = parseFloat(gananciaDeseada) || 0;
        if (deseada <= 0) return null;
        const netoTotal = deseada * divisor;
        const precioConIVA = Math.round(netoTotal * (1 + pctIVA / 100));
        return { precioConIVA, netoTotal };
    }, [gananciaDeseada, pctIVA, divisor]);

    if (desglose.precioCliente <= 0) return null;

    return (
        <>
            <button type="button" onClick={() => setAbierto(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold bg-chip text-secondary active:scale-[0.98] transition-all">
                <span>🧮 Calculadora</span>
                <span className="text-[10px]">{abierto ? '▲' : '▼'}</span>
            </button>
            {abierto && (
                <div className="p-3 rounded-xl bg-[#E8E5E0]/50 dark:bg-[#2E2E2E]/50 space-y-3">
                    <div className="p-3 rounded-xl bg-[#FFFFFF]/50 dark:bg-[#242424]/50 space-y-1.5">
                        <p className="text-[9px] font-black text-muted uppercase mb-1">Al cliente</p>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-secondary">Con factura (IVA inc.)</span>
                            <span className="font-black text-[#8B5CF6]">${desglose.facturaCliente.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-secondary">Efectivo sin factura</span>
                            <span className="font-black text-[#16A34A]">${desglose.efectivoTotal.toLocaleString('es-AR')} <span className="text-[9px] opacity-60">(-21%)</span></span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#D48800]/10 space-y-1.5">
                        <p className="text-[9px] font-black text-[#D48800] uppercase mb-1">{esVisita ? 'Te queda' : 'Cada técnico'}</p>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-[#D48800]">Efectivo</span>
                            <span className="font-black text-[#D48800]">${desglose.efectivoCada.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-[#D48800]">Factura</span>
                            <span className="font-black text-[#D48800]">${desglose.facturaCada.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                    <button type="button" onClick={() => setModoReverso(!modoReverso)}
                        className="text-[10px] font-black text-brand-amber uppercase">
                        {modoReverso ? '▲ Cerrar' : '▼ Quiero ganar X → cuánto cobro?'}
                    </button>
                    {modoReverso && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-secondary whitespace-nowrap">Quiero {esVisita ? '' : 'c/u '}mínimo:</span>
                                <div className="flex items-center gap-1 flex-1">
                                    <span className="text-[13px] font-black text-ink">$</span>
                                    <input type="text" inputMode="decimal" value={gananciaDeseada}
                                        onChange={e => setGananciaDeseada(e.target.value)} placeholder="30000"
                                        className="flex-1 px-2 py-1.5 rounded-lg text-[13px] font-bold outline-none bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08]" />
                                </div>
                            </div>
                            {reverso && (
                                <div className="p-2.5 rounded-xl bg-[#D48800]/10 space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-[#D48800]">Al cliente (con IVA):</span>
                                        <span className="font-black text-[#D48800]">${reverso.precioConIVA.toLocaleString('es-AR')}</span>
                                    </div>
                                    <button type="button"
                                        onClick={() => { setItemActual({ ...itemActual, costoExtra: reverso.precioConIVA }); setModoReverso(false); setGananciaDeseada(''); }}
                                        className="w-full mt-1 py-2 rounded-lg text-[11px] font-black uppercase text-white bg-[#D48800] active:scale-95">
                                        Usar ${reverso.precioConIVA.toLocaleString('es-AR')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
