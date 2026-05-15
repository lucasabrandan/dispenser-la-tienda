import React, { useState } from 'react';
import logo from '../../assets/logo-dispenser.svg';
import Sidebar from './Sidebar';
import Drawer from './Drawer';
import BottomNav from './BottomNav';
import { useTheme } from '../../hooks/useTheme';
import { useMontos } from '../../context/MontosContext';

const NOMBRES_SECCION = {
    'caja':             'Caja',
    'venta':            'Ventas',
    'servicio-tecnico': 'Servicio Técnico',
    'historial':        'Historial',
    'presupuestos':     'Presupuestos',
    'clientes':         'Clientes',
    'productos':        'Productos',
    'despacho':         'Despacho',
    'radar':            'Radar',
    'finanzas':         'Finanzas',
    'usuarios':         'Usuarios',
    'mis-ordenes':      'Mis Órdenes',
};

export default function Layout({ children, vistaActual, setVistaActual }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sidebarColapsado, setSidebarColapsado] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { montosVisibles, toggleMontos } = useMontos();

    return (
        <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 antialiased bg-[#F5F3F1] dark:bg-[#141414]">

            {/* SIDEBAR DESKTOP */}
            <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual}
                colapsado={sidebarColapsado} setColapsado={setSidebarColapsado} />

            <div className="flex-1 flex flex-col min-w-0">

                {/* HEADER MOBILE */}
                <header className="md:hidden h-16 px-3 flex items-center justify-between sticky top-0 z-40 transition-colors flex-shrink-0 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-b border-black/[0.08] dark:border-white/[0.07]">
                    {/* Hamburger */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#9E9A94]"
                    >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                            <rect width="18" height="2" rx="1" fill="currentColor"/>
                            <rect y="6" width="12" height="2" rx="1" fill="currentColor"/>
                            <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
                        </svg>
                    </button>

                    {/* Sección actual */}
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Dispenser La Tienda" className="h-8 w-auto" />
                        <span className="font-black text-[13px] tracking-tight uppercase text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                            {NOMBRES_SECCION[vistaActual] || 'Dispenser'}
                        </span>
                    </div>

                    {/* Iconos derecha */}
                    <div className="flex items-center gap-0.5">

                        {/* Ojito — ocultar/mostrar montos */}
                        <button
                            onClick={toggleMontos}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                                montosVisibles ? 'text-[#9E9A94]' : 'text-[#E8422F]'
                            }`}
                            title={montosVisibles ? 'Ocultar montos' : 'Mostrar montos'}
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

                        {/* Toggle dark/light */}
                        <button
                            onClick={toggleTheme}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                                isDark ? 'text-[#F0A500]' : 'text-[#9E9A94]'
                            }`}
                            title={isDark ? 'Modo claro' : 'Modo oscuro'}
                        >
                            <span className="text-[18px]">{isDark ? '☀️' : '🌙'}</span>
                        </button>

                    </div>
                </header>

                {/* CONTENIDO */}
                <main className="flex-1 min-h-0 overflow-y-auto">
                    <div className="w-full pb-24 md:pb-0">
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
            <BottomNav vistaActual={vistaActual} setVistaActual={setVistaActual} />
        </div>
    );
}