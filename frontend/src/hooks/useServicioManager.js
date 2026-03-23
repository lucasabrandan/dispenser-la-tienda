import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

/**
 * useServicioManager
 * Toda la lógica del módulo Servicio Técnico.
 */
export function useServicioManager() {
    const [servicios, setServicios]   = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [busqueda, setBusqueda]     = useState('');
    const [filtroTab, setFiltroTab]   = useState('TODOS');
    const [modalCrear, setModalCrear] = useState(false);
    const [servicioEditar, setServicioEditar] = useState(null);
    const [modalDetalle, setModalDetalle]     = useState(null);

    useEffect(() => { cargarServicios(); }, []);

    // ── API ────────────────────────────────────────────────────────────────────
    const cargarServicios = async () => {
        setCargando(true);
        try {
            const res  = await api.get('/servicios?page=0&size=1000');
            const data = res.data.content || res.data || [];
            const soloTecnica = Array.isArray(data)
                ? data
                    .filter(s => s.servicioTipo === 'TECNICA')
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                : [];
            setServicios(soloTecnica);
        } catch {
            toast.error('Error al cargar servicios');
        } finally {
            setCargando(false);
        }
    };

    const confirmarServicio = async (id) => {
        const loading = toast.loading('Confirmando servicio...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('✅ Servicio confirmado', { id: loading });
            cargarServicios();
        } catch {
            toast.error('Error al confirmar', { id: loading });
        }
    };

    const rechazarServicio = async (id) => {
        if (!window.confirm('¿Rechazar este presupuesto?')) return;
        const loading = toast.loading('Rechazando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'RECHAZADO' });
            toast.success('Presupuesto rechazado', { id: loading });
            cargarServicios();
        } catch {
            toast.error('Error al rechazar', { id: loading });
        }
    };

    const eliminarServicio = async (id) => {
        if (!window.confirm('⚠️ ¿Eliminar permanentemente este registro?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('🗑️ Registro eliminado');
            cargarServicios();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const generarPDF = (servicio) => {
        generarRemitoPDFPremium({
            esPresupuesto: servicio.estado === 'PRESUPUESTO',
            cliente:       { nombre: servicio.clienteNombre },
            sede:          { nombreSede: servicio.sedeNombre },
            tecnico:       'Marcos',
            ticketItems:   servicio.items?.map(it => ({ ...it, totalCalculado: it.costo })) || [],
            totalFinal:    calcularTotal(servicio),
            fechaServicio: servicio.fecha
        });
    };

    // ── Cálculos ───────────────────────────────────────────────────────────────
    const calcularTotal = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const stats = useMemo(() => {
        const realizados  = servicios.filter(s => s.estado === 'REALIZADO');
        const pendientes  = servicios.filter(s => s.estado === 'PRESUPUESTO');
        const hoy         = new Date().toISOString().split('T')[0];
        const serviciosHoy = realizados.filter(s => s.fecha === hoy);

        const totalMes      = realizados.reduce((a, s) => a + calcularTotal(s), 0);
        const totalHoy      = serviciosHoy.reduce((a, s) => a + calcularTotal(s), 0);
        const pendientesVal = pendientes.reduce((a, s) => a + calcularTotal(s), 0);

        // Ganancia aproximada — suma de costoExtra (MO) de todos los items
        const gananciaTotal = realizados.reduce((a, s) =>
            a + (s.items?.reduce((b, it) => b + Number(it.costoExtra || 0), 0) || 0), 0);

        return {
            totalMes,
            totalHoy,
            cantidadMes:     realizados.length,
            cantidadHoy:     serviciosHoy.length,
            pendientesCount: pendientes.length,
            pendientesVal,
            gananciaTotal,
        };
    }, [servicios]);

    // ── Filtrado ───────────────────────────────────────────────────────────────
    const serviciosFiltrados = useMemo(() => {
        const txt = busqueda.toLowerCase();
        return servicios.filter(s => {
            const pasaTab =
                filtroTab === 'TODOS'       ? true :
                filtroTab === 'REALIZADOS'  ? s.estado === 'REALIZADO' :
                filtroTab === 'PENDIENTES'  ? s.estado === 'PRESUPUESTO' : true;

            const pasaBusqueda =
                !txt ||
                s.clienteNombre?.toLowerCase().includes(txt) ||
                s.sedeNombre?.toLowerCase().includes(txt) ||
                s.items?.some(it => it.equipoSerial?.toLowerCase().includes(txt) ||
                    it.trabajoRealizado?.toLowerCase().includes(txt));

            return pasaTab && pasaBusqueda;
        });
    }, [servicios, filtroTab, busqueda]);

    const abrirEditar = (servicio) => {
        setServicioEditar(servicio);
        setModalCrear(true);
    };

    const cerrarModal = () => {
        setModalCrear(false);
        setServicioEditar(null);
    };

    return {
        servicios: serviciosFiltrados,
        cargando, stats,
        busqueda, setBusqueda,
        filtroTab, setFiltroTab,
        modalCrear, setModalCrear,
        servicioEditar,
        modalDetalle, setModalDetalle,
        cargarServicios,
        confirmarServicio,
        rechazarServicio,
        eliminarServicio,
        generarPDF,
        calcularTotal,
        abrirEditar,
        cerrarModal,
    };
}