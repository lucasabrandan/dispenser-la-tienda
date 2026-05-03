import React, { useState } from 'react';
import { useOrdenes } from '../../hooks/useOrdenes';

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

function OrdenCard({ orden, onAvanzar }) {
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

                {/* Cliente */}
                {orden.clienteNombre && (
                    <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] font-bold">🏢 {orden.clienteNombre}</p>
                )}

                {/* Dirección con link a Maps */}
                {orden.direccion && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                        target="_blank" rel="noreferrer"
                        className="text-[12px] text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 flex items-center gap-1 hover:underline">
                        📍 {orden.direccion}
                        <span className="text-[10px]">↗</span>
                    </a>
                )}

                {/* Descripción expandible */}
                {orden.descripcion && (
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
                    <button onClick={handleAvanzar}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[13px] text-white active:scale-95 transition-all ${sig.color}`}>
                        {confirmando ? '✓ Confirmar' : sig.label}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function MisOrdenes({ tecnicoId }) {
    const { ordenes, cargando, avanzarEstado } = useOrdenes({ tecnicoId });
    const [tab, setTab] = useState('activas');

    const activas    = ordenes.filter(o => !['COMPLETADA','CANCELADA'].includes(o.estado));
    const completadas = ordenes.filter(o => o.estado === 'COMPLETADA');
    const lista = tab === 'activas' ? activas : completadas;

    // Agrupar activas por fecha
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

    return (
        <div className="p-4 max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-5">
                <h1 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Mis Órdenes</h1>
                <p className="text-[11px] text-[#A8A29E]">{activas.length} pendiente{activas.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5">
                {[{ id: 'activas', label: `Activas (${activas.length})` }, { id: 'historial', label: `Completadas (${completadas.length})` }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-xl font-bold text-[12px] transition-all active:scale-95 ${
                            tab === t.id
                                ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                : 'bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {cargando ? (
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
                                <OrdenCard key={o.id} orden={o} onAvanzar={avanzarEstado} />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
