import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const TIPO_CONFIG = {
    ORDEN_ASIGNADA:        { emoji: '\uD83D\uDCCB', label: 'Nueva orden',     color: 'text-[#3B82F6]' },
    ORDEN_EN_CAMINO:       { emoji: '\uD83D\uDE97', label: 'En camino',       color: 'text-[#3B82F6]' },
    ORDEN_EN_SITIO:        { emoji: '\uD83D\uDCCD', label: 'En sitio',        color: 'text-[#D48800]' },
    ORDEN_COMPLETADA:      { emoji: '\u2705',       label: 'Completado',      color: 'text-[#16A34A]' },
    ORDEN_NO_ATENDIDO:     { emoji: '\u26A0\uFE0F', label: 'No atendido',     color: 'text-[#D13A28]' },
    PRESUPUESTO_EJECUTADO: { emoji: '\uD83D\uDE80', label: 'Ejecutado',       color: 'text-[#8B5CF6]' },
    COBRO_REGISTRADO:      { emoji: '\uD83D\uDCB0', label: 'Cobro',           color: 'text-[#16A34A]' },
    MENSAJE_LIBRE:         { emoji: '\uD83D\uDCE9', label: 'Mensaje',         color: 'text-[#57534E]' },
};

function tiempoRelativo(fecha) {
    const ms = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `${min}m`;
    const hs = Math.floor(min / 60);
    if (hs < 24) return `${hs}h`;
    const dias = Math.floor(hs / 24);
    return `${dias}d`;
}

// Boton campanita con badge
export function NotifBell({ count, onClick }) {
    return (
        <button onClick={onClick}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 text-[#9E9A94]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D13A28] dark:bg-[#E8422F] text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
}

// Panel desplegable de notificaciones
export default function NotificacionesPanel({ abierto, onCerrar }) {
    const [notifs, setNotifs] = useState([]);
    const [cargando, setCargando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const res = await api.get('/notificaciones');
            setNotifs(res.data || []);
        } catch { /* silencio */ } finally { setCargando(false); }
    }, []);

    useEffect(() => {
        if (abierto) cargar();
    }, [abierto, cargar]);

    const marcarLeida = async (id) => {
        try {
            await api.patch(`/notificaciones/${id}/leer`);
            setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        } catch { /* silencio */ }
    };

    const marcarTodas = async () => {
        try {
            await api.patch('/notificaciones/leer-todas');
            setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
        } catch { /* silencio */ }
    };

    if (!abierto) return null;

    const noLeidas = notifs.filter(n => !n.leida).length;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onCerrar} />
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-[201] bg-[#FFFFFF] dark:bg-[#1C1C1C] shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.07]">
                    <div>
                        <h2 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Notificaciones</h2>
                        {noLeidas > 0 && (
                            <p className="text-[10px] font-bold text-[#D13A28] dark:text-[#E8422F]">{noLeidas} sin leer</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {noLeidas > 0 && (
                            <button onClick={marcarTodas}
                                className="text-[10px] font-bold text-[#3B82F6] px-2 py-1 rounded-lg active:scale-95">
                                Marcar todas leidas
                            </button>
                        )}
                        <button onClick={onCerrar}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A8A29E] active:scale-90 text-lg">
                            ×
                        </button>
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {cargando ? (
                        <div className="space-y-3 p-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-[#EFEDEA] dark:bg-[#242424]" />)}
                        </div>
                    ) : notifs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#A8A29E]">
                            <span className="text-3xl mb-2">🔔</span>
                            <p className="text-[13px] font-bold">Sin notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {notifs.map(n => {
                                const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.MENSAJE_LIBRE;
                                return (
                                    <div key={n.id}
                                        onClick={() => !n.leida && marcarLeida(n.id)}
                                        className={`px-4 py-3 flex gap-3 items-start transition-colors cursor-pointer active:bg-[#EFEDEA] dark:active:bg-[#242424] ${
                                            !n.leida ? 'bg-[#F0F4FF] dark:bg-[#1A2030]' : ''
                                        }`}>
                                        <span className="text-[20px] mt-0.5 shrink-0">{cfg.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                                                <span className="text-[9px] text-[#A8A29E]">{tiempoRelativo(n.creadoEn)}</span>
                                                {!n.leida && <span className="w-2 h-2 rounded-full bg-[#D13A28] dark:bg-[#E8422F] shrink-0" />}
                                            </div>
                                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] leading-tight truncate">
                                                {n.titulo}
                                            </p>
                                            {n.mensaje && (
                                                <p className="text-[11px] text-[#A8A29E] mt-0.5 line-clamp-2">{n.mensaje}</p>
                                            )}
                                            {n.origenNombre && (
                                                <p className="text-[10px] text-[#A8A29E] mt-0.5">de {n.origenNombre}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
