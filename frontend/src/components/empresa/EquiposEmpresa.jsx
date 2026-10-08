import React, { useEffect, useMemo, useState } from 'react';
import { LuSearch, LuMapPin, LuChevronRight, LuHash } from 'react-icons/lu';
import api from '../../services/api';
import FichaEquipoSheet from './FichaEquipoSheet';
import MapaLeaflet, { linkGps } from '../mapa/MapaLeaflet';
import { Segmentado } from '../ui/Pantalla';
import { LuNavigation, LuX } from 'react-icons/lu';

// Portal Empresa — etapa 2 (7-oct-2026): los equipos de la empresa. Cada uno
// tiene su ficha con TODAS las visitas (no se borra nunca).
const fmt = (iso) => {
    if (!iso) return null;
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a.slice(2)}`;
};

export default function EquiposEmpresa({ onPedirServicio }) {
    const [equipos, setEquipos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [q, setQ] = useState('');
    const [abierto, setAbierto] = useState(null);
    const [modo, setModo] = useState('lista');
    const [lugares, setLugares] = useState(null);
    const [sel, setSel] = useState(null);

    // Mapa de sus lugares (7-oct-2026)
    const cargarLugares = () => api.get('/empresa/mapa')
        .then(r => setLugares((r.data || []).map(l => ({ ...l, id: `s${l.id}`, sedeId: l.id, color: '#C9341F', etiqueta: l.series?.length > 1 ? String(l.series.length) : null }))))
        .catch(() => setLugares(x => x || []));
    useEffect(() => {
        if (modo !== 'mapa' || lugares) return;
        cargarLugares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modo, lugares]);
    // M16: mientras haya lugares buscándose, se actualiza solo (antes quedaba "Ubicando…" hasta recargar)
    const buscando = (lugares || []).filter(l => l.lat == null && l.geo === 'PENDIENTE').length;
    useEffect(() => {
        if (modo !== 'mapa' || !buscando) return;
        const id = setTimeout(cargarLugares, 15000);
        return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modo, lugares, buscando]);
    const lugar = (lugares || []).find(l => l.id === sel);

    useEffect(() => {
        api.get('/empresa/equipos').then(r => setEquipos(Array.isArray(r.data) ? r.data : [])).catch(() => {}).finally(() => setCargando(false));
    }, []);

    const filtrados = useMemo(() => {
        const t = q.trim().toLowerCase();
        const l = t ? equipos.filter(e => [e.serie, e.sede, e.direccion, e.ubicacion, e.modelo].filter(Boolean).join(' ').toLowerCase().includes(t)) : equipos;
        return l.slice(0, 80);
    }, [equipos, q]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <Segmentado valor={modo} onChange={setModo} opciones={[{ id: 'lista', label: 'Lista' }, { id: 'mapa', label: 'Mapa' }]} />
            </div>
            {modo === 'mapa' ? (
                <div className="relative isolate rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06]">
                    <MapaLeaflet puntos={lugares || []} seleccionado={sel} ajustarKey={lugares ? lugares.length : 0}
                        onClickPunto={(p) => setSel(p.id)} onClickMapa={() => setSel(null)}
                        className="w-full h-[calc(var(--vh,1vh)*100-330px)] min-h-[360px]" />
                    {buscando > 0 && (
                        <span className="absolute top-3 left-3 z-[500] h-8 px-3 rounded-full bg-card shadow text-caption font-bold text-secondary inline-flex items-center">
                            Ubicando {buscando} lugar{buscando !== 1 ? 'es' : ''}…
                        </span>
                    )}
                    {lugar && (
                        <div className="absolute left-3 right-3 bottom-3 z-[600] p-4 rounded-2xl bg-card shadow-xl space-y-3">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-body-lg font-black text-ink leading-tight">{lugar.nombre || lugar.direccion}</p>
                                    <p className="text-caption text-secondary">{lugar.direccion}</p>
                                </div>
                                <button type="button" onClick={() => setSel(null)} aria-label="Cerrar" className="w-8 h-8 shrink-0 rounded-lg bg-chip text-muted flex items-center justify-center"><LuX size={15} /></button>
                            </div>
                            {lugar.series?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {lugar.series.map(s => (
                                        <button key={s} type="button" onClick={() => setAbierto(s)} className="h-8 px-3 rounded-full bg-chip text-caption font-black text-secondary active:scale-95"># {s}</button>
                                    ))}
                                </div>
                            )}
                            <a href={linkGps(lugar.direccion, lugar.lat, lugar.lng)} target="_blank" rel="noreferrer"
                                className="h-10 rounded-xl bg-[#C9341F] text-white text-label font-black inline-flex items-center justify-center gap-1.5 w-full"><LuNavigation size={15} /> Cómo llegar</a>
                        </div>
                    )}
                </div>
            ) : (<>
            <div className="relative">
                <LuSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por N/S, lugar o dirección"
                    className="w-full h-12 pl-11 pr-3.5 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] text-body text-ink outline-none placeholder:text-muted" />
            </div>
            {cargando ? (
                <p className="py-16 text-center text-muted text-body">Cargando…</p>
            ) : equipos.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                    <p className="text-body-lg font-black text-ink">Todavía no hay equipos cargados</p>
                    <p className="text-body text-muted">Aparecen acá a medida que los atendemos.</p>
                </div>
            ) : (
                <>
                    <p className="text-caption text-muted">{q ? `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}` : `${equipos.length} equipo${equipos.length !== 1 ? 's' : ''}`}{filtrados.length === 80 ? ' · mostrando 80, buscá para encontrar el resto' : ''}</p>
                    <div className="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.05] dark:divide-white/[0.05] overflow-hidden">
                        {filtrados.map(e => (
                            <button key={e.serie} type="button" onClick={() => setAbierto(e.serie)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-chip">
                                <span className="w-9 h-9 shrink-0 rounded-xl bg-chip text-secondary flex items-center justify-center"><LuHash size={16} /></span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-body font-black text-ink truncate">{e.serie}{e.modelo ? <span className="text-muted font-bold"> · {e.modelo}</span> : null}</span>
                                    <span className="flex items-center gap-1 text-caption text-muted truncate"><LuMapPin size={12} className="shrink-0" />{e.sede || e.direccion}</span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block text-[11px] font-bold text-muted uppercase">Última visita</span>
                                    <span className="block text-caption font-black text-secondary">{fmt(e.ultimaVisita) || '—'}</span>
                                </span>
                                <LuChevronRight size={16} className="shrink-0 text-muted" />
                            </button>
                        ))}
                    </div>
                </>
            )}
            </>)}
            {abierto && <FichaEquipoSheet serie={abierto} onCerrar={() => setAbierto(null)}
                onPedirServicio={(eq) => { setAbierto(null); onPedirServicio && onPedirServicio(eq); }} />}
        </div>
    );
}
