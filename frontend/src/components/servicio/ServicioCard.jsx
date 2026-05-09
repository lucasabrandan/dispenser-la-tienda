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

function IconBtn({ onClick, title, children, cls = '' }) {
    return (
        <button onClick={onClick} title={title}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 shrink-0 ${cls}`}>
            {children}
        </button>
    );
}

export default function ServicioCard({
    servicio, modoSeleccion, seleccionado,
    onToggleSelect, onEditar, onEjecutar, onCobrar,
    onRechazar, onArchivar, onEliminar, onGenerarPDF, onDetalle, calcularTotal,
}) {
    const [expandido, setExpandido] = useState(false);

    const badge    = BADGE[servicio.estado] || { label: servicio.estado, cls: '' };
    const total    = calcularTotal(servicio);
    const esPpto   = servicio.estado === 'PRESUPUESTO';
    const esArch   = servicio.estado === 'ARCHIVADO';

    // Chips de info rápida del primer ítem
    const items       = servicio.items || [];
    const primerItem  = items[0];
    const seriales    = items.map(it => it.equipoSerial).filter(Boolean);
    const ubicInfo    = primerItem
        ? [
            primerItem.equipoUbicacion,
            primerItem.equipoPiso  && `P${primerItem.equipoPiso}`,
            primerItem.equipoSector,
          ].filter(Boolean).join(' · ')
        : '';

    return (
        <div
            className={`rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] transition-all ${seleccionado ? 'ring-2 ring-[#D13A28]' : ''}`}
            style={{ borderLeft: `3px solid ${BORDER[servicio.estado] || '#A8A29E'}` }}
        >
            <div className="p-4">
                {/* Fila 1: checkbox + badge + id + monto + fecha */}
                <div className="flex items-start gap-2 mb-2.5">
                    {modoSeleccion && (
                        <button
                            onClick={() => onToggleSelect(servicio.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${seleccionado ? 'bg-[#D13A28] border-[#D13A28]' : 'border-[#C0BCB6] dark:border-[#3E3E3E]'}`}
                        >
                            {seleccionado && <span className="text-white text-[9px] font-black">✓</span>}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase shrink-0 ${badge.cls}`}>
                            {badge.label}
                        </span>
                        <span className="text-[11px] font-bold text-[#A8A29E] shrink-0">#{servicio.id}</span>
                        {servicio.nroDocumento && (
                            <span className="text-[9px] text-[#A8A29E] truncate">{servicio.nroDocumento}</span>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <M valor={total} className="text-[17px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block" />
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">{servicio.fecha}</p>
                    </div>
                </div>

                {/* Fila 2: cliente */}
                <p className="font-black text-[16px] leading-tight text-[#1C1917] dark:text-[#F0EEE9] mb-1">
                    {servicio.clienteNombre}
                </p>

                {/* Fila 3: sede + técnico */}
                <div className="flex items-center gap-3 text-[11px] text-[#A8A29E] flex-wrap">
                    {servicio.sedeNombre    && <span>📍 {servicio.sedeNombre}</span>}
                    {servicio.usuarioNombre && <span>👤 {servicio.usuarioNombre}</span>}
                </div>

                {/* Fila 4: chips serie + ubicación */}
                {(seriales.length > 0 || ubicInfo) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {seriales.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]">
                                {s}
                            </span>
                        ))}
                        {seriales.length > 2 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#A8A29E]">
                                +{seriales.length - 2}
                            </span>
                        )}
                        {ubicInfo && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#A8A29E]">
                                {ubicInfo}
                            </span>
                        )}
                    </div>
                )}

                {/* Toggle detalle */}
                {items.length > 0 && (
                    <button
                        onClick={() => setExpandido(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.98] bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[#57534E] dark:text-[#9E9A94]"
                    >
                        <span>Detalle trabajo · {items.length} equipo{items.length > 1 ? 's' : ''}</span>
                        <span className="text-[10px]">{expandido ? '▲' : '▼'}</span>
                    </button>
                )}

                {/* Detalle expandido por equipo */}
                {expandido && items.map((it, i) => (
                    <div key={i} className="mt-2 p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.05]">
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="min-w-0">
                                <span className="text-[12px] font-black text-[#D13A28] dark:text-[#E8422F]">{it.equipoSerial}</span>
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
                            <div className="mt-1.5 pt-1.5 border-t border-black/[0.05] dark:border-white/[0.05]">
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {it.repuestosUsados.map((r, ri) => (
                                        <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">
                                            {r.cantidad}× {r.nombre}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#D8D4CE] dark:bg-[#1C1C1C] border-t border-black/[0.06]">
                {/* Izquierda: ver · pdf · editar */}
                <IconBtn onClick={() => onDetalle(servicio)} title="Ver detalle"
                    cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">👁️</IconBtn>
                <IconBtn onClick={() => onGenerarPDF(servicio)} title="Generar PDF"
                    cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">📄</IconBtn>
                {esPpto && (
                    <IconBtn onClick={() => onEditar(servicio)} title="Editar presupuesto"
                        cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">✏️</IconBtn>
                )}

                <div className="flex-1" />

                {/* Derecha: eliminar (admin) · archivar · rechazar · ejecutar · cobrar */}
                {onEliminar && (
                    <IconBtn onClick={() => onEliminar(servicio.id)} title="Eliminar definitivamente"
                        cls="bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F]">🗑️</IconBtn>
                )}
                {!esArch && (
                    <IconBtn onClick={() => onArchivar(servicio.id)} title="Archivar"
                        cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">🗄️</IconBtn>
                )}
                {esPpto && (
                    <>
                        <IconBtn onClick={() => onRechazar(servicio.id)} title="Rechazar"
                            cls="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]">✗</IconBtn>
                        <button
                            onClick={() => onEjecutar(servicio)}
                            className="h-9 px-3 rounded-xl font-bold text-[11px] text-white shrink-0 active:scale-95 transition-all bg-[#D48800] dark:bg-[#F0A500]"
                        >🔧 Ejecutar</button>
                        <button
                            onClick={() => onCobrar(servicio.id)}
                            className="h-9 px-3 rounded-xl font-bold text-[11px] text-white shrink-0 active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]"
                        >✓ Cobrar</button>
                    </>
                )}
            </div>
        </div>
    );
}
