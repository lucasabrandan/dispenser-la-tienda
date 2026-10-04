import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import AgendaHuecos from '../ordenes/AgendaHuecos';
import { LuCircleCheck, LuCalendar, LuClock, LuMessageCircle, LuSend } from 'react-icons/lu';
import { datosOrdenDesdePresupuesto } from '../../utils/ordenes';
import { fechaAR, getTodayISO } from '../../utils/dateUtils';

const PRIORIDADES = [
    { value: 'NORMAL',  label: 'Normal'  },
    { value: 'ALTA',    label: 'Alta'    },
    { value: 'URGENTE', label: 'Urgente' },
];




const LABEL = 'block text-label font-black text-muted uppercase tracking-widest mb-1.5';

/**
 * ModalDespacharPresupuesto
 * Sheet rápido para crear una orden de visita a partir de un presupuesto existente.
 * Solo pide técnico, fecha, hora y prioridad. El resto se pre-llena del presupuesto.
 */
export default function ModalDespacharPresupuesto({ presupuesto, calcularTotal, onCerrar, onDespachado }) {
    const [tecnicos,    setTecnicos]    = useState([]);
    const [cargando,    setCargando]    = useState(true);
    const [guardando,   setGuardando]   = useState(false);
    const [ordenCreada, setOrdenCreada] = useState(null);

    const total = calcularTotal(presupuesto);

    const [form, setForm] = useState({
        tecnicoId:       '',
        fechaProgramada: '',
        horaEstimada:    '',
        franja:          '',
        prioridad:       'NORMAL',
    });
    const [ordenesAgenda, setOrdenesAgenda] = useState([]);
    useEffect(() => {
        const d = new Date(); d.setDate(d.getDate() + 120);
        api.get('/ordenes', { params: { desde: getTodayISO(), hasta: d.toISOString().slice(0, 10) } })
            .then(r => setOrdenesAgenda(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    useEffect(() => {
        api.get('/ordenes/tecnicos')
            .then(r => setTecnicos(r.data || []))
            .catch(() => {})
            .finally(() => setCargando(false));
    }, []);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleGuardar = async () => {
        if (!form.tecnicoId)       { toast.error('Seleccioná un técnico');  return; }
        if (!form.fechaProgramada) { toast.error('Elegí el día');            return; }
        setGuardando(true);
        try {
            const res = await api.post('/ordenes', datosOrdenDesdePresupuesto(presupuesto, {
                tecnicoId: form.tecnicoId, fechaProgramada: form.fechaProgramada,
                horaEstimada: form.horaEstimada || form.franja || '', prioridad: form.prioridad,
            }));
            setOrdenCreada(res.data);
            toast.success('Orden de visita creada');
            // El presupuesto pasa a "en progreso": ya no es un pendiente suelto, está
            // asignado a un técnico. Antes se quedaba huérfano en estado PRESUPUESTO
            // para siempre y la pantalla de Presupuestos lo marcaba "Ejecutado" solo
            // por una búsqueda cruzada — ahora el estado real refleja lo que pasó.
            try {
                await api.patch(`/servicios/${presupuesto.id}/estado`, { estado: 'EN_PROGRESO' });
            } catch {
                console.error('No se pudo pasar el presupuesto a EN_PROGRESO');
            }
            if (onDespachado) onDespachado(res.data);
        } catch {
            toast.error('Error al crear la orden');
        } finally {
            setGuardando(false);
        }
    };

    const tecnicoAsignado = tecnicos.find(t => String(t.id) === String(form.tecnicoId));

    const abrirWhatsApp = () => {
        const num = (tecnicoAsignado?.whatsapp || tecnicoAsignado?.telefono || '').replace(/\D/g, '');
        const msg = encodeURIComponent(
            `🔧 *Nuevo trabajo asignado*\n` +
            `Cliente: ${presupuesto.clienteNombre || '-'}\n` +
            (presupuesto.sedeDireccion ? `Dirección: ${presupuesto.sedeDireccion}\n` : '') +
            `Fecha: ${fechaAR(form.fechaProgramada)}${form.horaEstimada ? ` a las ${form.horaEstimada}` : form.franja ? ` (${form.franja.toLowerCase()})` : ''}\n` +
            `Prioridad: ${form.prioridad}\n` +
            `Monto estimado: $${total.toLocaleString('es-AR')}`
        );
        window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={!ordenCreada ? onCerrar : undefined} />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6">
                <div className="bg-card rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* Handle */}
                    <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-chip sm:hidden" />

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-5 pb-3">
                        <div>
                            <h3 className="text-title font-black text-ink uppercase leading-none">
                                Despachar visita
                            </h3>
                            <p className="text-body font-bold text-muted mt-1 leading-tight">
                                {presupuesto.clienteNombre}
                                {presupuesto.sedeNombre ? ` · ${presupuesto.sedeNombre}` : ''}
                            </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                            <p className="text-label font-black text-muted uppercase">Monto</p>
                            <p className="text-body-lg font-black text-brand-amber leading-none">
                                ${total.toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>

                    {ordenCreada ? (
                        /* ── Confirmación ────────────────────────────────── */
                        <div className="px-6 pb-6 space-y-4">
                            <div className="py-6 text-center">
                                <div className="flex justify-center mb-2"><LuCircleCheck size={36} className="text-[#1E8A4A]" /></div>
                                <p className="text-body-lg font-black text-ink">
                                    Orden creada
                                </p>
                                <p className="text-caption text-muted mt-1">
                                    {tecnicoAsignado?.nombre || 'Técnico'} — {fechaAR(form.fechaProgramada)}{form.horaEstimada ? ` a las ${form.horaEstimada}` : ''}
                                </p>
                            </div>

                            {/* Resumen de lo que verá el técnico */}
                            <div className="p-3 rounded-2xl bg-panel space-y-1.5">
                                <p className="text-label font-black text-muted uppercase tracking-widest">El técnico verá en Mis Órdenes</p>
                                <p className="text-body font-black text-ink">
                                    Visita · {presupuesto.clienteNombre}
                                </p>
                                <div className="flex items-center gap-3 text-caption text-muted">
                                    <span className="inline-flex items-center gap-1"><LuCalendar size={12} />{fechaAR(form.fechaProgramada)}</span>
                                    {form.horaEstimada && <span className="inline-flex items-center gap-1"><LuClock size={12} />{form.horaEstimada}</span>}
                                    <span className="capitalize">{form.prioridad.toLowerCase()}</span>
                                </div>
                                {presupuesto.items?.length > 0 && (
                                    <p className="text-caption text-secondary leading-snug">
                                        {presupuesto.items.slice(0, 2).map(it => it.trabajoRealizado).filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>

                            <button onClick={abrirWhatsApp}
                                className="w-full py-3.5 rounded-2xl font-black text-label uppercase text-white bg-[#25D366] active:scale-95 flex items-center justify-center gap-1.5">
                                <LuMessageCircle size={14} /> Avisar por WhatsApp a {tecnicoAsignado?.nombre || 'Técnico'}
                            </button>
                            <button onClick={onCerrar}
                                className="w-full py-3.5 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95">
                                Listo
                            </button>
                        </div>
                    ) : (
                        /* ── Formulario ──────────────────────────────────── */
                        <div className="px-6 pb-6 space-y-4">
                            {cargando ? (
                                <div className="py-8 text-center text-muted text-sm">Cargando técnicos…</div>
                            ) : (
                                <>
                                    {/* Técnico, día y franja: se toca el hueco en la agenda — igual que
                                        Nueva visita y Reprogramar (3-oct-2026) */}
                                    <div className="space-y-2">
                                        <label className={LABEL}>¿Quién y cuándo?</label>
                                        <AgendaHuecos tecnicos={tecnicos} ordenes={ordenesAgenda}
                                            fecha={form.fechaProgramada || getTodayISO()}
                                            onFecha={v => set('fechaProgramada', v)}
                                            hueco={form.tecnicoId ? { tecnicoId: Number(form.tecnicoId), franja: form.franja || 'Mañana' } : null}
                                            onHueco={h => setForm(f => ({ ...f, tecnicoId: h ? String(h.tecnicoId) : '', franja: h?.franja || '', fechaProgramada: f.fechaProgramada || getTodayISO() }))}
                                            direccion={presupuesto.sedeDireccion} />
                                        {form.tecnicoId && (
                                            <label className="flex items-center gap-2 text-caption text-secondary">
                                                Hora exacta (opcional)
                                                <input type="time" value={form.horaEstimada} onChange={e => set('horaEstimada', e.target.value)}
                                                    className="h-9 px-2 rounded-lg bg-chip text-ink font-bold outline-none" />
                                            </label>
                                        )}
                                    </div>

                                    {/* Prioridad chips */}
                                    <div>
                                        <label className={LABEL}>Prioridad</label>
                                        <div className="flex gap-2">
                                            {PRIORIDADES.map(p => (
                                                <button key={p.value} type="button"
                                                    onClick={() => set('prioridad', p.value)}
                                                    className={`flex-1 py-2 rounded-xl text-label font-black uppercase transition-all active:scale-95 ${
                                                        form.prioridad === p.value
                                                            ? 'bg-brand-red text-white'
                                                            : 'bg-chip text-secondary'
                                                    }`}>
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Qué verá el técnico — preview */}
                                    {form.tecnicoId && form.fechaProgramada && (
                                        <div className="p-3 rounded-xl bg-panel border-[0.5px] border-black/[0.06]">
                                            <p className="text-label font-black text-muted uppercase tracking-widest mb-1.5">
                                                Preview · aparecerá en Mis Órdenes
                                            </p>
                                            <p className="text-body font-black text-ink">
                                                {tecnicos.find(t => String(t.id) === String(form.tecnicoId))?.nombre}
                                            </p>
                                            <p className="text-caption text-muted mt-0.5 flex items-center gap-1 flex-wrap">
                                                <LuCalendar size={12} />{fechaAR(form.fechaProgramada)}{form.horaEstimada ? (<> · <LuClock size={12} className="ml-0.5" />{form.horaEstimada}</>) : ''}
                                            </p>
                                        </div>
                                    )}

                                    {/* Botones */}
                                    <div className="flex gap-2 pt-1">
                                        <button type="button" onClick={onCerrar}
                                            className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                                            Cancelar
                                        </button>
                                        <button type="button" onClick={handleGuardar} disabled={guardando}
                                            className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5">
                                            {guardando ? 'Creando orden…' : (<><LuSend size={14} /> Despachar</>)}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
