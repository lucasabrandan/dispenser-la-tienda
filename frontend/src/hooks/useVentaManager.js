import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

// Convierte período rápido a fechas ISO para el backend
function resolverFechas(periodoRapido, mesSelector, desde, hasta) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (periodoRapido === 'TODO') return { desde: '', hasta: '' };
    if (periodoRapido === 'MES') {
        const ini = new Date(now.getFullYear(), now.getMonth(), 1);
        const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { desde: fmt(ini), hasta: fmt(fin) };
    }
    if (periodoRapido === 'MES_ANT') {
        const ini = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const fin = new Date(now.getFullYear(), now.getMonth(), 0);
        return { desde: fmt(ini), hasta: fmt(fin) };
    }
    if (periodoRapido === 'ANO') {
        return { desde: `${now.getFullYear()}-01-01`, hasta: `${now.getFullYear()}-12-31` };
    }
    if (periodoRapido === 'CUSTOM') {
        if (mesSelector) {
            const [y, m] = mesSelector.split('-').map(Number);
            const ini = new Date(y, m - 1, 1);
            const fin = new Date(y, m, 0);
            return { desde: fmt(ini), hasta: fmt(fin) };
        }
        return { desde, hasta };
    }
    return { desde: '', hasta: '' };
}

/**
 * useVentaManager
 * Gestión de ventas con paginación y filtros server-side.
 */
export function useVentaManager() {
    // ── Lista ───────────────────────────────────────────────────────────────────
    const [ventas, setVentas]           = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [pagina, setPagina]           = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalItems, setTotalItems]   = useState(0);

    // ── Stats ────────────────────────────────────────────────────────────────────
    const [stats, setStats] = useState({
        totalMes: 0, cantidadMes: 0,
        totalHoy: 0, cantidadHoy: 0,
        pendientesCount: 0, pendientesVal: 0,
    });

    // ── Filtros ──────────────────────────────────────────────────────────────────
    const [busquedaInput, setBusquedaInput] = useState('');
    const [busquedaApi, setBusquedaApi]     = useState('');
    const [estado, setEstadoInternal]       = useState('TODOS');
    const [periodoRapido, setPeriodoRapido] = useState('MES');
    const [mesSelector, setMesSelector]     = useState('');
    const [desde, setDesde]                 = useState('');
    const [hasta, setHasta]                 = useState('');

    // ── Modales ──────────────────────────────────────────────────────────────────
    const [modalCrear, setModalCrear]     = useState(false);
    const [ventaEditar, setVentaEditar]   = useState(null);

    // Debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => { setBusquedaApi(busquedaInput); setPagina(0); }, 500);
        return () => clearTimeout(t);
    }, [busquedaInput]);

    // ── Setters con reset de página ──────────────────────────────────────────────
    const setBusqueda   = (v) => setBusquedaInput(v);
    const setEstado     = (v) => { setEstadoInternal(v); setPagina(0); };
    const aplicarRapido = (tipo) => {
        setPeriodoRapido(tipo); setMesSelector('');
        setDesde(''); setHasta(''); setPagina(0);
    };
    const aplicarMesSelector = (val) => {
        setMesSelector(val); setPeriodoRapido('CUSTOM');
        setDesde(''); setHasta(''); setPagina(0);
    };
    const aplicarRango = (d, h) => {
        setDesde(d); setHasta(h);
        setPeriodoRapido('CUSTOM'); setMesSelector(''); setPagina(0);
    };

    // ── Fetch lista ──────────────────────────────────────────────────────────────
    const cargarVentas = useCallback(async () => {
        setCargando(true);
        try {
            const fechas = resolverFechas(periodoRapido, mesSelector, desde, hasta);
            const params = {
                tipo: 'VENTA',
                page: pagina,
                size: 20,
                sort: 'fechaServicio,desc',
            };
            if (estado !== 'TODOS') params.estado   = estado;
            if (busquedaApi)        params.busqueda  = busquedaApi;
            // Si hay búsqueda activa, ignorar período para buscar en todo el historial
            if (!busquedaApi) {
                if (fechas.desde)   params.desde     = fechas.desde;
                if (fechas.hasta)   params.hasta     = fechas.hasta;
            }

            const res  = await api.get('/servicios', { params });
            const page = res.data;
            setVentas(page.content || []);
            setTotalPaginas(page.totalPages || 1);
            setTotalItems(page.totalElements || 0);
        } catch {
            toast.error('Error al cargar ventas');
        } finally {
            setCargando(false);
        }
    }, [pagina, estado, busquedaApi, periodoRapido, mesSelector, desde, hasta]);

    // ── Fetch stats ──────────────────────────────────────────────────────────────
    const cargarStats = useCallback(async () => {
        try {
            const res = await api.get('/servicios/resumen', { params: { tipo: 'VENTA' } });
            setStats(res.data);
        } catch { /* stats no críticos */ }
    }, []);

    useEffect(() => { cargarVentas(); }, [cargarVentas]);
    useEffect(() => { cargarStats(); }, [cargarStats]);

    // ── Acciones ─────────────────────────────────────────────────────────────────
    const confirmarVenta = async (id) => {
        const loading = toast.loading('Confirmando venta...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('✅ Venta confirmada', { id: loading });
            cargarVentas(); cargarStats();
        } catch { toast.error('Error al confirmar', { id: loading }); }
    };

    const eliminarVenta = async (id) => {
        if (!window.confirm('¿Eliminar esta venta permanentemente?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('🗑️ Venta eliminada');
            cargarVentas(); cargarStats();
        } catch { toast.error('Error al eliminar'); }
    };

    const generarPDF = async (venta, { sinPrecios = false } = {}) => {
        const tecnico = localStorage.getItem('tecnico_nombre') || 'Mostrador';

        // Enriquecer repuestosUsados con fotoUrl/descripcion actuales del catálogo
        // (ventas antiguas no los tenían persistidos en el JSON)
        let catalogoById  = {};
        let catalogoBySku = {};
        let catalogoByNombre = {};
        try {
            const res = await api.get('/repuestos?page=0&size=500');
            const lista = res.data.content || res.data;
            lista.forEach(r => {
                if (r.id)     catalogoById[r.id]         = r;
                if (r.sku)    catalogoBySku[r.sku]        = r;
                if (r.nombre) catalogoByNombre[r.nombre]  = r;
            });
        } catch { /* si falla, se usa lo que hay */ }

        const enrichItems = (venta.items || []).map(it => ({
            ...it,
            totalCalculado: it.costo,
            repuestosUsados: (it.repuestosUsados || []).map(r => {
                // Buscar en catálogo por id, sku o nombre (fallback para ventas viejas)
                const cat = catalogoById[r.id]
                    || (r.sku    && catalogoBySku[r.sku])
                    || (r.nombre && catalogoByNombre[r.nombre])
                    || null;
                return {
                    ...r,
                    fotoUrl:     r.fotoUrl     || cat?.fotoUrl     || null,
                    descripcion: r.descripcion || cat?.descripcion || null,
                    sku:         r.sku         || cat?.sku         || null,
                };
            }),
        }));

        generarRemitoPDFPremium({
            tipo:                    venta.estado === 'PRESUPUESTO' ? 'PRESUPUESTO_VENTA' : 'COMPROBANTE',
            cliente:                 { nombre: venta.clienteNombre },
            sede:                    { nombreSede: venta.sedeNombre },
            tecnico,
            servicioId:              venta.id,
            nroDocumentoExistente:   venta.nroDocumento || null,
            ticketItems:             enrichItems,
            totalFinal:              calcularTotal(venta),
            fechaServicio:           venta.fecha,
            descuentoPorcentaje:     venta.descuentoPorcentaje || 0,
            leyenda:                 venta.observaciones || '',
            sinPrecios,
        });
    };

    const calcularTotal = (v) =>
        v.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const abrirEditar = (venta) => { setVentaEditar(venta); setModalCrear(true); };
    const cerrarModal = ()       => { setModalCrear(false); setVentaEditar(null); };

    // ── Objeto filtros compatible con FiltrosPanel ────────────────────────────────
    const filtros = {
        busqueda: busquedaInput, setBusqueda,
        estado, setEstado,
        periodoRapido, aplicarRapido,
        mesSelector, aplicarMesSelector,
        desde, hasta, aplicarRango,
        mesesDisponibles: [],
        totalItems,
        pagina: pagina + 1,
        totalPaginas,
        itemsPagina:    ventas,
        itemsFiltrados: ventas,
        irA:  (n) => setPagina(n - 1),
        next: ()  => setPagina((p) => Math.min(p + 1, totalPaginas - 1)),
        prev: ()  => setPagina((p) => Math.max(p - 1, 0)),
    };

    return {
        ventas,
        cargando, stats,
        modalCrear, setModalCrear,
        ventaEditar,
        cargarVentas: () => { cargarVentas(); cargarStats(); },
        confirmarVenta, eliminarVenta,
        generarPDF, calcularTotal,
        abrirEditar, cerrarModal,
        filtros,
    };
}
