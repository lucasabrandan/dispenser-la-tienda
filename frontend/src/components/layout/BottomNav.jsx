
import React from 'react';

export default function BottomNav({ vistaActual, setVistaActual }) {
    const navItems = [
        { id: 'caja', nombre: 'Caja', icon: '🏠' },
        { id: 'venta', nombre: 'Venta', icon: '🛒' },
        { id: 'servicio-tecnico', nombre: 'Técnico', icon: '🔧' },
        { id: 'historial', nombre: 'Historial', icon: '📋' },
        { id: 'finanzas', nombre: 'Finanzas', icon: '💹' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40">
            <div className="flex justify-around items-center h-20">
                {navItems.map(item => {
                    const activo = vistaActual === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setVistaActual(item.id)}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                                activo
                                    ? 'text-blue-600 dark:text-blue-400 font-black'
                                    : 'text-slate-500 dark:text-slate-400 font-bold'
                            }`}
                        >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="text-[9px] uppercase font-black tracking-tight">{item.nombre}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}