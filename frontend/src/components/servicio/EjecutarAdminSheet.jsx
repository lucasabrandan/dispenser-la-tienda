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
                <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-t-3xl md:rounded-3xl shadow-2xl border-t border-black/[0.07] max-h-[90vh] flex flex-col">
                    {/* Handle + header */}
                    <div className="px-5 pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
                        <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-[#E8E5E0] dark:bg-[#2E2E2E] md:hidden" />
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Ejecutar trabajo</h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                    {servicio.clienteNombre} · #{servicio.id}
                                </p>
                            </div>
                            <button onClick={onCerrar}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90">
                                X
                            </button>
                        </div>
                    </div>

                    {/* Contenido scrolleable */}
                    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                        {/* Resumen del servicio */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Resumen del trabajo</p>
                            {items.map((it, i) => (
                                <div key={i} className="p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[12px] font-black text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial || 'Sin equipo'}</span>
                                        <M valor={Number(it.costo || 0)} className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0 ml-2" />
                                    </div>
                                    {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                                        <p className="text-[10px] text-[#A8A29E] mb-1">
                                            {[it.equipoUbicacion, it.equipoPiso && `P${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            {it.repuestosUsados.map((r, ri) => (
                                                <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
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
                            <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest block mb-1">Observaciones</label>
                            <textarea
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                                rows={2}
                                placeholder="Notas adicionales..."
                                className="w-full p-3 rounded-xl text-[12px] outline-none resize-none border border-black/[0.08] dark:border-white/[0.08] bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E]"
                            />
                        </div>

                        {/* Modalidad de cobro */}
                        <div>
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-2">Modalidad de cobro</p>
                            <div className="space-y-2">
                                {MODALIDADES.map(o => (
                                    <button key={o.id}
                                        onClick={() => handleModalidad(o.id)}
                                        className={`w-full p-3.5 rounded-xl text-left border-2 transition-all active:scale-[0.98] ${modalidad === o.id ? '' : 'border-black/[0.06] dark:border-white/[0.06] bg-[#EFEDEA] dark:bg-[#1C1C1C]'}`}
                                        style={modalidad === o.id ? { borderColor: o.color, backgroundColor: o.color + '0D' } : {}}
                                    >
                                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{o.label}</p>
                                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{o.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Monto final editable */}
                        {modalidad && (
                            <div className="p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                                <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest block mb-1">Monto final (editable)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">$</span>
                                    <input
                                        type="number"
                                        value={montoEditado !== null ? montoEditado : montoAuto}
                                        onChange={e => setMontoEditado(e.target.value)}
                                        className="flex-1 bg-transparent text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9] outline-none"
                                    />
                                    {montoEditado !== null && (
                                        <button onClick={() => setMontoEditado(null)} className="text-[10px] text-[#A8A29E] underline">
                                            Auto
                                        </button>
                                    )}
                                </div>
                                {montoFinal !== montoAuto && (
                                    <p className="text-[10px] text-[#D48800] mt-1">
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
                                className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                Cancelar
                            </button>
                            <button onClick={handleConfirmar} disabled={!modalidad || procesando}
                                className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 disabled:opacity-50">
                                {procesando ? 'Procesando...' : 'Confirmar trabajo'}
                            </button>
                        </div>
                        {onEditarCompleto && (
                            <button onClick={onEditarCompleto}
                                className="w-full py-2.5 rounded-2xl font-bold text-[11px] text-[#A8A29E] active:scale-95 transition-all">
                                Editar detalle completo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
