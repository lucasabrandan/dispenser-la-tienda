import React, { useState } from 'react';
import TabSueldo from './TabSueldo';

// Vista standalone para el técnico (fuera de DashboardFinanzas)
export default function MiSueldo() {
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));

    return (
        <div className="min-h-screen pb-28 bg-[#F5F3F1] dark:bg-[#141414]">
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">Mi Sueldo</h2>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">
                <TabSueldo filtroMes={filtroMes} setFiltroMes={setFiltroMes} />
            </div>
        </div>
    );
}
