import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { formatDateISO, getTodayISO } from '../../utils/dateUtils';
import ModalShell from '../ui/ModalShell';
import AgendaHuecos, { franjaDe } from './AgendaHuecos';

// Reprogramar una visita (3-oct-2026): igual que el paso 3 de Nueva visita —
// se elige el día en la semana y se toca el hueco del técnico (mañana/tarde).
// Así día y horario se eligen igual en toda la app. "Editar todo" abre el
// formulario completo por si hay que cambiar cliente, dirección o notas.
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return formatDateISO(d); };

export default function ReprogramarSheet({ orden, tecnicos = [], onGuardado, onCerrar, onEditarTodo }) {
    const hoy = getTodayISO();
    const fechaOrig = String(orden.fechaProgramada || '').slice(0, 10);
    const [ordenes, setOrdenes] = useState([]);
    const [fecha, setFecha] = useState(fechaOrig && fechaOrig >= hoy ? fechaOrig : hoy);
    const [hueco, setHueco] = useState(orden.tecnicoId ? { tecnicoId: orden.tecnicoId, franja: franjaDe(orden.horaEstimada) } : null);
    const [hora, setHora] = useState(String(orden.horaEstimada || '').includes(':') ? String(orden.horaEstimada).slice(0, 5) : '');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.get('/ordenes', { params: { desde: sumarDias(hoy, -7), hasta: sumarDias(hoy, 120) } })
            .then(r => setOrdenes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, [hoy]);

    const guardar = async () => {
        if (!hueco) { toast.error('Tocá un hueco en la agenda'); return; }
        setGuardando(true);
        const t = toast.loading('Guardando…');
        try {
            await api.put(`/ordenes/${orden.id}`, {
                tecnicoId: hueco.tecnicoId,
                titulo: orden.titulo || 'Visita',
                descripcion: orden.descripcion || null,
                direccion: orden.direccion || null,
                clienteId: orden.clienteId || null,
                clienteNombre: orden.clienteNombre || '',
                clienteTelefono: orden.clienteTelefono || '',
                prioridad: orden.prioridad || 'NORMAL',
                fechaProgramada: fecha,
                horaEstimada: hora || hueco.franja,
                montoEstimado: orden.montoEstimado ?? null,
                formaPago: orden.formaPago || null,
                presupuestoId: orden.presupuestoId || null,
                equiposSerie: orden.equiposSerie ?? null,
            });
            toast.success('Visita reprogramada', { id: t });
            onGuardado && onGuardado();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo reprogramar', { id: t });
        } finally { setGuardando(false); }
    };

    const tec = tecnicos.find(x => x.id === hueco?.tecnicoId);
    return (
        <ModalShell titulo="Reprogramar visita" ancho="md:max-w-2xl"
            subtitulo={[orden.clienteNombre || orden.titulo, orden.direccion].filter(Boolean).join(' · ')}
            onCerrar={onCerrar}
            pie={<button type="button" disabled={!hueco || guardando} onClick={guardar}
                className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">Guardar</button>}>
            <div className="space-y-3">
                <AgendaHuecos tecnicos={tecnicos} ordenes={ordenes} fecha={fecha} onFecha={setFecha}
                    hueco={hueco} onHueco={h => { setHueco(h); if (h && hora && franjaDe(hora) !== h.franja) setHora(''); }} direccion={orden.direccion} excluirId={orden.id} />
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
                {onEditarTodo && (
                    <button type="button" onClick={onEditarTodo} className="text-caption font-bold text-secondary underline">Editar el resto (cliente, dirección, notas…)</button>
                )}
            </div>
        </ModalShell>
    );
}
