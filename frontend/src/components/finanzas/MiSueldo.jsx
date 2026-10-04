import React, { useState } from 'react';
import TabSueldo from './TabSueldo';
import Liquidacion from './Liquidacion';

// "Mi mes" del técnico (4-oct-2026): su liquidación (trabajo por trabajo, con
// PDF) y debajo su objetivo de sueldo, que se pone él.
export default function MiSueldo() {
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));

    return (
        <div className="min-h-screen pb-28 bg-page">
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4 pb-3">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-ink">Mi mes</h2>
                </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 md:px-6 pt-3 space-y-6">
                <Liquidacion onMes={setFiltroMes} />
                <div>
                    <p className="text-label font-black text-muted uppercase tracking-widest mb-2">Mi objetivo</p>
                    <TabSueldo filtroMes={filtroMes} />
                </div>
            </div>
        </div>
    );
}
