import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuBanknote, LuChevronDown, LuChevronUp, LuCheck } from 'react-icons/lu';
import api from '../../services/api';
import { colorTecnico } from '../../utils/estados';

// Rendiciones pendientes (2-oct-2026): los "Cerrar mi día" de los técnicos que todavía
// no marcaste como recibidos. No se muestra nada si no hay pendientes.

const fmt = v => `$${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
const fmtFecha = f => {
    const [a, m, d] = String(f).slice(0, 10).split('-');
    return `${d}/${m}`;
};

export default function RendicionesBlock({ card = '' }) {
    const [lista, setLista] = useState([]);
    const [abierta, setAbierta] = useState(null);
    const [marcando, setMarcando] = useState(null);

    const cargar = useCallback(() => {
        api.get('/rendiciones/pendientes').then(r => setLista(r.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        cargar();
        const t = setInterval(cargar, 60000);
        return () => clearInterval(t);
    }, [cargar]);

    const recibido = async (id) => {
        setMarcando(id);
        try {
            await api.patch(`/rendiciones/${id}/recibido`);
            setLista(l => l.filter(r => r.id !== id));
            toast.success('Rendición recibida');
        } catch {
            toast.error('No se pudo marcar');
        } finally {
            setMarcando(null);
        }
    };

    if (!lista.length) return null;
    const total = lista.reduce((a, r) => a + Number(r.monto || 0), 0);

    return (
        <div className={`${card} p-3.5 md:p-4`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-caption font-bold text-muted flex items-center gap-1.5"><LuBanknote size={14} /> Rendiciones pendientes</p>
                <p className="text-body font-black text-ink">{fmt(total)}</p>
            </div>
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {lista.map(r => (
                    <div key={r.id} className="py-2">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setAbierta(a => a === r.id ? null : r.id)} className="flex-1 min-w-0 text-left flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorTecnico(r.tecnicoNombre) }} /><span className="text-caption font-black text-ink truncate">{r.tecnicoNombre}</span>
                                <span className="text-label text-muted shrink-0">{fmtFecha(r.fecha)}</span>
                                {abierta === r.id ? <LuChevronUp size={13} className="text-muted" /> : <LuChevronDown size={13} className="text-muted" />}
                            </button>
                            <span className="text-caption font-black text-ink shrink-0">{fmt(r.monto)}</span>
                            <button onClick={() => recibido(r.id)} disabled={marcando === r.id}
                                className="h-8 px-2.5 shrink-0 rounded-lg text-label font-black uppercase bg-[#16A34A] text-white active:scale-95 flex items-center gap-1 disabled:opacity-40">
                                <LuCheck size={13} /> Recibido
                            </button>
                        </div>
                        {abierta === r.id && (
                            <pre className="mt-2 p-2.5 rounded-lg bg-panel text-label text-secondary whitespace-pre-wrap font-sans">{r.detalle || 'Sin detalle'}</pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
