import React, { useEffect, useState } from 'react';
import { LuMapPin } from 'react-icons/lu';
import api from '../../services/api';

// Línea de tiempo de un trabajo puntual, para el admin — arrancó como
// presupuesto/asignación y va sumando eventos (reasignación, horario
// confirmado por el técnico, etc.) a medida que pasan, leídos del mismo
// historial de notificaciones que ya se guarda para ese trabajo (ver
// NotificacionService.historialDeTrabajo en el backend — sin agregar
// ningún registro nuevo).
function fechaHora(iso) {
    try {
        return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
}

export default function HistorialTrabajoSheet({ servicio, onCerrar }) {
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        api.get(`/notificaciones/por-trabajo/${servicio.id}`)
            .then(r => { if (activo) setEventos(r.data || []); })
            .catch(() => {})
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, [servicio.id]);

    return (
        <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={onCerrar}>
            <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-card"
                onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip" />
                <p className="text-label font-black text-muted uppercase tracking-widest mb-0.5">Historial del trabajo</p>
                <h3 className="text-title font-black mb-1 text-ink">{servicio.clienteNombre}</h3>
                <p className="text-caption text-muted mb-4 flex items-center gap-1">
                    <LuMapPin size={11} />{servicio.sedeNombre || 'Sin sede'} · {servicio.usuarioNombre || 'Sin asignar'}
                </p>

                <div className="overflow-y-auto flex-1 mb-4">
                    {cargando ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse bg-panel" />)}
                        </div>
                    ) : eventos.length === 0 ? (
                        <p className="text-body text-muted text-center py-8">Todavía no hay eventos registrados para este trabajo.</p>
                    ) : (
                        <div className="relative pl-5">
                            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-chip" />
                            {eventos.map((n, i) => (
                                <div key={n.id ?? i} className="relative pb-5 last:pb-0">
                                    <span className="absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full bg-brand-red border-2 border-card" />
                                    <p className="text-label font-black text-muted uppercase tracking-wider">{fechaHora(n.creadoEn)}</p>
                                    <p className="text-body font-bold text-ink leading-tight mt-0.5">{n.titulo}</p>
                                    {n.mensaje && <p className="text-caption text-muted mt-0.5">{n.mensaje}</p>}
                                    {n.origenNombre && <p className="text-caption text-muted mt-0.5">por {n.origenNombre}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={onCerrar}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 bg-ink dark:text-[#1C1917]">
                    Cerrar
                </button>
            </div>
        </div>
    );
}
