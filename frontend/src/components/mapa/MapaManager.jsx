import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuNavigation, LuChevronLeft, LuChevronRight, LuMapPin, LuX, LuCrosshair, LuRoute, LuLoader } from 'react-icons/lu';
import api from '../../services/api';
import { CONTENEDOR, PAGINA, PantallaHeader } from '../ui/Pantalla';
import { colorTecnico } from '../../utils/estados';
import { getTodayISO, formatDateISO } from '../../utils/dateUtils';
import MapaLeaflet, { linkGps, linkRuta } from './MapaLeaflet';
import FichaVisitaSheet from '../dashboard/FichaVisitaSheet';

// Mapa del admin (7-oct-2026): visitas de un día (color del técnico y número de
// orden), pedidos de empresas sin agendar, mantenimiento vencido (Radar) y todos
// los clientes. Tocar un punto → datos, "Ir con GPS" y la acción que corresponda.
const CAPAS = [
    { id: 'hoy', label: 'Visitas', color: '#7C4DD8' },
    { id: 'pedidos', label: 'Pedidos', color: '#C9341F' },
    { id: 'radar', label: 'Mantenimiento', color: '#D97706' },
    { id: 'clientes', label: 'Clientes', color: '#2563EB' },
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const sumarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return formatDateISO(d); };
const fmtCorta = (iso) => { if (!iso) return null; const [a, m, d] = String(iso).split('-'); return `${d}/${m}/${a.slice(2)}`; };
const hora = (h) => (h ? (String(h).includes(':') ? String(h).slice(0, 5) : String(h).toLowerCase()) : 'sin horario');

export default function MapaManager({ onCrearTrabajo, onAbrirPedido }) {
    const hoy = getTodayISO();
    const [fecha, setFecha] = useState(hoy);
    const [data, setData] = useState(null);
    const [capa, setCapa] = useState(null);
    const [tecnico, setTecnico] = useState(null);
    const [sel, setSel] = useState(null);
    const [corrigiendo, setCorrigiendo] = useState(null); // punto a ubicar a mano
    const [verSinUbicar, setVerSinUbicar] = useState(false);
    const [ficha, setFicha] = useState(null);
    const [ajustar, setAjustar] = useState(0);
    const primera = useRef(true);

    const cargar = useCallback(async () => {
        try {
            const r = await api.get('/mapa', { params: { fecha } });
            setData(r.data);
            if (primera.current) {
                primera.current = false;
                setCapa(r.data.visitas?.length ? 'hoy' : r.data.pedidos?.length ? 'pedidos' : 'clientes');
            }
            setAjustar(a => a + 1);
        } catch { toast.error('No se pudo cargar el mapa'); }
    }, [fecha]);
    useEffect(() => { cargar(); }, [cargar]);

    // Mientras haya direcciones buscándose, se refresca solo (sin mover el encuadre)
    useEffect(() => {
        if (!data?.pendientes) return;
        const id = setTimeout(async () => {
            try { const r = await api.get('/mapa', { params: { fecha } }); setData(r.data); } catch { /* */ }
        }, 8000);
        return () => clearTimeout(id);
    }, [data, fecha]);

    const items = useMemo(() => {
        if (!data || !capa) return [];
        if (capa === 'hoy') {
            // Número de orden por técnico, según la hora
            const porTec = {};
            const orden = [...data.visitas].sort((a, b) => String(a.hora || '99').localeCompare(String(b.hora || '99')));
            return orden.map(v => {
                porTec[v.tecnicoId] = (porTec[v.tecnicoId] || 0) + 1;
                return { ...v, color: colorTecnico(v.tecnico), etiqueta: String(porTec[v.tecnicoId]) };
            }).filter(v => !tecnico || v.tecnicoId === tecnico);
        }
        if (capa === 'pedidos') return data.pedidos.map(p => ({ ...p, color: p.urgente ? '#991B1B' : '#C9341F', etiqueta: p.urgente ? '!' : null }));
        if (capa === 'radar') return data.clientes.filter(c => c.radar).map(c => ({ ...c, color: '#D97706', etiqueta: c.radar.equipos > 1 ? String(c.radar.equipos) : null }));
        return data.clientes.map(c => ({ ...c, color: c.radar ? '#D97706' : '#2563EB' }));
    }, [data, capa, tecnico]);

    const ubicados = items.filter(p => p.lat != null);
    const sinUbicar = items.filter(p => p.lat == null);
    const punto = items.find(p => p.id === sel) || null;
    const conteo = (id) => !data ? 0 : id === 'hoy' ? data.visitas.length : id === 'pedidos' ? data.pedidos.length
        : id === 'radar' ? data.clientes.filter(c => c.radar).length : data.clientes.length;

    const tecnicos = useMemo(() => {
        const m = new Map();
        (data?.visitas || []).forEach(v => { if (v.tecnicoId && !m.has(v.tecnicoId)) m.set(v.tecnicoId, v.tecnico); });
        return [...m.entries()].map(([id, nombre]) => ({ id, nombre }));
    }, [data]);

    const cambiarCapa = (c) => { setCapa(c); setSel(null); setTecnico(null); setAjustar(a => a + 1); };

    const fijarUbicacion = async (latlng) => {
        if (!corrigiendo) return;
        try {
            await api.put('/mapa/ubicacion', { direccion: corrigiendo.direccion, lat: latlng.lat, lng: latlng.lng });
            toast.success('Ubicación guardada');
            const id = corrigiendo.id;
            setCorrigiendo(null);
            await cargar();
            setSel(id);
        } catch { toast.error('No se pudo guardar'); }
    };

    const abrirVisita = async (ordenId) => {
        try { const r = await api.get(`/ordenes/${ordenId}`); setFicha(r.data); } catch { toast.error('No se pudo abrir la visita'); }
    };

    const ruta = (tecId) => linkRuta(items.filter(v => v.tecnicoId === tecId));

    return (
        <div className={PAGINA}>
            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Mapa" subtitulo="Clientes, visitas y pedidos en el mapa" />

                {/* Capas */}
                <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    {CAPAS.map(c => (
                        <button key={c.id} type="button" onClick={() => cambiarCapa(c.id)} aria-pressed={capa === c.id}
                            className={`h-10 px-3.5 shrink-0 rounded-xl inline-flex items-center gap-2 text-label font-black active:scale-95 ${capa === c.id ? 'bg-ink text-page' : 'bg-chip text-secondary'}`}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                            {c.label}<span className="opacity-60">{conteo(c.id)}</span>
                        </button>
                    ))}
                </div>

                {/* Día y técnicos (solo visitas) */}
                {capa === 'hoy' && (
                    <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                        <div className="flex items-center shrink-0 rounded-xl bg-chip">
                            <button type="button" onClick={() => setFecha(f => sumarDias(f, -1))} aria-label="Día anterior" className="w-9 h-9 flex items-center justify-center text-secondary"><LuChevronLeft size={17} /></button>
                            <button type="button" onClick={() => setFecha(hoy)} className="px-1 text-label font-black text-ink capitalize whitespace-nowrap">
                                {fecha === hoy ? 'Hoy' : `${DIAS[new Date(fecha + 'T12:00:00').getDay()]} ${fmtCorta(fecha).slice(0, 5)}`}
                            </button>
                            <button type="button" onClick={() => setFecha(f => sumarDias(f, 1))} aria-label="Día siguiente" className="w-9 h-9 flex items-center justify-center text-secondary"><LuChevronRight size={17} /></button>
                        </div>
                        {tecnicos.map(t => (
                            <button key={t.id} type="button" onClick={() => { setTecnico(x => (x === t.id ? null : t.id)); setAjustar(a => a + 1); }}
                                className={`h-9 px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 text-label font-black border-2 ${tecnico === t.id ? 'bg-card' : 'bg-chip border-transparent'}`}
                                style={tecnico === t.id ? { borderColor: colorTecnico(t.nombre) } : undefined}>
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorTecnico(t.nombre) }} />{String(t.nombre || '').split(' ')[0]}
                            </button>
                        ))}
                        {tecnico && ruta(tecnico) && (
                            <a href={ruta(tecnico)} target="_blank" rel="noreferrer" className="h-9 px-3 shrink-0 rounded-xl inline-flex items-center gap-1.5 bg-[#C9341F] text-white text-label font-black">
                                <LuRoute size={15} /> Ruta en Google Maps
                            </a>
                        )}
                    </div>
                )}

                {/* Mapa */}
                <div className="relative rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06]">
                    <MapaLeaflet puntos={items} seleccionado={sel} ajustarKey={ajustar}
                        onClickPunto={(p) => { if (!corrigiendo) setSel(p.id); }}
                        onClickMapa={(ll) => { if (corrigiendo) fijarUbicacion(ll); else setSel(null); }}
                        className={`w-full h-[calc(var(--vh,1vh)*100-330px)] md:h-[calc(var(--vh,1vh)*100-250px)] min-h-[360px] ${corrigiendo ? 'cursor-crosshair' : ''}`} />

                    {/* Avisos arriba */}
                    <div className="absolute top-3 left-3 right-14 z-[500] flex flex-col items-start gap-2 pointer-events-none">
                        {data?.pendientes > 0 && (
                            <span className="pointer-events-auto h-8 px-3 rounded-full bg-card shadow text-caption font-bold text-secondary inline-flex items-center gap-1.5">
                                <LuLoader size={13} className="animate-spin" /> Ubicando {data.pendientes} dirección{data.pendientes !== 1 ? 'es' : ''}…
                            </span>
                        )}
                        {sinUbicar.length > 0 && !corrigiendo && (
                            <button type="button" onClick={() => setVerSinUbicar(true)} className="pointer-events-auto h-8 px-3 rounded-full bg-card shadow text-caption font-black text-brand-red inline-flex items-center gap-1.5">
                                <LuMapPin size={13} /> {sinUbicar.length} sin ubicar
                            </button>
                        )}
                        {capa && ubicados.length === 0 && sinUbicar.length === 0 && (
                            <span className="h-8 px-3 rounded-full bg-card shadow text-caption font-bold text-muted inline-flex items-center">
                                {capa === 'hoy' ? 'No hay visitas este día' : capa === 'pedidos' ? 'No hay pedidos sin agendar' : capa === 'radar' ? 'Nada vencido' : 'Sin clientes con dirección'}
                            </span>
                        )}
                    </div>

                    {/* Modo corregir */}
                    {corrigiendo && (
                        <div className="absolute top-3 left-3 right-3 z-[600] p-3 rounded-2xl bg-card shadow-xl flex items-center gap-3">
                            <LuCrosshair size={20} className="text-brand-red shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-body font-black text-ink truncate">Tocá en el mapa dónde queda</p>
                                <p className="text-caption text-muted truncate">{corrigiendo.cliente} · {corrigiendo.direccion}</p>
                            </div>
                            <button type="button" onClick={() => setCorrigiendo(null)} className="h-9 px-3 rounded-xl bg-chip text-label font-black text-secondary">Cancelar</button>
                        </div>
                    )}

                    {/* Tarjeta del punto elegido */}
                    {punto && !corrigiendo && (
                        <div className="absolute left-3 right-3 bottom-3 md:left-auto md:w-96 z-[600] p-4 rounded-2xl bg-card shadow-xl space-y-3">
                            <div className="flex items-start gap-2">
                                <span className="w-3 h-3 mt-1.5 rounded-full shrink-0" style={{ background: punto.color }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-body-lg font-black text-ink leading-tight">{punto.cliente}{punto.sede && punto.sede !== punto.cliente ? <span className="text-muted font-bold"> · {punto.sede}</span> : null}</p>
                                    <p className="text-caption text-secondary">{punto.direccion}</p>
                                </div>
                                <button type="button" onClick={() => setSel(null)} aria-label="Cerrar" className="w-8 h-8 shrink-0 rounded-lg bg-chip text-muted flex items-center justify-center"><LuX size={15} /></button>
                            </div>
                            <div className="text-label text-secondary space-y-0.5">
                                {capa === 'hoy' && <p><b className="text-ink">{hora(punto.hora)}</b> · {String(punto.tecnico || '').split(' ')[0]} · {punto.titulo}</p>}
                                {capa === 'pedidos' && <p><b className="text-ink">Pedido #{punto.pedidoId}</b> · {punto.motivo}{punto.urgente ? ' · urgente' : ''}</p>}
                                {(capa === 'clientes' || capa === 'radar') && (
                                    <>
                                        <p>{punto.equipos || 0} equipo{punto.equipos === 1 ? '' : 's'} · última visita {fmtCorta(punto.ultimaVisita) || '—'}</p>
                                        {punto.radar && <p className="font-bold text-[#D97706]">{punto.radar.equipos} equipo{punto.radar.equipos !== 1 ? 's' : ''} con {punto.radar.tipo === 'FILTRO' ? 'cambio de filtro' : 'sanitización'} vencido ({punto.radar.meses} meses)</p>}
                                    </>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <a href={linkGps(punto.direccion, punto.lat, punto.lng)} target="_blank" rel="noreferrer"
                                    className="flex-1 h-10 rounded-xl bg-[#C9341F] text-white text-label font-black inline-flex items-center justify-center gap-1.5"><LuNavigation size={15} /> Ir con GPS</a>
                                {capa === 'hoy' && <button type="button" onClick={() => abrirVisita(punto.ordenId)} className="flex-1 h-10 rounded-xl bg-chip text-secondary text-label font-black">Ver visita</button>}
                                {capa === 'pedidos' && onAbrirPedido && <button type="button" onClick={() => onAbrirPedido(punto.pedidoId)} className="flex-1 h-10 rounded-xl bg-chip text-secondary text-label font-black">Ver pedido</button>}
                                {(capa === 'clientes' || capa === 'radar') && onCrearTrabajo && punto.clienteId && (
                                    <button type="button" onClick={() => onCrearTrabajo({ id: punto.clienteId, nombre: punto.cliente })} className="flex-1 h-10 rounded-xl bg-chip text-secondary text-label font-black">Crear trabajo</button>
                                )}
                            </div>
                            <button type="button" onClick={() => setCorrigiendo(punto)} className="text-caption font-bold text-muted underline">¿Está mal ubicado? Corregir</button>
                        </div>
                    )}
                </div>
                <p className="text-caption text-muted">Las direcciones se ubican solas la primera vez (puede tardar unos minutos). Si alguna cae mal, tocala y “Corregir”.</p>
            </div>

            {/* Lista de los que no se pudieron ubicar */}
            {verSinUbicar && (
                <div className="fixed inset-0 z-[2000] bg-black/60 flex items-end md:items-center justify-center md:p-6" onClick={() => setVerSinUbicar(false)}>
                    <div className="w-full md:max-w-lg max-h-[80vh] bg-card rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-5 pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
                            <div className="flex-1">
                                <p className="text-body-lg font-black text-ink">Sin ubicar ({sinUbicar.length})</p>
                                <p className="text-caption text-muted">Tocá una y después marcala en el mapa</p>
                            </div>
                            <button type="button" onClick={() => setVerSinUbicar(false)} aria-label="Cerrar" className="w-9 h-9 rounded-xl bg-chip text-muted flex items-center justify-center"><LuX size={17} /></button>
                        </div>
                        <div className="overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {sinUbicar.map(p => (
                                <button key={p.id} type="button" onClick={() => { setVerSinUbicar(false); setCorrigiendo(p); }} className="w-full px-5 py-3 text-left flex items-center gap-3 active:bg-chip">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-black text-ink truncate">{p.cliente}</p>
                                        <p className="text-caption text-muted truncate">{p.direccion}</p>
                                    </div>
                                    <span className="text-caption font-bold text-muted shrink-0">{p.geo === 'PENDIENTE' ? 'Buscando…' : 'No encontrada'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {ficha && <FichaVisitaSheet orden={ficha} onCerrar={() => setFicha(null)} onVerTrabajos={() => setFicha(null)} onEliminada={() => { setFicha(null); cargar(); }} />}
        </div>
    );
}
