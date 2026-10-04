import React from 'react';

const fmt = v => `$${Math.round(Number(v) || 0).toLocaleString('es-AR')}`;

// Resumen al cerrar el trabajo (4-oct-2026). Misma cuenta que la liquidación:
// cobrado − productos (los pone el negocio) − impuestos (solo si se factura) → 50%.
export default function PasoResumenEjecutar({ resumenGanancias, onConfirmado }) {
    const { pago, monto, totalProductos } = resumenGanancias;
    const efectivo = pago === 'EFECTIVO';
    const neto = Math.max(0, monto - totalProductos);
    const subtitulo = {
        NO: 'El admin se encarga del cobro',
        EFECTIVO: `Cobraste ${fmt(monto)} en efectivo`,
        TRANSFERENCIA: 'El admin confirma la transferencia',
    }[pago];

    return (
        <div className="space-y-4">
            <div className="text-center py-2">
                <p className="text-[36px] mb-1">✅</p>
                <p className="text-body-lg font-black text-ink">Trabajo cerrado</p>
                <p className="text-caption text-muted mt-0.5">{subtitulo}</p>
            </div>

            {efectivo ? (
                <div className="rounded-2xl overflow-hidden bg-card border border-black/[0.06] dark:border-white/[0.06]">
                    <div className="px-4 py-3 space-y-2 text-body">
                        <div className="flex justify-between"><span className="text-secondary">Cobrado</span><span className="font-black text-ink">{fmt(monto)}</span></div>
                        {totalProductos > 0 && (
                            <div className="flex justify-between"><span className="text-secondary">− Productos</span><span className="text-ink">{fmt(totalProductos)}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-secondary">Mano de obra neta</span><span className="font-bold text-ink">{fmt(neto)}</span></div>
                    </div>
                    <div className="px-4 py-3 bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-t border-[#D48800]/20 flex items-center justify-between">
                        <p className="text-label font-black text-brand-amber uppercase tracking-wide">Tu parte (50%)</p>
                        <p className="text-[24px] font-black text-brand-amber">{fmt(neto / 2)}</p>
                    </div>
                </div>
            ) : (
                <p className="text-caption text-muted text-center px-4">
                    Tu parte aparece en "Mi mes" cuando el trabajo quede cobrado.
                </p>
            )}

            <button onClick={() => { if (onConfirmado) onConfirmado(); }}
                className="w-full py-4 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-[0.98] transition-all">
                Listo
            </button>
        </div>
    );
}
