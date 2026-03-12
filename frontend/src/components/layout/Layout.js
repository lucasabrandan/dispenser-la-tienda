import React from 'react';
import logo from '../../assets/logo-dispenser.svg';
import Sidebar from './Sidebar';

export default function Layout({ children, vistaActual, setVistaActual }) {
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300 antialiased">
            
            {/* SIDEBAR DESKTOP */}
            <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* HEADER MOBILE */}
                <header className="md:hidden bg-white dark:bg-slate-900 h-20 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 transition-colors">
                    <img src={logo} alt="Logo" className="h-20 w-auto" />
                    <div className="text-right">
                        <span className="block font-black text-[11px] text-slate-900 dark:text-white tracking-widest uppercase">
                            Logística
                        </span>
                        <span className="text-[9px] font-bold text-blue-500 uppercase">Sistema</span>
                    </div>
                </header>

                {/* CONTENIDO */}
                <main className="flex-1 p-2 md:p-6 lg:p-8">
                    <div className="w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* BARRA DE TAREAS MOBILE */}
            <nav className="md:hidden fixed bottom-0 w-full h-20 bg-white dark:bg-slate-900 flex justify-around items-center border-t border-slate-100 dark:border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-50 pb-safe transition-colors">
                <NavItem icon="🏠" label="Inicio"    isActive={vistaActual === 'caja'}      onClick={() => setVistaActual('caja')} />
                <NavItem icon="📋" label="Historial" isActive={vistaActual === 'historial'} onClick={() => setVistaActual('historial')} />
                <NavItem icon="👥" label="Clientes"  isActive={vistaActual === 'clientes'}  onClick={() => setVistaActual('clientes')} />
                <NavItem icon="📦" label="Productos" isActive={vistaActual === 'productos'} onClick={() => setVistaActual('productos')} /> {/* ← CORREGIDO */}
                <NavItem icon="🚨" label="Radar"     isActive={vistaActual === 'radar'}     onClick={() => setVistaActual('radar')} />
            </nav>
        </div>
    );
}

function NavItem({ icon, label, isActive, onClick }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-full transition-all ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
            <div className={`text-2xl mb-0.5 transition-transform ${isActive ? '-translate-y-1.5 scale-125' : 'scale-100'}`}>{icon}</div>
            <span className={`text-[10px] uppercase transition-all ${isActive ? 'font-black opacity-100' : 'font-bold opacity-60'}`}>{label}</span>
        </button>
    );
}