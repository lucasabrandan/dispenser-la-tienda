import React, { useState } from 'react';
import TabSueldo from './TabSueldo';

// Vista standalone para el técnico (fuera de DashboardFinanzas)
export default function MiSueldo() {
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));

    return (
        <div className="min-h-screen pb-28 bg-page">
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-ink">Mi Sueldo</h2>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">
                <TabSueldo filtroMes={filtroMes} setFiltroMes={setFiltroMes} />
            </div>
        </div>
    );
}
