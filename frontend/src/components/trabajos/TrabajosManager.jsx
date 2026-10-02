import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuTriangleAlert, LuX, LuMapPin } from 'react-icons/lu';
import api from '../../services/api';
import BusquedaBar from '../ui/BusquedaBar';
import { M } from '../servicio/ServicioUI';
import { colorTecnico } from '../../utils/estados';
import { getTodayISO } from '../../utils/dateUtils';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import IniciarTrabajoSheet from '../presupuesto/IniciarTrabajoSheet';
import ModalDespacharPresupuesto from '../presupuesto/ModalDespacharPresupuesto';
import EjecutarAdminSheet from '../servicio/EjecutarAdminSheet';
import CobroSheet from '../servicio/CobroSheet';
import DetalleSheet from '../servicio/DetalleSheet';
import OrdenForm from '../ordenes/OrdenForm';
import CierreMensualModal from '../cliente/CierreMensualModal';

// ─────────────────────────────────────────────────────────────────────────────
// Trabajos (2-oct-2026) — una sola pantalla para todo el recorrido de un trabajo:
// Presupuesto → Asignado → En camino → En el lugar → Hecho → Facturado → Cobrado.
// Antes el mismo trabajo vivía en 3 lugares (Presupuestos, Despacho y las pestañas
// de cobro de Servicio Técnico), cada uno con sus nombres de estado. Acá no cambia
// ningún dato: se juntan /servicios y /ordenes y cada trabajo cae en UNA etapa.
// Cada fila tiene un solo botón: el próximo paso que le toca al admin.
// ─────────────────────────────────────────────────────────────────────────────

const ETAPAS = [
    { id: 'PRESUPUESTO', label: 'Presupuesto', color: '#A8A29E' },
    { id: 'ASIGNADO',    label: 'Asignado',    color: '#A78BFA' },
    { id: 'CAMINO',      label: 'En camino',   color: '#60A5FA' },
    { id: 'LUGAR',       label: 'En el lugar', color: '#F0A500' },
    { id: 'HECHO',       label: 'Hecho',       color: '#2DD4BF' },
    { id: 'FACTURADO',   label: 'Facturado',   color: '#818CF8' },
    { id: 'COBRADO',     label: 'Cobrado',     color: '#4ADE80' },
];
const ETAPA = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
const ETAPA_DE_ORDEN = { PENDIENTE: 'ASIGNADO', EN_CAMINO: 'CAMINO', EN_SITIO: 'LUGAR' };
const ABIERTAS = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO'];

const diasDesde = (f) => {
    if (!f) return null;
    const d = new Date(String(f).slice(0, 10) + 'T00:00:00');
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
};
const fechaCorta = (f) => {
    if (!f) return '';
    const s = String(f).slice(0, 10);
    if (s === getTodayISO()) return 'Hoy';
    const [, m, d] = s.split('-');
    return d && m ? `${d}/${m}` : s;
};
const primerNombre = (n) => (n || '').trim().split(' ')[0] || '';
const totalItems = (s) => (s.items || []).reduce((a, i) => a + Number(i.costo || 0), 0);
const esCierreMensual = (s) =>
    (s.items || []).length > 0 && totalItems(s) === 0 && /cierre mensual/i.test(s.observaciones || '');

export default function TrabajosManager() {
    const [servicios, setServicios] = useState([]);
    const [ordenes, setOrdenes]     = useState([]);
    const [tecnicos, setTecnicos]   = useState([]);
    const [cargando, setCargando]   = useState(true);

    const [etapa, setEtapa]   = useState(null);   // null = "En curso" (todo menos Cobrado)
    const [tec, setTec]       = useState('');      // '' todos · '__SIN__' · nombre
    const [busqueda, setBusqueda] = useState('');

    // Modales (se reusan los mismos de las pantallas viejas)
    const [iniciar, setIniciar]       = useState(null);
    const [despachar, setDespachar]   = useState(null);
    const [ejecutar, setEjecutar]     = useState(null);
    const [cobrar, setCobrar]         = useState(null);
    const [detalle, setDetalle]       = useState(null);
    const [ordenEditar, setOrdenEditar] = useState(null);
    const [atrasada, setAtrasada]     = useState(null);
    const [cierreCliente, setCierreCliente] = useState(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const hoy = new Date();
            const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
            const enUnAno = new Date(); enUnAno.setFullYear(enUnAno.getFullYear() + 1);
            const [abiertos, cobrados, ords] = await Promise.all([
                api.get('/servicios', { params: { estado: 'PRESUPUESTO,APROBADO,EN_PROGRESO,COMPLETADO,PENDIENTE_FACTURACION,FACTURADO', page: 0, size: 500, sort: 'fechaServicio,desc' } }),
                api.get('/servicios', { params: { estado: 'COBRADO,REALIZADO', desde: inicioMes, page: 0, size: 300, sort: 'fechaServicio,desc' } }),
                api.get('/ordenes', { params: { desde: '2020-01-01', hasta: enUnAno.toISOString().slice(0, 10) } }),
            ]);
            const lista = (r) => r.data?.content || (Array.isArray(r.data) ? r.data : []);
            setServicios([...lista(abiertos), ...lista(cobrados)]);
            setOrdenes(Array.isArray(ords.data) ? ords.data : []);
        } catch {
            toast.error('No se pudieron cargar los trabajos');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => {
        api.get('/ordenes/tecnicos').then(r => setTecnicos(r.data || [])).catch(() => {});
    }, []);

    // ── Armado de filas: cada trabajo en UNA etapa ──────────────────────────
    const filas = useMemo(() => {
        const hoy = getTodayISO();
        const ordenAbiertaDe = {};
        ordenes.filter(o => ABIERTAS.includes(o.estado) && o.presupuestoId)
            .forEach(o => { ordenAbiertaDe[o.presupuestoId] = o; });
        const idsServicios = new Set(servicios.map(s => s.id));
        const out = [];
        const grupos = {}; // cierre mensual: un renglón por cliente

        servicios.forEach(s => {
            const ord = ordenAbiertaDe[s.id];
            const equipos = (s.items || []).filter(i => i.equipoSerial && i.equipoSerial !== 'MOSTRADOR');
            const lugar = [s.sedeNombre, s.sedeDireccion].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
            const base = {
                key: `s${s.id}`, servicio: s, orden: ord || null,
                cliente: s.clienteNombre || `#${s.id}`,
                detalle: [equipos.length ? `${equipos.length} equipo${equipos.length !== 1 ? 's' : ''}` : null, lugar,
                    equipos.slice(0, 2).map(i => i.equipoSerial).join(', ') || null].filter(Boolean).join(' · '),
                busca: [s.clienteNombre, s.sedeNombre, s.sedeDireccion, s.nroDocumento, s.usuarioNombre,
                    ...equipos.map(i => i.equipoSerial)].filter(Boolean).join(' ').toLowerCase(),
                monto: Number(s.montoFinal) > 0 ? Number(s.montoFinal) : totalItems(s),
                esVenta: s.servicioTipo === 'VENTA',
            };
            let fila;
            // fechaOrden: la fecha que manda en el orden dentro de su etapa
            const fo = (...fs) => String(fs.find(Boolean) || '').replace(' ', 'T');
            if (s.enEspera) {
                fila = { ...base, etapa: 'PRESUPUESTO', tecnico: '', fecha: fechaCorta(s.fecha), nota: 'En espera', accion: 'asignar', fechaOrden: fo(s.fecha) };
            } else if (['PRESUPUESTO', 'APROBADO', 'EN_PROGRESO'].includes(s.estado)) {
                if (ord) {
                    const et = ETAPA_DE_ORDEN[ord.estado];
                    const atr = ord.estado === 'PENDIENTE' && ord.fechaProgramada && ord.fechaProgramada < hoy;
                    fila = {
                        ...base, etapa: et, tecnico: ord.tecnicoNombre || '',
                        fecha: fechaCorta(ord.fechaProgramada) + (ord.horaEstimada ? ` ${ord.horaEstimada}` : ''),
                        nota: atr ? `Atrasada ${diasDesde(ord.fechaProgramada)} días` : (et === 'CAMINO' ? 'Salió' : et === 'LUGAR' ? 'Trabajando' : ''),
                        alerta: atr,
                        accion: atr ? 'atrasada' : et === 'ASIGNADO' ? 'reprogramar' : 'seguimiento',
                        fechaOrden: fo(ord.fechaProgramada) + ' ' + (ord.horaEstimada || ''),
                    };
                } else if (s.estado === 'EN_PROGRESO') {
                    fila = { ...base, etapa: 'ASIGNADO', tecnico: s.usuarioNombre || '', fecha: fechaCorta(s.fecha), nota: 'Sin visita agendada', alerta: true, accion: 'ejecutar', fechaOrden: fo(s.fecha) };
                } else {
                    const d = diasDesde(s.fecha);
                    fila = { ...base, etapa: 'PRESUPUESTO', tecnico: '', fecha: fechaCorta(s.fecha), nota: d > 14 ? `Hace ${d} días` : '', alerta: d > 30, accion: 'asignar', fechaOrden: fo(s.fecha) };
                }
            } else if (s.estado === 'COMPLETADO' || s.estado === 'PENDIENTE_FACTURACION') {
                if (esCierreMensual(s) && s.clienteId) {
                    const g = grupos[s.clienteId] || (grupos[s.clienteId] = {
                        key: `cm${s.clienteId}`, etapa: 'HECHO', cliente: s.clienteNombre, clienteId: s.clienteId,
                        equipos: 0, tecnicos: new Set(), busca: '', monto: null, accion: 'cierre',
                        fecha: 'Este mes', nota: 'Se factura en el cierre mensual',
                    });
                    g.equipos += equipos.length || 1;
                    if (s.usuarioNombre) g.tecnicos.add(s.usuarioNombre);
                    g.busca += ' ' + base.busca;
                    return;
                }
                const d = diasDesde(s.fechaCompletado || s.fecha);
                fila = {
                    ...base, etapa: 'HECHO', tecnico: s.usuarioNombre || '', fecha: fechaCorta(s.fechaCompletado || s.fecha),
                    nota: s.estado === 'PENDIENTE_FACTURACION' ? 'Falta emitir la factura' : (d > 7 ? `Hace ${d} días sin cobrar` : 'Falta cobrar'),
                    alerta: d > 7,
                    accion: s.estado === 'PENDIENTE_FACTURACION' ? 'facturado' : 'cobrar',
                    fechaOrden: fo(s.fechaCompletado, s.fecha),
                };
            } else if (s.estado === 'FACTURADO') {
                const d = diasDesde(s.fechaFacturacion || s.fecha);
                fila = { ...base, etapa: 'FACTURADO', tecnico: s.usuarioNombre || '', fecha: fechaCorta(s.fechaFacturacion || s.fecha),
                    nota: d > 7 ? `Hace ${d} días sin cobrar` : 'Esperando el pago', alerta: d > 7, accion: 'cobrado', fechaOrden: fo(s.fechaFacturacion, s.fecha) };
            } else if (s.estado === 'COBRADO' || s.estado === 'REALIZADO') {
                fila = { ...base, etapa: 'COBRADO', tecnico: s.usuarioNombre || '', fecha: fechaCorta(s.fechaCobro || s.fecha),
                    nota: s.modalidadCobro === 'EFECTIVO_SIN_FACTURA' ? 'Efectivo' : s.modalidadCobro === 'CON_FACTURA' ? 'Con factura' : '', accion: 'pdf', fechaOrden: fo(s.fechaCobro, s.fecha) };
            }
            if (fila) out.push(fila);
        });

        // Visitas abiertas sin presupuesto (o con uno que no vino en la lista)
        ordenes.filter(o => ABIERTAS.includes(o.estado) && (!o.presupuestoId || !idsServicios.has(o.presupuestoId)))
            .forEach(o => {
                const et = ETAPA_DE_ORDEN[o.estado];
                const atr = o.estado === 'PENDIENTE' && o.fechaProgramada && o.fechaProgramada < getTodayISO();
                out.push({
                    key: `o${o.id}`, orden: o, servicio: null, etapa: et,
                    cliente: o.clienteNombre || o.titulo || `Visita #${o.id}`,
                    detalle: [o.titulo && o.titulo !== o.clienteNombre ? o.titulo : null, o.direccion].filter(Boolean).join(' · '),
                    busca: [o.clienteNombre, o.titulo, o.direccion, o.tecnicoNombre].filter(Boolean).join(' ').toLowerCase(),
                    tecnico: o.tecnicoNombre || '',
                    fecha: fechaCorta(o.fechaProgramada) + (o.horaEstimada ? ` ${o.horaEstimada}` : ''),
                    nota: atr ? `Atrasada ${diasDesde(o.fechaProgramada)} días` : 'Visita sin presupuesto',
                    alerta: atr, monto: Number(o.montoEstimado) || 0,
                    accion: atr ? 'atrasada' : et === 'ASIGNADO' ? 'reprogramar' : 'seguimiento',
                    fechaOrden: String(o.fechaProgramada || '') + ' ' + (o.horaEstimada || ''),
                });
            });

        Object.values(grupos).forEach(g => {
            const t = [...g.tecnicos];
            out.push({ ...g, tecnico: t.length === 1 ? t[0] : '', tecnicoTexto: t.length > 1 ? t.map(primerNombre).join(', ') : null,
                detalle: `${g.equipos} equipo${g.equipos !== 1 ? 's' : ''} · tarifa por volumen` });
        });

        // Criterio de orden (2-oct-2026), igual en toda la app:
        //  1. alertas arriba de todo;
        //  2. por etapa (en el recorrido del trabajo);
        //  3. dentro de la etapa: lo pendiente, lo más viejo primero (nada queda olvidado
        //     abajo); lo agendado, por fecha y hora; lo cobrado, lo más nuevo primero.
        const ordenEtapa = Object.fromEntries(ETAPAS.map((e, i) => [e.id, i]));
        return out.sort((a, b) =>
            (b.alerta ? 1 : 0) - (a.alerta ? 1 : 0)
            || ordenEtapa[a.etapa] - ordenEtapa[b.etapa]
            || (a.etapa === 'COBRADO'
                ? String(b.fechaOrden || '').localeCompare(String(a.fechaOrden || ''))
                : String(a.fechaOrden || '').localeCompare(String(b.fechaOrden || ''))));
    }, [servicios, ordenes]);

    // ── Filtros ──────────────────────────────────────────────────────────────
    const q = busqueda.trim().toLowerCase();
    const pasaBusqueda = (f) => !q || q.split(/\s+/).every(t => f.busca.includes(t) || (f.cliente || '').toLowerCase().includes(t));
    const pasaTec = (f) => !tec || (tec === '__SIN__' ? !f.tecnico : f.tecnico === tec);
    const enEtapa = (f) => (etapa ? f.etapa === etapa : f.etapa !== 'COBRADO');

    const base = filas.filter(f => pasaBusqueda(f) && enEtapa(f));
    const visibles = base.filter(pasaTec);
    const conteo = Object.fromEntries(ETAPAS.map(e => [e.id, filas.filter(f => f.etapa === e.id && pasaBusqueda(f) && pasaTec(f)).length]));
    const atrasadas = filas.filter(f => f.accion === 'atrasada');

    const chips = useMemo(() => {
        const nombres = [...new Set(base.map(f => f.tecnico).filter(Boolean))].sort();
        const sin = base.filter(f => !f.tecnico).length;
        return [
            { id: '', label: 'Todos', count: base.length },
            ...nombres.map(n => ({ id: n, label: primerNombre(n), count: base.filter(f => f.tecnico === n).length, color: colorTecnico(n) })),
            ...(sin ? [{ id: '__SIN__', label: 'Sin técnico', count: sin }] : []),
        ];
    }, [base]);

    const totalVisible = visibles.reduce((a, f) => a + (f.monto || 0), 0);
    const tituloTotal = { HECHO: 'Para cobrar', FACTURADO: 'Para cobrar', COBRADO: 'Cobrado este mes', PRESUPUESTO: 'Presupuestado' }[etapa] || 'En curso';

    const elegirEtapa = (id) => { setEtapa(e => (e === id ? null : id)); setTec(''); };

    // ── Acciones ─────────────────────────────────────────────────────────────
    const patchServicio = async (id, estado, msg, extras = {}) => {
        const t = toast.loading('Guardando…');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado, ...extras });
            toast.success(msg, { id: t });
            cargar();
        } catch { toast.error('No se pudo actualizar', { id: t }); }
    };
    const patchOrden = async (id, estado, msg) => {
        const t = toast.loading('Guardando…');
        try {
            await api.patch(`/ordenes/${id}/estado`, { estado });
            toast.success(msg, { id: t });
            setAtrasada(null);
            cargar();
        } catch { toast.error('No se pudo actualizar', { id: t }); }
    };
    const guardarOrden = async (id, form) => {
        const t = toast.loading('Guardando…');
        try {
            const { estadoNuevo, ...datos } = form;
            await api.put(`/ordenes/${id}`, datos);
            if (estadoNuevo) await api.patch(`/ordenes/${id}/estado`, { estado: estadoNuevo });
            toast.success('Visita actualizada', { id: t });
            setOrdenEditar(null);
            cargar();
        } catch { toast.error('No se pudo guardar', { id: t }); }
    };
    const pdf = async (s) => {
        const t = toast.loading('Generando PDF…');
        try {
            await generarRemitoPDFPremium({
                esPresupuesto: false, servicioId: s.id,
                nroDocumentoExistente: s.nroDocumento || localStorage.getItem(`pdf_nro_${s.id}`) || null,
                cliente: { nombre: s.clienteNombre, telefono: s.clienteTelefono, email: s.clienteEmail, cuilDni: s.clienteDni, condicionIva: s.clienteCondicionIva },
                sede: { nombreSede: s.sedeNombre, direccion: s.sedeDireccion },
                tecnico: s.items?.[0]?.tecnico || s.usuarioNombre || 'Técnico',
                ticketItems: (s.items || []).map(it => ({ ...it, totalCalculado: parseFloat(it.costo) || 0, trabajo: it.trabajoRealizado || '' })),
                fechaServicio: s.fecha, descuentoPorcentaje: s.descuentoPorcentaje || 0,
                leyenda: s.observaciones || '', incluirFirmas: false,
            });
            toast.success('PDF generado', { id: t });
        } catch { toast.error('No se pudo generar el PDF', { id: t }); }
    };

    const BOTON = {
        asignar:     { label: 'Asignar',          primaria: true,  run: f => setIniciar(f.servicio) },
        ejecutar:    { label: 'Agendar o cerrar', primaria: true,  run: f => setIniciar(f.servicio) },
        reprogramar: { label: 'Reprogramar',      primaria: false, run: f => setOrdenEditar(f.orden) },
        atrasada:    { label: 'Resolver',         primaria: true,  run: f => setAtrasada(f) },
        cobrar:      { label: 'Cobrar',           primaria: true,  run: f => setCobrar(f.servicio) },
        facturado:   { label: 'Ya la emití',      primaria: true,  run: f => patchServicio(f.servicio.id, 'FACTURADO', 'Marcado como facturado') },
        cobrado:     { label: 'Marcar cobrado',   primaria: true,  run: f => patchServicio(f.servicio.id, 'COBRADO', 'Cobrado') },
        cierre:      { label: 'Cierre mensual',   primaria: true,  run: f => setCierreCliente({ id: f.clienteId, nombre: f.cliente }) },
        pdf:         { label: 'Ver PDF',          primaria: false, run: f => pdf(f.servicio) },
    };
    const textoSeguimiento = (f) => {
        const n = primerNombre(f.tecnico) || 'El técnico';
        return f.etapa === 'CAMINO' ? `${n} va en camino` : `${n} está trabajando`;
    };

    const calcularTotal = (s) => totalItems(s);

    return (
        <div className="min-h-screen pb-28 md:pb-10 bg-page font-sans">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-6 space-y-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink">Trabajos</h2>
                        <p className="text-caption text-muted">Cada trabajo, de presupuesto a cobrado, en una sola lista</p>
                    </div>
                    <div className="w-full md:w-80">
                        <BusquedaBar valor={busqueda} onChange={setBusqueda} placeholder="Cliente, N/S, dirección…" />
                    </div>
                </div>

                {/* Atrasadas */}
                {atrasadas.length > 0 && etapa !== 'ASIGNADO' && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#FEF3C7] text-[#92400E] dark:bg-[#2A1A0A] dark:text-[#FBBF24] border border-[#F0A500]/40 text-caption font-bold">
                        <LuTriangleAlert size={16} className="shrink-0" />
                        <span className="flex-1">
                            {atrasadas.length} visita{atrasadas.length !== 1 ? 's' : ''} de días anteriores sigue{atrasadas.length !== 1 ? 'n' : ''} abierta{atrasadas.length !== 1 ? 's' : ''}
                        </span>
                        <button onClick={() => { setEtapa('ASIGNADO'); setTec(''); }} className="font-black underline">Ver</button>
                    </div>
                )}

                {/* Etapas */}
                <div className="flex md:grid md:grid-cols-7 gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
                    {ETAPAS.map(e => {
                        const activo = etapa === e.id;
                        return (
                            <button key={e.id} onClick={() => elegirEtapa(e.id)} aria-pressed={activo}
                                className={`shrink-0 min-w-[112px] md:min-w-0 text-left px-3.5 py-3 rounded-2xl border-2 transition-all active:scale-95 ${activo ? 'bg-card' : 'bg-panel border-transparent'}`}
                                style={activo ? { borderColor: e.color } : undefined}>
                                <span className="flex items-center gap-1.5 text-label font-bold uppercase tracking-wide text-muted">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />{e.label}
                                </span>
                                <span className="block mt-1.5 text-2xl font-black text-ink leading-none">{cargando ? '·' : conteo[e.id]}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Técnico + total */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 items-center">
                        <span className="text-label font-bold text-muted shrink-0 pr-1">Técnico</span>
                        {chips.map(c => {
                            const activo = tec === c.id;
                            return (
                                <button key={c.id || 'todos'} onClick={() => setTec(c.id)} aria-pressed={activo}
                                    className={`h-10 px-3.5 rounded-full shrink-0 inline-flex items-center gap-2 text-label font-bold border transition-all active:scale-95 ${activo ? 'border-brand-red text-ink bg-[rgba(232,66,47,0.10)]' : 'border-black/10 dark:border-white/10 text-secondary'}`}>
                                    {c.color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />}
                                    {c.label}<span className="text-muted">{c.count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-baseline gap-2 text-caption text-muted shrink-0">
                        <span>{tituloTotal}</span>
                        <M valor={totalVisible} className="text-body-lg font-black text-ink" />
                        <span>· {visibles.length} trabajo{visibles.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Lista */}
                {cargando ? (
                    <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />)}</div>
                ) : visibles.length === 0 ? (
                    <div className="py-14 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 text-body text-muted">
                        No hay trabajos {etapa ? `en "${ETAPA[etapa].label}"` : 'en curso'}{tec ? ' con este técnico' : ''}{q ? ' para esa búsqueda' : ''}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="hidden md:grid grid-cols-[140px_minmax(0,1fr)_140px_110px_120px_160px] gap-4 px-4 text-label font-bold uppercase tracking-wider text-muted">
                            <span>Etapa</span><span>Cliente</span><span>Técnico</span><span>Fecha</span><span className="text-right">Monto</span><span className="text-right">Próximo paso</span>
                        </div>
                        {visibles.map(f => {
                            const e = ETAPA[f.etapa];
                            const b = BOTON[f.accion];
                            const tecTxt = f.tecnicoTexto || (f.tecnico ? primerNombre(f.tecnico) : 'Sin técnico');
                            const tecColor = f.tecnico ? colorTecnico(f.tecnico) : '#78716C';
                            const abrir = () => { if (f.servicio) setDetalle(f.servicio); };
                            return (
                                <div key={f.key} className="rounded-2xl bg-card border border-black/10 dark:border-white/[0.08] p-3.5 md:px-4 md:py-3 grid grid-cols-1 md:grid-cols-[140px_minmax(0,1fr)_140px_110px_120px_160px] gap-2 md:gap-4 md:items-center">
                                    <span className="flex items-center gap-2 text-label font-black uppercase tracking-wide" style={{ color: e.color }}>
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />{e.label}
                                        {f.esVenta && <span className="ml-1 px-1.5 py-0.5 rounded bg-chip text-muted normal-case tracking-normal">Venta</span>}
                                    </span>
                                    <button type="button" onClick={abrir} disabled={!f.servicio}
                                        className="min-w-0 text-left disabled:cursor-default">
                                        <span className="block font-bold text-body text-ink truncate">{f.cliente}</span>
                                        <span className="block text-caption text-muted truncate">{f.detalle || '—'}</span>
                                    </button>
                                    <span className="flex items-center gap-2 text-caption text-secondary">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tecColor }} />{tecTxt}
                                    </span>
                                    <span className="flex md:flex-col gap-2 md:gap-0.5 text-caption">
                                        <span className="text-ink">{f.fecha || '—'}</span>
                                        {f.nota && <span className={f.alerta ? 'font-bold text-[#B45309] dark:text-[#FBBF24]' : 'text-muted'}>{f.nota}</span>}
                                    </span>
                                    <span className="md:text-right font-black text-body text-ink">
                                        {f.monto == null ? <span className="text-muted font-bold text-caption">Cierre mensual</span>
                                            : f.monto > 0 ? <M valor={f.monto} className="font-black" /> : <span className="text-muted">—</span>}
                                    </span>
                                    <div className="flex md:justify-end">
                                        {f.accion === 'seguimiento' ? (
                                            <span className="text-caption text-muted md:text-right">{textoSeguimiento(f)}</span>
                                        ) : b && (
                                            <button type="button" onClick={() => b.run(f)}
                                                className={`w-full md:w-auto h-11 md:h-10 px-4 rounded-xl text-label font-black active:scale-95 transition-all ${b.primaria ? 'bg-[#C9341F] text-white' : 'bg-chip text-ink border border-black/10 dark:border-white/10'}`}>
                                                {b.label}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Modales ── */}
            {iniciar && (
                <IniciarTrabajoSheet servicio={iniciar}
                    onYoAhora={() => { setEjecutar(iniciar); setIniciar(null); }}
                    onAsignar={() => { setDespachar(iniciar); setIniciar(null); }}
                    onCerrar={() => setIniciar(null)} />
            )}
            {despachar && (
                <ModalDespacharPresupuesto presupuesto={despachar} calcularTotal={calcularTotal}
                    onCerrar={() => { setDespachar(null); cargar(); }}
                    onDespachado={() => cargar()} />
            )}
            {ejecutar && (
                <EjecutarAdminSheet servicio={ejecutar} calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        await patchServicio(ejecutar.id, estadoDestino, 'Trabajo cerrado', extras || {});
                        setEjecutar(null);
                    }}
                    onCerrar={() => setEjecutar(null)} />
            )}
            {cobrar && (
                <CobroSheet servicio={cobrar} calcularTotal={calcularTotal}
                    onConfirmar={async (estadoDestino, extras) => {
                        await patchServicio(cobrar.id, estadoDestino, estadoDestino === 'COBRADO' ? 'Cobrado' : 'Listo para facturar', extras || {});
                        setCobrar(null);
                    }}
                    onCerrar={() => setCobrar(null)} />
            )}
            {detalle && <DetalleSheet servicio={detalle} onCerrar={() => setDetalle(null)} />}
            {cierreCliente && <CierreMensualModal cliente={cierreCliente} onClose={() => { setCierreCliente(null); cargar(); }} />}

            {ordenEditar && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-card rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-body-lg font-black text-ink mb-5">Reprogramar visita</h2>
                        <OrdenForm orden={ordenEditar} tecnicos={tecnicos}
                            onGuardar={(form) => guardarOrden(ordenEditar.id, form)}
                            onCancelar={() => setOrdenEditar(null)} />
                    </div>
                </div>
            )}

            {atrasada && (
                <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/60" onClick={() => setAtrasada(null)}>
                    <div className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 bg-card space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-label font-black text-muted uppercase tracking-widest">Visita atrasada</p>
                                <p className="text-body-lg font-black text-ink">{atrasada.cliente}</p>
                                <p className="text-caption text-muted flex items-center gap-1"><LuMapPin size={12} />{atrasada.fecha} · {primerNombre(atrasada.tecnico) || 'sin técnico'} · {atrasada.nota}</p>
                            </div>
                            <button onClick={() => setAtrasada(null)} aria-label="Cerrar" className="w-9 h-9 rounded-xl flex items-center justify-center bg-chip text-muted"><LuX size={16} /></button>
                        </div>
                        <button onClick={() => { setOrdenEditar(atrasada.orden); setAtrasada(null); }}
                            className="w-full h-12 rounded-xl font-black text-label uppercase bg-[#C9341F] text-white active:scale-95">Reprogramar para otro día</button>
                        <button onClick={() => patchOrden(atrasada.orden.id, 'COMPLETADA', 'Visita marcada como hecha')}
                            className="w-full h-12 rounded-xl font-bold text-label bg-chip text-ink active:scale-95">Ya se hizo (marcar completada)</button>
                        <button onClick={() => patchOrden(atrasada.orden.id, 'CANCELADA', 'Visita cancelada')}
                            className="w-full h-12 rounded-xl font-bold text-label text-muted border border-black/10 dark:border-white/10 active:scale-95">Cancelar visita</button>
                    </div>
                </div>
            )}
        </div>
    );
}
