import React from 'react';
import logo from '../../assets/logo-dispenser.svg';
import { useTheme } from '../../hooks/useTheme';
import { useMontos } from '../../context/MontosContext';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../hooks/useBadges';

// IDs deben coincidir EXACTAMENTE con App.js, Drawer y BottomNav
const MENU_OPERACIONES_ADMIN = [
    { id: 'caja',             icon: '🏠', nombre: 'Caja'             },
    { id: 'venta',            icon: '🛒', nombre: 'Venta / Insumos'  },
    { id: 'servicio-tecnico', icon: '🔧', nombre: 'Servicio Técnico' },
    { id: 'historial',        icon: '📋', nombre: 'Historial'        },
    { id: 'presupuestos',     icon: '💰', nombre: 'Presupuestos'     },
];

const MENU_OPERACIONES_TECNICO = [
    { id: 'servicio-tecnico', icon: '🔧', nombre: 'Servicio Técnico' },
    { id: 'mis-ordenes',      icon: '📌', nombre: 'Mis Órdenes'      },
    { id: 'historial',        icon: '📋', nombre: 'Historial'        },
];

const MENU_ADMIN = [
    { id: 'clientes',  icon: '👥', nombre: 'Clientes'  },
    { id: 'productos', icon: '📦', nombre: 'Productos' },
    { id: 'despacho',  icon: '📌', nombre: 'Despacho'  },
    { id: 'radar',     icon: '🚨', nombre: 'Radar'     },
    { id: 'finanzas',  icon: '💹', nombre: 'Finanzas'  },
    { id: 'usuarios',  icon: '🔐', nombre: 'Usuarios'  },
];

// Chevron SVG izquierda/derecha
const ChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

export default function Sidebar({ vistaActual, setVistaActual, colapsado, setColapsado }) {
    const { isDark, toggleTheme } = useTheme();
    const { montosVisibles, toggleMontos } = useMontos();
    const { usuario, logout, esAdmin } = useAuth();
    const { pendientes, ordenesActivas } = useBadges();
    const menuOperaciones = esAdmin ? MENU_OPERACIONES_ADMIN : MENU_OPERACIONES_TECNICO;

    const MenuItem = ({ item }) => {
        const activa = vistaActual === item.id;
        const badge =
            item.id === 'servicio-tecnico' && pendientes > 0 ? pendientes :
            (item.id === 'mis-ordenes' || item.id === 'despacho') && ordenesActivas > 0 ? ordenesActivas :
            null;
        const baseBtn = activa
            ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white font-black shadow-lg'
            : 'text-[#57534E] dark:text-[#A8A29E] hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] font-bold';

        if (colapsado) {
            return (
                <div onClick={() => setVistaActual(item.id)} title={item.nombre}
                    className={`relative h-11 w-11 mx-auto rounded-2xl cursor-pointer flex items-center justify-center text-xl transition-all duration-200 active:scale-95 ${baseBtn}`}>
                    {item.icon}
                    {badge && (
                        <span className="absolute top-0.5 right-0.5 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full bg-[#D13A28] dark:bg-[#E8422F] text-white leading-none">
                            {badge}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div onClick={() => setVistaActual(item.id)}
                className={`px-5 py-3.5 rounded-2xl cursor-pointer text-[13px] transition-all duration-200 flex items-center gap-3 whitespace-nowrap active:scale-95 ${baseBtn}`}>
                <span>{item.icon} {item.nombre}</span>
                {badge && (
                    <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${activa ? 'bg-white/30 text-white' : 'bg-[#D13A28] dark:bg-[#E8422F] text-white'}`}>
                        {badge}
                    </span>
                )}
            </div>
        );
    };

    const iconBtn = 'p-2 rounded-xl transition-all hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E]';

    return (
        <aside className={`hidden md:flex flex-col h-screen sticky top-0 bg-[#D8D4CE] dark:bg-[#1C1C1C] border-r border-black/[0.07] dark:border-white/[0.07] transition-all duration-300 z-50 overflow-hidden ${colapsado ? 'w-[64px]' : 'w-[270px]'}`}>

            {/* LOGO / TOGGLE */}
            <div className={`relative border-b border-black/[0.07] dark:border-white/[0.07] flex items-center ${colapsado ? 'justify-center py-5' : 'px-8 pt-8 pb-6'}`}>
                {!colapsado && (
                    <>
                        <img src={logo} alt="Logo" className="w-full max-w-[150px] mx-auto block drop-shadow-sm dark:brightness-110" />
                        <p className="text-[9px] font-black text-[#A8A29E] mt-3 tracking-[0.2em] uppercase text-center">Sistema de Logística</p>
                    </>
                )}
                <button onClick={() => setColapsado(!colapsado)}
                    title={colapsado ? 'Expandir sidebar' : 'Colapsar sidebar'}
                    className={`${colapsado ? '' : 'absolute top-3 right-3'} w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] text-[#A8A29E] transition-all`}>
                    {colapsado ? <ChevronRight /> : <ChevronLeft />}
                </button>
            </div>

            {/* NAVEGACIÓN */}
            <nav className={`flex-1 overflow-y-auto py-5 space-y-6 ${colapsado ? 'px-1.5' : 'px-4'}`}>
                <div>
                    {!colapsado && <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-2">Operaciones</p>}
                    <div className="space-y-1">
                        {menuOperaciones.map(item => <MenuItem key={item.id} item={item} />)}
                    </div>
                </div>
                {esAdmin && (
                    <div>
                        {!colapsado && <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-2">Administración</p>}
                        <div className="space-y-1">
                            {MENU_ADMIN.map(item => <MenuItem key={item.id} item={item} />)}
                        </div>
                    </div>
                )}
            </nav>

            {/* USUARIO + FOOTER */}
            <div className={`border-t border-black/[0.07] dark:border-white/[0.07] ${colapsado ? 'py-3 flex flex-col items-center gap-1' : 'px-5 py-4'}`}>
                {!colapsado && (
                    <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{usuario?.nombre}</p>
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-wider">
                                {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Técnico'}
                            </p>
                        </div>
                        <button onClick={logout} title="Cerrar sesión"
                            className="ml-2 px-2 py-1.5 rounded-lg text-[10px] font-black text-[#D13A28] dark:text-[#E8422F] hover:bg-[#D13A28]/10 dark:hover:bg-[#E8422F]/10 transition-all whitespace-nowrap">
                            Salir
                        </button>
                    </div>
                )}
                <div className={`flex items-center ${colapsado ? 'flex-col gap-1' : 'justify-between'}`}>
                    {!colapsado && <span className="text-[9px] text-[#A8A29E] font-black uppercase tracking-widest">v1.0</span>}
                    <div className={`flex items-center ${colapsado ? 'flex-col gap-1' : 'gap-1'}`}>
                        <button onClick={toggleMontos} title={montosVisibles ? 'Ocultar montos' : 'Mostrar montos'}
                            className={`${iconBtn} ${montosVisibles ? 'text-[#57534E] dark:text-[#A8A29E]' : 'text-[#D13A28] dark:text-[#E8422F]'}`}>
                            {montosVisibles ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                            )}
                        </button>
                        <button onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'}
                            className={`${iconBtn} text-[#57534E] dark:text-[#A8A29E]`}>
                            <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                        </button>
                        {colapsado && (
                            <button onClick={logout} title="Cerrar sesión"
                                className={`${iconBtn} text-[#D13A28] dark:text-[#E8422F]`}>
                                🚪
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
