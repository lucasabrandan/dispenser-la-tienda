import React from 'react';
import RepuestosBottomSheet from '../../repuesto/RepuestosBottomSheet';

const fmt = v => `$${Math.round(v).toLocaleString('es-AR')}`;

export default function PasoDetalle({
    servicio, observaciones, setObservaciones,
    repuestosAgregados, setRepuestosAgregados,
    repuestosDisponibles, sheetRepuestosOpen, setSheetRepuestosOpen,
    onNext,
}) {
    return (
        <>
            <section className="space-y-2">
                <p className="text-label font-black text-muted uppercase tracking-widest">
                    Equipos y trabajo asignado
                </p>
                {servicio.items?.map((it, i) => (
                    <div key={`${it.equipoSerial || 'item'}-${i}`} className="p-3 rounded-2xl bg-card border border-black/[0.06]">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-body font-black text-brand-red">
                                {it.equipoSerial}
                            </p>
                            {it.equipoModelo && (
                                <p className="text-caption text-muted shrink-0">{it.equipoModelo}</p>
                            )}
                        </div>
                        {it.equipoUbicacion && (
                            <p className="text-caption text-muted mb-1">
                                {[it.equipoUbicacion, it.equipoPiso && `P${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                            </p>
                        )}
                        <p className="text-caption text-secondary leading-snug">
                            {it.trabajoRealizado}
                        </p>
                        {it.repuestosUsados?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-black/[0.06]">
                                {it.repuestosUsados.map((r, ri) => (
                                    <span key={r.nombre || ri} className="text-label px-1.5 py-0.5 rounded bg-chip text-secondary">
                                        {r.cantidad}x {r.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </section>

            <section className="space-y-2">
                <p className="text-label font-black text-muted uppercase tracking-widest">
                    Repuestos adicionales
                </p>
                <button type="button" onClick={() => setSheetRepuestosOpen(true)}
                    className="w-full py-3 px-4 rounded-xl flex items-center justify-between font-bold text-body border border-dashed border-chip text-ink bg-[#FFFFFF] dark:bg-[#1C1C1C] active:scale-[0.98] transition-all">
                    <span>
                        {repuestosAgregados.length > 0
                            ? `${repuestosAgregados.length} repuesto${repuestosAgregados.length > 1 ? 's' : ''} seleccionado${repuestosAgregados.length > 1 ? 's' : ''}`
                            : '+ Agregar repuestos'}
                    </span>
                    <span className="text-muted">▼</span>
                </button>

                {repuestosAgregados.length > 0 && (
                    <div className="rounded-xl overflow-hidden bg-[#EFEDEA] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07]">
                        {repuestosAgregados.map((r, i) => (
                            <div key={r.id ?? i}
                                className={`px-3 py-2.5 flex items-center gap-3 ${i < repuestosAgregados.length - 1 ? 'border-b border-black/[0.07] dark:border-white/[0.07]' : ''}`}>
                                {r.fotoUrl && (
                                    <img src={r.fotoUrl} alt={r.nombre}
                                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#E8E5E0] dark:bg-[#242424]"
                                        onError={e => { e.target.style.display = 'none'; }} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-body text-ink truncate">{r.nombre}</p>
                                    <p className="text-caption text-muted">{fmt(Number(r.precio))} c/u</p>
                                </div>
                                <span className="text-label font-black text-ink shrink-0">x{r.cantidad}</span>
                                <span className="text-body font-black text-brand-red shrink-0 w-16 text-right">
                                    {fmt((parseFloat(r.precio) || 0) * (r.cantidad || 1))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <RepuestosBottomSheet
                    isOpen={sheetRepuestosOpen}
                    onClose={() => setSheetRepuestosOpen(false)}
                    repuestos={repuestosDisponibles}
                    seleccionados={repuestosAgregados}
                    onChange={nuevos => setRepuestosAgregados(nuevos)}
                />
            </section>

            <section className="space-y-2">
                <p className="text-label font-black text-muted uppercase tracking-widest">Observaciones</p>
                <textarea
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Anota cualquier detalle del trabajo realizado..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-body border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] text-ink placeholder:text-muted outline-none resize-none"
                />
            </section>

            <button onClick={onNext}
                className="w-full py-4 rounded-2xl font-black text-body-lg uppercase text-white bg-brand-red active:scale-[0.98] transition-all">
                Firmas y cobro →
            </button>
        </>
    );
}
