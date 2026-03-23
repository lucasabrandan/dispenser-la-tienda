import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

/**
 * useCajaData
 * Carga todos los datos necesarios para el dashboard de Caja.
 * No modifica nada — solo lee y calcula.
 */
export function useCajaData() {
    const [servicios, setServicios] = useState([]);
    const [cargando, setCargando]   = useState(true);

    const cargar = async () => {
        setCargando(true);
        try {
            const res  = await api.get('/servicios?page=0&size=1000');
            const data = res.data.content || res.data || [];
            setServicios(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Error al cargar datos de caja');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const hoy    = new Date().toISOString().split('T')[0];
    const mesActual = new Date().toISOString().substring(0, 7); // YYYY-MM

    const calcularTotal = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const stats = useMemo(() => {
        const realizados = servicios.filter(s => s.estado === 'REALIZADO');
        const pendientes = servicios.filter(s => s.estado === 'PRESUPUESTO');

        // HOY
        const hoyItems    = realizados.filter(s => s.fecha === hoy);
        const totalHoy    = hoyItems.reduce((a, s) => a + calcularTotal(s), 0);
        const serviciosHoy = hoyItems.filter(s => s.servicioTipo === 'TECNICA').length;
        const ventasHoy   = hoyItems.filter(s => s.servicioTipo === 'VENTA').length;

        // MES ACTUAL
        const mesItems     = realizados.filter(s => s.fecha?.startsWith(mesActual));
        const totalMes     = mesItems.reduce((a, s) => a + calcularTotal(s), 0);
        const serviciosMes = mesItems.filter(s => s.servicioTipo === 'TECNICA').length;
        const ventasMes    = mesItems.filter(s => s.servicioTipo === 'VENTA').length;

        // GANANCIA MO (mano de obra = costoExtra de items técnicos)
        const moHoy = hoyItems
            .filter(s => s.servicioTipo === 'TECNICA')
            .reduce((a, s) => a + (s.items?.reduce((b, it) => b + Number(it.costoExtra || 0), 0) || 0), 0);

        // PENDIENTES
        const pendientesCount = pendientes.length;
        const pendientesVal   = pendientes.reduce((a, s) => a + calcularTotal(s), 0);

        // ÚLTIMOS 8 movimientos (realizados + pendientes, los más recientes)
        const ultimos = [...servicios]
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 8);

        return {
            totalHoy, serviciosHoy, ventasHoy, moHoy,
            totalMes, serviciosMes, ventasMes,
            pendientesCount, pendientesVal,
            ultimos,
        };
    }, [servicios]);

    return { stats, cargando, recargar: cargar };
}