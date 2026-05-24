import React from 'react';
import { useAuth } from '../../context/AuthContext';

const NAV_ADMIN = [
    { id: 'caja',             nombre: 'Panel',    icon: '🏠' },
    { id: 'venta',            nombre: 'Venta',    icon: '🛒' },
    { id: 'servicio-tecnico', nombre: 'Técnico',  icon: '🔧' },
    { id: 'historial',        nombre: 'Historial',icon: '📋' },
    { id: '_more',            nombre: 'Más',      icon: '⋯'  },
];

const NAV_TECNICO = [
    { id: 'mis-ordenes',      nombre: 'Órdenes',  icon: '📌' },
    { id: 'servicio-tecnico', nombre: 'Técnico',  icon: '🔧' },
    { id: 'historial',        nombre: 'Historial',icon: '📋' },
];

// Secciones que se acceden desde "Más"
const SECCIONES_MAS = ['presupuestos', 'clientes', 'productos', 'despacho', 'radar', 'finanzas', 'usuarios'];

export default function BottomNav({ vistaActual, setVistaActual, onMoreClick }) {
    const { esAdmin } = useAuth();
    const NAV_ITEMS = esAdmin ? NAV_ADMIN : NAV_TECNICO;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#EFEDEA] dark:bg-[#1C1C1C] transition-colors border-t border-black/[0.08] dark:border-white/[0.07]">

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
                    return (
                        <button
                            key={item.id}
                            onClick={() => item.id === '_more' ? onMoreClick?.() : setVistaActual(item.id)}
                            className="flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all active:scale-90"
                        >
                            <span className={`text-[20px] transition-transform duration-200 ${activo ? 'scale-110' : 'scale-100'}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-tight transition-colors duration-200 ${activo ? 'text-[#E8422F]' : 'text-[#9E9A94]'}`}>
                                {item.nombre}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Safe area para iPhone */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
    );
}