import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useFiltros } from '../hooks/useFiltros';
import { useMontos } from '../context/MontosContext';
import { useAuth } from '../context/AuthContext';
import Paginacion from './ui/Paginacion';
import SwipeColumns from './ui/SwipeColumns';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';
import ModalCotizacionVolumen from './presupuesto/ModalCotizacionVolumen';
import ModalDespacharPresupuesto from './presupuesto/ModalDespacharPresupuesto';
import EjecutarAdminSheet from './servicio/EjecutarAdminSheet';
import ServicioForm from './servicio/ServicioForm';
import PresupuestoCard from './presupuesto/PresupuestoCard';
import { M } from './servicio/ServicioUI';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

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
    { id: '',        label: 'Todos',     fullLabel: 'Todos',     color: '#1C1917', icon: '📋' },
    { id: 'TECNICA', label: 'Servicios', fullLabel: 'Servicios', color: '#D13A28', icon: '🔧' },
    { id: 'VENTA',   label: 'Ventas',    fullLabel: 'Ventas',    color: '#D48800', icon: '🛒' },
];

// ─── Componente principal ────────────────────────────────────────────────────
export default function PresupuestosManager() {
    const { esAdmin, usuario } = useAuth();
    const [presupuestos, setPresupuestos]   = useState([]);
    const [cargando, setCargando]           = useState(true);
    const [ejecutadosIds, setEjecutadosIds] = useState(new Set());
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [seleccionados, setSeleccionados]     = useState(new Set());
    const [mostrarBusqueda, setMostrarBusqueda] = useState(false);

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
    const [presupuestoEditar, setPresupuestoEditar]     = useState(null);

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const cargar = async () => {
        setCargando(true);
        const filtroUsuario = (!esAdmin && usuario?.id) ? { usuarioId: usuario.id } : {};
        try {
            const [resPresu, resEjec] = await Promise.all([
                api.get('/servicios', { params: { estado: 'PRESUPUESTO', page: 0, size: 200, sort: 'fechaServicio,desc', ...filtroUsuario } }),
                api.get('/servicios', { params: { page: 0, size: 500, ...filtroUsuario } }),
            ]);
            const data = resPresu.data.content || resPresu.data || [];
            setPresupuestos(Array.isArray(data)
                ? data.sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha))
                : []);
            const todos = resEjec.data.content || resEjec.data || [];
            setEjecutadosIds(new Set(todos.filter(s => s.presupuestoOrigenId).map(s => s.presupuestoOrigenId)));
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

    const archivar  = (id) => { if (!window.confirm('¿Archivar este presupuesto?')) return; patchEstado(id, 'ARCHIVADO', 'Archivado'); };

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
        if (!window.confirm(`¿Archivar ${seleccionados.size} presupuesto${seleccionados.size !== 1 ? 's' : ''}?`)) return;
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
        return [...items].sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha));
    }, [presupuestosConNro, tipoFiltro]);

    const filtros = useFiltros(presupuestosFiltradosTipo, {
        porPagina: 10, campoFecha: 'fecha',
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
        icon: t.icon,
        count: t.id === '' ? stats.count : t.id === 'TECNICA' ? stats.servicios : stats.ventas,
    }));

    return (
        <div className="min-h-screen pb-28 font-sans bg-[#F5F3F1] dark:bg-[#141414] transition-colors"
            {...swipeHandlers}>

            {/* ═══ HEADER ═══ */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9] mb-2.5">
                        Presupuestos
                    </h2>
                    <div className="flex items-center gap-1.5">
                        {/* Búsqueda — mobile: toggle */}
                        <button onClick={() => setMostrarBusqueda(v => !v)}
                            className={`md:hidden w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] ${mostrarBusqueda || filtros.busqueda ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                            🔍
                        </button>
                        <div className={`${mostrarBusqueda ? 'flex' : 'hidden'} md:flex relative flex-1`}>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input value={filtros.busqueda} onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, teléfono, S/N, sede..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]"
                                autoFocus={mostrarBusqueda} />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                            )}
                        </div>
                        <button onClick={() => setModalCotizar(true)}
                            className="h-9 px-3 rounded-lg font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D48800] dark:bg-[#F0A500] shrink-0">
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

                {/* Stats resumen — monto total pendiente + ver ruta */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <span className="text-[11px] font-bold text-[#A8A29E] flex-1 text-center">Pendiente total</span>
                    <M valor={stats.total} className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500]" />
                    <button onClick={() => abrirRuta(presupuestosFiltradosTipo)}
                        title="Ver ruta en Google Maps"
                        className="ml-1 h-7 px-2.5 rounded-lg font-bold text-[10px] uppercase text-white bg-[#1A73E8] active:scale-95 transition-all shrink-0">
                        Ver ruta
                    </button>
                </div>

                {/* Selección masiva */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        {seleccionados.size > 0 && (<>
                            <button onClick={() => abrirRuta(presupuestosFiltradosTipo.filter(p => seleccionados.has(p.id)))}
                                className="h-7 px-3 rounded-lg font-bold text-[10px] text-white bg-[#1A73E8] active:scale-95">
                                Ver ruta
                            </button>
                            <button onClick={ejecutarMasivaArchivar}
                                className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                Archivar
                            </button>
                        </>)}
                        <button onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] text-[#A8A29E] active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* ═══ LISTA ═══ */}
                {cargando ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-[#FFFFFF] dark:bg-[#242424]" />)}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-3xl mb-2">✅</p>
                        <p className="text-[13px] font-bold text-[#A8A29E]">Sin presupuestos pendientes</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtros.itemsPagina.map(s => (
                            <div key={s.id}
                                onTouchStart={() => iniciarLongPress(s.id)} onTouchEnd={cancelarLongPress} onTouchMove={cancelarLongPress}
                                onMouseDown={() => iniciarLongPress(s.id)} onMouseUp={cancelarLongPress} onMouseLeave={cancelarLongPress}>
                            <PresupuestoCard s={s}
                                calcularTotal={calcularTotal}
                                onPDF={generarPDF}
                                onArchivar={archivar}
                                onEjecutar={(serv) => setPresupuestoEjecutar(serv)}
                                onDespachar={setPresupuestoDespachar}
                                onEditar={esAdmin ? setPresupuestoEditar : null}
                                ejecutado={ejecutadosIds.has(s.id)}
                                modoSeleccion={modoSeleccion}
                                seleccionado={seleccionados.has(s.id)}
                                onToggleSelect={toggleSeleccion}
                            />
                            </div>
                        ))}
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
            </div>

            {modalCotizar && (
                <ModalCotizacionVolumen onCerrar={() => setModalCotizar(false)} />
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
                    <div className="w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl bg-[#FFFFFF] dark:bg-[#141414]">
                        <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 z-20 bg-[#FFFFFF] dark:bg-[#141414]">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <div className="sticky top-0 px-5 py-4 flex justify-between items-center z-10 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-b border-black/[0.08]">
                            <div>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">✏️ Editar Presupuesto</h3>
                                <p className="text-[11px] text-[#A8A29E] mt-0.5">#{presupuestoEditar.id} · {presupuestoEditar.clienteNombre}</p>
                            </div>
                            <button onClick={() => setPresupuestoEditar(null)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A8A29E] bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90">✕</button>
                        </div>
                        <ServicioForm
                            servicioParaEditar={presupuestoEditar}
                            onSaved={() => { setPresupuestoEditar(null); cargar(); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
