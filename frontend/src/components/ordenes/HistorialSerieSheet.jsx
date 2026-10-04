import React, { useState } from 'react';
import { LuSearch, LuX, LuShieldCheck, LuShieldOff, LuMapPin } from 'react-icons/lu';
import api from '../../services/api';
import { getTodayISO } from '../../utils/dateUtils';

// Historial de un equipo por N° de serie (2-oct-2026): el técnico frente al dispenser
// escribe la serie y ve qué se le hizo, cuándo, qué repuestos y si sigue en garantía.
// Sin montos (ver HistorialSerieController.java).

const fmtFecha = f => {
    if (!f) return '-';
    const [a, m, d] = String(f).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
};

export default function HistorialSerieSheet({ onClose }) {
    const [serie, setSerie] = useState('');
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const buscar = async (valor = serie) => {
        const s = valor.trim();
        if (!s) return;
        setCargando(true); setError(''); setData(null);
        try {
            const r = await api.get('/equipos/historial', { params: { serie: s } });
            setData(r.data);
        } catch {
            setError('No se pudo buscar. Probá de nuevo.');
        } finally {
            setCargando(false);
        }
    };

    const hoy = getTodayISO();
    const garantia = data?.visitas?.find(v => v.garantiaHasta)?.garantiaHasta;
    const enGarantia = garantia && String(garantia) >= hoy;

    return (
        <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/50 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6" onClick={onClose}>
            <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-5 bg-card max-h-[calc(var(--vh,1vh)*90)] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-body-lg font-black text-ink">Historial del equipo</h3>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center bg-chip text-muted active:scale-95">
                        <LuX size={16} />
                    </button>
                </div>

                <form onSubmit={e => { e.preventDefault(); buscar(); }} className="flex gap-1.5 mb-4">
                    <input autoFocus value={serie} onChange={e => setSerie(e.target.value.toUpperCase())}
                        placeholder="N° de serie (o una parte)"
                        className="flex-1 h-11 px-3 rounded-xl text-body font-bold outline-none bg-panel text-ink border border-black/[0.05] dark:border-white/[0.05]" />
                    <button type="submit" disabled={cargando || !serie.trim()}
                        className="h-11 px-4 rounded-xl font-black text-label uppercase bg-brand-red text-white active:scale-95 flex items-center gap-1.5 disabled:opacity-40">
                        <LuSearch size={15} /> {cargando ? '...' : 'Buscar'}
                    </button>
                </form>

                {error && <p className="text-caption text-brand-red font-bold">{error}</p>}

                {data && !data.encontrado && (
                    <div className="text-caption text-muted">
                        <p className="font-bold text-ink mb-1">
                            {data.sugerencias?.length > 0
                                ? 'Hay varios equipos que coinciden. Elegí uno:'
                                : 'No encontré ningún equipo en el que hayas trabajado con esa serie.'}
                        </p>
                        {data.sugerencias?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {data.sugerencias.map(s => (
                                    <button key={s} onClick={() => { setSerie(s); buscar(s); }}
                                        className="px-2 py-0.5 rounded-md bg-chip text-secondary font-bold">{s}</button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {data?.encontrado && (
                    <>
                        <div className="p-3.5 rounded-xl bg-page border border-black/[0.04] dark:border-white/[0.04] mb-3">
                            <p className="font-black text-body text-ink">{data.equipo.serie}
                                <span className="font-bold text-muted"> · {[data.equipo.marca, data.equipo.modelo].filter(Boolean).join(' ')}</span>
                            </p>
                            <p className="text-caption text-secondary">{[data.equipo.cliente, data.equipo.sede].filter(Boolean).join(' · ')}</p>
                            {(data.equipo.direccion || data.equipo.ubicacion) && (
                                <p className="text-caption text-muted flex items-center gap-1 mt-0.5">
                                    <LuMapPin size={11} />{[data.equipo.direccion, data.equipo.ubicacion].filter(Boolean).join(' · ')}
                                </p>
                            )}
                            {garantia ? (
                                <p className={`mt-2 inline-flex items-center gap-1 text-label font-black px-2 py-1 rounded-md ${enGarantia
                                    ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#0F2E1A] dark:text-[#4ADE80]'
                                    : 'bg-chip text-muted'}`}>
                                    {enGarantia ? <LuShieldCheck size={13} /> : <LuShieldOff size={13} />}
                                    {enGarantia ? `En garantía hasta ${fmtFecha(garantia)}` : `Garantía vencida (${fmtFecha(garantia)})`}
                                </p>
                            ) : null}
                        </div>

                        {data.visitas.length === 0 ? (
                            <p className="text-caption text-muted text-center py-6">Sin trabajos registrados todavía.</p>
                        ) : (
                            <div className="space-y-2">
                                {data.visitas.map((v, i) => (
                                    <div key={`${v.servicioId}-${i}`} className="p-3 rounded-xl bg-page border border-black/[0.04] dark:border-white/[0.04]">
                                        <div className="flex justify-between text-caption mb-1">
                                            <span className="font-black text-ink">{fmtFecha(v.fecha)}</span>
                                            <span className="text-muted">{v.tecnico || ''} · #{v.servicioId}</span>
                                        </div>
                                        <p className="text-caption text-secondary leading-snug">{v.trabajo || 'Sin detalle'}</p>
                                        {v.repuestos?.length > 0 && (
                                            <p className="text-caption text-muted mt-1">
                                                <span className="font-bold">Repuestos: </span>
                                                {v.repuestos.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
