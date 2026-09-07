import React, { useState } from 'react';
import { LuSearch } from 'react-icons/lu';

// Barra de búsqueda unificada (Lucas, 7-sep-2026: "los buscadores... se ven
// todos distintos" -- Servicio/Venta/Presupuestos, Clientes y Productos tenían
// cada uno su propia versión copiada a mano, con pequeñas diferencias de look
// y de comportamiento entre sí). Se extrae acá una sola vez para que las 5
// pantallas se vean y actúen exactamente igual, y no puedan volver a divergir.
//
// En mobile el buscador queda escondido atrás de un botón-ícono (no ocupa
// lugar todo el tiempo); en desktop siempre visible. Mismo criterio en las 5
// pantallas, tengan o no otros botones al lado (Filtros, + Nuevo, etc.).
export default function BusquedaBar({ valor, onChange, placeholder = 'Buscar...', accent = 'red', onExpandChange }) {
    const [expandido, setExpandidoState] = useState(false);
    const setExpandido = (v) => { setExpandidoState(v); onExpandChange?.(v); };
    const accentClass = accent === 'amber' ? 'bg-brand-amber' : 'bg-brand-red';

    return (
        <>
            <button onClick={() => setExpandido(!expandido)}
                className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${
                    expandido || valor ? `${accentClass} text-white` : 'bg-card text-muted'
                }`}>
                <LuSearch size={15} />
            </button>
            <div className={`${expandido ? 'flex' : 'hidden'} md:flex relative flex-1`}>
                <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                    value={valor}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-card text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05] focus:border-[#D13A28] dark:focus:border-[#E8422F]"
                    autoFocus={expandido}
                />
                {valor && (
                    <button onClick={() => onChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-label font-bold">✕</button>
                )}
            </div>
        </>
    );
}
