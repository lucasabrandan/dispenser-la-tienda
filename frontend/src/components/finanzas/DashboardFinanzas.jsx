import React, { useState } from 'react';
import CierreCajaModal from './CierreCajaModal';
import TabBalance from './TabBalance';
import TabSueldo from './TabSueldo';
import TabTecnicos from './TabTecnicos';
import TabGastos from './TabGastos';
import TabInventario from './TabInventario';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

const TABS = [
    { id: 'balance',    label: 'Balance'    },
    { id: 'sueldo',     label: 'Sueldo'     },
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
        <div className="min-h-screen pb-28 bg-page" {...swipeHandlers}>
            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <div className="hidden md:flex items-center justify-between">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-ink">Finanzas</h2>
                        <button onClick={() => setModalCierre(true)}
                            className="h-8 px-3 rounded-lg font-bold text-caption uppercase text-white bg-brand-red active:scale-95">
                            Cierre de caja
                        </button>
                    </div>
                    <div className="flex gap-2 items-center md:hidden mb-1">
                        <div className="flex-1" />
                        <button onClick={() => setModalCierre(true)}
                            className="h-7 px-2.5 rounded-lg font-bold text-label uppercase text-white bg-brand-red active:scale-95 shrink-0">
                            Cierre
                        </button>
                    </div>
                    <div className="flex gap-1 bg-panel p-1 rounded-lg">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-1 py-1.5 rounded-md font-bold text-caption uppercase transition-all active:scale-95
                                    ${tab === t.id
                                        ? 'bg-card text-ink shadow-sm'
                                        : 'text-muted'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {/* Selector de período — único, siempre en el mismo lugar (antes cada tab
                        reimplementaba su propio <input type="month">, en una fila distinta cada vez). */}
                    <div className="flex items-center gap-2">
                        {tab === 'inventario' ? (
                            <span className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-label font-bold uppercase text-white bg-brand-green">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                Tiempo real
                            </span>
                        ) : (
                            <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                                className="h-7 px-2 rounded-lg text-label font-bold outline-none bg-card text-ink shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">
                {tab === 'balance'    && <TabBalance    filtroMes={filtroMes} />}
                {tab === 'sueldo'     && <TabSueldo     filtroMes={filtroMes} />}
                {tab === 'tecnicos'   && <TabTecnicos   filtroMes={filtroMes} />}
                {tab === 'gastos'     && <TabGastos     filtroMes={filtroMes} />}
                {tab === 'inventario' && <TabInventario />}
            </div>

            {modalCierre && (
                <CierreCajaModal
                    onClose={() => setModalCierre(false)}
                    onArchivar={() => setModalCierre(false)}
                    mesInicial={filtroMes}
                />
            )}
        </div>
    );
}
