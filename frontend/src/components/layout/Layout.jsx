import React, { useState, useEffect, useCallback, useRef } from 'react';
import AvisoUrgente, { esUrgente, sonarAviso } from './AvisoUrgente';
import FichaVisitaSheet from '../dashboard/FichaVisitaSheet';
import { useArrastrarHojas } from '../../hooks/useArrastrarHojas';
import logo from '../../assets/logo-dispenser.svg';
import Sidebar from './Sidebar';
import Drawer from './Drawer';
import BottomNav from './BottomNav';
import NotificacionesPanel, { NotifBell } from './NotificacionesPanel';
import TrabajoDeepLink from '../servicio/TrabajoDeepLink';
import PendientesOfflineBanner from '../ui/PendientesOfflineBanner';
import { useTheme } from '../../hooks/useTheme';
import { useMontos } from '../../context/MontosContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { LuSun, LuMoon, LuLogOut } from 'react-icons/lu';
import ConfirmDialog from '../ui/ConfirmDialog';

// 'historial' y 'despacho' se sacaron (26-ago): sus funciones viven ahora
// adentro de Venta ("Todo") y Servicio Técnico (modo Despacho), sin ruta propia.
const NOMBRES_SECCION = {
    'caja':             'Panel',
    'venta':            'Ventas',
    'trabajos':         'Trabajos',
    'servicio-tecnico': 'Servicio Técnico',
    'presupuestos':     'Presupuestos',
    'configuracion':    'Configuración',
    'clientes':         'Clientes',
    'productos':        'Productos',
    'radar':            'Radar',
    'finanzas':         'Finanzas',
    'usuarios':         'Usuarios',
    'mis-ordenes':      'Hoy',
    'mi-sueldo':        'Mi mes',
    'lo-mio':           'Lo mío',
    'mi-agenda':        'Mi Agenda',
    'mi-espacio':       'Mi Espacio',
};

export default function Layout({ children, vistaActual, setVistaActual }) {
    useArrastrarHojas(); // celular: cerrar ventanas arrastrándolas hacia abajo
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sidebarColapsado, setSidebarColapsado] = useState(false);
    const [notifAbierto, setNotifAbierto] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [trabajoDeepLinkId, setTrabajoDeepLinkId] = useState(null);
    const [fichaOrden, setFichaOrden] = useState(null); // visita abierta desde una notificación (admin)
    const { isDark, toggleTheme } = useTheme();
    const { montosVisibles, toggleMontos } = useMontos();
    const { logout, esAdmin } = useAuth();
    // Cerrar sesión en mobile solo vivía 2 taps adentro del Drawer ("Más" → scroll
    // hasta el final) — Lucas reportó que "sigue sin poderse ver". Se agrega acá,
    // al lado del resto de los accesos rápidos del header, a un tap de distancia.
    const [confirmLogoutAbierto, setConfirmLogoutAbierto] = useState(false);

    // Avisos urgentes (5-oct-2026): ventana en el medio con sonido para lo que no
    // puede esperar (ver AvisoUrgente.jsx). Se revisa cada 15 s.
    // Se muestran los urgentes sin leer de los últimos 30 min que todavía no se
    // mostraron en este navegador (guardado en localStorage: no vuelven a saltar al
    // recargar). Antes solo saltaban los que llegaban con la app ya abierta.
    const ultimoCount = useRef(0);
    const [urgentes, setUrgentes] = useState([]);
    const yaMostrados = () => { try { return new Set(JSON.parse(localStorage.getItem('urgentes_mostrados') || '[]')); } catch { return new Set(); } };
    const guardarMostrados = (set) => { try { localStorage.setItem('urgentes_mostrados', JSON.stringify([...set].slice(-200))); } catch { /* */ } };
    const buscarUrgentes = useCallback(async () => {
        try {
            const r = await api.get('/notificaciones');
            const limite = Date.now() - 30 * 60 * 1000;
            const vistos = yaMostrados();
            const urg = (r.data || []).filter(n => !n.leida && !vistos.has(n.id)
                && new Date(n.creadoEn).getTime() >= limite && esUrgente(n, esAdmin));
            if (!urg.length) return;
            urg.forEach(n => vistos.add(n.id)); guardarMostrados(vistos);
            setUrgentes(prev => [...prev, ...urg.filter(n => !prev.some(p => p.id === n.id)).reverse()]);
            sonarAviso();
        } catch { /* silencio */ }
    }, [esAdmin]);
    // Tocar una notificación de visita (5-oct-2026): el admin ve la ficha de la
    // visita; el técnico va a "Hoy" con esa tarjeta resaltada.
    const abrirOrden = async (ordenId) => {
        setNotifAbierto(false);
        if (esAdmin) {
            try { const r = await api.get(`/ordenes/${ordenId}`); setFichaOrden(r.data); }
            catch { setVistaActual('trabajos'); }
        } else {
            try { sessionStorage.setItem('resaltarOrden', String(ordenId)); } catch { /* */ }
            setVistaActual('mis-ordenes');
            window.dispatchEvent(new Event('resaltar-orden'));
        }
    };
    const listoUrgente = (n) => {
        api.patch(`/notificaciones/${n.id}/leer`).catch(() => {});
        setUrgentes(prev => prev.filter(x => x.id !== n.id));
        setNotifCount(c => Math.max(0, c - 1));
    };

    const pollNotifs = useCallback(async () => {
        try {
            const res = await api.get('/notificaciones/count');
            const c = res.data?.count || 0;
            setNotifCount(c);
            if (c > 0) buscarUrgentes();
            ultimoCount.current = c;
        } catch { /* silencio */ }
    }, [buscarUrgentes]);

    useEffect(() => {
        pollNotifs();
        const interval = setInterval(pollNotifs, 15000);
        return () => clearInterval(interval);
    }, [pollNotifs]);

    // Si se llegó acá tocando una notificación push (ver service-worker.js)
    // o una fila de la campanita (ver NotificacionesPanel), y se sabe a qué
    // trabajo corresponde (servicioId), se abre directo la pantalla de ESE
    // trabajo — sin pasar por la lista general — vía TrabajoDeepLink más
    // abajo (detalle para el técnico, línea de tiempo para el admin). Si no
    // se sabe a cuál (push viejo/degradado, sin token cacheado todavía), se
    // cae al panel general como antes.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('notif') === '1') {
            const servicioId = params.get('servicioId');
            if (servicioId) {
                setTrabajoDeepLinkId(servicioId);
            } else {
                setNotifAbierto(true);
            }
            params.delete('notif');
            params.delete('servicioId');
            params.delete('tipo');
            const resto = params.toString();
            window.history.replaceState({}, '', window.location.pathname + (resto ? `?${resto}` : ''));
        }
    }, []);

    return (
        <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 antialiased bg-page">
            <PendientesOfflineBanner />

            {/* SIDEBAR DESKTOP */}
            <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual}
                colapsado={sidebarColapsado} setColapsado={setSidebarColapsado}
                notifCount={notifCount}
                onNotifClick={() => { setNotifAbierto(true); setNotifCount(0); }} />

            <div className="flex-1 flex flex-col min-w-0">

                {/* HEADER MOBILE */}
                <header className="md:hidden h-14 px-3 flex items-center justify-between sticky top-0 z-40 transition-colors flex-shrink-0 bg-panel border-b border-black/[0.08] dark:border-white/[0.07]">

                    {/* Logo + sección actual */}
                    <div className="flex items-center gap-2.5 cursor-pointer min-w-0" onClick={() => setVistaActual(esAdmin ? 'caja' : 'mis-ordenes')}>
                        <img src={logo} alt="Dispenser La Tienda" className="h-12 w-auto shrink-0" />
                        <span className="font-black text-[14px] tracking-tight uppercase text-ink leading-none truncate">
                            {NOMBRES_SECCION[vistaActual] || 'Dispenser'}
                        </span>
                    </div>

                    {/* Iconos derecha */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onClick={toggleMontos}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                                montosVisibles ? 'text-[#9E9A94]' : 'text-[#E8422F]'
                            }`}
                        >
                            {montosVisibles ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                            )}
                        </button>
                        <NotifBell count={notifCount} onClick={() => { setNotifAbierto(true); setNotifCount(0); }} />
                        <button
                            onClick={toggleTheme}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                                isDark ? 'text-[#F0A500]' : 'text-[#9E9A94]'
                            }`}
                        >
                            {isDark ? <LuSun size={18} /> : <LuMoon size={18} />}
                        </button>
                        <button
                            onClick={() => setConfirmLogoutAbierto(true)}
                            title="Cerrar sesión"
                            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-[#9E9A94] active:scale-90"
                        >
                            <LuLogOut size={18} />
                        </button>
                    </div>
                </header>

                {/* CONTENIDO */}
                <main className="flex-1 min-h-0 overflow-y-auto">
                    <div className="w-full max-w-7xl mx-auto pb-24 md:pb-0">
                        {children}
                    </div>
                </main>
            </div>

            {/* DRAWER LATERAL MOBILE */}
            <Drawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                vistaActual={vistaActual}
                setVistaActual={setVistaActual}
            />

            {/* BOTTOM NAV MOBILE — tocar "Más" de nuevo cierra el menú, y tocar
                otra pestaña también lo cierra (4-oct-2026) */}
            <BottomNav vistaActual={vistaActual} setVistaActual={(v) => { setDrawerOpen(false); setVistaActual(v); }}
                onMoreClick={() => setDrawerOpen(v => !v)} />

            {/* PANEL NOTIFICACIONES */}
            {urgentes.length > 0 && (
                <AvisoUrgente notif={urgentes[0]} restantes={urgentes.length - 1}
                    onListo={() => listoUrgente(urgentes[0])}
                    onVerTodas={() => { setUrgentes([]); setNotifAbierto(true); setNotifCount(0); }}
                    onVerVisita={() => { const n = urgentes[0]; listoUrgente(n); abrirOrden(n.referenciaId); }} />
            )}
            {fichaOrden && (
                <FichaVisitaSheet orden={fichaOrden} onCerrar={() => setFichaOrden(null)}
                    onVerTrabajos={() => { setFichaOrden(null); setVistaActual('trabajos'); }}
                    onEliminada={() => setFichaOrden(null)} />
            )}
            <NotificacionesPanel abierto={notifAbierto}
                onCerrar={() => { setNotifAbierto(false); pollNotifs(); }}
                onAbrirTrabajo={(servicioId) => { setNotifAbierto(false); setTrabajoDeepLinkId(servicioId); }}
                onAbrirOrden={abrirOrden}
                onSinReferencia={() => { setNotifAbierto(false); setVistaActual(esAdmin ? 'trabajos' : 'mis-ordenes'); }}
            />
            {trabajoDeepLinkId && (
                <TrabajoDeepLink servicioId={trabajoDeepLinkId} onCerrar={() => setTrabajoDeepLinkId(null)} />
            )}

            {confirmLogoutAbierto && (
                <ConfirmDialog
                    titulo="¿Cerrar sesión?"
                    mensaje="Vas a salir de la app — la próxima vez vas a tener que ingresar usuario y contraseña de nuevo."
                    textoConfirmar="Sí, salir"
                    textoCancelar="Cancelar"
                    onConfirmar={() => { setConfirmLogoutAbierto(false); logout(); }}
                    onCancelar={() => setConfirmLogoutAbierto(false)}
                />
            )}
        </div>
    );
}