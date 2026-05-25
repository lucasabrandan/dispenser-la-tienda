import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useFiltros } from '../hooks/useFiltros';
import { useMontos } from '../context/MontosContext';
import { useAuth } from '../context/AuthContext';
import Paginacion from './ui/Paginacion';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';
import ModalCotizacionVolumen from './presupuesto/ModalCotizacionVolumen';
import ModalDespacharPresupuesto from './presupuesto/ModalDespacharPresupuesto';
import EjecutarAdminSheet from './servicio/EjecutarAdminSheet';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

function IconBtn({ onClick, title, children, cls = '' }) {
    return (
        <button onClick={onClick} title={title}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 shrink-0 ${cls}`}>
            {children}
        </button>
    );
}

// ─── Card de presupuesto ─────────────────────────────────────────────────────
function PresupuestoCard({ s, calcularTotal, onPDF, onRechazar, onArchivar, onEjecutar, onDespachar, ejecutado, modoSeleccion, seleccionado, onToggleSelect }) {
    const [expandido, setExpandido] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const total    = calcularTotal(s);
    const esTecnico = s.servicioTipo === 'TECNICA';
    const esVenta   = s.servicioTipo === 'VENTA';
    const items     = s.items || [];
    const seriales  = items.map(it => it.equipoSerial).filter(Boolean);
    const primerItem = items[0];
    const ubicInfo  = primerItem
        ? [primerItem.equipoUbicacion, primerItem.equipoPiso && `P${primerItem.equipoPiso}`, primerItem.equipoSector].filter(Boolean).join(' · ')
        : '';

    return (
        <div className={`rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${ejecutado ? '#16A34A' : '#D48800'}` }}>
            <div className="p-4">
                {/* Fila 1: checkbox + tipo + ejecutado + id + monto + fecha */}
                <div className="flex items-start gap-2 mb-2.5">
                    {modoSeleccion && (
                        <button onClick={() => onToggleSelect(s.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#E8E5E0] dark:border-[#3E3E3E]'}`}>
                            {seleccionado && <span className="text-white text-[9px] font-black">✓</span>}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${esTecnico ? 'bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F]' : 'bg-[#D48800]/10 text-[#D48800] dark:text-[#F0A500]'}`}>
                            {esTecnico ? '🔧 Servicio' : '🛒 Venta'}
                        </span>
                        {ejecutado && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 bg-[var(--success-bg)] text-[var(--success-tx)]">
                                ✓ Ejecutado
                            </span>
                        )}
                        <span className="text-[11px] font-bold text-[#A8A29E] shrink-0">#{s.id}</span>
                    </div>
                    <div className="text-right shrink-0">
                        <M valor={total} className="text-[17px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{s.fecha}</p>
                    </div>
                </div>

                {/* Cliente */}
                <p className="font-black text-[16px] leading-tight text-[#1C1917] dark:text-[#F0EEE9] mb-1">{s.clienteNombre}</p>

                {/* Sede + técnico */}
                <div className="flex items-center gap-3 text-[11px] text-[#A8A29E] flex-wrap">
                    {s.sedeNombre    && <span>📍 {s.sedeNombre}</span>}
                    {s.usuarioNombre && <span>👤 {s.usuarioNombre}</span>}
                </div>

                {/* Chips de serie + ubicación */}
                {(seriales.length > 0 || ubicInfo) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {seriales.slice(0, 2).map((sr, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">{sr}</span>
                        ))}
                        {seriales.length > 2 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#A8A29E]">+{seriales.length - 2}</span>
                        )}
                        {ubicInfo && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#A8A29E]">{ubicInfo}</span>
                        )}
                    </div>
                )}

                {/* Toggle detalle */}
                {items.length > 0 && (
                    <button onClick={() => setExpandido(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.98] bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">
                        <span>Detalle · {items.length} ítem{items.length > 1 ? 's' : ''}</span>
                        <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {/* Detalle expandido */}
                {expandido && items.map((it, i) => (
                    <div key={i} className="mt-2 p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C]"
                        style={{ border: '0.5px solid rgba(0,0,0,0.05)' }}>
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="min-w-0">
                                <span className="text-[12px] font-black text-[#D13A28] dark:text-[#E8422F]">
                                    {it.equipoSerial !== 'MOSTRADOR' ? it.equipoSerial : 'Mostrador'}
                                </span>
                                {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                                    <p className="text-[10px] text-[#A8A29E] mt-0.5 truncate">
                                        {[it.equipoUbicacion, it.equipoPiso && `Piso ${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <M valor={Number(it.costo || 0)} className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0 ml-2" />
                        </div>
                        <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{it.trabajoRealizado}</p>
                        {it.repuestosUsados?.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-wrap gap-1">
                                {it.repuestosUsados.map((r, ri) => (
                                    <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                        {r.cantidad}× {r.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#EFEDEA] dark:bg-[#1C1C1C]"
                style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                {/* PDF */}
                <IconBtn onClick={() => onPDF(s)} title="PDF" cls="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">📄</IconBtn>

                {/* Menú overflow */}
                <div className="relative">
                    <IconBtn onClick={() => setMenuAbierto(v => !v)} title="Más opciones" cls="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">⋮</IconBtn>
                    {menuAbierto && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setMenuAbierto(false)} />
                            <div className="absolute left-0 bottom-full mb-1 z-[101] w-48 rounded-xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#2E2E2E] overflow-hidden">
                                {esVenta && (
                                    <button onClick={() => { onPDF(s, { sinPrecios: true }); setMenuAbierto(false); }}
                                        className="w-full px-3 py-2.5 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#EFEDEA] dark:hover:bg-[#3E3E3E] transition-colors">
                                        📋 PDF sin precios
                                    </button>
                                )}
                                {esTecnico && (
                                    <button onClick={() => { onDespachar(s); setMenuAbierto(false); }}
                                        className="w-full px-3 py-2.5 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#EFEDEA] dark:hover:bg-[#3E3E3E] transition-colors">
                                        📬 Despachar
                                    </button>
                                )}
                                <button onClick={() => { onArchivar(s.id); setMenuAbierto(false); }}
                                    className="w-full px-3 py-2.5 text-left text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] hover:bg-[#EFEDEA] dark:hover:bg-[#3E3E3E] transition-colors">
                                    🗄️ Archivar
                                </button>
                                <button onClick={() => { onRechazar(s.id); setMenuAbierto(false); }}
                                    className="w-full px-3 py-2.5 text-left text-[12px] font-bold text-[#D13A28] dark:text-[#E8422F] hover:bg-[#EFEDEA] dark:hover:bg-[#3E3E3E] transition-colors">
                                    ✗ Rechazar
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex-1" />

                {/* Acción principal */}
                <button onClick={() => onEjecutar(s)}
                    className="h-9 px-4 rounded-xl font-bold text-[11px] text-white shrink-0 active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                    {ejecutado ? '✓ Ejecutado' : '⚡ Ejecutar y cobrar'}
                </button>
            </div>
        </div>
    );
}

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
    { id: '',        label: 'Todos'     },
    { id: 'TECNICA', label: 'Servicios' },
    { id: 'VENTA',   label: 'Ventas'   },
];

// ─── Componente principal ────────────────────────────────────────────────────
export default function PresupuestosManager() {
    const { esAdmin, usuario } = useAuth();
    const [presupuestos, setPresupuestos]   = useState([]);
    const [cargando, setCargando]           = useState(true);
    const [ejecutadosIds, setEjecutadosIds] = useState(new Set());
    const [modoSeleccion, setModoSeleccion]     = useState(false);
    const [seleccionados, setSeleccionados]     = useState(new Set());
    const [tipoFiltro, setTipoFiltro]             = useState('');
    const [modalCotizar, setModalCotizar]         = useState(false);
    const [presupuestoDespachar, setPresupuestoDespachar] = useState(null);
    const [presupuestoEjecutar, setPresupuestoEjecutar] = useState(null);

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const cargar = async () => {
        setCargando(true);
        // técnico solo ve sus propios presupuestos; admin ve todos
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
            const payload = { estado, ...extras };
            await api.patch(`/servicios/${id}/estado`, payload);
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

    const rechazar  = (id) => { if (!window.confirm('¿Rechazar este presupuesto?')) return; patchEstado(id, 'RECHAZADO', 'Rechazado'); };
    const archivar  = (id) => { if (!window.confirm('¿Archivar este presupuesto?')) return; patchEstado(id, 'ARCHIVADO', 'Archivado'); };

    const calcularTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

    // Presupuesto: genera PDF directo sin pedir firmas (las firmas son para trabajo terminado)
    const generarPDF = useCallback(async (s, { sinPrecios = false } = {}) => {
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
    }, []);

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
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

    // Filtro por tipo aplicado antes de pasar a useFiltros
    const presupuestosFiltradosTipo = useMemo(() =>
        tipoFiltro ? presupuestosConNro.filter(p => p.servicioTipo === tipoFiltro) : presupuestosConNro
    , [presupuestosConNro, tipoFiltro]);

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

    return (
        <div className="min-h-screen pb-28 font-sans bg-[#F5F3F1] dark:bg-[#141414] transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">
                        Presupuestos
                    </h2>
                    <div className="flex gap-1.5">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                            <input value={filtros.busqueda} onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, teléfono, S/N, sede..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
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

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-2">

                {/* Stats compacto */}
                <div className="flex items-center gap-3 px-3 h-8 rounded-lg bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <span className="text-[11px] font-bold text-[#A8A29E]">Pendiente</span>
                    <M valor={stats.total} className="text-[11px] font-black text-[#D48800] dark:text-[#F0A500]" />
                    <span className="text-[11px] text-[#A8A29E]">·</span>
                    <span className="text-[11px] font-bold text-[#A8A29E]">{stats.servicios} serv.</span>
                    <span className="text-[11px] text-[#A8A29E]">·</span>
                    <span className="text-[11px] font-bold text-[#A8A29E]">{stats.ventas} ventas</span>
                </div>

                {/* Tabs tipo */}
                <div className="flex gap-1.5">
                    {TIPO_TABS.map(t => (
                        <button key={t.id} onClick={() => setTipoFiltro(t.id)}
                            className={`flex-1 h-8 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 ${tipoFiltro === t.id ? 'text-white bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Barra selección masiva (activada por long-press) */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        {seleccionados.size > 0 && (
                            <button onClick={ejecutarMasivaArchivar}
                                className="h-7 px-3 rounded-lg font-bold text-[10px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                Archivar
                            </button>
                        )}
                        <button onClick={() => { setModoSeleccion(false); setSeleccionados(new Set()); }}
                            className="h-7 px-3 rounded-lg font-bold text-[10px] text-[#A8A29E] active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                {cargando ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl animate-pulse bg-[#FFFFFF] dark:bg-[#242424]" />)}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[36px] mb-2">✅</p>
                        <p className="font-bold text-[#A8A29E]">Sin presupuestos pendientes</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtros.itemsPagina.map(s => (
                            <PresupuestoCard key={s.id} s={s}
                                calcularTotal={calcularTotal}
                                onPDF={generarPDF}
                                onRechazar={rechazar}
                                onArchivar={archivar}
                                onEjecutar={(serv) => setPresupuestoEjecutar(serv)}
                                onDespachar={setPresupuestoDespachar}
                                ejecutado={ejecutadosIds.has(s.id)}
                                modoSeleccion={modoSeleccion}
                                seleccionado={seleccionados.has(s.id)}
                                onToggleSelect={toggleSeleccion}
                            />
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
                    onCerrar={() => setPresupuestoEjecutar(null)}
                />
            )}
        </div>
    );
}
