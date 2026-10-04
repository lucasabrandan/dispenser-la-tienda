import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-hot-toast';
import { LuChevronLeft, LuChevronRight, LuPlus, LuX, LuMapPin, LuUserPlus } from 'react-icons/lu';
import api from '../../services/api';
import { buildSelectStyles } from '../servicio/ServicioUI';
import { useTheme } from '../../hooks/useTheme';
import { filtroMultiTermino } from '../../utils/busqueda';
import { colorTecnico } from '../../utils/estados';
import { formatDateISO, getTodayISO, lunesDeLaSemana } from '../../utils/dateUtils';

// Nueva visita (3-oct-2026) — reemplaza al formulario largo de 12 campos para CREAR
// visitas. Tres bloques: ¿Dónde? · ¿Qué? · ¿Quién y cuándo?
// Clientes con tarifa mensual (MODO AGUA): se eligen los equipos por N/S de UNA
// dirección; al cerrar la visita el técnico los carga por serie y van al cierre del mes.
// Editar una visita sigue usando OrdenForm.

const MOTIVOS = ['Service', 'Revisar falla', 'Instalación', 'Retiro', 'Otro'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-chip text-ink text-body font-medium outline-none focus:ring-2 focus:ring-[#D13A28]/40 placeholder:text-muted';
const CHIP = 'h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-label font-bold border-2 transition-all active:scale-95';
const chipCls = (on) => `${CHIP} ${on ? 'border-brand-red bg-[rgba(232,66,47,0.10)] text-ink' : 'border-transparent bg-chip text-secondary'}`;

function Bloque({ n, titulo, children }) {
    return (
        <section className="space-y-2.5">
            <p className="flex items-center gap-2 text-label font-black uppercase tracking-widest text-muted">
                <span className="w-5 h-5 rounded-full bg-ink text-page flex items-center justify-center text-[11px]">{n}</span>{titulo}
            </p>
            {children}
        </section>
    );
}

export default function VisitaForm({ tecnicos = [], onGuardado, onCancelar }) {
    const { isDark } = useTheme();
    const [clientes, setClientes] = useState([]);
    const [cliente, setCliente] = useState(null);
    const [nuevo, setNuevo] = useState(null);          // { nombre, telefono, direccion, localidad }
    const [sedes, setSedes] = useState([]);
    const [sedeId, setSedeId] = useState(null);
    const [nuevaSede, setNuevaSede] = useState(null);  // { nombre, direccion }
    const [series, setSeries] = useState([]);          // N/S elegidos (tarifa mensual)
    const [buscaEq, setBuscaEq] = useState('');
    const [motivo, setMotivo] = useState('Service');
    const [nota, setNota] = useState('');
    const [tecnicoId, setTecnicoId] = useState(tecnicos.length === 1 ? tecnicos[0].id : null);
    const [offset, setOffset] = useState(0);
    const [fecha, setFecha] = useState(getTodayISO());
    const [franja, setFranja] = useState('Mañana');    // 'Mañana' | 'Tarde' | 'hora'
    const [hora, setHora] = useState('');
    const [masOpciones, setMasOpciones] = useState(false);
    const [monto, setMonto] = useState('');
    const [formaPago, setFormaPago] = useState('EFECTIVO');
    const [prioridad, setPrioridad] = useState('NORMAL');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.get('/clientes', { params: { size: 1000 } })
            .then(r => setClientes(r.data?.content || r.data || []))
            .catch(() => {});
    }, []);

    const conTarifa = !!cliente?.tieneTarifa;

    // Sedes (direcciones) del cliente, con sus equipos
    useEffect(() => {
        setSedes([]); setSedeId(null); setSeries([]); setNuevaSede(null); setBuscaEq('');
        if (!cliente) return;
        api.get(`/sedes/cliente/${cliente.id}`).then(r => {
            const l = Array.isArray(r.data) ? r.data : [];
            setSedes(l);
            if (l.length === 1) setSedeId(l[0].id);
        }).catch(() => {});
    }, [cliente]);

    const sede = sedes.find(s => s.id === sedeId) || null;

    // Buscador de equipos / direcciones (clientes con tarifa)
    const resultados = useMemo(() => {
        const q = buscaEq.trim().toLowerCase();
        if (!conTarifa || q.length < 2) return [];
        const out = [];
        sedes.forEach(s => {
            const lugar = [s.nombreSede, s.direccion].filter(Boolean).join(' · ');
            if (lugar.toLowerCase().includes(q)) out.push({ tipo: 'sede', sede: s, label: lugar });
            (s.equipos || []).forEach(e => {
                if ((e.numeroSerie || '').toLowerCase().includes(q)) out.push({ tipo: 'eq', sede: s, eq: e, label: `${e.numeroSerie} · ${lugar}` });
            });
        });
        return out.slice(0, 8);
    }, [buscaEq, sedes, conTarifa]);

    const elegirResultado = (r) => {
        if (r.tipo === 'sede') { if (r.sede.id !== sedeId) setSeries([]); setSedeId(r.sede.id); }
        else {
            if (sedeId && r.sede.id !== sedeId && series.length) {
                toast.error('Ese equipo está en otra dirección. Una visita es a un solo lugar: armá otra para ese.');
                return;
            }
            setSedeId(r.sede.id);
            setSeries(ss => (ss.includes(r.eq.numeroSerie) ? ss : [...ss, r.eq.numeroSerie]));
        }
        setBuscaEq('');
    };
    const toggleSerie = (ns) => setSeries(ss => (ss.includes(ns) ? ss.filter(x => x !== ns) : [...ss, ns]));

    const crearSede = async () => {
        if (!nuevaSede?.nombre?.trim() || !nuevaSede?.direccion?.trim()) { toast.error('Completá el lugar y la dirección'); return; }
        try {
            const r = await api.post('/sedes', { clienteId: cliente.id, nombreSede: nuevaSede.nombre.trim(), direccion: nuevaSede.direccion.trim() });
            setSedes(ss => [...ss, { ...r.data, equipos: [] }]);
            setSedeId(r.data.id); setSeries([]); setNuevaSede(null);
            toast.success('Dirección agregada');
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo crear la dirección'); }
    };
    const altaEquipo = async () => {
        const ns = buscaEq.trim().toUpperCase();
        if (!ns || !sedeId) return;
        try {
            const r = await api.post('/equipos', { numeroSerie: ns, sedeId });
            setSedes(ss => ss.map(s => (s.id === sedeId ? { ...s, equipos: [...(s.equipos || []), { id: r.data?.id, numeroSerie: ns }] } : s)));
            setSeries(x => [...x, ns]); setBuscaEq('');
            toast.success(`Equipo ${ns} dado de alta`);
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo dar de alta'); }
    };

    // Semana Lun–Sáb
    const semana = useMemo(() => {
        const l = lunesDeLaSemana(new Date());
        l.setDate(l.getDate() + offset * 7);
        return DIAS.map((n, i) => { const d = new Date(l); d.setDate(l.getDate() + i); return { n, num: d.getDate(), iso: formatDateISO(d) }; });
    }, [offset]);
    const hoy = getTodayISO();

    const opciones = [
        ...clientes.map(c => ({ value: c.id, label: c.nombre, sub: c.tieneTarifa ? 'Tarifa mensual' : (c.telefono || ''), cliente: c })),
    ];

    const guardar = async (e) => {
        e.preventDefault();
        if (!cliente && !nuevo) { toast.error('Elegí el cliente o cargá uno nuevo'); return; }
        if (nuevo && (!nuevo.nombre.trim() || !nuevo.direccion.trim())) { toast.error('Completá nombre y dirección del cliente'); return; }
        if (conTarifa && !series.length) { toast.error('Elegí al menos un equipo'); return; }
        if (!tecnicoId) { toast.error('Elegí el técnico'); return; }
        if (franja === 'hora' && !hora) { toast.error('Poné la hora'); return; }
        setGuardando(true);
        const t = toast.loading('Guardando…');
        try {
            let cli = cliente;
            if (nuevo) {
                // "Cliente nuevo": se guarda como cliente para que quede en el historial
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
            const direccion = sede?.direccion || [sede?.nombreSede].filter(Boolean)[0] || cli?.direccion || '';
            const lugar = sede?.nombreSede && sede?.nombreSede !== cli?.nombre ? ` · ${sede.nombreSede}` : '';
            const titulo = `${motivo}${series.length ? ` · ${series.length} equipo${series.length !== 1 ? 's' : ''}` : ''}${lugar}`;
            await api.post('/ordenes', {
                tecnicoId,
                titulo,
                descripcion: [nota.trim(), series.length ? `Equipos: ${series.join(', ')}` : null].filter(Boolean).join('\n') || null,
                clienteId: cli?.id || null,
                clienteNombre: cli?.nombre || '',
                clienteTelefono: cli?.telefono || '',
                direccion,
                prioridad: conTarifa ? 'NORMAL' : prioridad,
                fechaProgramada: fecha,
                horaEstimada: franja === 'hora' ? hora : franja,
                montoEstimado: !conTarifa && monto ? Number(monto) : null,
                formaPago: conTarifa ? null : formaPago,
                presupuestoId: null,
                equiposSerie: series.length ? series.join(',') : null,
            });
            toast.success('Visita agendada', { id: t });
            onGuardado && onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.mensaje || 'No se pudo guardar', { id: t });
        } finally { setGuardando(false); }
    };

    return (
        <form onSubmit={guardar} className="space-y-6">
            {/* 1 · ¿Dónde? */}
            <Bloque n={1} titulo="¿Dónde?">
                {!nuevo ? (
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                            <Select filterOption={filtroMultiTermino} options={opciones} isClearable
                                value={cliente ? opciones.find(o => o.value === cliente.id) : null}
                                onChange={o => setCliente(o?.cliente || null)}
                                placeholder="Buscar cliente…" noOptionsMessage={() => 'Sin resultados'}
                                styles={buildSelectStyles(isDark)} menuPosition="fixed" menuPortalTarget={document.body}
                                formatOptionLabel={o => (<div><span className="font-bold text-body">{o.label}</span>{o.sub && <span className="text-caption text-muted ml-2">{o.sub}</span>}</div>)} />
                        </div>
                        <button type="button" onClick={() => { setCliente(null); setNuevo({ nombre: '', telefono: '', direccion: '', localidad: '' }); }}
                            className="h-[42px] px-3 shrink-0 rounded-xl bg-chip text-ink text-label font-bold inline-flex items-center gap-1.5 active:scale-95">
                            <LuUserPlus size={15} /> Nuevo
                        </button>
                    </div>
                ) : (
                    <div className="p-3 rounded-2xl bg-panel space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-label font-black text-ink">Cliente nuevo</p>
                            <button type="button" onClick={() => setNuevo(null)} className="text-caption font-bold text-muted underline">Buscar uno cargado</button>
                        </div>
                        <input className={INPUT} placeholder="Nombre *" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} />
                        <input className={INPUT} placeholder="Teléfono" inputMode="tel" value={nuevo.telefono} onChange={e => setNuevo(n => ({ ...n, telefono: e.target.value }))} />
                        <div className="grid grid-cols-[1fr_120px] gap-2">
                            <input className={INPUT} placeholder="Calle y número *" value={nuevo.direccion} onChange={e => setNuevo(n => ({ ...n, direccion: e.target.value }))} />
                            <input className={INPUT} placeholder="Localidad" value={nuevo.localidad} onChange={e => setNuevo(n => ({ ...n, localidad: e.target.value }))} />
                        </div>
                        <p className="text-caption text-muted">Queda guardado en Clientes.</p>
                    </div>
                )}

                {/* Cliente con tarifa mensual: equipos por N/S de una dirección */}
                {cliente && conTarifa && (
                    <div className="p-3 rounded-2xl bg-panel space-y-2.5">
                        <div className="relative">
                            <input className={INPUT} value={buscaEq} onChange={e => setBuscaEq(e.target.value.toUpperCase())}
                                placeholder="N° de serie o dirección" />
                            {resultados.length > 0 && (
                                <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl bg-card shadow-xl border border-black/10 dark:border-white/10 overflow-hidden">
                                    {resultados.map((r, i) => (
                                        <button key={i} type="button" onClick={() => elegirResultado(r)}
                                            className="w-full px-3 py-2.5 text-left text-caption text-ink hover:bg-chip flex items-center gap-2 border-b border-black/[0.05] dark:border-white/[0.05] last:border-0">
                                            {r.tipo === 'sede' ? <LuMapPin size={13} className="text-muted shrink-0" /> : <span className="w-2 h-2 rounded-full bg-brand-red shrink-0" />}
                                            <span className="truncate">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {buscaEq.trim().length >= 3 && resultados.length === 0 && (
                            sede
                                ? <button type="button" onClick={altaEquipo} className="text-caption font-bold text-brand-red underline">+ Dar de alta {buscaEq.trim()} en {sede.nombreSede}</button>
                                : <p className="text-caption text-muted">No está cargado. Elegí primero la dirección para darlo de alta.</p>
                        )}

                        {sede ? (
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-caption text-ink min-w-0"><LuMapPin size={12} className="inline -mt-0.5 mr-1 text-muted" /><b>{sede.nombreSede}</b>{sede.direccion ? ` · ${sede.direccion}` : ''}</p>
                                    {sedes.length > 1 && <button type="button" onClick={() => { setSedeId(null); setSeries([]); }} className="text-caption font-bold text-muted underline shrink-0">Cambiar</button>}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(sede.equipos || []).map(e => (
                                        <button key={e.id || e.numeroSerie} type="button" onClick={() => toggleSerie(e.numeroSerie)} className={chipCls(series.includes(e.numeroSerie))}>
                                            {e.numeroSerie}
                                        </button>
                                    ))}
                                    {!(sede.equipos || []).length && <p className="text-caption text-muted">Sin equipos cargados acá. Escribí el N/S arriba para darlo de alta.</p>}
                                </div>
                            </div>
                        ) : (
                            <p className="text-caption text-muted">{sedes.length} dirección{sedes.length !== 1 ? 'es' : ''} cargada{sedes.length !== 1 ? 's' : ''}. Buscá por N/S o por dirección.</p>
                        )}

                        {nuevaSede ? (
                            <div className="space-y-1.5 pt-1">
                                <input className={INPUT} placeholder="Nombre del lugar (ej: Gimnasio Núñez)" value={nuevaSede.nombre} onChange={e => setNuevaSede(s => ({ ...s, nombre: e.target.value }))} />
                                <input className={INPUT} placeholder="Calle, número y localidad" value={nuevaSede.direccion} onChange={e => setNuevaSede(s => ({ ...s, direccion: e.target.value }))} />
                                <div className="flex gap-2">
                                    <button type="button" onClick={crearSede} className="h-10 px-4 rounded-xl bg-ink text-page text-label font-black">Agregar dirección</button>
                                    <button type="button" onClick={() => setNuevaSede(null)} className="h-10 px-3 rounded-xl text-label font-bold text-muted"><LuX size={14} /></button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => setNuevaSede({ nombre: '', direccion: '' })} className="text-caption font-bold text-secondary inline-flex items-center gap-1"><LuPlus size={13} /> Nueva dirección</button>
                        )}
                    </div>
                )}

                {/* Cliente común con varias direcciones */}
                {cliente && !conTarifa && sedes.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                        {sedes.map(s => (
                            <button key={s.id} type="button" onClick={() => setSedeId(s.id)} className={chipCls(sedeId === s.id)}>
                                <LuMapPin size={13} />{s.nombreSede}
                            </button>
                        ))}
                    </div>
                )}
                {cliente && !conTarifa && (sede?.direccion || cliente.direccion) && (
                    <p className="text-caption text-muted"><LuMapPin size={12} className="inline -mt-0.5 mr-1" />{sede?.direccion || cliente.direccion}</p>
                )}
            </Bloque>

            {/* 2 · ¿Qué? */}
            <Bloque n={2} titulo="¿Qué?">
                <div className="flex flex-wrap gap-1.5">
                    {MOTIVOS.map(m => <button key={m} type="button" onClick={() => setMotivo(m)} className={chipCls(motivo === m)}>{m}</button>)}
                </div>
                <textarea className={`${INPUT} resize-none`} rows={2} value={nota} onChange={e => setNota(e.target.value)}
                    placeholder="Nota para el técnico (opcional)" />
            </Bloque>

            {/* 3 · ¿Quién y cuándo? */}
            <Bloque n={3} titulo="¿Quién y cuándo?">
                <div className="flex flex-wrap gap-1.5">
                    {tecnicos.map(t => (
                        <button key={t.id} type="button" onClick={() => setTecnicoId(t.id)} className={chipCls(tecnicoId === t.id)}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorTecnico(t.nombre) }} />{t.nombre.split(' ')[0]}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior" className="w-8 h-12 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronLeft size={16} /></button>
                    <div className="flex-1 grid grid-cols-6 gap-1.5">
                        {semana.map(d => {
                            const sel = d.iso === fecha;
                            const pasado = d.iso < hoy;
                            return (
                                <button key={d.iso} type="button" disabled={pasado} onClick={() => setFecha(d.iso)}
                                    className={`h-14 rounded-xl flex flex-col items-center justify-center text-label font-black transition-all active:scale-95 disabled:opacity-30 ${sel ? 'bg-[#C9341F] text-white' : 'bg-chip text-muted'} ${d.iso === hoy && !sel ? 'ring-2 ring-[#C9341F]/50' : ''}`}>
                                    {d.n}<span className={`text-body ${sel ? 'text-white' : 'text-ink'}`}>{d.num}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button type="button" onClick={() => setOffset(o => o + 1)} aria-label="Semana siguiente" className="w-8 h-12 shrink-0 rounded-lg flex items-center justify-center text-muted active:bg-chip"><LuChevronRight size={16} /></button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {[['Mañana', 'Mañana'], ['Tarde', 'Tarde'], ['hora', 'Hora exacta']].map(([id, l]) => (
                        <button key={id} type="button" onClick={() => setFranja(id)} className={chipCls(franja === id)}>{l}</button>
                    ))}
                    {franja === 'hora' && (
                        <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="h-10 px-3 rounded-xl bg-chip text-ink text-body font-bold outline-none" />
                    )}
                </div>
            </Bloque>

            {/* Más opciones — no aplica a clientes con tarifa mensual */}
            {conTarifa ? (
                <p className="px-3 py-2.5 rounded-xl bg-[#818CF8]/10 text-caption font-bold text-[#4F46E5] dark:text-[#A5B4FC]">
                    Sin precio: se cobra en el cierre mensual. Al cerrar la visita, el técnico carga cada equipo con sus fotos.
                </p>
            ) : (
                <div>
                    <button type="button" onClick={() => setMasOpciones(v => !v)} className="text-caption font-bold text-secondary underline">
                        {masOpciones ? 'Menos opciones' : 'Más opciones (monto, forma de pago, prioridad)'}
                    </button>
                    {masOpciones && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <input className={INPUT} inputMode="decimal" placeholder="Monto $" value={monto} onChange={e => setMonto(e.target.value)} />
                            <select className={INPUT} value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                                <option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option>
                            </select>
                            <select className={INPUT} value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                                {['BAJA', 'NORMAL', 'ALTA', 'URGENTE'].map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-3 pt-1">
                <button type="button" onClick={onCancelar} className="flex-1 h-12 rounded-xl font-bold text-body bg-chip text-secondary active:scale-95">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-[2] h-12 rounded-xl font-black text-body bg-[#C9341F] text-white active:scale-95 disabled:opacity-50">Agendar visita</button>
            </div>
        </form>
    );
}
