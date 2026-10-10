import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuMapPin, LuCheck, LuSearch, LuPlus, LuTriangleAlert, LuX, LuUserPlus } from 'react-icons/lu';
import api from '../../services/api';
import ModalShell from '../ui/ModalShell';
import { StepBar } from '../servicio/ServicioUI';
import SelectorVentanas, { DIAS_SEMANA, FRANJAS } from '../servicio/SelectorVentanas';
import { MOTIVOS_PEDIDO } from '../../utils/pedidosEmpresa';
import { resumenVentanas } from '../../utils/ordenes';
import { limpiarSerie } from '../../utils/serie';
import { CargarFotos } from './FotosPedido';

const INPUT = 'w-full h-11 px-3.5 rounded-xl bg-chip text-body text-ink outline-none placeholder:text-muted';
const ROTULO = 'text-label font-black uppercase tracking-widest text-muted';
const CLIENTE_VACIO = { nombre: '', calle: '', numero: '', piso: '', depto: '', localidad: '', notas: '' };
let sigClave = 1;
const equipoNuevo = (datos = {}) => ({ clave: sigClave++, serie: '', modelo: '', ubicacion: '', motivo: '', deLista: false, ...datos });

// Atajos de la grilla de días y horarios
const todas = (franjas) => DIAS_SEMANA.flatMap(d => franjas.map(f => ({ dia: d.id, franja: f })));
const ATAJOS = [
    { label: 'Cualquier día', ventanas: () => todas(FRANJAS.map(f => f.id)) },
    { label: 'Mañanas', ventanas: () => todas(['08:00-12:00']) },
    { label: 'Tardes', ventanas: () => todas(['14:00-18:00']) },
];

// Nuevo pedido (Portal Empresa). Carga guiada (10-oct-2026), como la carga de trabajo del admin:
// 1) ¿para quién? — uno de sus clientes (lugares) o uno nuevo, que queda guardado;
// 2) los equipos, cada uno con lo que le pasa; 3) cuándo pueden recibir al técnico.
// soloMiLugar: encargado de un lugar — no elige cliente, arranca en los equipos.
export default function NuevoPedidoSheet({ onCerrar, onCreado, inicial = null, soloMiLugar = false }) {
    const [sedes, setSedes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [q, setQ] = useState('');
    const [sedeId, setSedeId] = useState(inicial?.sedeId || null);
    const [nuevo, setNuevo] = useState(false);
    const [cliente, setCliente] = useState(CLIENTE_VACIO);
    const [equipos, setEquipos] = useState(inicial?.serie || inicial?.motivo
        ? [equipoNuevo({ serie: inicial.serie || '', motivo: inicial.motivo || '', deLista: !!inicial.serie })] : []);
    const [ventanas, setVentanas] = useState([]);
    const [detalle, setDetalle] = useState('');
    const [fotos, setFotos] = useState([]);
    const [urgente, setUrgente] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [paso, setPaso] = useState(soloMiLugar || inicial?.sedeId ? 1 : 0);
    const arriba = useRef(null);

    useEffect(() => {
        api.get('/empresa/sedes').then(r => {
            const l = Array.isArray(r.data) ? r.data : [];
            setSedes(l);
            if (l.length === 1 && soloMiLugar) setSedeId(l[0].id);
            if (l.length === 0 && !soloMiLugar) setNuevo(true);
        }).catch(() => { if (!soloMiLugar) setNuevo(true); }).finally(() => setCargando(false));
    }, [soloMiLugar]);

    // Cada paso arranca arriba
    useEffect(() => { arriba.current?.scrollIntoView({ block: 'start' }); }, [paso]);

    const sede = sedes.find(s => s.id === sedeId) || null;
    const equiposDelLugar = useMemo(() => (nuevo ? [] : sede?.equipos || []), [nuevo, sede]);

    // Desde la ficha de un equipo: completa modelo y ubicación cuando llegan los lugares
    useEffect(() => {
        if (!sede) return;
        setEquipos(es => es.map(e => {
            const d = e.deLista && (sede.equipos || []).find(x => x.serie === e.serie);
            return d ? { ...e, modelo: d.modelo || '', ubicacion: d.ubicacion || '' } : e;
        }));
    }, [sede]);

    // Si no hay equipos cargados para elegir, el paso 2 arranca con uno en blanco
    useEffect(() => {
        if (paso === 1 && equipos.length === 0 && equiposDelLugar.length === 0) setEquipos([equipoNuevo()]);
    }, [paso, equipos.length, equiposDelLugar.length]);

    const filtradas = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return sedes;
        return sedes.filter(s => [s.nombre, s.direccion, ...(s.series || [])].filter(Boolean).join(' ').toLowerCase().includes(t));
    }, [q, sedes]);

    const clienteListo = cliente.nombre.trim().length >= 2 && cliente.calle.trim() && cliente.localidad.trim();
    const paso1Listo = nuevo ? clienteListo : !!sedeId;
    const paso2Listo = equipos.length > 0 && equipos.every(e => e.motivo);
    const ultimoMotivo = () => [...equipos].reverse().find(e => e.motivo)?.motivo || '';

    const elegirLugar = (id) => {
        if (id !== sedeId) setEquipos([]);
        setSedeId(id);
        setPaso(1); // un toque y sigue
    };
    const alternarDeLista = (eq) => {
        const ya = equipos.find(e => e.deLista && e.serie === eq.serie);
        if (ya) setEquipos(es => es.filter(e => e !== ya));
        else setEquipos(es => [...es.filter(e => e.deLista || e.serie || e.modelo || e.ubicacion || e.motivo),
            equipoNuevo({ serie: eq.serie, modelo: eq.modelo || '', ubicacion: eq.ubicacion || '', motivo: ultimoMotivo(), deLista: true })]);
    };
    const cambiarEquipo = (clave, cambios) => setEquipos(es => es.map(e => (e.clave === clave ? { ...e, ...cambios } : e)));

    const enviar = async () => {
        if (!paso2Listo) { setPaso(1); toast.error('Elegí qué le pasa a cada equipo'); return; }
        if (ventanas.length === 0) { toast.error('Marcá cuándo pueden recibirnos'); return; }
        setGuardando(true);
        try {
            const limpio = (v) => (v || '').trim() || null;
            const r = await api.post('/empresa/pedidos', {
                sedeId: nuevo ? null : sedeId,
                clienteNuevo: nuevo ? Object.fromEntries(Object.entries(cliente).map(([k, v]) => [k, limpio(v)])) : null,
                equipos: equipos.map(e => ({ serie: limpio(e.serie), modelo: limpio(e.modelo), ubicacion: limpio(e.ubicacion), motivo: e.motivo })),
                ventanas,
                detalle: limpio(detalle),
                urgente,
                fotos,
            });
            toast.success('Pedido enviado');
            onCreado && onCreado(r.data);
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || e?.response?.data?.message || 'No se pudo enviar el pedido');
        } finally { setGuardando(false); }
    };

    // Pasos visibles: el encargado de un lugar no elige cliente
    const pasos = soloMiLugar ? [1, 2] : [0, 1, 2];
    const indice = pasos.indexOf(paso);
    const TITULOS = ['¿Para quién es?', '¿Qué equipos?', '¿Cuándo pueden recibirnos?'];
    const nombreLugar = nuevo ? cliente.nombre.trim() : (sede?.nombre || sede?.direccion);

    const pie = (
        <div className="flex gap-2">
            {indice > 0 && (
                <button type="button" onClick={() => setPaso(pasos[indice - 1])}
                    className="flex-1 h-12 rounded-xl bg-chip text-secondary font-black text-body active:scale-95">Atrás</button>
            )}
            {paso < 2 ? (
                <button type="button" onClick={() => setPaso(paso + 1)} disabled={paso === 0 ? !paso1Listo : !paso2Listo}
                    className="flex-[2] h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">Siguiente</button>
            ) : (
                <button type="button" onClick={enviar} disabled={ventanas.length === 0 || guardando}
                    className="flex-[2] h-12 rounded-xl bg-[#C9341F] text-white font-black text-body active:scale-95 disabled:opacity-40">{guardando ? 'Enviando…' : 'Enviar pedido'}</button>
            )}
        </div>
    );

    return (
        <ModalShell titulo="Nuevo pedido" subtitulo="Te avisamos cuando lo agendemos" onCerrar={onCerrar} ancho="md:max-w-xl" pie={pie}>
            <div ref={arriba} className="space-y-5 scroll-mt-4">
                <div>
                    <StepBar paso={indice} total={pasos.length} />
                    <p className={ROTULO}>Paso {indice + 1} de {pasos.length}</p>
                    <h3 className="text-title font-black text-ink leading-tight">{TITULOS[paso]}</h3>
                    {paso > 0 && nombreLugar && (
                        <p className="mt-1 flex items-center gap-1.5 text-caption text-muted truncate"><LuMapPin size={13} className="shrink-0" />{nombreLugar}</p>
                    )}
                </div>

                {/* ── 1. Cliente ─────────────────────────────────────────── */}
                {paso === 0 && (!nuevo ? (
                    <section className="space-y-2">
                        {sedes.length > 6 && (
                            <div className="relative">
                                <LuSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input className={`${INPUT} pl-10`} placeholder="Buscar cliente, dirección o N/S" value={q} onChange={e => setQ(e.target.value)} autoFocus />
                            </div>
                        )}
                        {cargando && <p className="text-caption text-muted">Cargando tus clientes…</p>}
                        <div className="space-y-1.5">
                            {filtradas.slice(0, 40).map(s => {
                                const on = s.id === sedeId;
                                return (
                                    <button key={s.id} type="button" onClick={() => elegirLugar(s.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left border-2 active:scale-[0.99] ${on ? 'border-brand-red bg-[rgba(201,52,31,0.06)]' : 'border-transparent bg-chip'}`}>
                                        <LuMapPin size={17} className={on ? 'text-brand-red shrink-0' : 'text-muted shrink-0'} />
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-body font-black text-ink truncate">{s.nombre || s.direccion}</span>
                                            <span className="block text-caption text-muted truncate">
                                                {[s.nombre ? s.direccion : null, s.series?.length ? `${s.series.length} equipo${s.series.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                        {on && <LuCheck size={18} className="text-brand-red shrink-0" />}
                                    </button>
                                );
                            })}
                            {!cargando && q && filtradas.length === 0 && <p className="text-caption text-muted px-1">No hay ninguno con “{q}”.</p>}
                        </div>
                        <button type="button" onClick={() => { setNuevo(true); setSedeId(null); setEquipos([]); setCliente(c => ({ ...c, nombre: c.nombre || q.trim() })); }}
                            className="w-full h-11 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 text-label font-black text-secondary active:scale-95">
                            <LuUserPlus size={16} /> Cliente nuevo
                        </button>
                    </section>
                ) : (
                    <section className="space-y-2">
                        <input className={INPUT} placeholder="Nombre del cliente *" value={cliente.nombre} autoFocus
                            onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))} />
                        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                            <input className={INPUT} placeholder="Calle *" value={cliente.calle} onChange={e => setCliente(c => ({ ...c, calle: e.target.value }))} />
                            <input className={INPUT} placeholder="Nro" inputMode="numeric" value={cliente.numero} onChange={e => setCliente(c => ({ ...c, numero: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input className={INPUT} placeholder="Piso" value={cliente.piso} onChange={e => setCliente(c => ({ ...c, piso: e.target.value }))} />
                            <input className={INPUT} placeholder="Depto" value={cliente.depto} onChange={e => setCliente(c => ({ ...c, depto: e.target.value }))} />
                        </div>
                        <input className={INPUT} placeholder="Localidad o barrio *" value={cliente.localidad} onChange={e => setCliente(c => ({ ...c, localidad: e.target.value }))} />
                        <textarea rows={2} value={cliente.notas} onChange={e => setCliente(c => ({ ...c, notas: e.target.value }))}
                            placeholder="A quién preguntar, horario de acceso… (opcional)"
                            className="w-full px-3.5 py-3 rounded-xl bg-chip text-body text-ink outline-none resize-none placeholder:text-muted" />
                        <p className="text-caption text-muted">Queda guardado en tus clientes para el próximo pedido.</p>
                        {sedes.length > 0 && (
                            <button type="button" onClick={() => setNuevo(false)} className="py-1 text-caption font-bold text-secondary underline">Elegir de mis clientes</button>
                        )}
                    </section>
                ))}

                {/* ── 2. Equipos ─────────────────────────────────────────── */}
                {paso === 1 && (
                    <section className="space-y-3">
                        {equiposDelLugar.length > 0 && (
                            <div className="space-y-1.5">
                                <p className={ROTULO}>Equipos de este cliente</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {equiposDelLugar.map(eq => {
                                        const on = equipos.some(e => e.deLista && e.serie === eq.serie);
                                        return (
                                            <button key={eq.serie} type="button" onClick={() => alternarDeLista(eq)} aria-pressed={on}
                                                className={`min-h-9 px-3 py-1.5 rounded-full text-caption font-bold text-left active:scale-95 ${on ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>
                                                {on && <LuCheck size={12} className="inline mr-1 -mt-0.5" />}{eq.serie}{eq.ubicacion ? ` · ${eq.ubicacion}` : ''}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {equipos.map((e, i) => (
                            <div key={e.clave} className="rounded-2xl bg-panel p-3 space-y-2.5">
                                <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-black text-ink truncate">
                                            {e.deLista ? `N/S ${e.serie}` : `Equipo ${i + 1}`}
                                        </p>
                                        {e.deLista && (e.modelo || e.ubicacion) && (
                                            <p className="text-caption text-muted truncate">{[e.modelo, e.ubicacion].filter(Boolean).join(' · ')}</p>
                                        )}
                                    </div>
                                    {equipos.length > 1 || equiposDelLugar.length > 0 ? (
                                        <button type="button" onClick={() => setEquipos(es => es.filter(x => x.clave !== e.clave))} aria-label="Quitar equipo"
                                            className="w-8 h-8 shrink-0 rounded-lg bg-chip text-muted flex items-center justify-center active:scale-90"><LuX size={15} /></button>
                                    ) : null}
                                </div>
                                {!e.deLista && (
                                    <div className="space-y-2">
                                        <input className={INPUT} placeholder="N/S (si no lo sabés, dejalo vacío)" value={e.serie}
                                            onChange={ev => cambiarEquipo(e.clave, { serie: limpiarSerie(ev.target.value) })} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input className={INPUT} placeholder="Modelo" value={e.modelo} onChange={ev => cambiarEquipo(e.clave, { modelo: ev.target.value })} />
                                            <input className={INPUT} placeholder="Ubicación" value={e.ubicacion} onChange={ev => cambiarEquipo(e.clave, { ubicacion: ev.target.value })} />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-caption font-bold text-secondary mb-1.5">¿Qué le pasa? *</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {MOTIVOS_PEDIDO.map(m => (
                                            <button key={m} type="button" onClick={() => cambiarEquipo(e.clave, { motivo: m })} aria-pressed={e.motivo === m}
                                                className={`min-h-10 px-3 py-1.5 rounded-xl text-label font-black text-left active:scale-95 ${e.motivo === m ? 'bg-[#C9341F] text-white' : 'bg-chip text-secondary'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button type="button" onClick={() => setEquipos(es => [...es, equipoNuevo({ motivo: ultimoMotivo() })])}
                            className="w-full h-11 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 text-label font-black text-secondary active:scale-95">
                            <LuPlus size={16} /> {equiposDelLugar.length > 0 ? 'Otro equipo (que no está en la lista)' : 'Otro equipo'}
                        </button>
                        {equipos.length === 0 && <p className="text-caption text-muted">Tocá los equipos que hay que ver.</p>}
                    </section>
                )}

                {/* ── 3. Cuándo + detalles ───────────────────────────────── */}
                {paso === 2 && (
                    <>
                        <section className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                                {ATAJOS.map(a => (
                                    <button key={a.label} type="button" onClick={() => setVentanas(a.ventanas())}
                                        className="h-9 px-3 rounded-full bg-chip text-caption font-bold text-secondary active:scale-95">{a.label}</button>
                                ))}
                                {ventanas.length > 0 && (
                                    <button type="button" onClick={() => setVentanas([])} className="h-9 px-3 rounded-full text-caption font-bold text-muted underline">Borrar</button>
                                )}
                            </div>
                            <SelectorVentanas value={ventanas} onChange={setVentanas}
                                ayuda="Marcá los días y horarios en que hay alguien para recibir al técnico. Él elige el día dentro de lo que marques y te avisamos." />
                            {ventanas.length > 0 && (
                                <div className="p-3 rounded-xl bg-chip">
                                    {resumenVentanas(ventanas).map(l => <p key={l} className="text-caption font-bold text-ink">{l}</p>)}
                                </div>
                            )}
                        </section>

                        <section className="space-y-2">
                            <p className={ROTULO}>Algo más <span className="normal-case tracking-normal font-bold">(opcional)</span></p>
                            <textarea rows={3} value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Piso, sector, a quién preguntar, cómo se manifiesta la falla…"
                                className="w-full px-3.5 py-3 rounded-xl bg-chip text-body text-ink outline-none resize-none placeholder:text-muted" />
                        </section>

                        {/* Fotos del problema: el técnico llega sabiendo qué es */}
                        <section className="space-y-2">
                            <p className={ROTULO}>Fotos <span className="normal-case tracking-normal font-bold">(opcional, hasta 4)</span></p>
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

                        <div className="p-3 rounded-2xl border border-black/10 dark:border-white/10 space-y-1">
                            <p className={ROTULO}>Resumen</p>
                            <p className="text-body font-black text-ink">{nombreLugar}{nuevo && <span className="font-bold text-muted"> · cliente nuevo</span>}</p>
                            {equipos.map(e => (
                                <p key={e.clave} className="text-caption text-secondary">
                                    • {e.serie ? `N/S ${e.serie}` : 'Sin N/S'}{e.ubicacion ? ` · ${e.ubicacion}` : ''} — <b>{e.motivo}</b>
                                </p>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </ModalShell>
    );
}
