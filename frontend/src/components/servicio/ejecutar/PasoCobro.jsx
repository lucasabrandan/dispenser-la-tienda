import React from 'react';

const fmt = v => `$${Math.round(Number(v) || 0).toLocaleString('es-AR')}`;

// "¿Te pagó?" (4-oct-2026). El técnico ya no elige "con factura / sin factura"
// ni ajusta la mano de obra: eso lo define el admin. Solo dice si el cliente le
// pagó y cómo. Si fue en efectivo, el monto va a su "Cerrar mi día".
export const OPCIONES_PAGO = [
    { id: 'NO',            label: 'No me pagó',      sub: 'El admin lo cobra después' },
    { id: 'EFECTIVO',      label: 'Sí, en efectivo', sub: 'Va a tu cierre del día' },
    { id: 'TRANSFERENCIA', label: 'Sí, por transferencia', sub: 'El admin lo confirma' },
];

// Bloque reutilizable: opciones + "¿Cuánto te pagó?". Lo usan el cierre de un
// presupuesto (PasoCobro) y el registro de una visita sin presupuesto.
export function PreguntaPago({ total, descuentoEfectivo = 0, pago, setPago, monto, setMonto }) {
    const sugeridoEfectivo = Math.round(total * (1 - (Number(descuentoEfectivo) || 0) / 100));
    const elegir = (id) => {
        setPago(id);
        if (total > 0 && id === 'EFECTIVO') setMonto(sugeridoEfectivo);
        if (total > 0 && id === 'TRANSFERENCIA') setMonto(total);
    };
    return (
        <>
            <div className="space-y-2">
                {OPCIONES_PAGO.map(opt => (
                    <button key={opt.id} type="button" onClick={() => elegir(opt.id)}
                        className={`w-full p-4 rounded-2xl text-left border-2 transition-all active:scale-[0.98] ${
                            pago === opt.id ? 'border-brand-red bg-[#D13A28]/5 dark:bg-[#E8422F]/5' : 'border-black/[0.06] dark:border-white/[0.06] bg-card'
                        }`}>
                        <p className="text-body font-black text-ink">{opt.label}</p>
                        <p className="text-caption text-muted mt-0.5">{opt.sub}</p>
                    </button>
                ))}
            </div>

            {(pago === 'EFECTIVO' || pago === 'TRANSFERENCIA') && (
                <div className="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] p-4">
                    <label className="text-label font-black text-muted uppercase tracking-widest">¿Cuánto te pagó?</label>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-title font-black text-ink">$</span>
                        <input type="text" inputMode="decimal" value={monto || ''}
                            onChange={e => setMonto(Number(String(e.target.value).replace(/[^\d]/g, '')) || 0)}
                            className="flex-1 h-12 px-3 rounded-xl text-title font-black bg-chip text-ink outline-none" />
                    </div>
                    {pago === 'EFECTIVO' && Number(descuentoEfectivo) > 0 && total > 0 && (
                        <p className="text-caption text-muted mt-2">Sugerido con {descuentoEfectivo}% de descuento por efectivo: {fmt(sugeridoEfectivo)}</p>
                    )}
                </div>
            )}
        </>
    );
}

export const pagoCompleto = (pago, monto) => !!pago && (pago === 'NO' || monto > 0);

export default function PasoCobro({ total, descuentoEfectivo = 0, pago, setPago, monto, setMonto, procesando, onBack, onConfirmar }) {
    return (
        <>
            <button onClick={onBack}
                className="flex items-center gap-1 text-label font-bold text-muted active:scale-95 mb-2">
                ← Volver
            </button>

            <div className="text-center py-1">
                <p className="text-body-lg font-black text-ink">¿Te pagó?</p>
                {total > 0 && <p className="text-caption text-muted mt-0.5">Total del trabajo: {fmt(total)}</p>}
            </div>

            <PreguntaPago total={total} descuentoEfectivo={descuentoEfectivo}
                pago={pago} setPago={setPago} monto={monto} setMonto={setMonto} />

            <button onClick={onConfirmar} disabled={procesando || !pagoCompleto(pago, monto)}
                className="w-full py-4 rounded-2xl font-black text-label uppercase text-white bg-[color:var(--etapa-listo)] active:scale-[0.98] disabled:opacity-50 transition-all">
                {procesando ? 'Guardando...' : '✓ Listo, cerrar trabajo'}
            </button>
        </>
    );
}
