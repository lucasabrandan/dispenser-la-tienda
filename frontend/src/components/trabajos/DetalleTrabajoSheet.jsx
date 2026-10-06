import React from 'react';
import { LuMapPin, LuClock, LuPencil, LuCalendarClock, LuFileText } from 'react-icons/lu';
import ModalShell from '../ui/ModalShell';
import AvatarTecnico from '../ui/AvatarTecnico';
import { M } from '../servicio/ServicioUI';
import { estadoLabel, etapaColor } from '../../utils/estados';
import { fechaAR } from '../../utils/dateUtils';

// Detalle de un trabajo (5-oct-2026). Antes mostraba solo N/S y monto; ahora el
// estado, quién va y cuándo, qué se hace en cada equipo, cómo se cobra, y las
// acciones a mano (editar, reprogramar, PDF). Mismo formato que la ficha del Panel.
const MODALIDAD = { EFECTIVO_SIN_FACTURA: 'Efectivo', CON_FACTURA: 'Con factura', TRANSFERENCIA: 'Transferencia' };
const ACTIVAS = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO'];

function Chip({ estado }) {
    const c = etapaColor(estado);
    return (
        <span className="inline-flex items-center h-6 px-2 rounded-lg text-label font-black uppercase tracking-wide"
            style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}>{estadoLabel(estado)}</span>
    );
}

const fila = 'flex items-center justify-between gap-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0';
const plata = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;

export default function DetalleTrabajoSheet({ servicio: s, orden, total, onCerrar, onEditar, onReprogramar, onPDF }) {
    const direccion = s.sedeDireccion || orden?.direccion;
    const ordenActiva = orden && ACTIVAS.includes(orden.estado);
    const hora = orden?.horaEstimada ? String(orden.horaEstimada).slice(0, 5) : null;
    const items = s.items || [];
    const accion = 'h-11 rounded-xl inline-flex items-center justify-center gap-1.5 text-label font-black active:scale-95 border border-black/10 dark:border-white/10 text-ink';

    return (
        <ModalShell titulo={s.clienteNombre || `Trabajo #${s.id}`}
            subtitulo={[s.sedeNombre, `#${s.id}`].filter(Boolean).join(' · ')}
            onCerrar={onCerrar}
            pie={
                <div className="space-y-2">
                    <div className="flex gap-2 [&>*]:flex-1">
                        {onEditar && <button type="button" onClick={onEditar} className={accion}><LuPencil size={14} /> Editar</button>}
                        {ordenActiva && onReprogramar
                            ? <button type="button" onClick={onReprogramar} className={accion}><LuCalendarClock size={14} /> Reprogramar</button>
                            : null}
                        {onPDF && <button type="button" onClick={onPDF} className={accion}><LuFileText size={14} /> PDF</button>}
                    </div>
                    <button type="button" onClick={onCerrar} className="w-full h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Cerrar</button>
                </div>
            }>
            <div className="space-y-4">
                {direccion && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-body font-bold text-ink underline underline-offset-2"><LuMapPin size={15} className="shrink-0" />{direccion}</a>
                )}

                {/* Trabajo */}
                <div className="rounded-2xl bg-panel px-4">
                    <div className={fila}><span className="text-caption text-muted">Trabajo</span><Chip estado={s.estado} /></div>
                    <div className={fila}>
                        <span className="text-caption text-muted">{s.estado === 'COBRADO' ? 'Cobrado' : 'Total'}</span>
                        <span className="text-right">
                            <M valor={total} className="text-body-lg font-black text-ink" />
                            {(s.modalidadCobro || Number(s.descuentoPorcentaje) > 0) && (
                                <span className="block text-caption text-muted">
                                    {[MODALIDAD[s.modalidadCobro], Number(s.descuentoPorcentaje) > 0 ? `${s.descuentoPorcentaje}% de descuento` : null].filter(Boolean).join(' · ')}
                                </span>
                            )}
                        </span>
                    </div>
                    {s.fecha && <div className={fila}><span className="text-caption text-muted">Fecha</span><span className="text-body font-bold text-ink">{fechaAR(s.fecha)}</span></div>}
                </div>

                {/* Visita */}
                {(orden || s.usuarioNombre) && (
                    <div className="rounded-2xl bg-panel px-4">
                        <div className={fila}>
                            <span className="text-caption text-muted">Técnico</span>
                            <span className="flex items-center gap-1.5 text-body font-bold text-ink">
                                <AvatarTecnico nombre={orden?.tecnicoNombre || s.usuarioNombre} size={20} />{orden?.tecnicoNombre || s.usuarioNombre || 'Sin técnico'}
                            </span>
                        </div>
                        {orden && (
                            <>
                                <div className={fila}>
                                    <span className="text-caption text-muted">Visita</span>
                                    <span className="flex items-center gap-1.5 text-body font-bold text-ink"><LuClock size={14} />{fechaAR(orden.fechaProgramada)}{hora ? ` · ${hora}` : ' · sin horario'}</span>
                                </div>
                                <div className={fila}>
                                    <span className="text-caption text-muted">Estado</span>
                                    <span className="flex items-center gap-2">
                                        <Chip estado={orden.estado} />
                                        {orden.estado === 'PENDIENTE' && (
                                            <span className={`text-caption font-bold ${orden.confirmadaEn ? 'text-[#16A34A]' : 'text-muted'}`}>{orden.confirmadaEn ? '✓ Ok, voy' : 'sin confirmar'}</span>
                                        )}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Qué se hace */}
                {items.length > 0 && (
                    <div className="space-y-2">
                        <p className="px-1 text-caption font-bold text-muted">Qué se hace</p>
                        {items.map((it, i) => (
                            <div key={i} className="p-3.5 rounded-2xl bg-panel space-y-1.5">
                                <div className="flex justify-between gap-3">
                                    <span className="min-w-0">
                                        {it.equipoSerial && <span className="block text-body font-black text-brand-red">{it.equipoSerial}</span>}
                                        <span className="block text-body text-ink">{it.trabajoRealizado || 'Trabajo'}</span>
                                    </span>
                                    <M valor={Number(it.costo || 0)} className="shrink-0 text-body font-black text-ink" />
                                </div>
                                {it.repuestosUsados?.length > 0 && (
                                    <ul className="pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06] space-y-0.5">
                                        {it.repuestosUsados.map((r, j) => (
                                            <li key={j} className="flex justify-between gap-3 text-caption text-secondary">
                                                <span>{r.cantidad}× {r.nombre}</span>
                                                {r.subtotal != null && <span>{plata(r.subtotal)}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {s.observaciones && (
                    <div className="p-3.5 rounded-2xl bg-panel">
                        <p className="text-caption font-bold text-muted mb-1">Notas</p>
                        <p className="text-caption text-secondary whitespace-pre-line">{s.observaciones}</p>
                    </div>
                )}
            </div>
        </ModalShell>
    );
}
