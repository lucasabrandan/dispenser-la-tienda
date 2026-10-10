import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { formatDateISO, getTodayISO } from '../../utils/dateUtils';
import ModalShell from '../ui/ModalShell';
import AgendaHuecos, { franjaDe } from '../ordenes/AgendaHuecos';
import { resumenVentanas } from '../../utils/ordenes';

// Agendar un pedido de empresa (7-oct-2026): igual que Reprogramar — día en la
// semana y hueco del técnico. Crea la visita (le avisa al técnico) y le avisa a
// la empresa el día.
// A coordinar (10-oct-2026): si la empresa marcó días y horarios, alcanza con elegir el
// técnico; él elige el día dentro de eso y a la empresa le llega el aviso cuando lo hace.
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return formatDateISO(d); };

export default function AgendarPedidoSheet({ pedido, tecnicos = [], onCerrar, onAgendado }) {
    const hoy = getTodayISO();
    const [ordenes, setOrdenes] = useState([]);
    const [fecha, setFecha] = useState(hoy);
    const [hueco, setHueco] = useState(null);
    const [hora, setHora] = useState('');
    const [guardando, setGuardando] = useState(false);
    const conFranjas = (pedido.ventanas || []).length > 0;
    const [coordinar, setCoordinar] = useState(conFranjas);
    const [tecnicoId, setTecnicoId] = useState(null);

    useEffect(() => {
        api.get('/ordenes', { params: { desde: sumarDias(hoy, -7), hasta: sumarDias(hoy, 120) } })
            .then(r => setOrdenes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, [hoy]);

    const asignar = async () => {
        if (!tecnicoId) { toast.error('Elegí el técnico'); return; }
        setGuardando(true);
        const t = toast.loading('Asignando…');
        try {
            const r = await api.post(`/pedidos-empresa/${pedido.id}/agendar`, { tecnicoId: String(tecnicoId), aCoordinar: true });
            toast.success('Asignado · el técnico elige el día', { id: t });
            onAgendado && onAgendado(r.data);
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo asignar', { id: t });
        } finally { setGuardando(false); }
    };

    const guardar = async () => {
        if (coordinar) { asignar(); return; }
        if (!hueco) { toast.error('Tocá un hueco en la agenda'); return; }
        setGuardando(true);
        const t = toast.loading('Agendando…');
        try {
            const r = await api.post(`/pedidos-empresa/${pedido.id}/agendar`, { tecnicoId: String(hueco.tecnicoId), fecha, hora: hora || hueco.franja });
            toast.success('Visita agendada · la empresa ya tiene el aviso', { id: t });
            onAgendado && onAgendado(r.data);
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo agendar', { id: t });
        } finally { setGuardando(false); }
    };

    const tec = tecnicos.find(x => x.id === hueco?.tecnicoId);
    return (
        <ModalShell titulo="Agendar visita" ancho="md:max-w-2xl"
            subtitulo={[pedido.clienteNombre, pedido.motivo, pedido.direccion].filter(Boolean).join(' · ')}
            onCerrar={onCerrar}
            pie={<button type="button" disabled={(coordinar ? !tecnicoId : !hueco) || guardando} onClick={guardar}
                className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">{coordinar ? 'Asignar' : 'Agendar'}</button>}>
            <div className="space-y-3">
                {conFranjas && (
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-chip">
                        {[[true, 'Que elija el técnico'], [false, 'Elijo yo el día']].map(([v, l]) => (
                            <button key={l} type="button" onClick={() => setCoordinar(v)} aria-pressed={coordinar === v}
                                className={`h-10 rounded-xl text-label font-black active:scale-95 ${coordinar === v ? 'bg-card text-ink shadow-sm' : 'text-muted'}`}>{l}</button>
                        ))}
                    </div>
                )}
                {conFranjas && (
                    <div className="p-3 rounded-2xl bg-[var(--warning-bg)] border border-[var(--estado-curso)]">
                        <p className="text-label font-bold text-[var(--warning-tx)]">La empresa puede</p>
                        {resumenVentanas(pedido.ventanas).map(l => <p key={l} className="text-body font-bold text-ink">{l}</p>)}
                    </div>
                )}
                {coordinar ? (
                    <div className="space-y-2">
                        <p className="text-label font-black uppercase tracking-widest text-muted">Técnico</p>
                        <div className="grid grid-cols-2 gap-2">
                            {tecnicos.map(t => (
                                <button key={t.id} type="button" onClick={() => setTecnicoId(t.id)} aria-pressed={tecnicoId === t.id}
                                    className={`h-12 px-3 rounded-xl text-body font-black text-left truncate active:scale-95 border-2 ${tecnicoId === t.id ? 'border-brand-red bg-[rgba(201,52,31,0.06)] text-ink' : 'border-transparent bg-chip text-secondary'}`}>
                                    {t.nombre}
                                </button>
                            ))}
                        </div>
                        <p className="text-caption text-muted">Le llega la visita como "a coordinar": elige el día y la hora dentro de lo que marcó la empresa, y a la empresa le avisamos cuando lo hace.</p>
                    </div>
                ) : <>
                <AgendaHuecos tecnicos={tecnicos} ordenes={ordenes} fecha={fecha} onFecha={setFecha}
                    hueco={hueco} onHueco={h => { setHueco(h); if (h && hora && franjaDe(hora) !== h.franja) setHora(''); }} direccion={pedido.direccion} />
                {hueco && (
                    <div className="p-3.5 rounded-2xl bg-chip space-y-2">
                        <p className="text-body text-ink">
                            <b>{tec?.nombre?.split(' ')[0] || 'Técnico'}</b> · {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'numeric' })} · {hora || hueco.franja.toLowerCase()}
                        </p>
                        <label className="flex items-center gap-2 text-caption text-secondary">
                            Hora exacta (opcional)
                            <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="h-9 px-2 rounded-lg bg-card text-ink font-bold outline-none" />
                            {hora && <button type="button" onClick={() => setHora('')} className="text-caption font-bold text-muted underline">Sin hora</button>}
                        </label>
                    </div>
                )}
                </>}
            </div>
        </ModalShell>
    );
}
