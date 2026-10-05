import React, { useState } from 'react';
import CierreCajaModal from './CierreCajaModal';
import TabBalance from './TabBalance';
import TabSueldo from './TabSueldo';
import TabTecnicos from './TabTecnicos';
import TabGastos from './TabGastos';
import TabInventario from './TabInventario';
import TabCobranza from './TabCobranza';
import { LuLock } from 'react-icons/lu';
import { CONTENEDOR, PantallaHeader, BotonPrimario, Herramientas, Pestanas } from '../ui/Pantalla';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

const TABS = [
    { id: 'balance',    label: 'Balance'    },
    { id: 'cobranza',   label: 'Cobranza'   },
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
            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Finanzas" subtitulo="Lo que entró, lo que salió y lo que queda"
                    accion={<BotonPrimario icono={LuLock} enCelular onClick={() => setModalCierre(true)}>Cierre de caja</BotonPrimario>} />

                <Pestanas items={TABS} activo={tab} onChange={setTab} />

                {/* Selector de período — único, siempre en el mismo lugar */}
                <Herramientas>
                    {tab === 'inventario' || tab === 'cobranza' ? (
                        <span className="h-9 md:h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-label font-bold border border-black/10 dark:border-white/10 text-secondary">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" /> Tiempo real
                        </span>
                    ) : (
                        <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} aria-label="Mes"
                            className="h-9 md:h-10 px-3 rounded-xl text-label font-bold outline-none bg-transparent text-ink border border-black/10 dark:border-white/10" />
                    )}
                </Herramientas>

                {tab === 'balance'    && <TabBalance    filtroMes={filtroMes} />}
                {tab === 'sueldo'     && <TabSueldo     filtroMes={filtroMes} />}
                {tab === 'tecnicos'   && <TabTecnicos   filtroMes={filtroMes} />}
                {tab === 'gastos'     && <TabGastos     filtroMes={filtroMes} />}
                {tab === 'inventario' && <TabInventario />}
                {tab === 'cobranza'   && <TabCobranza />}
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
