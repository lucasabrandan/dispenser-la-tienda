import React from 'react';
import { useAuth } from '../../context/AuthContext';

const NAV_ADMIN = [
    { id: 'caja',             nombre: 'Caja',     icon: '🏠' },
    { id: 'venta',            nombre: 'Venta',    icon: '🛒' },
    { id: 'servicio-tecnico', nombre: 'Técnico',  icon: '🔧' },
    { id: 'historial',        nombre: 'Historial',icon: '📋' },
    { id: 'finanzas',         nombre: 'Finanzas', icon: '💹' },
];

const NAV_TECNICO = [
    { id: 'mis-ordenes',      nombre: 'Órdenes',  icon: '📌' },
    { id: 'servicio-tecnico', nombre: 'Técnico',  icon: '🔧' },
    { id: 'historial',        nombre: 'Historial',icon: '📋' },
];

// ─── Colores de marca ────────────────────────────────────────────────────────
// Activo:   rojo #E8422F (dark) / #D13A28 (light)
// Inactivo: gris #606060 (dark) / #9E9E9E (light)
// Fondo:    #1A1A1A (dark) / #FFFFFF (light)
// Borde:    rgba(255,255,255,0.08) / rgba(0,0,0,0.08)
// ────────────────────────────────────────────────────────────────────────────

export default function BottomNav({ vistaActual, setVistaActual }) {
    const { esAdmin } = useAuth();
    const NAV_ITEMS = esAdmin ? NAV_ADMIN : NAV_TECNICO;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#EFEDEA] dark:bg-[#1C1C1C] transition-colors border-t border-black/[0.08] dark:border-white/[0.07]">

            {/* Indicador de sección activa — línea roja arriba */}
            <div className="flex">
                {NAV_ITEMS.map(item => {
                    const activo = vistaActual === item.id;
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
                    const activo = vistaActual === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setVistaActual(item.id)}
                            className="flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all active:scale-90"
                        >
                            <span
                                className="text-[20px] transition-transform duration-200"
                                style={{ transform: activo ? 'scale(1.15)' : 'scale(1)' }}
                            >
                                {item.icon}
                            </span>
                            <span
                                className={`text-[9px] font-bold uppercase tracking-tight transition-colors duration-200 ${
                                    activo ? 'text-[#E8422F]' : 'text-[#9E9A94]'
                                }`}
                            >
                                {item.nombre}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Safe area para iPhone con home indicator */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </nav>
    );
}