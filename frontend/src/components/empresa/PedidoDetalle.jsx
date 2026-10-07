import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuMapPin, LuClock, LuSend, LuNavigation, LuTriangleAlert, LuHash, LuMessageCircle } from 'react-icons/lu';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import InformeTrabajo from './InformeTrabajo';
import { estadoDe, cuandoPedido, linkMaps, haceCuanto, PASOS_PEDIDO, esAbierto } from '../../utils/pedidosEmpresa';

// Ficha de un pedido (Portal Empresa, 7-oct-2026). La usan los dos lados:
// la empresa (modo="empresa") y el admin (modo="admin", con Agendar / Cancelar).
// La conversación del pedido reemplaza los comentarios de Trello.
export default function PedidoDetalle({ pedido: inicial, modo = 'empresa', onCerrar, onCambio, onAgendar }) {
    const base = modo === 'empresa' ? '/empresa/pedidos' : '/pedidos-empresa';
    const [p, setP] = useState(inicial);
    const [comentarios, setComentarios] = useState([]);
    const [informe, setInforme] = useState([]);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const finRef = useRef(null);
    useEffect(() => { setP(inicial); }, [inicial]); // al agendar llega el pedido actualizado

    const cargar = useCallback(async () => {
        try {
            const [r1, r2] = await Promise.all([api.get(`${base}/${inicial.id}`), api.get(`${base}/${inicial.id}/comentarios`)]);
            setP(r1.data);
            setComentarios(Array.isArray(r2.data) ? r2.data : []);
        } catch { /* queda lo que había */ }
    }, [base, inicial.id]);

    useEffect(() => { cargar(); const id = setInterval(cargar, 15000); return () => clearInterval(id); }, [cargar]);
    // Etapa 2: cuando la visita quedó hecha, el informe (qué se hizo, repuestos, fotos)
    const hecho = p.estado === 'HECHO';
    useEffect(() => {
        if (!hecho) return;
        api.get(`${base}/${inicial.id}/informe`).then(r => setInforme(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, [hecho, base, inicial.id]);
    useEffect(() => { finRef.current?.scrollIntoView({ block: 'end' }); }, [comentarios.length]);

    const enviar = async () => {
        const t = texto.trim();
        if (!t) return;
        setEnviando(true);
        try {
            const r = await api.post(`${base}/${p.id}/comentarios`, { texto: t });
            setComentarios(c => [...c, r.data]);
            setTexto('');
            onCambio && onCambio();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo enviar');
        } finally { setEnviando(false); }
    };

    const cancelar = async () => {
        const motivo = modo === 'admin' ? window.prompt('¿Por qué se cancela? (le llega a la empresa)', '') : null;
        if (modo === 'admin' && motivo === null) return;
        if (modo === 'empresa' && !window.confirm('¿Cancelar este pedido?')) return;
        try {
            const r = modo === 'empresa'
                ? await api.patch(`${base}/${p.id}/cancelar`)
                : await api.patch(`${base}/${p.id}/rechazar`, { motivo });
            setP(r.data);
            toast.success('Pedido cancelado');
            onCambio && onCambio();
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo cancelar');
        }
    };

    const est = estadoDe(p);
    const cuando = cuandoPedido(p);
    const sinVisitaActiva = !p.ordenId || ['NO_ATENDIDO', 'PAUSADO'].includes(p.estado);
    const puedeCancelar = modo === 'admin' ? esAbierto(p) && sinVisitaActiva : p.estado === 'NUEVO' && !p.ordenId;
    const puedeAgendar = modo === 'admin' && esAbierto(p) && sinVisitaActiva;

    return (
        <ModalShell titulo={`${p.motivo || 'Pedido'}${p.urgente ? ' · urgente' : ''}`}
            subtitulo={`Pedido #${p.id}${modo === 'admin' && p.clienteNombre ? ' · ' + p.clienteNombre : ''} · ${haceCuanto(p.creadoEn)}${p.creadoPorNombre ? ' · ' + p.creadoPorNombre : ''}`}
            onCerrar={onCerrar} ancho="md:max-w-xl"
            pie={esAbierto(p) || comentarios.length ? (
                <div className="space-y-2">
                    <div className="flex items-end gap-2">
                        <textarea rows={1} value={texto} onChange={e => setTexto(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                            placeholder={modo === 'empresa' ? 'Escribinos algo sobre este pedido…' : 'Responderle a la empresa…'}
                            className="flex-1 min-h-[44px] max-h-32 px-3.5 py-2.5 rounded-xl bg-chip text-body text-ink outline-none resize-none" />
                        <button type="button" onClick={enviar} disabled={!texto.trim() || enviando} aria-label="Enviar"
                            className="w-11 h-11 shrink-0 rounded-xl bg-[#C9341F] text-white flex items-center justify-center active:scale-95 disabled:opacity-40"><LuSend size={18} /></button>
                    </div>
                    {(puedeAgendar || puedeCancelar) && (
                        <div className="flex gap-2">
                            {puedeCancelar && <button type="button" onClick={cancelar} className="flex-1 h-11 rounded-xl bg-chip text-secondary text-label font-black active:scale-95">Cancelar pedido</button>}
                            {puedeAgendar && <button type="button" onClick={() => onAgendar && onAgendar(p)} className="flex-[2] h-11 rounded-xl bg-[#C9341F] text-white text-label font-black active:scale-95">{p.ordenId ? 'Volver a agendar' : 'Agendar visita'}</button>}
                        </div>
                    )}
                </div>
            ) : null}>
            <div className="space-y-4">
                {/* Estado */}
                <div className="rounded-2xl bg-panel p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: est.color }} />
                        <span className="text-body font-black text-ink">{est.label}</span>
                        {p.urgente && <span className="ml-auto inline-flex items-center gap-1 text-caption font-black text-brand-red"><LuTriangleAlert size={13} /> Urgente</span>}
                    </div>
                    {est.paso >= 0 && (
                        <div className="flex gap-1">
                            {PASOS_PEDIDO.map((paso, i) => (
                                <div key={paso} className="flex-1 min-w-0">
                                    <div className="h-1.5 rounded-full" style={{ background: i <= est.paso ? est.color : 'var(--chip, rgba(0,0,0,0.08))' }} />
                                    <p className={`mt-1 text-[11px] font-bold truncate ${i <= est.paso ? 'text-ink' : 'text-muted'}`}>{paso}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {cuando && <p className="flex items-center gap-2 text-label font-bold text-secondary"><LuClock size={15} className="shrink-0 text-muted" />{cuando}</p>}
                </div>

                {/* Datos */}
                <div className="space-y-2">
                    <a href={linkMaps(p.direccion)} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 p-3 rounded-2xl bg-chip active:scale-[0.99]">
                        <LuMapPin size={17} className="shrink-0 mt-0.5 text-brand-red" />
                        <span className="flex-1 min-w-0">
                            {p.lugar && p.lugar !== p.direccion && <span className="block text-body font-black text-ink">{p.lugar}</span>}
                            <span className="block text-label text-secondary">{p.direccion}</span>
                        </span>
                        <LuNavigation size={16} className="shrink-0 mt-0.5 text-muted" />
                    </a>
                    {p.equipoSerie && <p className="flex items-center gap-2 px-1 text-label font-bold text-secondary"><LuHash size={15} className="text-muted" />Equipo N/S {p.equipoSerie}</p>}
                    {p.detalle && <p className="px-1 text-body text-ink whitespace-pre-line">{p.detalle}</p>}
                </div>

                {hecho && <InformeTrabajo pedido={p} items={informe} />}

                {/* Conversación */}
                <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-label font-black uppercase tracking-widest text-muted"><LuMessageCircle size={14} /> Conversación</p>
                    {comentarios.length === 0 && <p className="text-caption text-muted">Todavía no hay mensajes. Lo que escriban acá queda guardado en el pedido.</p>}
                    {comentarios.map(c => {
                        const mio = modo === 'empresa' ? c.deEmpresa : !c.deEmpresa;
                        return (
                            <div key={c.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl ${mio ? 'bg-[rgba(201,52,31,0.12)] rounded-br-md' : 'bg-chip rounded-bl-md'}`}>
                                    {!mio && <p className="text-[11px] font-black text-secondary">{c.autorNombre}</p>}
                                    <p className="text-body text-ink whitespace-pre-line break-words">{c.texto}</p>
                                    <p className="text-[10px] text-muted text-right">{haceCuanto(c.creadoEn)}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={finRef} />
                </div>
            </div>
        </ModalShell>
    );
}
