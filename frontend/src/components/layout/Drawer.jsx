import React from 'react';

export default function Drawer({ isOpen, onClose, vistaActual, setVistaActual }) {
    const menuItems = [
        { id: 'caja', nombre: '🏠 Caja', seccion: 'operaciones' },
        { id: 'venta', nombre: '🛒 Venta / Insumos', seccion: 'operaciones' },
        { id: 'servicio-tecnico', nombre: '🔧 Servicio Técnico', seccion: 'operaciones' },
        { id: 'historial', nombre: '📋 Historial', seccion: 'operaciones' },
        { id: 'clientes', nombre: '👥 Clientes', seccion: 'admin' },
        { id: 'productos', nombre: '📦 Productos', seccion: 'admin' },
        { id: 'radar', nombre: '🚨 Radar', seccion: 'admin' },
        { id: 'finanzas', nombre: '💹 Finanzas', seccion: 'admin' },
    ];

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

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 shadow-2xl z-40 transform transition-transform duration-300 md:hidden ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">MENÚ</h2>
                        <button
                            onClick={onClose}
                            className="text-2xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="overflow-y-auto h-[calc(100%-80px)]">
                    {/* OPERACIONES */}
                    <div className="p-4">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            Operaciones
                        </p>
                        <div className="space-y-1">
                            {menuItems
                                .filter(item => item.seccion === 'operaciones')
                                .map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleClick(item.id)}
                                        className={`w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-all ${
                                            vistaActual === item.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {item.nombre}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* ADMINISTRACIÓN */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            Administración
                        </p>
                        <div className="space-y-1">
                            {menuItems
                                .filter(item => item.seccion === 'admin')
                                .map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleClick(item.id)}
                                        className={`w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-all ${
                                            vistaActual === item.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {item.nombre}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* SETTINGS */}
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