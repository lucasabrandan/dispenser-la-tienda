import React, { useState } from 'react';

export default function CobroSheet({ servicio, calcularTotal, onConfirmar, onCerrar }) {
    const [modalidad, setModalidad] = useState(servicio.modalidadCobro || '');
    const [montoFinal, setMontoFinal] = useState(servicio.montoFinal || calcularTotal(servicio));
    const [procesando, setProcesando] = useState(false);
    const total = calcularTotal(servicio);

    const opciones = [
        { id: 'EFECTIVO_SIN_FACTURA', label: 'Efectivo sin factura', desc: 'Cobrado en mano, sin ARCA', color: '#16A34A', destino: 'COBRADO' },
        { id: 'CON_FACTURA',          label: 'Con factura',          desc: 'Facturar + enviar datos bancarios', color: '#8B5CF6', destino: 'PENDIENTE_FACTURACION' },
    ];

    const handleConfirmar = async () => {
        if (!modalidad) return;
        setProcesando(true);
        const opt = opciones.find(o => o.id === modalidad);
        await onConfirmar(opt?.destino || 'COBRADO', { modalidadCobro: modalidad, montoFinal: Number(montoFinal) || total });
        setProcesando(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[1999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-x-0 bottom-0 z-[2000] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md">
                <div className="bg-card rounded-t-3xl md:rounded-3xl p-5 shadow-2xl border-t border-black/[0.07]">
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip md:hidden" />
                    <div className="mb-4">
                        <h3 className="text-title font-black text-ink">Definir cobro</h3>
                        <p className="text-caption text-muted mt-0.5">{servicio.clienteNombre} · #{servicio.id}</p>
                    </div>
                    <div className="mb-4 p-3 rounded-xl bg-panel">
                        <label className="text-label font-black text-muted uppercase tracking-widest block mb-1">Monto final a cobrar</label>
                        <div className="flex items-center gap-2">
                            <span className="text-body-lg font-black text-ink">$</span>
                            <input type="text" inputMode="decimal" value={montoFinal} onChange={e => setMontoFinal(e.target.value)}
                                className="flex-1 bg-transparent text-body-lg font-black text-ink outline-none" />
                        </div>
                        {Number(montoFinal) !== total && (
                            <p className="text-caption text-muted mt-1">Presupuesto original: ${Math.round(total).toLocaleString('es-AR')}</p>
                        )}
                    </div>
                    <div className="space-y-2 mb-5">
                        {opciones.map(o => (
                            <button key={o.id} onClick={() => setModalidad(o.id)}
                                className={`w-full p-3.5 rounded-xl text-left border-2 transition-all active:scale-[0.98] ${modalidad === o.id ? '' : 'border-black/[0.06] dark:border-white/[0.06] bg-panel'}`}
                                style={modalidad === o.id ? { borderColor: o.color, backgroundColor: o.color + '0D' } : {}}>
                                <p className="text-body font-black text-ink">{o.label}</p>
                                <p className="text-caption text-muted mt-0.5">{o.desc}</p>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onCerrar}
                            className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                            Cancelar
                        </button>
                        <button onClick={handleConfirmar} disabled={!modalidad || procesando}
                            className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95 disabled:opacity-50">
                            {procesando ? 'Procesando...' : modalidad === 'EFECTIVO_SIN_FACTURA' ? 'Marcar cobrado' : 'Enviar a facturar'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
