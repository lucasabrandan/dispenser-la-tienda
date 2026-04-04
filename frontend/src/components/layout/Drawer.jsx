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
                    ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white shadow-md'
                    : 'text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E]'
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
            <div className={`fixed top-0 left-0 h-full w-64 bg-[#D8D4CE] dark:bg-[#1C1C1C] shadow-2xl z-40 transform transition-transform duration-300 md:hidden ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>

                {/* Header */}
                <div className="p-6 border-b border-black/[0.07] dark:border-white/[0.07] flex justify-between items-center">
                    <h2 className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9]">MENÚ</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Items */}
                <div className="overflow-y-auto h-[calc(100%-140px)]">

                    <div className="p-4">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-3">
                            Operaciones
                        </p>
                        <div className="space-y-1">
                            {MENU_OPERACIONES.map(item => <MenuButton key={item.id} item={item} />)}
                        </div>
                    </div>

                    <div className="p-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-3">
                            Administración
                        </p>
                        <div className="space-y-1">
                            {MENU_ADMIN.map(item => <MenuButton key={item.id} item={item} />)}
                        </div>
                    </div>

                    <div className="p-4 border-t border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-3">
                            Cuenta
                        </p>
                        <button className="w-full px-4 py-3 rounded-xl text-left text-sm font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#C0BCB6] dark:hover:bg-[#2E2E2E] transition-all">
                            ⚙️ Configuración
                        </button>
                        <button className="w-full px-4 py-3 rounded-xl text-left text-sm font-bold text-[#D13A28] dark:text-[#E8422F] hover:bg-[#D13A28]/10 dark:hover:bg-[#E8422F]/10 transition-all">
                            🚪 Logout
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-black/[0.07] dark:border-white/[0.07] bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                    <p className="text-[9px] text-[#A8A29E] text-center uppercase tracking-widest font-black">
                        Logística Dispenser v3.0
                    </p>
                </div>
            </div>
        </>
    );
}
