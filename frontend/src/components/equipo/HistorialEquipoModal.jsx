import React, { useMemo } from 'react';

// Badge de estado
function Badge({ estado }) {
    const map = {
        REALIZADO:   { label: 'Realizado',  cls: 'bg-[#16A34A]/10 text-[#16A34A]' },
        PRESUPUESTO: { label: 'Pendiente',  cls: 'bg-[#D48800]/10 text-[#D48800]' },
        ARCHIVADO:   { label: 'Archivado',  cls: 'bg-muted/10 text-muted' },
    };
    const { label, cls } = map[estado] || { label: estado, cls: 'bg-[#E8E5E0] text-[#57534E]' };
    return (
        <span className={`text-label font-black px-2 py-0.5 rounded-lg uppercase ${cls}`}>
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
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || (b.id || 0) - (a.id || 0));
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
            className="fixed inset-0 z-[3000] flex items-end bg-black/60"
            onClick={onClose}
        >
            <div
                className="w-full rounded-t-[2rem] max-h-[92vh] flex flex-col shadow-2xl bg-[#FFFFFF] dark:bg-[#1C1C1C]"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-chip" />
                </div>

                {/* Header del equipo */}
                <div className="px-5 pb-4 pt-2 border-b border-black/[0.07] dark:border-white/[0.07] shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-label font-black text-muted uppercase mb-1">Historial del Dispenser</p>
                            <h3 className="text-title font-black text-ink uppercase leading-none">
                                {equipo.marca} {equipo.modelo}
                            </h3>
                            <p className="text-caption font-bold text-brand-red mt-0.5">
                                S/N: {equipo.numeroSerie}
                            </p>
                            {equipo.ubicacion && (
                                <p className="text-label font-bold text-muted mt-0.5 uppercase">📍 {equipo.ubicacion}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-chip text-muted active:scale-90"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Stats rápidas */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-xl p-3 text-center">
                            <p className="text-body-lg font-black text-brand-red leading-none">{historial.length}</p>
                            <p className="text-label font-black text-muted uppercase mt-0.5">Servicios</p>
                        </div>
                        <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-xl p-3 text-center">
                            <p className="text-body-lg font-black text-brand-amber leading-none">${fmt(totalGastado)}</p>
                            <p className="text-label font-black text-muted uppercase mt-0.5">Total facturado</p>
                        </div>
                        <div className="bg-[#EFEDEA] dark:bg-[#242424] rounded-xl p-3 text-center">
                            <p className="text-body-lg font-black text-ink leading-none">
                                {diasSinAtender !== null ? diasSinAtender : '—'}
                            </p>
                            <p className="text-label font-black text-muted uppercase mt-0.5">Días sin service</p>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {historial.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted font-black uppercase text-caption">Sin servicios registrados</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Línea vertical del timeline */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-chip" />

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
                                                        ? 'bg-brand-red border-brand-red'
                                                        : 'bg-[#FFFFFF] dark:bg-[#1C1C1C] border-chip'
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
                                                                <span className="text-label font-black bg-[#D13A28]/10 text-brand-red px-1.5 py-0.5 rounded uppercase">
                                                                    Último
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-caption font-bold text-muted">
                                                            {formatFecha(s.fecha)}
                                                        </p>
                                                    </div>

                                                    {/* Trabajo realizado */}
                                                    {item?.trabajoRealizado && (
                                                        <p className="text-body font-bold text-ink mb-2 leading-snug">
                                                            {item.trabajoRealizado}
                                                        </p>
                                                    )}

                                                    {/* Repuestos */}
                                                    {repuestos.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {repuestos.map((r, i) => (
                                                                <span key={i} className="text-label font-black px-2 py-0.5 rounded-lg bg-chip text-secondary uppercase">
                                                                    {r.cantidad}× {r.nombre}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Costos */}
                                                    <div className="flex justify-between items-center pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                                                        <div className="flex items-center gap-3">
                                                            {Number(item?.costoExtra || 0) > 0 && (
                                                                <span className="text-caption font-bold text-muted">
                                                                    MO: <span className="text-brand-amber font-black">${fmt(item.costoExtra)}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-body-lg font-black text-ink">
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
