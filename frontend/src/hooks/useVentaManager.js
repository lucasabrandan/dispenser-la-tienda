import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

/**
 * useVentaManager
 * Toda la lógica del módulo Ventas.
 * Maneja: lista, stats, filtros, acciones CRUD.
 */
export function useVentaManager() {
    const [ventas, setVentas]       = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [busqueda, setBusqueda]   = useState('');
    const [filtroTab, setFiltroTab] = useState('TODOS');
    const [modalCrear, setModalCrear] = useState(false);
    const [ventaEditar, setVentaEditar] = useState(null);

    useEffect(() => { cargarVentas(); }, []);

    // ── API ────────────────────────────────────────────────────────────────────
    const cargarVentas = async () => {
        setCargando(true);
        try {
            const res = await api.get('/servicios?page=0&size=1000');
            const data = res.data.content || res.data || [];
            // Solo ventas — tipo VENTA o sin equipo
            const soloVentas = Array.isArray(data)
                ? data
                    .filter(s => s.servicioTipo === 'VENTA')
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                : [];
            setVentas(soloVentas);
        } catch {
            toast.error('Error al cargar ventas');
        } finally {
            setCargando(false);
        }
    };

    const confirmarVenta = async (id) => {
        const loading = toast.loading('Confirmando venta...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('✅ Venta confirmada', { id: loading });
            cargarVentas();
        } catch {
            toast.error('Error al confirmar', { id: loading });
        }
    };

    const eliminarVenta = async (id) => {
        if (!window.confirm('¿Eliminar esta venta permanentemente?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('🗑️ Venta eliminada');
            cargarVentas();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const generarPDF = (venta) => {
        generarRemitoPDFPremium({
            esPresupuesto: venta.estado === 'PRESUPUESTO',
            cliente:       { nombre: venta.clienteNombre },
            sede:          { nombreSede: venta.sedeNombre },
            tecnico:       'Mostrador',
            ticketItems:   venta.items?.map(it => ({ ...it, totalCalculado: it.costo })) || [],
            totalFinal:    calcularTotal(venta),
            fechaServicio: venta.fecha
        });
    };

    // ── Cálculos ───────────────────────────────────────────────────────────────
    const calcularTotal = (v) =>
        v.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const stats = useMemo(() => {
        const cobradas   = ventas.filter(v => v.estado === 'REALIZADO');
        const pendientes = ventas.filter(v => v.estado === 'PRESUPUESTO');
        const hoy        = new Date().toISOString().split('T')[0];
        const ventasHoy  = cobradas.filter(v => v.fecha === hoy);

        const totalMes    = cobradas.reduce((a, v) => a + calcularTotal(v), 0);
        const totalHoy    = ventasHoy.reduce((a, v) => a + calcularTotal(v), 0);
        const pendientesVal = pendientes.reduce((a, v) => a + calcularTotal(v), 0);

        return {
            totalMes,
            totalHoy,
            cantidadMes:    cobradas.length,
            cantidadHoy:    ventasHoy.length,
            pendientesCount: pendientes.length,
            pendientesVal,
        };
    }, [ventas]);

    // ── Filtrado ───────────────────────────────────────────────────────────────
    const ventasFiltradas = useMemo(() => {
        const txt = busqueda.toLowerCase();
        return ventas.filter(v => {
            const pasaTab =
                filtroTab === 'TODOS'      ? true :
                filtroTab === 'COBRADAS'   ? v.estado === 'REALIZADO' :
                filtroTab === 'PENDIENTES' ? v.estado === 'PRESUPUESTO' : true;

            const pasaBusqueda =
                !txt ||
                v.clienteNombre?.toLowerCase().includes(txt) ||
                v.sedeNombre?.toLowerCase().includes(txt) ||
                v.items?.some(it => it.trabajoRealizado?.toLowerCase().includes(txt));

            return pasaTab && pasaBusqueda;
        });
    }, [ventas, filtroTab, busqueda]);

    const abrirEditar = (venta) => {
        setVentaEditar(venta);
        setModalCrear(true);
    };

    const cerrarModal = () => {
        setModalCrear(false);
        setVentaEditar(null);
    };

    return {
        ventas: ventasFiltradas,
        cargando, stats,
        busqueda, setBusqueda,
        filtroTab, setFiltroTab,
        modalCrear, setModalCrear,
        ventaEditar,
        cargarVentas,
        confirmarVenta,
        eliminarVenta,
        generarPDF,
        calcularTotal,
        abrirEditar,
        cerrarModal,
    };
}