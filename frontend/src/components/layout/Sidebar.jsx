import React from 'react';
import logo from '../../assets/logo-dispenser.svg';
import { useTheme } from '../../hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// IDs deben coincidir EXACTAMENTE con App.js, Drawer y BottomNav
// ─────────────────────────────────────────────────────────────────────────────
const MENU_OPERACIONES = [
    { id: 'caja',             nombre: '🏠 Caja'              },
    { id: 'venta',            nombre: '🛒 Venta / Insumos'   },
    { id: 'servicio-tecnico', nombre: '🔧 Servicio Técnico'  },
    { id: 'historial',        nombre: '📋 Historial'         },
    { id: 'presupuestos',     nombre: '💰 Presupuestos'      },
];

const MENU_ADMIN = [
    { id: 'clientes',  nombre: '👥 Clientes'  },
    { id: 'productos', nombre: '📦 Productos' },
    { id: 'radar',     nombre: '🚨 Radar'     },
    { id: 'finanzas',  nombre: '💹 Finanzas'  },
];

export default function Sidebar({ vistaActual, setVistaActual }) {
    const { isDark, toggleTheme } = useTheme();

    const MenuItem = ({ item }) => {
        const activa = vistaActual === item.id;
        return (
            <div
                onClick={() => setVistaActual(item.id)}
                className={`px-5 py-3.5 rounded-2xl cursor-pointer text-[13px] transition-all duration-200 flex items-center gap-3 whitespace-nowrap active:scale-95 ${
                    activa
                        ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/25'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold'
                }`}
            >
                {item.nombre}
            </div>
        );
    };

    return (
        <aside className="hidden md:flex flex-col w-[270px] h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors duration-300 z-50">

            {/* LOGO */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800/50">
                <img
                    src={logo}
                    alt="Logo"
                    className="w-full max-w-[150px] mx-auto block drop-shadow-sm dark:brightness-110"
                />
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 mt-3 tracking-[0.2em] uppercase text-center">
                    Sistema de Logística
                </p>
            </div>

            {/* NAVEGACIÓN */}
            <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">

                {/* OPERACIONES */}
                <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-3 px-2">
                        Operaciones
                    </p>
                    <div className="space-y-1">
                        {MENU_OPERACIONES.map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                </div>

                {/* ADMINISTRACIÓN */}
                <div>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-3 px-2">
                        Administración
                    </p>
                    <div className="space-y-1">
                        {MENU_ADMIN.map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                </div>
            </nav>

            {/* FOOTER */}
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[9px] text-slate-300 dark:text-slate-600 font-black uppercase tracking-widest">
                    v3.0
                </span>
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400"
                    title={isDark ? 'Modo claro' : 'Modo oscuro'}
                >
                    <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                </button>
            </div>
        </aside>
    );
}