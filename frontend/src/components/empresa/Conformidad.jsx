import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuStar, LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import api from '../../services/api';

// Conformidad del trabajo (8-oct-2026). Cuando la visita quedó hecha, la empresa
// confirma "Conforme" (con estrellas opcionales) o avisa "Hay un problema" (abre un
// reclamo en el pedido y le avisa a Dispenser La Tienda). Ambos lados ven el resultado.

export function Estrellas({ valor, onChange, size = 26 }) {
    return (
        <div className="flex gap-1" role={onChange ? 'radiogroup' : undefined} aria-label="Calificación">
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" disabled={!onChange} onClick={() => onChange && onChange(n === valor ? null : n)}
                    aria-label={`${n} estrella${n > 1 ? 's' : ''}`} className={onChange ? 'active:scale-90' : 'cursor-default'}>
                    <LuStar size={size} className={n <= (valor || 0) ? 'text-[#D48800] fill-[#F0A500]' : 'text-muted'} />
                </button>
            ))}
        </div>
    );
}

export function ResultadoConformidad({ p }) {
    if (!p?.conformidad) return null;
    const ok = p.conformidad === 'CONFORME';
    return (
        <div className={`p-4 rounded-2xl space-y-1.5 ${ok ? 'bg-[rgba(22,163,74,0.1)]' : 'bg-[rgba(201,52,31,0.1)]'}`}>
            <p className={`flex items-center gap-2 text-body font-black ${ok ? 'text-[#16A34A]' : 'text-brand-red'}`}>
                {ok ? <LuCircleCheck size={18} /> : <LuTriangleAlert size={18} />}
                {ok ? 'Conforme con el trabajo' : 'Reclamo: hay un problema'}
            </p>
            {p.calificacion ? <Estrellas valor={p.calificacion} size={18} /> : null}
            {p.conformidadComentario && <p className="text-body text-ink whitespace-pre-line">{p.conformidadComentario}</p>}
            <p className="text-caption text-muted">{p.conformidadPor}{p.conformidadEn ? ` · ${new Date(p.conformidadEn).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
        </div>
    );
}

export default function PedirConformidad({ p, onListo }) {
    const [cal, setCal] = useState(null);
    const [problema, setProblema] = useState(false);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);

    const enviar = async (conforme) => {
        if (!conforme && !comentario.trim()) { toast.error('Contanos qué pasó'); return; }
        setEnviando(true);
        try {
            const r = await api.patch(`/empresa/pedidos/${p.id}/conformidad`, { conforme, calificacion: cal, comentario: comentario.trim() || null });
            toast.success(conforme ? '¡Gracias!' : 'Recibimos el reclamo, te respondemos en el pedido');
            onListo && onListo(r.data);
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo enviar');
        } finally { setEnviando(false); }
    };

    return (
        <div className="p-4 rounded-2xl border-2 border-[#C9341F]/30 space-y-3">
            <p className="text-body-lg font-black text-ink">¿Quedó todo bien?</p>
            <Estrellas valor={cal} onChange={setCal} />
            {problema && (
                <textarea rows={3} value={comentario} onChange={e => setComentario(e.target.value)} autoFocus
                    placeholder="¿Qué pasó? (sigue fallando, quedó sucio, faltó algo…)"
                    className="w-full px-3.5 py-3 rounded-xl bg-chip text-body text-ink outline-none resize-none placeholder:text-muted" />
            )}
            <div className="flex gap-2">
                {!problema ? (<>
                    <button type="button" onClick={() => setProblema(true)} disabled={enviando}
                        className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Hay un problema</button>
                    <button type="button" onClick={() => enviar(true)} disabled={enviando}
                        className="flex-[2] h-11 rounded-xl bg-[#16A34A] text-white text-label font-black active:scale-95 disabled:opacity-50">✓ Conforme</button>
                </>) : (<>
                    <button type="button" onClick={() => setProblema(false)} disabled={enviando}
                        className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Volver</button>
                    <button type="button" onClick={() => enviar(false)} disabled={enviando || !comentario.trim()}
                        className="flex-[2] h-11 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95 disabled:opacity-50">Enviar reclamo</button>
                </>)}
            </div>
        </div>
    );
}
