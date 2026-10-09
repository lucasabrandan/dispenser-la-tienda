import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LuClipboardList, LuWrench, LuShoppingCart, LuCircleCheck, LuPencil, LuPause } from 'react-icons/lu';
import BusquedaBar from './ui/BusquedaBar';
import ChipFiltro from './ui/ChipFiltro';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useFiltros } from '../hooks/useFiltros';
import { useMontos } from '../context/MontosContext';
import { useAuth } from '../context/AuthContext';
import Paginacion from './ui/Paginacion';
import FiltrosPanel from './ui/FiltrosPanel';
import SwipeColumns from './ui/SwipeColumns';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';
import ModalCotizacionVolumen from './presupuesto/ModalCotizacionVolumen';
import ModalDespacharPresupuesto from './presupuesto/ModalDespacharPresupuesto';
import IniciarTrabajoSheet from './presupuesto/IniciarTrabajoSheet';
import EjecutarAdminSheet from './servicio/EjecutarAdminSheet';
import ServicioForm from './servicio/ServicioForm';
import VentaForm from './venta/VentaForm';
import PresupuestoCard from './presupuesto/PresupuestoCard';
import { M } from './servicio/ServicioUI';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { mesKeyDeFecha, formatMesLargo, periodoLabelDe } from '../utils/dateUtils';
import ConfirmDialog from './ui/ConfirmDialog';
import { buildGoogleMapsRouteUrl } from '../utils/clienteUtils';
import { POR_PAGINA } from '../utils/paginacion';
import { colorTecnico } from '../utils/estados';
import { totalServicio } from '../utils/descuento';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseFechaSort(f) {
    if (!f) return 0;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
        const [d, m, y] = f.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
    }
    return new Date(f).getTime() || 0;
}

const TIPO_TABS = [
    { id: '',        label: 'Todos',     fullLabel: 'Todos',     color: '#1C1917', Icon: LuClipboardList },
    { id: 'TECNICA', label: 'Servicios', fullLabel: 'Servicios', color: '#D13A28', Icon: LuWrench },
    { id: 'VENTA',   label: 'Ventas',    fullLabel: 'Ventas',    color: '#D48800', Icon: LuShoppingCart },
];

// Secciones de Presupuestos (29-sep-2026): cada presupuesto cae solo en una,
// según su estado real y su orden — nadie lo mueve a mano salvo "En espera".
const SECCIONES = [
    { id: 'PENDIENTES', label: 'Pendientes', fullLabel: 'Pendientes', color: '#78716C', Icon: LuClipboardList },
    { id: 'EN_CURSO',   label: 'En curso',   fullLabel: 'En curso',   color: '#F0A500', Icon: LuWrench },
    { id: 'EN_ESPERA',  label: 'En espera',  fullLabel: 'En espera',  color: '#A8A29E', Icon: LuPause },
    { id: 'REALIZADOS', label: 'Realizados', fullLabel: 'Realizados', color: '#16A34A', Icon: LuCircleCheck },
];

const seccionDe = (p) =>
    p.enEspera ? 'EN_ESPERA'
    : p.estado === 'COMPLETADO' ? 'REALIZADOS'
    : (p.estado === 'EN_PROGRESO' || p.tecnicoAsignado) ? 'EN_CURSO'
    : 'PENDIENTES';


// ─── Componente principal ────────────────────────────────────────────────────
export default function PresupuestosManager() {
    const { esAdmin, usuario } = useAuth();
    const [presupuestos, setPresupuestos]   = useState([]);
    // presupuestoId → técnico de su orden abierta (quién lo tiene asignado de verdad)
    const [tecnicoPorPresu, setTecnicoPorPresu] = useState({});
    // '' = todos · '__SIN__' = sin asignar · '<nombre>' = ese técnico
    const [filtroTecnico, setFiltroTecnico] = useState('');
    const [cargando, setCargando]           = useState(true);
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [seleccionados, setSeleccionados]     = useState(new Set());
    const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
    const [mostrarPeriodo, setMostrarPeriodo]   = useState(false);

    // Long-press para selección masiva
    const longPressRef = React.useRef(null);
    const iniciarLongPress = (id) => {
        longPressRef.current = setTimeout(() => {
            setModoSeleccion(true);
            setSeleccionados(new Set([id]));
        }, 500);
    };
    const cancelarLongPress = () => { if (longPressRef.current) clearTimeout(longPressRef.current); };
    const [tipoFiltro, setTipoFiltro]             = useState('');
    const [seccion, setSeccion]                   = useState('PENDIENTES');
    const [modalCotizar, setModalCotizar]         = useState(false);
    const [presupuestoDespachar, setPresupuestoDespachar] = useState(null);
    const [presupuestoEjecutar, setPresupuestoEjecutar] = useState(null);
    const [presupuestoIniciar, setPresupuestoIniciar]   = useState(null);
    const [presupuestoEditar, setPresupuestoEditar]     = useState(null);
    const [confirmArchivarId, setConfirmArchivarId]     = useState(null); // id, o null
    const [confirmMasivoArchivar, setConfirmMasivoArchivar] = useState(false);

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const cargar = async () => {
        setCargando(true);
        const filtroUsuario = (!esAdmin && usuario?.id) ? { usuarioId: usuario.id } : {};
        try {
            // PRESUPUESTO (sin asignar) + EN_PROGRESO (ya asignado a un técnico, todavía
            // sin hacer). Antes solo traía PRESUPUESTO: apenas se asignaba a Marcos, el
            // presupuesto desaparecía de esta pantalla y el admin veía la lista vacía
            // aunque hubiera trabajo pendiente. Sale de la lista recién al completarse.
            const resPresu = await api.get('/servicios', { params: { estado: 'PRESUPUESTO,EN_PROGRESO,COMPLETADO', page: 0, size: 300, sort: 'fechaServicio,desc', ...filtroUsuario } });
            const data = resPresu.data.content || resPresu.data || [];
            if (esAdmin) {
                try {
                    // /ordenes por defecto trae solo -7/+30 días: se pide un rango amplio
                    const hasta = new Date(); hasta.setFullYear(hasta.getFullYear() + 1);
                    const resOrd = await api.get('/ordenes', { params: { desde: '2020-01-01', hasta: hasta.toISOString().slice(0, 10) } });
                    const mapa = {};
                    (resOrd.data || [])
                        .filter(o => o.presupuestoId && ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'NO_ATENDIDO'].includes(o.estado))
                        .forEach(o => { mapa[o.presupuestoId] = o.tecnicoNombre; });
                    setTecnicoPorPresu(mapa);
                } catch { /* sin órdenes: se usa el usuario del presupuesto */ }
            }
            setPresupuestos(Array.isArray(data)
                ? data.sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha) || (b.id || 0) - (a.id || 0))
                : []);
        } catch { toast.error('Error al cargar presupuestos'); }
        finally  { setCargando(false); }
    };

    const patchEstado = async (id, estado, msg, extras = {}) => {
        const t = toast.loading('Guardando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado, ...extras });
            toast.success(msg, { id: t });
            cargar();
            return true;
        } catch { toast.error('Error', { id: t }); return false; }
    };

    const confirmarServicio = async (id, estadoDestino, { modalidadCobro, montoFinal, observaciones } = {}) => {
        const labels = { COBRADO: 'Cobrado', COMPLETADO: 'Completado', PENDIENTE_FACTURACION: 'Pendiente facturación' };
        const extras = {};
        if (modalidadCobro) extras.modalidadCobro = modalidadCobro;
        if (montoFinal != null) extras.montoFinal = montoFinal;
        if (observaciones != null) extras.observaciones = observaciones;
        return patchEstado(id, estadoDestino, labels[estadoDestino] || 'Actualizado', extras);
    };

    // La confirmación la muestra el ConfirmDialog compartido (ver más abajo).
    const archivar = (id) => { patchEstado(id, 'ARCHIVADO', 'Archivado'); };

    // Total con descuento: el que calcula el backend (s.totales). Antes sumaba sin descuento.
    const calcularTotal = (s) => totalServicio(s);

    const generarPDF = useCallback(async (s, { sinPrecios = false } = {}) => {
        const loading = toast.loading('Generando PDF…');
        try {
        await generarRemitoPDFPremium({
            tipo:         s.servicioTipo === 'VENTA' ? 'PRESUPUESTO_VENTA' : undefined,
            esPresupuesto: true,
            servicioId: s.id,
            nroDocumentoExistente: s.nroDocumento || localStorage.getItem(`pdf_nro_${s.id}`) || null,
            cliente: { nombre: s.clienteNombre, telefono: s.clienteTelefono, email: s.clienteEmail, cuilDni: s.clienteDni, condicionFiscal: s.clienteCondicionIva },
            sede: { nombreSede: s.sedeNombre, direccion: s.sedeDireccion },
            tecnico: s.items?.[0]?.tecnico || s.usuarioNombre || localStorage.getItem('tecnico_nombre') || 'Técnico',
            ticketItems: s.items?.map(it => ({
                ...it,
                totalCalculado:  parseFloat(it.costo)      || 0,
                costoExtra:      parseFloat(it.costoExtra) || 0,
                modeloEquipo:    it.modeloEquipo    || it.equipoModelo    || null,
                ubicacionEquipo: it.ubicacionEquipo || it.equipoUbicacion || null,
                trabajo:         it.trabajo         || it.trabajoRealizado || '',
                esVisita:        it.esVisita || it.trabajoTipo === 'VISITA' || false,
            })) || [],
            fechaServicio: s.fecha,
            descuentoPorcentaje: s.descuentoPorcentaje || 0,
            descuentoAlcance: s.descuentoAlcance || 'TOTAL',
            totales: s.totales || null,
            leyenda: s.observaciones || '',
            incluirFirmas: false,
            sinPrecios,
        });
        toast.success('PDF generado', { id: loading });
        } catch (e) {
            console.error('Error generando PDF:', e);
            toast.error('Error al generar el PDF', { id: loading });
        }
    }, []);

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };

    const abrirRuta = (items) => {
        const dirs = items.map(s => s.sedeDireccion).filter(Boolean);
        const url = buildGoogleMapsRouteUrl(dirs);
        if (!url) { toast.error('Ningún presupuesto tiene dirección cargada'); return; }
        window.open(url, '_blank');
    };

    const ejecutarMasivaArchivar = async () => {
        setConfirmMasivoArchivar(false);
        const t = toast.loading('Archivando...');
        try {
            await Promise.all([...seleccionados].map(id => api.patch(`/servicios/${id}/estado`, { estado: 'ARCHIVADO' })));
            toast.success('Archivados', { id: t });
            setSeleccionados(new Set());
            setModoSeleccion(false);
            cargar();
        } catch { toast.error('Error', { id: t }); }
    };

    const presupuestosConNro = useMemo(() => presupuestos.map(p => ({
        ...p,
        nroDocPdf: p.nroDocumento || localStorage.getItem(`pdf_nro_${p.id}`) || '',
        tecnicoAsignado: tecnicoPorPresu[p.id] || (p.estado === 'EN_PROGRESO' ? p.usuarioNombre : null) || null,
    })).map(p => ({ ...p, seccion: seccionDe(p) })), [presupuestos, tecnicoPorPresu]);

    // Chips "por técnico" (admin) — 2-oct-2026: cambian según la pestaña.
    //  · En curso: quién lo tiene asignado (técnico de la orden abierta).
    //  · Realizados: quién lo hizo (el usuario que cerró el trabajo). Antes salían todos
    //    como "Sin asignar" porque al completarse la orden ya no estaba abierta.
    //  · Pendientes / En espera: sin chips (nada tiene técnico ahí).
    // Los números cuentan solo lo de la pestaña actual.
    const conChips = seccion === 'EN_CURSO' || seccion === 'REALIZADOS';
    const personaDe = useCallback((p) => (seccion === 'REALIZADOS' ? (p.usuarioNombre || null) : p.tecnicoAsignado), [seccion]);
    const enSeccion = useMemo(() => presupuestosConNro
        .filter(p => p.seccion === seccion)
        .filter(p => !tipoFiltro || p.servicioTipo === tipoFiltro), [presupuestosConNro, seccion, tipoFiltro]);

    const chipsTecnico = useMemo(() => {
        if (!conChips) return [];
        const cuenta = {};
        let sin = 0;
        enSeccion.forEach(p => { const n = personaDe(p); if (n) cuenta[n] = (cuenta[n] || 0) + 1; else sin++; });
        return [
            { id: '', label: 'Todos', count: enSeccion.length },
            ...Object.keys(cuenta).sort().map(n => ({ id: n, label: n.split(' ')[0], count: cuenta[n], color: colorTecnico(n) })),
            ...(sin ? [{ id: '__SIN__', label: seccion === 'REALIZADOS' ? 'Sin técnico' : 'Sin asignar', count: sin }] : []),
        ];
    }, [enSeccion, personaDe, conChips, seccion]);

    const presupuestosFiltradosTipo = useMemo(() => {
        const items = !conChips || filtroTecnico === '' ? enSeccion
            : filtroTecnico === '__SIN__' ? enSeccion.filter(p => !personaDe(p))
            : enSeccion.filter(p => personaDe(p) === filtroTecnico);
        // Criterio de orden (2-oct-2026): todo lo de esta pantalla está pendiente
        // (sin asignar, en curso, en espera o realizado sin cobrar) → lo más viejo primero,
        // para que nada quede olvidado al fondo de la lista.
        return [...items].sort((a, b) => parseFechaSort(a.fecha) - parseFechaSort(b.fecha) || (a.id || 0) - (b.id || 0));
    }, [enSeccion, filtroTecnico, personaDe, conChips]);

    const filtros = useFiltros(presupuestosFiltradosTipo, {
        // Un presupuesto pendiente de agosto sigue pendiente: por defecto se ve todo.
        porPagina: POR_PAGINA, campoFecha: 'fecha', periodoInicial: 'TODO',
        campoBusqueda: ['clienteNombre', 'sedeNombre', 'clienteTelefono', 'observaciones', 'nroDocPdf'],
        campoBusquedaFn: (s) => s.items?.map(it =>
            [it.equipoSerial, it.equipoModelo, it.equipoUbicacion].filter(Boolean).join(' ')
        ).join(' ') ?? '',
    });

    // "Todos"/"Ninguno" — mismo patrón que useRepuestoManager.js: selecciona todo lo
    // visible en la página/filtro actual (no la tabla completa sin filtrar).
    const todosSeleccionados = filtros.itemsPagina.length > 0 &&
        seleccionados.size === filtros.itemsPagina.length;
    const seleccionarTodos = () => {
        setSeleccionados(
            todosSeleccionados ? new Set() : new Set(filtros.itemsPagina.map(s => s.id))
        );
    };

    const conteoSeccion = useMemo(() => {
        const c = { PENDIENTES: 0, EN_CURSO: 0, EN_ESPERA: 0, REALIZADOS: 0 };
        presupuestosConNro
            .filter(p => !tipoFiltro || p.servicioTipo === tipoFiltro)
            .forEach(p => { c[p.seccion]++; });
        return c;
    }, [presupuestosConNro, tipoFiltro]);

    const cambiarSeccion = (id) => { setSeccion(id); setFiltroTecnico(''); setModoSeleccion(false); setSeleccionados(new Set()); };

    // Swipe en contenido para cambiar de sección
    const columnIds = SECCIONES.map(t => t.id);
    const swipeHandlers = useSwipeGesture(columnIds, seccion, cambiarSeccion);

    // Acciones de un toque — el cierre de la orden del técnico lo hace el backend
    const marcarRealizado = (p) => patchEstado(p.id, 'COMPLETADO', 'Pasó a Realizados — la orden del técnico quedó cerrada');
    const cambiarEspera = async (p, enEspera) => {
        const t = toast.loading('Guardando...');
        try {
            await api.patch(`/servicios/${p.id}/espera`, { enEspera });
            toast.success(enEspera ? 'En espera' + (p.tecnicoAsignado ? ' — se sacó de la agenda del técnico' : '') : 'Retomado: quedó en Pendientes para asignar', { id: t });
            cargar();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo cambiar', { id: t });
        }
    };

    // Columnas para SwipeColumns
    const columns = SECCIONES.map(t => ({ ...t, count: conteoSeccion[t.id] }));

    // Label del chip de período — mes elegido a mano tiene prioridad sobre el rápido
    const periodoLabel = periodoLabelDe(filtros);

    return (
        <div className="min-h-screen pb-28 font-sans bg-page transition-colors"
            {...swipeHandlers}>

            {/* ═══ HEADER ═══ */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink mb-2.5">
                        Presupuestos
                    </h2>
                    <div className="flex items-center gap-1.5">
                        {/* Búsqueda y Filtros — mismo componente que usan Servicio, Venta,
                            Clientes y Productos (Lucas, 7-sep-2026: unificar look y comportamiento) */}
                        <BusquedaBar valor={filtros.busqueda} onChange={filtros.setBusqueda}
                            placeholder="Cliente, teléfono, S/N, sede..." onExpandChange={setMostrarBusqueda} />
                        <ChipFiltro label={periodoLabel} activo={mostrarPeriodo} onClick={() => setMostrarPeriodo(v => !v)}
                            className={mostrarBusqueda ? 'hidden md:flex' : ''} />
                        <button onClick={() => setModalCotizar(true)}
                            className="h-9 px-3 rounded-lg font-bold text-label text-white uppercase transition-all active:scale-95 bg-brand-red shrink-0">
                            Cotizar
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* ═══ SWIPE COLUMNS — tipo ═══ */}
                <SwipeColumns
                    columns={columns}
                    activeId={seccion}
                    onChangeColumn={cambiarSeccion}
                />

                {/* Por técnico: acceso directo a lo que tiene asignado cada uno */}
                {esAdmin && chipsTecnico.length > 2 && (
                    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 items-center" role="group" aria-label="Filtrar por técnico">
                        <span className="text-label font-bold text-muted shrink-0 pr-1">
                            {seccion === 'REALIZADOS' ? 'Hecho por' : 'Lo tiene'}
                        </span>
                        {chipsTecnico.map(c => {
                            const activo = filtroTecnico === c.id;
                            return (
                                <button key={c.id || 'todos'} onClick={() => { setFiltroTecnico(c.id); filtros.irA?.(1); }}
                                    aria-pressed={activo}
                                    className={`h-10 px-3.5 rounded-full shrink-0 inline-flex items-center gap-2 text-label font-bold border transition-all active:scale-95 ${
                                        activo ? 'border-brand-red text-ink bg-[rgba(232,66,47,0.10)]' : 'border-black/10 dark:border-line text-secondary'
                                    }`}>
                                    {c.color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />}
                                    {c.label}
                                    <span className="text-muted">{c.count}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Subline — pendiente + ver ruta, discreto (reemplaza la barra de stats) */}
                <div className="flex items-center gap-2 px-1">
                    <span className="text-label font-semibold text-muted">{seccion === 'REALIZADOS' ? 'A cobrar' : 'Total'}</span>
                    <M valor={filtros.itemsFiltrados.reduce((a, p) => a + calcularTotal(p), 0)} className="text-body font-black text-ink" />
                    {/* Tipo: ahora un filtro chico; las columnas grandes son las secciones */}
                    <div className="flex rounded-lg border border-black/10 dark:border-line overflow-hidden ml-2" role="group" aria-label="Tipo">
                        {TIPO_TABS.map(t => (
                            <button key={t.id || 'todos'} onClick={() => setTipoFiltro(t.id)} aria-pressed={tipoFiltro === t.id}
                                className={`h-8 px-2.5 text-label font-bold ${tipoFiltro === t.id ? 'bg-chip text-ink' : 'text-muted'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setModoSeleccion(true)}
                        className="ml-auto text-label font-bold text-[#1A73E8] underline underline-offset-2 active:opacity-70">
                        Elegir para ruta
                    </button>
                </div>

                {/* ═══ PERÍODO — colapsado por defecto, se abre desde el chip del header ═══ */}
                {mostrarPeriodo && (
                    <FiltrosPanel hook={filtros} conBusqueda={false} conRango />
                )}

                {/* Selección masiva */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <span className="text-caption font-bold text-ink flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        <button onClick={seleccionarTodos}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95">
                            {todosSeleccionados ? 'Ninguno' : 'Todos'}
                        </button>
                        {seleccionados.size > 0 && (<>
                            <button onClick={() => abrirRuta(presupuestosFiltradosTipo.filter(p => seleccionados.has(p.id)))}
                                className="h-7 px-3 rounded-lg font-bold text-label text-white bg-[#1A73E8] active:scale-95">
                                Ver ruta
                            </button>
                            <button onClick={() => setConfirmMasivoArchivar(true)}
                                className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95">
                                Archivar
                            </button>
                        </>)}
                        <button onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
                            className="h-7 px-3 rounded-lg font-bold text-label text-muted active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ═══ LISTA ═══ */}
                {cargando ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-card" />)}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                        <LuCircleCheck size={32} className="mb-2 text-muted inline-block" />
                        <p className="text-body font-bold text-muted">{{
                            PENDIENTES: 'Nada pendiente de asignar',
                            EN_CURSO:   'Ningún trabajo en curso',
                            EN_ESPERA:  'Nada en espera',
                            REALIZADOS: 'Nada realizado sin cobrar',
                        }[seccion]}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtros.itemsPagina.map((s, idx) => {
                            const mesKey = mesKeyDeFecha(s.fecha);
                            const mesAnterior = idx > 0 ? mesKeyDeFecha(filtros.itemsPagina[idx - 1].fecha) : null;
                            const mostrarHeaderMes = mesKey && mesKey !== mesAnterior;
                            return (
                            <React.Fragment key={s.id}>
                            {mostrarHeaderMes && (
                                <p className="px-1 pt-1 pb-0.5 text-label font-black uppercase tracking-wide text-muted">
                                    {formatMesLargo(mesKey)}
                                </p>
                            )}
                            <div
                                onTouchStart={() => iniciarLongPress(s.id)} onTouchEnd={cancelarLongPress} onTouchMove={cancelarLongPress}
                                onMouseDown={() => iniciarLongPress(s.id)} onMouseUp={cancelarLongPress} onMouseLeave={cancelarLongPress}>
                            <PresupuestoCard s={s}
                                calcularTotal={calcularTotal}
                                onPDF={generarPDF}
                                onArchivar={setConfirmArchivarId}
                                onIniciar={(serv) => (serv.servicioTipo === 'TECNICA' && serv.estado !== 'EN_PROGRESO' && !serv.tecnicoAsignado) ? setPresupuestoIniciar(serv) : setPresupuestoEjecutar(serv)}
                                onEditar={esAdmin ? setPresupuestoEditar : null}
                                onRealizado={esAdmin ? marcarRealizado : null}
                                onEspera={esAdmin ? cambiarEspera : null}
                                onCobrar={esAdmin ? setPresupuestoEjecutar : null}
                                modoSeleccion={modoSeleccion}
                                seleccionado={seleccionados.has(s.id)}
                                onToggleSelect={toggleSeleccion}
                            />
                            </div>
                            </React.Fragment>
                            );
                        })}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {modalCotizar && (
                <ModalCotizacionVolumen onCerrar={() => setModalCotizar(false)} />
            )}

            {presupuestoIniciar && (
                <IniciarTrabajoSheet
                    servicio={presupuestoIniciar}
                    onYoAhora={() => { setPresupuestoEjecutar(presupuestoIniciar); setPresupuestoIniciar(null); }}
                    onAsignar={() => { setPresupuestoDespachar(presupuestoIniciar); setPresupuestoIniciar(null); }}
                    onCerrar={() => setPresupuestoIniciar(null)}
                />
            )}

            {presupuestoDespachar && (
                <ModalDespacharPresupuesto
                    presupuesto={presupuestoDespachar}
                    calcularTotal={calcularTotal}
                    onCerrar={() => { setPresupuestoDespachar(null); cargar(); }}
                    onDespachado={() => { cargar(); }}
                />
            )}

            {presupuestoEjecutar && (
                <EjecutarAdminSheet
                    servicio={presupuestoEjecutar}
                    calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        if (await confirmarServicio(presupuestoEjecutar.id, estadoDestino, extras) !== false) setPresupuestoEjecutar(null);
                    }}
                    onEditarCompleto={() => {
                        const s = presupuestoEjecutar;
                        setPresupuestoEjecutar(null);
                        setPresupuestoEditar(s);
                    }}
                    onCerrar={() => setPresupuestoEjecutar(null)}
                />
            )}

            {/* Modal de edición */}
            {presupuestoEditar && (
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/50 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6">
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[calc(var(--vh,1vh)*95)] overflow-y-auto shadow-2xl bg-card">
                        <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 z-20 bg-card">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-panel border-b border-black/[0.08]">
                            <div>
                                <h3 className="text-title font-black text-ink flex items-center gap-1.5"><LuPencil size={16} /> Editar Presupuesto</h3>
                                <p className="text-caption text-muted mt-0.5">#{presupuestoEditar.id} · {presupuestoEditar.clienteNombre}</p>
                            </div>
                            <button onClick={() => setPresupuestoEditar(null)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted bg-chip active:scale-90">✕</button>
                        </div>
                        {presupuestoEditar.servicioTipo === 'VENTA' ? (
                            <VentaForm
                                ventaParaEditar={presupuestoEditar}
                                onSaved={() => { setPresupuestoEditar(null); cargar(); }}
                            />
                        ) : (
                            <ServicioForm
                                servicioParaEditar={presupuestoEditar}
                                onSaved={() => { setPresupuestoEditar(null); cargar(); }}
                            />
                        )}
                    </div>
                </div>
            )}

            {confirmArchivarId && (
                <ConfirmDialog
                    titulo="Archivar presupuesto"
                    textoConfirmar="Sí, archivar"
                    onCancelar={() => setConfirmArchivarId(null)}
                    onConfirmar={() => { archivar(confirmArchivarId); setConfirmArchivarId(null); }}
                />
            )}

            {confirmMasivoArchivar && (
                <ConfirmDialog
                    titulo={`Archivar ${seleccionados.size} presupuesto${seleccionados.size !== 1 ? 's' : ''}`}
                    textoConfirmar="Sí, archivar"
                    onCancelar={() => setConfirmMasivoArchivar(false)}
                    onConfirmar={ejecutarMasivaArchivar}
                />
            )}
        </div>
    );
}
