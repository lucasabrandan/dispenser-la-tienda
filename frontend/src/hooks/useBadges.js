import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Hook compartido para badges de sidebar y drawer — evita fetch duplicado
export function useBadges() {
    const { usuario, esAdmin } = useAuth();
    const [pendientes,    setPendientes]    = useState(0);
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
            } catch { /* silenciar */ }
        };
        cargar();
        const interval = setInterval(cargar, 60_000);
        return () => clearInterval(interval);
    }, [usuario, esAdmin]);

    return { pendientes, ordenesActivas };
}
