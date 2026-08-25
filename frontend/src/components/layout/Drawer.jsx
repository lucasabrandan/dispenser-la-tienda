import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../hooks/useBadges';
import { LuBanknote, LuClipboardList, LuUsers, LuSiren, LuPackage, LuTrendingUp, LuLock, LuLogOut, LuSettings } from 'react-icons/lu';

// Items que NO están en el BottomNav, agrupados por dominio para no mezclar todo
// (mismo criterio que Sidebar.jsx en desktop). Presupuestos e Historial quedan
// juntos, aparte de cualquier dominio: un "presupuesto" puede ser de Servicio
// o de Venta, así que meterlo bajo "Servicio" prometía algo que no era.
const MENU_TRANSVERSAL_DRAWER = [
    { id: 'presupuestos', nombre: 'Presupuestos', Icon: LuBanknote },
    { id: 'historial',    nombre: 'Historial',    Icon: LuClipboardList },
];
const MENU_GESTION_DRAWER = [
    { id: 'clientes',  nombre: 'Clientes',  Icon: LuUsers },
    { id: 'radar',     nombre: 'Radar',     Icon: LuSiren },
    { id: 'productos', nombre: 'Productos', Icon: LuPackage },
    { id: 'finanzas',  nombre: 'Finanzas',  Icon: LuTrendingUp },
    { id: 'usuarios',  nombre: 'Usuarios',  Icon: LuLock },
];
const MENU_ITEMS = [...MENU_TRANSVERSAL_DRAWER, ...MENU_GESTION_DRAWER];

export default function Drawer({ isOpen, onClose, vistaActual, setVistaActual }) {
    const { usuario, logout } = useAuth();
    const { pendientes, ordenesActivas } = useBadges();

    const handleClick = (id) => {
        setVistaActual(id);
        onClose();
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Panel lateral */}
            <div className={`fixed top-0 right-0 h-full w-72 bg-panel shadow-2xl z-40 transform transition-transform duration-300 md:hidden ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>

                {/* Header */}
                <div className="p-5 border-b border-black/[0.07] dark:border-white/[0.07] flex justify-between items-center">
                    <div>
                        <p className="text-body font-black text-ink">{usuario?.nombre}</p>
                        <p className="text-label font-bold text-muted uppercase tracking-wider">
                            {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Técnico'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-[#E8E5E0] dark:hover:bg-[#2E2E2E] transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Items */}
                <div className="p-3 space-y-4 overflow-y-auto">
                    {[
                        { label: null,          items: MENU_TRANSVERSAL_DRAWER },
                        { label: 'Gestión',     icon: LuSettings, items: MENU_GESTION_DRAWER },
                    ].map((grupo, gi) => (
                        <div key={gi} className="space-y-0.5">
                            {grupo.label && (
                                <p className="text-label font-bold text-muted/70 uppercase tracking-[0.15em] mb-1 px-3 flex items-center gap-1.5">
                                    {grupo.icon && <grupo.icon size={11} />} {grupo.label}
                                </p>
                            )}
                            {grupo.items.map(item => {
                                const activa = vistaActual === item.id;
                                const badge =
                                    item.id === 'presupuestos' && pendientes > 0 ? pendientes :
                                    null;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleClick(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-body font-bold transition-all active:scale-[0.98] ${
                                            activa
                                                ? 'bg-brand-red text-white shadow-md'
                                                : 'text-ink hover:bg-[#E8E5E0] dark:hover:bg-[#2E2E2E]'
                                        }`}
                                    >
                                        <item.Icon size={18} className="shrink-0" />
                                        <span className="flex-1">{item.nombre}</span>
                                        {badge && (
                                            <span className={`text-label font-black px-1.5 py-0.5 rounded-full leading-none ${
                                                activa ? 'bg-white/30 text-white' : 'bg-brand-red text-white'
                                            }`}>
                                                {badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Cerrar sesión */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                    <button
                        onClick={() => { logout(); onClose(); }}
                        className="w-full px-4 py-3 rounded-xl text-left text-body font-bold text-brand-red hover:bg-[#D13A28]/10 dark:hover:bg-[#E8422F]/10 transition-all flex items-center gap-2"
                    >
                        <LuLogOut size={16} /> Cerrar sesión
                    </button>
                    <p className="text-label text-muted text-center mt-2 uppercase tracking-widest font-bold">
                        Dispenser La Tienda v1.0
                    </p>
                </div>
            </div>
        </>
    );
}
