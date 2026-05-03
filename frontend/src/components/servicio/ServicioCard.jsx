import React, { useState } from 'react';
import { useMontos } from '../../context/MontosContext';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
}

const BADGE = {
    PRESUPUESTO: { label: 'Pendiente', cls: 'bg-[var(--warning-bg)] text-[var(--warning-tx)]' },
    REALIZADO:   { label: 'Realizado', cls: 'bg-[var(--success-bg)] text-[var(--success-tx)]' },
    RECHAZADO:   { label: 'Rechazado', cls: 'bg-[var(--danger-bg)]  text-[var(--danger-tx)]'  },
    ARCHIVADO:   { label: 'Archivado', cls: 'bg-[#C0BCB6] text-[#57534E] dark:bg-[#2E2E2E] dark:text-[#9E9A94]' },
};

const BORDER = {
    PRESUPUESTO: '#D48800',
    REALIZADO:   '#16A34A',
    RECHAZADO:   '#D13A28',
    ARCHIVADO:   '#A8A29E',
};

export default function ServicioCard({
    servicio, modoSeleccion, seleccionado,
    onToggleSelect, onEditar, onEjecutar, onCobrar,
    onRechazar, onArchivar, onGenerarPDF, onDetalle, calcularTotal,
}) {
    const [expandido, setExpandido] = useState(false);
    const badge   = BADGE[servicio.estado] || { label: servicio.estado, cls: '' };
    const total   = calcularTotal(servicio);
    const esPpto  = servicio.estado === 'PRESUPUESTO';
    const esArch  = servicio.estado === 'ARCHIVADO';

    return (
        <div
            className={`rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424] transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${BORDER[servicio.estado] || '#A8A29E'}` }}
        >
            <div className="p-4">
                {/* Fila superior: id + badge + monto */}
                <div className="flex items-start gap-2 mb-2">
                    {modoSeleccion && (
                        <button onClick={() => onToggleSelect(servicio.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#C0BCB6] dark:border-[#2E2E2E]'}`}>
                            {seleccionado && <span className="text-white text-[10px] font-black">✓</span>}
                        </button>
                    )}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-[#A8A29E] shrink-0">#{servicio.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${badge.cls}`}>{badge.label}</span>
                        {servicio.nroDocumento && (
                            <span className="text-[9px] font-bold text-[#A8A29E] truncate">{servicio.nroDocumento}</span>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <M valor={total} className="text-[18px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{servicio.fecha}</p>
                    </div>
                </div>

                {/* Cliente + sede + técnico */}
                <p className="font-bold text-[15px] text-[#1C1917] dark:text-[#F0EEE9] leading-tight">{servicio.clienteNombre}</p>
                <p className="text-[11px] text-[#A8A29E] mt-0.5">📍 {servicio.sedeNombre}</p>
                {servicio.usuarioNombre && (
                    <p className="text-[10px] text-[#A8A29E] mt-0.5">👤 {servicio.usuarioNombre}</p>
                )}

                {/* Toggle detalle */}
                {servicio.items?.length > 0 && (
                    <button onClick={() => setExpandido(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">
                        <span>Detalle · {servicio.items.length} equipo{servicio.items.length > 1 ? 's' : ''}</span>
                        <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {/* Detalle expandido */}
                {expandido && servicio.items?.map((it, i) => (
                    <div key={i} className="mt-2 p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                        <div className="flex justify-between mb-1">
                            <span className="text-[11px] font-black text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
                            <M valor={Number(it.costo || 0)} className="text-[11px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                        </div>
                        {(it.equipoUbicacion || it.equipoPiso || it.equipoSector) && (
                            <p className="text-[10px] text-[#A8A29E]">
                                📍 {[it.equipoUbicacion, it.equipoPiso && `Piso ${it.equipoPiso}`, it.equipoSector].filter(Boolean).join(' · ')}
                            </p>
                        )}
                        <p className="text-[10px] text-[#57534E] dark:text-[#9E9A94] mt-1 leading-snug">{it.trabajoRealizado}</p>
                        {it.repuestosUsados?.length > 0 && (
                            <p className="text-[9px] text-[#A8A29E] mt-1">
                                Repuestos: {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Barra acciones */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                 style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                {esPpto && (
                    <button onClick={() => onEditar(servicio)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">✏️</button>
                )}
                <button onClick={() => onDetalle(servicio)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">👁️</button>
                <button onClick={() => onGenerarPDF(servicio)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-[#C0BCB6] dark:bg-[#2E2E2E]">📄</button>

                <div className="flex-1" />

                {!esArch && (
                    <button onClick={() => onArchivar(servicio.id)}
                        className="h-9 px-3 rounded-xl font-bold text-[11px] active:scale-95 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]"
                        title="Archivar">🗄️</button>
                )}
                {esPpto && (
                    <>
                        <button onClick={() => onRechazar(servicio.id)}
                            className="h-9 px-3 rounded-xl font-bold text-xs text-white active:scale-95 bg-[#1C1917] dark:bg-[#2E2E2E]">✗</button>
                        <button onClick={() => onEjecutar(servicio)}
                            className="h-9 px-3 rounded-xl font-bold text-xs text-white active:scale-95 bg-[#D48800] dark:bg-[#F0A500]">
                            🔧 Ejecutar</button>
                        <button onClick={() => onCobrar(servicio.id)}
                            className="h-9 px-3 rounded-xl font-bold text-xs text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">
                            ✓ Cobrar</button>
                    </>
                )}
            </div>
        </div>
    );
}
