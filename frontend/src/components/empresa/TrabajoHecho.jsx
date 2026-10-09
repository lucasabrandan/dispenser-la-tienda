import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuCircleCheck, LuMessageCircle } from 'react-icons/lu';
import api from '../../services/api';
import PedirConformidad, { ResultadoConformidad } from './Conformidad';

// Bloque de un pedido HECHO (9-oct-2026). Sin calificación (lo normal): el trabajo
// queda "Entregado" solo y la empresa, si quiere, deja un comentario. El comentario
// no puntúa nada: le llega al admin como observación pendiente y él la cierra.
// Con calificación habilitada para el cliente, se usa el "¿Quedó todo bien?" de siempre.

// Fecha 'yyyy-mm-dd' sin pasar por Date (si no, en Argentina un 7/10 se muestra 6/10)
const fecha = f => { if (!f) return ''; const [, m, d] = String(f).slice(0, 10).split('-'); return `${d}/${m}`; };
const ESTADO = {
    PENDIENTE:      { label: 'Pendiente de respuesta', cls: 'bg-[rgba(212,136,0,0.14)] text-[#A16207] dark:text-[#F0A500]' },
    RESUELTA:       { label: 'Resuelta',               cls: 'bg-[rgba(22,163,74,0.12)] text-[#16A34A]' },
    NO_CORRESPONDE: { label: 'Respondida',             cls: 'bg-chip text-secondary' },
};

export default function TrabajoHecho({ p, modo, funciones, onListo }) {
    const observado = p.conformidad === 'OBSERVADO' || p.conformidad === 'PROBLEMA';
    if (p.conformidad === 'OBSERVADO') return <Observacion p={p} modo={modo} onListo={onListo} />;
    if (p.conformidad) return (<>
        <ResultadoConformidad p={p} />
        {observado && modo === 'admin' && <CerrarObservacion p={p} onListo={onListo} />}
    </>);
    if (modo === 'empresa' && funciones?.calificacion) return <PedirConformidad p={p} onListo={onListo} />;
    return <Entregado p={p} modo={modo} puedeComentar={modo === 'empresa' && funciones?.comentarios !== false} onListo={onListo} />;
}

function Entregado({ p, modo, puedeComentar, onListo }) {
    const [abierto, setAbierto] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const enviar = async () => {
        if (!texto.trim()) return;
        setEnviando(true);
        try {
            const r = await api.post(`/empresa/pedidos/${p.id}/observacion`, { texto: texto.trim() });
            toast.success('Listo, te respondemos en el pedido');
            onListo && onListo(r.data);
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo enviar'); }
        finally { setEnviando(false); }
    };
    return (
        <div className="p-4 rounded-2xl bg-[rgba(22,163,74,0.08)] space-y-2.5">
            <p className="flex items-center gap-2 text-body font-black text-[#16A34A]">
                <LuCircleCheck size={18} /> Trabajo entregado{p.fecha ? ` el ${fecha(p.fecha)}` : ''}{p.tecnicoNombre ? ` · ${p.tecnicoNombre}` : ''}
            </p>
            {modo === 'admin' && <p className="text-caption text-muted">Sin observaciones de la empresa.</p>}
            {puedeComentar && !abierto && (
                <button type="button" onClick={() => setAbierto(true)}
                    className="inline-flex items-center gap-1.5 text-label font-black text-secondary underline underline-offset-2">
                    <LuMessageCircle size={14} /> ¿Algo para comentar sobre el trabajo?
                </button>
            )}
            {puedeComentar && abierto && (<>
                <textarea rows={3} value={texto} onChange={e => setTexto(e.target.value)} autoFocus maxLength={2000}
                    placeholder="Contanos lo que quieras: algo que notaste, una consulta, un detalle a revisar…"
                    className="w-full px-3.5 py-3 rounded-xl bg-card text-body text-ink outline-none resize-none placeholder:text-muted" />
                <div className="flex gap-2">
                    <button type="button" onClick={() => setAbierto(false)} disabled={enviando}
                        className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Cancelar</button>
                    <button type="button" onClick={enviar} disabled={enviando || !texto.trim()}
                        className="flex-[2] h-11 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95 disabled:opacity-50">Enviar comentario</button>
                </div>
            </>)}
        </div>
    );
}

function Observacion({ p, modo, onListo }) {
    const est = ESTADO[p.observacionEstado || 'PENDIENTE'];
    return (
        <div className="p-4 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2">
                <p className="flex-1 flex items-center gap-2 text-body font-black text-ink"><LuMessageCircle size={17} /> Comentario sobre el trabajo</p>
                <span className={`h-7 px-2.5 rounded-full inline-flex items-center text-caption font-black ${est.cls}`}>{est.label}</span>
            </div>
            <p className="text-body text-ink whitespace-pre-line">{p.conformidadComentario}</p>
            <p className="text-caption text-muted">{p.conformidadPor}{p.conformidadEn ? ` · ${new Date(p.conformidadEn).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
            {p.observacionRespuesta && (
                <div className="p-3 rounded-xl bg-chip">
                    <p className="text-caption font-black text-secondary">Dispenser La Tienda</p>
                    <p className="text-body text-ink whitespace-pre-line">{p.observacionRespuesta}</p>
                </div>
            )}
            {modo === 'admin' && <CerrarObservacion p={p} onListo={onListo} />}
        </div>
    );
}

// Admin: cerrar la observación. No cambia ningún número de la empresa.
function CerrarObservacion({ p, onListo }) {
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    if (p.observacionEstado === 'RESUELTA' || p.observacionEstado === 'NO_CORRESPONDE') return null;
    const cerrar = async (estado) => {
        if (estado === 'NO_CORRESPONDE' && !nota.trim()) { toast.error('Contale a la empresa por qué no corresponde'); return; }
        setEnviando(true);
        try {
            const r = await api.patch(`/pedidos-empresa/${p.id}/observacion`, { estado, nota: nota.trim() || null });
            toast.success('Listo, le avisamos a la empresa');
            onListo && onListo(r.data);
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo guardar'); }
        finally { setEnviando(false); }
    };
    return (
        <div className="pt-1 space-y-2">
            <textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} maxLength={2000}
                placeholder="Respuesta para la empresa (ej.: lo revisamos el martes, sin cargo)"
                className="w-full px-3.5 py-3 rounded-xl bg-chip text-body text-ink outline-none resize-none placeholder:text-muted" />
            <div className="flex gap-2">
                <button type="button" onClick={() => cerrar('NO_CORRESPONDE')} disabled={enviando}
                    className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95 disabled:opacity-50">No corresponde</button>
                <button type="button" onClick={() => cerrar('RESUELTA')} disabled={enviando}
                    className="flex-1 h-11 rounded-xl bg-[#16A34A] text-white text-label font-black active:scale-95 disabled:opacity-50">✓ Resuelta</button>
            </div>
            <p className="text-caption text-muted">Si hay que volver, usá “Agendar revisión” y decidí si va por garantía o se cobra.</p>
        </div>
    );
}
