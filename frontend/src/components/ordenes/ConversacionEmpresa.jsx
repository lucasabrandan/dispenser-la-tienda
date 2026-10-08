import React, { useEffect, useState } from 'react';
import { LuChevronDown, LuChevronUp, LuMessageCircle } from 'react-icons/lu';
import api from '../../services/api';
import { VerFotos } from '../empresa/FotosPedido';

// Visita que vino de un pedido de empresa (7-oct-2026): el técnico LEE la
// conversación del pedido (horarios de acceso, a quién preguntar…). No escribe:
// si necesita algo, lo pide por "Contactar al cliente" (pasa por el admin).
const hace = (iso) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function ConversacionEmpresa({ ordenId }) {
    const [abierto, setAbierto] = useState(false);
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/ordenes/${ordenId}/conversacion`).then(r => setData(r.data)).catch(() => setData(null));
    }, [ordenId]);

    if (!data?.pedidoId) return null;
    const n = data.comentarios?.length || 0;
    const fotos = data.fotos || [];
    return (
        <>
            <button type="button" onClick={() => setAbierto(v => !v)}
                className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-bold bg-panel text-secondary active:scale-95 transition-all">
                <span className="inline-flex items-center gap-1.5"><LuMessageCircle size={14} /> Mensajes de {data.empresa || 'la empresa'}{n ? ` (${n})` : ''}{fotos.length ? ` · ${fotos.length} foto${fotos.length !== 1 ? 's' : ''}` : ''}</span>
                {abierto ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
            </button>
            {abierto && (
                <div className="mt-2 p-3 rounded-xl bg-panel space-y-2">
                    {fotos.length > 0 && <div><p className="text-[11px] font-black text-muted mb-1">Fotos que mandó la empresa</p><VerFotos fotos={fotos} /></div>}
                    {n === 0 && <p className="text-caption text-muted">Todavía no hay mensajes en este pedido.</p>}
                    {data.comentarios.map(c => (
                        <div key={c.id}>
                            <p className="text-[11px] font-black text-muted">{c.autorNombre} · {hace(c.creadoEn)}</p>
                            <p className="text-caption text-ink whitespace-pre-line">{c.texto}</p>
                        </div>
                    ))}
                    <p className="pt-1 text-[11px] text-muted">Solo lectura. Si necesitás algo de la empresa, usá “Contactar al cliente”.</p>
                </div>
            )}
        </>
    );
}
