import { useState, useMemo } from 'react';
import { inicioMes, finMes } from '../utils/dateUtils';

const hoy = () => new Date();

/**
 * useFiltros + usePaginacion — hook reutilizable
 *
 * Recibe un array de items con campo `fecha` (YYYY-MM-DD) y `estado` opcional.
 * Devuelve los items filtrados y paginados + helpers para los controles.
 */
export function useFiltros(items = [], { porPagina = 15, campoFecha = 'fecha', campoEstado = 'estado', campoBusqueda = null, campoBusquedaFn = null } = {}) {

    const [pagina,       setPagina]       = useState(1);
    const [busqueda,     setBusqueda]     = useState('');
    const [estado,       setEstado]       = useState('TODOS');
    const [periodoRapido,setPeriodoRapido]= useState('TODO');   // MES | MES_ANT | ANO | TODO | CUSTOM
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
        if (periodoRapido !== 'TODO' && !busqueda.trim()) {
            let desdeFecha, hastaFecha;

            if (periodoRapido === 'MES') {
                desdeFecha = inicioMes(now);
                hastaFecha = finMes(now);
            } else if (periodoRapido === 'MES_ANT') {
                const ant = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                desdeFecha = inicioMes(ant);
                hastaFecha = finMes(ant);
            } else if (periodoRapido === 'ANO') {
                desdeFecha = new Date(now.getFullYear(), 0, 1);
                hastaFecha = new Date(now.getFullYear(), 11, 31);
            } else if (periodoRapido === 'CUSTOM') {
                if (mesSelector) {
                    const [y, m] = mesSelector.split('-').map(Number);
                    const ref = new Date(y, m - 1, 1);
                    desdeFecha = inicioMes(ref);
                    hastaFecha = finMes(ref);
                } else if (desde || hasta) {
                    desdeFecha = desde ? new Date(desde + 'T00:00:00') : null;
                    hastaFecha = hasta ? new Date(hasta + 'T23:59:59') : null;
                }
            }

            if (desdeFecha || hastaFecha) {
                resultado = resultado.filter(it => {
                    const f = it[campoFecha];
                    if (!f) return false;
                    const fecha = new Date(f.includes('T') ? f : f + 'T12:00:00');
                    if (desdeFecha && fecha < desdeFecha) return false;
                    if (hastaFecha && fecha > hastaFecha) return false;
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
            resultado = resultado.filter(it => {
                const enCampos = campoBusqueda?.some(campo => it[campo]?.toString().toLowerCase().includes(q)) ?? false;
                const enExtra  = campoBusquedaFn ? campoBusquedaFn(it).toLowerCase().includes(q) : false;
                return enCampos || enExtra;
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