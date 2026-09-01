import React, { useState, useEffect, useCallback } from 'react';
import logo from '../../assets/logo-dispenser.svg';
import Sidebar from './Sidebar';
import Drawer from './Drawer';
import BottomNav from './BottomNav';
import NotificacionesPanel, { NotifBell } from './NotificacionesPanel';
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
    'servicio-tecnico': 'Servicio Técnico',
    'presupuestos':     'Presupuestos',
    'clientes':         'Clientes',
    'productos':        'Productos',
    'radar':            'Radar',
    'finanzas':         'Finanzas',
    'usuarios':         'Usuarios',
    'mis-ordenes':      'Mis Ordenes',
    'mi-agenda':        'Mi Agenda',
    'mi-espacio':       'Mi Espacio',
};

export default function Layout({ children, vistaActual, setVistaActual }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sidebarColapsado, setSidebarColapsado] = useState(false);
    const [notifAbierto, setNotifAbierto] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const { isDark, toggleTheme } = useTheme();
    const { montosVisibles, toggleMontos } = useMontos();
    const { logout } = useAuth();
    // Cerrar sesión en mobile solo vivía 2 taps adentro del Drawer ("Más" → scroll
    // hasta el final) — Lucas reportó que "sigue sin poderse ver". Se agrega acá,
    // al lado del resto de los accesos rápidos del header, a un tap de distancia.
    const [confirmLogoutAbierto, setConfirmLogoutAbierto] = useState(false);

    const pollNotifs = useCallback(async () => {
        try {
            const res = await api.get('/notificaciones/count');
            setNotifCount(res.data?.count || 0);
        } catch { /* silencio */ }
    }, []);

    useEffect(() => {
        pollNotifs();
        const interval = setInterval(pollNotifs, 30000);
        return () => clearInterval(interval);
    }, [pollNotifs]);

    return (
        <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 antialiased bg-page">

            {/* SIDEBAR DESKTOP */}
            <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual}
                colapsado={sidebarColapsado} setColapsado={setSidebarColapsado} />

            <div className="flex-1 flex flex-col min-w-0">

                {/* HEADER MOBILE */}
                <header className="md:hidden h-14 px-3 flex items-center justify-between sticky top-0 z-40 transition-colors flex-shrink-0 bg-panel border-b border-black/[0.08] dark:border-white/[0.07]">

                    {/* Logo + sección actual */}
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setVistaActual('caja')}>
                        <img src={logo} alt="Dispenser La Tienda" className="h-12 w-auto" />
                        <span className="font-black text-[14px] tracking-tight uppercase text-ink leading-none">
                            {NOMBRES_SECCION[vistaActual] || 'Dispenser'}
                        </span>
                    </div>

                    {/* Iconos derecha */}
                    <div className="flex items-center gap-0.5">
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

            {/* BOTTOM NAV MOBILE */}
            <BottomNav vistaActual={vistaActual} setVistaActual={setVistaActual}
                onMoreClick={() => setDrawerOpen(true)} />

            {/* PANEL NOTIFICACIONES */}
            <NotificacionesPanel abierto={notifAbierto} onCerrar={() => { setNotifAbierto(false); pollNotifs(); }} />

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