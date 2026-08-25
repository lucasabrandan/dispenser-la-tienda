import React from 'react';

/**
 * IniciarTrabajoSheet
 * Primer paso al iniciar un presupuesto: elegir si lo hace el admin ahora mismo
 * o si se le asigna a un técnico para después. Reemplaza los dos caminos que antes
 * eran botones separados ("Ejecutar y cobrar" arriba / "Despachar" escondido en el
 * menú "⋮") por un único punto de entrada — un paso más, una decisión menos que
 * adivinar de memoria.
 */
export default function IniciarTrabajoSheet({ servicio, onYoAhora, onAsignar, onCerrar }) {
    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[1999] backdrop-blur-sm" onClick={onCerrar} />
            <div className="fixed inset-x-0 bottom-0 z-[2000] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md">
                <div className="bg-card rounded-t-3xl md:rounded-3xl shadow-2xl border-t border-black/[0.07] dark:border-white/[0.07]">
                    <div className="px-5 pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                        <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-chip md:hidden" />
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[15px] font-black text-ink">¿Quién hace el trabajo?</h3>
                                <p className="text-caption text-muted mt-0.5">{servicio.clienteNombre} · #{servicio.id}</p>
                            </div>
                            <button onClick={onCerrar}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">
                                X
                            </button>
                        </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                        <button onClick={onYoAhora}
                            className="w-full p-4 rounded-2xl text-left border-2 border-black/[0.06] dark:border-white/[0.06] bg-panel transition-all active:scale-[0.98]">
                            <p className="text-body-lg font-black text-ink">⚡ Lo hago yo ahora</p>
                            <p className="text-caption text-muted mt-0.5">Cerrás el trabajo y definís el cobro en el momento.</p>
                        </button>
                        <button onClick={onAsignar}
                            className="w-full p-4 rounded-2xl text-left border-2 border-black/[0.06] dark:border-white/[0.06] bg-panel transition-all active:scale-[0.98]">
                            <p className="text-body-lg font-black text-ink">📬 Se lo asigno a un técnico</p>
                            <p className="text-caption text-muted mt-0.5">Programás una visita — el técnico la cierra después desde Mis Órdenes.</p>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
