import React from 'react';

export default function AlertasBlock({ pptoVencidos, ordenesActivas, alertasRadar, setVistaActual }) {
    const total = pptoVencidos.length + ordenesActivas.length + alertasRadar.length;
    if (total === 0) return null;

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Alertas ({total})</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {pptoVencidos.length > 0 && (
                    <button onClick={() => setVistaActual('presupuestos')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left active:scale-[0.98] bg-[#FEE2E2] dark:bg-[#3B1111] border border-[#D13A28]/15">
                        <span>⏰</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[#D13A28] dark:text-[#F87171]">
                                {pptoVencidos.length} presupuesto{pptoVencidos.length !== 1 ? 's' : ''} sin respuesta +7d
                            </p>
                            <p className="text-[9px] text-[#D13A28]/60 dark:text-[#F87171]/60 truncate">
                                {pptoVencidos.slice(0, 3).map(s => s.clienteNombre).join(', ')}
                            </p>
                        </div>
                        <span className="text-[#D13A28]/40 dark:text-[#F87171]/40 text-lg">›</span>
                    </button>
                )}
                {ordenesActivas.length > 0 && (
                    <button onClick={() => setVistaActual('despacho')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left active:scale-[0.98] bg-[#FEF3C7] dark:bg-[#2E2207] border border-[#D48800]/15">
                        <span>📌</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[#92400E] dark:text-[#FBBF24]">
                                {ordenesActivas.length} orden{ordenesActivas.length !== 1 ? 'es' : ''} activa{ordenesActivas.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-[9px] text-[#92400E]/60 dark:text-[#FBBF24]/60 truncate">
                                {ordenesActivas.slice(0, 3).map(o => o.clienteNombre).join(', ')}
                            </p>
                        </div>
                        <span className="text-[#92400E]/40 dark:text-[#FBBF24]/40 text-lg">›</span>
                    </button>
                )}
                {alertasRadar.length > 0 && (
                    <button onClick={() => setVistaActual('radar')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left active:scale-[0.98] bg-panel border border-black/[0.05] dark:border-white/[0.05]">
                        <span>🚨</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-ink">
                                {alertasRadar.length} equipo{alertasRadar.length !== 1 ? 's' : ''} sin mantenimiento
                            </p>
                            <p className="text-[9px] text-muted truncate">
                                {alertasRadar.slice(0, 3).map(a => a.clienteNombre).join(', ')}
                            </p>
                        </div>
                        <span className="text-muted text-lg">›</span>
                    </button>
                )}
            </div>
        </div>
    );
}
