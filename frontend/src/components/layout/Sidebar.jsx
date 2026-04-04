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
                        {MENU_OPERACIONES.map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                </div>

                {/* ADMINISTRACIÓN */}
                <div>
                    <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-2">
                        Administración
                    </p>
                    <div className="space-y-1">
                        {MENU_ADMIN.map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                </div>
            </nav>

            {/* FOOTER */}
            <div className="px-6 py-5 border-t border-black/[0.07] dark:border-white/[0.07] flex items-center justify-between">
                <span className="text-[9px] text-[#A8A29E] font-black uppercase tracking-widest">
                    v3.0
                </span>
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] rounded-xl transition-colors text-[#57534E] dark:text-[#A8A29E]"
                    title={isDark ? 'Modo claro' : 'Modo oscuro'}
                >
                    <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                </button>
            </div>
        </aside>
    );
}
