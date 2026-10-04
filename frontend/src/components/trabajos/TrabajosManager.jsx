import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuTriangleAlert, LuX, LuMapPin, LuPlus, LuRoute, LuDownload, LuArchive, LuList, LuUsers } from 'react-icons/lu';
import api from '../../services/api';
import BusquedaBar from '../ui/BusquedaBar';
import { M } from '../servicio/ServicioUI';
import { colorTecnico, ETAPAS } from '../../utils/estados';
import { coincideTodo } from '../../utils/busqueda';
import { getTodayISO } from '../../utils/dateUtils';
import { generarRemitoPDFPremium } from '../../utils/generadorPdfRemito';
import IniciarTrabajoSheet from '../presupuesto/IniciarTrabajoSheet';
import ModalDespacharPresupuesto from '../presupuesto/ModalDespacharPresupuesto';
import EjecutarAdminSheet from '../servicio/EjecutarAdminSheet';
import CobroSheet from '../servicio/CobroSheet';
import DetalleSheet from '../servicio/DetalleSheet';
import OrdenForm from '../ordenes/OrdenForm';
import VisitaForm from '../ordenes/VisitaForm';
import ReprogramarSheet from '../ordenes/ReprogramarSheet';
import ModalShell from '../ui/ModalShell';
import CierreMensualModal from '../cliente/CierreMensualModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { exportarServiciosCSV } from '../../utils/exportarCSV';
import { buildGoogleMapsRouteUrl } from '../../utils/clienteUtils';
import TrabajoFila, { ENCABEZADO_GRID } from './TrabajoFila';
import TrabajoEditorModal from './TrabajoEditorModal';
import { NuevoSheet, TrabajoMenu } from './TrabajoMenus';
import AvatarTecnico from '../ui/AvatarTecnico';

// ─────────────────────────────────────────────────────────────────────────────
// Trabajos (2-oct-2026) — una sola pantalla para todo el recorrido de un trabajo:
// Presupuesto → Asignado → En camino → En el lugar → Hecho → Facturado → Cobrado.
// Antes el mismo trabajo vivía en 3 lugares (Presupuestos, Despacho y las pestañas
// de cobro de Servicio Técnico), cada uno con sus nombres de estado. Acá no cambia
// ningún dato: se juntan /servicios y /ordenes y cada trabajo cae en UNA etapa.
// Cada fila tiene un solo botón: el próximo paso que le toca al admin.
// ─────────────────────────────────────────────────────────────────────────────

// Opción A: los 7 pasos se agrupan en 3 preguntas (+ cobrados aparte)
const GRUPOS = [
    { id: 'hacer',   label: 'Por hacer',  etapas: ['PRESUPUESTO', 'ASIGNADO'], color: 'var(--etapa-hacer)' },
    { id: 'marcha',  label: 'En marcha',  etapas: ['CAMINO', 'LUGAR'],         color: 'var(--etapa-marcha)' },
    { id: 'cobrar',  label: 'Por cobrar', etapas: ['HECHO', 'FACTURADO'],      color: 'var(--etapa-cobrar)' },
    { id: 'cobrado', label: 'Cobrados',   etapas: ['COBRADO'],                 color: 'var(--etapa-listo)' },
];
const ETAPA = { ...Object.fromEntries(ETAPAS.map(e => [e.id, e])), ARCHIVADO: { id: 'ARCHIVADO', label: 'Archivado', familia: 'hacer', nivel: 1, color: 'var(--etapa-hacer)', tx: 'var(--etapa-hacer-tx)', bg: 'var(--etapa-hacer-bg)', sobre: '#fff' } };
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

// Desde cuándo se traen los cobrados (el resto de las etapas siempre viene completo)
const PERIODOS = [
    { id: 'mes',  label: 'Este mes' },
    { id: 'prev', label: 'Desde el mes pasado' },
    { id: '3m',   label: 'Últimos 3 meses' },
    { id: 'anio', label: 'Este año' },
];
const desdePeriodo = (p) => {
    const h = new Date();
    const d = p === 'prev' ? new Date(h.getFullYear(), h.getMonth() - 1, 1)
        : p === '3m' ? new Date(h.getFullYear(), h.getMonth() - 2, 1)
        : p === 'anio' ? new Date(h.getFullYear(), 0, 1)
        : new Date(h.getFullYear(), h.getMonth(), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function TrabajosManager({ nuevoInicial = null, clienteInicial = null, onInicialConsumido }) {
    const [servicios, setServicios] = useState([]);
    const [ordenes, setOrdenes]     = useState([]);
    const [tecnicos, setTecnicos]   = useState([]);
    const [cargando, setCargando]   = useState(true);

    const [grupo, setGrupo]   = useState('hacer'); // Por hacer · En marcha · Por cobrar · (Cobrados)
    const [etapa, setEtapa]   = useState(null);    // sub-filtro dentro del grupo
    const [tec, setTec]       = useState('');      // '' todos · '__SIN__' · nombre
    const [busqueda, setBusqueda] = useState('');

    // Modales (se reusan los mismos de las pantallas viejas)
    const [iniciar, setIniciar]       = useState(null);
    const [despachar, setDespachar]   = useState(null);
    const [ejecutar, setEjecutar]     = useState(null);
    const [cobrar, setCobrar]         = useState(null);
    const [detalle, setDetalle]       = useState(null);
    const [ordenEditar, setOrdenEditar] = useState(null);
    const [reprogramar, setReprogramar] = useState(null);
    const [atrasada, setAtrasada]     = useState(null);
    const [cierreCliente, setCierreCliente] = useState(null);

    // Lo que antes vivía en Servicio Técnico y Presupuestos
    const [nuevoAbierto, setNuevoAbierto] = useState(false);
    const [editor, setEditor]         = useState(null);   // { modo, servicio, clienteId }
    const [nuevaVisita, setNuevaVisita] = useState(false);
    const [menuFila, setMenuFila]     = useState(null);
    const [confirmar, setConfirmar]   = useState(null);   // { tipo: 'archivar'|'eliminar', servicio }
    const [vista, setVista]           = useState('lista'); // 'lista' | 'tecnico'
    const [seleccionando, setSeleccionando] = useState(false);
    const [seleccion, setSeleccion]   = useState(() => new Set());
    const [verArchivados, setVerArchivados] = useState(false);
    const [archivados, setArchivados] = useState([]);
    const [periodo, setPeriodo]       = useState('mes');

    // Entrar con algo para crear (desde el Panel o desde Clientes)
    useEffect(() => {
        if (!nuevoInicial) return;
        setEditor({ modo: nuevoInicial, servicio: null, clienteId: clienteInicial?.id || null });
        onInicialConsumido && onInicialConsumido();
    }, [nuevoInicial, clienteInicial, onInicialConsumido]);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const inicioMes = desdePeriodo(periodo);
            const enUnAno = new Date(); enUnAno.setFullYear(enUnAno.getFullYear() + 1);
            const [abiertos, cobrados, ords] = await Promise.all([
                api.get('/servicios', { params: { estado: 'PRESUPUESTO,APROBADO,EN_PROGRESO,COMPLETADO,PENDIENTE_FACTURACION,FACTURADO', page: 0, size: 500, sort: 'fechaServicio,desc' } }),
                api.get('/servicios', { params: { estado: 'COBRADO,REALIZADO', desde: inicioMes, page: 0, size: 300, sort: 'fechaServicio,desc' } }),
                api.get('/ordenes', { params: { desde: '2020-01-01', hasta: enUnAno.toISOString().slice(0, 10) } }),
            ]);
            const lista = (r) => r.data?.content || (Array.isArray(r.data) ? r.data : []);
            setServicios([...lista(abiertos), ...lista(cobrados)]);
            setOrdenes(Array.isArray(ords.data) ? ords.data : []);
            if (verArchivados) {
                const ar = await api.get('/servicios', { params: { estado: 'ARCHIVADO', page: 0, size: 300, sort: 'fechaServicio,desc' } });
                setArchivados(lista(ar));
            }
        } catch {
            toast.error('No se pudieron cargar los trabajos');
        } finally {
            setCargando(false);
        }
    }, [periodo, verArchivados]);

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
                        nota: atr ? `Atrasada ${diasDesde(ord.fechaProgramada)} días` : (et === 'CAMINO' ? 'Salió' : et === 'LUGAR' ? 'Trabajando' : et === 'ASIGNADO' ? (ord.confirmadaEn ? '✓ Confirmó' : 'Sin confirmar') : ''),
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
            // Las ventas no van a un técnico (4-oct-2026): en vez de "Asignar",
            // el paso que corresponde es confirmar la venta (queda cobrada).
            if (fila && fila.esVenta && fila.accion === 'asignar') fila = { ...fila, accion: 'venta', nota: fila.nota || 'Venta sin confirmar' };
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
                    nota: atr ? `Atrasada ${diasDesde(o.fechaProgramada)} días` : [o.equiposSerie ? `${o.equiposSerie.split(',').filter(Boolean).length} equipos · cierre mensual` : 'Visita sin presupuesto', et === 'ASIGNADO' ? (o.confirmadaEn ? '✓ Confirmó' : 'Sin confirmar') : null].filter(Boolean).join(' · '),
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
    // Multi-palabra y sin acentos ("guemes" encuentra "Güemes"), igual en toda la app
    const pasaBusqueda = (f) => !q || coincideTodo(`${f.busca || ''} ${f.cliente || ''} ${f.detalle || ''}`, q);
    const pasaTec = (f) => !tec || (tec === '__SIN__' ? !f.tecnico : f.tecnico === tec);
    // Mientras se busca, se busca en TODOS los grupos (antes buscaba solo en el grupo
    // abierto y parecía que no encontraba nada)
    const enEtapa = (f) => (q ? true : (GRUPOS.find(g => g.id === grupo)?.etapas || []).includes(f.etapa) && (!etapa || f.etapa === etapa));

    // Archivados: lista aparte, fuera del recorrido (se ven solo con "Ver archivados")
    const filasArchivadas = useMemo(() => archivados.map(s => ({
        key: `a${s.id}`, servicio: s, orden: null, etapa: 'ARCHIVADO',
        cliente: s.clienteNombre || `#${s.id}`,
        detalle: [s.sedeNombre, s.sedeDireccion].filter(Boolean).join(' · '),
        busca: [s.clienteNombre, s.sedeNombre, s.sedeDireccion, s.usuarioNombre].filter(Boolean).join(' ').toLowerCase(),
        tecnico: s.usuarioNombre || '', fecha: fechaCorta(s.fecha),
        monto: Number(s.montoFinal) > 0 ? Number(s.montoFinal) : totalItems(s), esVenta: s.servicioTipo === 'VENTA',
        accion: null,
    })), [archivados]);

    const base = verArchivados
        ? filasArchivadas.filter(pasaBusqueda)
        : filas.filter(f => pasaBusqueda(f) && enEtapa(f));
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
    const tituloTotal = q ? 'Encontrados' : { HECHO: 'Para cobrar', FACTURADO: 'Para cobrar', COBRADO: `Cobrado · ${(PERIODOS.find(p => p.id === periodo)?.label || '').toLowerCase()}`, PRESUPUESTO: 'Presupuestado' }[etapa] || { hacer: 'Por hacer', marcha: 'En marcha', cobrar: 'Para cobrar', cobrado: `Cobrado · ${(PERIODOS.find(p => p.id === periodo)?.label || '').toLowerCase()}` }[grupo];

    const elegirGrupo = (id) => { setGrupo(id); setEtapa(null); setTec(''); };

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
        venta:       { label: 'Confirmar venta',  primaria: true,  run: f => patchServicio(f.servicio.id, 'REALIZADO', 'Venta confirmada') },
        ejecutar:    { label: 'Agendar o cerrar', primaria: true,  run: f => setIniciar(f.servicio) },
        reprogramar: { label: 'Reprogramar',      primaria: false, run: f => setReprogramar(f.orden) },
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

    // ⋯ de cada fila
    const duplicar = (s) => setEditor({ modo: 'duplicar', servicio: {
        ...s, id: undefined, estado: 'PRESUPUESTO', nroDocumento: undefined,
        fecha: getTodayISO(), presupuestoOrigenId: undefined, ordenId: undefined,
    } });
    const cambiarEspera = async (s, enEspera) => {
        const t = toast.loading('Guardando…');
        try {
            await api.patch(`/servicios/${s.id}/espera`, { enEspera });
            toast.success(enEspera ? 'Quedó en espera' : 'Retomado: vuelve a Presupuesto', { id: t });
            cargar();
        } catch { toast.error('No se pudo actualizar', { id: t }); }
    };
    const eliminar = async (s) => {
        const t = toast.loading('Eliminando…');
        try {
            await api.delete(`/servicios/${s.id}`);
            toast.success('Eliminado', { id: t });
            cargar();
        } catch { toast.error('No se pudo eliminar', { id: t }); }
    };
    const accionesMenu = {
        detalle: (s) => setDetalle(s),
        editar: (s) => setEditor({ modo: 'editar', servicio: s }),
        duplicar,
        pdf,
        espera: cambiarEspera,
        archivar: (s) => setConfirmar({ tipo: 'archivar', servicio: s }),
        recuperar: (s) => patchServicio(s.id, 'PRESUPUESTO', 'Recuperado como presupuesto'),
        eliminar: (s) => setConfirmar({ tipo: 'eliminar', servicio: s }),
        editarOrden: (o) => setOrdenEditar(o),
        cancelarOrden: (o) => setConfirmar({ tipo: 'cancelarVisita', orden: o }),
        eliminarOrden: (o) => setConfirmar({ tipo: 'eliminarVisita', orden: o }),
    };
    // Visitas sin presupuesto: cancelar (queda en el historial) o eliminar del todo
    const accionVisita = async (tipo, o) => {
        const t = toast.loading(tipo === 'eliminarVisita' ? 'Eliminando…' : 'Cancelando…');
        try {
            if (tipo === 'eliminarVisita') await api.delete(`/ordenes/${o.id}`);
            else await api.patch(`/ordenes/${o.id}/estado`, { estado: 'CANCELADA' });
            toast.success(tipo === 'eliminarVisita' ? 'Visita eliminada' : 'Visita cancelada', { id: t });
            cargar();
        } catch (e) { toast.error(e?.response?.data?.mensaje || 'No se pudo', { id: t }); }
    };

    const elegirNuevo = (q) => {
        if (q === 'visita') setNuevaVisita(true);
        else setEditor({ modo: q, servicio: null });
    };
    // Selección para armar la ruta del día
    const toggleSel = (key) => setSeleccion(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    const salirSeleccion = () => { setSeleccionando(false); setSeleccion(new Set()); };
    const abrirRuta = () => {
        const dirs = visibles.filter(f => seleccion.has(f.key))
            .map(f => f.servicio?.sedeDireccion || f.orden?.direccion).filter(Boolean);
        const url = buildGoogleMapsRouteUrl(dirs);
        if (!url) { toast.error('Ninguno de los elegidos tiene dirección cargada'); return; }
        window.open(url, '_blank');
    };
    const exportar = () => {
        const ss = visibles.map(f => f.servicio).filter(Boolean);
        if (!ss.length) { toast.error('No hay trabajos para exportar'); return; }
        exportarServiciosCSV(ss);
    };

    // Vista "Por técnico": un bloque por persona, sin asignar al final
    const grupos = useMemo(() => {
        if (vista !== 'tecnico') return null;
        const m = new Map();
        visibles.forEach(f => {
            const k = f.tecnico || '';
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(f);
        });
        return [...m.entries()].sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1) || a[0].localeCompare(b[0]));
    }, [vista, visibles]);

    return (
        <div className="min-h-screen pb-28 md:pb-10 bg-page font-sans">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-3 md:space-y-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink">Trabajos</h2>
                        <p className="hidden md:block text-caption text-muted">Cada trabajo, de presupuesto a cobrado, en una sola lista</p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex-1 md:w-80">
                            <BusquedaBar valor={busqueda} onChange={setBusqueda} placeholder="Cliente, N/S, dirección…" />
                        </div>
                        <button type="button" onClick={() => setNuevoAbierto(true)}
                            className="hidden md:inline-flex h-11 px-4 rounded-xl items-center gap-1.5 bg-[#C9341F] text-white text-label font-black active:scale-95">
                            <LuPlus size={16} /> Nuevo
                        </button>
                    </div>
                </div>

                {/* Atrasadas */}
                {atrasadas.length > 0 && !(grupo === 'hacer' && etapa === 'ASIGNADO') && !verArchivados && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[color:var(--alerta-bg)] text-[color:var(--alerta-tx)] border border-[color:var(--alerta)]/30 text-caption font-bold">
                        <LuTriangleAlert size={16} className="shrink-0" />
                        <span className="flex-1">
                            {atrasadas.length} visita{atrasadas.length !== 1 ? 's' : ''} de días anteriores sigue{atrasadas.length !== 1 ? 'n' : ''} abierta{atrasadas.length !== 1 ? 's' : ''}
                        </span>
                        <button onClick={() => { setGrupo('hacer'); setEtapa('ASIGNADO'); setTec(''); }} className="font-black underline">Ver</button>
                    </div>
                )}

                {/* Grupos (opción A, 3-oct-2026): 3 preguntas del día en vez de 7 etapas.
                    Debajo, el detalle de las etapas del grupo (tocables para filtrar). */}
                {!verArchivados && q && (
                    <p className="px-1 text-caption text-muted">Buscando «{busqueda.trim()}» en todos los trabajos (también cobrados)</p>
                )}
                {!verArchivados && !q && (
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-chip">
                            {GRUPOS.filter(g => g.id !== 'cobrado').map(g => {
                                const activo = grupo === g.id;
                                const n = filas.filter(f => g.etapas.includes(f.etapa) && pasaBusqueda(f) && pasaTec(f)).length;
                                return (
                                    <button key={g.id} type="button" onClick={() => elegirGrupo(g.id)} aria-pressed={activo}
                                        className={`h-12 md:h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${activo ? 'bg-card shadow-sm' : ''}`}>
                                        <span className={`text-body font-black ${activo ? 'text-ink' : 'text-secondary'}`}>{g.label} <span className="opacity-70">{cargando ? '·' : n}</span></span>
                                        <span className="w-5 h-[3px] rounded-full" style={{ background: g.color }} />
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between gap-2 px-1 text-caption text-muted">
                            <span className="flex items-center gap-3 min-w-0 overflow-x-auto [scrollbar-width:none]">
                                {(GRUPOS.find(g => g.id === grupo)?.etapas || []).map(id => (
                                    <button key={id} type="button" onClick={() => setEtapa(e => (e === id ? null : id))}
                                        className={`shrink-0 inline-flex items-center gap-1.5 ${etapa === id ? 'text-ink font-black underline' : ''}`}>
                                        <span className="w-2 h-2 rounded-full" style={{ background: ETAPA[id].color }} />{ETAPA[id].label} {conteo[id]}
                                    </button>
                                ))}
                            </span>
                            <button type="button" onClick={() => elegirGrupo(grupo === 'cobrado' ? 'hacer' : 'cobrado')} className="shrink-0 font-bold underline">
                                {grupo === 'cobrado' ? 'Volver' : 'Cobrados'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Herramientas: vista, ruta, exportar, archivados */}
                <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex shrink-0 rounded-xl bg-panel p-1">
                        {[['lista', 'Lista', LuList], ['tecnico', 'Por técnico', LuUsers]].map(([id, label, Ic]) => (
                            <button key={id} type="button" onClick={() => setVista(id)} aria-pressed={vista === id}
                                className={`h-8 md:h-9 px-2.5 md:px-3 rounded-lg inline-flex items-center gap-1.5 text-label font-bold ${vista === id ? 'bg-card text-ink shadow-sm' : 'text-muted'}`}>
                                <Ic size={14} /><span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => (seleccionando ? salirSeleccion() : setSeleccionando(true))}
                        className={`h-9 md:h-10 px-2.5 md:px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 text-label font-bold border ${seleccionando ? 'border-brand-red text-ink' : 'border-black/10 dark:border-white/10 text-secondary'}`}>
                        <LuRoute size={14} />{seleccionando ? 'Cancelar' : <><span className="sm:hidden">Ruta</span><span className="hidden sm:inline">Armar ruta</span></>}
                    </button>
                    <button type="button" onClick={exportar}
                        className="h-9 md:h-10 px-2.5 md:px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 text-label font-bold border border-black/10 dark:border-white/10 text-secondary">
                        <LuDownload size={14} /><span className="hidden sm:inline">Exportar</span>
                    </button>
                    <button type="button" onClick={() => { setVerArchivados(v => !v); setEtapa(null); setTec(''); }}
                        className={`h-9 md:h-10 px-2.5 md:px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 text-label font-bold border ${verArchivados ? 'border-brand-red text-ink' : 'border-black/10 dark:border-white/10 text-secondary'}`}>
                        <LuArchive size={14} /><span className={verArchivados ? '' : 'hidden sm:inline'}>{verArchivados ? 'Volver' : 'Archivados'}</span>
                    </button>
                    {grupo === 'cobrado' && !verArchivados && (
                        <select value={periodo} onChange={e => setPeriodo(e.target.value)} aria-label="Período de cobrados"
                            className="h-10 px-3 shrink-0 rounded-xl text-label font-bold bg-panel text-ink border border-black/10 dark:border-white/10">
                            {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    )}
                </div>

                {seleccionando && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-panel text-caption">
                        <span className="flex-1 text-secondary">Tocá los trabajos que querés visitar · {seleccion.size} elegido{seleccion.size !== 1 ? 's' : ''}</span>
                        <button type="button" disabled={!seleccion.size} onClick={abrirRuta}
                            className="h-10 px-4 rounded-xl bg-[#C9341F] text-white font-black disabled:opacity-40">Ver ruta</button>
                    </div>
                )}

                {/* Técnico + total */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                    <div className="flex gap-1.5 md:gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 items-center">
                        <span className="hidden md:inline text-label font-bold text-muted shrink-0 pr-1">Técnico</span>
                        {chips.map(c => {
                            const activo = tec === c.id;
                            return (
                                <button key={c.id || 'todos'} onClick={() => setTec(c.id)} aria-pressed={activo}
                                    className={`h-8 md:h-10 px-3 md:px-3.5 rounded-full shrink-0 inline-flex items-center gap-2 text-label font-bold border transition-all active:scale-95 ${activo ? 'border-brand-red text-ink bg-[rgba(232,66,47,0.10)]' : 'border-black/10 dark:border-white/10 text-secondary'}`}>
                                    {c.id && c.id !== '__SIN__' && <AvatarTecnico nombre={c.id} size={20} />}
                                    {c.label}<span className="text-muted">{c.count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-baseline gap-2 text-caption text-muted shrink-0">
                        <span>{verArchivados ? 'Archivados' : tituloTotal}</span>
                        <M valor={totalVisible} className="text-body-lg font-black text-ink" />
                        <span>· {visibles.length} trabajo{visibles.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Lista */}
                {cargando ? (
                    <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />)}</div>
                ) : visibles.length === 0 ? (
                    <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 space-y-4">
                        <p className="text-body text-muted">
                            {verArchivados ? 'No hay trabajos archivados' : `No hay trabajos ${etapa ? `en "${ETAPA[etapa].label}"` : `en "${GRUPOS.find(g => g.id === grupo)?.label}"`}`}{tec ? ' con este técnico' : ''}{q ? ' para esa búsqueda' : ''}
                        </p>
                        {!verArchivados && (
                            <button type="button" onClick={() => setNuevoAbierto(true)}
                                className="h-11 px-5 rounded-xl inline-flex items-center gap-1.5 bg-[#C9341F] text-white text-label font-black active:scale-95">
                                <LuPlus size={16} /> Cargar un trabajo
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className={`hidden md:grid ${ENCABEZADO_GRID} gap-4 px-4 text-label font-bold uppercase tracking-wider text-muted`}>
                            <span>Etapa</span><span>Cliente</span><span>Técnico</span><span>Fecha</span><span className="text-right">Monto</span><span className="text-right">Próximo paso</span><span />
                        </div>
                        {(grupos || [[null, visibles]]).map(([nombre, items]) => (
                            <div key={nombre ?? '__todos'} className="space-y-2">
                                {grupos && (
                                    <p className="flex items-center gap-2 pt-3 px-1 text-label font-black uppercase tracking-widest text-secondary">
                                        <AvatarTecnico nombre={nombre} size={22} />
                                        {nombre || 'Sin técnico'} <span className="text-muted">{items.length}</span>
                                    </p>
                                )}
                                {items.map(f => (
                                    <TrabajoFila key={f.key} f={f} etapa={ETAPA[f.etapa]} boton={BOTON[f.accion]}
                                        textoSeguimiento={textoSeguimiento}
                                        onAbrir={() => f.servicio && setDetalle(f.servicio)}
                                        onMenu={() => setMenuFila(f)}
                                        seleccionando={seleccionando} seleccionado={seleccion.has(f.key)}
                                        onToggle={() => toggleSel(f.key)} />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB "+" (celular) — mismo lugar en Trabajos, Venta, Clientes y Productos */}
            {!seleccionando && (
                <button type="button" onClick={() => setNuevoAbierto(true)} aria-label="Nuevo trabajo"
                    className="md:hidden fixed right-4 bottom-24 z-40 w-14 h-14 rounded-2xl bg-[#C9341F] text-white shadow-xl flex items-center justify-center active:scale-90">
                    <LuPlus size={26} />
                </button>
            )}

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
            <NuevoSheet open={nuevoAbierto} onClose={() => setNuevoAbierto(false)} onElegir={elegirNuevo} />
            <TrabajoMenu fila={menuFila} onClose={() => setMenuFila(null)} on={accionesMenu} />
            {editor && (
                <TrabajoEditorModal modo={editor.modo} servicio={editor.servicio} clienteInicialId={editor.clienteId}
                    onCerrar={() => setEditor(null)} onGuardado={cargar} />
            )}
            {nuevaVisita && <VisitaForm tecnicos={tecnicos} onGuardado={() => { setNuevaVisita(false); cargar(); }} onCancelar={() => setNuevaVisita(false)} />}
            {confirmar && (
                <ConfirmDialog
                    titulo={{ eliminar: 'Eliminar trabajo', archivar: 'Archivar trabajo', cancelarVisita: 'Cancelar visita', eliminarVisita: 'Eliminar visita' }[confirmar.tipo]}
                    mensaje={{
                        eliminar: 'No se puede deshacer: se borra el trabajo con sus ítems y repuestos.',
                        archivar: 'Sale de la lista. Lo podés recuperar desde Archivados.',
                        cancelarVisita: `${confirmar.orden?.clienteNombre || 'La visita'} sale de la agenda del técnico. Queda en el historial como cancelada.`,
                        eliminarVisita: `Se borra la visita de ${confirmar.orden?.clienteNombre || 'este cliente'} del todo. No se puede deshacer.`,
                    }[confirmar.tipo]}
                    textoConfirmar={{ eliminar: 'Sí, eliminar', archivar: 'Sí, archivar', cancelarVisita: 'Sí, cancelar', eliminarVisita: 'Sí, eliminar' }[confirmar.tipo]}
                    onCancelar={() => setConfirmar(null)}
                    onConfirmar={() => {
                        const { tipo, servicio, orden } = confirmar;
                        setConfirmar(null);
                        if (tipo === 'cancelarVisita' || tipo === 'eliminarVisita') accionVisita(tipo, orden);
                        else if (tipo === 'eliminar') eliminar(servicio);
                        else patchServicio(servicio.id, 'ARCHIVADO', 'Archivado');
                    }} />
            )}
            {detalle && <DetalleSheet servicio={detalle} onCerrar={() => setDetalle(null)} />}
            {cierreCliente && <CierreMensualModal cliente={cierreCliente} onClose={() => { setCierreCliente(null); cargar(); }} />}

            {reprogramar && (
                <ReprogramarSheet orden={reprogramar} tecnicos={tecnicos}
                    onCerrar={() => setReprogramar(null)}
                    onGuardado={() => { setReprogramar(null); cargar(); }}
                    onEditarTodo={() => { setOrdenEditar(reprogramar); setReprogramar(null); }} />
            )}
            {ordenEditar && (
                <ModalShell titulo="Editar visita" subtitulo={ordenEditar.clienteNombre || ordenEditar.titulo} onCerrar={() => setOrdenEditar(null)}
                    pie={(
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setOrdenEditar(null)} className="h-12 rounded-xl font-bold text-body bg-chip text-secondary active:scale-95">Cancelar</button>
                            <button type="submit" form="form-editar-visita" className="h-12 rounded-xl font-black text-body bg-brand-red text-white active:scale-95">Guardar cambios</button>
                        </div>
                    )}>
                    <OrdenForm orden={ordenEditar} tecnicos={tecnicos} formId="form-editar-visita"
                        onReprogramar={() => { setReprogramar(ordenEditar); setOrdenEditar(null); }}
                        onGuardar={(form) => guardarOrden(ordenEditar.id, form)}
                        onCancelar={() => setOrdenEditar(null)} />
                </ModalShell>
            )}

            {atrasada && (
                <div className="fixed inset-0 z-[3000] flex items-end md:items-center md:justify-center bg-black/60 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6" onClick={() => setAtrasada(null)}>
                    <div className="w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 bg-card space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-label font-black text-muted uppercase tracking-widest">Visita atrasada</p>
                                <p className="text-body-lg font-black text-ink">{atrasada.cliente}</p>
                                <p className="text-caption text-muted flex items-center gap-1"><LuMapPin size={12} />{atrasada.fecha} · {primerNombre(atrasada.tecnico) || 'sin técnico'} · {atrasada.nota}</p>
                            </div>
                            <button onClick={() => setAtrasada(null)} aria-label="Cerrar" className="w-9 h-9 rounded-xl flex items-center justify-center bg-chip text-muted"><LuX size={16} /></button>
                        </div>
                        <button onClick={() => { setReprogramar(atrasada.orden); setAtrasada(null); }}
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
