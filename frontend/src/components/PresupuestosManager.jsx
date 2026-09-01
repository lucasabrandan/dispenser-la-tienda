import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LuClipboardList, LuWrench, LuShoppingCart, LuCircleCheck, LuSearch, LuCalendar, LuPencil } from 'react-icons/lu';
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
import { mesKeyDeFecha, formatMesLargo } from '../utils/dateUtils';
import ConfirmDialog from './ui/ConfirmDialog';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildGoogleMapsRouteUrl(direcciones) {
    const validas = direcciones.filter(d => d && d !== 'Sin dirección' && d !== 'Mostrador');
    if (validas.length === 0) return null;
    const encoded = validas.map(d => encodeURIComponent(d));
    return `https://www.google.com/maps/dir/${encoded.join('/')}`;
}

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

const PERIODO_LABELS = { MES: 'Este mes', MES_ANT: 'Mes ant.', ANO: 'Este año', TODO: 'Todo' };

// ─── Componente principal ────────────────────────────────────────────────────
export default function PresupuestosManager() {
    const { esAdmin, usuario } = useAuth();
    const [presupuestos, setPresupuestos]   = useState([]);
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
            // Solo PRESUPUESTO: apenas se despacha o se ejecuta, el registro cambia de
            // estado (EN_PROGRESO / COBRADO / etc.) y sale de esta lista solo — ya no hace
            // falta cruzar contra todos los servicios para marcar "Ejecutado" a mano.
            const resPresu = await api.get('/servicios', { params: { estado: 'PRESUPUESTO', page: 0, size: 200, sort: 'fechaServicio,desc', ...filtroUsuario } });
            const data = resPresu.data.content || resPresu.data || [];
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
        } catch { toast.error('Error', { id: t }); }
    };

    const confirmarServicio = async (id, estadoDestino, { modalidadCobro, montoFinal, observaciones } = {}) => {
        const labels = { COBRADO: 'Cobrado', COMPLETADO: 'Completado', PENDIENTE_FACTURACION: 'Pendiente facturación' };
        const extras = {};
        if (modalidadCobro) extras.modalidadCobro = modalidadCobro;
        if (montoFinal != null) extras.montoFinal = montoFinal;
        if (observaciones != null) extras.observaciones = observaciones;
        await patchEstado(id, estadoDestino, labels[estadoDestino] || 'Actualizado', extras);
    };

    // La confirmación la muestra el ConfirmDialog compartido (ver más abajo).
    const archivar = (id) => { patchEstado(id, 'ARCHIVADO', 'Archivado'); };

    const calcularTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

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
    })), [presupuestos]);

    const presupuestosFiltradosTipo = useMemo(() => {
        const items = tipoFiltro ? presupuestosConNro.filter(p => p.servicioTipo === tipoFiltro) : presupuestosConNro;
        return [...items].sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha) || (b.id || 0) - (a.id || 0));
    }, [presupuestosConNro, tipoFiltro]);

    const filtros = useFiltros(presupuestosFiltradosTipo, {
        porPagina: 10, campoFecha: 'fecha', periodoInicial: 'MES',
        campoBusqueda: ['clienteNombre', 'sedeNombre', 'clienteTelefono', 'observaciones', 'nroDocPdf'],
        campoBusquedaFn: (s) => s.items?.map(it =>
            [it.equipoSerial, it.equipoModelo, it.equipoUbicacion].filter(Boolean).join(' ')
        ).join(' ') ?? '',
    });

    const stats = useMemo(() => ({
        total:     presupuestos.reduce((a, p) => a + calcularTotal(p), 0),
        count:     presupuestos.length,
        servicios: presupuestos.filter(p => p.servicioTipo === 'TECNICA').length,
        ventas:    presupuestos.filter(p => p.servicioTipo === 'VENTA').length,
    }), [presupuestos]); // eslint-disable-line

    // Swipe en contenido para cambiar tab
    const columnIds = TIPO_TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(columnIds, tipoFiltro, (id) => { setTipoFiltro(id); setModoSeleccion(false); setSeleccionados(new Set()); });

    // Columnas para SwipeColumns
    const columns = TIPO_TABS.map(t => ({
        id: t.id,
        label: t.label,
        fullLabel: t.fullLabel,
        color: t.color,
        Icon: t.Icon,
        count: t.id === '' ? stats.count : t.id === 'TECNICA' ? stats.servicios : stats.ventas,
    }));

    // Label del chip de período — mes elegido a mano tiene prioridad sobre el rápido
    const periodoLabel = filtros.mesSelector
        ? formatMesLargo(filtros.mesSelector)
        : (PERIODO_LABELS[filtros.periodoRapido] || 'Período');

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
                        {/* Búsqueda — mobile: toggle */}
                        <button onClick={() => setMostrarBusqueda(v => !v)}
                            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${mostrarBusqueda || filtros.busqueda ? 'bg-brand-red text-white' : 'bg-card text-muted'}`}>
                            <LuSearch size={15} />
                        </button>
                        <div className={`${mostrarBusqueda ? 'flex' : 'hidden'} md:flex relative flex-1`}>
                            <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input value={filtros.busqueda} onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, teléfono, S/N, sede..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-card text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                                autoFocus={mostrarBusqueda} />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-label font-bold">✕</button>
                            )}
                        </div>
                        {/* Período — chip que despliega FiltrosPanel; arranca colapsado en "Este mes" */}
                        <button onClick={() => setMostrarPeriodo(v => !v)}
                            className={`${mostrarBusqueda ? 'hidden md:flex' : 'flex'} h-9 px-2.5 rounded-lg items-center gap-1 shrink-0 active:scale-95 shadow-sm border text-label font-bold whitespace-nowrap ${
                                mostrarPeriodo ? 'bg-brand-red text-white border-transparent' : 'bg-card text-secondary border-black/[0.05] dark:border-white/[0.05]'
                            }`}>
                            <LuCalendar size={12} /> {periodoLabel} {mostrarPeriodo ? '▴' : '▾'}
                        </button>
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
                    activeId={tipoFiltro}
                    onChangeColumn={(id) => { setTipoFiltro(id); setModoSeleccion(false); setSeleccionados(new Set()); }}
                />

                {/* Subline — pendiente + ver ruta, discreto (reemplaza la barra de stats) */}
                <div className="flex items-center gap-2 px-1">
                    <span className="text-label font-semibold text-muted">Pendiente</span>
                    <M valor={stats.total} className="text-body font-black text-brand-amber" />
                    <button onClick={() => abrirRuta(presupuestosFiltradosTipo)}
                        className="ml-auto text-label font-bold text-[#1A73E8] underline underline-offset-2 active:opacity-70">
                        Ver ruta
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
                        <p className="text-body font-bold text-muted">Sin presupuestos pendientes</p>
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
                                onIniciar={(serv) => serv.servicioTipo === 'TECNICA' ? setPresupuestoIniciar(serv) : setPresupuestoEjecutar(serv)}
                                onEditar={esAdmin ? setPresupuestoEditar : null}
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
                        await confirmarServicio(presupuestoEjecutar.id, estadoDestino, extras);
                        setPresupuestoEjecutar(null);
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
                <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/50">
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-card">
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
