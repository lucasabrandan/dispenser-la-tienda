import React, { useState } from 'react';
import CierreCajaModal from './CierreCajaModal';
import TabBalance from './TabBalance';
import TabTecnicos from './TabTecnicos';
import TabGastos from './TabGastos';
import TabInventario from './TabInventario';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

const TABS = [
    { id: 'balance',    label: 'Balance'    },
    { id: 'tecnicos',   label: 'Técnicos'   },
    { id: 'gastos',     label: 'Gastos'     },
    { id: 'inventario', label: 'Inventario' },
];

export default function DashboardFinanzas() {
    const [tab,       setTab]       = useState('balance');
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));
    const [modalCierre, setModalCierre] = useState(false);
    const tabIds = TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(tabIds, tab, setTab);

    return (
        <div className="min-h-screen pb-28 bg-[#F5F3F1] dark:bg-[#141414]" {...swipeHandlers}>
            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <div className="hidden md:flex items-center justify-between">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">Finanzas</h2>
                        <button onClick={() => setModalCierre(true)}
                            className="h-8 px-3 rounded-lg font-bold text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                            Cierre de caja
                        </button>
                    </div>
                    <div className="flex gap-2 items-center md:hidden mb-1">
                        <div className="flex-1" />
                        <button onClick={() => setModalCierre(true)}
                            className="h-7 px-2.5 rounded-lg font-bold text-[10px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 shrink-0">
                            Cierre
                        </button>
                    </div>
                    <div className="flex gap-1 bg-[#EFEDEA] dark:bg-[#1C1C1C] p-1 rounded-lg">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-1 py-1.5 rounded-md font-bold text-[11px] uppercase transition-all active:scale-95
                                    ${tab === t.id
                                        ? 'bg-white dark:bg-[#242424] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm'
                                        : 'text-[#A8A29E]'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">
                {tab === 'balance'    && <TabBalance    filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
                {tab === 'tecnicos'   && <TabTecnicos   filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
                {tab === 'gastos'     && <TabGastos     filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
                {tab === 'inventario' && <TabInventario />}
            </div>

            {modalCierre && (
                <CierreCajaModal
                    onClose={() => setModalCierre(false)}
                    onArchivar={() => setModalCierre(false)}
                />
            )}
        </div>
    );
}
