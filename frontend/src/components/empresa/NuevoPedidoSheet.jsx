import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuMapPin, LuCheck, LuSearch, LuPlus, LuTriangleAlert } from 'react-icons/lu';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import { MOTIVOS_PEDIDO } from '../../utils/pedidosEmpresa';
import { CargarFotos } from './FotosPedido';

const INPUT = 'w-full h-11 px-3.5 rounded-xl bg-chip text-body text-ink outline-none placeholder:text-muted';

// Nuevo pedido (Portal Empresa, 7-oct-2026): reemplaza la tarjeta de Trello.
// Lugar (de sus sedes, o una dirección nueva), equipo, motivo, detalle y urgencia.
// soloMiLugar: encargado de un lugar (8-oct-2026) — no puede pedir para otra dirección
export default function NuevoPedidoSheet({ onCerrar, onCreado, inicial = null, soloMiLugar = false }) {
    const [sedes, setSedes] = useState([]);
    const [q, setQ] = useState('');
    const [sedeId, setSedeId] = useState(inicial?.sedeId || null);
    const [otra, setOtra] = useState(false);
    const [lugar, setLugar] = useState('');
    const [direccion, setDireccion] = useState('');
    const [serie, setSerie] = useState(inicial?.serie || '');
    const [motivo, setMotivo] = useState(inicial?.motivo || '');
    const [fotos, setFotos] = useState([]);
    const [detalle, setDetalle] = useState('');
    const [urgente, setUrgente] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.get('/empresa/sedes').then(r => {
            const l = Array.isArray(r.data) ? r.data : [];
            setSedes(l);
            if (l.length === 1 && soloMiLugar) setSedeId(l[0].id);
            if (l.length === 0 && !soloMiLugar) setOtra(true);
        }).catch(() => setOtra(true));
    }, []);

    const filtradas = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return sedes.slice(0, 30);
        return sedes.filter(s => [s.nombre, s.direccion, ...(s.series || [])].filter(Boolean).join(' ').toLowerCase().includes(t)).slice(0, 30);
    }, [q, sedes]);
    const sede = sedes.find(s => s.id === sedeId) || null;

    const listo = (otra ? direccion.trim() : sedeId) && motivo;

    const guardar = async () => {
        if (!listo) { toast.error(!motivo ? 'Elegí el motivo' : 'Elegí el lugar'); return; }
        setGuardando(true);
        try {
            const r = await api.post('/empresa/pedidos', {
                sedeId: otra ? null : sedeId,
                lugar: otra ? lugar.trim() || null : null,
                direccion: otra ? direccion.trim() : null,
                equipoSerie: serie.trim() || null,
                motivo,
                detalle: detalle.trim() || null,
                urgente,
                fotos,
            });
            toast.success('Pedido enviado');
            onCreado && onCreado(r.data);
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo enviar el pedido');
        } finally { setGuardando(false); }
    };

    return (
        <ModalShell titulo="Nuevo pedido" subtitulo="Te avisamos cuando lo agendemos" onCerrar={onCerrar} ancho="md:max-w-xl"
            pie={<button type="button" onClick={guardar} disabled={!listo || guardando}
                className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">{guardando ? 'Enviando…' : 'Enviar pedido'}</button>}>
            <div className="space-y-5">
                {/* Lugar */}
                <section className="space-y-2">
                    <p className="text-label font-black uppercase tracking-widest text-muted">¿Dónde?</p>
                    {!otra ? (
                        <>
                            {sedes.length > 6 && (
                                <div className="relative">
                                    <LuSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                    <input className={`${INPUT} pl-10`} placeholder="Buscar lugar, dirección o N/S" value={q} onChange={e => setQ(e.target.value)} />
                                </div>
                            )}
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {filtradas.map(s => {
                                    const on = s.id === sedeId;
                                    return (
                                        <button key={s.id} type="button" onClick={() => { setSedeId(s.id); if (s.series?.length === 1) setSerie(s.series[0]); }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left border-2 active:scale-[0.99] ${on ? 'border-brand-red bg-[rgba(201,52,31,0.06)]' : 'border-transparent bg-chip'}`}>
                                            <LuMapPin size={17} className={on ? 'text-brand-red shrink-0' : 'text-muted shrink-0'} />
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-body font-black text-ink truncate">{s.nombre || s.direccion}</span>
                                                {s.nombre && <span className="block text-caption text-muted truncate">{s.direccion}</span>}
                                            </span>
                                            {on && <LuCheck size={18} className="text-brand-red shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                            {!soloMiLugar && <button type="button" onClick={() => { setOtra(true); setSedeId(null); }} className="inline-flex items-center gap-1 py-1 text-caption font-bold text-secondary"><LuPlus size={14} /> Otra dirección</button>}
                        </>
                    ) : (
                        <div className="space-y-2">
                            <input className={INPUT} placeholder="Lugar (ej. Oficina Palermo) — opcional" value={lugar} onChange={e => setLugar(e.target.value)} />
                            <input className={INPUT} placeholder="Calle, número y localidad *" value={direccion} onChange={e => setDireccion(e.target.value)} />
                            {sedes.length > 0 && <button type="button" onClick={() => setOtra(false)} className="py-1 text-caption font-bold text-secondary underline">Elegir de mis lugares</button>}
                        </div>
                    )}
                </section>

                {/* Equipo */}
                <section className="space-y-2">
                    <p className="text-label font-black uppercase tracking-widest text-muted">Equipo (N/S)</p>
                    <input className={INPUT} placeholder="Número de serie — opcional" value={serie} onChange={e => setSerie(e.target.value)} list="series-sede" />
                    {sede?.series?.length > 0 && (
                        <>
                            <datalist id="series-sede">{sede.series.map(x => <option key={x} value={x} />)}</datalist>
                            {sede.series.length > 1 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {sede.series.slice(0, 12).map(x => (
                                        <button key={x} type="button" onClick={() => setSerie(x)}
                                            className={`h-8 px-3 rounded-full text-caption font-bold ${serie === x ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>{x}</button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Motivo */}
                <section className="space-y-2">
                    <p className="text-label font-black uppercase tracking-widest text-muted">¿Qué pasa?</p>
                    <div className="grid grid-cols-2 gap-2">
                        {MOTIVOS_PEDIDO.map(m => (
                            <button key={m} type="button" onClick={() => setMotivo(m)}
                                className={`h-11 px-3 rounded-xl text-label font-black text-left active:scale-95 ${motivo === m ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>{m}</button>
                        ))}
                    </div>
                    <textarea rows={3} value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Contanos más (piso, sector, horario de acceso, a quién preguntar…)"
                        className="w-full px-3.5 py-3 rounded-xl bg-chip text-body text-ink outline-none resize-none placeholder:text-muted" />
                </section>

                {/* Fotos del problema (8-oct-2026): el técnico llega sabiendo qué es */}
                <section className="space-y-2">
                    <p className="text-label font-black uppercase tracking-widest text-muted">Fotos <span className="normal-case tracking-normal font-bold">(opcional, hasta 4)</span></p>
                    <CargarFotos fotos={fotos} onChange={setFotos} />
                </section>

                <button type="button" onClick={() => setUrgente(u => !u)} aria-pressed={urgente}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left ${urgente ? 'border-brand-red bg-[rgba(201,52,31,0.06)]' : 'border-transparent bg-chip'}`}>
                    <LuTriangleAlert size={18} className={urgente ? 'text-brand-red' : 'text-muted'} />
                    <span className="flex-1">
                        <span className="block text-body font-black text-ink">Es urgente</span>
                        <span className="block text-caption text-muted">El equipo está fuera de servicio o pierde agua</span>
                    </span>
                    <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${urgente ? 'bg-[#C9341F]' : 'bg-black/15 dark:bg-white/15'}`}>
                        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${urgente ? 'translate-x-5' : ''}`} />
                    </span>
                </button>
            </div>
        </ModalShell>
    );
}
