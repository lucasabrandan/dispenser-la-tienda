import React, { useState, useEffect, useMemo } from 'react';
import { useMontos } from '../context/MontosContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { M } from './servicio/ServicioUI';
import CierreCajaModal from './finanzas/CierreCajaModal';
import PlanificadorBlock from './dashboard/PlanificadorBlock';
import AgendaBlock from './dashboard/AgendaBlock';
import AlertasBlock from './dashboard/AlertasBlock';
import { calcTotal } from './dashboard/estadoConstants';
import { getTodayISO, formatDateISO } from '../utils/dateUtils';

export default function DashboardCaja({ setVistaActual }) {
    const { esAdmin } = useAuth();
    const [modalCierre, setModalCierre] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [servicios, setServicios] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [notasAgenda, setNotasAgenda] = useState([]);
    const [alertasRadar, setAlertasRadar] = useState([]);

    const cargar = async () => {
        setCargando(true);
        try {
            const calls = [api.get('/servicios?page=0&size=500&sort=fechaServicio,desc')];
            if (esAdmin) {
                calls.push(api.get('/ordenes'));
                calls.push(api.get('/radar/alertas').catch(() => ({ data: [] })));
                const desde = formatDateISO(new Date());
                const h = new Date(); h.setDate(h.getDate() + 20);
                const hasta = formatDateISO(h);
                calls.push(api.get(`/notas-agenda/all?desde=${desde}&hasta=${hasta}`).catch(() => ({ data: [] })));
            }
            const [sRes, oRes, rRes, nRes] = await Promise.all(calls);
            setServicios(sRes.data.content || sRes.data || []);
            if (oRes) setOrdenes(oRes.data || []);
            if (rRes) setAlertasRadar(rRes.data || []);
            if (nRes) setNotasAgenda(nRes.data || []);
        } catch (err) { console.warn('Dashboard: error cargando datos', err); } finally { setCargando(false); }
    };

    useEffect(() => { cargar(); }, []);

    const hoyStr = getTodayISO();
    const mesStr = hoyStr.substring(0, 7);
    const hoyLabel = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

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

        // Planificador: 12 dias habiles
        const HORAS_DIA = 8, H_TECNICA = 2, H_VENTA = 1;
        const hoy = new Date();
        const dias = [];
        let offset = 0;
        while (dias.length < 12) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() + offset);
            offset++;
            if (d.getDay() === 0) continue;
            const fechaStr = formatDateISO(d);
            const items = servicios.filter(s => s.fecha === fechaStr && !['ARCHIVADO','CANCELADO'].includes(s.estado));
            const horasUsadas = items.reduce((a, s) => {
                if (s.duracionMinutos) return a + s.duracionMinutos / 60;
                return a + (s.servicioTipo === 'TECNICA' ? H_TECNICA : H_VENTA);
            }, 0);
            const notasDia = notasAgenda.filter(n => n.fecha === fechaStr);
            dias.push({
                fecha: fechaStr, dia: new Date(d), items, horasUsadas,
                horasTotal: HORAS_DIA,
                esHoy: fechaStr === hoyStr,
                esPasado: fechaStr < hoyStr,
                notas: notasDia,
            });
        }

        return {
            totalHoy: hoyItems.reduce((a, s) => a + calcTotal(s), 0),
            countHoy: hoyItems.length,
            totalMes: mesItems.reduce((a, s) => a + calcTotal(s), 0),
            countMes: mesItems.length,
            moHoy: hoyItems.filter(s => s.servicioTipo === 'TECNICA')
                .reduce((a, s) => a + (s.items?.reduce((b, it) => b + Number(it.costoExtra || 0), 0) || 0), 0),
            pendientesCount: pendientes.length,
            pendientesVal: pendientes.reduce((a, s) => a + calcTotal(s), 0),
            pptoVencidos, agendaHoy, ordenesActivas, planificador: dias,
        };
    }, [servicios, ordenes, notasAgenda]);

    const card = 'rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]';

    // Stats inline (pequeno, no amerita archivo separado)
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

                {/* MOBILE */}
                <div className="md:hidden space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setVistaActual('servicio-tecnico', { crear: true })}
                            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl shadow-sm active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] text-white">
                            <span>🔧</span>
                            <span className="text-[12px] font-black">Nuevo Servicio</span>
                        </button>
                        <button onClick={() => setVistaActual('venta', { crear: true })}
                            className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl shadow-sm active:scale-95 bg-[#D48800] dark:bg-[#F0A500] text-white">
                            <span>🛒</span>
                            <span className="text-[12px] font-black">Nueva Venta</span>
                        </button>
                    </div>
                    <PlanificadorBlock planificador={data.planificador} setVistaActual={setVistaActual} />
                    <AgendaBlock agendaHoy={data.agendaHoy} setVistaActual={setVistaActual} />
                    <StatsBlock />
                    <AlertasBlock pptoVencidos={data.pptoVencidos} ordenesActivas={data.ordenesActivas} alertasRadar={alertasRadar} setVistaActual={setVistaActual} />
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

                {/* DESKTOP */}
                <div className="hidden md:block space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2"><StatsBlock /></div>
                        <div className="flex flex-col gap-1.5">
                            <div className="grid grid-cols-2 gap-1.5 flex-1">
                                {[
                                    { vista: 'servicio-tecnico', icon: '🔧', label: 'Servicio', border: 'border-l-[#D13A28] dark:border-l-[#E8422F]' },
                                    { vista: 'venta', icon: '🛒', label: 'Venta', border: 'border-l-[#D48800] dark:border-l-[#F0A500]' },
                                    { vista: 'presupuestos', icon: '💰', label: 'Presupuestos', border: '' },
                                    { vista: 'finanzas', icon: '💹', label: 'Finanzas', border: '' },
                                ].map(({ vista, icon, label, border }) => (
                                    <button key={vista} onClick={() => setVistaActual(vista)}
                                        className={`${card} flex items-center gap-2 p-2.5 text-left active:scale-[0.98] hover:shadow-md transition-shadow ${border ? `border-l-[3px] ${border}` : ''}`}>
                                        <span>{icon}</span>
                                        <span className="text-[11px] font-bold text-[#1C1917] dark:text-[#F0EEE9]">{label}</span>
                                    </button>
                                ))}
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
                    <AlertasBlock pptoVencidos={data.pptoVencidos} ordenesActivas={data.ordenesActivas} alertasRadar={alertasRadar} setVistaActual={setVistaActual} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <PlanificadorBlock planificador={data.planificador} setVistaActual={setVistaActual} />
                        <AgendaBlock agendaHoy={data.agendaHoy} setVistaActual={setVistaActual} />
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
