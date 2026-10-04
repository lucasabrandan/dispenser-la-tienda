import { useEffect, useState } from 'react';
import api from '../services/api';

// Días ocupados de los técnicos por trabajo propio (5-oct-2026).
// franja: 'MANANA' | 'TARDE' | 'DIA'
export const FRANJAS_BLOQUEO = [
    { id: 'MANANA', label: 'Mañana' },
    { id: 'TARDE',  label: 'Tarde' },
    { id: 'DIA',    label: 'Todo el día' },
];
export const DIAS_SEMANA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const labelFranja = (f) => (FRANJAS_BLOQUEO.find(x => x.id === f)?.label || f).toLowerCase();

// ¿Está ocupado ese técnico ese día en esa franja ('Mañana' | 'Tarde')?
export const estaOcupado = (bloqueos, tecnicoId, iso, franjaUI) => bloqueos.some(b =>
    b.tecnicoId === tecnicoId && b.fecha === iso &&
    (b.franja === 'DIA' || (franjaUI === 'Mañana' ? b.franja === 'MANANA' : b.franja === 'TARDE')));

// Ocupaciones día por día entre dos fechas ISO (admin: de todos)
export function useBloqueos(desde, hasta) {
    const [lista, setLista] = useState([]);
    useEffect(() => {
        if (!desde || !hasta) return;
        let vivo = true;
        api.get('/bloqueos/agenda', { params: { desde, hasta } })
            .then(r => { if (vivo) setLista(Array.isArray(r.data) ? r.data : []); })
            .catch(() => { if (vivo) setLista([]); });
        return () => { vivo = false; };
    }, [desde, hasta]);
    return lista;
}
