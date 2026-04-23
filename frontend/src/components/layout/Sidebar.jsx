import React from 'react';
import logo from '../../assets/logo-dispenser.svg';
import { useTheme } from '../../hooks/useTheme';
import { useMontos } from '../../context/MontosContext';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// IDs deben coincidir EXACTAMENTE con App.js, Drawer y BottomNav
// ─────────────────────────────────────────────────────────────────────────────
const MENU_OPERACIONES_ADMIN = [
    { id: 'caja',             nombre: '🏠 Caja'              },
    { id: 'venta',            nombre: '🛒 Venta / Insumos'   },
    { id: 'servicio-tecnico', nombre: '🔧 Servicio Técnico'  },
    { id: 'historial',        nombre: '📋 Historial'         },
    { id: 'presupuestos',     nombre: '💰 Presupuestos'      },
];

// El técnico solo puede crear y ver servicios
const MENU_OPERACIONES_TECNICO = [
    { id: 'servicio-tecnico', nombre: '🔧 Servicio Técnico' },
    { id: 'historial',        nombre: '📋 Historial'        },
];

const MENU_ADMIN = [
    { id: 'clientes',  nombre: '👥 Clientes'  },
    { id: 'productos', nombre: '📦 Productos' },
    { id: 'radar',     nombre: '🚨 Radar'     },
    { id: 'finanzas',  nombre: '💹 Finanzas'  },
    { id: 'usuarios',  nombre: '🔐 Usuarios'  },
];

export default function Sidebar({ vistaActual, setVistaActual }) {
    const { isDark, toggleTheme } = useTheme();
    const { montosVisibles, toggleMontos } = useMontos();
    const { usuario, logout, esAdmin } = useAuth();

    const menuOperaciones = esAdmin ? MENU_OPERACIONES_ADMIN : MENU_OPERACIONES_TECNICO;

    const MenuItem = ({ item }) => {
        const activa = vistaActual === item.id;
        return (
            <div
                onClick={() => setVistaActual(item.id)}
                className={`px-5 py-3.5 rounded-2xl cursor-pointer text-[13px] transition-all duration-200 flex items-center gap-3 whitespace-nowrap active:scale-95 ${
                    activa
                        ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white font-black shadow-lg'
                        : 'text-[#57534E] dark:text-[#A8A29E] hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] font-bold'
                }`}
            >
                {item.nombre}
            </div>
        );
    };

    return (
        <aside className="hidden md:flex flex-col w-[270px] h-screen sticky top-0 bg-[#D8D4CE] dark:bg-[#1C1C1C] border-r border-black/[0.07] dark:border-white/[0.07] transition-colors duration-300 z-50">

            {/* LOGO */}
            <div className="px-8 pt-8 pb-6 border-b border-black/[0.07] dark:border-white/[0.07]">
                <img
                    src={logo}
                    alt="Logo"
                    className="w-full max-w-[150px] mx-auto block drop-shadow-sm dark:brightness-110"
                />
                <p className="text-[9px] font-black text-[#A8A29E] mt-3 tracking-[0.2em] uppercase text-center">
                    Sistema de Logística
                </p>
            </div>

            {/* NAVEGACIÓN */}
            <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

                {/* OPERACIONES */}
                <div>
                    <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-2">
                        Operaciones
                    </p>
                    <div className="space-y-1">
                        {menuOperaciones.map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                </div>

                {/* ADMINISTRACIÓN — solo visible para admin */}
                {esAdmin && (
                    <div>
                        <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-2">
                            Administración
                        </p>
                        <div className="space-y-1">
                            {MENU_ADMIN.map(item => <MenuItem key={item.id} item={item} />)}
                        </div>
                    </div>
                )}
            </nav>

            {/* USUARIO LOGUEADO */}
            <div className="px-5 py-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">
                            {usuario?.nombre}
                        </p>
                        <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-wider">
                            {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Técnico'}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        title="Cerrar sesión"
                        className="ml-2 px-2 py-1.5 rounded-lg text-[10px] font-black text-[#D13A28] dark:text-[#E8422F] hover:bg-[#D13A28]/10 dark:hover:bg-[#E8422F]/10 transition-all whitespace-nowrap"
                    >
                        Salir
                    </button>
                </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-5 border-t border-black/[0.07] dark:border-white/[0.07] flex items-center justify-between">
                <span className="text-[9px] text-[#A8A29E] font-black uppercase tracking-widest">
                    v1.0
                </span>
                <div className="flex items-center gap-1">
                    {/* Ojito — ocultar/mostrar montos */}
                    <button
                        onClick={toggleMontos}
                        className={`p-2 rounded-xl transition-all hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] ${
                            montosVisibles ? 'text-[#57534E] dark:text-[#A8A29E]' : 'text-[#D13A28] dark:text-[#E8422F]'
                        }`}
                        title={montosVisibles ? 'Ocultar montos' : 'Mostrar montos'}
                    >
                        {montosVisibles ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                        )}
                    </button>
                    {/* Toggle dark/light */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] rounded-xl transition-colors text-[#57534E] dark:text-[#A8A29E]"
                        title={isDark ? 'Modo claro' : 'Modo oscuro'}
                    >
                        <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
