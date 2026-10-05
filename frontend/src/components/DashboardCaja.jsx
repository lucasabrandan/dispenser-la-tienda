import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CierreCajaModal from './finanzas/CierreCajaModal';
import RendicionesBlock from './dashboard/RendicionesBlock';
import BackupIndicador from './dashboard/BackupIndicador';
import AgendaSemana from './dashboard/AgendaSemana';
import FichaVisitaSheet from './dashboard/FichaVisitaSheet';
import { PAGINA } from './ui/Pantalla';
import { Seccion, ParaResolver, PlataBlock } from './dashboard/PanelBloques';
import MiEspacioChecklist from './miespacio/MiEspacioChecklist';
import { useMiEspacio } from './miespacio/useMiEspacio';
import { calcTotal } from './dashboard/estadoConstants';
import { LuWrench, LuShoppingCart, LuUserPlus, LuScanBarcode, LuHistory } from 'react-icons/lu';
import CargaPorSerieSheet from './ordenes/CargaPorSerieSheet';
import HistorialSerieSheet from './ordenes/HistorialSerieSheet';
import { getTodayISO } from '../utils/dateUtils';

// Panel (inicio) — 3-oct-2026, diseño "Panel completo". De arriba hacia abajo:
// saludo · Agenda de la semana · Para resolver · Crear · Mis tareas · Rendiciones ·
// Plata (plegada, sin montos a la vista) · backup. La plata ya no está grande arriba.

const ABIERTAS = ['PENDIENTE', 'EN_CAMINO', 'EN_SITIO'];
const diasDesde = (f) => Math.floor((Date.now() - new Date(String(f).slice(0, 10) + 'T00:00:00').getTime()) / 86400000);

export default function DashboardCaja({ setVistaActual }) {
    const [ficha, setFicha] = useState(null); // visita abierta desde la agenda
    const { esAdmin, usuario } = useAuth();
    const [modalCierre, setModalCierre] = useState(false);
    // Herramientas por N/S (clientes con tarifa mensual) — vivían en "Hoy" del técnico (5-oct-2026)
    const [cargaSerie, setCargaSerie] = useState(false);
    const [historialSerie, setHistorialSerie] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [servicios, setServicios] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [alertasRadar, setAlertasRadar] = useState([]);
    const [stockBajo, setStockBajo] = useState(0);
    const miEspacio = useMiEspacio();

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const enDosMeses = new Date(); enDosMeses.setDate(enDosMeses.getDate() + 60);
            const [sRes, oRes, rRes, pRes] = await Promise.all([
                api.get('/servicios', { params: { estado: 'PRESUPUESTO,APROBADO,EN_PROGRESO,COMPLETADO,PENDIENTE_FACTURACION,FACTURADO', page: 0, size: 500, sort: 'fechaServicio,desc' } }),
                esAdmin ? api.get('/ordenes', { params: { desde: '2020-01-01', hasta: enDosMeses.toISOString().slice(0, 10) } }) : Promise.resolve({ data: [] }),
                esAdmin ? api.get('/radar/alertas').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
                esAdmin ? api.get('/repuestos?page=0&size=500').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            ]);
            setServicios(sRes.data?.content || sRes.data || []);
            setOrdenes(Array.isArray(oRes.data) ? oRes.data : []);
            setAlertasRadar(rRes.data || []);
            const reps = pRes.data?.content || pRes.data || [];
            setStockBajo(reps.filter(r => r.stock != null && Number(r.stock) <= 3).length);
        } catch (err) { console.warn('Panel: error cargando datos', err); } finally { setCargando(false); }
    }, [esAdmin]);

    useEffect(() => { cargar(); }, [cargar]);

    const hoy = getTodayISO();

    // Para resolver: lo que pide una acción, cada cosa lleva a donde se arregla
    const alertas = useMemo(() => {
        const atrasadas = ordenes.filter(o => (ABIERTAS.includes(o.estado) && o.fechaProgramada && String(o.fechaProgramada).slice(0, 10) < hoy) || o.estado === 'NO_ATENDIDO').length;
        const sinRespuesta = servicios.filter(s => s.estado === 'PRESUPUESTO' && !s.enEspera && s.fecha && diasDesde(s.fecha) > 7);
        const masViejo = sinRespuesta.reduce((m, s) => Math.max(m, diasDesde(s.fecha)), 0);
        const out = [];
        if (atrasadas) out.push({ id: 'atr', color: 'var(--alerta)', link: 'Ver', onClick: () => setVistaActual('trabajos'),
            texto: `${atrasadas} visita${atrasadas !== 1 ? 's' : ''} atrasada${atrasadas !== 1 ? 's' : ''}` });
        if (sinRespuesta.length) out.push({ id: 'ppto', color: 'var(--etapa-hacer)', link: 'Ver', onClick: () => setVistaActual('trabajos'),
            texto: `${sinRespuesta.length} presupuesto${sinRespuesta.length !== 1 ? 's' : ''} sin respuesta (el más viejo, hace ${masViejo} días)` });
        if (alertasRadar.length) out.push({ id: 'radar', color: 'var(--etapa-hacer)', link: 'Radar', onClick: () => setVistaActual('radar'),
            texto: `${alertasRadar.length} equipo${alertasRadar.length !== 1 ? 's' : ''} con mantenimiento vencido` });
        if (stockBajo) out.push({ id: 'stock', color: 'var(--etapa-hacer)', link: 'Ver', onClick: () => setVistaActual('productos'),
            texto: `${stockBajo} producto${stockBajo !== 1 ? 's' : ''} con stock bajo` });
        return out;
    }, [ordenes, servicios, alertasRadar, stockBajo, hoy, setVistaActual]);

    const cobranza = useMemo(() => {
        const suma = (l) => ({ n: l.length, total: l.reduce((a, s) => a + (Number(s.montoFinal) > 0 ? Number(s.montoFinal) : calcTotal(s)), 0) });
        return {
            porCobrar:   suma(servicios.filter(s => s.estado === 'COMPLETADO')),
            porFacturar: suma(servicios.filter(s => s.estado === 'PENDIENTE_FACTURACION')),
            facturados:  suma(servicios.filter(s => s.estado === 'FACTURADO')),
        };
    }, [servicios]);

    const nombre = (usuario?.nombre || '').split(' ')[0];
    const fechaLarga = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const rapido = 'h-16 rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.08] flex flex-col items-center justify-center gap-1 text-caption font-black text-ink active:scale-95';

    const pull = usePullToRefresh(() => cargar());

    return (
        <div className={PAGINA} {...pull.handlers}>
            {pull.indicador}
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 md:pt-6 space-y-5">

                {/* 1. Saludo */}
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-ink">Hola{nombre ? `, ${nombre}` : ''}</h2>
                        <p className="text-caption text-muted first-letter:uppercase">{fechaLarga}</p>
                    </div>
                    <button onClick={cargar} disabled={cargando}
                        aria-label="Recargar" className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-95 disabled:opacity-40 text-muted">
                        <span className={`text-sm ${cargando ? 'animate-spin' : ''}`}>↻</span>
                    </button>
                </div>

                {/* 2. Agenda — arriba de todo (Lucas, 4-oct-2026) */}
                {esAdmin && (
                    <Seccion titulo="Agenda" link="Ver en Trabajos" onLink={() => setVistaActual('trabajos')}>
                        <div className="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] p-3">
                            <AgendaSemana ordenes={ordenes} cargando={cargando} onAbrir={setFicha} />
                        </div>
                    </Seccion>
                )}

                {/* 3. Crear — arriba (Lucas, 5-oct-2026) */}
                {esAdmin && (
                    <Seccion titulo="Crear">
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setVistaActual('trabajos', { crear: 'nuevo' })} className={rapido}>
                                <LuWrench size={18} className="text-brand-red" /> Trabajo
                            </button>
                            <button type="button" onClick={() => setVistaActual('trabajos', { crear: 'venta' })} className={rapido}>
                                <LuShoppingCart size={18} className="text-brand-red" /> Venta
                            </button>
                            <button type="button" onClick={() => setVistaActual('clientes', { crear: true })} className={rapido}>
                                <LuUserPlus size={18} className="text-brand-red" /> Cliente
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button type="button" onClick={() => setCargaSerie(true)}
                                className="h-11 rounded-xl text-label font-bold text-ink bg-card border border-black/[0.06] dark:border-white/[0.06] active:scale-95 flex items-center justify-center gap-1.5">
                                <LuScanBarcode size={15} /> Cargar por N/S
                            </button>
                            <button type="button" onClick={() => setHistorialSerie(true)}
                                className="h-11 rounded-xl text-label font-bold text-ink bg-card border border-black/[0.06] dark:border-white/[0.06] active:scale-95 flex items-center justify-center gap-1.5">
                                <LuHistory size={15} /> Historial de un equipo
                            </button>
                        </div>
                    </Seccion>
                )}

                {/* 4. Mis tareas */}
                <Seccion titulo="Mis tareas" link="Mi espacio" onLink={() => setVistaActual('mi-espacio')}>
                    <div className="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06] p-3.5">
                        <MiEspacioChecklist espacio={miEspacio.espacio} actualizar={miEspacio.actualizar} cargando={miEspacio.cargando} />
                    </div>
                </Seccion>

                {/* 5. Para resolver — debajo de Mis tareas */}
                {esAdmin && (
                    <Seccion titulo="Para resolver">
                        {cargando ? <div className="h-12 rounded-xl bg-card animate-pulse" /> : <ParaResolver alertas={alertas} />}
                    </Seccion>
                )}

                {/* 6. Rendiciones (solo aparece si hay algo para recibir) */}
                {esAdmin && <RendicionesBlock card="rounded-2xl bg-card border border-black/[0.06] dark:border-white/[0.06]" />}

                {/* 7. Plata — plegada */}
                {esAdmin && (
                    <Seccion titulo="Plata">
                        <PlataBlock cobranza={cobranza}
                            onVerTrabajos={() => setVistaActual('trabajos')}
                            onFinanzas={() => setVistaActual('finanzas')}
                            onCierreCaja={() => setModalCierre(true)} />
                    </Seccion>
                )}

                {/* 8. Sistema */}
                {esAdmin && <BackupIndicador />}
            </div>

            {ficha && (
                <FichaVisitaSheet orden={ficha} onCerrar={() => setFicha(null)}
                    onVerTrabajos={() => { setFicha(null); setVistaActual('trabajos'); }}
                    onEliminada={() => { setFicha(null); cargar(); }} />
            )}
            {modalCierre && (
                <CierreCajaModal
                    onClose={() => setModalCierre(false)}
                    onArchivar={() => { setModalCierre(false); cargar(); }}
                />
            )}
            {cargaSerie && <CargaPorSerieSheet onClose={() => setCargaSerie(false)} onGuardado={cargar} />}
            {historialSerie && <HistorialSerieSheet onClose={() => setHistorialSerie(false)} />}
        </div>
    );
}
