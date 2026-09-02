import React, { useState, useEffect, useCallback } from 'react';
import { LuBellOff, LuBell } from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { pushSoportado, estaSuscripto, activarNotificaciones, desactivarNotificaciones, resincronizar } from '../../utils/pushNotifications';

const TIPO_CONFIG = {
    ORDEN_ASIGNADA:        { emoji: '\uD83D\uDCCB', label: 'Nueva orden',     color: 'text-[#3B82F6]' },
    ORDEN_EN_CAMINO:       { emoji: '\uD83D\uDE97', label: 'En camino',       color: 'text-[#3B82F6]' },
    ORDEN_EN_SITIO:        { emoji: '\uD83D\uDCCD', label: 'En sitio',        color: 'text-[#D48800]' },
    ORDEN_COMPLETADA:      { emoji: '\u2705',       label: 'Completado',      color: 'text-[#16A34A]' },
    ORDEN_NO_ATENDIDO:     { emoji: '\u26A0\uFE0F', label: 'No atendido',     color: 'text-[#D13A28]' },
    PRESUPUESTO_EJECUTADO: { emoji: '\uD83D\uDE80', label: 'Ejecutado',       color: 'text-[#8B5CF6]' },
    COBRO_REGISTRADO:      { emoji: '\uD83D\uDCB0', label: 'Cobro',           color: 'text-[#16A34A]' },
    MENSAJE_LIBRE:         { emoji: '\uD83D\uDCE9', label: 'Mensaje',         color: 'text-[#57534E]' },
    TRABAJO_ASIGNADO:      { emoji: '\uD83D\uDD27', label: 'Trabajo asignado', color: 'text-[#3B82F6]' },
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
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-red text-white text-label font-black flex items-center justify-center leading-none">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
}

// Panel desplegable de notificaciones
export default function NotificacionesPanel({ abierto, onCerrar, onAbrirTrabajo }) {
    const [notifs, setNotifs] = useState([]);
    const [cargando, setCargando] = useState(false);
    // 'cargando' | 'no-soportado' | 'denegado' | 'inactivo' | 'activo'
    const [pushEstado, setPushEstado] = useState('cargando');
    const [activandoPush, setActivandoPush] = useState(false);
    const [desactivandoPush, setDesactivandoPush] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const res = await api.get('/notificaciones');
            setNotifs(res.data || []);
        } catch { /* silencio */ } finally { setCargando(false); }
    }, []);

    useEffect(() => {
        if (!abierto) return;
        cargar();
        if (!pushSoportado()) { setPushEstado('no-soportado'); return; }
        if (Notification.permission === 'denied') { setPushEstado('denegado'); return; }
        estaSuscripto().then(async (ya) => {
            if (ya) {
                // El navegador ya esta suscripto — reconfirmamos con el backend por
                // si ese endpoint no habia quedado guardado (antes esto no dejaba
                // ningun rastro visible: el boton de activar desaparecia para
                // siempre y no habia forma de saber si de verdad estaba prendido).
                await resincronizar();
            }
            setPushEstado(ya ? 'activo' : 'inactivo');
        }).catch(() => {});
    }, [abierto, cargar]);

    const activarPush = async () => {
        setActivandoPush(true);
        try {
            await activarNotificaciones();
            toast.success('Notificaciones activadas en este dispositivo');
            setPushEstado('activo');
        } catch (e) {
            toast.error(e.message || 'No se pudo activar');
        } finally {
            setActivandoPush(false);
        }
    };

    const desactivarPush = async () => {
        setDesactivandoPush(true);
        try {
            await desactivarNotificaciones();
            toast.success('Notificaciones desactivadas en este dispositivo');
            setPushEstado('inactivo');
        } catch {
            toast.error('No se pudo desactivar');
        } finally {
            setDesactivandoPush(false);
        }
    };

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
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-[201] bg-card shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.07]">
                    <div>
                        <h2 className="text-title font-black text-ink">Notificaciones</h2>
                        {noLeidas > 0 && (
                            <p className="text-label font-bold text-brand-red">{noLeidas} sin leer</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {noLeidas > 0 && (
                            <button onClick={marcarTodas}
                                className="text-label font-bold text-[#3B82F6] px-2 py-1 rounded-lg active:scale-95">
                                Marcar todas leidas
                            </button>
                        )}
                        <button onClick={onCerrar}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted active:scale-90 text-lg">
                            ×
                        </button>
                    </div>
                </div>

                {/* Estado de push en este dispositivo — siempre visible, no solo el boton de activar */}
                {pushEstado === 'activo' && (
                    <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5 bg-panel shrink-0">
                        <LuBell size={16} className="text-[#16A34A] shrink-0" />
                        <span className="flex-1 min-w-0">
                            <span className="block text-caption font-black text-ink">Notificaciones activadas ✓</span>
                            <span className="block text-label text-muted mt-0.5">Te avisa aunque tengas la app cerrada</span>
                        </span>
                        <button onClick={desactivarPush} disabled={desactivandoPush}
                            className="text-label font-bold text-muted underline shrink-0 disabled:opacity-60">
                            {desactivandoPush ? '...' : 'Desactivar'}
                        </button>
                    </div>
                )}
                {pushEstado === 'inactivo' && (
                    <button onClick={activarPush} disabled={activandoPush}
                        className="mx-4 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left bg-panel active:scale-[0.98] transition-all disabled:opacity-60 shrink-0">
                        <LuBell size={16} className="text-brand-red shrink-0" />
                        <span className="flex-1 min-w-0">
                            <span className="block text-caption font-black text-ink">
                                {activandoPush ? 'Activando…' : 'Activar notificaciones en este dispositivo'}
                            </span>
                            <span className="block text-label text-muted mt-0.5">Te avisa aunque tengas la app cerrada</span>
                        </span>
                    </button>
                )}
                {pushEstado === 'denegado' && (
                    <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-panel shrink-0">
                        <span className="flex items-center gap-2.5">
                            <LuBellOff size={16} className="text-muted shrink-0" />
                            <span className="block text-caption font-black text-ink">Notificaciones bloqueadas</span>
                        </span>
                        <span className="block text-label text-muted mt-1">
                            Las bloqueaste en este navegador — para activarlas, entrá a la configuración del sitio (candado en la barra de direcciones → Notificaciones → Permitir) y volvé a abrir la campanita.
                        </span>
                    </div>
                )}

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {cargando ? (
                        <div className="space-y-3 p-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-panel" />)}
                        </div>
                    ) : notifs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted">
                            <LuBellOff size={32} className="mb-2 text-muted inline-block" />
                            <p className="text-body font-bold">Sin notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {notifs.map(n => {
                                const cfg = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.MENSAJE_LIBRE;
                                return (
                                    <div key={n.id}
                                        onClick={() => {
                                            if (!n.leida) marcarLeida(n.id);
                                            // Solo TRABAJO_ASIGNADO esta ligado a un Servicio puntual — los
                                            // demas tipos (ordenes) usan otro espacio de ids, no hay pantalla
                                            // de detalle para ellos todavia.
                                            if (n.tipo === 'TRABAJO_ASIGNADO' && n.referenciaId && onAbrirTrabajo) {
                                                onAbrirTrabajo(n.referenciaId);
                                            }
                                        }}
                                        className={`px-4 py-3 flex gap-3 items-start transition-colors cursor-pointer active:bg-[#EFEDEA] dark:active:bg-[#242424] ${
                                            !n.leida ? 'bg-[#F0F4FF] dark:bg-[#1A2030]' : ''
                                        }`}>
                                        <span className="text-[20px] mt-0.5 shrink-0">{cfg.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-label font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                                                <span className="text-caption text-muted">{tiempoRelativo(n.creadoEn)}</span>
                                                {!n.leida && <span className="w-2 h-2 rounded-full bg-brand-red shrink-0" />}
                                            </div>
                                            <p className="text-body font-bold text-ink leading-tight truncate">
                                                {n.titulo}
                                            </p>
                                            {n.mensaje && (
                                                <p className="text-caption text-muted mt-0.5 line-clamp-2">{n.mensaje}</p>
                                            )}
                                            {n.origenNombre && (
                                                <p className="text-caption text-muted mt-0.5">de {n.origenNombre}</p>
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
