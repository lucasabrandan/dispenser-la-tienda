import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { formatDateISO, getTodayISO } from '../../utils/dateUtils';
import ModalShell from '../ui/ModalShell';
import AgendaHuecos, { franjaDe } from '../ordenes/AgendaHuecos';

// Agendar un pedido de empresa (7-oct-2026): igual que Reprogramar — día en la
// semana y hueco del técnico. Crea la visita (le avisa al técnico) y le avisa a
// la empresa el día.
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return formatDateISO(d); };

export default function AgendarPedidoSheet({ pedido, tecnicos = [], onCerrar, onAgendado }) {
    const hoy = getTodayISO();
    const [ordenes, setOrdenes] = useState([]);
    const [fecha, setFecha] = useState(hoy);
    const [hueco, setHueco] = useState(null);
    const [hora, setHora] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.get('/ordenes', { params: { desde: sumarDias(hoy, -7), hasta: sumarDias(hoy, 120) } })
            .then(r => setOrdenes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, [hoy]);

    const guardar = async () => {
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
            pie={<button type="button" disabled={!hueco || guardando} onClick={guardar}
                className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">Agendar</button>}>
            <div className="space-y-3">
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
            </div>
        </ModalShell>
    );
}
