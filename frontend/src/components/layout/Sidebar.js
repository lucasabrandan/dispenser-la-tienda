import React from 'react';
import logo from '../../assets/logo-dispenser.svg';
 
export default function Sidebar({ setVistaActual, vistaActual }) {
    
    const menu = [
        { id: 'venta', nombre: '🛒 Venta / Insumos' },
        { id: 'servicio-tecnico', nombre: '🔧 Servicio Técnico' },
        { id: 'historial', nombre: '📋 Historial' }, 
        { id: 'clientes', nombre: '👥 Clientes' },
        { id: 'productos', nombre: '📦 Productos' },
        { id: 'radar', nombre: '🚨 Radar' },
        { id: 'finanzas', nombre: '💹 Finanzas' },
    ];
 
    return (
        // Ensanchamos de 260px a 280px para que no parezca tan "flaquito" en PC
        <aside className="hidden md:flex flex-col w-[280px] h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 transition-colors duration-300 z-50">
            
            {/* Área del Logo: Agrandamos el max-w de 130px a 170px */}
            <div className="text-center mb-10 pb-8 border-b border-slate-100 dark:border-slate-800/50">
                <img src={logo} alt="Logo" className="w-full max-w-[170px] mx-auto drop-shadow-sm dark:brightness-110" />
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-3 tracking-[0.2em] uppercase">
                    Sistema de Logística
                </p>
            </div>
            
            {/* Navegación del Menú (Tu lógica original intacta) */}
            <nav className="flex-1 flex flex-col gap-3">
                {menu.map(item => {
                    const activa = vistaActual === item.id;
                    return (
                        <div 
                            key={item.id} 
                            onClick={() => setVistaActual(item.id)}
                            className={`px-6 py-4 rounded-2xl cursor-pointer text-[15px] transition-all duration-200 flex items-center gap-4 whitespace-nowrap active:scale-95 ${
                                activa 
                                    ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold'
                            }`}
                        >
                            {item.nombre}
                        </div>
                    );
                })}
            </nav>
 
            {/* Footer del Menú */}
            <div className="mt-auto pt-6 text-[9px] text-slate-300 dark:text-slate-600 text-center font-black uppercase tracking-widest">
                Logística Dispenser v3.0
            </div>
        </aside>
    );
}