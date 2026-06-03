import React from 'react';

const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;

export default function PasoCobro({
    pricing, modalidadCobro, setModalidadCobro,
    costoMOExtra, setCostoMOExtra,
    procesando, onBack, onConfirmar,
}) {
    return (
        <>
            <button onClick={onBack}
                className="flex items-center gap-1 text-[12px] font-bold text-[#A8A29E] active:scale-95 mb-2">
                ← Volver
            </button>

            <div className="text-center py-1">
                <p className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                    {pricing.esVisita ? 'Cobro de visita' : 'Cobro del servicio'}
                </p>
                <p className="text-[11px] text-[#A8A29E] mt-0.5">Selecciona como paga el cliente</p>
            </div>

            {/* Desglose */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06] p-4 space-y-2">
                <div className="flex justify-between text-[12px]">
                    <span className="text-[#57534E] dark:text-[#9E9A94]">
                        {pricing.esVisita ? 'Visita diagnostica' : 'Mano de obra'}
                    </span>
                    <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">
                        {fmt(pricing.esVisita ? pricing.visitaPrecio : pricing.precioCliente)}
                    </span>
                </div>
                {!pricing.esVisita && pricing.totalRepuestos > 0 && (
                    <div className="flex justify-between text-[12px]">
                        <span className="text-[#57534E] dark:text-[#9E9A94]">Repuestos</span>
                        <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">{fmt(pricing.totalRepuestos)}</span>
                    </div>
                )}
                {!pricing.esVisita && costoMOExtra > 0 && (
                    <div className="flex justify-between text-[12px]">
                        <span className="text-[#57534E] dark:text-[#9E9A94]">Ajuste MO extra</span>
                        <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">+{fmt(Math.round(costoMOExtra * (1 + pricing.pctIVA / 100)))}</span>
                    </div>
                )}
            </div>

            {/* Ajuste MO */}
            {!pricing.esVisita && (
                <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06] p-3">
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-2">Ajustar mano de obra (solo subir)</p>
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#57534E] dark:text-[#9E9A94]">Extra:</span>
                        <input type="number" min="0" step="1000"
                            value={costoMOExtra || ''}
                            onChange={e => setCostoMOExtra(Math.max(0, Number(e.target.value) || 0))}
                            placeholder="0"
                            className="flex-1 px-3 py-2 rounded-lg text-[13px] bg-[#F5F3F1] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Opciones */}
            <div className="space-y-2">
                {[
                    { id: 'EFECTIVO_SIN_FACTURA', label: 'Efectivo sin factura', sub: `Descuento ${pricing.pctIVA}% · Cobras en mano`, monto: pricing.totalEfectivo, color: 'border-[#D13A28] dark:border-[#E8422F] bg-[#D13A28]/5 dark:bg-[#E8422F]/5', montoColor: 'text-[#D13A28] dark:text-[#E8422F]' },
                    { id: 'CON_FACTURA', label: 'Con factura (IVA inc.)', sub: 'Admin gestiona cobro', monto: pricing.totalFacturado, color: 'border-[#D48800] dark:border-[#F0A500] bg-[#D48800]/5 dark:bg-[#F0A500]/5', montoColor: 'text-[#D48800] dark:text-[#F0A500]' },
                    { id: 'PENDIENTE', label: 'Definir despues', sub: 'El admin decide la modalidad', monto: null, color: 'border-[#A8A29E] bg-[#A8A29E]/5', montoColor: '' },
                ].map(opt => (
                    <button key={opt.id} onClick={() => setModalidadCobro(opt.id)}
                        className={`w-full p-4 rounded-2xl text-left border-2 transition-all active:scale-[0.98] ${
                            modalidadCobro === opt.id ? opt.color : 'border-black/[0.06] dark:border-white/[0.06] bg-[#FFFFFF] dark:bg-[#242424]'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{opt.label}</p>
                                <p className="text-[10px] text-[#A8A29E] mt-0.5">{opt.sub}</p>
                            </div>
                            {opt.monto !== null && (
                                <p className={`text-[20px] font-black ${opt.montoColor}`}>{fmt(opt.monto)}</p>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <button onClick={onConfirmar} disabled={procesando || !modalidadCobro}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] disabled:opacity-50 transition-all">
                {procesando ? 'Procesando...' : '✓ Confirmar trabajo'}
            </button>
        </>
    );
}
