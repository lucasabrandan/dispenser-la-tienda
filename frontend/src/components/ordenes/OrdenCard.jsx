import React, { useState } from 'react';
import { LuClipboardList, LuMapPin, LuUser, LuBuilding2, LuStickyNote, LuPencil, LuTrash2, LuCar } from 'react-icons/lu';
import { formatFechaCorta } from '../../utils/dateUtils';

// Extraído de DespachoManager.jsx (hub único de Servicio Técnico — ítem 4 paso 3 /
// ítem 17 opción 3): ServicioManager.jsx también necesita esta misma tarjeta para
// sus tabs Pendientes/En camino/En sitio (fusionadas desde Despacho), así que vive
// acá como pieza compartida en vez de duplicarse.

export const PRIORIDAD_COLOR = {
    BAJA:    { bg: 'bg-chip', tx: 'text-muted' },
    NORMAL:  { bg: 'bg-[#DBEAFE] dark:bg-[#1E3A5F]', tx: 'text-[#2563EB] dark:text-[#60A5FA]' },
    ALTA:    { bg: 'bg-[var(--warning-bg)]',           tx: 'text-[var(--warning-tx)]' },
    URGENTE: { bg: 'bg-[var(--danger-bg)]',            tx: 'text-[var(--danger-tx)]' },
};

export const ESTADO_COLOR = {
    PENDIENTE:   { dot: '#A8A29E', label: 'Pendiente'    },
    EN_CAMINO:   { dot: '#3B82F6', label: 'En camino'    },
    EN_SITIO:    { dot: '#D48800', label: 'En sitio'     },
    COMPLETADA:  { dot: '#16A34A', label: 'Completada'   },
    CANCELADA:   { dot: '#D13A28', label: 'Cancelada'    },
    NO_ATENDIDO: { dot: '#DC2626', label: 'No atendido'  },
};

// Mismo atajo que ya tiene el técnico en su celu (Salir/Llegué) — antes vos no
// tenías forma de empujar una orden si a Marcos se le corta la batería o se
// olvida. Se corta en "En sitio" a propósito: cerrar el trabajo pide datos
// (costo, modalidad de cobro) que no tiene sentido completar a ciegas por él.
export const SIGUIENTE_ESTADO_ADMIN = {
    PENDIENTE: { estado: 'EN_CAMINO', label: 'Salió',  color: 'bg-[#3B82F6]', Icon: LuCar },
    EN_CAMINO: { estado: 'EN_SITIO',  label: 'Llegó',  color: 'bg-brand-amber', Icon: LuMapPin },
};

export function OrdenCard({ orden, onEditar, onEliminar, onAvanzar, seleccionando, seleccionada, onToggleSel }) {
    const [expanded, setExpanded] = useState(false);
    const [confirmElim, setConfirmElim] = useState(false);
    const pr = PRIORIDAD_COLOR[orden.prioridad] || PRIORIDAD_COLOR.NORMAL;
    const es = ESTADO_COLOR[orden.estado] || ESTADO_COLOR.PENDIENTE;
    const esFinal = ['COMPLETADA', 'CANCELADA'].includes(orden.estado);
    const esNoAtendido = orden.estado === 'NO_ATENDIDO';

    return (
        <div className={`rounded-2xl overflow-hidden bg-card transition-all ${seleccionando && seleccionada ? 'ring-2 ring-brand-red' : ''}`}
            style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${es.dot}` }}
            onClick={seleccionando ? () => onToggleSel(orden.id) : undefined}>
            <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                    {seleccionando && (
                        <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${seleccionada ? 'bg-brand-red border-brand-red' : 'border-muted bg-transparent'}`}>
                            {seleccionada && <span className="text-white text-label font-black">✓</span>}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-label font-black px-2 py-0.5 rounded-md uppercase ${pr.bg} ${pr.tx}`}>
                                {orden.prioridad}
                            </span>
                            <span className="flex items-center gap-1 text-label font-bold text-muted">
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: es.dot, display: 'inline-block' }} />
                                {es.label}
                            </span>
                        </div>
                        <p className="font-black text-body-lg text-ink leading-tight">{orden.titulo}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-body font-black text-ink">{orden.horaEstimada || '—'}</p>
                        <p className="text-caption text-muted">{formatFechaCorta(orden.fechaProgramada)}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-caption font-bold text-muted flex items-center gap-1"><LuUser size={11} />{orden.tecnicoNombre}</p>
                    {orden.montoEstimado && (
                        <span className="text-body font-black text-brand-amber">
                            ${Number(orden.montoEstimado).toLocaleString('es-AR')} · {orden.formaPago === 'TRANSFERENCIA' ? 'Transf.' : 'Efectivo'}
                        </span>
                    )}
                </div>

                {orden.clienteNombre && (
                    <p className="text-caption text-muted mt-0.5 flex items-center gap-1"><LuBuilding2 size={11} />{orden.clienteNombre}{orden.clienteTelefono ? ` · ${orden.clienteTelefono}` : ''}</p>
                )}
                {orden.direccion && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(orden.direccion)}`}
                        target="_blank" rel="noreferrer"
                        className="text-caption text-[#3B82F6] dark:text-[#60A5FA] mt-0.5 flex items-center gap-1 hover:underline">
                        <LuMapPin size={11} />{orden.direccion}
                    </a>
                )}
                {orden.presupuestoId && (
                    <p className="text-label font-bold text-brand-amber mt-0.5 flex items-center gap-1">
                        <LuClipboardList size={11} /> Presupuesto #{orden.presupuestoId} vinculado
                    </p>
                )}
                {esNoAtendido && (
                    <p className="text-caption font-black text-[#DC2626] mt-1">
                        El tecnico reporto que no fue atendido. Reprograma o cancela.
                    </p>
                )}

                {(orden.descripcion || orden.notasTecnico) && (
                    <button onClick={() => setExpanded(v => !v)}
                        className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-bold bg-panel text-secondary active:scale-95 transition-all">
                        <span>Detalle</span>
                        <span className="text-label">{expanded ? '▲' : '▼'}</span>
                    </button>
                )}
                {expanded && (
                    <div className="mt-2 p-3 rounded-xl bg-panel space-y-1">
                        {orden.descripcion && <p className="text-caption text-secondary leading-snug">{orden.descripcion}</p>}
                        {orden.notasTecnico && (
                            <p className="text-caption text-brand-green leading-snug flex items-center gap-1">
                                <LuStickyNote size={12} /> Nota técnico: {orden.notasTecnico}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {!seleccionando && (
                <div className="flex items-center gap-2 px-4 py-3 bg-panel border-t border-black/[0.06] dark:border-white/[0.06]">
                    {!esFinal && (
                        <button onClick={() => onEditar(orden)}
                            className="h-9 px-3 rounded-xl font-bold text-label bg-chip text-secondary active:scale-95 flex items-center gap-1">
                            <LuPencil size={13} /> Editar
                        </button>
                    )}
                    {SIGUIENTE_ESTADO_ADMIN[orden.estado] && (
                        <button onClick={() => onAvanzar(orden.id, SIGUIENTE_ESTADO_ADMIN[orden.estado].estado)}
                            className={`h-9 px-3 rounded-xl font-bold text-label text-white active:scale-95 flex items-center gap-1 ${SIGUIENTE_ESTADO_ADMIN[orden.estado].color}`}>
                            {(() => { const SIcon = SIGUIENTE_ESTADO_ADMIN[orden.estado].Icon; return <SIcon size={13} />; })()}
                            {SIGUIENTE_ESTADO_ADMIN[orden.estado].label}
                        </button>
                    )}
                    <div className="flex-1" />
                    {!confirmElim ? (
                        <button onClick={() => setConfirmElim(true)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm active:scale-90 bg-chip text-muted">
                            <LuTrash2 size={15} />
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setConfirmElim(false)}
                                className="h-9 px-3 rounded-xl font-bold text-label bg-chip text-secondary active:scale-95">
                                No
                            </button>
                            <button onClick={() => { setConfirmElim(false); onEliminar(orden.id); }}
                                className="h-9 px-3 rounded-xl font-bold text-label bg-brand-red text-white active:scale-95">
                                Sí, eliminar
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default OrdenCard;
