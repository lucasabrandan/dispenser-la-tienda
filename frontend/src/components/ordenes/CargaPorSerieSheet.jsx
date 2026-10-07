import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuX, LuSearch, LuTrash2, LuPackage, LuCamera } from 'react-icons/lu';
import api from '../../services/api';
import { limpiarSerie, generarSerie } from '../../utils/serie';
import { useAuth } from '../../context/AuthContext';
import { getTodayISO } from '../../utils/dateUtils';
import FotoUpload from '../servicio/FotoUpload';
import RepuestosBottomSheet from '../repuesto/RepuestosBottomSheet';

// Carga por N° de serie (2-oct-2026) — para clientes con tarifa mensual por volumen
// (ej. MODO AGUA). El técnico, frente a cada equipo, escribe la serie, carga trabajo,
// repuestos y fotos, y al final guarda todo junto. Sin presupuesto y sin precio: los
// servicios quedan COMPLETADO con mano de obra $0 y los cobra el cierre mensual
// (CierreMensualController). Foto de antes y de después obligatorias para esos clientes.
// Se arma un servicio por dirección (sede), así cada reporte individual es de un lugar.

const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-panel text-ink text-body font-medium outline-none border border-black/[0.05] dark:border-white/[0.05] placeholder:text-muted';

async function subirFoto(dataUrl, prefijo) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl || null;
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append('file', blob, `${prefijo}_${Date.now()}.jpg`);
    const r = await api.post('/uploads', fd);
    return r.data?.url || r.data?.filename || null;
}

// orden (opcional): visita agendada con equiposSerie — se precargan esos equipos y el
// cliente; al guardar, quien llama cierra la visita.
export default function CargaPorSerieSheet({ onClose, onGuardado, orden = null }) {
    const { usuario, esAdmin } = useAuth();
    const [clientesTarifa, setClientesTarifa] = useState(null); // admin: elegir cliente para un equipo nuevo
    const [serie, setSerie] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [noEncontrado, setNoEncontrado] = useState(null); // serie buscada sin resultado
    const [cliente, setCliente] = useState(() => (orden?.clienteId ? { id: orden.clienteId, nombre: orden.clienteNombre, exigeFotos: true } : null)); // { id, nombre, exigeFotos }
    const [nuevaDir, setNuevaDir] = useState(null);         // { nombre, direccion } — alta de dirección
    const [sedesCliente, setSedesCliente] = useState([]);
    const [sedeAlta, setSedeAlta] = useState('');
    const [items, setItems] = useState([]);
    const itemsRef = useRef([]);
    itemsRef.current = items;
    const [repuestosDB, setRepuestosDB] = useState([]);
    const [sheetRep, setSheetRep] = useState(null);         // índice del item
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        api.get('/repuestos', { params: { page: 0, size: 1000 } }).then(r => {
            const d = r.data;
            setRepuestosDB(Array.isArray(d) ? d : (d?.content || []));
        }).catch(() => {});
    }, []);

    // Admin con un N/S que no existe y todavía sin cliente: puede elegir a qué
    // cliente con tarifa mensual pertenece y darlo de alta (5-oct-2026).
    useEffect(() => {
        if (!esAdmin || cliente || !noEncontrado || clientesTarifa) return;
        api.get('/clientes', { params: { page: 0, size: 1000 } })
            .then(r => { const d = r.data; setClientesTarifa((Array.isArray(d) ? d : (d?.content || [])).filter(c => c.tieneTarifa)); })
            .catch(() => setClientesTarifa([]));
    }, [esAdmin, cliente, noEncontrado, clientesTarifa]);

    useEffect(() => {
        if (!cliente) return;
        // Antes pedía /sedes?clienteId= y el backend devolvía TODAS las sedes
        api.get(`/sedes/cliente/${cliente.id}`)
            .then(r => { const d = r.data; setSedesCliente(Array.isArray(d) ? d : (d?.content || [])); })
            .catch(() => {});
    }, [cliente]);

    // Visita con equipos ya elegidos por el admin: se agregan solos al abrir
    useEffect(() => {
        if (!orden?.equiposSerie) return;
        (async () => {
            for (const s of orden.equiposSerie.split(',').map(x => x.trim()).filter(Boolean)) {
                await buscar(s); // eslint-disable-line no-await-in-loop
            }
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const agregar = (eq) => setItems(its => [{
        serie: eq.serie, equipo: eq, trabajo: '', repuestos: [], fotoAntes: null, fotoDespues: null,
    }, ...its]);

    // N/S nuevo para un equipo sin número: queda listo para darlo de alta
    const [generando, setGenerando] = useState(false);
    const generarNuevo = async () => {
        setGenerando(true);
        try {
            const s = await generarSerie(orden?.tecnicoNombre || usuario?.nombre, items.map(i => i.serie));
            setSerie(''); setNoEncontrado(s);
            toast.success(`N/S generado: ${s}. Elegí dónde está y tocá Alta.`);
        } catch { toast.error('No se pudo generar el N/S'); }
        finally { setGenerando(false); }
    };

    const buscar = async (valor = serie) => {
        const s = limpiarSerie(valor);
        if (!s) return;
        if (itemsRef.current.some(i => i.serie.toUpperCase() === s)) { toast('Ese equipo ya está en la lista'); return; }
        setBuscando(true); setNoEncontrado(null);
        try {
            const r = await api.get('/equipos/historial/para-carga', { params: { serie: s } });
            if (!r.data?.encontrado) { setNoEncontrado(s); return; }
            // N/S de un cliente que no es el de esta visita (7-oct-2026)
            if (r.data.ajeno) { toast.error('Ese N/S es de otro cliente, no del de esta visita.', { duration: 6000 }); return; }
            if (!r.data.tarifaVolumen) {
                toast.error(`${r.data.cliente || 'Ese cliente'} no trabaja con tarifa mensual: cargá el trabajo desde su orden.`, { duration: 6000 });
                return;
            }
            const eq = r.data.equipo;
            if (cliente && eq.clienteId !== cliente.id) {
                toast.error(`Ese equipo es de ${eq.cliente}. En una carga va un solo cliente.`);
                return;
            }
            if (!cliente) {
                // Clientes con tarifa mensual: foto de antes y después obligatorias
                setCliente({ id: eq.clienteId, nombre: eq.cliente, exigeFotos: true });
            }
            agregar(eq);
            setSerie('');
        } catch {
            toast.error('No se pudo buscar. Revisá la señal.');
        } finally {
            setBuscando(false);
        }
    };

    // Alta rápida: equipo nuevo en una dirección de este mismo cliente.
    // Si la dirección tampoco existe, se crea ahí mismo ("Nueva dirección").
    const darDeAlta = async () => {
        let sedeId = sedeAlta;
        if (sedeAlta === '__nueva__') {
            if (!nuevaDir?.nombre?.trim() || !nuevaDir?.direccion?.trim()) { toast.error('Completá el lugar y la dirección'); return; }
            try {
                const r = await api.post('/sedes', { clienteId: cliente.id, nombreSede: nuevaDir.nombre.trim(), direccion: nuevaDir.direccion.trim() });
                sedeId = r.data?.id;
                setSedesCliente(ss => [...ss, r.data]);
            } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo crear la dirección'); return; }
        }
        if (!sedeId) { toast.error('Elegí la dirección'); return; }
        try {
            await api.post('/equipos', { numeroSerie: noEncontrado, sedeId: Number(sedeId) });
            setNuevaDir(null);
            toast.success(`Equipo ${noEncontrado} dado de alta`);
            const s = noEncontrado;
            setNoEncontrado(null); setSedeAlta('');
            await buscar(s);
        } catch (e) {
            toast.error(e?.response?.data?.mensaje || 'No se pudo dar de alta');
        }
    };

    const cambiar = (i, campo, valor) => setItems(its => its.map((it, k) => k === i ? { ...it, [campo]: valor } : it));
    const quitar = (i) => setItems(its => its.filter((_, k) => k !== i));

    const faltantes = items.map(it => {
        const f = [];
        if (!it.trabajo.trim()) f.push('trabajo');
        if (cliente?.exigeFotos && !it.fotoAntes) f.push('foto antes');
        if (cliente?.exigeFotos && !it.fotoDespues) f.push('foto después');
        return f;
    });
    const listo = items.length > 0 && faltantes.every(f => f.length === 0);

    const guardar = async () => {
        if (!listo) { toast.error('Completá lo que falta en cada equipo'); return; }
        setGuardando(true);
        const loading = toast.loading('Subiendo fotos y guardando…');
        try {
            const conFotos = [];
            for (const it of items) {
                conFotos.push({
                    ...it,
                    fotoAntes: await subirFoto(it.fotoAntes, `antes_${it.serie}`),
                    fotoDespues: await subirFoto(it.fotoDespues, `despues_${it.serie}`),
                });
            }
            const porSede = {};
            conFotos.forEach(it => {
                const k = it.equipo.sedeId;
                (porSede[k] = porSede[k] || []).push(it);
            });
            let guardados = 0;
            for (const [sedeId, grupo] of Object.entries(porSede)) {
                await api.post('/servicios', {
                    clienteNombre: cliente.nombre,
                    sedeId: Number(sedeId),
                    sedeNombre: grupo[0].equipo.sede || '',
                    usuarioId: usuario?.id,
                    servicioTipo: 'TECNICA',
                    estado: 'COMPLETADO',
                    ordenId: orden?.id || null,
                    fecha: getTodayISO(),
                    observaciones: [observaciones.trim(), 'Cargado por N° de serie — se factura en el cierre mensual'].filter(Boolean).join(' | '),
                    items: grupo.map(it => ({
                        equipoSerial: it.serie,
                        tecnico: usuario?.nombre || 'Técnico',
                        trabajoTipo: 'REPARACION',
                        metodoPago: 'EFECTIVO',
                        trabajoRealizado: it.trabajo.trim(),
                        costo: 0,
                        repuestosUsados: it.repuestos,
                        fotoAntes: it.fotoAntes,
                        fotoDespues: it.fotoDespues,
                    })),
                });
                guardados += grupo.length;
            }
            toast.success(`${guardados} equipo${guardados !== 1 ? 's' : ''} registrado${guardados !== 1 ? 's' : ''}`, { id: loading });
            onGuardado && onGuardado();
            onClose();
        } catch (e) {
            toast.error(`No se pudo guardar${e?.response?.data?.mensaje ? ': ' + e.response.data.mensaje : ''}. No cierres esta pantalla y probá de nuevo.`, { id: loading, duration: 7000 });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/50 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6">
            <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl p-5 bg-card max-h-[calc(var(--vh,1vh)*94)] overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-body-lg font-black text-ink">{orden ? 'Cerrar visita' : 'Cargar equipos por N° de serie'}</h3>
                    <button onClick={() => (items.length && !window.confirm('¿Salir sin guardar? Se pierde lo cargado.')) ? null : onClose()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-chip text-muted active:scale-95"><LuX size={16} /></button>
                </div>
                <p className="text-caption text-muted mb-3">
                    {cliente ? `${cliente.nombre} · sin precio, se factura en el cierre mensual` : 'Para clientes con tarifa mensual. Sin presupuesto ni precio.'}
                </p>

                <form onSubmit={e => { e.preventDefault(); buscar(); }} className="flex gap-1.5 mb-3">
                    <input value={serie} onChange={e => setSerie(limpiarSerie(e.target.value))} placeholder="N° de serie del equipo" className={INPUT} />
                    <button type="submit" disabled={buscando || !serie.trim()}
                        className="px-4 rounded-xl font-black text-label uppercase bg-brand-red text-white active:scale-95 flex items-center gap-1.5 disabled:opacity-40">
                        <LuSearch size={15} /> {buscando ? '…' : 'Agregar'}
                    </button>
                </form>
                {/* Equipo sin N/S: se genera con la regla de siempre (inicial + S + fecha, y A, B, C…) */}
                {(esAdmin || cliente) && !noEncontrado && (
                    <button type="button" onClick={generarNuevo} disabled={generando}
                        className="mb-3 -mt-1 text-caption font-bold text-secondary underline disabled:opacity-50">
                        {generando ? 'Generando…' : '¿El equipo no tiene N/S? Generar uno nuevo'}
                    </button>
                )}

                {noEncontrado && (
                    <div className="p-3 rounded-xl bg-page border border-black/[0.06] dark:border-white/[0.06] mb-3 text-caption">
                        <p className="font-bold text-ink mb-2">{noEncontrado} es nuevo, todavía no está cargado.</p>
                        {cliente ? (
                            <>
                                <p className="text-muted mb-1.5">Darlo de alta en una dirección de {cliente.nombre}:</p>
                                <div className="flex gap-1.5">
                                    <select value={sedeAlta} onChange={e => { setSedeAlta(e.target.value); setNuevaDir(e.target.value === '__nueva__' ? { nombre: '', direccion: '' } : null); }} className={INPUT}>
                                        <option value="">Elegí la dirección…</option>
                                        <option value="__nueva__">+ Nueva dirección</option>
                                        {sedesCliente.map(s => <option key={s.id} value={s.id}>{[s.nombreSede || s.nombre, s.direccion].filter(Boolean).join(' · ')}</option>)}
                                    </select>
                                    <button onClick={darDeAlta} className="px-3 rounded-xl font-black text-label uppercase bg-ink text-page active:scale-95">Alta</button>
                                </div>
                                {nuevaDir && (
                                    <div className="mt-2 space-y-1.5">
                                        <input value={nuevaDir.nombre} onChange={e => setNuevaDir(d => ({ ...d, nombre: e.target.value }))}
                                            placeholder="Nombre del lugar (ej: Gimnasio Núñez)" className={INPUT} />
                                        <input value={nuevaDir.direccion} onChange={e => setNuevaDir(d => ({ ...d, direccion: e.target.value }))}
                                            placeholder="Calle, número y localidad" className={INPUT} />
                                    </div>
                                )}
                            </>
                        ) : esAdmin ? (
                            <>
                                <p className="text-muted mb-1.5">Si es un equipo nuevo, ¿de qué cliente es?</p>
                                <select value="" onChange={e => { const c = (clientesTarifa || []).find(x => String(x.id) === e.target.value); if (c) setCliente({ id: c.id, nombre: c.nombre, exigeFotos: true }); }} className={INPUT}>
                                    <option value="">{clientesTarifa === null ? 'Cargando clientes…' : 'Elegí el cliente…'}</option>
                                    {(clientesTarifa || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                {clientesTarifa && clientesTarifa.length === 0 && (
                                    <p className="text-muted mt-1.5">No hay clientes con tarifa mensual. Cargale la tarifa al cliente primero.</p>
                                )}
                            </>
                        ) : (
                            <p className="text-muted">Revisá la serie. Si es un equipo nuevo, pedile al admin que lo cargue.</p>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    {items.map((it, i) => (
                        <div key={it.serie} className="p-3 rounded-xl bg-page border border-black/[0.06] dark:border-white/[0.06]">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="min-w-0">
                                    <p className="font-black text-body text-ink">{it.serie}</p>
                                    <p className="text-label text-muted truncate">{[it.equipo.sede, it.equipo.direccion].filter(Boolean).join(' · ')}</p>
                                </div>
                                <button onClick={() => quitar(i)} className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-chip text-muted active:scale-95"><LuTrash2 size={14} /></button>
                            </div>
                            <textarea value={it.trabajo} onChange={e => cambiar(i, 'trabajo', e.target.value)} rows={2}
                                placeholder="Trabajo realizado (ej: limpieza, cambio de filtro, sanitización)" className={INPUT + ' text-caption mb-2'} />
                            <button onClick={() => setSheetRep(i)}
                                className="w-full mb-2 h-9 rounded-lg text-label font-bold bg-chip text-secondary active:scale-95 flex items-center justify-center gap-1.5">
                                <LuPackage size={13} />
                                {it.repuestos.length ? it.repuestos.map(r => `${r.cantidad}x ${r.nombre}`).join(', ') : 'Repuestos usados'}
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <FotoUpload label={`Antes${cliente?.exigeFotos ? ' *' : ''}`} foto={it.fotoAntes} onChange={v => cambiar(i, 'fotoAntes', v)} />
                                <FotoUpload label={`Después${cliente?.exigeFotos ? ' *' : ''}`} foto={it.fotoDespues} onChange={v => cambiar(i, 'fotoDespues', v)} />
                            </div>
                            {faltantes[i].length > 0 && (
                                <p className="text-label font-bold text-brand-amber mt-1.5 flex items-center gap-1">
                                    <LuCamera size={11} /> Falta: {faltantes[i].join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {items.length > 0 && (
                    <>
                        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2}
                            placeholder="Observaciones generales (opcional)" className={INPUT + ' text-caption mt-3'} />
                        <button onClick={guardar} disabled={guardando || !listo}
                            className="w-full mt-3 h-12 rounded-xl font-black text-label uppercase bg-brand-red text-white active:scale-95 disabled:opacity-40">
                            {guardando ? 'Guardando…' : `Guardar ${items.length} equipo${items.length !== 1 ? 's' : ''}`}
                        </button>
                    </>
                )}
            </div>

            {sheetRep !== null && items[sheetRep] && (
                <RepuestosBottomSheet isOpen onClose={() => setSheetRep(null)}
                    repuestos={repuestosDB} seleccionados={items[sheetRep].repuestos}
                    onChange={nuevos => cambiar(sheetRep, 'repuestos', nuevos)} />
            )}
        </div>
    );
}
