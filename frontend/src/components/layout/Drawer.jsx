import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// IDs deben coincidir EXACTAMENTE con App.js, Sidebar y BottomNav
// ─────────────────────────────────────────────────────────────────────────────
const MENU_OPERACIONES = [
    { id: 'caja',             nombre: '🏠 Caja'             },
    { id: 'venta',            nombre: '🛒 Venta / Insumos'  },
    { id: 'servicio-tecnico', nombre: '🔧 Servicio Técnico' },
    { id: 'historial',        nombre: '📋 Historial'        },
    { id: 'presupuestos',     nombre: '💰 Presupuestos'     },
];

const MENU_ADMIN = [
    { id: 'clientes',  nombre: '👥 Clientes'  },
    { id: 'productos', nombre: '📦 Productos' },
    { id: 'radar',     nombre: '🚨 Radar'     },
    { id: 'finanzas',  nombre: '💹 Finanzas'  },
];

export default function Drawer({ isOpen, onClose, vistaActual, setVistaActual }) {

    const handleClick = (id) => {
        setVistaActual(id);
        onClose();
    };

    const MenuButton = ({ item }) => (
        <button
            onClick={() => handleClick(item.id)}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-all ${
                vistaActual === item.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
            {item.nombre}
        </button>
    );

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 shadow-2xl z-40 transform transition-transform duration-300 md:hidden ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">MENÚ</h2>
                    <button onClick={onClose} className="text-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition">✕</button>
                </div>

                {/* Items */}
                <div className="overflow-y-auto h-[calc(100%-140px)]">

                    <div className="p-4">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            Operaciones
                        </p>
                        <div className="space-y-1">
                            {MENU_OPERACIONES.map(item => <MenuButton key={item.id} item={item} />)}
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            Administración
                        </p>
                        <div className="space-y-1">
                            {MENU_ADMIN.map(item => <MenuButton key={item.id} item={item} />)}
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            Cuenta
                        </p>
                        <button className="w-full px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            ⚙️ Configuración
                        </button>
                        <button className="w-full px-4 py-3 rounded-xl text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                            🚪 Logout
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest font-black">
                        Logística Dispenser v3.0
                    </p>
                </div>
            </div>
        </>
    );
}