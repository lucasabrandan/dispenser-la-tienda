import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

// Convierte el período rápido (MES, MES_ANT, etc.) a fechas ISO para el backend
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
 * useServicioManager
 * Gestión de servicios técnicos con paginación y filtros server-side.
 */
export function useServicioManager() {
    const { usuario, esAdmin } = useAuth();

    // ── Lista ───────────────────────────────────────────────────────────────────
    const [servicios, setServicios]     = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [pagina, setPagina]           = useState(0); // 0-based para Spring
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalItems, setTotalItems]   = useState(0);

    // ── Stats ────────────────────────────────────────────────────────────────────
    const [stats, setStats] = useState({
        totalMes: 0, cantidadMes: 0,
        totalHoy: 0, cantidadHoy: 0,
        gananciaTotal: 0,
        pendientesCount: 0, pendientesVal: 0,
    });

    // ── Filtros (interfaz compatible con FiltrosPanel) ──────────────────────────
    const [busquedaInput, setBusquedaInput]   = useState('');
    const [busquedaApi, setBusquedaApi]       = useState('');
    const [estado, setEstadoInternal]         = useState('PRESUPUESTO');
    const [periodoRapido, setPeriodoRapido]   = useState('MES');
    const [mesSelector, setMesSelector]       = useState('');
    const [desde, setDesde]                   = useState('');
    const [hasta, setHasta]                   = useState('');
    const [usuarioId, setUsuarioId]           = useState('');

    // ── Modales ──────────────────────────────────────────────────────────────────
    const [modalCrear, setModalCrear]             = useState(false);
    const [servicioEditar, setServicioEditar]     = useState(null);
    const [modalDetalle, setModalDetalle]         = useState(null);
    const [modalFirmas, setModalFirmas]           = useState(false);
    const [pendingPdfServicio, setPendingPdfServicio] = useState(null);

    // Debounce de búsqueda — 500ms para no saturar la API
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
    const cargarServicios = useCallback(async () => { // eslint-disable-line
        setCargando(true);
        try {
            const fechas = resolverFechas(periodoRapido, mesSelector, desde, hasta);
            const params = {
                tipo: 'TECNICA',
                page: pagina,
                size: 20,
                sort: 'fechaServicio,desc',
            };
            if (estado !== 'TODOS')  params.estado    = estado;
            if (busquedaApi)         params.busqueda  = busquedaApi;
            if (fechas.desde)        params.desde     = fechas.desde;
            if (fechas.hasta)        params.hasta     = fechas.hasta;
            // técnico: siempre filtra por su propio ID; admin: usa el selector
            if (!esAdmin && usuario?.id) params.usuarioId = usuario.id;
            else if (usuarioId)           params.usuarioId = usuarioId;

            const res = await api.get('/servicios', { params });
            const page = res.data;
            setServicios(page.content || []);
            setTotalPaginas(page.totalPages || 1);
            setTotalItems(page.totalElements || 0);
        } catch {
            toast.error('Error al cargar servicios');
        } finally {
            setCargando(false);
        }
    }, [pagina, estado, busquedaApi, periodoRapido, mesSelector, desde, hasta, usuarioId, esAdmin, usuario?.id]);

    // ── Fetch stats (separado de la lista) ───────────────────────────────────────
    const cargarStats = useCallback(async () => {
        try {
            const res = await api.get('/servicios/resumen', { params: { tipo: 'TECNICA' } });
            setStats(res.data);
        } catch { /* stats no críticos — silenciar */ }
    }, []);

    useEffect(() => { cargarServicios(); }, [cargarServicios]);
    useEffect(() => { cargarStats(); },   [cargarStats]);

    // ── Acciones ─────────────────────────────────────────────────────────────────
    const confirmarServicio = async (id) => {
        const loading = toast.loading('Confirmando servicio...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('✅ Servicio confirmado', { id: loading });
            cargarServicios(); cargarStats();
        } catch { toast.error('Error al confirmar', { id: loading }); }
    };

    const rechazarServicio = async (id) => {
        if (!window.confirm('¿Rechazar este presupuesto?')) return;
        const loading = toast.loading('Rechazando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'RECHAZADO' });
            toast.success('Presupuesto rechazado', { id: loading });
            cargarServicios(); cargarStats();
        } catch { toast.error('Error al rechazar', { id: loading }); }
    };

    const eliminarServicio = async (id) => {
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('Registro eliminado');
            cargarServicios(); cargarStats();
        } catch { toast.error('Error al eliminar'); }
    };

    const archivarServicio = async (id) => {
        if (!window.confirm('¿Archivar este servicio? Quedará en la pestaña Archivados.')) return;
        const loading = toast.loading('Archivando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'ARCHIVADO' });
            toast.success('Servicio archivado', { id: loading });
            cargarServicios(); cargarStats();
        } catch { toast.error('Error al archivar', { id: loading }); }
    };

    const accionMasiva = async (ids, accion) => {
        const texto = accion === 'ARCHIVADO' ? 'archivar' : 'cobrar';
        if (!window.confirm(`¿${texto.charAt(0).toUpperCase() + texto.slice(1)} ${ids.length} servicio${ids.length > 1 ? 's' : ''}?`)) return;
        const loading = toast.loading(`Procesando ${ids.length} servicios...`);
        try {
            await Promise.all(ids.map(id => api.patch(`/servicios/${id}/estado`, { estado: accion })));
            toast.success(`${ids.length} servicios actualizados`, { id: loading });
            cargarServicios(); cargarStats();
        } catch { toast.error('Error en la operación masiva', { id: loading }); }
    };

    // Abre el modal de firmas; la generación real ocurre en confirmarFirmasYGenerarPDF
    const generarPDF = (servicio) => {
        setPendingPdfServicio(servicio);
        setModalFirmas(true);
    };

    const confirmarFirmasYGenerarPDF = async ({ firmaTecnico, firmaCliente, incluirFirmas = true }) => {
        setModalFirmas(false);
        const servicio = pendingPdfServicio;
        setPendingPdfServicio(null);
        if (!servicio) return;

        const loading = toast.loading('Preparando PDF...');
        try {
            const itemsConFotos = (servicio.items || []).map(it => ({
                ...it,
                totalCalculado:  parseFloat(it.costo)      || 0,
                costoExtra:      parseFloat(it.costoExtra) || 0,
                modeloEquipo:    it.modeloEquipo    || it.equipoModelo    || null,
                ubicacionEquipo: it.ubicacionEquipo || it.equipoUbicacion || null,
                equipoPiso:      it.equipoPiso      || null,
                equipoSector:    it.equipoSector    || null,
                trabajo:         it.trabajo         || it.trabajoRealizado || '',
            }));
            toast.dismiss(loading);
            await generarRemitoPDFPremium({
                esPresupuesto:       servicio.estado === 'PRESUPUESTO',
                cliente: {
                    nombre:       servicio.clienteNombre,
                    telefono:     servicio.clienteTelefono,
                    email:        servicio.clienteEmail,
                    cuilDni:      servicio.clienteDni,
                    condicionIva: servicio.clienteCondicionIva,
                },
                sede: {
                    nombreSede: servicio.sedeNombre,
                    direccion:  servicio.sedeDireccion,
                },
                tecnico:             localStorage.getItem('tecnico_nombre') || 'Técnico',
                ticketItems:         itemsConFotos,
                fechaServicio:       servicio.fecha,
                descuentoPorcentaje: servicio.descuentoPorcentaje || 0,
                leyenda:             servicio.observaciones || '',
                esTecnicoForzado:    servicio.servicioTipo === 'TECNICA',
                firmaTecnico:        firmaTecnico  || null,
                firmaCliente:        firmaCliente  || null,
                incluirFirmas:       incluirFirmas,
            });
        } catch (e) {
            console.error('Error generando PDF:', e);
            toast.error('Error al generar PDF', { id: loading });
        }
    };

    const calcularTotal = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const abrirEditar   = (servicio) => { setServicioEditar(servicio); setModalCrear(true); };
    const cerrarModal   = ()          => { setModalCrear(false); setServicioEditar(null); };

    // setFiltroTab: alias para compatibilidad con ServicioManager (click en card Pendientes)
    const setFiltroTab = (tab) => {
        if      (tab === 'PENDIENTES') setEstado('PRESUPUESTO');
        else if (tab === 'REALIZADOS') setEstado('REALIZADO');
        else                           setEstado('TODOS');
    };

    // ── Objeto filtros compatible con FiltrosPanel ────────────────────────────────
    const filtros = {
        busqueda: busquedaInput, setBusqueda,
        estado, setEstado,
        periodoRapido, aplicarRapido,
        mesSelector, aplicarMesSelector,
        desde, hasta, aplicarRango,
        mesesDisponibles: [], // sin dropdown de meses en modo server-side
        totalItems,
        pagina: pagina + 1,       // FiltrosPanel y Paginacion usan 1-based
        totalPaginas,
        itemsPagina:    servicios,
        itemsFiltrados: servicios, // para exportarCSV
        irA:  (n) => setPagina(n - 1),
        next: ()  => setPagina((p) => Math.min(p + 1, totalPaginas - 1)),
        prev: ()  => setPagina((p) => Math.max(p - 1, 0)),
    };

    return {
        servicios,
        cargando, stats,
        modalCrear, setModalCrear,
        servicioEditar,
        modalDetalle, setModalDetalle,
        modalFirmas, setModalFirmas,
        confirmarFirmasYGenerarPDF,
        cargarServicios: () => { cargarServicios(); cargarStats(); },
        confirmarServicio, rechazarServicio,
        eliminarServicio, archivarServicio, accionMasiva, generarPDF,
        calcularTotal, abrirEditar, cerrarModal,
        setFiltroTab,
        filtros,
        usuarioId, setUsuarioId,
    };
}
