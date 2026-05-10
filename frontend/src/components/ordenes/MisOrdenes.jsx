import React, { useState, useEffect } from 'react';
import { useOrdenes } from '../../hooks/useOrdenes';
import api from '../../services/api';
import EjecutarOrdenSheet from '../servicio/EjecutarOrdenSheet';

const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-[#C0BCB6] dark:bg-[#2E2E2E]', tx: 'text-[#A8A29E]' },
    NORMAL:  { bg: 'bg-[#DBEAFE] dark:bg-[#1E3A5F]', tx: 'text-[#2563EB] dark:text-[#60A5FA]' },
    ALTA:    { bg: 'bg-[var(--warning-bg)]',           tx: 'text-[var(--warning-tx)]' },
    URGENTE: { bg: 'bg-[var(--danger-bg)]',            tx: 'text-[var(--danger-tx)]' },
};

const BORDER_COLOR = {
    PENDIENTE:  '#A8A29E',
    EN_CAMINO:  '#3B82F6',
    EN_SITIO:   '#D48800',
    COMPLETADA: '#16A34A',
    CANCELADA:  '#D13A28',
};

const SIGUIENTE_ESTADO = {
    PENDIENTE:  { estado: 'EN_CAMINO', label: '🚗 Salir', color: 'bg-[#3B82F6]' },
    EN_CAMINO:  { estado: 'EN_SITIO',  label: '📍 Llegué', color: 'bg-[#D48800] dark:bg-[#F0A500]' },
    EN_SITIO:   { estado: 'COMPLETADA', label: '✓ Completar', color: 'bg-[#16A34A]' },
};

function OrdenCard({ orden, onAvanzar, onEjecutar }) {
    const [expandido, setExpandido] = useState(false);
    const [nota, setNota]           = useState('');
    const [confirmando, setConfirmando] = useState(false);

    const pr  = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const sig = SIGUIENTE_ESTADO[orden.estado];
    const esFinal = orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA';

    const handleAvanzar = () => {
        if (orden.estado === 'EN_SITIO' && !confirmando) {
            setConfirmando(true);
            return;
        }
        onAvanzar(orden.id, sig.estado, nota);
        setConfirmando(false);
        setNota('');
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424]"
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${BORDER_COLOR[orden.estado] || '#A8A29E'}` }}>
            <div className="p-4">
                {/* Prioridad + título + hora */}
                <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${pr.bg} ${pr.tx}`}>
                                {orden.prioridad}
                            </span>
                        </div>
                        <p className="font-black text-[15px] text-[#1C1917] dark:text-[#F0EEE9] leading-tight">{orden.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">{orden.horaEstimada || '—'}</p>
                        <p className="text-[10px] text-[#A8A29E]">{orden.fechaProgramada}</p>
                    </div>
                </div>

                {/* Cliente — solo visible mientras la orden está activa */}
                {!esFinal && orden.clienteNombre && (
                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] font-bold">🏢 {orden.clienteNombre}</p>
                )}

                {/* Monto estimado + forma de pago — solo visible mientras la orden está activa */}
                {!esFinal && orden.montoEstimado && (
                    <p className="text-[12px] font-black text-[#D48800] dark:text-[#F0A500] mt-0.5">
                        💰 ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transferencia' : 'Efectivo'}
                    </p>
                )}

                {/* Dirección con link a Maps — solo visible mientras la orden está activa */}
                {!esFinal && orden.direccion && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                        target="_blank" rel="noreferrer"
                        className="text-[12px] text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 flex items-center gap-1 hover:underline">
                        📍 {orden.direccion}
                        <span className="text-[10px]">↗</span>
                    </a>
                )}

                {/* Instrucciones — solo visibles mientras la orden está activa */}
                {!esFinal && orden.descripcion && (
                    <>
                        <button onClick={() => setExpandido(v => !v)}
                            className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                            <span>Instrucciones</span>
                            <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                        </button>
                        {expandido && (
                            <div className="mt-2 p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                                <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{orden.descripcion}</p>
                            </div>
                        )}
                    </>
                )}

                {/* Nota del técnico al completar */}
                {confirmando && (
                    <div className="mt-3">
                        <p className="text-[11px] font-black text-[#A8A29E] uppercase tracking-wider mb-1">
                            Nota (opcional)
                        </p>
                        <textarea value={nota} onChange={e => setNota(e.target.value)}
                            rows={2} placeholder="Ej: Cambié filtros, cliente firmó remito..."
                            className="w-full px-3 py-2 rounded-xl text-[12px] bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-[#F0EEE9] outline-none resize-none" />
                    </div>
                )}

                {/* Nota guardada */}
                {orden.notasTecnico && !confirmando && (
                    <p className="mt-2 text-[11px] text-[#16A34A] dark:text-[#4ADE80]">
                        📝 {orden.notasTecnico}
                    </p>
                )}
            </div>

            {/* Barra acciones */}
            {!esFinal && sig && (
                <div className="flex gap-2 px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                    style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    {confirmando && (
                        <button onClick={() => setConfirmando(false)}
                            className="flex-1 py-2.5 rounded-xl font-bold text-[12px] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                            Cancelar
                        </button>
                    )}
                    {!confirmando && onEjecutar && (
                        <button onClick={() => onEjecutar(orden)}
                            className="py-2.5 px-3 rounded-xl font-bold text-[11px] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all whitespace-nowrap">
                            🔧 Ejecutar
                        </button>
                    )}
                    <button onClick={handleAvanzar}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[13px] text-white active:scale-95 transition-all ${sig.color}`}>
                        {confirmando ? '✓ Confirmar' : sig.label}
                    </button>
                </div>
            )}
        </div>
    );
}

const MESES_ES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function RendimientoTab({ tecnicoId }) {
    const [datos,    setDatos]    = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!tecnicoId) return;
        setCargando(true);
        api.get(`/servicios/tecnico/${tecnicoId}/rendimiento`)
            .then(r => setDatos(r.data || []))
            .catch(() => setDatos([]))
            .finally(() => setCargando(false));
    }, [tecnicoId]);

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;

    if (datos.length === 0) return (
        <p className="text-center text-[#A8A29E] py-12">Sin trabajos registrados aún</p>
    );

    // Totales acumulados
    const totalFact = datos.reduce((s, d) => s + parseFloat(d.totalFacturado || 0), 0);
    const totalGan  = datos.reduce((s, d) => s + parseFloat(d.totalGanancia  || 0), 0);

    const fmt = (n) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
    const labelMes = (periodo) => {
        const [y, m] = periodo.split('-');
        return `${MESES_ES[parseInt(m)]} ${y}`;
    };

    return (
        <div className="space-y-4">
            {/* Acumulado total */}
            <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424]"
                style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-3">
                    Total acumulado
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[10px] text-[#A8A29E] uppercase font-bold mb-0.5">Facturado</p>
                        <p className="text-[22px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none">
                            ${fmt(totalFact)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-[#A8A29E] uppercase font-bold mb-0.5">Ganancia</p>
                        <p className="text-[22px] font-black text-[#D48800] dark:text-[#F0A500] leading-none">
                            ${fmt(totalGan)}
                        </p>
                    </div>
                </div>
                <p className="text-[11px] text-[#A8A29E] mt-2">
                    {datos.reduce((s, d) => s + d.cantidadServicios, 0)} servicios · {datos.length} {datos.length === 1 ? 'mes' : 'meses'}
                </p>
            </div>

            {/* Desglose por mes */}
            <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest px-1">Por mes</p>
            {datos.map(d => (
                <div key={d.periodo} className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424]"
                    style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] capitalize">
                            {labelMes(d.periodo)}
                        </p>
                        <span className="text-[10px] font-bold text-[#A8A29E] bg-[#D8D4CE] dark:bg-[#1C1C1C] px-2 py-0.5 rounded-md">
                            {d.cantidadServicios} {d.cantidadServicios === 1 ? 'trabajo' : 'trabajos'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-[9px] text-[#A8A29E] uppercase font-bold">Facturado</p>
                            <p className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                ${fmt(d.totalFacturado)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-[#A8A29E] uppercase font-bold">Ganancia</p>
                            <p className="text-[16px] font-black text-[#D48800] dark:text-[#F0A500]">
                                ${fmt(d.totalGanancia)}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function MisOrdenes({ tecnicoId, onEjecutarOrden }) {
    const { ordenes, cargando, avanzarEstado, recargar } = useOrdenes({ tecnicoId });
    const [tab, setTab] = useState('activas');

    // Estado para abrir EjecutarOrdenSheet directamente (órdenes con presupuesto vinculado)
    const [servicioEjecutando, setServicioEjecutando] = useState(null);
    const [ordenEjecutandoId, setOrdenEjecutandoId] = useState(null);

    const handleEjecutar = async (orden) => {
        if (orden.presupuestoId) {
            // Orden con presupuesto vinculado: abrir EjecutarOrdenSheet directamente
            try {
                const res = await api.get(`/servicios/${orden.presupuestoId}`);
                setServicioEjecutando(res.data);
                setOrdenEjecutandoId(orden.id);
            } catch {
                // Si falla, caer al flujo normal
                onEjecutarOrden(orden);
            }
        } else {
            onEjecutarOrden(orden);
        }
    };

    const handleConfirmado = async () => {
        // Avanzar la orden a COMPLETADA para impactar rendimientos
        if (ordenEjecutandoId) {
            try {
                await api.patch(`/ordenes/${ordenEjecutandoId}/estado`, { estado: 'COMPLETADA' });
            } catch { /* la orden se puede completar manualmente si falla */ }
        }
        setServicioEjecutando(null);
        setOrdenEjecutandoId(null);
        if (recargar) recargar();
    };

    const activas     = ordenes.filter(o => !['COMPLETADA','CANCELADA'].includes(o.estado));
    const completadas = ordenes.filter(o => o.estado === 'COMPLETADA');
    const lista = tab === 'activas' ? activas : completadas;

    // Agrupar activas/completadas por fecha
    const porFecha = lista.reduce((acc, o) => {
        const k = o.fechaProgramada;
        if (!acc[k]) acc[k] = [];
        acc[k].push(o);
        return acc;
    }, {});

    const hoy = new Date().toISOString().split('T')[0];

    const formatFecha = (f) => {
        if (f === hoy) return 'Hoy';
        const d = new Date(f + 'T00:00:00');
        return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const TABS = [
        { id: 'activas',      label: `Activas (${activas.length})` },
        { id: 'historial',    label: `Completadas (${completadas.length})` },
        { id: 'rendimiento',  label: '📊 Rendimiento' },
    ];

    return (
        <>
        <div className="p-4 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-5">
                <h1 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Mis Órdenes</h1>
                <p className="text-[11px] text-[#A8A29E]">{activas.length} pendiente{activas.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`shrink-0 px-4 py-2 rounded-xl font-bold text-[12px] transition-all active:scale-95 ${
                            tab === t.id
                                ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                : 'bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido de cada tab */}
            {tab === 'rendimiento' ? (
                <RendimientoTab tecnicoId={tecnicoId} />
            ) : cargando ? (
                <p className="text-center text-[#A8A29E] py-12">Cargando...</p>
            ) : lista.length === 0 ? (
                <p className="text-center text-[#A8A29E] py-12">
                    {tab === 'activas' ? '🎉 Sin órdenes pendientes' : 'Sin historial aún'}
                </p>
            ) : (
                Object.entries(porFecha).map(([fecha, items]) => (
                    <div key={fecha} className="mb-6">
                        <p className="text-[11px] font-black text-[#A8A29E] uppercase tracking-wider mb-3 capitalize">
                            {formatFecha(fecha)}
                        </p>
                        <div className="space-y-3">
                            {items.map(o => (
                                <OrdenCard key={o.id} orden={o} onAvanzar={avanzarEstado} onEjecutar={handleEjecutar} />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Overlay EjecutarOrdenSheet para órdenes con presupuesto vinculado */}
        {servicioEjecutando && (
            <EjecutarOrdenSheet
                servicio={servicioEjecutando}
                onConfirmado={handleConfirmado}
                onCerrar={() => { setServicioEjecutando(null); setOrdenEjecutandoId(null); }}
            />
        )}
        </>
    );
}
