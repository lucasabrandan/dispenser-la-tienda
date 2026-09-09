import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const BadgesContext = createContext();

/**
 * BadgesProvider — reemplaza al viejo hooks/useBadges.js (movido a
 * _to_delete/). El hook original se llamaba de forma independiente desde
 * Sidebar.jsx, BottomNav.jsx y Drawer.jsx -- como Sidebar (desktop) y
 * BottomNav (mobile) están montados los dos SIEMPRE en el DOM (se ocultan
 * solo con CSS según el ancho de pantalla, nunca se desmontan), cada uno
 * disparaba su propio fetch + su propio setInterval de 60s, duplicando (o
 * triplicando, si además se abría el Drawer) cada pedido a
 * /servicios/resumen y /ordenes/count-activas todo el tiempo que la app
 * estuviera abierta. Acá se calcula una sola vez, en un solo lugar, y los
 * 3 componentes lo consumen por lectura vía useBadges().
 */
export function BadgesProvider({ children }) {
    const { usuario, esAdmin } = useAuth();
    const [pendientes, setPendientes] = useState(0);
    const [ordenesActivas, setOrdenesActivas] = useState(0);

    useEffect(() => {
        const cargar = async () => {
            try {
                const params = usuario?.id && !esAdmin ? { tecnicoId: usuario.id } : {};
                const [svc, ord] = await Promise.all([
                    api.get('/servicios/resumen', { params: { tipo: 'TECNICA' } }),
                    api.get('/ordenes/count-activas', { params }),
                ]);
                setPendientes(svc.data.pendientesCount || 0);
                setOrdenesActivas(ord.data.count || 0);
            } catch (err) { console.warn('Badges: error cargando conteos', err); }
        };
        cargar();
        const interval = setInterval(cargar, 60_000);
        return () => clearInterval(interval);
    }, [usuario, esAdmin]);

    return (
        <BadgesContext.Provider value={{ pendientes, ordenesActivas }}>
            {children}
        </BadgesContext.Provider>
    );
}

export function useBadges() {
    return useContext(BadgesContext);
}
