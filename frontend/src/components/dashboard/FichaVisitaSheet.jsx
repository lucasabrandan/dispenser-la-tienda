import React, { useEffect, useState } from 'react';
import { LuMapPin, LuClock, LuArrowRight, LuTrash2 } from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import ChatVisita from '../ordenes/ChatVisita';
import AvatarTecnico from '../ui/AvatarTecnico';
import { M } from '../servicio/ServicioUI';
import { estadoLabel, etapaColor } from '../../utils/estados';
import { fechaAR } from '../../utils/dateUtils';

// Ficha de una visita de la agenda del Panel (5-oct-2026). Antes, al tocarla,
// llevaba a Trabajos sin abrir nada (y si ya estaba hecha o cobrada, ni
// aparecía en "Por hacer"). Ahora muestra todo ahí mismo: estado de la visita,
// estado del trabajo, monto y qué se hizo.
const MODALIDAD = { EFECTIVO_SIN_FACTURA: 'Efectivo', CON_FACTURA: 'Con factura', TRANSFERENCIA: 'Transferencia' };

function Chip({ estado }) {
    const c = etapaColor(estado);
    return (
        <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-lg text-label font-black uppercase tracking-wide"
            style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}>
            {estadoLabel(estado)}
        </span>
    );
}

export default function FichaVisitaSheet({ orden, onCerrar, onVerTrabajos, onEliminada }) {
    const [servicio, setServicio] = useState(null);
    const [error, setError] = useState(null); // 'borrado' | mensaje
    const [confirmar, setConfirmar] = useState(false);
    const [borrando, setBorrando] = useState(false);

    const eliminar = async () => {
        setBorrando(true);
        try {
            await api.delete(`/ordenes/${orden.id}`);
            toast.success('Visita eliminada');
            onEliminada?.();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo eliminar');
            setBorrando(false);
        }
    };
    const [cargando, setCargando] = useState(!!orden.presupuestoId);

    useEffect(() => {
        if (!orden.presupuestoId) return;
        api.get(`/servicios/${orden.presupuestoId}`)
            .then(r => setServicio(r.data))
            .catch(e => { setServicio(null); setError(e?.response?.status === 404 ? 'borrado' : (e?.response?.data?.mensaje || 'No se pudo cargar el trabajo.')); })
            .finally(() => setCargando(false));
    }, [orden.presupuestoId]);

    const hora = orden.horaEstimada ? String(orden.horaEstimada).slice(0, 5) : 'Sin horario';
    const total = servicio
        ? (Number(servicio.montoFinal) > 0 ? Number(servicio.montoFinal) : (servicio.items || []).reduce((a, it) => a + Number(it.costo || 0), 0))
        : 0;
    const fila = 'flex items-center justify-between gap-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] last:border-0';

    return (
        <ModalShell titulo={orden.clienteNombre || orden.titulo || `Visita #${orden.id}`}
            subtitulo={orden.titulo && orden.clienteNombre ? orden.titulo : undefined}
            onCerrar={onCerrar}
            pie={
                <div className="flex gap-2">
                    <button type="button" onClick={onCerrar}
                        className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Cerrar</button>
                    {error !== 'borrado' && <button type="button" onClick={onVerTrabajos}
                        className="flex-[2] h-11 rounded-xl bg-[#C9341F] text-white text-label font-black inline-flex items-center justify-center gap-1.5 active:scale-95">
                        Ver en Trabajos <LuArrowRight size={15} />
                    </button>}
                </div>
            }>
            <div className="space-y-4">
                <div className="rounded-2xl bg-panel px-4">
                    <div className={fila}>
                        <span className="text-caption text-muted">Visita</span>
                        <span className="flex items-center gap-2">
                            <Chip estado={orden.estado} />
                            {orden.estado === 'PENDIENTE' && (
                                <span className="text-caption font-bold text-muted">{orden.confirmadaEn ? '✓ confirmó' : 'sin confirmar'}</span>
                            )}
                        </span>
                    </div>
                    <div className={fila}>
                        <span className="text-caption text-muted">Cuándo</span>
                        <span className="flex items-center gap-1.5 text-body font-bold text-ink"><LuClock size={14} />{fechaAR(orden.fechaProgramada)} · {hora}</span>
                    </div>
                    <div className={fila}>
                        <span className="text-caption text-muted">Técnico</span>
                        <span className="flex items-center gap-1.5 text-body font-bold text-ink">
                            <AvatarTecnico nombre={orden.tecnicoNombre} size={20} />{orden.tecnicoNombre || 'Sin técnico'}
                        </span>
                    </div>
                    {orden.direccion && (
                        <div className={fila}>
                            <span className="text-caption text-muted">Dónde</span>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orden.direccion)}`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 text-body font-bold text-ink underline text-right"><LuMapPin size={14} className="shrink-0" />{orden.direccion}</a>
                        </div>
                    )}
                </div>

                {orden.tecnicoNombre && <ChatVisita orden={orden} soyAdmin />}

                {orden.presupuestoId && (
                    cargando ? <div className="h-24 rounded-2xl bg-panel animate-pulse" /> : servicio ? (
                        <div className="rounded-2xl bg-panel px-4">
                            <div className={fila}>
                                <span className="text-caption text-muted">Trabajo #{servicio.id}</span>
                                <Chip estado={servicio.estado} />
                            </div>
                            <div className={fila}>
                                <span className="text-caption text-muted">{servicio.estado === 'COBRADO' ? 'Cobrado' : 'Total'}</span>
                                <span className="text-right">
                                    <M valor={total} className="text-body-lg font-black text-ink" />
                                    {servicio.modalidadCobro && <span className="block text-caption text-muted">{MODALIDAD[servicio.modalidadCobro] || servicio.modalidadCobro}</span>}
                                </span>
                            </div>
                            {(servicio.items || []).length > 0 && (
                                <div className="py-2.5 space-y-1.5">
                                    {servicio.items.map((it, i) => (
                                        <div key={i} className="flex justify-between gap-3 text-caption">
                                            <span className="min-w-0 text-secondary">
                                                {it.equipoSerial && <span className="font-black text-ink mr-1.5">{it.equipoSerial}</span>}
                                                {it.trabajoRealizado || 'Trabajo'}
                                            </span>
                                            <M valor={Number(it.costo || 0)} className="shrink-0 font-bold text-ink" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {servicio.observaciones && <p className="py-2.5 text-caption text-muted border-t border-black/[0.06] dark:border-white/[0.06]">{servicio.observaciones}</p>}
                        </div>
                    ) : error === 'borrado' ? (
                        <div className="rounded-2xl px-4 py-3 bg-[color:var(--alerta-bg)] text-[color:var(--alerta-tx)] text-caption font-bold">
                            El trabajo de esta visita ya no existe (se borró). Podés eliminar la visita para que no aparezca más.
                        </div>
                    ) : <p className="text-caption text-muted text-center">{error || 'No se pudo cargar el trabajo.'}</p>
                )}

                {/* Eliminar la visita (con confirmación en la misma ficha) */}
                {confirmar ? (
                    <div className="flex items-center gap-2 p-3 rounded-2xl border border-[#C9341F]/40">
                        <p className="flex-1 text-caption font-bold text-ink">¿Eliminar esta visita? No se puede deshacer.</p>
                        <button type="button" onClick={() => setConfirmar(false)} className="h-9 px-3 rounded-xl bg-chip text-secondary text-label font-black">No</button>
                        <button type="button" onClick={eliminar} disabled={borrando}
                            className="h-9 px-3 rounded-xl bg-[#C9341F] text-white text-label font-black disabled:opacity-50">{borrando ? 'Borrando…' : 'Sí, eliminar'}</button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setConfirmar(true)}
                        className={`w-full h-10 rounded-xl inline-flex items-center justify-center gap-1.5 text-label font-black active:scale-95 ${error === 'borrado' ? 'bg-[#C9341F] text-white' : 'text-brand-red border border-black/10 dark:border-white/10'}`}>
                        <LuTrash2 size={14} /> Eliminar visita
                    </button>
                )}
                {!orden.presupuestoId && <p className="text-caption text-muted text-center">Visita suelta, sin presupuesto cargado.</p>}
            </div>
        </ModalShell>
    );
}
