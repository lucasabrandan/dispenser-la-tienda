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

export default function DashboardCaja({ setVistaActual }) {
    const { esAdmin } = useAuth();
    const [modalCierre, setModalCierre] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [servicios, setServicios] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [alertasRadar, setAlertasRadar] = useState([]);
    const [diaSel, setDiaSel] = useState(null);
    const [semana2, setSemana2] = useState(false);

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
        const mesItems = realizados.filter(s => s.fecha?.startsWith(mesStr));

        const pptoVencidos = pendientes.filter(s => {
            if (!s.fecha) return false;
            return Math.floor((Date.now() - new Date(s.fecha + 'T00:00:00').getTime()) / 86400000) > 7;
        });

        const agendaHoy = servicios
            .filter(s => s.fecha === hoyStr)
            .sort((a, b) => (a.estado === 'PRESUPUESTO' ? -1 : 1));

        const ordenesActivas = ordenes.filter(o =>
            o.estado !== 'COMPLETADA' && o.estado !== 'CANCELADA'
        );

        return {
            totalHoy: hoyItems.reduce((a, s) => a + calcTotal(s), 0),
            countHoy: hoyItems.length,
            totalMes: mesItems.reduce((a, s) => a + calcTotal(s), 0),
            countMes: mesItems.length,
            moHoy: hoyItems.filter(s => s.servicioTipo === 'TECNICA')
                .reduce((a, s) => a + (s.items?.reduce((b, it) => b + Number(it.costoExtra || 0), 0) || 0), 0),
            pendientesCount: pendientes.length,
            pendientesVal: pendientes.reduce((a, s) => a + calcTotal(s), 0),
            pptoVencidos, agendaHoy, ordenesActivas,
            planificador: (() => {
                const HORAS_DIA = 8;
                const H_TECNICA = 2, H_VENTA = 1;
                const hoy = new Date();
                const dias = [];
                let offset = 0;
                while (dias.length < 12) {
                    const d = new Date(hoy);
                    d.setDate(hoy.getDate() + offset);
                    offset++;
                    if (d.getDay() === 0) continue;
                    const fechaStr = d.toISOString().split('T')[0];
                    const items = servicios.filter(s => s.fecha === fechaStr);
                    const horasUsadas = items.reduce((a, s) => {
                        if (s.duracionMinutos) return a + s.duracionMinutos / 60;
                        return a + (s.servicioTipo === 'TECNICA' ? H_TECNICA : H_VENTA);
                    }, 0);
                    dias.push({
                        fecha: fechaStr, dia: new Date(d), items, horasUsadas,
                        horasTotal: HORAS_DIA,
                        esHoy: fechaStr === hoyStr,
                        esPasado: fechaStr < hoyStr,
                    });
                }
                return dias;
            })(),
        };
    }, [servicios, ordenes]);

    const totalAlertas = data.pptoVencidos.length + data.ordenesActivas.length + alertasRadar.length;

    const card = 'rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]';
    const sectionLabel = 'text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-2';

    // Componente planificador día
    const DiaBtn = ({ d }) => {
        const pct = Math.min(d.horasUsadas / d.horasTotal, 1);
        const barColor = pct === 0 ? 'bg-[#16A34A]' : pct < 0.5 ? 'bg-[#16A34A]' : pct < 0.75 ? 'bg-[#D48800]' : 'bg-[#D13A28]';
        const sel = d.fecha === diaSel;
        return (
            <button onClick={() => setDiaSel(sel ? null : d.fecha)}
                className={`rounded-lg p-2 text-center transition-all active:scale-95 ${
                    d.esHoy ? 'ring-2 ring-[#D13A28] dark:ring-[#E8422F]' : ''
                } ${sel ? 'bg-[#1C1917] dark:bg-[#F0EEE9]' : 'bg-white dark:bg-[#242424]'} shadow-sm border border-black/[0.05] dark:border-white/[0.05]`}>
                <p className={`text-[10px] font-bold uppercase ${sel ? 'text-white dark:text-[#1C1917]' : 'text-[#A8A29E]'}`}>
                    {d.dia.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}
                </p>
                <p className={`text-[14px] font-black ${sel ? 'text-white dark:text-[#1C1917]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                    {d.dia.getDate()}
                </p>
                <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 mt-1.5">
                    <div className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.max(pct * 100, d.items.length > 0 ? 20 : 0)}%` }} />
                </div>
                <p className={`text-[9px] font-bold mt-1 ${sel ? 'text-white/70 dark:text-black/50' : 'text-[#A8A29E]'}`}>
                    {Math.round(d.horasUsadas)}/{d.horasTotal}h
                </p>
            </button>
        );
    };

    // Bloque planificador reutilizable
    const PlanificadorBlock = () => (
        <div>
            <p className={sectionLabel}>Planificador</p>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
                {data.planificador.slice(0, 6).map(d => <DiaBtn key={d.fecha} d={d} />)}
            </div>
            {data.planificador.length > 6 && (
                <>
                    <button onClick={() => setSemana2(v => !v)}
                        className="w-full flex items-center justify-center gap-1 h-6 rounded-lg text-[9px] font-bold uppercase text-[#A8A29E] bg-white dark:bg-[#2E2E2E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-[0.99] mb-2">
                        {semana2 ? '▲ Ocultar' : '▼ Semana siguiente'}
                    </button>
                    {semana2 && (
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                            {data.planificador.slice(6).map(d => <DiaBtn key={d.fecha} d={d} />)}
                        </div>
                    )}
                </>
            )}
            {diaSel && (() => {
                const dia = data.planificador.find(d => d.fecha === diaSel);
                if (!dia) return null;
                const libres = dia.horasTotal - dia.horasUsadas;
                return (
                    <div className={`${card} p-3 mt-2`}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] capitalize">
                                {dia.dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                libres <= 0 ? 'bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171]'
                                : libres <= 2 ? 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]'
                                : 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0F2A1A] dark:text-[#4ADE80]'
                            }`}>
                                {libres <= 0 ? 'Completo' : `${Math.round(libres)}h libres`}
                            </span>
                        </div>
                        {dia.items.length === 0 ? (
                            <p className="text-[11px] text-[#A8A29E] text-center py-3">Día libre</p>
                        ) : (
                            <div className="space-y-2">
                                {dia.items.map(s => {
                                    const horas = s.duracionMinutos ? `${Math.round(s.duracionMinutos / 60 * 10) / 10}h` : `~${s.servicioTipo === 'TECNICA' ? '2' : '1'}h`;
                                    const esPendiente = s.estado === 'PRESUPUESTO';
                                    return (
                                        <div key={s.id} className="rounded-lg p-2.5 bg-[#F5F3F1] dark:bg-[#1C1C1C] border border-black/[0.05] dark:border-white/[0.05]">
                                            <div className="flex items-start gap-2">
                                                <span className="mt-0.5">{s.servicioTipo === 'TECNICA' ? '🔧' : '🛒'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{s.clienteNombre}</p>
                                                        <span className={`text-[9px] font-bold shrink-0 px-1.5 py-0.5 rounded ${esPendiente ? 'bg-[#D48800]/10 text-[#D48800] dark:text-[#F0A500]' : 'bg-[#16A34A]/10 text-[#16A34A]'}`}>
                                                            {esPendiente ? 'Pendiente' : s.estado?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    {s.sedeNombre && <p className="text-[10px] text-[#A8A29E] truncate">{s.sedeNombre}</p>}
                                                    {s.sedeDireccion && (
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.sedeDireccion)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-[#D13A28] dark:text-[#E8422F] truncate block mt-0.5 active:opacity-70"
                                                            onClick={e => e.stopPropagation()}>
                                                            📍 {s.sedeDireccion}
                                                        </a>
                                                    )}
                                                    {s.items?.[0]?.trabajoRealizado && (
                                                        <p className="text-[10px] text-[#A8A29E] mt-1 line-clamp-2">{s.items[0].trabajoRealizado}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className="text-[9px] font-bold text-[#A8A29E]">⏱ {horas}</span>
                                                        {s.items?.[0]?.tecnico && (
                                                            <span className="text-[9px] font-bold text-[#A8A29E]">👤 {s.items[0].tecnico}</span>
                                                        )}
                                                        <M valor={calcTotal(s)} className="text-[10px] font-black text-[#1C1917] dark:text-[#F0EEE9] ml-auto" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );

    // Bloque agenda reutilizable
    const AgendaBlock = () => (
        <div>
            <p className={sectionLabel}>Agenda de hoy ({data.agendaHoy.length})</p>
            {data.agendaHoy.length === 0 ? (
                <div className={`${card} text-center py-8`}>
                    <p className="text-2xl mb-1">📭</p>
                    <p className="text-[12px] font-bold text-[#A8A29E]">Sin actividad para hoy</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {data.agendaHoy.filter(s => s.servicioTipo === 'TECNICA').length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-[#D13A28] dark:text-[#E8422F] uppercase tracking-wider mb-1.5 px-1">🔧 Servicios</p>
                            <div className="space-y-1.5">
                                {data.agendaHoy.filter(s => s.servicioTipo === 'TECNICA').map(s => (
                                    <AgendaCard key={s.id} s={s} calcTotal={calcTotal} onClick={() => setVistaActual('servicio-tecnico')} tipo="tecnica" />
                                ))}
                            </div>
                        </div>
                    )}
                    {data.agendaHoy.filter(s => s.servicioTipo === 'VENTA').length > 0 && (
                        <div>
                            <p className="text-[9px] font-bold text-[#D48800] dark:text-[#F0A500] uppercase tracking-wider mb-1.5 px-1">🛒 Ventas / Entregas</p>
                            <div className="space-y-1.5">
                                {data.agendaHoy.filter(s => s.servicioTipo === 'VENTA').map(s => (
                                    <AgendaCard key={s.id} s={s} calcTotal={calcTotal} onClick={() => setVistaActual('venta')} tipo="venta" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Bloque stats reutilizable
    const StatsBlock = () => (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className={`${card} p-3.5`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Hoy</p>
                <M valor={data.totalHoy} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                <p className="text-[10px] text-[#A8A29E] mt-0.5">{data.countHoy} operaciones</p>
            </div>
            <div className={`${card} p-3.5`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Mes</p>
                <M valor={data.totalMes} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                <p className="text-[10px] text-[#A8A29E] mt-0.5">{data.countMes} cobradas</p>
            </div>
            {data.moHoy > 0 && (
                <div className={`${card} p-3.5 col-span-2 md:col-span-1`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">MO Hoy</p>
                    <M valor={data.moHoy} className="text-xl font-black text-[#D48800] dark:text-[#F0A500] block" />
                </div>
            )}
        </div>
    );

    // Bloque alertas
    const AlertasBlock = () => totalAlertas > 0 ? (
        <div>
            <p className={sectionLabel}>Alertas ({totalAlertas})</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {data.pptoVencidos.length > 0 && (
                    <button onClick={() => setVistaActual('presupuestos')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left active:scale-[0.98] bg-[#FEE2E2] dark:bg-[#3B1111] border border-[#D13A28]/15">
                        <span>⏰</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[#D13A28] dark:text-[#F87171]">
                                {data.pptoVencidos.length} presupuesto{data.pptoVencidos.length !== 1 ? 's' : ''} sin respuesta +7d
                            </p>
                            <p className="text-[9px] text-[#D13A28]/60 dark:text-[#F87171]/60 truncate">
                                {data.pptoVencidos.slice(0, 3).map(s => s.clienteNombre).join(', ')}
                            </p>
                        </div>
                        <span className="text-[#D13A28]/40 dark:text-[#F87171]/40 text-lg">›</span>
                    </button>
                )}
                {data.ordenesActivas.length > 0 && (
                    <button onClick={() => setVistaActual('despacho')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left active:scale-[0.98] bg-[#FEF3C7] dark:bg-[#2E2207] border border-[#D48800]/15">
                        <span>📌</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[#92400E] dark:text-[#FBBF24]">
                                {data.ordenesActivas.length} orden{data.ordenesActivas.length !== 1 ? 'es' : ''} activa{data.ordenesActivas.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-[9px] text-[#92400E]/60 dark:text-[#FBBF24]/60 truncate">
                                {data.ordenesActivas.slice(0, 3).map(o => o.clienteNombre).join(', ')}
                            </p>
                        </div>
                        <span className="text-[#92400E]/40 dark:text-[#FBBF24]/40 text-lg">›</span>
                    </button>
                )}
                {alertasRadar.length > 0 && (
                    <button onClick={() => setVistaActual('radar')}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left active:scale-[0.98] bg-[#EFEDEA] dark:bg-[#1C1C1C] border border-black/[0.05] dark:border-white/[0.05]">
                        <span>🚨</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">
                                {alertasRadar.length} equipo{alertasRadar.length !== 1 ? 's' : ''} sin mantenimiento
                            </p>
                            <p className="text-[9px] text-[#A8A29E] truncate">
                                {alertasRadar.slice(0, 3).map(a => a.clienteNombre).join(', ')}
                            </p>
                        </div>
                        <span className="text-[#A8A29E] text-lg">›</span>
                    </button>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#F5F3F1] dark:bg-[#141414]">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-6">

                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">Panel</h2>
                        <p className="text-[11px] font-medium capitalize text-[#A8A29E]">{hoyLabel}</p>
                    </div>
                    <div className="flex gap-2">
                        {esAdmin && (
                            <button onClick={() => setModalCierre(true)}
                                className="h-8 px-3 rounded-lg flex items-center gap-1.5 font-bold text-[11px] uppercase active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] text-white">
                                Cierre
                            </button>
                        )}
                        <button onClick={cargar} disabled={cargando}
                            className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 disabled:opacity-40 bg-[#E8E5E0] dark:bg-[#2E2E2E]">
                            <span className={`text-sm ${cargando ? 'animate-spin' : ''}`}>↻</span>
                        </button>
                    </div>
                </div>

                {/* ═══ MOBILE: orden optimizado ═══ */}
                <div className="md:hidden space-y-4">
                    <PlanificadorBlock />
                    <AgendaBlock />
                    <StatsBlock />
                    <AlertasBlock />

                    {/* Pendientes */}
                    {data.pendientesCount > 0 && (
                        <div className={`${card} p-3.5`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Pendientes</p>
                                    <p className="text-sm font-bold text-[#D48800] dark:text-[#F0A500]">
                                        {data.pendientesCount} — <M valor={data.pendientesVal} />
                                    </p>
                                </div>
                                <button onClick={() => setVistaActual('presupuestos')}
                                    className="text-[10px] font-black uppercase text-[#D13A28] dark:text-[#E8422F] hover:underline">
                                    Ver →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Acciones rápidas — solo las 2 principales */}
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setVistaActual('servicio-tecnico')}
                            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl shadow-sm active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] text-white">
                            <span>🔧</span>
                            <span className="text-[12px] font-black">Servicio</span>
                        </button>
                        <button onClick={() => setVistaActual('venta')}
                            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl shadow-sm active:scale-95 bg-[#D48800] dark:bg-[#F0A500] text-white">
                            <span>🛒</span>
                            <span className="text-[12px] font-black">Venta</span>
                        </button>
                    </div>
                </div>

                {/* ═══ DESKTOP ═══ */}
                <div className="hidden md:block space-y-5">
                    {/* Fila 1: Stats + Acciones en línea */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <StatsBlock />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="grid grid-cols-2 gap-1.5 flex-1">
                                <button onClick={() => setVistaActual('servicio-tecnico')}
                                    className={`${card} flex items-center gap-2 p-2.5 text-left active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]`}>
                                    <span>🔧</span>
                                    <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Servicio</span>
                                </button>
                                <button onClick={() => setVistaActual('venta')}
                                    className={`${card} flex items-center gap-2 p-2.5 text-left active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]`}>
                                    <span>🛒</span>
                                    <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Venta</span>
                                </button>
                                <button onClick={() => setVistaActual('presupuestos')}
                                    className={`${card} flex items-center gap-2 p-2.5 text-left active:scale-[0.98] hover:shadow-md transition-shadow`}>
                                    <span>💰</span>
                                    <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Presupuestos</span>
                                </button>
                                <button onClick={() => setVistaActual('finanzas')}
                                    className={`${card} flex items-center gap-2 p-2.5 text-left active:scale-[0.98] hover:shadow-md transition-shadow`}>
                                    <span>💹</span>
                                    <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Finanzas</span>
                                </button>
                            </div>
                            {data.pendientesCount > 0 && (
                                <div className={`${card} p-2.5 flex items-center justify-between`}>
                                    <p className="text-[11px] font-bold text-[#D48800] dark:text-[#F0A500]">
                                        {data.pendientesCount} pendientes — <M valor={data.pendientesVal} />
                                    </p>
                                    <button onClick={() => setVistaActual('presupuestos')}
                                        className="text-[10px] font-black text-[#D13A28] dark:text-[#E8422F]">
                                        Ver →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fila 2: Alertas */}
                    <AlertasBlock />

                    {/* Fila 3: Planificador + Agenda */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <PlanificadorBlock />
                        <AgendaBlock />
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

// Sub-componente para las cards de agenda
function AgendaCard({ s, calcTotal, onClick, tipo }) {
    const esPendiente = s.estado === 'PRESUPUESTO';
    const borderColor = tipo === 'tecnica'
        ? 'border-l-[#D13A28] dark:border-l-[#E8422F]'
        : 'border-l-[#D48800] dark:border-l-[#F0A500]';
    const linkColor = tipo === 'tecnica'
        ? 'text-[#D13A28] dark:text-[#E8422F]'
        : 'text-[#D48800] dark:text-[#F0A500]';

    return (
        <div onClick={onClick}
            className={`rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] px-3.5 py-2.5 cursor-pointer active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px] ${borderColor}`}>
            <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{s.clienteNombre}</p>
                    <p className="text-[10px] text-[#A8A29E] truncate">{s.sedeNombre}{s.items?.[0]?.tecnico ? ` — ${s.items[0].tecnico}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                    <M valor={calcTotal(s)} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                    <span className={`text-[9px] font-bold ${esPendiente ? 'text-[#D48800]' : 'text-[#16A34A]'}`}>
                        {esPendiente ? 'Pendiente' : 'Cobrado'}
                    </span>
                </div>
            </div>
            {s.sedeDireccion && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.sedeDireccion)}`}
                    target="_blank" rel="noopener noreferrer"
                    className={`text-[10px] ${linkColor} truncate block mt-1 active:opacity-70`}
                    onClick={e => e.stopPropagation()}>
                    📍 {s.sedeDireccion}
                </a>
            )}
            {s.duracionMinutos && (
                <p className="text-[9px] font-bold text-[#A8A29E] mt-1">⏱ {Math.round(s.duracionMinutos / 60 * 10) / 10}h estimadas</p>
            )}
        </div>
    );
}
