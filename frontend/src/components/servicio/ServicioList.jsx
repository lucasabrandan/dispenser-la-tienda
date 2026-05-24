import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useFiltros } from '../../hooks/useFiltros';
import FiltrosPanel from '../ui/FiltrosPanel';
import Paginacion   from '../ui/Paginacion';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import { useMontos } from '../../context/MontosContext';

function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>······</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}
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

const badgeTipo = (s) => {
    if (s.estado === 'PRESUPUESTO') return { label: 'Pendiente', cls: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]' };
    if (s.estado === 'RECHAZADO')   return { label: 'Rechazado', cls: 'bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171]' };
    if (s.servicioTipo === 'TECNICA') return { label: 'Técnica', cls: 'bg-[#FDECEA] text-[#B02E1E] dark:bg-[#2E100C] dark:text-[#F5796C]' };
    return { label: 'Venta', cls: 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0F2A1A] dark:text-[#4ADE80]' };
};

function parseFechaSort(f) {
    if (!f) return 0;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) {
        const [d, m, y] = f.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
    }
    return new Date(f).getTime() || 0;
}

const card = 'rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] overflow-hidden';

const Accion = ({ onClick, icon, label, className = '' }) => (
    <button onClick={onClick}
        className={`inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${className}`}>
        {icon} <span className="hidden sm:inline">{label}</span>
    </button>
);

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
                let data = res.data.content || res.data || [];
                if (!Array.isArray(data)) data = [];
                if (!esAdmin) data = data.filter(s => s.estado !== 'PRESUPUESTO');
                setServicios(data.sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha)));
            })
            .catch(() => toast.error('Error al conectar con el historial'));
    };

    const aprobarPresupuesto = async (id) => {
        const loading = toast.loading('Confirmando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('Confirmado', { id: loading });
            cargarServicios();
        } catch { toast.error('Error al procesar', { id: loading }); }
    };

    const eliminarServicio = async (id) => {
        if (!window.confirm('¿Eliminar permanentemente?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('Registro borrado');
            cargarServicios();
        } catch { toast.error('Error al eliminar'); }
    };

    const calcularCosto = (s) => s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

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

    const totalVentas  = servicios.filter(s => s.servicioTipo === 'VENTA' && s.estado !== 'PRESUPUESTO').reduce((a, s) => a + calcularCosto(s), 0);
    const totalTecnica = servicios.filter(s => s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO').reduce((a, s) => a + calcularCosto(s), 0);

    const generarPDFHistorial = (s) => {
        const esPendiente = s.estado === 'PRESUPUESTO';
        const items = (s.items || []).map(it => ({ ...it, totalCalculado: it.costo }));
        generarRemitoPDFPremium({
            esPresupuesto: esPendiente,
            servicioId: s.id,
            nroDocumentoExistente: s.nroDocumento || localStorage.getItem(`pdf_nro_${s.id}`) || null,
            esTecnicoForzado: s.servicioTipo === 'TECNICA',
            cliente: { nombre: s.clienteNombre, telefono: s.clienteTelefono, email: s.clienteEmail, cuilDni: s.clienteDni, condicionFiscal: s.clienteCondicionIva },
            sede: { nombreSede: s.sedeNombre, direccion: s.sedeDireccion },
            tecnico: s.items?.[0]?.tecnico || localStorage.getItem('tecnico_nombre') || '',
            ticketItems: items,
            fechaServicio: s.fecha,
            descuentoPorcentaje: s.descuentoPorcentaje || 0,
            leyenda: s.observaciones || s.leyenda || '',
        });
    };

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#F5F3F1] dark:bg-[#141414]">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-6">

                {/* Header */}
                <div className="mb-5">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">Historial</h2>
                    <p className="text-[11px] font-medium text-[#A8A29E] mt-0.5">Todos los registros</p>
                </div>

                <div className="space-y-3">

                    {/* Filtro tipo */}
                    <div className="flex gap-1.5">
                        {TIPOS.map(t => (
                            <button key={t.value} onClick={() => setTipoFiltro(t.value)}
                                className={`h-8 px-3 rounded-lg text-[11px] font-bold uppercase transition-all active:scale-95 ${
                                    tipoFiltro === t.value
                                        ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                        : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Métricas — solo admin */}
                    {esAdmin && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`${card} p-3.5 border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Ventas insumos</p>
                                <M valor={totalVentas} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                            </div>
                            <div className={`${card} p-3.5 border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]`}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Técnica / MO</p>
                                <M valor={totalTecnica} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                            </div>
                        </div>
                    )}

                    {/* Filtros */}
                    <FiltrosPanel hook={filtros} estados={ESTADOS_HISTORIAL} conBusqueda conRango placeholderBusqueda="Cliente, S/N, ubicación, sede..." />
                    <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                    {/* Listado */}
                    <div className="flex flex-col gap-2">
                        {filtros.itemsPagina.length === 0 ? (
                            <div className={`${card} text-center py-12`}>
                                <p className="text-2xl mb-1">📋</p>
                                <p className="text-[12px] font-bold text-[#A8A29E]">No se encontraron registros</p>
                            </div>
                        ) : filtros.itemsPagina.map(s => {
                            const badge = badgeTipo(s);
                            const costo = calcularCosto(s);
                            const esPendiente = s.estado === 'PRESUPUESTO';
                            const borderColor = s.servicioTipo === 'TECNICA'
                                ? 'border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]'
                                : 'border-l-[3px] border-l-[#16A34A]';

                            return (
                                <div key={s.id} className={`${card} ${borderColor}`}>
                                    <div className="p-3.5">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-[#A8A29E] font-bold">#{s.id}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${badge.cls}`}>{badge.label}</span>
                                            </div>
                                            <div className="text-right">
                                                {esAdmin && <M valor={costo} className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] block" />}
                                                <p className="text-[10px] text-[#A8A29E]">{s.fecha}</p>
                                            </div>
                                        </div>
                                        <p className="text-[14px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{s.clienteNombre}</p>
                                        <p className="text-[10px] text-[#A8A29E] mt-0.5">📍 {s.sedeNombre}</p>

                                        {s.items?.length > 0 && s.servicioTipo === 'TECNICA' && (
                                            <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                                                {s.items.slice(0, 2).map((it, idx) => (
                                                    <p key={idx} className="text-[10px] text-[#A8A29E] truncate">· {it.equipoSerial} — {it.trabajoRealizado}</p>
                                                ))}
                                                {s.items.length > 2 && <p className="text-[10px] text-[#A8A29E]">+{s.items.length - 2} más</p>}
                                            </div>
                                        )}
                                        {s.items?.length > 0 && s.servicioTipo === 'VENTA' && (
                                            <p className="text-[10px] text-[#A8A29E] mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04] truncate">
                                                · {s.items.map(it => `${it.cantidad || 1}x ${it.nombre || it.trabajoRealizado}`).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-black/[0.04] dark:border-white/[0.04] bg-[#F5F3F1]/50 dark:bg-[#1C1C1C]/50">
                                        {esAdmin && esPendiente && (
                                            <Accion onClick={() => onEditar?.(s)} icon="✏️" label="Editar"
                                                className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                                        )}
                                        <Accion onClick={() => setModalDetalle(s)} icon="👁️" label="Detalle"
                                            className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                                        <Accion onClick={() => generarPDFHistorial(s)} icon="📄" label="PDF"
                                            className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                                        <div className="flex-1" />
                                        {esPendiente && (
                                            <button onClick={() => aprobarPresupuesto(s.id)}
                                                className="h-7 px-3 rounded-lg font-bold text-[10px] text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">
                                                Cobrar
                                            </button>
                                        )}
                                        {esAdmin && (
                                            <Accion onClick={() => eliminarServicio(s.id)} icon="🗑️" label=""
                                                className="text-[#D13A28]/60 dark:text-[#E8422F]/60 hover:bg-[#FEE2E2] dark:hover:bg-[#3B1111]" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
                </div>
            </div>

            {/* Modal detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={() => setModalDetalle(null)}>
                    <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 bg-white dark:bg-[#242424] border-t border-black/[0.05] dark:border-white/[0.05]"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#E8E5E0] dark:bg-[#2E2E2E]" />
                        <h3 className="text-[16px] font-black mb-1 text-[#1C1917] dark:text-[#F0EEE9]">
                            Desglose — {modalDetalle.clienteNombre}
                        </h3>
                        <p className="text-[11px] text-[#A8A29E] mb-4">#{modalDetalle.id} · {modalDetalle.fecha}</p>
                        <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4">
                            {modalDetalle.items.map((it, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-[#F5F3F1] dark:bg-[#1C1C1C] border border-black/[0.04] dark:border-white/[0.04]">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-[13px] text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                                        {esAdmin && <M valor={Number(it.costo)} className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]" />}
                                    </div>
                                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug mb-2">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <p className="text-[10px] text-[#A8A29E] pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                                            <span className="font-bold">Repuestos: </span>
                                            {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalDetalle(null)}
                            className="w-full py-3 rounded-xl font-bold text-sm text-white active:scale-95 bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917]">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
