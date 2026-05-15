import React, { useMemo } from 'react';

// Badge de estado
function Badge({ estado }) {
    const map = {
        REALIZADO:   { label: 'Realizado',  cls: 'bg-[#16A34A]/10 text-[#16A34A]' },
        PRESUPUESTO: { label: 'Pendiente',  cls: 'bg-[#D48800]/10 text-[#D48800]' },
        RECHAZADO:   { label: 'Rechazado',  cls: 'bg-[#D13A28]/10 text-[#D13A28]' },
    };
    const { label, cls } = map[estado] || { label: estado, cls: 'bg-[#E8E5E0] text-[#57534E]' };
    return (
        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase ${cls}`}>
            {label}
        </span>
    );
}

function fmt(n) { return Number(n || 0).toLocaleString('es-AR'); }

function formatFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha.includes('T') ? fecha : fecha + 'T12:00:00')
        .toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function HistorialEquipoModal({ equipo, servicios = [], onClose }) {
    // Filtrar solo servicios que tienen un item para este equipo
    const historial = useMemo(() => {
        return servicios
            .filter(s => s.items?.some(it => it.equipoSerial === equipo.numeroSerie))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [servicios, equipo.numeroSerie]);

    // Stats acumuladas (solo servicios REALIZADOS)
    const realizados = historial.filter(s => s.estado === 'REALIZADO');
    const totalGastado = realizados.reduce((acc, s) => {
        const item = s.items?.find(it => it.equipoSerial === equipo.numeroSerie);
        return acc + Number(item?.costo || 0);
    }, 0);
    const ultimoServicio = historial[0];
    const diasSinAtender = ultimoServicio
        ? Math.floor((new Date() - new Date(ultimoServicio.fecha.includes('T') ? ultimoServicio.fecha : ultimoServicio.fecha + 'T12:00:00')) / 86400000)
        : null;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-end"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
        >
            <div
                className="w-full rounded-t-[2rem] max-h-[92vh] flex flex-col shadow-2xl bg-[#FFFFFF] dark:bg-[#1C1C1C]"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                </div>

                {/* Header del equipo */}
                <div className="px-5 pb-4 pt-2 border-b border-black/[0.07] dark:border-white/[0.07] shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-1">Historial del Dispenser</p>
                            <h3 className="text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none">
                                {equipo.marca} {equipo.modelo}
                            </h3>
                            <p className="text-[11px] font-bold text-[#D13A28] dark:text-[#E8422F] mt-0.5">
                                S/N: {equipo.numeroSerie}
                            </p>
                            {equipo.ubicacion && (
                                <p className="text-[9px] font-bold text-[#A8A29E] mt-0.5 uppercase">📍 {equipo.ubicacion}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#A8A29E] active:scale-90"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Stats rápidas */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-xl p-3 text-center">
                            <p className="text-[18px] font-black text-[#D13A28] dark:text-[#E8422F] leading-none">{historial.length}</p>
                            <p className="text-[8px] font-black text-[#A8A29E] uppercase mt-0.5">Servicios</p>
                        </div>
                        <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-xl p-3 text-center">
                            <p className="text-[18px] font-black text-[#D48800] dark:text-[#F0A500] leading-none">${fmt(totalGastado)}</p>
                            <p className="text-[8px] font-black text-[#A8A29E] uppercase mt-0.5">Total facturado</p>
                        </div>
                        <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-xl p-3 text-center">
                            <p className="text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                                {diasSinAtender !== null ? diasSinAtender : '—'}
                            </p>
                            <p className="text-[8px] font-black text-[#A8A29E] uppercase mt-0.5">Días sin service</p>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {historial.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-[#A8A29E] font-black uppercase text-sm">Sin servicios registrados</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Línea vertical del timeline */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-[#E8E5E0] dark:bg-[#2E2E2E]" />

                            <div className="space-y-4">
                                {historial.map((s, idx) => {
                                    const item = s.items?.find(it => it.equipoSerial === equipo.numeroSerie);
                                    const repuestos = item?.repuestosUsados || [];
                                    const esPrimero = idx === 0;

                                    return (
                                        <div key={s.id} className="flex gap-4">
                                            {/* Punto del timeline */}
                                            <div className="shrink-0 mt-1 relative z-10">
                                                <div className={`w-4 h-4 rounded-full border-2 ${
                                                    esPrimero
                                                        ? 'bg-[#D13A28] dark:bg-[#E8422F] border-[#D13A28] dark:border-[#E8422F]'
                                                        : 'bg-[#FFFFFF] dark:bg-[#1C1C1C] border-[#E8E5E0] dark:border-[#2E2E2E]'
                                                }`} />
                                            </div>

                                            {/* Contenido */}
                                            <div className="flex-1 pb-1">
                                                <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-2xl p-4 border border-black/[0.05] dark:border-white/[0.05]">
                                                    {/* Fecha + estado */}
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge estado={s.estado} />
                                                            {esPrimero && (
                                                                <span className="text-[7px] font-black bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F] px-1.5 py-0.5 rounded uppercase">
                                                                    Último
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-[#A8A29E]">
                                                            {formatFecha(s.fecha)}
                                                        </p>
                                                    </div>

                                                    {/* Trabajo realizado */}
                                                    {item?.trabajoRealizado && (
                                                        <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] mb-2 leading-snug">
                                                            {item.trabajoRealizado}
                                                        </p>
                                                    )}

                                                    {/* Repuestos */}
                                                    {repuestos.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {repuestos.map((r, i) => (
                                                                <span key={i} className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] uppercase">
                                                                    {r.cantidad}× {r.nombre}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Costos */}
                                                    <div className="flex justify-between items-center pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                                                        <div className="flex items-center gap-3">
                                                            {Number(item?.costoExtra || 0) > 0 && (
                                                                <span className="text-[9px] font-bold text-[#A8A29E]">
                                                                    MO: <span className="text-[#D48800] dark:text-[#F0A500] font-black">${fmt(item.costoExtra)}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                                            ${fmt(item?.costo || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
