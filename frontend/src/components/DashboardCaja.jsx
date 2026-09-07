import React, { useState, useEffect, useMemo } from 'react';
import { useMontos } from '../context/MontosContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { M } from './servicio/ServicioUI';
import CierreCajaModal from './finanzas/CierreCajaModal';
import AgendaBlock from './dashboard/AgendaBlock';
import MiEspacioBoard from './miespacio/MiEspacioBoard';
import { calcTotal } from './dashboard/estadoConstants';
import { LuWrench, LuShoppingCart } from 'react-icons/lu';
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

    const data = useMemo(() => {
        const realizados = servicios.filter(s => s.estado === 'REALIZADO');
        const pendientes = servicios.filter(s => s.estado === 'PRESUPUESTO');
        const hoyItems = realizados.filter(s => s.fecha === hoyStr);
        const mesItems = realizados.filter(s => s.fecha?.startsWith(mesStr));

        const pptoVencidos = pendientes.filter(s => {
            if (!s.fecha) return false;
            return Math.floor((Date.now() - new Date(s.fecha + 'T00:00:00').getTime()) / 86400000) > 7;
        });

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
            pptoVencidos, ordenesActivas, planificador: dias,
        };
    }, [servicios, ordenes, notasAgenda]);

    const card = 'rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]';

    // "Caja de hoy y del mes" ya no vive en el Panel (Lucas, 7-sep-2026,
    // rediseno "opcion 1": redundaba con Finanzas > Balance, que ya cubre el
    // mes completo con mas detalle). data.totalHoy/totalMes/moHoy quedan
    // calculados igual por si se necesitan en otro lado, pero no se muestran
    // aca.

    // Tira al pie: todo lo que no es Agenda/Mi Espacio, comprimido en una sola
    // fila angosta (Lucas, 7-sep-2026, rediseno "opcion 1" -- ver mockup
    // "Rediseño del Panel"). Antes cada cosa (accesos directos, alertas,
    // pendientes, cierre) era su propio bloque grande arriba de todo.
    const hayAlertas = data.pptoVencidos.length + data.ordenesActivas.length + alertasRadar.length > 0;

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-page">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-6">

                {/* Header -- sin fecha (queda una sola vez, en la Agenda) */}
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-ink">Panel</h2>
                    <button onClick={cargar} disabled={cargando}
                        className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 disabled:opacity-40 bg-chip">
                        <span className={`text-sm ${cargando ? 'animate-spin' : ''}`}>↻</span>
                    </button>
                </div>

                {/* Agenda primero, despues Mi Espacio -- igual en mobile y desktop */}
                <div className="space-y-4 md:space-y-5">
                    <div className={`${card} p-3.5 md:p-4`}>
                        <AgendaBlock planificador={data.planificador} setVistaActual={setVistaActual} cargando={cargando} />
                    </div>

                    <div className={`${card} p-3.5 md:p-4`}>
                        <p className="text-label font-bold uppercase tracking-wider text-muted mb-3">Mi Espacio</p>
                        <MiEspacioBoard />
                    </div>

                    {/* Tira al pie: accesos directos en su propia fila, el resto
                        (alertas + pendientes + cierre) en otra -- Lucas, 7-sep-2026:
                        en el celu, Servicio/Venta mezclados con las alertas en la misma
                        linea quedaba muy apretado. */}
                    <div className={`${card} p-3`}>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setVistaActual('servicio-tecnico', { crear: true })}
                                className="flex items-center justify-center gap-1.5 h-9 rounded-lg text-label font-bold uppercase bg-chip text-ink active:scale-95">
                                <LuWrench size={14} /> Servicio
                            </button>
                            <button onClick={() => setVistaActual('venta', { crear: true })}
                                className="flex items-center justify-center gap-1.5 h-9 rounded-lg text-label font-bold uppercase bg-chip text-ink active:scale-95">
                                <LuShoppingCart size={14} /> Venta
                            </button>
                        </div>
                        {(hayAlertas || data.pendientesCount > 0 || esAdmin) && (
                            <div className="flex items-center justify-between gap-3 flex-wrap mt-2.5 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.05]">
                                <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                                    {data.pptoVencidos.length > 0 && (
                                        <button onClick={() => setVistaActual('presupuestos')}
                                            className="flex items-center gap-1.5 active:opacity-70">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" />
                                            <span className="text-caption font-bold text-ink whitespace-nowrap">
                                                {data.pptoVencidos.length} presupuesto{data.pptoVencidos.length !== 1 ? 's' : ''} vencido{data.pptoVencidos.length !== 1 ? 's' : ''}
                                            </span>
                                        </button>
                                    )}
                                    {data.ordenesActivas.length > 0 && (
                                        <button onClick={() => setVistaActual('servicio-tecnico', { modo: 'DESPACHO' })}
                                            className="flex items-center gap-1.5 active:opacity-70">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-amber shrink-0" />
                                            <span className="text-caption font-bold text-ink whitespace-nowrap">
                                                {data.ordenesActivas.length} orden{data.ordenesActivas.length !== 1 ? 'es' : ''} activa{data.ordenesActivas.length !== 1 ? 's' : ''}
                                            </span>
                                        </button>
                                    )}
                                    {alertasRadar.length > 0 && (
                                        <button onClick={() => setVistaActual('radar')}
                                            className="flex items-center gap-1.5 active:opacity-70">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shrink-0" />
                                            <span className="text-caption font-bold text-ink whitespace-nowrap">
                                                {alertasRadar.length} equipo{alertasRadar.length !== 1 ? 's' : ''} sin mantenim.
                                            </span>
                                        </button>
                                    )}
                                    {data.pendientesCount > 0 && (
                                        <button onClick={() => setVistaActual('presupuestos')}
                                            className="flex items-center gap-1 active:opacity-70">
                                            <span className="text-caption font-bold text-brand-amber whitespace-nowrap">
                                                {data.pendientesCount} pend. — <M valor={data.pendientesVal} />
                                            </span>
                                        </button>
                                    )}
                                </div>
                                {esAdmin && (
                                    <button onClick={() => setModalCierre(true)}
                                        className="text-label font-bold text-muted hover:text-brand-red whitespace-nowrap shrink-0">
                                        Cierre de caja →
                                    </button>
                                )}
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
