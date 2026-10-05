import React, { useState } from 'react';
import { CONTENEDOR, PantallaHeader } from '../ui/Pantalla';
import TabSueldo from './TabSueldo';
import Liquidacion from './Liquidacion';

// "Mi mes" del técnico (4-oct-2026): su liquidación (trabajo por trabajo, con
// PDF) y debajo su objetivo de sueldo, que se pone él.
export default function MiSueldo() {
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));

    return (
        <div className="min-h-screen pb-28 bg-page">
            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Mi mes" subtitulo="Lo que cobraste, tu parte y tu objetivo" />
                <Liquidacion onMes={setFiltroMes} />
                <div>
                    <p className="text-label font-black text-muted uppercase tracking-widest mb-2">Mi objetivo</p>
                    <TabSueldo filtroMes={filtroMes} />
                </div>
            </div>
        </div>
    );
}
