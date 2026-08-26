import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../hooks/useBadges';
import { LuHouse, LuWrench, LuPin, LuShoppingCart, LuEllipsis, LuCalendar, LuBanknote } from 'react-icons/lu';

// Reordenado: las acciones más frecuentes accesibles directamente.
// 'despacho' (ítem propio, 26-ago) se saco de acá: el modo Despacho/Servicio
// de ServicioManager.jsx ya cubre esas pestañas adentro de "Técnico" — tenerlo
// también acá era dos caminos al mismo lugar. Ver Sidebar.jsx (mismo criterio).
const NAV_ADMIN = [
    { id: 'caja',             nombre: 'Panel',    Icon: LuHouse        },
    { id: 'servicio-tecnico', nombre: 'Técnico',  Icon: LuWrench       },
    { id: 'venta',            nombre: 'Venta',    Icon: LuShoppingCart },
    { id: '_more',            nombre: 'Más',      Icon: LuEllipsis     },
];

// 'historial' (ahora solo Venta, 26-ago) se saco de este menu: el tecnico
// nunca genera una Venta por su cuenta (ModalRegistrarTrabajo.jsx siempre crea
// servicioTipo TECNICA) — quedaba vacio de adorno para este rol.
const NAV_TECNICO = [
    { id: 'mis-ordenes',      nombre: 'Ordenes',  Icon: LuPin           },
    { id: 'mi-agenda',        nombre: 'Agenda',   Icon: LuCalendar      },
    { id: 'servicio-tecnico', nombre: 'Tecnico',  Icon: LuWrench        },
    { id: 'mi-sueldo',        nombre: 'Sueldo',   Icon: LuBanknote      },
];

// Secciones accesibles desde "Más"
const SECCIONES_MAS = ['presupuestos', 'clientes', 'radar', 'productos', 'finanzas', 'usuarios'];

export default function BottomNav({ vistaActual, setVistaActual, onMoreClick }) {
    const { esAdmin } = useAuth();
    const { pendientes, ordenesActivas } = useBadges();
    const NAV_ITEMS = esAdmin ? NAV_ADMIN : NAV_TECNICO;
    // Mismo criterio que Sidebar.jsx: admin ve Despacho fusionado adentro de
    // "Técnico" (modo), el badge suma las dos señales.
    const servicioTecnicoBadge = esAdmin ? pendientes + ordenesActivas : pendientes;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-panel transition-colors border-t border-black/[0.08] dark:border-white/[0.07]">

            {/* Indicador de sección activa */}
            <div className="flex">
                {NAV_ITEMS.map(item => {
                    const activo = item.id === '_more'
                        ? SECCIONES_MAS.includes(vistaActual)
                        : vistaActual === item.id;
                    return (
                        <div
                            key={item.id + '-indicator'}
                            className={`flex-1 h-[2px] transition-all duration-200 ${activo ? 'bg-[#E8422F]' : 'bg-transparent'}`}
                        />
                    );
                })}
            </div>

            <div className="flex justify-around items-center h-16">
                {NAV_ITEMS.map(item => {
                    const activo = item.id === '_more'
                        ? SECCIONES_MAS.includes(vistaActual)
                        : vistaActual === item.id;
                    const badge =
                        item.id === 'servicio-tecnico' && servicioTecnicoBadge > 0 ? servicioTecnicoBadge :
                        item.id === 'mis-ordenes' && ordenesActivas > 0 ? ordenesActivas :
                        null;
                    return (
                        <button
                            key={item.id}
                            onClick={() => item.id === '_more' ? onMoreClick?.() : setVistaActual(item.id)}
                            className="relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all active:scale-90"
                        >
                            <item.Icon size={20} className={`transition-transform duration-200 ${activo ? 'scale-110' : 'scale-100'}`} />
                            <span className={`text-[9px] font-bold uppercase tracking-tight transition-colors duration-200 ${activo ? 'text-[#E8422F]' : 'text-[#9E9A94]'}`}>
                                {item.nombre}
                            </span>
                            {badge && (
                                <span className="absolute top-1.5 right-1/4 text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full bg-brand-red text-white leading-none">
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Safe area para iPhone */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
    );
}
