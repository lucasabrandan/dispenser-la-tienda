import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuMessageCircle, LuSend, LuChevronRight } from 'react-icons/lu';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';

// Conversación admin ↔ técnico dentro de cada visita (8-oct-2026), como la de los
// pedidos de empresa: queda guardada con fecha y hora junto al trabajo. Además de lo
// que se escribe, aparecen solos los avisos del recorrido (confirmó, en camino, llegó,
// no puede ir, reprogramada…). Cada mensaje le llega al otro como notificación.

const RAPIDOS = {
    tecnico: ['Voy en camino', 'Llego en 15 min', 'Voy demorado', 'El cliente no está', 'Necesito un repuesto', 'Terminé, ya salgo'],
    admin: ['¿Cómo venís?', 'Avisame cuando llegues', 'Llamame cuando puedas', 'El cliente ya está avisado', 'Mandame foto del equipo'],
};

const hhmm = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const diaDe = (iso) => {
    const d = new Date(iso); const hoy = new Date(); const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' });
};
const claveVisto = (ordenId) => `chat_visita_visto_${ordenId}`;
const leerVisto = (ordenId) => { try { return Number(localStorage.getItem(claveVisto(ordenId)) || 0); } catch { return 0; } };
const marcarVisto = (ordenId, id) => { try { if (id) localStorage.setItem(claveVisto(ordenId), String(id)); } catch { /* */ } };

// Mensajes nuevos del otro lado (no los míos ni los automáticos que generé yo)
const sinLeer = (mensajes, ordenId, soyAdmin) => {
    const visto = leerVisto(ordenId);
    return mensajes.filter(m => m.id > visto && !m.sistema && m.deAdmin !== soyAdmin).length;
};

export function ChatVisitaSheet({ orden, soyAdmin, onCerrar, onCambio }) {
    const [mensajes, setMensajes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const enviandoRef = useRef(false);
    const finRef = useRef(null);

    const cargar = useCallback(async () => {
        try {
            const r = await api.get(`/ordenes/${orden.id}/mensajes`);
            setMensajes(r.data || []);
            const ult = (r.data || []).slice(-1)[0];
            if (ult) marcarVisto(orden.id, ult.id);
        } catch { /* sin señal: se reintenta */ }
        finally { setCargando(false); }
    }, [orden.id]);

    useEffect(() => { cargar(); const id = setInterval(cargar, 10000); return () => clearInterval(id); }, [cargar]);
    useEffect(() => { finRef.current?.scrollIntoView({ block: 'end' }); }, [mensajes.length]);
    useEffect(() => () => { onCambio && onCambio(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const enviar = async (t0) => {
        const t = String(t0 ?? texto).trim();
        if (!t || enviandoRef.current) return;
        enviandoRef.current = true;
        setEnviando(true);
        try {
            const r = await api.post(`/ordenes/${orden.id}/mensajes`, { texto: t });
            setMensajes(ms => [...ms, r.data]);
            marcarVisto(orden.id, r.data?.id);
            if (t0 == null) setTexto('');
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo enviar. Probá de nuevo.');
        } finally { enviandoRef.current = false; setEnviando(false); }
    };

    const otro = soyAdmin ? (orden.tecnicoNombre || 'el técnico') : 'el admin';
    let diaAnterior = null;
    return (
        <ModalShell titulo={`Conversación con ${soyAdmin ? (orden.tecnicoNombre || 'el técnico').split(' ')[0] : 'el admin'}`}
            subtitulo={`${orden.clienteNombre || orden.titulo || 'Visita'} · visita #${orden.id}`}
            onCerrar={onCerrar} ancho="md:max-w-xl"
            pie={
                <div className="space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
                        {RAPIDOS[soyAdmin ? 'admin' : 'tecnico'].map(r => (
                            <button key={r} type="button" disabled={enviando} onClick={() => enviar(r)}
                                className="h-8 px-3 shrink-0 rounded-full bg-chip text-label font-bold text-secondary active:scale-95 disabled:opacity-40">{r}</button>
                        ))}
                    </div>
                    <div className="flex items-end gap-2">
                        <textarea rows={1} value={texto} onChange={e => setTexto(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                            placeholder={`Escribile a ${otro}…`}
                            className="flex-1 min-h-[44px] max-h-32 px-3.5 py-2.5 rounded-xl bg-chip text-body text-ink outline-none resize-none" />
                        <button type="button" onClick={() => enviar()} disabled={!texto.trim() || enviando} aria-label="Enviar"
                            className="w-11 h-11 shrink-0 rounded-xl bg-[#C9341F] text-white flex items-center justify-center active:scale-95 disabled:opacity-40"><LuSend size={18} /></button>
                    </div>
                </div>
            }>
            <div className="space-y-2">
                {cargando && <div className="h-20 rounded-2xl bg-panel animate-pulse" />}
                {!cargando && mensajes.length === 0 && (
                    <p className="text-caption text-muted text-center py-6">Todavía no hay mensajes. Lo que escriban acá queda guardado en esta visita, con fecha y hora.</p>
                )}
                {mensajes.map(m => {
                    const dia = diaDe(m.creadoEn);
                    const sep = dia !== diaAnterior ? (diaAnterior = dia) : null;
                    const mio = m.deAdmin === soyAdmin && !m.sistema;
                    return (
                        <React.Fragment key={m.id}>
                            {sep && <p className="pt-2 text-center text-[11px] font-black uppercase tracking-widest text-muted">{sep}</p>}
                            {m.sistema ? (
                                <div className="flex justify-center">
                                    <p className="max-w-[90%] px-3 py-1 rounded-full bg-panel text-[12px] text-secondary text-center">
                                        <span className="font-black text-muted">{hhmm(m.creadoEn)}</span> · {m.autorNombre ? <b className="text-ink">{m.autorNombre.split(' ')[0]}</b> : null}{m.autorNombre ? ': ' : ''}{m.texto}
                                    </p>
                                </div>
                            ) : (
                                <div className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl ${mio ? 'bg-[rgba(201,52,31,0.12)] rounded-br-md' : 'bg-chip rounded-bl-md'}`}>
                                        {!mio && <p className="text-[11px] font-black text-secondary">{m.autorNombre}</p>}
                                        <p className="text-body text-ink whitespace-pre-line break-words">{m.texto}</p>
                                        <p className="text-[10px] text-muted text-right">{hhmm(m.creadoEn)}</p>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                <div ref={finRef} />
            </div>
        </ModalShell>
    );
}

// Botón que va en la tarjeta de la visita (técnico) y en la ficha (admin)
export default function ChatVisita({ orden, soyAdmin, className = '' }) {
    const [abierto, setAbierto] = useState(false);
    const [resumen, setResumen] = useState({ total: 0, nuevos: 0, ultimo: null });

    const actualizar = useCallback(() => {
        api.get(`/ordenes/${orden.id}/mensajes`).then(r => {
            const ms = r.data || [];
            const escritos = ms.filter(m => !m.sistema);
            setResumen({ total: escritos.length, nuevos: sinLeer(ms, orden.id, soyAdmin), ultimo: escritos.slice(-1)[0] || null });
        }).catch(() => {});
    }, [orden.id, soyAdmin]);
    useEffect(() => { actualizar(); }, [actualizar]);
    // Abrir directo desde una notificación de mensaje (Layout guarda cuál)
    useEffect(() => {
        try {
            if (sessionStorage.getItem('abrirChatOrden') === String(orden.id)) { sessionStorage.removeItem('abrirChatOrden'); setAbierto(true); }
        } catch { /* */ }
        const alAbrir = (ev) => {
            if (ev.detail !== String(orden.id)) return;
            try { sessionStorage.removeItem('abrirChatOrden'); } catch { /* */ }
            setAbierto(true);
        };
        window.addEventListener('abrir-chat-orden', alAbrir);
        return () => window.removeEventListener('abrir-chat-orden', alAbrir);
    }, [orden.id]);

    return (
        <>
            <button type="button" onClick={e => { e.stopPropagation(); setAbierto(true); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-panel text-left active:scale-[0.99] transition-all ${className}`}>
                <span className="relative shrink-0 text-secondary">
                    <LuMessageCircle size={18} />
                    {resumen.nuevos > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C9341F]" />}
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-label font-black text-ink">
                        {soyAdmin ? `Conversación con ${(orden.tecnicoNombre || 'el técnico').split(' ')[0]}` : 'Conversación con el admin'}
                        {resumen.nuevos > 0 ? <span className="ml-1.5 text-[#C9341F]">· {resumen.nuevos} nuevo{resumen.nuevos !== 1 ? 's' : ''}</span> : resumen.total ? <span className="ml-1.5 text-muted font-bold">({resumen.total})</span> : null}
                    </span>
                    <span className="block text-caption text-muted truncate">
                        {resumen.ultimo ? `${resumen.ultimo.autorNombre?.split(' ')[0] || ''}: ${resumen.ultimo.texto}` : 'Escribir, con historial de todo lo que pasó'}
                    </span>
                </span>
                <LuChevronRight size={16} className="shrink-0 text-muted" />
            </button>
            {abierto && <ChatVisitaSheet orden={orden} soyAdmin={soyAdmin} onCerrar={() => setAbierto(false)} onCambio={actualizar} />}
        </>
    );
}
