import React from 'react';
import { CONTENEDOR, PantallaHeader, PAGINA } from '../ui/Pantalla';
import { useMiEspacio } from './useMiEspacio';
import MiEspacioChecklist from './MiEspacioChecklist';
import MiEspacioBoard from './MiEspacioBoard';

const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] p-3.5 md:p-4';

// Pantalla completa de Mi Espacio -- desde el 7-sep-2026 el tablero (pestañas
// + columnas + notas) vive en MiEspacioBoard.jsx, compartido con Mi Agenda
// del técnico. Desde el 8-sep-2026 esta pantalla también suma el checklist
// (MiEspacioChecklist.jsx) -- a pedido de Lucas, el Trello se sacó del Panel
// y de Mi Agenda, y quedó viviendo solo acá, junto con el checklist (que sí
// sigue viéndose además en el Panel/Mi Agenda). Ambos widgets comparten una
// sola carga/guardado (useMiEspacio) para no pisarse entre sí -- ver el
// comentario en ese archivo.
export default function MiEspacio() {
    const { espacio, cargando, actualizar } = useMiEspacio();

    return (
        <div className={PAGINA}>

            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Mi Espacio" subtitulo="Notas propias, solo para vos" />
                <div className={card}>
                    <p className="text-label font-bold uppercase tracking-wider text-muted mb-3">Notas rápidas</p>
                    <MiEspacioChecklist espacio={espacio} actualizar={actualizar} cargando={cargando} />
                </div>

                <div className={card}>
                    <p className="text-label font-bold uppercase tracking-wider text-muted mb-3">Tablero</p>
                    <MiEspacioBoard espacio={espacio} actualizar={actualizar} cargando={cargando} />
                </div>

            </div>
        </div>
    );
}
