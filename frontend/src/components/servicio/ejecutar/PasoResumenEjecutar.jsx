import React from 'react';

const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;

export default function PasoResumenEjecutar({ resumenGanancias, onConfirmado }) {
    return (
        <div className="space-y-4">
            <div className="text-center py-2">
                <p className="text-[36px] mb-1">✅</p>
                <p className="text-body-lg font-black text-ink">Trabajo confirmado</p>
                <p className="text-caption text-muted mt-0.5">
                    {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA' && 'Cobrado en efectivo'}
                    {resumenGanancias.modalidadCobro === 'CON_FACTURA' && 'Pendiente facturacion (admin)'}
                    {resumenGanancias.modalidadCobro === 'PENDIENTE' && 'Pendiente definir cobro (admin)'}
                </p>
            </div>

            <div className="rounded-2xl overflow-hidden bg-card border border-black/[0.06]">
                <div className="px-4 py-3 space-y-2.5">
                    <div className="flex justify-between text-body">
                        <span className="text-secondary">
                            {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'Cobrado en mano' : 'Total con factura'}
                        </span>
                        <span className="font-black text-ink">
                            {fmt(resumenGanancias.montoFinal)}
                        </span>
                    </div>
                    {resumenGanancias.modalidadCobro === 'CON_FACTURA' && (
                        <div className="flex justify-between text-caption">
                            <span className="text-muted">Despues de impuestos (30%)</span>
                            <span className="text-muted">{fmt(Math.round(resumenGanancias.montoFinal * 0.70))}</span>
                        </div>
                    )}
                </div>
                <div className="px-4 py-3 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20">
                    <div className="flex items-center justify-between">
                        <p className="text-label font-black text-brand-amber uppercase tracking-wide">
                            {resumenGanancias.esVisita ? 'Te llevas' : 'Tu parte (50% MO)'}
                        </p>
                        <p className="text-[24px] font-black text-brand-amber">
                            {fmt(resumenGanancias.parteTecnico)}
                        </p>
                    </div>
                    <p className="text-caption text-[#D48800]/60 dark:text-[#F0A500]/60 mt-0.5">
                        {resumenGanancias.modalidadCobro === 'EFECTIVO_SIN_FACTURA'
                            ? 'Neto en mano, sin impuestos'
                            : 'Neto despues de impuestos'}
                    </p>
                </div>
            </div>

            <button onClick={() => { if (onConfirmado) onConfirmado(); }}
                className="w-full py-4 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-[0.98] transition-all">
                Listo
            </button>
        </div>
    );
}
