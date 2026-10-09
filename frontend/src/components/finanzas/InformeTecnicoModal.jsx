import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuFileText, LuSheet, LuCamera } from 'react-icons/lu';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import ResumenInforme from './ResumenInforme';
import { useMontos } from '../../context/MontosContext';
import { generarPDFInformeTecnico, generarExcelInformeTecnico, estadoDe, textoTrabajo } from '../../utils/pdf/informeTecnico';

// Informe por técnico (9-oct-2026): elegís técnico y período, marcás los trabajos
// y sale un PDF/Excel con lo hecho, las fotos y, si querés, montos, ganancia y
// las cuentas con el técnico (quién cobró y la diferencia).
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fCorta = f => (f ? String(f).slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '');
const INPUT = 'h-10 px-3 rounded-xl bg-chip text-body font-bold text-ink outline-none w-full';

function Interruptor({ activo, onClick, children }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={activo}
            className={`h-9 px-3 rounded-xl text-label font-black active:scale-95 ${activo ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>{children}</button>
    );
}

export default function InformeTecnicoModal({ tecnicoInicial = null, onCerrar }) {
    const { ocultar } = useMontos();
    const hoy = new Date();
    const [tecnicos, setTecnicos] = useState([]);
    const [tecnicoId, setTecnicoId] = useState(tecnicoInicial ? String(tecnicoInicial) : '');
    const [desde, setDesde] = useState(iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
    const [hasta, setHasta] = useState(iso(hoy));
    const [inf, setInf] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [marcados, setMarcados] = useState(new Set());
    const [precios, setPrecios] = useState(true);
    const [ganancia, setGanancia] = useState(true);
    const [generando, setGenerando] = useState(false);

    useEffect(() => {
        api.get('/ordenes/tecnicos').then(r => setTecnicos(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!tecnicoId || !desde || !hasta) { setInf(null); return; }
        // Si cambian las fechas mientras carga, la respuesta vieja se descarta
        let vigente = true;
        setCargando(true);
        api.get('/servicios/informe-tecnico', { params: { tecnicoId, desde, hasta } })
            .then(r => { if (!vigente) return; setInf(r.data); setMarcados(new Set((r.data?.trabajos || []).map(t => t.servicioId))); })
            .catch(e => { if (!vigente) return; setInf(null); toast.error(e?.response?.data?.mensaje || 'No se pudo cargar'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [tecnicoId, desde, hasta]);

    const trabajos = useMemo(() => inf?.trabajos || [], [inf]);
    const elegidos = useMemo(() => trabajos.filter(t => marcados.has(t.servicioId)), [trabajos, marcados]);
    const nom = (inf?.tecnicoNombre || '').split(' ')[0] || 'Técnico';
    const alternar = id => setMarcados(m => { const n = new Set(m); n.has(id) ? n.delete(id) : n.add(id); return n; });

    // Quién cobró: se guarda en el trabajo y se actualiza la cuenta
    const marcarCobro = async (t, valor) => {
        try {
            await api.patch(`/servicios/${t.servicioId}/cobrado-por`, { cobradoPor: valor || null });
            // En un archivado viejo, marcar quién cobró es decir que se cobró (y vaciarlo, que no)
            setInf(i => ({ ...i, trabajos: i.trabajos.map(x => x.servicioId === t.servicioId
                ? { ...x, cobradoPor: valor || null, cobradoPorDeducido: false, cobrado: x.archivadoSinDato ? !!valor : x.cobrado } : x) }));
        } catch { toast.error('No se pudo guardar'); }
    };

    const bajar = async (tipo) => {
        if (!elegidos.length) { toast.error('Marcá al menos un trabajo'); return; }
        setGenerando(true);
        try {
            const opts = { precios, ganancia: precios && ganancia };
            if (tipo === 'pdf') await generarPDFInformeTecnico(inf, elegidos, opts);
            else await generarExcelInformeTecnico(inf, elegidos, opts);
        } finally { setGenerando(false); }
    };

    const pie = inf && trabajos.length > 0 ? (
        <div className="flex gap-2">
            <button type="button" onClick={() => bajar('excel')} disabled={generando}
                className="flex-1 h-12 rounded-xl bg-chip text-ink text-label font-black inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"><LuSheet size={16} /> Excel</button>
            <button type="button" onClick={() => bajar('pdf')} disabled={generando}
                className="flex-[2] h-12 rounded-xl bg-[#C9341F] text-white text-label font-black inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50">
                <LuFileText size={16} /> {generando ? 'Generando…' : `PDF · ${elegidos.length} trabajo${elegidos.length !== 1 ? 's' : ''}`}</button>
        </div>
    ) : null;

    return (
        <ModalShell titulo="Informe por técnico" subtitulo="Trabajos, fotos, cobros y ganancia" onCerrar={onCerrar} ancho="md:max-w-3xl" pie={pie}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className={INPUT} aria-label="Técnico">
                        <option value="">Elegí el técnico…</option>
                        {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2 md:col-span-2">
                        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={INPUT} aria-label="Desde" />
                        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={INPUT} aria-label="Hasta" />
                    </div>
                </div>

                {!tecnicoId ? <p className="py-10 text-center text-body text-muted">Elegí un técnico para ver sus trabajos.</p>
                    : cargando ? <p className="py-10 text-center text-body text-muted">Cargando…</p>
                    : !trabajos.length ? <p className="py-10 text-center text-body text-muted">No hay trabajos de {nom} en esas fechas.</p>
                    : (<>
                        <div className="flex flex-wrap items-center gap-2">
                            <Interruptor activo={precios} onClick={() => setPrecios(v => !v)}>Con montos</Interruptor>
                            {precios && <Interruptor activo={ganancia} onClick={() => setGanancia(v => !v)}>Con ganancia</Interruptor>}
                            <span className="flex-1" />
                            <button type="button" onClick={() => setMarcados(new Set(trabajos.map(t => t.servicioId)))} className="text-label font-black text-secondary underline underline-offset-2">Todos</button>
                            <button type="button" onClick={() => setMarcados(new Set())} className="text-label font-black text-secondary underline underline-offset-2">Ninguno</button>
                        </div>

                        <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.05] dark:divide-white/[0.05] overflow-hidden">
                            {trabajos.map(t => {
                                const on = marcados.has(t.servicioId);
                                const fotos = (t.equipos || []).some(e => e.fotoAntes || e.fotoDespues);
                                return (
                                    <div key={t.servicioId} className={`flex items-start gap-3 px-3.5 py-3 ${on ? '' : 'opacity-50'}`}>
                                        <input type="checkbox" checked={on} onChange={() => alternar(t.servicioId)} aria-label={`Incluir trabajo #${t.servicioId}`}
                                            className="mt-1 w-5 h-5 shrink-0 accent-[#C9341F]" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-body font-black text-ink truncate">{fCorta(t.fecha)} · {t.cliente}</p>
                                            <p className="text-caption text-secondary truncate">{t.direccion || '—'}</p>
                                            <p className="text-caption text-muted line-clamp-2 whitespace-pre-line">{textoTrabajo(t)}</p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                <span className="h-6 px-2 rounded-full bg-chip text-[11px] font-black text-secondary inline-flex items-center">{estadoDe(t)}</span>
                                                {fotos && <span className="h-6 px-2 rounded-full bg-chip text-[11px] font-black text-secondary inline-flex items-center gap-1"><LuCamera size={11} /> Fotos</span>}
                                                {t.porVisita && <span className="h-6 px-2 rounded-full bg-chip text-[11px] font-black text-secondary inline-flex items-center">Por visita</span>}
                                                {(t.cobrado || t.archivadoSinDato) && (
                                                    <select value={t.cobradoPor || ''} onChange={e => marcarCobro(t, e.target.value)} aria-label="Quién cobró"
                                                        className={`h-6 pl-2 pr-1 rounded-full text-[11px] font-black outline-none ${t.cobradoPor ? 'bg-[rgba(22,163,74,0.12)] text-[#16A34A]' : 'bg-[rgba(212,136,0,0.14)] text-[#A16207] dark:text-[#F0A500]'}`}>
                                                        <option value="">{t.archivadoSinDato ? (t.cobradoPor ? 'No se cobró' : '¿Se cobró?') : '¿Quién cobró?'}</option>
                                                        <option value="TECNICO">Cobró {nom}</option>
                                                        <option value="NEGOCIO">Me pagaron a mí</option>
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                        {precios && (
                                            <div className="shrink-0 text-right">
                                                <p className="text-body font-black text-ink tabular-nums">{ocultar ? '••••' : `$ ${Math.round(t.total).toLocaleString('es-AR')}`}</p>
                                                {ganancia && <p className="text-caption font-bold text-[#A16207] dark:text-[#F0A500] tabular-nums">{ocultar ? '' : `+$ ${Math.round(t.gananciaNegocio).toLocaleString('es-AR')} · ${Number(t.margenPorcentaje).toFixed(0)}%`}</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {precios && elegidos.length > 0 && <ResumenInforme inf={inf} trabajos={elegidos} conGanancia={ganancia} />}
                    </>)}
            </div>
        </ModalShell>
    );
}
