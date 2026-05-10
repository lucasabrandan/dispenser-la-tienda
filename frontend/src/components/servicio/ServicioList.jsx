import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useFiltros } from '../../hooks/useFiltros';
import FiltrosPanel from '../ui/FiltrosPanel';
import Paginacion   from '../ui/Paginacion';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import { useMontos } from '../../context/MontosContext';

// ── Helper monto ─────────────────────────────────────────────────────────────
function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? valor.toLocaleString() : valor}
        </span>
    );
}

const ESTADOS_HISTORIAL = [
    { value: 'PRESUPUESTO', label: 'Pendiente' },
    { value: 'REALIZADO',   label: 'Realizado' },
    { value: 'RECHAZADO',   label: 'Rechazado' },
];

const TIPOS = [
    { value: 'TODOS',   label: 'Todos' },
    { value: 'TECNICA', label: 'Técnica' },
    { value: 'VENTA',   label: 'Venta' },
];

// Badges usando variables CSS del sistema de diseño
const badgeTipo = (s) => {
    if (s.estado === 'PRESUPUESTO') return {
        label: 'Pendiente',
        cls: 'bg-[var(--warning-bg)] text-[var(--warning-tx)]'
    };
    if (s.estado === 'RECHAZADO') return {
        label: 'Rechazado',
        cls: 'bg-[var(--danger-bg)] text-[var(--danger-tx)]'
    };
    if (s.servicioTipo === 'TECNICA') return {
        label: 'Técnica',
        cls: 'bg-[#FDECEA] text-[#B02E1E] dark:bg-[#2E100C] dark:text-[#F5796C]'
    };
    return {
        label: 'Venta',
        cls: 'bg-[var(--success-bg)] text-[var(--success-tx)]'
    };
};

// Parsea fecha "DD/MM/YYYY" o "YYYY-MM-DD" para sort correcto
function parseFechaSort(f) {
    if (!f) return 0;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
        const [d, m, y] = f.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
    }
    return new Date(f).getTime() || 0;
}

export default function ServicioList({ onEditar }) {
    const { usuario, esAdmin } = useAuth();
    const [servicios, setServicios]       = useState([]);
    const [modalDetalle, setModalDetalle] = useState(null);
    const [tipoFiltro, setTipoFiltro]     = useState('TODOS');

    useEffect(() => { cargarServicios(); }, []); // eslint-disable-line

    const cargarServicios = () => {
        const params = new URLSearchParams({ page: 0, size: 500, sort: 'fechaServicio,desc' });
        if (!esAdmin && usuario?.id) params.append('usuarioId', usuario.id);
        api.get(`/servicios?${params}`)
            .then(res => {
                const data = res.data.content || res.data || [];
                setServicios(Array.isArray(data)
                    ? data.sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha))
                    : []);
            })
            .catch(() => toast.error('Error al conectar con el historial'));
    };

    const aprobarPresupuesto = async (id) => {
        const loading = toast.loading('Confirmando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('✅ ¡Confirmado!', { id: loading });
            cargarServicios();
        } catch { toast.error('Error al procesar', { id: loading }); }
    };

    const eliminarServicio = async (id) => {
        if (!window.confirm('⚠️ ¿Eliminar permanentemente?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('🗑️ Registro borrado');
            cargarServicios();
        } catch { toast.error('Error al eliminar'); }
    };

    const calcularCosto = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    // nroDocumento viene de la DB; localStorage como respaldo para datos generados antes de este cambio
    const serviciosConNro = React.useMemo(() => servicios.map(s => ({
        ...s,
        nroDocPdf: s.nroDocumento || localStorage.getItem(`pdf_nro_${s.id}`) || '',
    })), [servicios]);

    const serviciosFiltrados = tipoFiltro === 'TODOS'
        ? serviciosConNro
        : serviciosConNro.filter(s => s.servicioTipo === tipoFiltro);

    const filtros = useFiltros(serviciosFiltrados, {
        porPagina: 10,
        campoFecha: 'fecha',
        campoEstado: 'estado',
        campoBusqueda: ['clienteNombre', 'sedeNombre', 'clienteTelefono', 'observaciones', 'nroDocPdf'],
        campoBusquedaFn: (s) => s.items?.map(it =>
            [it.equipoSerial, it.equipoModelo, it.equipoUbicacion].filter(Boolean).join(' ')
        ).join(' ') ?? '',
    });

    const totalVentas  = servicios
        .filter(s => s.servicioTipo === 'VENTA'   && s.estado !== 'PRESUPUESTO')
        .reduce((a, s) => a + calcularCosto(s), 0);
    const totalTecnica = servicios
        .filter(s => s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO')
        .reduce((a, s) => a + calcularCosto(s), 0);

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#C8C4BE] dark:bg-[#141414] transition-colors">

            {/* ── HEADER ───────────────────────────────────────────────── */}
            <div className="px-4 md:px-0 pt-5 md:pt-0 pb-4">
                <h2 className="text-[28px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                    Historial
                </h2>
                <p className="text-[11px] font-medium mt-1 text-[#A8A29E]">
                    Todos los registros
                </p>
            </div>

            <div className="px-4 md:px-0 space-y-3">

                {/* ── FILTRO TIPO ───────────────────────────────────────── */}
                <div className="flex gap-2">
                    {TIPOS.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setTipoFiltro(t.value)}
                            className="px-4 py-1.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                            style={tipoFiltro === t.value
                                ? { background: '#D13A28', color: '#fff' }
                                : { background: '#C0BCB6', color: '#57534E' }
                            }
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── MÉTRICAS — solo admin ────────────────────────────── */}
                {esAdmin && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                             style={{ borderLeft: '3px solid #D48800' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#D48800] dark:text-[#F0A500]">
                                Ventas insumos
                            </p>
                            <M
                                valor={totalVentas}
                                className="text-[20px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block"
                            />
                        </div>
                        <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                             style={{ borderLeft: '3px solid #D13A28' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#D13A28] dark:text-[#E8422F]">
                                Técnica / MO
                            </p>
                            <M
                                valor={totalTecnica}
                                className="text-[20px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block"
                            />
                        </div>
                    </div>
                )}

                {/* ── FILTROS ───────────────────────────────────────────── */}
                <FiltrosPanel hook={filtros} estados={ESTADOS_HISTORIAL} conBusqueda conRango placeholderBusqueda="Cliente, S/N, ubicación, sede..." />
                <Paginacion
                    pagina={filtros.pagina}
                    totalPaginas={filtros.totalPaginas}
                    irA={filtros.irA}
                    next={filtros.next}
                    prev={filtros.prev}
                />

                {/* ── LISTADO ───────────────────────────────────────────── */}
                <div className="flex flex-col gap-3">
                    {filtros.itemsPagina.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                            <p className="text-[#A8A29E] font-bold">No se encontraron registros</p>
                        </div>
                    ) : filtros.itemsPagina.map(s => {
                        const badge = badgeTipo(s);
                        const costo = calcularCosto(s);
                        const esPendiente = s.estado === 'PRESUPUESTO';

                        return (
                            <div key={s.id}
                                 className="rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] overflow-hidden transition-colors"
                                 style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>

                                {/* Cuerpo */}
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[#A8A29E]">#{s.id}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            {esAdmin && (
                                                <M
                                                    valor={costo}
                                                    className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block"
                                                />
                                            )}
                                            <p className="text-[10px] text-[#A8A29E] mt-0.5">{s.fecha}</p>
                                        </div>
                                    </div>

                                    <p className="font-bold text-[15px] text-[#1C1917] dark:text-[#F0EEE9] leading-tight">
                                        {s.clienteNombre}
                                    </p>
                                    <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                        📍 {s.sedeNombre}
                                    </p>

                                    {/* Resumen técnica */}
                                    {s.items?.length > 0 && s.servicioTipo === 'TECNICA' && (
                                        <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            {s.items.slice(0, 2).map((it, idx) => (
                                                <p key={idx} className="text-[10px] text-[#A8A29E] truncate">
                                                    · {it.equipoSerial} — {it.trabajoRealizado}
                                                </p>
                                            ))}
                                            {s.items.length > 2 && (
                                                <p className="text-[10px] text-[#A8A29E]">+{s.items.length - 2} más...</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Resumen venta */}
                                    {s.items?.length > 0 && s.servicioTipo === 'VENTA' && (
                                        <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            <p className="text-[10px] text-[#A8A29E] truncate">
                                                · {s.items.map(it => `${it.cantidad || 1}x ${it.nombre || it.trabajoRealizado}`).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Barra de acciones */}
                                <div
                                    className="flex items-center gap-2 px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                                    style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}
                                >
                                    {esAdmin && esPendiente && (
                                        <button
                                            onClick={() => onEditar?.(s)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]"
                                            title="Editar">
                                            ✏️
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setModalDetalle(s)}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]"
                                        title="Ver detalle">
                                        👁️
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Las fotos (filenames) las resuelve cargarFoto dentro del generador
                                            const items = (s.items || []).map(it => ({
                                                ...it, totalCalculado: it.costo,
                                            }));
                                            generarRemitoPDFPremium({
                                                esPresupuesto:        esPendiente,
                                                servicioId:           s.id,
                                                nroDocumentoExistente: s.nroDocumento || localStorage.getItem(`pdf_nro_${s.id}`) || null,
                                                esTecnicoForzado:     s.servicioTipo === 'TECNICA',
                                                cliente: {
                                                    nombre:          s.clienteNombre,
                                                    telefono:        s.clienteTelefono,
                                                    email:           s.clienteEmail,
                                                    cuilDni:         s.clienteDni,
                                                    condicionFiscal: s.clienteCondicionIva,
                                                },
                                                sede: { nombreSede: s.sedeNombre, direccion: s.sedeDireccion },
                                                tecnico: s.items?.[0]?.tecnico || localStorage.getItem('tecnico_nombre') || '',
                                                ticketItems: items,
                                                fechaServicio: s.fecha,
                                                descuentoPorcentaje: s.descuentoPorcentaje || 0,
                                                leyenda: s.observaciones || s.leyenda || '',
                                            });
                                        }}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]"
                                        title="Generar PDF">
                                        📄
                                    </button>

                                    <div className="flex-1" />

                                    {esAdmin && (
                                        <button
                                            onClick={() => eliminarServicio(s.id)}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 bg-[var(--danger-bg)] text-[var(--danger-tx)]"
                                            title="Eliminar">
                                            🗑️
                                        </button>
                                    )}

                                    {esPendiente && (
                                        <button
                                            onClick={() => aprobarPresupuesto(s.id)}
                                            className="h-9 px-4 rounded-xl font-bold text-xs text-white transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-80">
                                            ✓ Cobrar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <Paginacion
                    pagina={filtros.pagina}
                    totalPaginas={filtros.totalPaginas}
                    irA={filtros.irA}
                    next={filtros.next}
                    prev={filtros.prev}
                />
            </div>

            {/* ── MODAL DETALLE ─────────────────────────────────────────── */}
            {modalDetalle && (
                <div
                    className="fixed inset-0 z-[2000] flex items-end"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setModalDetalle(null)}
                >
                    <div
                        className="w-full rounded-t-3xl p-5 bg-[#EDEAE6] dark:bg-[#242424]"
                        style={{ border: '0.5px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#C0BCB6] dark:bg-[#2E2E2E]" />
                        <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">
                            Desglose — {modalDetalle.clienteNombre}
                        </h3>
                        <p className="text-[11px] text-[#A8A29E] mb-4">
                            #{modalDetalle.id} · {modalDetalle.fecha}
                        </p>

                        <div className="max-h-[50vh] overflow-y-auto space-y-3 mb-4">
                            {modalDetalle.items.map((it, idx) => (
                                <div key={idx}
                                     className="p-4 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                                     style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">
                                            {it.equipoSerial}
                                        </span>
                                        {esAdmin && (
                                            <M
                                                valor={Number(it.costo)}
                                                className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]"
                                            />
                                        )}
                                    </div>
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug mb-2">
                                        {it.trabajoRealizado}
                                    </p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            <p className="text-[10px] text-[#A8A29E]">
                                                <span className="font-bold">Repuestos: </span>
                                                {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setModalDetalle(null)}
                            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}