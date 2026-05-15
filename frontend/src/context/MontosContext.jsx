import React, { createContext, useContext, useState } from 'react';

const MontosContext = createContext();

/**
 * MontosProvider — envuelve la app y provee el estado global
 * de visibilidad de montos (como apps bancarias).
 *
 * Uso:
 *   const { montosVisibles, toggleMontos } = useMontos();
 *   {montosVisibles ? '$351,500' : '••••••'}
 */
export function MontosProvider({ children }) {
    const [montosVisibles, setMontosVisibles] = useState(true);
    const toggleMontos = () => setMontosVisibles(v => !v);

    return (
        <MontosContext.Provider value={{ montosVisibles, toggleMontos }}>
            {children}
        </MontosContext.Provider>
    );
}

export function useMontos() {
    return useContext(MontosContext);
}

/**
 * Monto — componente helper para mostrar/ocultar un valor.
 *
 * Uso:
 *   <Monto valor={351500} prefijo="$" />
 *   <Monto valor={351500} prefijo="$" className="text-2xl font-black" />
 */
export function Monto({ valor, prefijo = '$', className = '', style = {} }) {
    const { montosVisibles } = useMontos();

    if (!montosVisibles) {
        return (
            <span className={className} style={style}>
                ••••••
            </span>
        );
    }

    return (
        <span className={className} style={style}>
            {prefijo}{typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}
        </span>
    );
}