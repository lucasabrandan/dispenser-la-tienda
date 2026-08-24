import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { generarPDFCierreCaja } from '../../utils/pdf/cierreCaja';
import DateInput from '../ui/DateInput';
import { getTodayISO, formatDateISO } from '../../utils/dateUtils';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••</span>;
    return <span className={className}>${typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}</span>;
}

const hoyISO = () => getTodayISO();
const inicioMesISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const PERIODOS_RAPIDOS = [
    { id: 'hoy',    label: 'Hoy'      },
    { id: 'semana', label: 'Semana'   },
    { id: 'mes',    label: 'Este mes' },
    { id: 'custom', label: 'Rango'    },
];

function resolverRango(periodo) {
    const hoy = hoyISO();
    if (periodo === 'hoy') return { desde: hoy, hasta: hoy };
    if (periodo === 'mes') return { desde: inicioMesISO(), hasta: hoy };
    if (periodo === 'semana') {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return { desde: formatDateISO(d), hasta: hoy };
    }
    return null;
}

export default function CierreCajaModal({ onClose, onArchivar }) {
    const [periodo, setPeriodo]         = useState('mes');
    const [desde, setDesde]             = useState(inicioMesISO());
    const [hasta, setHasta]             = useState(hoyISO());
    const [servicios, setServicios]     = useState([]);
    const [ventas, setVentas]           = useState([]);
    const [gastos, setGastos]           = useState([]);
    const [cargando, setCargando]       = useState(false);
    const [tecnicos, setTecnicos]       = useState([]);
    const [tecnicoFiltro, setTecnicoFiltro] = useState('');

    useEffect(() => {
        api.get('/ordenes/tecnicos').then(r => setTecnicos(r.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        const rango = resolverRango(periodo);
        if (rango) { setDesde(rango.desde); setHasta(rango.hasta); }
    }, [periodo]);

    useEffect(() => {
        if (desde && hasta) cargar();
    }, [desde, hasta, tecnicoFiltro]); // eslint-disable-line

    const cargar = async () => {
        setCargando(true);
        try {
            const paramsServ = { estado: 'REALIZADO', tipo: 'TECNICA', desde, hasta, page: 0, size: 500, sort: 'fechaServicio,desc' };
            const paramsVenta = { estado: 'REALIZADO', tipo: 'VENTA', desde, hasta, page: 0, size: 500, sort: 'fechaServicio,desc' };
            if (tecnicoFiltro) { paramsServ.usuarioId = tecnicoFiltro; paramsVenta.usuarioId = tecnicoFiltro; }

            const [resServ, resVenta, resGastos] = await Promise.all([
                api.get('/servicios', { params: paramsServ }),
                api.get('/servicios', { params: paramsVenta }),
                api.get('/gastos/mes?mes=' + desde.substring(0, 7)).catch(() => ({ data: [] })),
            ]);
            setServicios(resServ.data.content || resServ.data || []);
            setVentas(resVenta.data.content || resVenta.data || []);
            // Filtrar gastos por rango de fechas
            const todosGastos = resGastos.data || [];
            setGastos(todosGastos.filter(g => g.fecha >= desde && g.fecha <= hasta));
        } catch { toast.error('Error al cargar datos'); }
        finally { setCargando(false); }
    };

    const PCT_IMPUESTOS = 30;

    const calcTotal     = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;
    const calcMO        = (s) => s.items?.reduce((a, i) => a + Number(i.costoExtra || 0), 0) || 0;
    const calcRepuestos = (s) => s.items?.reduce((a, i) =>
        a + (i.repuestosUsados || []).reduce((b, r) => b + Number(r.subtotal ?? (r.precio * r.cantidad) ?? 0), 0), 0
    ) || 0;

    const liquidacion = (total, repuestos) => {
        const impuestos = Math.round(total * PCT_IMPUESTOS / 100);
        const ganancia  = total - impuestos - repuestos;
        const porPartes = Math.round(ganancia / 2);
        return { impuestos, ganancia, porPartes };
    };

    // Totales
    const totalServicios   = servicios.reduce((a, s) => a + calcTotal(s), 0);
    const totalVentas      = ventas.reduce((a, s) => a + calcTotal(s), 0);
    const totalIngresos    = totalServicios + totalVentas;
    const totalGastos      = gastos.reduce((a, g) => a + Number(g.monto || 0), 0);
    const moGeneral        = servicios.reduce((a, s) => a + calcMO(s), 0);
    const repuestosGeneral = servicios.reduce((a, s) => a + calcRepuestos(s), 0);
    const impuestosGeneral = Math.round(totalServicios * PCT_IMPUESTOS / 100);
    const netoGeneral      = totalIngresos - totalGastos - impuestosGeneral - repuestosGeneral;

    // Agrupar servicios por técnico
    const porTecnico = useMemo(() => {
        const mapa = {};
        servicios.forEach(s => {
            const key = s.usuarioNombre || 'Sin asignar';
            if (!mapa[key]) mapa[key] = { nombre: key, servicios: [], total: 0, mo: 0, repuestos: 0 };
            mapa[key].servicios.push(s);
            mapa[key].total     += calcTotal(s);
            mapa[key].mo        += calcMO(s);
            mapa[key].repuestos += calcRepuestos(s);
        });
        return Object.values(mapa).sort((a, b) => b.total - a.total);
    }, [servicios]);

    const totalItems = servicios.length + ventas.length;

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[90vh] flex flex-col bg-card shadow-2xl"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07] flex-shrink-0">
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-chip md:hidden" />
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-[18px] font-black uppercase tracking-tighter text-ink">
                                Cierre de Caja
                            </h3>
                            <p className="text-[11px] text-muted mt-0.5">Resumen del período</p>
                        </div>
                        <button onClick={onClose} className="text-muted hover:text-[#1C1917] dark:hover:text-[#F0EEE9] text-lg">✕</button>
                    </div>
                </div>

                {/* Período */}
                <div className="px-5 py-3 border-b border-black/[0.07] dark:border-white/[0.07] flex-shrink-0 space-y-2.5">
                    <div className="flex gap-2">
                        {PERIODOS_RAPIDOS.map(p => (
                            <button key={p.id} onClick={() => setPeriodo(p.id)}
                                className={`flex-1 h-8 rounded-xl font-bold text-[10px] uppercase transition-all active:scale-95 ${periodo === p.id ? 'bg-brand-red text-white' : 'bg-[#EFEDEA] dark:bg-[#2E2E2E] text-secondary'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {periodo === 'custom' && (
                        <div className="flex gap-2">
                            <DateInput value={desde} onChange={setDesde}
                                className="flex-1 h-8 px-3 rounded-xl text-[11px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EFEDEA] dark:bg-[#2E2E2E] text-ink outline-none" />
                            <DateInput value={hasta} onChange={setHasta}
                                className="flex-1 h-8 px-3 rounded-xl text-[11px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EFEDEA] dark:bg-[#2E2E2E] text-ink outline-none" />
                        </div>
                    )}
                    {tecnicos.length > 0 && (
                        <select value={tecnicoFiltro} onChange={e => setTecnicoFiltro(e.target.value)}
                            className="w-full h-8 px-3 rounded-xl text-[11px] border border-black/[0.08] dark:border-white/[0.08] bg-[#EFEDEA] dark:bg-[#2E2E2E] text-ink outline-none">
                            <option value="">Todos los técnicos</option>
                            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    )}
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {cargando ? (
                        <div className="space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse bg-[#EFEDEA] dark:bg-[#2E2E2E]" />)}
                        </div>
                    ) : totalItems === 0 && gastos.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-2xl mb-2">✅</p>
                            <p className="font-bold text-muted">Sin movimientos en el período</p>
                        </div>
                    ) : (
                        <>
                            {/* ═══ RESUMEN RÁPIDO ═══ */}
                            <div className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                <div className="p-4 bg-[#1C1917] dark:bg-[#0F0F0F]">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1">Resultado neto</p>
                                    <p className={`text-[32px] font-black leading-none ${netoGeneral >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                                        ${Math.round(netoGeneral).toLocaleString('es-AR')}
                                    </p>
                                </div>
                                <div className="p-3 space-y-1.5 bg-panel">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-secondary">🔧 Servicios ({servicios.length})</span>
                                        <span className="font-black text-ink">${Math.round(totalServicios).toLocaleString('es-AR')}</span>
                                    </div>
                                    {totalVentas > 0 && (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-secondary">🛒 Ventas ({ventas.length})</span>
                                            <span className="font-black text-ink">${Math.round(totalVentas).toLocaleString('es-AR')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-muted">− Impuestos {PCT_IMPUESTOS}%</span>
                                        <span className="font-bold text-brand-red">−${Math.round(impuestosGeneral).toLocaleString('es-AR')}</span>
                                    </div>
                                    {repuestosGeneral > 0 && (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-muted">− Repuestos</span>
                                            <span className="font-bold text-brand-red">−${Math.round(repuestosGeneral).toLocaleString('es-AR')}</span>
                                        </div>
                                    )}
                                    {totalGastos > 0 && (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-muted">− Gastos ({gastos.length})</span>
                                            <span className="font-bold text-brand-red">−${Math.round(totalGastos).toLocaleString('es-AR')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ═══ POR TÉCNICO ═══ */}
                            {porTecnico.length > 0 && (
                                <>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Liquidación por técnico</p>
                                    {porTecnico.map(tec => {
                                        const { impuestos, ganancia, porPartes } = liquidacion(tec.total, tec.repuestos);
                                        return (
                                            <div key={tec.nombre} className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                                <div className="px-4 py-3 bg-[#F5F3F1] dark:bg-[#2E2E2E] flex justify-between items-center">
                                                    <div>
                                                        <span className="font-black text-[13px] text-ink">{tec.nombre}</span>
                                                        <span className="text-[10px] text-muted ml-2">{tec.servicios.length} serv.</span>
                                                    </div>
                                                    <M valor={tec.total} className="text-[15px] font-black text-ink" />
                                                </div>
                                                <div className="px-4 py-2.5 bg-[#FFFFFF] dark:bg-[#1C1C1C] space-y-1">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-muted">− Imp. {PCT_IMPUESTOS}%</span>
                                                        <span className="text-[#D13A28]">−${impuestos.toLocaleString('es-AR')}</span>
                                                    </div>
                                                    {tec.repuestos > 0 && (
                                                        <div className="flex justify-between text-[10px]">
                                                            <span className="text-muted">− Repuestos</span>
                                                            <span className="text-[#D13A28]">−${tec.repuestos.toLocaleString('es-AR')}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-[11px] pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                                                        <span className="text-muted">Ganancia neta</span>
                                                        <span className="font-bold text-ink">${ganancia.toLocaleString('es-AR')}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.06] border-t border-black/[0.07] dark:border-white/[0.07]">
                                                    <div className="px-4 py-2.5 bg-[#EFEDEA] dark:bg-[#242424]">
                                                        <p className="text-[8px] font-bold text-muted uppercase mb-0.5">{tec.nombre.split(' ')[0]}</p>
                                                        <M valor={porPartes} className="text-[14px] font-black text-brand-amber" />
                                                    </div>
                                                    <div className="px-4 py-2.5 bg-[#EFEDEA] dark:bg-[#242424]">
                                                        <p className="text-[8px] font-bold text-muted uppercase mb-0.5">Empresa</p>
                                                        <M valor={porPartes} className="text-[14px] font-black text-ink" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* ═══ GASTOS DEL PERÍODO ═══ */}
                            {gastos.length > 0 && (
                                <>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Gastos del período</p>
                                    <div className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                        {gastos.map((g, i) => (
                                            <div key={g.id || i} className="flex justify-between px-4 py-2 text-[11px] border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-ink font-bold truncate block">{g.descripcion}</span>
                                                    <span className="text-[9px] text-muted">{g.fecha} · {g.categoria}</span>
                                                </div>
                                                <span className="font-black text-brand-red shrink-0 ml-2">
                                                    −${Math.round(Number(g.monto)).toLocaleString('es-AR')}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between px-4 py-2 bg-panel text-[11px]">
                                            <span className="font-black text-muted uppercase">Total gastos</span>
                                            <span className="font-black text-brand-red">
                                                −${Math.round(totalGastos).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ═══ DETALLE SERVICIOS ═══ */}
                            {servicios.length > 0 && (
                                <>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Detalle servicios</p>
                                    <div className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                        {servicios.map(s => (
                                            <div key={s.id} className="flex justify-between px-4 py-2 text-[11px] border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                                <span className="text-secondary truncate mr-2">{s.clienteNombre} · {s.fecha}</span>
                                                <M valor={calcTotal(s)} className="font-bold text-ink shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* ═══ DETALLE VENTAS ═══ */}
                            {ventas.length > 0 && (
                                <>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Detalle ventas</p>
                                    <div className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                        {ventas.map(v => (
                                            <div key={v.id} className="flex justify-between px-4 py-2 text-[11px] border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                                <span className="text-secondary truncate mr-2">{v.clienteNombre} · {v.fecha}</span>
                                                <M valor={calcTotal(v)} className="font-bold text-ink shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-6 pt-3 border-t border-black/[0.07] dark:border-white/[0.07] flex-shrink-0 space-y-2">
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="flex-1 h-11 rounded-2xl font-bold text-[12px] uppercase bg-[#EFEDEA] dark:bg-[#2E2E2E] text-secondary active:scale-95 transition-all">
                            Cerrar
                        </button>
                        <button
                            onClick={() => generarPDFCierreCaja({ servicios, porTecnico, totalGeneral: totalServicios, moGeneral, repuestosGeneral, desde, hasta })}
                            disabled={totalItems === 0}
                            className="flex-1 h-11 rounded-2xl font-bold text-[12px] uppercase text-white active:scale-95 transition-all disabled:opacity-40 bg-brand-red">
                            📄 PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
