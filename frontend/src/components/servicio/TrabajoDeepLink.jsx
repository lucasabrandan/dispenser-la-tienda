import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DetalleSheet from './DetalleSheet';
import HistorialTrabajoSheet from './HistorialTrabajoSheet';

// Resuelve el deep-link de una notificación (push o campanita) directo a la
// pantalla de ESE trabajo puntual, sin pasar por la lista general: el
// técnico ve el detalle de qué hay que hacer (DetalleSheet, ya existía), el
// admin ve la línea de tiempo de lo que fue pasando (HistorialTrabajoSheet).
export default function TrabajoDeepLink({ servicioId, onCerrar }) {
    const { esAdmin } = useAuth();
    const [servicio, setServicio] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        api.get(`/servicios/${servicioId}`)
            .then(r => { if (activo) setServicio(r.data); })
            .catch(() => {
                if (activo) {
                    toast.error('No se pudo abrir ese trabajo');
                    onCerrar();
                }
            })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [servicioId]);

    if (cargando) {
        return (
            <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50">
                <div className="w-9 h-9 rounded-full border-4 border-white/25 border-t-white animate-spin" />
            </div>
        );
    }
    if (!servicio) return null;

    return esAdmin
        ? <HistorialTrabajoSheet servicio={servicio} onCerrar={onCerrar} />
        : <DetalleSheet servicio={servicio} onCerrar={onCerrar} />;
}
