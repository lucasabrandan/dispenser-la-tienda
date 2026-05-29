import React from 'react';

const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;

export default function PasoResumenEjecutar({ resumenGanancias, onConfirmado }) {
    return (
        <div className="space-y-4">
            <div className="text-center py-2">
                <p className="text-[36px] mb-1">✅</p>
                <p className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Trabajo confirmado</p>
                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                    {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA' && 'Cobrado en efectivo'}
                    {resumenGanancias.modalidadCobro === 'CON_FACTURA' && 'Pendiente facturacion (admin)'}
                    {resumenGanancias.modalidadCobro === 'PENDIENTE' && 'Pendiente definir cobro (admin)'}
                </p>
            </div>

            <div className="rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.06]">
                <div className="px-4 py-3 space-y-2.5">
                    <div className="flex justify-between text-[13px]">
                        <span className="text-[#57534E] dark:text-[#9E9A94]">
                            {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'Cobrado en mano' : 'Total con factura'}
                        </span>
                        <span className="font-black text-[#1C1917] dark:text-[#F0EEE9]">
                            {fmt(resumenGanancias.montoFinal)}
                        </span>
                    </div>
                    {resumenGanancias.modalidadCobro === 'CON_FACTURA' && (
                        <div className="flex justify-between text-[11px]">
                            <span className="text-[#A8A29E]">Despues de impuestos (30%)</span>
                            <span className="text-[#A8A29E]">{fmt(Math.round(resumenGanancias.montoFinal * 0.70))}</span>
                        </div>
                    )}
                </div>
                <div className="px-4 py-3 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20">
                    <div className="flex items-center justify-between">
                        <p className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500] uppercase tracking-wide">
                            {resumenGanancias.esVisita ? 'Te llevas' : 'Tu parte (50% MO)'}
                        </p>
                        <p className="text-[24px] font-black text-[#D48800] dark:text-[#F0A500]">
                            {fmt(resumenGanancias.parteTecnico)}
                        </p>
                    </div>
                    <p className="text-[10px] text-[#D48800]/60 dark:text-[#F0A500]/60 mt-0.5">
                        {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA'
                            ? 'Neto en mano, sin impuestos'
                            : 'Neto despues de impuestos'}
                    </p>
                </div>
            </div>

            <button onClick={() => { if (onConfirmado) onConfirmado(); }}
                className="w-full py-4 rounded-2xl font-black text-[13px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-[0.98] transition-all">
                Listo
            </button>
        </div>
    );
}
