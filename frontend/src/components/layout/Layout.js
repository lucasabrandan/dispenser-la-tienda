import React, { useState } from 'react';
import logo from '../../assets/logo-dispenser.svg';
import Sidebar from './Sidebar';
import Drawer from './Drawer';
import BottomNav from './BottomNav';
 
export default function Layout({ children, vistaActual, setVistaActual }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
 
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300 antialiased">
            
            {/* SIDEBAR DESKTOP */}
            <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />
 
            <div className="flex-1 flex flex-col min-w-0">
                {/* HEADER MOBILE */}
                <header className="md:hidden bg-white dark:bg-slate-900 h-20 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 transition-colors flex-shrink-0">
                    {/* Hamburger Button */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <span className="text-2xl">≡</span>
                    </button>
 
                    {/* Logo + Brand */}
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Logo" className="h-12 w-auto" />
                        <div>
                            <span className="block font-black text-[11px] text-slate-900 dark:text-white tracking-widest uppercase">
                                Dispenser
                            </span>
                            <span className="text-[8px] font-bold text-blue-500 uppercase">Logística</span>
                        </div>
                    </div>
 
                    {/* Right Icons */}
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400">
                            <span className="text-xl">🔔</span>
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-400">
                            <span className="text-xl">👤</span>
                        </button>
                    </div>
                </header>
 
                {/* CONTENIDO */}
                <main className="flex-1 min-h-0 overflow-y-auto p-2 md:p-6 lg:p-8">
                    <div className="w-full pb-24 md:pb-0">
                        {children}
                    </div>
                </main>
            </div>
 
            {/* DRAWER LATERAL MOBILE */}
            <Drawer 
                isOpen={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                vistaActual={vistaActual}
                setVistaActual={setVistaActual}
            />
 
            {/* BOTTOM NAV MOBILE */}
            <BottomNav vistaActual={vistaActual} setVistaActual={setVistaActual} />
        </div>
    );
}