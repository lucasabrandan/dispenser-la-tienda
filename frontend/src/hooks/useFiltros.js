import { useState, useMemo } from 'react';
import { inicioMes, finMes, formatDateISO } from '../utils/dateUtils';

const hoy = () => new Date();

/**
 * useFiltros + usePaginacion — hook reutilizable
 *
 * Recibe un array de items con campo `fecha` (YYYY-MM-DD) y `estado` opcional.
 * Devuelve los items filtrados y paginados + helpers para los controles.
 */
export function useFiltros(items = [], { porPagina = 15, campoFecha = 'fecha', campoEstado = 'estado', campoBusqueda = null, campoBusquedaFn = null, periodoInicial = 'TODO' } = {}) {

    const [pagina,       setPagina]       = useState(1);
    const [busqueda,     setBusqueda]     = useState('');
    const [estado,       setEstado]       = useState('TODOS');
    const [periodoRapido,setPeriodoRapido]= useState(periodoInicial);   // MES | MES_ANT | ANO | TODO | CUSTOM
    const [desde,        setDesde]        = useState('');
    const [hasta,        setHasta]        = useState('');
    const [mesSelector,  setMesSelector]  = useState('');      // "2026-03"

    // ── Períodos rápidos ────────────────────────────────────────────────────
    const aplicarRapido = (tipo) => {
        setPeriodoRapido(tipo);
        setMesSelector('');
        setDesde('');
        setHasta('');
        setPagina(1);
    };

    const aplicarMesSelector = (val) => {
        setMesSelector(val);
        setPeriodoRapido('CUSTOM');
        setDesde('');
        setHasta('');
        setPagina(1);
    };

    const aplicarRango = (d, h) => {
        setDesde(d);
        setHasta(h);
        setPeriodoRapido('CUSTOM');
        setMesSelector('');
        setPagina(1);
    };

    // ── Generar opciones de meses disponibles ──────────────────────────────
    const mesesDisponibles = useMemo(() => {
        const set = new Set();
        items.forEach(it => {
            const f = it[campoFecha];
            if (f) set.add(f.slice(0, 7)); // "2026-03"
        });
        return [...set].sort().reverse();
    }, [items, campoFecha]);

    // ── Filtrado ────────────────────────────────────────────────────────────
    const itemsFiltrados = useMemo(() => {
        const now = hoy();
        let resultado = [...items];

        // Filtro período — se ignora si hay búsqueda activa (para encontrar en todo el historial)
        // Comparación por STRING "YYYY-MM-DD" (no por Date/timestamp): antes `hastaFecha`
        // salía de finMes() a las 00:00:00 del último día, pero el item se parseaba a las
        // 12:00:00 de ese mismo día — 12:00 > 00:00, así que cualquier presupuesto fechado
        // justo el último día del mes (o el 31/dic para "Este año") quedaba afuera de "Este
        // mes"/"Mes anterior"/"Este año" aunque estuviera perfectamente dentro del rango.
        // Comparar los strings ISO evita el problema de raíz (y de paso cualquier lío de huso horario).
        if (periodoRapido !== 'TODO' && !busqueda.trim()) {
            let desdeStr, hastaStr;

            if (periodoRapido === 'MES') {
                desdeStr = formatDateISO(inicioMes(now));
                hastaStr = formatDateISO(finMes(now));
            } else if (periodoRapido === 'MES_ANT') {
                const ant = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                desdeStr = formatDateISO(inicioMes(ant));
                hastaStr = formatDateISO(finMes(ant));
            } else if (periodoRapido === 'ANO') {
                desdeStr = `${now.getFullYear()}-01-01`;
                hastaStr = `${now.getFullYear()}-12-31`;
            } else if (periodoRapido === 'CUSTOM') {
                if (mesSelector) {
                    const [y, m] = mesSelector.split('-').map(Number);
                    const ref = new Date(y, m - 1, 1);
                    desdeStr = formatDateISO(inicioMes(ref));
                    hastaStr = formatDateISO(finMes(ref));
                } else if (desde || hasta) {
                    desdeStr = desde || null;
                    hastaStr = hasta || null;
                }
            }

            if (desdeStr || hastaStr) {
                resultado = resultado.filter(it => {
                    const f = it[campoFecha];
                    if (!f) return false;
                    const fechaStr = f.slice(0, 10);
                    if (desdeStr && fechaStr < desdeStr) return false;
                    if (hastaStr && fechaStr > hastaStr) return false;
                    return true;
                });
            }
        }

        // Filtro estado
        if (estado !== 'TODOS') {
            resultado = resultado.filter(it => it[campoEstado] === estado);
        }

        // Filtro búsqueda texto
        if (busqueda.trim() && (campoBusqueda || campoBusquedaFn)) {
            const q = busqueda.toLowerCase().trim();
            // Bug real (reportado 7-sep): se le muestra a cada item su número de id
            // como "#123" en toda la app (tarjetas de Servicio/Presupuesto/Venta),
            // pero buscar "123" o "#123" nunca lo encontraba -- ningún campoBusqueda
            // incluía el id. Se agrega el match acá, una sola vez, en vez de en cada
            // pantalla que use este hook.
            const qId = q.replace(/^#/, '');
            resultado = resultado.filter(it => {
                const enCampos = campoBusqueda?.some(campo => it[campo]?.toString().toLowerCase().includes(q)) ?? false;
                const enExtra  = campoBusquedaFn ? campoBusquedaFn(it).toLowerCase().includes(q) : false;
                const enId     = qId !== '' && it.id != null && String(it.id).includes(qId);
                return enCampos || enExtra || enId;
            });
        }

        return resultado;
    }, [items, periodoRapido, mesSelector, desde, hasta, estado, busqueda, campoFecha, campoEstado, campoBusqueda, campoBusquedaFn]);

    // ── Paginación ──────────────────────────────────────────────────────────
    const totalPaginas  = Math.max(1, Math.ceil(itemsFiltrados.length / porPagina));
    const paginaActual  = Math.min(pagina, totalPaginas);
    const inicio        = (paginaActual - 1) * porPagina;
    const itemsPagina   = itemsFiltrados.slice(inicio, inicio + porPagina);

    const irA     = (n) => setPagina(Math.max(1, Math.min(n, totalPaginas)));
    const next    = () => irA(paginaActual + 1);
    const prev    = () => irA(paginaActual - 1);

    return {
        // items
        itemsPagina,
        itemsFiltrados,
        totalItems: itemsFiltrados.length,
        // paginación
        pagina: paginaActual,
        totalPaginas,
        irA, next, prev,
        // filtros
        busqueda, setBusqueda,
        estado, setEstado,
        periodoRapido, aplicarRapido,
        mesSelector, aplicarMesSelector,
        desde, hasta, aplicarRango,
        mesesDisponibles,
    };
}