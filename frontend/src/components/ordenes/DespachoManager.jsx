import React, { useState, useMemo } from 'react';
import { useOrdenes } from '../../hooks/useOrdenes';
import OrdenForm from './OrdenForm';
import SwipeColumns from '../ui/SwipeColumns';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { toast } from 'react-hot-toast';
import DateInput from '../ui/DateInput';

const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-[#E8E5E0] dark:bg-[#2E2E2E]', tx: 'text-[#A8A29E]' },
    NORMAL:  { bg: 'bg-[#DBEAFE] dark:bg-[#1E3A5F]', tx: 'text-[#2563EB] dark:text-[#60A5FA]' },
    ALTA:    { bg: 'bg-[var(--warning-bg)]',           tx: 'text-[var(--warning-tx)]' },
    URGENTE: { bg: 'bg-[var(--danger-bg)]',            tx: 'text-[var(--danger-tx)]' },
};

const ESTADO_COLOR = {
    PENDIENTE:   { dot: '#A8A29E', label: 'Pendiente'    },
    EN_CAMINO:   { dot: '#3B82F6', label: 'En camino'    },
    EN_SITIO:    { dot: '#D48800', label: 'En sitio'     },
    COMPLETADA:  { dot: '#16A34A', label: 'Completada'   },
    CANCELADA:   { dot: '#D13A28', label: 'Cancelada'    },
    NO_ATENDIDO: { dot: '#DC2626', label: 'No atendido'  },
};

const ESTADO_TABS = [
    { id: '',           label: 'Todas',       fullLabel: 'Todas',       color: '#1C1917', icon: '📋' },
    { id: 'PENDIENTE',  label: 'Pendientes',  fullLabel: 'Pendientes',  color: '#A8A29E', icon: '⏳' },
    { id: 'EN_CAMINO',  label: 'En camino',   fullLabel: 'En camino',   color: '#3B82F6', icon: '🚗' },
    { id: 'EN_SITIO',   label: 'En sitio',    fullLabel: 'En sitio',    color: '#D48800', icon: '📍' },
    { id: 'FINAL',      label: 'Finalizadas', fullLabel: 'Finalizadas', color: '#16A34A', icon: '✅' },
];

function OrdenCard({ orden, onEditar, onEliminar, onAvanzar, seleccionando, seleccionada, onToggleSel }) {
    const [expanded, setExpanded] = useState(false);
    const [confirmElim, setConfirmElim] = useState(false);
    const pr = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const es = ESTADO_COLOR[orden.estado] || ESTADO_COLOR.PENDIENTE;
    const esFinal = ['COMPLETADA', 'CANCELADA'].includes(orden.estado);
    const esNoAtendido = orden.estado === 'NO_ATENDIDO';

    return (
        <div className={`rounded-2xl overflow-hidden bg-[#FFFFFF] dark:bg-[#242424] transition-all ${seleccionando && seleccionada ? 'ring-2 ring-[#D13A28] dark:ring-[#E8422F]' : ''}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${es.dot}` }}
            onClick={seleccionando ? () => onToggleSel(orden.id) : undefined}>
            <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                    {seleccionando && (
                        <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${seleccionada ? 'bg-[#D13A28] dark:bg-[#E8422F] border-[#D13A28] dark:border-[#E8422F]' : 'border-[#A8A29E] bg-transparent'}`}>
                            {seleccionada && <span className="text-white text-[10px] font-black">✓</span>}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${pr.bg} ${pr.tx}`}>
                                {orden.prioridad}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#A8A29E]">
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: es.dot, display: 'inline-block' }} />
                                {es.label}
                            </span>
                        </div>
                        <p className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9] leading-tight">{orden.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{orden.horaEstimada || '—'}</p>
                        <p className="text-[10px] text-[#A8A29E]">{orden.fechaProgramada}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-[#A8A29E]">👤 {orden.tecnicoNombre}</p>
                    {orden.montoEstimado && (
                        <span className="text-[11px] font-black text-[#D48800] dark:text-[#F0A500]">
                            ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transf.' : 'Efectivo'}
                        </span>
                    )}
                </div>

                {orden.clienteNombre && (
                    <p className="text-[11px] text-[#A8A29E] mt-0.5">🏢 {orden.clienteNombre}{orden.clienteTelefono ? ` · ${orden.clienteTelefono}` : ''}</p>
                )}
                {orden.direccion && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                        target="_blank" rel="noreferrer"
                        className="text-[11px] text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 block hover:underline">
                        📍 {orden.direccion}
                    </a>
                )}
                {orden.presupuestoId && (
                    <p className="text-[10px] font-bold text-[#D48800] dark:text-[#F0A500] mt-0.5">
                        📋 Presupuesto #{orden.presupuestoId} vinculado
                    </p>
                )}
                {esNoAtendido && (
                    <p className="text-[11px] font-black text-[#DC2626] mt-1">
                        El tecnico reporto que no fue atendido. Reprograma o cancela.
                    </p>
                )}

                {(orden.descripcion || orden.notasTecnico) && (
                    <button onClick={() => setExpanded(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                        <span>Detalle</span>
                        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
                    </button>
                )}
                {expanded && (
                    <div className="mt-2 p-3 rounded-xl bg-[#EFEDEA] dark:bg-[#1C1C1C] space-y-1">
                        {orden.descripcion && <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{orden.descripcion}</p>}
                        {orden.notasTecnico && (
                            <p className="text-[11px] text-[#16A34A] dark:text-[#4ADE80] leading-snug">
                                📝 Nota técnico: {orden.notasTecnico}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {!seleccionando && (
                <div className="flex items-center gap-2 px-4 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-t border-black/[0.06] dark:border-white/[0.06]">
                    {!esFinal && (
                        <button onClick={() => onEditar(orden)}
                            className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            ✏️ Editar
                        </button>
                    )}
                    <div className="flex-1" />
                    {!confirmElim ? (
                        <button onClick={() => setConfirmElim(true)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#A8A29E]">
                            🗑
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setConfirmElim(false)}
                                className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                No
                            </button>
                            <button onClick={() => { setConfirmElim(false); onEliminar(orden.id); }}
                                className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#D13A28] dark:bg-[#E8422F] text-white active:scale-95">
                                Sí, eliminar
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DespachoManager() {
    const {
        ordenes, tecnicos, cargando,
        desde, setDesde, hasta, setHasta,
        modalCrear, setModalCrear,
        ordenEditar, abrirEditar, cerrarModal,
        crear, actualizar, eliminar, eliminarDireto, avanzarEstado,
        recargar,
    } = useOrdenes();

    const [filtrTecnico, setFiltrTecnico] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [seleccionando, setSeleccionando] = useState(false);
    const [seleccionadas, setSeleccionadas] = useState(new Set());
    const [confirmMasivo, setConfirmMasivo] = useState(false);

    const toggleSel = (id) => setSeleccionadas(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleTodas = () => {
        const ids = ordenesFiltradas.map(o => o.id);
        const todasSel = ids.every(id => seleccionadas.has(id));
        setSeleccionadas(todasSel ? new Set() : new Set(ids));
    };

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
            try { await eliminarDireto(id); ok++; } catch { /* silencioso */ }
        }
        toast.dismiss(loading);
        if (ok > 0) toast.success(`${ok} orden${ok > 1 ? 'es' : ''} eliminada${ok > 1 ? 's' : ''}`);
        salirSeleccion();
        recargar();
    };

    // Filtrar por estado y técnico
    const ordenesFiltradas = useMemo(() => {
        let items = ordenes;
        if (filtrTecnico) items = items.filter(o => String(o.tecnicoId) === filtrTecnico);
        if (estadoFiltro === 'FINAL') items = items.filter(o => ['COMPLETADA', 'CANCELADA', 'NO_ATENDIDO'].includes(o.estado));
        else if (estadoFiltro) items = items.filter(o => o.estado === estadoFiltro);
        return items;
    }, [ordenes, filtrTecnico, estadoFiltro]);

    // Conteos por estado
    const counts = useMemo(() => ({
        '':          ordenes.length,
        'PENDIENTE': ordenes.filter(o => o.estado === 'PENDIENTE').length,
        'EN_CAMINO': ordenes.filter(o => o.estado === 'EN_CAMINO').length,
        'EN_SITIO':  ordenes.filter(o => o.estado === 'EN_SITIO').length,
        'FINAL':     ordenes.filter(o => ['COMPLETADA', 'CANCELADA', 'NO_ATENDIDO'].includes(o.estado)).length,
    }), [ordenes]);

    // Agrupar por técnico
    const grupos = ordenesFiltradas.reduce((acc, o) => {
        const key = `${o.tecnicoId}__${o.tecnicoNombre}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(o);
        return acc;
    }, {});

    // Conteo de activas por técnico (desde ordenes sin filtrar, siempre pendientes/en curso)
    const activasPorTecnico = useMemo(() => ordenes.reduce((acc, o) => {
        if (!['COMPLETADA', 'CANCELADA', 'NO_ATENDIDO'].includes(o.estado)) {
            acc[o.tecnicoId] = (acc[o.tecnicoId] || 0) + 1;
        }
        return acc;
    }, {}), [ordenes]);

    const columns = ESTADO_TABS.map(t => ({
        ...t, count: counts[t.id] ?? 0,
    }));

    const columnIds = ESTADO_TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(columnIds, estadoFiltro, setEstadoFiltro);

    return (
        <div className="min-h-screen pb-28 bg-[#F5F3F1] dark:bg-[#141414]"
            {...swipeHandlers}>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9] mb-2.5">Despacho</h2>
                    <div className="flex gap-1.5 items-center">
                        <button onClick={() => setMostrarFiltros(v => !v)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 active:scale-95 shadow-sm border border-black/[0.05] dark:border-white/[0.05] text-sm ${mostrarFiltros ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                            ⚙
                        </button>
                        <span className="text-[11px] font-bold text-[#A8A29E] flex-1">{ordenesFiltradas.length} ordenes</span>
                        {seleccionando ? (
                            <button onClick={salirSeleccion}
                                className="h-9 px-4 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                Cancelar
                            </button>
                        ) : (
                            <>
                                <button onClick={() => { setSeleccionando(true); setSeleccionadas(new Set()); }}
                                    className="h-9 px-3 rounded-lg font-bold text-[11px] uppercase transition-all active:scale-95 bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                    Seleccionar
                                </button>
                                <button onClick={() => setModalCrear(true)}
                                    className="h-9 px-4 rounded-lg font-bold text-[11px] text-white uppercase transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">
                                    + Orden
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* SwipeColumns — estados */}
                <SwipeColumns columns={columns} activeId={estadoFiltro} onChangeColumn={setEstadoFiltro} />

                {/* Filtros colapsables */}
                {mostrarFiltros && (
                    <div className="flex gap-1.5 items-center flex-wrap p-3 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <DateInput value={desde} onChange={setDesde}
                            className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]" />
                        <span className="text-[10px] text-[#A8A29E]">a</span>
                        <DateInput value={hasta} onChange={setHasta}
                            className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]" />
                        <select value={filtrTecnico} onChange={e => setFiltrTecnico(e.target.value)}
                            className="flex-1 h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.05] dark:border-white/[0.05]">
                            <option value="">Todos los técnicos</option>
                            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>
                )}

                {/* Lista agrupada por técnico */}
                {cargando ? (
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-[#FFFFFF] dark:bg-[#242424]" />)}
                    </div>
                ) : Object.keys(grupos).length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-3xl mb-2">{ESTADO_TABS.find(t => t.id === estadoFiltro)?.icon || '📋'}</p>
                        <p className="text-[13px] font-bold text-[#A8A29E]">
                            Sin órdenes {estadoFiltro ? ESTADO_TABS.find(t => t.id === estadoFiltro)?.fullLabel?.toLowerCase() : ''}
                        </p>
                    </div>
                ) : (
                    Object.entries(grupos).map(([key, items]) => {
                        const [tecId, nombre] = key.split('__');
                        const activas = activasPorTecnico[tecId] || 0;
                        return (
                            <div key={key} className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-wider">
                                        👤 {nombre}
                                    </p>
                                    {activas > 0 && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D13A28] dark:bg-[#E8422F] text-white">
                                            {activas} activa{activas > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {items.map(o => (
                                        <OrdenCard key={o.id} orden={o}
                                            onEditar={abrirEditar}
                                            onEliminar={eliminar}
                                            onAvanzar={avanzarEstado}
                                            seleccionando={seleccionando}
                                            seleccionada={seleccionadas.has(o.id)}
                                            onToggleSel={toggleSel} />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Barra masiva */}
            {seleccionando && (
                <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
                    <div className="max-w-lg mx-auto flex items-center gap-2 p-3 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] shadow-lg border border-black/[0.07] dark:border-white/[0.07]">
                        <button onClick={toggleTodas}
                            className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                            {ordenesFiltradas.length > 0 && ordenesFiltradas.every(o => seleccionadas.has(o.id)) ? 'Deseleccionar' : 'Todas'}
                        </button>
                        <span className="text-[11px] font-bold text-[#A8A29E] flex-1">{seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}</span>
                        {!confirmMasivo ? (
                            <button onClick={() => seleccionadas.size > 0 && setConfirmMasivo(true)}
                                disabled={seleccionadas.size === 0}
                                className={`h-9 px-4 rounded-xl font-bold text-[11px] uppercase active:scale-95 transition-all ${seleccionadas.size > 0 ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#A8A29E]'}`}>
                                Eliminar ({seleccionadas.size})
                            </button>
                        ) : (
                            <div className="flex gap-1.5">
                                <button onClick={() => setConfirmMasivo(false)}
                                    className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    No
                                </button>
                                <button onClick={eliminarMasivo}
                                    className="h-9 px-4 rounded-xl font-bold text-[11px] bg-[#D13A28] dark:bg-[#E8422F] text-white active:scale-95">
                                    Confirmar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal crear / editar */}
            {(modalCrear || ordenEditar) && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#242424] rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="md:hidden flex justify-center -mt-2 mb-4">
                            <div className="w-10 h-1 rounded-full bg-[#E8E5E0] dark:bg-[#3E3E3E]" />
                        </div>
                        <h2 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] mb-5">
                            {ordenEditar ? 'Editar orden' : 'Nueva orden'}
                        </h2>
                        <OrdenForm
                            orden={ordenEditar}
                            tecnicos={tecnicos}
                            onGuardar={ordenEditar ? (f) => actualizar(ordenEditar.id, f) : crear}
                            onCancelar={cerrarModal} />
                    </div>
                </div>
            )}
        </div>
    );
}
