import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const PRIORIDADES = [
    { value: 'NORMAL',  label: 'Normal'  },
    { value: 'ALTA',    label: 'Alta'    },
    { value: 'URGENTE', label: 'Urgente' },
];

const INPUT = `w-full px-3 py-2.5 rounded-xl text-[13px] font-medium outline-none
    bg-[#C0BCB6] dark:bg-[#2E2E2E]
    text-[#1C1917] dark:text-[#F0EEE9]
    border border-black/[0.07] dark:border-white/[0.07]
    placeholder:text-[#A8A29E]
    focus:ring-2 focus:ring-[#D13A28]/20 focus:border-[#D13A28] dark:focus:border-[#E8422F]
    transition-all`;

const LABEL = 'block text-[10px] font-black text-[#A8A29E] uppercase tracking-widest mb-1.5';

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
        prioridad:       'NORMAL',
    });

    useEffect(() => {
        api.get('/ordenes/tecnicos')
            .then(r => setTecnicos(r.data || []))
            .catch(() => {})
            .finally(() => setCargando(false));
    }, []);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleGuardar = async () => {
        if (!form.tecnicoId)       { toast.error('Seleccioná un técnico');  return; }
        if (!form.fechaProgramada) { toast.error('Ingresá la fecha');        return; }
        setGuardando(true);
        try {
            const res = await api.post('/ordenes', {
                tecnicoId:       Number(form.tecnicoId),
                titulo:          `Visita · ${presupuesto.clienteNombre || 'Cliente'}`,
                descripcion:     presupuesto.items?.map(it => it.trabajoRealizado).filter(Boolean).join(' · ') || '',
                clienteId:       presupuesto.clienteId    || null,
                clienteNombre:   presupuesto.clienteNombre || '',
                clienteTelefono: presupuesto.clienteTelefono || '',
                direccion:       presupuesto.sedeDireccion  || presupuesto.sedeNombre || '',
                prioridad:       form.prioridad,
                fechaProgramada: form.fechaProgramada,
                horaEstimada:    form.horaEstimada || null,
                montoEstimado:   total || null,
                formaPago:       'EFECTIVO',
                presupuestoId:   presupuesto.id,
            });
            setOrdenCreada(res.data);
            toast.success('Orden de visita creada');
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
            `Fecha: ${form.fechaProgramada}${form.horaEstimada ? ` a las ${form.horaEstimada}` : ''}\n` +
            `Prioridad: ${form.prioridad}\n` +
            `Monto estimado: $${total.toLocaleString('es-AR')}`
        );
        window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" onClick={!ordenCreada ? onCerrar : undefined} />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[1000] p-0 sm:p-4">
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md border border-black/[0.07] dark:border-white/[0.07] shadow-2xl">

                    {/* Handle */}
                    <div className="w-10 h-1 rounded-full mx-auto mt-3 bg-[#C0BCB6] dark:bg-[#2E2E2E] sm:hidden" />

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-5 pb-3">
                        <div>
                            <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none">
                                Despachar visita
                            </h3>
                            <p className="text-[12px] font-bold text-[#A8A29E] mt-1 leading-tight">
                                {presupuesto.clienteNombre}
                                {presupuesto.sedeNombre ? ` · ${presupuesto.sedeNombre}` : ''}
                            </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                            <p className="text-[10px] font-black text-[#A8A29E] uppercase">Monto</p>
                            <p className="text-[18px] font-black text-[#D48800] dark:text-[#F0A500] leading-none">
                                ${total.toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>

                    {ordenCreada ? (
                        /* ── Confirmación ────────────────────────────────── */
                        <div className="px-6 pb-6 space-y-4">
                            <div className="py-6 text-center">
                                <p className="text-[36px] mb-2">✅</p>
                                <p className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    Orden creada
                                </p>
                                <p className="text-[12px] text-[#A8A29E] mt-1">
                                    {tecnicoAsignado?.nombre || 'Técnico'} — {form.fechaProgramada}{form.horaEstimada ? ` a las ${form.horaEstimada}` : ''}
                                </p>
                            </div>

                            {/* Resumen de lo que verá el técnico */}
                            <div className="p-3 rounded-2xl bg-[#D8D4CE] dark:bg-[#1C1C1C] space-y-1.5">
                                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">El técnico verá en Mis Órdenes</p>
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                    Visita · {presupuesto.clienteNombre}
                                </p>
                                <div className="flex items-center gap-3 text-[11px] text-[#A8A29E]">
                                    <span>📅 {form.fechaProgramada}</span>
                                    {form.horaEstimada && <span>🕐 {form.horaEstimada}</span>}
                                    <span className="capitalize">{form.prioridad.toLowerCase()}</span>
                                </div>
                                {presupuesto.items?.length > 0 && (
                                    <p className="text-[11px] text-[#57534E] dark:text-[#9E9A94] leading-snug">
                                        {presupuesto.items.slice(0, 2).map(it => it.trabajoRealizado).filter(Boolean).join(' · ')}
                                    </p>
                                )}
                            </div>

                            <button onClick={abrirWhatsApp}
                                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase text-white bg-[#25D366] active:scale-95">
                                💬 Avisar por WhatsApp a {tecnicoAsignado?.nombre || 'Técnico'}
                            </button>
                            <button onClick={onCerrar}
                                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                                Listo
                            </button>
                        </div>
                    ) : (
                        /* ── Formulario ──────────────────────────────────── */
                        <div className="px-6 pb-6 space-y-4">
                            {cargando ? (
                                <div className="py-8 text-center text-[#A8A29E] text-sm">Cargando técnicos…</div>
                            ) : (
                                <>
                                    {/* Técnico */}
                                    <div>
                                        <label className={LABEL}>Técnico asignado</label>
                                        <select value={form.tecnicoId} onChange={e => set('tecnicoId', e.target.value)}
                                            className={INPUT}>
                                            <option value="">Seleccioná un técnico…</option>
                                            {tecnicos.map(t => (
                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Fecha + Hora */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={LABEL}>Fecha programada</label>
                                            <input type="date" value={form.fechaProgramada}
                                                onChange={e => set('fechaProgramada', e.target.value)}
                                                className={INPUT} />
                                        </div>
                                        <div>
                                            <label className={LABEL}>Hora estimada</label>
                                            <input type="time" value={form.horaEstimada}
                                                onChange={e => set('horaEstimada', e.target.value)}
                                                className={INPUT} />
                                        </div>
                                    </div>

                                    {/* Prioridad chips */}
                                    <div>
                                        <label className={LABEL}>Prioridad</label>
                                        <div className="flex gap-2">
                                            {PRIORIDADES.map(p => (
                                                <button key={p.value} type="button"
                                                    onClick={() => set('prioridad', p.value)}
                                                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase transition-all active:scale-95 ${
                                                        form.prioridad === p.value
                                                            ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                                            : 'bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                                                    }`}>
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Qué verá el técnico — preview */}
                                    {form.tecnicoId && form.fechaProgramada && (
                                        <div className="p-3 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C]"
                                            style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
                                            <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest mb-1.5">
                                                Preview · aparecerá en Mis Órdenes
                                            </p>
                                            <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                                {tecnicos.find(t => String(t.id) === String(form.tecnicoId))?.nombre}
                                            </p>
                                            <p className="text-[11px] text-[#A8A29E] mt-0.5">
                                                📅 {form.fechaProgramada}{form.horaEstimada ? ` · 🕐 ${form.horaEstimada}` : ''}
                                            </p>
                                        </div>
                                    )}

                                    {/* Botones */}
                                    <div className="flex gap-2 pt-1">
                                        <button type="button" onClick={onCerrar}
                                            className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                            Cancelar
                                        </button>
                                        <button type="button" onClick={handleGuardar} disabled={guardando}
                                            className="flex-[2] py-3 rounded-2xl font-black text-[11px] uppercase text-white bg-[#D48800] dark:bg-[#F0A500] active:scale-95 disabled:opacity-50">
                                            {guardando ? 'Creando orden…' : '📬 Despachar'}
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
