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
        };
    }, [servicios, ordenes]);

    const totalAlertas = data.pptoVencidos.length + data.ordenesActivas.length + alertasRadar.length;

    // Clases reutilizables
    const card = 'rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]';
    const sectionLabel = 'text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-2';

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

                {/* Grid: 2 columnas en desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* === COLUMNA IZQUIERDA (2/3) === */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Stats compactos */}
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

                        {/* Alertas */}
                        {totalAlertas > 0 && (
                            <div>
                                <p className={sectionLabel}>Alertas ({totalAlertas})</p>
                                <div className="space-y-1.5">
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
                        )}

                        {/* Agenda del día */}
                        <div>
                            <p className={sectionLabel}>Hoy ({data.agendaHoy.length})</p>
                            {data.agendaHoy.length === 0 ? (
                                <div className={`${card} text-center py-8`}>
                                    <p className="text-2xl mb-1">📭</p>
                                    <p className="text-[12px] font-bold text-[#A8A29E]">Sin servicios para hoy</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {data.agendaHoy.map(s => {
                                        const esPendiente = s.estado === 'PRESUPUESTO';
                                        return (
                                            <div key={s.id} onClick={() => setVistaActual('servicio-tecnico')}
                                                className={`${card} flex items-center gap-3 px-3.5 py-2.5 cursor-pointer active:scale-[0.98] hover:shadow-md transition-shadow`}>
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${esPendiente ? 'bg-[#D48800]' : s.estado === 'REALIZADO' ? 'bg-[#16A34A]' : 'bg-[#A8A29E]'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{s.clienteNombre}</p>
                                                    <p className="text-[10px] text-[#A8A29E] truncate">
                                                        {s.servicioTipo === 'TECNICA' ? '🔧' : '🛒'} {s.sedeNombre}{s.usuarioNombre ? ` — ${s.usuarioNombre}` : ''}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <M valor={calcTotal(s)} className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                                                    <span className={`text-[9px] font-bold ${esPendiente ? 'text-[#D48800]' : 'text-[#16A34A]'}`}>
                                                        {esPendiente ? 'Pendiente' : 'Cobrado'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === COLUMNA DERECHA (1/3) === */}
                    <div className="space-y-4">

                        {/* Acciones rápidas */}
                        <div>
                            <p className={sectionLabel}>Acciones</p>
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                                <button onClick={() => setVistaActual('servicio-tecnico')}
                                    className={`${card} w-full flex items-center gap-2.5 p-3 text-left active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]`}>
                                    <span>🔧</span>
                                    <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Nuevo Servicio</span>
                                </button>
                                <button onClick={() => setVistaActual('venta')}
                                    className={`${card} w-full flex items-center gap-2.5 p-3 text-left active:scale-[0.98] hover:shadow-md transition-shadow border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]`}>
                                    <span>🛒</span>
                                    <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Nueva Venta</span>
                                </button>
                                <button onClick={() => setVistaActual('clientes')}
                                    className={`${card} w-full flex items-center gap-2.5 p-3 text-left active:scale-[0.98] hover:shadow-md transition-shadow`}>
                                    <span>👥</span>
                                    <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Clientes</span>
                                </button>
                                <button onClick={() => setVistaActual('finanzas')}
                                    className={`${card} w-full flex items-center gap-2.5 p-3 text-left active:scale-[0.98] hover:shadow-md transition-shadow`}>
                                    <span>💹</span>
                                    <span className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">Finanzas</span>
                                </button>
                            </div>
                        </div>

                        {/* Resumen pendientes */}
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
