import React, { useState, useEffect } from 'react';
import { useOrdenes } from '../../hooks/useOrdenes';
import OrdenForm from './OrdenForm';
import api from '../../services/api';
import { useMontos } from '../../context/MontosContext';
import { generarPDFRendimientoTecnicos } from '../../utils/pdf/rendimientoTecnicos';

const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-[#C0BCB6] dark:bg-[#2E2E2E]', tx: 'text-[#A8A29E]' },
    NORMAL:  { bg: 'bg-[#DBEAFE] dark:bg-[#1E3A5F]', tx: 'text-[#2563EB] dark:text-[#60A5FA]' },
    ALTA:    { bg: 'bg-[var(--warning-bg)]',           tx: 'text-[var(--warning-tx)]' },
    URGENTE: { bg: 'bg-[var(--danger-bg)]',            tx: 'text-[var(--danger-tx)]' },
};

const ESTADO_COLOR = {
    PENDIENTE:  { dot: '#A8A29E', label: 'Pendiente'  },
    EN_CAMINO:  { dot: '#3B82F6', label: 'En camino'  },
    EN_SITIO:   { dot: '#D48800', label: 'En sitio'   },
    COMPLETADA: { dot: '#16A34A', label: 'Completada' },
    CANCELADA:  { dot: '#D13A28', label: 'Cancelada'  },
};

function OrdenCard({ orden, onEditar, onEliminar, onAvanzar }) {
    const [expanded, setExpanded] = useState(false);
    const pr = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const es = ESTADO_COLOR[orden.estado] || ESTADO_COLOR.PENDIENTE;
    const esFinal = orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA';

    return (
        <div className="rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424]"
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${es.dot}` }}>
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-2 mb-2">
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

                {/* Técnico + monto */}
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-[#A8A29E]">👤 {orden.tecnicoNombre}</p>
                    {orden.montoEstimado && (
                        <span className="text-[11px] font-black text-[#D48800] dark:text-[#F0A500]">
                            ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transf.' : 'Efectivo'}
                        </span>
                    )}
                </div>

                {/* Cliente + dirección */}
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

                {/* Expandir descripción */}
                {(orden.descripcion || orden.notasTecnico) && (
                    <button onClick={() => setExpanded(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                        <span>Detalle</span>
                        <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
                    </button>
                )}
                {expanded && (
                    <div className="mt-2 p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C] space-y-1">
                        {orden.descripcion && <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{orden.descripcion}</p>}
                        {orden.notasTecnico && (
                            <p className="text-[11px] text-[#16A34A] dark:text-[#4ADE80] leading-snug">
                                📝 Nota técnico: {orden.notasTecnico}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                {!esFinal && (
                    <button onClick={() => onEditar(orden)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">✏️</button>
                )}
                <div className="flex-1" />
                {!esFinal && (
                    <button onClick={() => window.confirm('¿Cancelar esta orden?') && onAvanzar(orden.id, 'CANCELADA')}
                        className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                        Cancelar
                    </button>
                )}
                <button onClick={() => onEliminar(orden.id)}
                    className="h-9 px-3 rounded-xl font-bold text-[11px] bg-[#1C1917] dark:bg-[#2E2E2E] text-white active:scale-95">
                    🗑️
                </button>
            </div>
        </div>
    );
}

// ── Tab rendimiento del mes actual ────────────────────────────────────────────
function RendimientoMes() {
    const { ocultar } = useMontos();
    const [datos,    setDatos]    = useState([]);
    const [cargando, setCargando] = useState(false);

    const cargar = () => {
        setCargando(true);
        api.get('/servicios/rendimiento/mes-actual')
            .then(r => setDatos(r.data || []))
            .catch(() => setDatos([]))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fmt = v => ocultar ? '••••' : `$${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;

    const periodo = datos[0]?.periodo || new Date().toISOString().slice(0, 7);
    const meses   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const [y, m]  = periodo.split('-');
    const labelMes = `${meses[parseInt(m, 10) - 1]} ${y}`;

    const totFact  = datos.reduce((s, d) => s + Number(d.totalFacturado || 0), 0);
    const totParte = datos.reduce((s, d) => s + Number(d.parteTecnico   || 0), 0);
    const totTrab  = datos.reduce((s, d) => s + (d.cantidadTrabajos || 0), 0);

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;

    return (
        <div>
            {/* Resumen rápido */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    { label: 'Trabajos', valor: totTrab, mono: false },
                    { label: 'Facturado', valor: fmt(totFact), mono: true },
                    { label: 'A pagar técnicos', valor: fmt(totParte), mono: true, gold: true },
                ].map(({ label, valor, gold }) => (
                    <div key={label} className="rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] p-3 text-center"
                        style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-[16px] font-black ${gold ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                            {valor}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tabla por técnico */}
            {datos.length === 0 ? (
                <p className="text-center text-[#A8A29E] py-12">Sin trabajos este mes</p>
            ) : (
                <div className="rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424]"
                    style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    {/* Cabecera tabla */}
                    <div className="grid grid-cols-[1fr_60px_90px_90px] px-4 py-2 bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                        {['Técnico','Trabajos','Facturado','Su parte'].map(h => (
                            <p key={h} className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider text-center first:text-left">{h}</p>
                        ))}
                    </div>
                    {/* Filas */}
                    {datos.map((d, i) => (
                        <div key={d.tecnicoId}
                            className={`grid grid-cols-[1fr_60px_90px_90px] px-4 py-3 items-center ${i < datos.length - 1 ? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
                            <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{d.tecnicoNombre}</p>
                            <p className="text-[12px] font-bold text-[#A8A29E] text-center">{d.cantidadTrabajos}</p>
                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] text-right">{fmt(d.totalFacturado)}</p>
                            <p className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500] text-right">{fmt(d.parteTecnico)}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 mt-5 justify-end">
                <button onClick={cargar}
                    className="h-9 px-4 rounded-2xl font-black text-[11px] uppercase bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                    Recargar
                </button>
                {datos.length > 0 && (
                    <button onClick={() => generarPDFRendimientoTecnicos({ datos, periodo })}
                        className="h-9 px-4 rounded-2xl font-black text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all">
                        Exportar PDF
                    </button>
                )}
            </div>

            <p className="text-[10px] text-[#A8A29E] text-center mt-3">
                Ganancia neta = Facturado − 30% impuestos − repuestos · Su parte = 50%
            </p>
        </div>
    );
}

export default function DespachoManager() {
    const {
        ordenes, tecnicos, cargando,
        desde, setDesde, hasta, setHasta,
        modalCrear, setModalCrear,
        ordenEditar, abrirEditar, cerrarModal,
        crear, actualizar, eliminar, avanzarEstado,
    } = useOrdenes();

    const [tab, setTab] = useState('ordenes');
    const [filtrTecnico, setFiltrTecnico] = useState('');

    const ordenesFiltradas = filtrTecnico
        ? ordenes.filter(o => String(o.tecnicoId) === filtrTecnico)
        : ordenes;

    // Agrupar por técnico
    const grupos = ordenesFiltradas.reduce((acc, o) => {
        const key = `${o.tecnicoId}__${o.tecnicoNombre}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(o);
        return acc;
    }, {});

    const totalActivas = ordenes.filter(o => !['COMPLETADA','CANCELADA'].includes(o.estado)).length;
    const totalHoy     = ordenes.filter(o => o.fechaProgramada === new Date().toISOString().split('T')[0]).length;

    return (
        <div className="p-4 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Despacho</h1>
                    <p className="text-[11px] text-[#A8A29E]">{totalActivas} activas · {totalHoy} hoy</p>
                </div>
                {tab === 'ordenes' && (
                    <button onClick={() => setModalCrear(true)}
                        className="h-10 px-4 rounded-2xl font-black text-[13px] text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all">
                        + Nueva orden
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-[#D8D4CE] dark:bg-[#1C1C1C] p-1 rounded-2xl">
                {[{ id: 'ordenes', label: 'Órdenes' }, { id: 'rendimiento', label: 'Rendimiento del mes' }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 rounded-xl font-black text-[12px] uppercase tracking-wide transition-all active:scale-95
                            ${tab === t.id
                                ? 'bg-[#EDEAE6] dark:bg-[#242424] text-[#1C1917] dark:text-[#F0EEE9]'
                                : 'text-[#A8A29E]'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab rendimiento */}
            {tab === 'rendimiento' && <RendimientoMes />}

            {/* Tab órdenes */}
            {tab === 'ordenes' && <>
            {/* Filtros */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                    className="px-3 py-2 rounded-xl text-[12px] font-bold bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] outline-none" />
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                    className="px-3 py-2 rounded-xl text-[12px] font-bold bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] outline-none" />
                <select value={filtrTecnico} onChange={e => setFiltrTecnico(e.target.value)}
                    className="px-3 py-2 rounded-xl text-[12px] font-bold bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] outline-none">
                    <option value="">Todos los técnicos</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
            </div>

            {/* Lista agrupada por técnico */}
            {cargando ? (
                <p className="text-center text-[#A8A29E] py-12">Cargando...</p>
            ) : Object.keys(grupos).length === 0 ? (
                <p className="text-center text-[#A8A29E] py-12">Sin órdenes en el período seleccionado</p>
            ) : (
                Object.entries(grupos).map(([key, items]) => {
                    const nombre = key.split('__')[1];
                    const activas = items.filter(o => !['COMPLETADA','CANCELADA'].includes(o.estado)).length;
                    return (
                        <div key={key} className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-wider">
                                    👤 {nombre}
                                </p>
                                {activas > 0 && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D13A28] dark:bg-[#E8422F] text-white">
                                        {activas} activa{activas > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-3">
                                {items.map(o => (
                                    <OrdenCard key={o.id} orden={o}
                                        onEditar={abrirEditar}
                                        onEliminar={eliminar}
                                        onAvanzar={avanzarEstado} />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            </>}

            {/* Modal crear / editar */}
            {(modalCrear || ordenEditar) && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#EDEAE6] dark:bg-[#242424] rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] mb-5">
                            {ordenEditar ? 'Editar orden' : 'Nueva orden'}
                        </h2>
                        <OrdenForm
                            orden={ordenEditar}
                            tecnicos={tecnicos}
                            onGuardar={ordenEditar
                                ? (f) => actualizar(ordenEditar.id, f)
                                : crear}
                            onCancelar={cerrarModal} />
                    </div>
                </div>
            )}
        </div>
    );
}
