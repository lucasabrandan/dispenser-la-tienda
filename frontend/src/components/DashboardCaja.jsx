import React, { useState, useEffect, useMemo } from 'react';
import { useMontos } from '../context/MontosContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CierreCajaModal from './finanzas/CierreCajaModal';

function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>······</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}
        </span>
    );
}

function StatMini({ label, valor, sub, accent }) {
    return (
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-0.5">{label}</p>
            <p className={`text-[20px] font-black leading-none ${accent || 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>{valor}</p>
            {sub && <p className="text-[9px] text-[#A8A29E] mt-0.5">{sub}</p>}
        </div>
    );
}

export default function DashboardCaja({ setVistaActual }) {
    const { esAdmin } = useAuth();
    const [modalCierre, setModalCierre] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [servicios, setServicios] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [alertasRadar, setAlertasRadar] = useState([]);

    const cargar = async () => {
        setCargando(true);
        try {
            const calls = [api.get('/servicios?page=0&size=500&sort=fechaServicio,desc')];
            if (esAdmin) {
                calls.push(api.get('/ordenes'));
                calls.push(api.get('/radar/alertas').catch(() => ({ data: [] })));
            }
            const [sRes, oRes, rRes] = await Promise.all(calls);
            setServicios(sRes.data.content || sRes.data || []);
            if (oRes) setOrdenes(oRes.data || []);
            if (rRes) setAlertasRadar(rRes.data || []);
        } catch { /* silenciar */ } finally { setCargando(false); }
    };

    useEffect(() => { cargar(); }, []);

    const hoyStr = new Date().toISOString().split('T')[0];
    const mesStr = hoyStr.substring(0, 7);
    const hoyLabel = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

    const calcTotal = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;

    const data = useMemo(() => {
        const realizados = servicios.filter(s => s.estado === 'REALIZADO');
        const pendientes = servicios.filter(s => s.estado === 'PRESUPUESTO');

        const hoyItems = realizados.filter(s => s.fecha === hoyStr);
        const totalHoy = hoyItems.reduce((a, s) => a + calcTotal(s), 0);
        const countHoy = hoyItems.length;

        const mesItems = realizados.filter(s => s.fecha?.startsWith(mesStr));
        const totalMes = mesItems.reduce((a, s) => a + calcTotal(s), 0);
        const countMes = mesItems.length;

        const moHoy = hoyItems
            .filter(s => s.servicioTipo === 'TECNICA')
            .reduce((a, s) => a + (s.items?.reduce((b, it) => b + Number(it.costoExtra || 0), 0) || 0), 0);

        // Presupuestos vencidos (>7 dias)
        const pptoVencidos = pendientes.filter(s => {
            if (!s.fecha) return false;
            const dias = Math.floor((Date.now() - new Date(s.fecha + 'T00:00:00').getTime()) / 86400000);
            return dias > 7;
        });

        // Agenda: servicios de hoy (todos los estados)
        const agendaHoy = servicios
            .filter(s => s.fecha === hoyStr)
            .sort((a, b) => (a.estado === 'PRESUPUESTO' ? -1 : 1));

        // Ordenes activas (no completadas ni canceladas)
        const ordenesActivas = ordenes.filter(o =>
            o.estado !== 'COMPLETADA' && o.estado !== 'CANCELADA'
        );

        return {
            totalHoy, countHoy, totalMes, countMes, moHoy,
            pendientesCount: pendientes.length,
            pendientesVal: pendientes.reduce((a, s) => a + calcTotal(s), 0),
            pptoVencidos,
            agendaHoy,
            ordenesActivas,
        };
    }, [servicios, ordenes]);

    // Total alertas para el badge
    const totalAlertas = data.pptoVencidos.length + data.ordenesActivas.length + alertasRadar.length;

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#F5F3F1] dark:bg-[#141414] transition-colors">

            {/* Header */}
            <div className="px-4 md:px-0 pt-5 md:pt-0 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-[28px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                            Panel
                        </h2>
                        <p className="text-[11px] font-medium capitalize mt-1 text-[#A8A29E]">{hoyLabel}</p>
                    </div>
                    <div className="flex gap-2">
                        {esAdmin && (
                            <button onClick={() => setModalCierre(true)}
                                className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-[11px] uppercase active:scale-90 bg-[#D13A28] dark:bg-[#E8422F] text-white">
                                Cierre
                            </button>
                        )}
                        <button onClick={cargar} disabled={cargando}
                            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 disabled:opacity-40 bg-[#E8E5E0] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07]">
                            <span className={`text-sm ${cargando ? 'animate-spin' : ''}`}>↻</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-0 space-y-3">

                {/* Resumen compacto — 1 card con 3 métricas */}
                <div className="rounded-2xl p-4 bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                    style={{ borderLeft: '3px solid #D13A28' }}>
                    <div className="flex gap-4">
                        <StatMini label="Hoy" valor={<M valor={data.totalHoy} />} sub={`${data.countHoy} operaciones`} />
                        <StatMini label="Mes" valor={<M valor={data.totalMes} />} sub={`${data.countMes} cobradas`} />
                        {data.moHoy > 0 && (
                            <StatMini label="MO hoy" valor={<M valor={data.moHoy} />} accent="text-[#D48800] dark:text-[#F0A500]" />
                        )}
                    </div>
                    {data.pendientesCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#D48800] dark:text-[#F0A500]">
                                {data.pendientesCount} pendiente{data.pendientesCount !== 1 ? 's' : ''} — <M valor={data.pendientesVal} />
                            </span>
                            <button onClick={() => setVistaActual('presupuestos')}
                                className="text-[10px] font-black uppercase text-[#D13A28] dark:text-[#E8422F]">
                                Ver →
                            </button>
                        </div>
                    )}
                </div>

                {/* Alertas — solo si hay */}
                {totalAlertas > 0 && (
                    <div className="space-y-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] px-1 text-[#A8A29E]">
                            Alertas ({totalAlertas})
                        </p>

                        {data.pptoVencidos.length > 0 && (
                            <button onClick={() => setVistaActual('presupuestos')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition-all bg-[#FEE2E2] dark:bg-[#3B1111] border border-[#D13A28]/20">
                                <span className="text-lg">⏰</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-black text-[#D13A28] dark:text-[#F87171]">
                                        {data.pptoVencidos.length} presupuesto{data.pptoVencidos.length !== 1 ? 's' : ''} sin respuesta +7d
                                    </p>
                                    <p className="text-[10px] text-[#D13A28]/70 dark:text-[#F87171]/70 truncate">
                                        {data.pptoVencidos.slice(0, 3).map(s => s.clienteNombre).join(', ')}
                                    </p>
                                </div>
                                <span className="text-[10px] font-black text-[#D13A28] dark:text-[#F87171]">→</span>
                            </button>
                        )}

                        {data.ordenesActivas.length > 0 && (
                            <button onClick={() => setVistaActual('despacho')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition-all bg-[#FEF3C7] dark:bg-[#2E2207] border border-[#D48800]/20">
                                <span className="text-lg">📌</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-black text-[#92400E] dark:text-[#FBBF24]">
                                        {data.ordenesActivas.length} orden{data.ordenesActivas.length !== 1 ? 'es' : ''} de visita activa{data.ordenesActivas.length !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[10px] text-[#92400E]/70 dark:text-[#FBBF24]/70 truncate">
                                        {data.ordenesActivas.slice(0, 3).map(o => o.clienteNombre).join(', ')}
                                    </p>
                                </div>
                                <span className="text-[10px] font-black text-[#92400E] dark:text-[#FBBF24]">→</span>
                            </button>
                        )}

                        {alertasRadar.length > 0 && (
                            <button onClick={() => setVistaActual('radar')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-[0.98] transition-all bg-[#EFEDEA] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07]">
                                <span className="text-lg">🚨</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                        {alertasRadar.length} equipo{alertasRadar.length !== 1 ? 's' : ''} sin mantenimiento
                                    </p>
                                    <p className="text-[10px] text-[#A8A29E] truncate">
                                        {alertasRadar.slice(0, 3).map(a => a.clienteNombre).join(', ')}
                                    </p>
                                </div>
                                <span className="text-[10px] font-black text-[#A8A29E]">→</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Agenda del dia */}
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] px-1 mb-2 text-[#A8A29E]">
                        Hoy ({data.agendaHoy.length})
                    </p>
                    {data.agendaHoy.length === 0 ? (
                        <div className="text-center py-8 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                            <p className="text-2xl mb-1">📭</p>
                            <p className="text-[12px] font-bold text-[#A8A29E]">Sin servicios para hoy</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {data.agendaHoy.map(s => {
                                const esPendiente = s.estado === 'PRESUPUESTO';
                                return (
                                    <div key={s.id}
                                        onClick={() => setVistaActual('servicio-tecnico')}
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active:scale-[0.98] transition-all bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${esPendiente ? 'bg-[#D48800]' : s.estado === 'REALIZADO' ? 'bg-[#16A34A]' : 'bg-[#A8A29E]'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">
                                                {s.clienteNombre}
                                            </p>
                                            <p className="text-[10px] text-[#A8A29E] truncate">
                                                {s.servicioTipo === 'TECNICA' ? '🔧' : '🛒'} {s.sedeNombre}
                                                {s.usuarioNombre ? ` — ${s.usuarioNombre}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <M valor={calcTotal(s)} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${esPendiente ? 'bg-[var(--warning-bg)] text-[var(--warning-tx)]' : 'bg-[var(--success-bg)] text-[var(--success-tx)]'}`}>
                                                {esPendiente ? 'Pendiente' : 'Cobrado'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Accesos rapidos */}
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] px-1 mb-2 text-[#A8A29E]">
                        Acceso rapido
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setVistaActual('servicio-tecnico')}
                            className="rounded-2xl p-4 text-left active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F]">
                            <p className="text-lg mb-1">🔧</p>
                            <p className="font-black text-[12px] text-white uppercase">Nuevo Servicio</p>
                        </button>
                        <button onClick={() => setVistaActual('venta')}
                            className="rounded-2xl p-4 text-left active:scale-95 transition-all bg-[#D48800] dark:bg-[#F0A500]">
                            <p className="text-lg mb-1">🛒</p>
                            <p className="font-black text-[12px] text-white uppercase">Nueva Venta</p>
                        </button>
                        <button onClick={() => setVistaActual('clientes')}
                            className="rounded-2xl p-4 text-left active:scale-95 transition-all bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                            <p className="text-lg mb-1">👥</p>
                            <p className="font-black text-[12px] uppercase text-[#1C1917] dark:text-[#F0EEE9]">Clientes</p>
                        </button>
                        <button onClick={() => setVistaActual('finanzas')}
                            className="rounded-2xl p-4 text-left active:scale-95 transition-all bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                            <p className="text-lg mb-1">💹</p>
                            <p className="font-black text-[12px] uppercase text-[#1C1917] dark:text-[#F0EEE9]">Finanzas</p>
                        </button>
                    </div>
                </div>
            </div>

            {modalCierre && (
                <CierreCajaModal
                    onClose={() => setModalCierre(false)}
                    onArchivar={() => { setModalCierre(false); cargar(); }}
                />
            )}
        </div>
    );
}
