import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LuX, LuPlus } from 'react-icons/lu';
import api from '../../services/api';
import { FRANJAS_BLOQUEO, DIAS_SEMANA, labelFranja } from '../../utils/bloqueos';
import { fechaAR, getTodayISO } from '../../utils/dateUtils';

// "Mis días ocupados" (5-oct-2026): el técnico/socio marca cuándo trabaja en lo
// suyo. El admin lo ve como "ocupado" al asignar visitas (nunca ve la nota).
const chip = (on) => `h-9 px-3 rounded-xl text-label font-black active:scale-95 ${on ? 'bg-brand-red text-white' : 'bg-chip text-muted'}`;

export default function MisDiasOcupados() {
    const [lista, setLista] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [modo, setModo] = useState('SEMANAL'); // SEMANAL | DIA
    const [dia, setDia] = useState(1);
    const [fecha, setFecha] = useState(getTodayISO());
    const [franja, setFranja] = useState('DIA');
    const [nota, setNota] = useState('');

    const cargar = () => api.get('/bloqueos/mios').then(r => setLista(r.data || [])).catch(() => setLista([]));
    useEffect(() => { cargar(); }, []);

    const guardar = async () => {
        try {
            await api.post('/bloqueos', { franja, nota, ...(modo === 'SEMANAL' ? { diaSemana: dia } : { fecha }) });
            toast.success('Listo, el admin ya lo ve como ocupado');
            setAbierto(false); setNota(''); cargar();
        } catch { toast.error('No se pudo guardar'); }
    };
    const borrar = async (id) => {
        try { await api.delete(`/bloqueos/${id}`); cargar(); } catch { toast.error('No se pudo borrar'); }
    };

    return (
        <div className="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-body font-black text-ink">Mis días ocupados</p>
                    <p className="text-caption text-muted">Cuando trabajás en lo tuyo. El admin solo ve "ocupado".</p>
                </div>
                {!abierto && (
                    <button onClick={() => setAbierto(true)} className="h-9 px-3 rounded-xl bg-brand-red text-white text-label font-black flex items-center gap-1 active:scale-95 shrink-0">
                        <LuPlus size={14} /> Marcar
                    </button>
                )}
            </div>

            {lista.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {lista.map(b => (
                        <span key={b.id} className="inline-flex items-center gap-1.5 pl-3 pr-1 h-8 rounded-full bg-chip text-caption font-bold text-ink">
                            {b.diaSemana ? `Todos los ${DIAS_SEMANA[b.diaSemana].toLowerCase()}` : fechaAR(b.fecha)} · {labelFranja(b.franja)}
                            {b.nota && <span className="text-muted font-medium truncate max-w-[110px]">· {b.nota}</span>}
                            <button onClick={() => borrar(b.id)} aria-label="Quitar" className="w-6 h-6 rounded-full flex items-center justify-center text-muted active:bg-card"><LuX size={13} /></button>
                        </span>
                    ))}
                </div>
            )}

            {abierto && (
                <div className="space-y-3 pt-1">
                    <div className="flex gap-2">
                        <button onClick={() => setModo('SEMANAL')} className={chip(modo === 'SEMANAL')}>Todas las semanas</button>
                        <button onClick={() => setModo('DIA')} className={chip(modo === 'DIA')}>Un día</button>
                    </div>
                    {modo === 'SEMANAL' ? (
                        <div className="flex flex-wrap gap-1.5">
                            {DIAS_SEMANA.slice(1, 7).map((n, i) => (
                                <button key={n} onClick={() => setDia(i + 1)} className={chip(dia === i + 1)}>{n.slice(0, 3)}</button>
                            ))}
                        </div>
                    ) : (
                        <input type="date" value={fecha} min={getTodayISO()} onChange={e => setFecha(e.target.value)}
                            className="h-10 px-3 rounded-xl bg-chip text-ink text-body font-bold outline-none" />
                    )}
                    <div className="flex gap-1.5">
                        {FRANJAS_BLOQUEO.map(f => <button key={f.id} onClick={() => setFranja(f.id)} className={chip(franja === f.id)}>{f.label}</button>)}
                    </div>
                    <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota para vos (opcional, el admin no la ve)"
                        className="w-full h-10 px-3 rounded-xl bg-chip text-ink text-body outline-none placeholder:text-muted" />
                    <div className="flex gap-2">
                        <button onClick={() => setAbierto(false)} className="flex-1 h-10 rounded-xl bg-chip text-secondary text-label font-black uppercase">Cancelar</button>
                        <button onClick={guardar} className="flex-[2] h-10 rounded-xl bg-brand-red text-white text-label font-black uppercase">Guardar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
