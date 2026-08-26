import React, { useState, useEffect } from 'react';
import { LuClipboardList, LuWrench, LuShoppingCart, LuShieldCheck, LuHourglass, LuEye, LuFileText, LuEllipsis, LuPencil, LuTrash2, LuSearch, LuMapPin } from 'react-icons/lu';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useFiltros } from '../../hooks/useFiltros';
import FiltrosPanel from '../ui/FiltrosPanel';
import Paginacion   from '../ui/Paginacion';
import SwipeColumns from '../ui/SwipeColumns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import { useMontos } from '../../context/MontosContext';
import { estadoGarantia, mesKeyDeFecha, formatMesLargo } from '../../utils/dateUtils';
import ConfirmDialog from '../ui/ConfirmDialog';
import IconBtn from '../ui/IconBtn';
import ActionSheet from '../ui/ActionSheet';

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
    { value: 'ARCHIVADO',   label: 'Archivado' },
];

const TIPOS = [
    { id: 'TODOS',   label: 'Todos',   fullLabel: 'Todos',   color: '#1C1917', Icon: LuClipboardList },
    { id: 'TECNICA', label: 'Técnica', fullLabel: 'Técnica', color: '#D48800', Icon: LuWrench },
    { id: 'VENTA',   label: 'Venta',   fullLabel: 'Venta',   color: '#D13A28', Icon: LuShoppingCart },
];

const badgeTipo = (s) => {
    if (s.estado === 'PRESUPUESTO') return { label: 'Pendiente', cls: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]' };
    if (s.estado === 'ARCHIVADO')   return { label: 'Archivado', cls: 'bg-[#E8E5E0] text-[#57534E] dark:bg-[#2E2E2E] dark:text-[#9E9A94]' };
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

const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] overflow-hidden';

export default function ServicioList({ onEditar }) {
    const { usuario, esAdmin } = useAuth();
    const [servicios, setServicios]       = useState([]);
    const [modalDetalle, setModalDetalle] = useState(null);
    const [tipoFiltro, setTipoFiltro]     = useState('TODOS');
    const [mostrarFiltros, setMostrarFiltros] = useState(true);
    const [seleccionando, setSeleccionando] = useState(false);
    const [seleccionadas, setSeleccionadas] = useState(new Set());
    const [confirmMasivo, setConfirmMasivo] = useState(false);
    const [menuAbiertoId, setMenuAbiertoId] = useState(null);
    const [confirmEliminarId, setConfirmEliminarId] = useState(null);

    const toggleSel = (id) => setSeleccionadas(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const salirSeleccion = () => {
        setSeleccionando(false);
        setSeleccionadas(new Set());
        setConfirmMasivo(false);
    };

    const eliminarMasivo = async () => {
        const ids = [...seleccionadas];
        const loading = toast.loading(`Eliminando ${ids.length}...`);
        let ok = 0;
        for (const id of ids) {
            try { await api.delete(`/servicios/${id}`); ok++; } catch { /* silencioso */ }
        }
        toast.dismiss(loading);
        if (ok > 0) toast.success(`${ok} registro${ok > 1 ? 's' : ''} eliminado${ok > 1 ? 's' : ''}`);
        salirSeleccion();
        cargarServicios();
    };

    useEffect(() => { cargarServicios(); }, []); // eslint-disable-line

    const cargarServicios = () => {
        const params = new URLSearchParams({ page: 0, size: 500, sort: 'fechaServicio,desc' });
        if (!esAdmin && usuario?.id) params.append('usuarioId', usuario.id);
        api.get(`/servicios?${params}`)
            .then(res => {
                let data = res.data.content || res.data || [];
                if (!Array.isArray(data)) data = [];
                if (!esAdmin) data = data.filter(s => s.estado !== 'PRESUPUESTO');
                setServicios(data.sort((a, b) => parseFechaSort(b.fecha) - parseFechaSort(a.fecha) || (b.id || 0) - (a.id || 0)));
            })
            .catch(() => toast.error('Error al conectar con el historial'));
    };

    // La confirmación la muestra el ConfirmDialog compartido (ver más abajo),
    // no window.confirm() nativo del navegador.
    const eliminarServicio = async (id) => {
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

    const tipoIds = TIPOS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(tipoIds, tipoFiltro, setTipoFiltro);
    const columns = TIPOS.map(t => ({
        ...t,
        count: t.id === 'TODOS' ? serviciosConNro.length
             : serviciosConNro.filter(s => s.servicioTipo === t.id).length,
    }));

    const filtros = useFiltros(serviciosFiltrados, {
        porPagina: 10,
        campoFecha: 'fecha',
        campoEstado: 'estado',
        periodoInicial: 'MES',
        campoBusqueda: ['clienteNombre', 'sedeNombre', 'clienteTelefono', 'observaciones', 'nroDocPdf'],
        campoBusquedaFn: (s) => s.items?.map(it =>
            [it.equipoSerial, it.equipoModelo, it.equipoUbicacion].filter(Boolean).join(' ')
        ).join(' ') ?? '',
    });

    const totalVentas  = servicios.filter(s => s.servicioTipo === 'VENTA' && s.estado !== 'PRESUPUESTO').reduce((a, s) => a + calcularCosto(s), 0);
    const totalTecnica = servicios.filter(s => s.servicioTipo === 'TECNICA' && s.estado !== 'PRESUPUESTO').reduce((a, s) => a + calcularCosto(s), 0);

    const generarPDFHistorial = (s, { sinPrecios = false } = {}) => {
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
            sinPrecios,
        });
    };

    // Genera PDFs sin precios para todos los seleccionados
    const pdfMasivoSinPrecios = async () => {
        const ids = [...seleccionadas];
        const items = servicios.filter(s => ids.includes(s.id));
        if (items.length === 0) return;
        const loading = toast.loading(`Generando ${items.length} PDF${items.length > 1 ? 's' : ''}...`);
        for (const s of items) {
            await generarPDFHistorial(s, { sinPrecios: true });
        }
        toast.dismiss(loading);
        toast.success(`${items.length} PDF${items.length > 1 ? 's' : ''} generado${items.length > 1 ? 's' : ''}`);
    };

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-page" {...swipeHandlers}>

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">Historial</h2>
                    {/* Búsqueda + seleccionar */}
                    <div className="flex gap-1.5 items-center">
                        <div className="relative flex-1">
                            <LuSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input value={filtros.busqueda} onChange={e => filtros.setBusqueda(e.target.value)}
                                placeholder="Cliente, S/N, ubicación, sede..."
                                className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-card text-ink placeholder:text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                            {filtros.busqueda && (
                                <button onClick={() => filtros.setBusqueda('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-label font-bold">✕</button>
                            )}
                        </div>
                        {esAdmin && (
                            seleccionando ? (
                                <button onClick={salirSeleccion}
                                    className="h-9 px-3 rounded-lg font-bold text-label uppercase shrink-0 active:scale-95 bg-chip text-secondary">
                                    Cancelar
                                </button>
                            ) : (
                                <button onClick={() => { setSeleccionando(true); setSeleccionadas(new Set()); }}
                                    className="h-9 px-3 rounded-lg font-bold text-label uppercase shrink-0 active:scale-95 bg-chip text-secondary">
                                    Seleccionar
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">

                <div className="space-y-2">

                    {/* Stats compacto — solo admin */}
                    {esAdmin && (
                        <div className="flex items-center gap-3 px-3 h-8 rounded-lg bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                            <span className="text-label font-bold text-muted">Ventas</span>
                            <M valor={totalVentas} className="text-label font-black text-ink" />
                            <span className="text-label text-muted">·</span>
                            <span className="text-label font-bold text-muted">Técnica</span>
                            <M valor={totalTecnica} className="text-label font-black text-ink" />
                        </div>
                    )}

                    {/* Filtro tipo — SwipeColumns */}
                    <SwipeColumns columns={columns} activeId={tipoFiltro} onChangeColumn={setTipoFiltro} />

                    {/* Filtros colapsables */}
                    <button onClick={() => setMostrarFiltros(v => !v)}
                        className="w-full flex items-center justify-between px-3 h-7 rounded-lg bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-[0.99]">
                        <span className="text-label font-bold uppercase text-muted">{mostrarFiltros ? '▲' : '▼'} Filtros</span>
                        <span className="text-label font-bold text-muted">{filtros.totalItems} resultados</span>
                    </button>

                    {mostrarFiltros && (
                        <FiltrosPanel hook={filtros} estados={ESTADOS_HISTORIAL} conBusqueda={false} conRango />
                    )}
                    <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />

                    {/* Listado */}
                    <div className="flex flex-col gap-2">
                        {filtros.itemsPagina.length === 0 ? (
                            <div className={`${card} text-center py-12`}>
                                <LuClipboardList size={24} className="mb-1 text-muted inline-block" />
                                <p className="text-caption font-bold text-muted">No se encontraron registros</p>
                            </div>
                        ) : filtros.itemsPagina.map((s, idx) => {
                            const badge = badgeTipo(s);
                            const costo = calcularCosto(s);
                            const esPendiente = s.estado === 'PRESUPUESTO';
                            const borderColor = s.servicioTipo === 'TECNICA'
                                ? 'border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]'
                                : 'border-l-[3px] border-l-[#16A34A]';
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
                                    className={`${card} ${borderColor} transition-all ${seleccionando && seleccionadas.has(s.id) ? 'ring-2 ring-brand-red' : ''}`}
                                    onClick={seleccionando ? () => toggleSel(s.id) : undefined}>
                                    <div className="p-3.5">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-1.5">
                                                {seleccionando && (
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${seleccionadas.has(s.id) ? 'bg-brand-red border-brand-red' : 'border-muted bg-transparent'}`}>
                                                        {seleccionadas.has(s.id) && <span className="text-white text-label font-black">✓</span>}
                                                    </div>
                                                )}
                                                <span className="text-label text-muted font-bold">#{s.id}</span>
                                                <span className={`text-label font-bold px-1.5 py-0.5 rounded-md uppercase ${badge.cls}`}>{badge.label}</span>
                                            </div>
                                            <div className="text-right">
                                                {esAdmin && <M valor={costo} className="text-body-lg font-black text-ink block" />}
                                                <p className="text-caption text-muted">{s.fecha}</p>
                                            </div>
                                        </div>
                                        <p className="text-body font-bold text-ink truncate">{s.clienteNombre}</p>
                                        <p className="text-caption text-muted mt-0.5 flex items-center gap-1"><LuMapPin size={11} />{s.sedeNombre}</p>

                                        {s.items?.length > 0 && s.servicioTipo === 'TECNICA' && (
                                            <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                                                {s.items.slice(0, 2).map((it, idx) => {
                                                    const g = it.garantiaHasta ? estadoGarantia(it.garantiaHasta) : null;
                                                    return (
                                                        <p key={`${it.equipoSerial || 'it'}-${idx}`} className="text-caption text-muted truncate">
                                                            · {it.equipoSerial} — {it.trabajoRealizado}
                                                            {g && (
                                                                <span className={`ml-1.5 font-bold inline-flex items-center gap-0.5 ${g.vigente ? 'text-brand-green' : 'text-brand-red'}`}>
                                                                    {g.vigente ? <LuShieldCheck size={11} className="shrink-0" /> : <LuHourglass size={11} className="shrink-0" />}
                                                                    {g.vigente ? `${g.dias}d` : `vencida hace ${Math.abs(g.dias)}d`}
                                                                </span>
                                                            )}
                                                        </p>
                                                    );
                                                })}
                                                {s.items.length > 2 && <p className="text-caption text-muted">+{s.items.length - 2} más</p>}
                                            </div>
                                        )}
                                        {s.items?.length > 0 && s.servicioTipo === 'VENTA' && (
                                            <p className="text-caption text-muted mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04] truncate">
                                                · {s.items.map(it => `${it.cantidad || 1}x ${it.nombre || it.trabajoRealizado}`).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Acciones — 2 rápidas + "⋯" para el resto, en vez de todo suelto en fila */}
                                    {!seleccionando && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-black/[0.04] dark:border-white/[0.04] bg-[#F5F3F1]/50 dark:bg-[#1C1C1C]/50">
                                            <IconBtn onClick={() => setModalDetalle(s)} title="Ver detalle"
                                                cls="bg-chip text-secondary"><LuEye size={15} /></IconBtn>
                                            <IconBtn onClick={() => generarPDFHistorial(s)} title="PDF"
                                                cls="bg-chip text-secondary"><LuFileText size={15} /></IconBtn>

                                            <div className="relative">
                                                    <IconBtn onClick={() => setMenuAbiertoId(v => v === s.id ? null : s.id)} title="Más acciones"
                                                        cls={menuAbiertoId === s.id ? 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-brand-red' : 'bg-chip text-secondary'}>
                                                        <LuEllipsis size={15} />
                                                    </IconBtn>
                                                    <ActionSheet open={menuAbiertoId === s.id} onClose={() => setMenuAbiertoId(null)}>
                                                                <button onClick={() => { generarPDFHistorial(s, { sinPrecios: true }); setMenuAbiertoId(null); }}
                                                                    className="w-full px-5 py-3.5 text-left text-body font-bold text-ink active:bg-[#E8E5E0] dark:active:bg-[#2E2E2E] rounded-xl flex items-center gap-2.5">
                                                                    <LuClipboardList size={16} /> PDF sin precios
                                                                </button>
                                                                {esAdmin && esPendiente && (
                                                                    <button onClick={() => { onEditar?.(s); setMenuAbiertoId(null); }}
                                                                        className="w-full px-5 py-3.5 text-left text-body font-bold text-ink active:bg-[#E8E5E0] dark:active:bg-[#2E2E2E] rounded-xl flex items-center gap-2.5">
                                                                        <LuPencil size={16} /> Editar
                                                                    </button>
                                                                )}
                                                                {esAdmin && (
                                                                    <button onClick={() => { setConfirmEliminarId(s.id); setMenuAbiertoId(null); }}
                                                                        className="w-full px-5 py-3.5 text-left text-body font-bold text-brand-red active:bg-[#FEE2E2] dark:active:bg-[#3B1111] rounded-xl flex items-center gap-2.5">
                                                                        <LuTrash2 size={16} /> Eliminar
                                                                    </button>
                                                                )}
                                                    </ActionSheet>
                                                </div>
                                        </div>
                                    )}
                                </div>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <Paginacion pagina={filtros.pagina} totalPaginas={filtros.totalPaginas} irA={filtros.irA} next={filtros.next} prev={filtros.prev} />
                </div>
            </div>

            {/* Barra masiva */}
            {seleccionando && (
                <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
                    <div className="max-w-lg mx-auto flex items-center gap-2 p-3 rounded-2xl bg-card shadow-lg border border-black/[0.07] dark:border-white/[0.07]">
                        <button onClick={() => {
                            const ids = filtros.itemsPagina.map(s => s.id);
                            const todasSel = ids.every(id => seleccionadas.has(id));
                            setSeleccionadas(todasSel ? new Set() : new Set(ids));
                        }}
                            className="h-9 px-3 rounded-xl font-bold text-label bg-chip text-secondary active:scale-95">
                            {filtros.itemsPagina.length > 0 && filtros.itemsPagina.every(s => seleccionadas.has(s.id)) ? 'Deseleccionar' : 'Toda la pág.'}
                        </button>
                        <span className="text-caption font-bold text-muted flex-1">{seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}</span>
                        {!confirmMasivo ? (
                            <>
                            <button onClick={pdfMasivoSinPrecios}
                                disabled={seleccionadas.size === 0}
                                className={`h-9 px-3 rounded-xl font-bold text-label uppercase active:scale-95 transition-all flex items-center gap-1.5 ${seleccionadas.size > 0 ? 'bg-brand-amber text-white' : 'bg-chip text-muted'}`}>
                                <LuClipboardList size={13} /> Sin $
                            </button>
                            <button onClick={() => seleccionadas.size > 0 && setConfirmMasivo(true)}
                                disabled={seleccionadas.size === 0}
                                className={`h-9 px-4 rounded-xl font-bold text-label uppercase active:scale-95 transition-all ${seleccionadas.size > 0 ? 'bg-brand-red text-white' : 'bg-chip text-muted'}`}>
                                Eliminar ({seleccionadas.size})
                            </button>
                            </>
                        ) : (
                            <div className="flex gap-1.5">
                                <button onClick={() => setConfirmMasivo(false)}
                                    className="h-9 px-3 rounded-xl font-bold text-label bg-chip text-secondary active:scale-95">
                                    No
                                </button>
                                <button onClick={eliminarMasivo}
                                    className="h-9 px-4 rounded-xl font-bold text-label bg-brand-red text-white active:scale-95">
                                    Confirmar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={() => setModalDetalle(null)}>
                    <div className="w-full md:max-w-lg md:mx-auto rounded-t-3xl p-5 bg-card border-t border-black/[0.05] dark:border-white/[0.05]"
                        onClick={e => e.stopPropagation()}>
                        <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip" />
                        <h3 className="text-body-lg font-black mb-1 text-ink">
                            Desglose — {modalDetalle.clienteNombre}
                        </h3>
                        <p className="text-caption text-muted mb-4">#{modalDetalle.id} · {modalDetalle.fecha}</p>
                        <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-4">
                            {modalDetalle.items.map((it, idx) => {
                                const g = it.garantiaHasta ? estadoGarantia(it.garantiaHasta) : null;
                                return (
                                <div key={`${it.equipoSerial || 'det'}-${idx}`} className="p-3.5 rounded-xl bg-page border border-black/[0.04] dark:border-white/[0.04]">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-body text-brand-red">{it.equipoSerial}</span>
                                        {esAdmin && <M valor={Number(it.costo)} className="font-black text-body-lg text-ink" />}
                                    </div>
                                    <p className="text-caption text-secondary leading-snug mb-2">{it.trabajoRealizado}</p>
                                    {g && (
                                        <p className={`text-caption font-black mb-2 flex items-center gap-1 ${g.vigente ? 'text-brand-green' : 'text-brand-red'}`}>
                                            {g.vigente ? <LuShieldCheck size={12} className="shrink-0" /> : <LuHourglass size={12} className="shrink-0" />}
                                            {g.vigente
                                                ? `Garantía vigente · ${g.dias} día${g.dias === 1 ? '' : 's'} restante${g.dias === 1 ? '' : 's'}`
                                                : `Garantía vencida hace ${Math.abs(g.dias)} día${Math.abs(g.dias) === 1 ? '' : 's'}`}
                                        </p>
                                    )}
                                    {it.repuestosUsados?.length > 0 && (
                                        <p className="text-caption text-muted pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                                            <span className="font-bold">Repuestos: </span>
                                            {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                        <button onClick={() => setModalDetalle(null)}
                            className="w-full py-3 rounded-xl font-bold text-sm text-white active:scale-95 bg-ink dark:text-[#1C1917]">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {confirmEliminarId && (
                <ConfirmDialog
                    titulo="Eliminar permanentemente"
                    mensaje="Esta acción no se puede deshacer."
                    textoConfirmar="Sí, eliminar"
                    onCancelar={() => setConfirmEliminarId(null)}
                    onConfirmar={() => { eliminarServicio(confirmEliminarId); setConfirmEliminarId(null); }}
                />
            )}
        </div>
    );
}
