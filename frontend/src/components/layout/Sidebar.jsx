import React from 'react';
import logo from '../../assets/logo-dispenser.svg';
import { useTheme } from '../../hooks/useTheme';
import { useMontos } from '../../context/MontosContext';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../hooks/useBadges';
import { LuHouse, LuWrench, LuPin, LuShoppingCart, LuBanknote, LuClipboardList, LuCalendar, LuUsers, LuSiren, LuPackage, LuTrendingUp, LuLock, LuSun, LuMoon, LuLogOut } from 'react-icons/lu';

// Reordenado por flujo de trabajo real, y agrupado por dominio (servicio / ventas)
// para no mezclar todo en una sola lista larga.
const MENU_PANEL = [
    { id: 'caja', Icon: LuHouse, nombre: 'Panel' },
];
const MENU_SERVICIO = [
    { id: 'servicio-tecnico', Icon: LuWrench, nombre: 'Servicio Técnico' },
    { id: 'despacho',         Icon: LuPin,    nombre: 'Despacho'         },
];
const MENU_VENTAS = [
    { id: 'venta',     Icon: LuShoppingCart,  nombre: 'Venta / Insumos' },
    { id: 'historial', Icon: LuClipboardList, nombre: 'Historial'       },
];
// Presupuestos queda aparte de los grupos por dominio: un "presupuesto"
// puede ser de Servicio o de Venta, así que agruparlo bajo "Servicio"
// prometía algo que la pantalla no era — ahí adentro se vuelve a
// separar por tipo, quedaba redundante con el propio menú.
// Historial dejó de ser transversal (26-ago): ahora que la pantalla
// muestra solo Venta (ver ServicioList.jsx), se mudó al grupo "Ventas".
const MENU_TRANSVERSAL = [
    { id: 'presupuestos', Icon: LuBanknote, nombre: 'Presupuestos' },
];

const MENU_OPERACIONES_TECNICO = [
    { id: 'mis-ordenes',      Icon: LuPin,           nombre: 'Mis Ordenes'      },
    { id: 'mi-agenda',        Icon: LuCalendar,      nombre: 'Mi Agenda'        },
    { id: 'servicio-tecnico', Icon: LuWrench,        nombre: 'Servicio Tecnico' },
    { id: 'historial',        Icon: LuClipboardList, nombre: 'Historial'        },
    { id: 'mi-sueldo',        Icon: LuBanknote,      nombre: 'Mi Sueldo'        },
];

const MENU_GESTION = [
    { id: 'clientes',  Icon: LuUsers,      nombre: 'Clientes'  },
    { id: 'radar',     Icon: LuSiren,      nombre: 'Radar'     },
    { id: 'productos', Icon: LuPackage,    nombre: 'Productos' },
    { id: 'finanzas',  Icon: LuTrendingUp, nombre: 'Finanzas'  },
    { id: 'usuarios',  Icon: LuLock,       nombre: 'Usuarios'  },
];

const ChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

export default function Sidebar({ vistaActual, setVistaActual, colapsado, setColapsado }) {
    const { isDark, toggleTheme } = useTheme();
    const { montosVisibles, toggleMontos } = useMontos();
    const { usuario, logout, esAdmin } = useAuth();
    const { pendientes, ordenesActivas } = useBadges();
    const menuOperaciones = esAdmin ? null : MENU_OPERACIONES_TECNICO; // null = admin usa los grupos por dominio, se renderiza aparte

    const MenuItem = ({ item }) => {
        const activa = vistaActual === item.id;
        const badge =
            item.id === 'servicio-tecnico' && pendientes > 0 ? pendientes :
            (item.id === 'mis-ordenes' || item.id === 'despacho') && ordenesActivas > 0 ? ordenesActivas :
            null;
        const baseBtn = activa
            ? 'bg-brand-red text-white font-black shadow-lg'
            : 'text-secondary hover:bg-[#E8E5E0] dark:hover:bg-[#2E2E2E] font-bold';

        if (colapsado) {
            return (
                <div onClick={() => setVistaActual(item.id)} title={item.nombre}
                    className={`relative h-11 w-11 mx-auto rounded-2xl cursor-pointer flex items-center justify-center transition-all duration-200 active:scale-95 ${baseBtn}`}>
                    <item.Icon size={20} />
                    {badge && (
                        <span className="absolute top-0.5 right-0.5 text-label font-black w-4 h-4 flex items-center justify-center rounded-full bg-brand-red text-white leading-none">
                            {badge}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div onClick={() => setVistaActual(item.id)}
                className={`px-5 py-3.5 rounded-2xl cursor-pointer text-body transition-all duration-200 flex items-center gap-3 whitespace-nowrap active:scale-95 ${baseBtn}`}>
                <item.Icon size={16} className="shrink-0" />
                <span>{item.nombre}</span>
                {badge && (
                    <span className={`ml-auto text-label font-black px-1.5 py-0.5 rounded-full leading-none ${activa ? 'bg-white/30 text-white' : 'bg-brand-red text-white'}`}>
                        {badge}
                    </span>
                )}
            </div>
        );
    };

    const iconBtn = 'p-2 rounded-xl transition-all hover:bg-[#E8E5E0] dark:hover:bg-[#2E2E2E]';

    return (
        <aside className={`hidden md:flex flex-col h-screen sticky top-0 bg-panel border-r border-black/[0.07] dark:border-white/[0.07] transition-all duration-300 z-50 overflow-hidden ${colapsado ? 'w-[64px]' : 'w-[270px]'}`}>

            {/* LOGO / TOGGLE */}
            <div className={`relative border-b border-black/[0.07] dark:border-white/[0.07] flex items-center ${colapsado ? 'justify-center py-5' : 'px-8 pt-8 pb-6'}`}>
                {!colapsado && (
                    <div className="cursor-pointer" onClick={() => setVistaActual('caja')}>
                        <img src={logo} alt="Logo" className="w-full max-w-[180px] mx-auto block drop-shadow-sm dark:brightness-110" />
                        <p className="text-label font-black text-muted mt-3 tracking-[0.2em] uppercase text-center">Sistema de Logística</p>
                    </div>
                )}
                {colapsado && (
                    <div className="cursor-pointer" onClick={() => setVistaActual('caja')}>
                        <img src={logo} alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm dark:brightness-110" />
                    </div>
                )}
                <button onClick={() => setColapsado(!colapsado)}
                    title={colapsado ? 'Expandir sidebar' : 'Colapsar sidebar'}
                    className={`${colapsado ? '' : 'absolute top-3 right-3'} w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#E8E5E0] dark:hover:bg-[#2E2E2E] text-muted transition-all`}>
                    {colapsado ? <ChevronRight /> : <ChevronLeft />}
                </button>
            </div>

            {/* NAVEGACIÓN */}
            <nav className={`flex-1 overflow-y-auto py-5 space-y-6 ${colapsado ? 'px-1.5' : 'px-4'}`}>
                {esAdmin ? (
                    <div className="space-y-4">
                        {!colapsado && <p className="text-label font-black text-muted uppercase tracking-[0.2em] mb-3 px-2">Operaciones</p>}
                        <div className="space-y-1">
                            {MENU_PANEL.map(item => <MenuItem key={item.id} item={item} />)}
                        </div>
                        <div>
                            {!colapsado && <p className="text-label font-bold text-muted/70 uppercase tracking-[0.15em] mb-2 px-2 flex items-center gap-1.5"><LuWrench size={11} /> Servicio</p>}
                            <div className="space-y-1">
                                {MENU_SERVICIO.map(item => <MenuItem key={item.id} item={item} />)}
                            </div>
                        </div>
                        <div>
                            {!colapsado && <p className="text-label font-bold text-muted/70 uppercase tracking-[0.15em] mb-2 px-2 flex items-center gap-1.5"><LuShoppingCart size={11} /> Ventas</p>}
                            <div className="space-y-1">
                                {MENU_VENTAS.map(item => <MenuItem key={item.id} item={item} />)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            {MENU_TRANSVERSAL.map(item => <MenuItem key={item.id} item={item} />)}
                        </div>
                    </div>
                ) : (
                    <div>
                        {!colapsado && <p className="text-label font-black text-muted uppercase tracking-[0.2em] mb-3 px-2">Operaciones</p>}
                        <div className="space-y-1">
                            {menuOperaciones.map(item => <MenuItem key={item.id} item={item} />)}
                        </div>
                    </div>
                )}
                {esAdmin && (
                    <div>
                        {!colapsado && <p className="text-label font-black text-muted uppercase tracking-[0.2em] mb-3 px-2">Gestión</p>}
                        <div className="space-y-1">
                            {MENU_GESTION.map(item => <MenuItem key={item.id} item={item} />)}
                        </div>
                    </div>
                )}
            </nav>

            {/* USUARIO + FOOTER */}
            <div className={`border-t border-black/[0.07] dark:border-white/[0.07] ${colapsado ? 'py-3 flex flex-col items-center gap-1' : 'px-5 py-4'}`}>
                {!colapsado && (
                    <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0">
                            <p className="text-body font-black text-ink truncate">{usuario?.nombre}</p>
                            <p className="text-label font-bold text-muted uppercase tracking-wider">
                                {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Técnico'}
                            </p>
                        </div>
                        <button onClick={logout} title="Cerrar sesión"
                            className="ml-2 px-2 py-1.5 rounded-lg text-label font-black text-brand-red hover:bg-[#D13A28]/10 dark:hover:bg-[#E8422F]/10 transition-all whitespace-nowrap">
                            Salir
                        </button>
                    </div>
                )}
                <div className={`flex items-center ${colapsado ? 'flex-col gap-1' : 'justify-between'}`}>
                    {!colapsado && (
                        <div>
                            <span className="text-label text-muted font-black uppercase tracking-widest block">v1.0</span>
                            <span className="text-caption text-muted block">dispenserlatienda.com.ar</span>
                        </div>
                    )}
                    <div className={`flex items-center ${colapsado ? 'flex-col gap-1' : 'gap-1'}`}>
                        <button onClick={toggleMontos} title={montosVisibles ? 'Ocultar montos' : 'Mostrar montos'}
                            className={`${iconBtn} ${montosVisibles ? 'text-secondary' : 'text-brand-red'}`}>
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
                            className={`${iconBtn} text-secondary`}>
                            {isDark ? <LuSun size={16} /> : <LuMoon size={16} />}
                        </button>
                        {colapsado && (
                            <button onClick={logout} title="Cerrar sesión"
                                className={`${iconBtn} text-brand-red`}>
                                <LuLogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
