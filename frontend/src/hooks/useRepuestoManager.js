import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { generarPDFListaPrecios } from '../../utils/generadorPDFListaPrecios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const POR_PAGINA = 20;

/**
 * useRepuestoManager
 * Toda la lógica del gestor de repuestos/productos.
 * El componente visual solo renderiza — no sabe nada de API.
 */
export function useRepuestoManager() {
    const [productos, setProductos]       = useState([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEdicion, setProductoEdicion] = useState(null);
    const [expandido, setExpandido]       = useState({});
    const [busqueda, setBusquedaRaw]      = useState('');
    const [pagina, setPagina]             = useState(1);
    const [seleccionados, setSeleccionados] = useState(new Set());
    const [modoSeleccion, setModoSeleccion] = useState(false);
    const [modalPrecio, setModalPrecio]   = useState(false);
    const [gananciamasiva, setGananciaMasiva] = useState('');
    const [markupMasivo, setMarkupMasivo]     = useState('');

    useEffect(() => { cargarProductos(); }, []);

    // Reset de página al cambiar búsqueda
    const setBusqueda = (v) => { setBusquedaRaw(v); setPagina(1); };

    // ── API ────────────────────────────────────────────────────────────────────
    const cargarProductos = async () => {
        try {
            const res = await api.get('/repuestos?page=0&size=500');
            setProductos(res.data.content || res.data);
        } catch {
            toast.error('Error al cargar productos');
        }
    };

    const eliminar = async (id) => {
        if (!window.confirm('¿Eliminar este producto?')) return;
        try {
            await api.delete(`/repuestos/${id}`);
            toast.success('Producto eliminado');
            await cargarProductos();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    // ── Filtrado + paginación ──────────────────────────────────────────────────
    const productosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return productos;
        const q = busqueda.toLowerCase().trim();
        return productos.filter(p =>
            p.nombre?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q)
        );
    }, [productos, busqueda]);

    const totalPaginas   = Math.max(1, Math.ceil(productosFiltrados.length / POR_PAGINA));
    const paginaActual   = Math.min(pagina, totalPaginas);
    const productosPagina = useMemo(() =>
        productosFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
        [productosFiltrados, paginaActual]
    );
    const irA  = (n) => setPagina(Math.max(1, Math.min(n, totalPaginas)));
    const next = ()  => irA(paginaActual + 1);
    const prev = ()  => irA(paginaActual - 1);

    // ── Selección ──────────────────────────────────────────────────────────────
    const toggleSeleccion = (id) => {
        setSeleccionados(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const seleccionarTodos = () => {
        setSeleccionados(
            todosSeleccionados
                ? new Set()
                : new Set(productosPagina.map(p => p.id))
        );
    };

    const cancelarSeleccion = () => {
        setModoSeleccion(false);
        setSeleccionados(new Set());
    };

    // ── Acciones masivas ───────────────────────────────────────────────────────
    const eliminarSeleccionados = async () => {
        if (seleccionados.size === 0) return;
        if (!window.confirm(`¿Eliminar ${seleccionados.size} producto(s)?`)) return;
        const t = toast.loading('Eliminando...');
        try {
            await Promise.all([...seleccionados].map(id => api.delete(`/repuestos/${id}`)));
            toast.success(`✅ ${seleccionados.size} eliminados`, { id: t });
            cancelarSeleccion();
            await cargarProductos();
        } catch {
            toast.error('Error al eliminar', { id: t });
        }
    };

    const exportarSeleccionados = () => {
        if (seleccionados.size === 0) return;
        generarPDFListaPrecios(productos.filter(p => seleccionados.has(p.id)));
        toast.success(`📥 PDF con ${seleccionados.size} producto(s)`);
    };

    const exportarTodos = () => {
        if (productos.length === 0) { toast.error('No hay productos'); return; }
        generarPDFListaPrecios(productos);
        toast.success('📥 PDF generado');
    };

    const aplicarPrecioMasivo = async () => {
        const gVal = gananciamasiva !== '' ? parseFloat(gananciamasiva) : null;
        const mVal = markupMasivo   !== '' ? parseFloat(markupMasivo)   : null;
        if (gVal !== null && (isNaN(gVal) || gVal < 0)) { toast.error('Ganancia inválida'); return; }
        if (mVal !== null && (isNaN(mVal) || mVal < 0)) { toast.error('Markup inválido');   return; }
        if (gVal === null && mVal === null) { toast.error('Ingresá al menos un valor'); return; }
        if (seleccionados.size === 0) return;
        const t = toast.loading('Actualizando precios...');
        try {
            await Promise.all(
                productos.filter(p => seleccionados.has(p.id)).map(producto => {
                    const fd = new FormData();
                    fd.append('sku', producto.sku);
                    fd.append('nombre', producto.nombre);
                    fd.append('costo', producto.costo);
                    const g = gVal !== null ? gVal : (producto.porcentajeGanancia ?? 0);
                    const m = mVal !== null ? mVal : (producto.porcentajeMarkup   ?? 0);
                    fd.append('porcentajeGanancia', g);
                    fd.append('porcentajeMarkup', m);
                    const base  = parseFloat(producto.costo) * (1 + g / 100);
                    const lista = base * (1 + m / 100);
                    fd.append('precioLista', lista);
                    return fetch(`${BASE_URL}/repuestos/${producto.id}`, { method: 'PUT', body: fd });
                })
            );
            toast.success('✅ Precios actualizados', { id: t });
            setModalPrecio(false);
            setGananciaMasiva('');
            setMarkupMasivo('');
            cancelarSeleccion();
            await cargarProductos();
        } catch {
            toast.error('Error al actualizar precios', { id: t });
        }
    };

    // ── Helpers UI ─────────────────────────────────────────────────────────────
    const toggleExpandido = (id) =>
        setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

    const abrirNuevo = () => {
        setProductoEdicion(null);
        setModalAbierto(true);
    };

    const abrirEditar = (producto) => {
        setProductoEdicion(producto);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setProductoEdicion(null);
    };

    const todosSeleccionados =
        seleccionados.size === productosPagina.length && productosPagina.length > 0;

    // Métricas para el header
    const valorTotalInventario = productos.reduce(
        (acc, r) => acc + (Number(r.costo || 0) * Number(r.stock)), 0
    );
    const itemsBajoStock = productos.filter(r => Number(r.stock) <= 3).length;

    return {
        // Estado
        productos, productosFiltrados,
        productosPagina,
        pagina: paginaActual, totalPaginas,
        irA, next, prev,
        modalAbierto, productoEdicion,
        expandido, busqueda, setBusqueda,
        seleccionados, modoSeleccion, setModoSeleccion,
        modalPrecio, setModalPrecio,
        gananciamasiva, setGananciaMasiva,
        markupMasivo, setMarkupMasivo,
        todosSeleccionados,
        valorTotalInventario, itemsBajoStock,
        // Acciones
        cargarProductos,
        eliminar,
        eliminarSeleccionados,
        exportarSeleccionados,
        exportarTodos,
        aplicarPrecioMasivo,
        toggleSeleccion,
        seleccionarTodos,
        cancelarSeleccion,
        toggleExpandido,
        abrirNuevo,
        abrirEditar,
        cerrarModal,
    };
}