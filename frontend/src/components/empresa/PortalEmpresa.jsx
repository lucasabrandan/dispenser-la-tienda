import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuPlus, LuLogOut, LuMapPin, LuClock, LuMessageCircle, LuBellRing, LuTriangleAlert, LuSun, LuMoon, LuCamera, LuStar } from 'react-icons/lu';
import api from '../../services/api';
import logo from '../../assets/logo-dispenser.svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useArrastrarHojas } from '../../hooks/useArrastrarHojas';
import { Pestanas, Segmentado, CONTENEDOR, PAGINA } from '../ui/Pantalla';
import NotificacionesPanel, { NotifBell } from '../layout/NotificacionesPanel';
import { sonarAviso } from '../layout/AvisoUrgente';
import { pushSoportado, activarNotificaciones } from '../../utils/pushNotifications';
import { estadoDe, cuandoPedido, haceCuanto, esAbierto } from '../../utils/pedidosEmpresa';
import PedidoDetalle from './PedidoDetalle';
import NuevoPedidoSheet from './NuevoPedidoSheet';
import EquiposEmpresa from './EquiposEmpresa';
import ResumenMes from './ResumenMes';
import MantenimientosEmpresa from './MantenimientosEmpresa';
import IndicadoresEmpresa from './IndicadoresEmpresa';

// Portal Empresa (7-oct-2026): lo único que ve un usuario EMPRESA. Carga
// pedidos, sigue el estado de cada uno y conversa con Dispenser La Tienda en el
// mismo pedido. Reemplaza el Trello + WhatsApp. No ve precios, otros clientes,
// técnicos ni nada interno (el backend se lo corta igual).
export default function PortalEmpresa() {
    const { usuario, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [empresa, setEmpresa] = useState('');
    const [miLugar, setMiLugar] = useState(null); // encargado de un lugar (8-oct-2026)
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [tab, setTab] = useState('curso');
    const [abierto, setAbierto] = useState(null);
    const [nuevo, setNuevo] = useState(false); // false | true | { sedeId, serie }
    const [vista, setVista] = useState('pedidos');
    const [notifCount, setNotifCount] = useState(0);
    const [notifAbierto, setNotifAbierto] = useState(false);
    const [permiso, setPermiso] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'denied'));
    const ultimoCount = useRef(null);
    useArrastrarHojas(); // celular: cerrar ventanas arrastrándolas hacia abajo

    const cargar = useCallback(async () => {
        try {
            const r = await api.get('/empresa/pedidos');
            setPedidos(Array.isArray(r.data) ? r.data : []);
        } catch { /* sin señal: queda lo que había */ } finally { setCargando(false); }
    }, []);

    const pollNotifs = useCallback(async () => {
        try {
            const r = await api.get('/notificaciones/count');
            const c = r.data?.count || 0;
            if (ultimoCount.current !== null && c > ultimoCount.current) { sonarAviso(); cargar(); }
            ultimoCount.current = c;
            setNotifCount(c);
        } catch { /* */ }
    }, [cargar]);

    useEffect(() => {
        api.get('/empresa/datos').then(r => {
            setEmpresa(r.data?.empresa || '');
            setMiLugar(r.data?.sedeId ? { id: r.data.sedeId, nombre: r.data.sedeNombre } : null);
        }).catch(() => {});
        cargar(); pollNotifs();
        const a = setInterval(cargar, 30000), b = setInterval(pollNotifs, 15000);
        return () => { clearInterval(a); clearInterval(b); };
    }, [cargar, pollNotifs]);

    const abrirPedidoId = useCallback(async (id) => {
        try { const r = await api.get(`/empresa/pedidos/${id}`); setAbierto(r.data); } catch { toast.error('No se encontró el pedido'); }
    }, []);

    // Abierto desde un push: /?notif=1&pedido=12 (o &ordenId=…)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('notif') !== '1') return;
        const pid = params.get('pedido'), oid = params.get('ordenId');
        if (pid) abrirPedidoId(pid);
        else if (oid) api.get(`/empresa/pedidos/por-orden/${oid}`).then(r => setAbierto(r.data)).catch(() => setNotifAbierto(true));
        else setNotifAbierto(true);
        window.history.replaceState({}, '', window.location.pathname);
    }, [abrirPedidoId]);

    const grupos = useMemo(() => ({
        curso: pedidos.filter(esAbierto),
        hechos: pedidos.filter(p => p.estado === 'HECHO'),
        cancelados: pedidos.filter(p => p.estado === 'CANCELADO'),
    }), [pedidos]);
    const lista = grupos[tab] || [];

    const activarPush = async () => {
        try { await activarNotificaciones(); setPermiso('granted'); toast.success('Listo, te van a llegar los avisos'); }
        catch (e) { setPermiso(typeof Notification !== 'undefined' ? Notification.permission : 'denied'); toast.error(e.message || 'No se pudieron activar'); }
    };

    return (
        <div className={PAGINA}>
            {/* Encabezado */}
            <header className="sticky top-0 z-30 bg-page/95 backdrop-blur border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
                    <img src={logo} alt="Dispenser La Tienda" className="h-9 w-auto shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-body font-black text-ink truncate">{empresa || 'Portal empresa'}</p>
                        <p className="text-caption text-muted truncate">{usuario?.nombre}{miLugar?.nombre ? ` · ${miLugar.nombre}` : ''}</p>
                    </div>
                    <NotifBell count={notifCount} onClick={() => setNotifAbierto(true)} />
                    <button type="button" onClick={toggleTheme} aria-label="Cambiar tema" className="w-10 h-10 rounded-xl bg-chip text-secondary flex items-center justify-center">{isDark ? <LuSun size={17} /> : <LuMoon size={17} />}</button>
                    <button type="button" onClick={logout} aria-label="Salir" className="w-10 h-10 rounded-xl bg-chip text-secondary flex items-center justify-center"><LuLogOut size={17} /></button>
                </div>
            </header>

            <div className={CONTENEDOR.replace('max-w-6xl', 'max-w-3xl')}>
                {pushSoportado() && permiso !== 'granted' && (
                    <button type="button" onClick={activarPush}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[rgba(201,52,31,0.08)] border border-[rgba(201,52,31,0.25)] text-left active:scale-[0.99]">
                        <LuBellRing size={20} className="text-brand-red shrink-0" />
                        <span className="flex-1">
                            <span className="block text-body font-black text-ink">Activá los avisos en este dispositivo</span>
                            <span className="block text-caption text-secondary">Te avisamos cuando agendemos, salgamos para allá o terminemos.</span>
                        </span>
                    </button>
                )}

                <div className="-mx-1 px-1 overflow-x-auto [&>div]:w-full [&>div]:min-w-[340px] [&_button]:flex-1 [&_button]:justify-center [&_button]:px-1 [&_button]:text-[12px] [&_button]:whitespace-nowrap">
                    <Segmentado valor={vista} onChange={setVista} opciones={[
                        { id: 'pedidos', label: 'Pedidos' },
                        { id: 'equipos', label: 'Equipos' },
                        { id: 'services', label: 'Services' },
                        { id: 'resumen', label: 'Resumen' },
                        { id: 'numeros', label: 'Números' },
                    ]} />
                </div>

                {vista === 'numeros' ? (
                    <IndicadoresEmpresa />
                ) : vista === 'services' ? (
                    <MantenimientosEmpresa onPedir={(m) => setNuevo({ sedeId: m.sedeId, serie: m.serie, motivo: 'Mantenimiento / limpieza' })} />
                ) : vista === 'resumen' ? (
                    <ResumenMes empresa={empresa} />
                ) : vista === 'equipos' ? (
                    <EquiposEmpresa onPedirServicio={(eq) => setNuevo({ sedeId: eq.sedeId, serie: eq.serie })} />
                ) : (<>
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-ink">Pedidos</h1>
                    <button type="button" onClick={() => setNuevo(true)}
                        className="h-11 px-4 rounded-xl inline-flex items-center gap-1.5 bg-[#C9341F] text-white text-label font-black active:scale-95"><LuPlus size={17} /> Nuevo pedido</button>
                </div>

                <Pestanas activo={tab} onChange={setTab} items={[
                    { id: 'curso', label: 'En curso', count: grupos.curso.length },
                    { id: 'hechos', label: 'Hechos', count: grupos.hechos.length },
                    { id: 'cancelados', label: 'Cancelados', count: grupos.cancelados.length },
                ]} />

                {cargando ? (
                    <p className="py-16 text-center text-muted text-body">Cargando…</p>
                ) : lista.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                        <p className="text-body-lg font-black text-ink">{tab === 'curso' ? 'No hay pedidos en curso' : 'Nada por acá'}</p>
                        {tab === 'curso' && <p className="text-body text-muted">Cuando un equipo necesite servicio, tocá “Nuevo pedido”.</p>}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {lista.map(p => <TarjetaPedido key={p.id} p={p} onClick={() => setAbierto(p)} />)}
                    </div>
                )}
                </>)}
            </div>

            {nuevo && <NuevoPedidoSheet inicial={nuevo === true ? null : nuevo} soloMiLugar={!!miLugar} onCerrar={() => setNuevo(false)} onCreado={(p) => { setNuevo(false); setVista('pedidos'); setTab('curso'); cargar(); setAbierto(p); }} />}
            {abierto && <PedidoDetalle key={abierto.id} pedido={abierto} modo="empresa" onCerrar={() => { setAbierto(null); cargar(); }} onCambio={cargar} />}
            <NotificacionesPanel abierto={notifAbierto}
                onCerrar={() => { setNotifAbierto(false); pollNotifs(); }}
                onAbrirPedido={(id) => { setNotifAbierto(false); abrirPedidoId(id); }}
                onSinReferencia={() => setNotifAbierto(false)} />
        </div>
    );
}

export function TarjetaPedido({ p, onClick, mostrarCliente = false }) {
    const est = estadoDe(p);
    const cuando = cuandoPedido(p);
    return (
        <button type="button" onClick={onClick}
            className="w-full text-left p-4 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] shadow-sm active:scale-[0.99] space-y-2">
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-body-lg font-black text-ink leading-tight">
                        {p.urgente && <LuTriangleAlert size={15} className="inline -mt-0.5 mr-1 text-brand-red" />}
                        {p.motivo}{p.equipoSerie ? <span className="text-muted font-bold"> · N/S {p.equipoSerie}</span> : null}
                    </p>
                    {mostrarCliente && p.clienteNombre && <p className="text-caption font-black text-secondary uppercase tracking-wide">{p.clienteNombre}</p>}
                </div>
                <span className="shrink-0 h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-caption font-black"
                    style={{ background: `${est.color}1F`, color: est.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: est.color }} />{est.label}
                </span>
            </div>
            <p className="flex items-center gap-2 text-label text-secondary"><LuMapPin size={14} className="shrink-0 text-muted" /><span className="truncate">{p.lugar && p.lugar !== p.direccion ? `${p.lugar} · ` : ''}{p.direccion}</span></p>
            <div className="flex items-center gap-3 text-caption text-muted">
                {cuando ? <span className="inline-flex items-center gap-1.5 font-bold text-secondary"><LuClock size={13} />{cuando}</span> : <span>#{p.id} · {haceCuanto(p.creadoEn)}</span>}
                <span className="ml-auto inline-flex items-center gap-3">
                    {p.fotos?.length > 0 && <span className="inline-flex items-center gap-1"><LuCamera size={13} />{p.fotos.length}</span>}
                    {p.conformidad === 'PROBLEMA' && <span className="inline-flex items-center gap-1 font-black text-brand-red"><LuTriangleAlert size={13} />Reclamo</span>}
                    {p.conformidad === 'CONFORME' && <span className="inline-flex items-center gap-1 font-black text-[#16A34A]">✓{p.calificacion ? <><LuStar size={12} className="fill-current" />{p.calificacion}</> : ' Conforme'}</span>}
                    {p.estado === 'HECHO' && !p.conformidad && !mostrarCliente && <span className="font-black text-brand-red">Confirmá ›</span>}
                    {p.comentarios > 0 && <span className="inline-flex items-center gap-1"><LuMessageCircle size={13} />{p.comentarios}</span>}
                </span>
            </div>
        </button>
    );
}
