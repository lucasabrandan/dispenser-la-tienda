import React, { useState } from 'react';
import { useMontos } from '../../context/MontosContext';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>------</span>;
    return <span className={className}>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

const MODALIDADES = [
    { id: 'EFECTIVO_SIN_FACTURA', label: 'Efectivo sin factura', desc: 'Cobrado en mano, sin ARCA', color: '#16A34A', destino: 'COBRADO' },
    { id: 'CON_FACTURA',          label: 'Con factura',          desc: 'Facturar + enviar datos bancarios', color: '#8B5CF6', destino: 'PENDIENTE_FACTURACION' },
    { id: 'PENDIENTE',            label: 'Definir despues',      desc: 'Queda como realizado, cobro pendiente', color: '#A8A29E', destino: 'COMPLETADO' },
];

// Sheet simplificado para que el admin ejecute un presupuesto sin pasar por el form completo
export default function EjecutarAdminSheet({ servicio, calcularTotal, onConfirmar, onEditarCompleto, onCerrar }) {
    const totalBase = calcularTotal(servicio);
    const items = servicio.items || [];

    const [modalidad, setModalidad] = useState('');
    const [montoEditado, setMontoEditado] = useState(null); // null = auto-calculado
    const [observaciones, setObservaciones] = useState(servicio.observaciones || '');
    const [procesando, setProcesando] = useState(false);

    // Monto = siempre el total del presupuesto (ya tiene el pricing calculado)
    // La modalidad solo define el estado, no cambia el monto
    const montoAuto = totalBase;

    // Monto final: editado manualmente o auto
    const montoFinal = montoEditado !== null ? Number(montoEditado) : montoAuto;

    const handleModalidad = (id) => {
        setModalidad(id);
        setMontoEditado(null); // resetear edicion manual al cambiar modalidad
    };

    const handleConfirmar = async () => {
        if (!modalidad) return;
        setProcesando(true);
        const opt = MODALIDADES.find(o => o.id === modalidad);
        await onConfirmar(opt?.destino || 'COMPLETADO', {
            modalidadCobro: modalidad === 'PENDIENTE' ? null : modalidad,
            montoFinal: montoFinal || totalBase,
            observaciones,
        });
        setProcesando(false);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[1999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-x-0 bottom-0 z-[2000] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg">
                <div className="bg-card rounded-t-3xl md:rounded-3xl shadow-2xl border-t border-black/[0.07] max-h-[90vh] flex flex-col">
                    {/* Handle + header */}
                    <div className="px-5 pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
                        <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-chip md:hidden" />
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-title font-black text-ink">Ejecutar trabajo</h3>
                                <p className="text-caption text-muted mt-0.5">
                                    {servicio.clienteNombre} · #{servicio.id}
                                </p>
                            </div>
                            <button onClick={onCerrar}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">
                                X
                            </button>
                        </div>
                    </div>

                    {/* Contenido scrolleable */}
                    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                        {/* Resumen del servicio */}
                        <div className="space-y-2">
                            <p className="text-label font-black text-muted uppercase tracking-widest">Resumen del trabajo</p>
                            {items.map((it, i) => (
                                <div key={`${it.equipoSerial || 'item'}-${i}`} className="p-3 rounded-xl bg-panel">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-body font-black text-brand-red">{it.equipoSerial || 'Sin equipo'}</span>
                                        <M valor={Number(it.costo || 0)} className="text-body font-black text-ink shrink-0 ml-2" />
                                    </div>
                                    {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                                        <p className="text-caption text-muted mb-1">
                                            {[it.equipoUbicacion, it.equipoPiso && `P${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-caption text-secondary leading-snug">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            {it.repuestosUsados.map((r, ri) => (
                                                <span key={ri} className="text-label px-1.5 py-0.5 rounded bg-chip text-secondary">
                                                    {r.cantidad}x {r.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Observaciones editables */}
                        <div>
                            <label className="text-label font-black text-muted uppercase tracking-widest block mb-1">Observaciones</label>
                            <textarea
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                rows={2}
                                placeholder="Notas adicionales..."
                                className="w-full p-3 rounded-xl text-body outline-none resize-none border border-black/[0.08] dark:border-white/[0.08] bg-panel text-ink placeholder:text-muted"
                            />
                        </div>

                        {/* Modalidad de cobro */}
                        <div>
                            <p className="text-label font-black text-muted uppercase tracking-widest mb-2">Modalidad de cobro</p>
                            <div className="space-y-2">
                                {MODALIDADES.map(o => (
                                    <button key={o.id}
                                        onClick={() => handleModalidad(o.id)}
                                        className={`w-full p-3.5 rounded-xl text-left border-2 transition-all active:scale-[0.98] ${modalidad === o.id ? '' : 'border-black/[0.06] dark:border-white/[0.06] bg-panel'}`}
                                        style={modalidad === o.id ? { borderColor: o.color, backgroundColor: o.color + '0D' } : {}}
                                    >
                                        <p className="text-body font-black text-ink">{o.label}</p>
                                        <p className="text-caption text-muted mt-0.5">{o.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Monto final editable */}
                        {modalidad && (
                            <div className="p-3 rounded-xl bg-panel">
                                <label className="text-label font-black text-muted uppercase tracking-widest block mb-1">Monto final (editable)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-body-lg font-black text-ink">$</span>
                                    <input
                                        type="text" inputMode="decimal"
                                        value={montoEditado !== null ? montoEditado : montoAuto}
                                        onChange={e => setMontoEditado(e.target.value)}
                                        className="flex-1 bg-transparent text-body-lg font-black text-ink outline-none"
                                    />
                                    {montoEditado !== null && (
                                        <button onClick={() => setMontoEditado(null)} className="text-label text-muted underline">
                                            Auto
                                        </button>
                                    )}
                                </div>
                                {montoFinal !== montoAuto && (
                                    <p className="text-caption text-[#D48800] mt-1">
                                        Calculado auto: ${Math.round(montoAuto).toLocaleString('es-AR')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Botones fijos abajo */}
                    <div className="px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.06] shrink-0 space-y-2">
                        <div className="flex gap-2">
                            <button onClick={onCerrar}
                                className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                                Cancelar
                            </button>
                            <button onClick={handleConfirmar} disabled={!modalidad || procesando}
                                className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95 disabled:opacity-50">
                                {procesando ? 'Procesando...' : 'Confirmar trabajo'}
                            </button>
                        </div>
                        {onEditarCompleto && (
                            <button onClick={onEditarCompleto}
                                className="w-full py-2.5 rounded-2xl font-bold text-label text-muted active:scale-95 transition-all">
                                Editar detalle completo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
