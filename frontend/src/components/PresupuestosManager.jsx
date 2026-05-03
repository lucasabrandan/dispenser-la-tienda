import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useFiltros } from '../hooks/useFiltros';
import { useMontos } from '../context/MontosContext';
import Paginacion from './ui/Paginacion';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';
import ModalFirmasPDF from './ui/ModalFirmasPDF';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
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
function PresupuestoCard({ s, calcularTotal, onVer, onPDF, onCobrar, onRechazar, onArchivar, onEjecutar, ejecutado, modoSeleccion, seleccionado, onToggleSelect }) {
    const [expandido, setExpandido] = useState(false);
    const total    = calcularTotal(s);
    const esTecnico = s.servicioTipo === 'TECNICA';
    const items     = s.items || [];
    const seriales  = items.map(it => it.equipoSerial).filter(Boolean);
    const primerItem = items[0];
    const ubicInfo  = primerItem
        ? [primerItem.equipoUbicacion, primerItem.equipoPiso && `P${primerItem.equipoPiso}`, primerItem.equipoSector].filter(Boolean).join(' · ')
        : '';

    return (
        <div className={`rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424] transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''} ${ejecutado ? 'border-l-[3px] border-l-[#D48800]' : 'border-l-[3px] border-l-[#D48800]'}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${ejecutado ? '#16A34A' : '#D48800'}` }}>
            <div className="p-4">
                {/* Fila 1: checkbox + tipo + ejecutado + id + monto + fecha */}
                <div className="flex items-start gap-2 mb-2.5">
                    {modoSeleccion && (
                        <button onClick={() => onToggleSelect(s.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#C0BCB6] dark:border-[#3E3E3E]'}`}>
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
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">{sr}</span>
                        ))}
                        {seriales.length > 2 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#A8A29E]">+{seriales.length - 2}</span>
                        )}
                        {ubicInfo && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#A8A29E]">{ubicInfo}</span>
                        )}
                    </div>
                )}

                {/* Toggle detalle */}
                {items.length > 0 && (
                    <button onClick={() => setExpandido(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.98] bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">
                        <span>Detalle · {items.length} ítem{items.length > 1 ? 's' : ''}</span>
                        <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {/* Detalle expandido */}
                {expandido && items.map((it, i) => (
                    <div key={i} className="mt-2 p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C]"
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
                                    <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                        {r.cantidad}× {r.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                <IconBtn onClick={() => onVer(s)} title="Ver detalle" cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">👁️</IconBtn>
                <IconBtn onClick={() => onPDF(s)} title="Generar PDF" cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">📄</IconBtn>

                <div className="flex-1" />

                <IconBtn onClick={() => onArchivar(s.id)} title="Archivar" cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">🗄️</IconBtn>
                <IconBtn onClick={() => onRechazar(s.id)} title="Rechazar" cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">✗</IconBtn>
                {!ejecutado && (
                    <button onClick={() => onEjecutar(s)}
                        className="h-9 px-3 rounded-xl font-bold text-[11px] text-white shrink-0 active:scale-95 transition-all bg-[#D48800] dark:bg-[#F0A500]">
                        🔧 Ejecutar
                    </button>
                )}
                <button onClick={() => onCobrar(s.id)}
                    className="h-9 px-3 rounded-xl font-bold text-[11px] text-white shrink-0 active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                    ✓ Cobrar
                </button>
            </div>
        </div>
    );
}

// ─── Modal detalle ───────────────────────────────────────────────────────────
function ModalDetalle({ s, calcularTotal, onClose }) {
    return (
        <div className="fixed inset-0 z-[2000] flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
            <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 max-h-[80vh] flex flex-col bg-[#EDEAE6] dark:bg-[#242424]"
                onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />
                <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">{s.clienteNombre}</h3>
                <p className="text-[11px] text-[#A8A29E] mb-4">📍 {s.sedeNombre} · {s.fecha}</p>
                <div className="overflow-y-auto flex-1 mb-4 space-y-3">
                    {s.items?.map((it, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                                <M valor={Number(it.costo || 0)} className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]" />
                            </div>
                            <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] mb-2">{it.trabajoRealizado}</p>
                            {it.repuestosUsados?.length > 0 && (
                                <p className="text-[10px] text-[#A8A29E] pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                    <span className="font-bold">Repuestos: </span>
                                    {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={onClose}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">
                    Cerrar
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
export default function PresupuestosManager({ onEjecutar }) {
    const [presupuestos, setPresupuestos]   = useState([]);
    const [cargando, setCargando]           = useState(true);
    const [modalDetalle, setModalDetalle]   = useState(null);
    const [ejecutadosIds, setEjecutadosIds] = useState(new Set());
    const [modalFirmas, setModalFirmas]     = useState(false);
    const [pendingPdf, setPendingPdf]       = useState(null);
    const [modoSeleccion, setModoSeleccion] = useState(false);
    const [seleccionados, setSeleccionados] = useState(new Set());
    const [tipoFiltro, setTipoFiltro]       = useState('');

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const cargar = async () => {
        setCargando(true);
        try {
            const [resPresu, resEjec] = await Promise.all([
                api.get('/servicios', { params: { estado: 'PRESUPUESTO', page: 0, size: 200, sort: 'fechaServicio,desc' } }),
                api.get('/servicios', { params: { page: 0, size: 500 } }),
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

    const patchEstado = async (id, estado, msg) => {
        const t = toast.loading('Guardando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado });
            toast.success(msg, { id: t });
            cargar();
        } catch { toast.error('Error', { id: t }); }
    };

    const confirmar = (id) => patchEstado(id, 'REALIZADO', '¡Cobrado!');
    const rechazar  = (id) => { if (!window.confirm('¿Rechazar este presupuesto?')) return; patchEstado(id, 'RECHAZADO', 'Rechazado'); };
    const archivar  = (id) => { if (!window.confirm('¿Archivar este presupuesto?')) return; patchEstado(id, 'ARCHIVADO', 'Archivado'); };

    const calcularTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

    const generarPDF = useCallback((s) => { setPendingPdf(s); setModalFirmas(true); }, []);

    const confirmarFirmasYGenerarPDF = async ({ firmaTecnico, firmaCliente }) => {
        setModalFirmas(false);
        const s = pendingPdf;
        setPendingPdf(null);
        if (!s) return;
        await generarRemitoPDFPremium({
            esPresupuesto: true,
            servicioId: s.id,
            nroDocumentoExistente: s.nroDocumento || localStorage.getItem(`pdf_nro_${s.id}`) || null,
            cliente: { nombre: s.clienteNombre, telefono: s.clienteTelefono, email: s.clienteEmail, cuilDni: s.clienteDni, condicionFiscal: s.clienteCondicionIva },
            sede: { nombreSede: s.sedeNombre, direccion: s.sedeDireccion },
            tecnico: localStorage.getItem('tecnico_nombre') || 'Técnico',
            ticketItems: s.items?.map(it => ({
                ...it,
                totalCalculado:  parseFloat(it.costo)      || 0,
                costoExtra:      parseFloat(it.costoExtra) || 0,
                modeloEquipo:    it.modeloEquipo    || it.equipoModelo    || null,
                ubicacionEquipo: it.ubicacionEquipo || it.equipoUbicacion || null,
                trabajo:         it.trabajo         || it.trabajoRealizado || '',
            })) || [],
            fechaServicio: s.fecha,
            leyenda: s.observaciones || '',
            firmaTecnico,
            firmaCliente,
        });
    };

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
        <div className="min-h-screen pb-28 font-sans bg-[#C8C4BE] dark:bg-[#141414] transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 px-4 pt-4 pb-3 bg-[#C8C4BE] dark:bg-[#141414]"
                style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[22px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                        Presupuestos
                    </h2>
                    <button
                        onClick={() => setModoSeleccion(v => { if (v) setSeleccionados(new Set()); return !v; })}
                        title="Selección múltiple"
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 border border-black/[0.08] dark:border-white/[0.08] ${modoSeleccion ? 'bg-[#D13A28] text-white' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]'}`}
                    >☑</button>
                </div>

                {/* Buscador */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                    <input
                        value={filtros.busqueda}
                        onChange={e => filtros.setBusqueda(e.target.value)}
                        placeholder="Cliente, teléfono, S/N, sede..."
                        className="w-full h-10 pl-9 pr-8 rounded-xl text-[13px] outline-none border border-black/[0.08] dark:border-white/[0.08] bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder:text-[#A8A29E]"
                    />
                    {filtros.busqueda && (
                        <button onClick={() => filtros.setBusqueda('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                    )}
                </div>
            </div>

            <div className="px-4 pt-3 space-y-3">

                {/* Stats chips */}
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                    <div className="shrink-0 rounded-2xl p-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] min-w-[120px]"
                        style={{ borderLeft: '3px solid #D48800' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">Total pendiente</p>
                        <M valor={stats.total} className="text-[18px] font-black leading-none text-[#D48800] dark:text-[#F0A500] block" />
                        <p className="text-[9px] text-[#A8A29E] mt-0.5">{stats.count} presupuestos</p>
                    </div>
                    <div className="shrink-0 rounded-2xl p-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] min-w-[100px]"
                        style={{ borderLeft: '3px solid #D13A28' }}>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">Servicios</p>
                        <p className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">{stats.servicios}</p>
                        <p className="text-[9px] text-[#A8A29E] mt-0.5">técnicos</p>
                    </div>
                    <div className="shrink-0 rounded-2xl p-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] min-w-[100px]">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">Ventas</p>
                        <p className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9]">{stats.ventas}</p>
                        <p className="text-[9px] text-[#A8A29E] mt-0.5">insumos</p>
                    </div>
                </div>

                {/* Alerta */}
                {stats.count > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--warning-bg)] border border-[rgba(212,136,0,0.25)]">
                        <span className="text-lg shrink-0">⚠️</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-black text-[var(--warning-tx)]">{stats.count} sin confirmar</p>
                            <p className="text-[11px] font-bold text-[#D48800] dark:text-[#F0A500]">
                                <M valor={stats.total} /> por cobrar
                            </p>
                        </div>
                    </div>
                )}

                {/* Tabs tipo */}
                <div className="flex gap-2">
                    {TIPO_TABS.map(t => (
                        <button key={t.id} onClick={() => setTipoFiltro(t.id)}
                            className={`flex-1 h-10 rounded-xl font-bold text-[12px] uppercase transition-all active:scale-95 ${tipoFiltro === t.id ? 'text-white bg-[#D13A28] dark:bg-[#E8422F]' : 'bg-[#EDEAE6] dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Barra selección masiva */}
                {modoSeleccion && seleccionados.size > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <span className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] flex-1">
                            {seleccionados.size} seleccionado{seleccionados.size !== 1 ? 's' : ''}
                        </span>
                        <button onClick={ejecutarMasivaArchivar}
                            className="h-9 px-4 rounded-xl font-bold text-xs bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            🗄️ Archivar
                        </button>
                    </div>
                )}

                <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                {cargando ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-2xl animate-pulse bg-[#EDEAE6] dark:bg-[#242424]" />)}
                    </div>
                ) : filtros.itemsPagina.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[36px] mb-2">✅</p>
                        <p className="font-bold text-[#A8A29E]">Sin presupuestos pendientes</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filtros.itemsPagina.map(s => (
                            <PresupuestoCard key={s.id} s={s}
                                calcularTotal={calcularTotal}
                                onVer={setModalDetalle}
                                onPDF={generarPDF}
                                onCobrar={confirmar}
                                onRechazar={rechazar}
                                onArchivar={archivar}
                                onEjecutar={onEjecutar}
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

            {modalDetalle && (
                <ModalDetalle s={modalDetalle} calcularTotal={calcularTotal} onClose={() => setModalDetalle(null)} />
            )}

            {modalFirmas && (
                <ModalFirmasPDF onConfirm={confirmarFirmasYGenerarPDF} onCancel={() => setModalFirmas(false)} />
            )}
        </div>
    );
}
