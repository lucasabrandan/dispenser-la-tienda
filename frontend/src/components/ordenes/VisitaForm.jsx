import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuChevronLeft, LuChevronRight, LuX, LuMapPin, LuPlus, LuSearch, LuCheck } from 'react-icons/lu';
import api from '../../services/api';
import { colorTecnico, etapaColor } from '../../utils/estados';
import { formatDateISO, getTodayISO, lunesDeLaSemana } from '../../utils/dateUtils';
import AvatarTecnico from '../ui/AvatarTecnico';

// Nueva visita (3-oct-2026, opción B "paso a paso" + el "elegí el hueco" de la C).
//   1 · ¿A quién?  — buscar cliente / N° de serie, recientes, o cliente nuevo
//   2 · ¿Qué?      — motivo; si tiene tarifa mensual, equipos de UNA dirección
//   3 · ¿Quién y cuándo? — la agenda del día por técnico: se toca el hueco libre
// Clientes con tarifa (MODO AGUA): al cerrar la visita el técnico carga cada equipo
// por N/S y va al cierre mensual (ver CargaPorSerieSheet). Editar sigue en OrdenForm.

const MOTIVOS = ['Service', 'Revisar falla', 'Instalación', 'Retiro', 'Otro'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ABIERTAS = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'COMPLETADA'];
const INPUT = 'w-full h-12 px-3.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-muted';
const chipCls = (on) => `h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-label font-bold border-2 transition-all active:scale-95 ${on ? 'border-brand-red bg-[rgba(232,66,47,0.10)] text-ink' : 'border-transparent bg-chip text-secondary'}`;
const iniciales = (n) => (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
const franjaDe = (h) => {
    const s = String(h || '');
    if (/tarde/i.test(s)) return 'Tarde';
    const hh = parseInt(s.slice(0, 2), 10);
    return !isNaN(hh) && hh >= 13 ? 'Tarde' : 'Mañana';
};
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return formatDateISO(d); };

function Check({ on }) {
    return (
        <span className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center ${on ? 'bg-brand-red text-white' : 'border-2 border-[#A8A29E]/60'}`}>
            {on && <LuCheck size={14} strokeWidth={3} />}
        </span>
    );
}

export default function VisitaForm({ tecnicos = [], onGuardado, onCancelar }) {
    const [paso, setPaso] = useState(1);
    // Paso 1
    const [clientes, setClientes] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [q, setQ] = useState('');
    const [buscandoNS, setBuscandoNS] = useState(false);
    const [cliente, setCliente] = useState(null);
    const [nuevo, setNuevo] = useState(null);           // { nombre, telefono, direccion, localidad }
    // Paso 2
    const [motivo, setMotivo] = useState('Service');
    const [nota, setNota] = useState('');
    const [verNota, setVerNota] = useState(false);
    const [sedes, setSedes] = useState([]);
    const [sedeId, setSedeId] = useState(null);
    const [abierta, setAbierta] = useState(null);       // sede desplegada en la lista
    const [series, setSeries] = useState([]);
    const [buscaEq, setBuscaEq] = useState('');
    const [nuevaSede, setNuevaSede] = useState(null);
    const [preSerie, setPreSerie] = useState(null);     // N/S que vino del buscador del paso 1
    // Paso 3
    const [offset, setOffset] = useState(0);
    const [fecha, setFecha] = useState(getTodayISO());
    const [hueco, setHueco] = useState(null);           // { tecnicoId, franja }
    const [hora, setHora] = useState('');
    const [guardando, setGuardando] = useState(false);

    const hoy = getTodayISO();

    useEffect(() => {
        api.get('/clientes', { params: { size: 1000 } }).then(r => setClientes(r.data?.content || r.data || [])).catch(() => {});
        api.get('/ordenes', { params: { desde: sumarDias(hoy, -60), hasta: sumarDias(hoy, 120) } })
            .then(r => setOrdenes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, [hoy]);

    const conTarifa = !!cliente?.tieneTarifa;

    // ── Paso 1: recientes y búsqueda ─────────────────────────────────────────
    const recientes = useMemo(() => {
        const vistos = new Set(); const out = [];
        [...ordenes].sort((a, b) => String(b.fechaProgramada).localeCompare(String(a.fechaProgramada))).forEach(o => {
            if (o.clienteId && !vistos.has(o.clienteId)) {
                const c = clientes.find(x => x.id === o.clienteId);
                if (c) { vistos.add(o.clienteId); out.push(c); }
            }
        });
        clientes.filter(c => c.tieneTarifa && !vistos.has(c.id)).forEach(c => out.unshift(c));
        return out.slice(0, 5);
    }, [ordenes, clientes]);
    const resultados = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (t.length < 2) return [];
        return clientes.filter(c => [c.nombre, c.direccion, c.telefono].filter(Boolean).join(' ').toLowerCase().includes(t)).slice(0, 8);
    }, [q, clientes]);

    const elegirCliente = (c, serie = null) => {
        setCliente(c); setNuevo(null); setPreSerie(serie);
        setSedes([]); setSedeId(null); setSeries([]); setAbierta(null);
        setPaso(2);
    };
    const buscarSerie = async () => {
        const s = q.trim().toUpperCase();
        if (s.length < 3) return;
        setBuscandoNS(true);
        try {
            const r = await api.get('/equipos/historial', { params: { serie: s } });
            const eq = r.data?.equipo;
            if (!r.data?.encontrado || !eq) {
                const sug = r.data?.sugerencias || [];
                toast(sug.length ? `No hay uno exacto. Parecidos: ${sug.slice(0, 4).join(', ')}` : 'No encontré ese N° de serie');
                return;
            }
            const c = clientes.find(x => x.id === eq.clienteId) || { id: eq.clienteId, nombre: eq.cliente };
            elegirCliente(c, { serie: eq.serie, sedeId: eq.sedeId });
        } catch { toast.error('No se pudo buscar'); } finally { setBuscandoNS(false); }
    };

    // ── Paso 2: direcciones y equipos ────────────────────────────────────────
    useEffect(() => {
        if (!cliente?.id) return;
        api.get(`/sedes/cliente/${cliente.id}`).then(r => {
            const l = Array.isArray(r.data) ? r.data : [];
            setSedes(l);
            if (preSerie?.sedeId) {
                setSedeId(preSerie.sedeId); setAbierta(preSerie.sedeId);
                if (cliente.tieneTarifa) setSeries([preSerie.serie]);
            } else if (l.length === 1) { setSedeId(l[0].id); setAbierta(l[0].id); }
        }).catch(() => {});
    }, [cliente, preSerie]);

    const sede = sedes.find(s => s.id === sedeId) || null;
    const sedesFiltradas = useMemo(() => {
        const t = buscaEq.trim().toLowerCase();
        if (!t) return sedes;
        return sedes.filter(s => [s.nombreSede, s.direccion, ...(s.equipos || []).map(e => e.numeroSerie)].filter(Boolean).join(' ').toLowerCase().includes(t));
    }, [sedes, buscaEq]);

    const toggleEquipo = (s, ns) => {
        if (sedeId && sedeId !== s.id && series.length) {
            toast.error('Una visita es a un solo lugar. Para el otro, armá otra visita.');
            return;
        }
        setSedeId(s.id);
        setSeries(x => (x.includes(ns) ? x.filter(y => y !== ns) : [...x, ns]));
    };
    const crearSede = async () => {
        if (!nuevaSede?.nombre?.trim() || !nuevaSede?.direccion?.trim()) { toast.error('Completá el lugar y la dirección'); return; }
        try {
            const r = await api.post('/sedes', { clienteId: cliente.id, nombreSede: nuevaSede.nombre.trim(), direccion: nuevaSede.direccion.trim() });
            setSedes(ss => [...ss, { ...r.data, equipos: [] }]);
            setSedeId(r.data.id); setAbierta(r.data.id); setSeries([]); setNuevaSede(null);
            toast.success('Dirección agregada');
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo crear la dirección'); }
    };
    const altaEquipo = async (s) => {
        const ns = window.prompt(`N° de serie del equipo nuevo en ${s.nombreSede}`);
        if (!ns || !ns.trim()) return;
        const serie = ns.trim().toUpperCase();
        try {
            const r = await api.post('/equipos', { numeroSerie: serie, sedeId: s.id });
            setSedes(ss => ss.map(x => (x.id === s.id ? { ...x, equipos: [...(x.equipos || []), { id: r.data?.id, numeroSerie: serie }] } : x)));
            if (!sedeId || sedeId === s.id) { setSedeId(s.id); setSeries(x => [...x, serie]); }
            toast.success(`Equipo ${serie} dado de alta`);
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo dar de alta'); }
    };

    // ── Paso 3: semana y huecos ──────────────────────────────────────────────
    const semana = useMemo(() => {
        const l = lunesDeLaSemana(new Date());
        l.setDate(l.getDate() + offset * 7);
        return DIAS.map((n, i) => { const d = new Date(l); d.setDate(l.getDate() + i); return { n, num: d.getDate(), iso: formatDateISO(d) }; });
    }, [offset]);
    const delDia = (iso) => ordenes.filter(o => ABIERTAS.includes(o.estado) && String(o.fechaProgramada).slice(0, 10) === iso);
    const visitasDia = delDia(fecha);

    // ── Guardar ──────────────────────────────────────────────────────────────
    const nombreCliente = nuevo ? nuevo.nombre : cliente?.nombre;
    const tecElegido = tecnicos.find(t => t.id === hueco?.tecnicoId);
    const puede2 = !conTarifa || series.length > 0;

    const guardar = async () => {
        if (!hueco) { toast.error('Tocá un hueco libre en la agenda'); return; }
        setGuardando(true);
        const t = toast.loading('Guardando…');
        try {
            let cli = cliente;
            if (nuevo) {
                const dir = nuevo.direccion.trim();
                const m = dir.match(/^(.*?)\s+(\d+\S*)\s*$/);
                const r = await api.post('/clientes', {
                    clienteTipo: 'PARTICULAR', condicionIva: 'CONSUMIDOR_FINAL',
                    nombre: nuevo.nombre.trim(), telefono: nuevo.telefono.trim() || null,
                    calle: m ? m[1] : dir, numero: m ? m[2] : 'S/N',
                    localidad: nuevo.localidad.trim() || 'Sin localidad', provincia: 'Buenos Aires',
                    direccion: [dir, nuevo.localidad.trim()].filter(Boolean).join(', '),
                });
                cli = r.data;
            }
            const lugar = sede?.nombreSede && sede.nombreSede !== cli?.nombre ? ` · ${sede.nombreSede}` : '';
            await api.post('/ordenes', {
                tecnicoId: hueco.tecnicoId,
                titulo: `${motivo}${series.length ? ` · ${series.length} equipo${series.length !== 1 ? 's' : ''}` : ''}${lugar}`,
                descripcion: [nota.trim(), series.length ? `Equipos: ${series.join(', ')}` : null].filter(Boolean).join('\n') || null,
                clienteId: cli?.id || null,
                clienteNombre: cli?.nombre || '',
                clienteTelefono: cli?.telefono || '',
                direccion: sede?.direccion || cli?.direccion || '',
                prioridad: 'NORMAL',
                fechaProgramada: fecha,
                horaEstimada: hora || hueco.franja,
                montoEstimado: null,
                formaPago: conTarifa ? null : 'EFECTIVO',
                presupuestoId: null,
                equiposSerie: series.length ? series.join(',') : null,
            });
            toast.success('Visita agendada', { id: t });
            onGuardado && onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.mensaje || 'No se pudo guardar', { id: t });
        } finally { setGuardando(false); }
    };

    const titulos = { 1: '¿A quién vas?', 2: '¿Qué hay que hacer?', 3: '¿Quién y cuándo?' };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex md:items-center md:justify-center">
            <div className="w-full h-full md:h-[88vh] md:max-w-lg md:rounded-3xl bg-page flex flex-col overflow-hidden">
                {/* Encabezado con progreso */}
                <div className="px-4 pt-4 pb-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => (paso === 1 ? onCancelar() : setPaso(p => p - 1))} aria-label={paso === 1 ? 'Cerrar' : 'Atrás'}
                            className="w-10 h-10 rounded-xl bg-chip text-muted flex items-center justify-center active:scale-95">
                            {paso === 1 ? <LuX size={18} /> : <LuChevronLeft size={20} />}
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className="text-label font-black text-muted uppercase tracking-widest">Nueva visita · paso {paso} de 3</p>
                            <h2 className="text-title font-black text-ink leading-tight">{titulos[paso]}</h2>
                        </div>
                    </div>
                    <div className="flex gap-1.5 mt-3">
                        {[1, 2, 3].map(i => <span key={i} className={`flex-1 h-1 rounded-full ${i <= paso ? 'bg-brand-red' : 'bg-chip'}`} />)}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    {/* ═══ Paso 1 ═══ */}
                    {paso === 1 && !nuevo && (<>
                        <form onSubmit={e => { e.preventDefault(); if (resultados.length === 1) elegirCliente(resultados[0]); else buscarSerie(); }} className="relative">
                            <LuSearch size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, dirección o N° de serie" className={`${INPUT} pl-10`} />
                        </form>
                        {q.trim().length >= 3 && (
                            <button type="button" onClick={buscarSerie} disabled={buscandoNS}
                                className="w-full h-11 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-caption font-bold text-secondary active:scale-[0.99]">
                                {buscandoNS ? 'Buscando…' : `Buscar el equipo con N° de serie "${q.trim().toUpperCase()}"`}
                            </button>
                        )}
                        {!q.trim() && recientes.length > 0 && <p className="pt-1 text-label font-black uppercase tracking-widest text-muted">Recientes</p>}
                        {(q.trim().length >= 2 ? resultados : recientes).map(c => (
                            <button key={c.id} type="button" onClick={() => elegirCliente(c)}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] text-left active:scale-[0.99]">
                                <span className="w-10 h-10 rounded-full bg-chip text-ink flex items-center justify-center text-label font-black shrink-0">{iniciales(c.nombre)}</span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-1.5 text-body font-black text-ink truncate">
                                        <span className="truncate">{c.nombre}</span>
                                        {c.tieneTarifa && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-[color:var(--etapa-cobrar-bg)] text-[color:var(--etapa-cobrar-tx)] text-label font-black">Tarifa mensual</span>}
                                    </span>
                                    <span className="block text-caption text-muted truncate">{c.direccion || c.telefono || ''}</span>
                                </span>
                                <LuChevronRight size={18} className="text-muted shrink-0" />
                            </button>
                        ))}
                        {q.trim().length >= 2 && resultados.length === 0 && <p className="text-caption text-muted text-center py-2">Ningún cliente con ese nombre</p>}
                        <button type="button" onClick={() => setNuevo({ nombre: q.trim(), telefono: '', direccion: '', localidad: '' })}
                            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 text-left active:scale-[0.99]">
                            <span className="w-10 h-10 rounded-full bg-[#E8422F]/15 text-brand-red flex items-center justify-center shrink-0"><LuPlus size={20} /></span>
                            <span><span className="block text-body font-black text-ink">Cliente nuevo</span><span className="block text-caption text-muted">Nombre, teléfono y dirección · queda guardado</span></span>
                        </button>
                    </>)}
                    {paso === 1 && nuevo && (
                        <div className="space-y-2.5">
                            <input className={INPUT} placeholder="Nombre *" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} />
                            <input className={INPUT} placeholder="Teléfono" inputMode="tel" value={nuevo.telefono} onChange={e => setNuevo(n => ({ ...n, telefono: e.target.value }))} />
                            <input className={INPUT} placeholder="Calle y número *" value={nuevo.direccion} onChange={e => setNuevo(n => ({ ...n, direccion: e.target.value }))} />
                            <input className={INPUT} placeholder="Localidad" value={nuevo.localidad} onChange={e => setNuevo(n => ({ ...n, localidad: e.target.value }))} />
                            <button type="button" onClick={() => setNuevo(null)} className="text-caption font-bold text-muted underline">Buscar uno ya cargado</button>
                        </div>
                    )}

                    {/* ═══ Paso 2 ═══ */}
                    {paso === 2 && (<>
                        <p className="flex items-center gap-2 text-caption font-bold text-secondary">
                            {nombreCliente}
                            {conTarifa && <span className="px-1.5 py-0.5 rounded-md bg-[color:var(--etapa-cobrar-bg)] text-[color:var(--etapa-cobrar-tx)] text-label font-black">Tarifa mensual</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {MOTIVOS.map(m => <button key={m} type="button" onClick={() => setMotivo(m)} className={chipCls(motivo === m)}>{m}</button>)}
                        </div>

                        {cliente && sedes.length > 0 && (<>
                            <p className="pt-2 text-label font-black uppercase tracking-widest text-muted">
                                {conTarifa ? 'Equipos · todos de un mismo lugar' : 'Dirección'}
                            </p>
                            {sedes.length > 3 && (
                                <div className="relative">
                                    <LuSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                    <input value={buscaEq} onChange={e => setBuscaEq(e.target.value)} placeholder={conTarifa ? 'N° de serie o dirección' : 'Buscar dirección'} className={`${INPUT} pl-10`} />
                                </div>
                            )}
                            {sedesFiltradas.slice(0, 30).map(s => {
                                const elegida = sedeId === s.id;
                                const nSel = elegida ? series.length : 0;
                                const open = conTarifa && abierta === s.id;
                                return (
                                    <div key={s.id} className={`rounded-2xl bg-card border-2 ${elegida ? 'border-brand-red/60' : 'border-transparent'}`}>
                                        <button type="button" onClick={() => (conTarifa ? setAbierta(a => (a === s.id ? null : s.id)) : setSedeId(s.id))}
                                            className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
                                            {conTarifa ? <LuMapPin size={16} className="text-muted shrink-0" /> : <Check on={elegida} />}
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-body font-black text-ink truncate">{s.nombreSede}</span>
                                                <span className="block text-caption text-muted truncate">{s.direccion || '—'}</span>
                                            </span>
                                            {conTarifa && <span className={`text-label font-black shrink-0 ${nSel ? 'text-brand-red' : 'text-muted'}`}>{nSel ? `${nSel} de ` : ''}{(s.equipos || []).length} eq</span>}
                                        </button>
                                        {open && (
                                            <div className="px-3.5 pb-2">
                                                {(s.equipos || []).map(e => (
                                                    <button key={e.id || e.numeroSerie} type="button" onClick={() => toggleEquipo(s, e.numeroSerie)}
                                                        className="w-full flex items-center gap-3 py-2.5 border-t border-black/[0.05] dark:border-white/[0.05] text-left">
                                                        <Check on={elegida && series.includes(e.numeroSerie)} />
                                                        <span className="text-body font-black text-ink">{e.numeroSerie}</span>
                                                        <span className="text-caption text-muted truncate">{e.ubicacion || ''}</span>
                                                    </button>
                                                ))}
                                                <button type="button" onClick={() => altaEquipo(s)} className="w-full py-2.5 border-t border-black/[0.05] dark:border-white/[0.05] text-left text-caption font-bold text-secondary">
                                                    + Equipo nuevo en este lugar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {sedesFiltradas.length > 30 && <p className="text-caption text-muted text-center">Hay {sedesFiltradas.length - 30} más: buscá por N/S o dirección</p>}
                        </>)}

                        {cliente && (nuevaSede ? (
                            <div className="p-3 rounded-2xl bg-card space-y-2">
                                <input className={INPUT} placeholder="Nombre del lugar (ej: Gimnasio Núñez)" value={nuevaSede.nombre} onChange={e => setNuevaSede(s => ({ ...s, nombre: e.target.value }))} />
                                <input className={INPUT} placeholder="Calle, número y localidad" value={nuevaSede.direccion} onChange={e => setNuevaSede(s => ({ ...s, direccion: e.target.value }))} />
                                <div className="flex gap-2">
                                    <button type="button" onClick={crearSede} className="h-11 px-4 rounded-xl bg-ink text-page text-label font-black">Agregar dirección</button>
                                    <button type="button" onClick={() => setNuevaSede(null)} className="h-11 px-3 rounded-xl text-label font-bold text-muted">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setNuevaSede({ nombre: '', direccion: '' })} className="text-caption font-bold text-secondary inline-flex items-center gap-1 py-1 mr-5"><LuPlus size={14} /> Nueva dirección</button>
                        ))}

                        {verNota ? (
                            <textarea className="w-full px-3.5 py-3 rounded-xl bg-chip text-ink text-body outline-none resize-none" rows={3} autoFocus
                                value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota para el técnico" />
                        ) : (
                            <button type="button" onClick={() => setVerNota(true)} className="text-caption font-bold text-secondary inline-flex items-center gap-1 py-1"><LuPlus size={14} /> Nota para el técnico</button>
                        )}
                    </>)}

                    {/* ═══ Paso 3: elegí el hueco ═══ */}
                    {paso === 3 && (<>
                        <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior" className="w-8 h-14 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronLeft size={16} /></button>
                            <div className="flex-1 grid grid-cols-6 gap-1.5">
                                {semana.map(d => {
                                    const sel = d.iso === fecha;
                                    const vs = delDia(d.iso);
                                    return (
                                        <button key={d.iso} type="button" disabled={d.iso < hoy} onClick={() => { setFecha(d.iso); setHueco(null); }}
                                            className={`h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 text-label font-black active:scale-95 disabled:opacity-30 ${sel ? 'bg-[#C9341F] text-white' : 'bg-chip text-muted'} ${d.iso === hoy && !sel ? 'ring-2 ring-[#C9341F]/50' : ''}`}>
                                            {d.n}<span className={`text-body ${sel ? 'text-white' : 'text-ink'}`}>{d.num}</span>
                                            <span className="flex gap-0.5 h-1.5">
                                                {vs.slice(0, 4).map(o => <span key={o.id} className="w-1.5 h-1.5 rounded-full" style={{ background: colorTecnico(o.tecnicoNombre) }} />)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button type="button" onClick={() => setOffset(o => o + 1)} aria-label="Semana siguiente" className="w-8 h-14 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronRight size={16} /></button>
                        </div>

                        <p className="text-caption text-muted">Tocá un hueco libre para darle la visita a ese técnico.</p>
                        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(tecnicos.length, 3))}, minmax(0, 1fr))` }}>
                            {tecnicos.map(t => {
                                const suyas = visitasDia.filter(o => o.tecnicoId === t.id || o.tecnicoNombre === t.nombre);
                                const mismaZona = sede?.direccion && suyas.some(o => (o.direccion || '').toLowerCase().includes(String(sede.direccion).split(',').pop().trim().toLowerCase()));
                                return (
                                    <div key={t.id} className="min-w-0 space-y-1.5">
                                        <p className="flex items-center gap-1.5 text-body font-black text-ink truncate">
                                            <AvatarTecnico nombre={t.nombre} size={22} />{t.nombre.split(' ')[0]}
                                            <span className="text-caption text-muted font-bold">{suyas.length}</span>
                                        </p>
                                        {mismaZona && <p className="text-label font-black text-[#16A34A] dark:text-[#4ADE80]">Ya va por esa zona</p>}
                                        {['Mañana', 'Tarde'].map(fr => {
                                            const lista = suyas.filter(o => franjaDe(o.horaEstimada) === fr);
                                            const on = hueco?.tecnicoId === t.id && hueco?.franja === fr;
                                            return (
                                                <div key={fr} className="space-y-1.5">
                                                    <p className="text-label font-black uppercase tracking-widest text-muted pt-1">{fr}</p>
                                                    {lista.map(o => (
                                                        <div key={o.id} className="px-2.5 py-2 rounded-xl bg-card" style={{ borderLeft: `4px solid ${etapaColor(o.estado)}` }}>
                                                            <p className="text-caption font-black text-ink truncate">{o.clienteNombre || o.titulo}</p>
                                                            <p className="text-label text-muted truncate">{o.horaEstimada || ''}</p>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setHueco({ tecnicoId: t.id, franja: fr })}
                                                        className={`w-full h-11 rounded-xl border-2 border-dashed text-label font-black active:scale-95 ${on ? 'border-brand-red bg-[rgba(232,66,47,0.10)] text-brand-red' : 'border-black/15 dark:border-white/15 text-muted'}`}>
                                                        {on ? '✓ Acá' : '+ Acá'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        {hueco && (
                            <div className="p-3.5 rounded-2xl bg-card space-y-2.5">
                                <p className="text-label font-black uppercase tracking-widest text-muted">Resumen</p>
                                <p className="text-body text-ink leading-relaxed">
                                    {motivo}{series.length ? <> · <b>{series.length} equipo{series.length !== 1 ? 's' : ''}</b> ({series.join(', ')})</> : null}<br />
                                    {nombreCliente}{sede ? ` · ${sede.nombreSede}` : ''}<br />
                                    <span className="inline-flex items-center gap-1 align-middle"><AvatarTecnico nombre={tecElegido?.nombre} size={18} /><b>{tecElegido?.nombre?.split(' ')[0]}</b></span> · {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })} · {hora || hueco.franja.toLowerCase()}
                                </p>
                                <label className="flex items-center gap-2 text-caption text-secondary">
                                    Hora exacta (opcional)
                                    <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="h-9 px-2 rounded-lg bg-chip text-ink font-bold outline-none" />
                                </label>
                                {conTarifa && <p className="text-caption font-bold text-[color:var(--etapa-cobrar-tx)]">Sin precio · va al cierre mensual</p>}
                            </div>
                        )}
                    </>)}
                </div>

                {/* Pie con el botón del paso */}
                <div className="shrink-0 px-4 pt-3 pb-5 border-t border-black/[0.06] dark:border-white/[0.06] bg-panel">
                    {paso === 1 && nuevo && (
                        <button type="button" onClick={() => {
                            if (!nuevo.nombre.trim() || !nuevo.direccion.trim()) { toast.error('Completá nombre y dirección'); return; }
                            setCliente(null); setSedes([]); setSedeId(null); setSeries([]); setPaso(2);
                        }} className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95">Siguiente</button>
                    )}
                    {paso === 1 && !nuevo && <p className="text-center text-caption text-muted py-3">Elegí un cliente para seguir</p>}
                    {paso === 2 && (<>
                        {conTarifa && <p className="text-caption text-muted mb-2">{series.length ? `${series.length} equipo${series.length !== 1 ? 's' : ''} · ${sede?.nombreSede || ''}` : 'Elegí al menos un equipo'}</p>}
                        <button type="button" disabled={!puede2} onClick={() => setPaso(3)} className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">Siguiente</button>
                    </>)}
                    {paso === 3 && (
                        <button type="button" disabled={!hueco || guardando} onClick={guardar} className="w-full h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">
                            {hueco ? 'Agendar visita' : 'Tocá un hueco en la agenda'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
