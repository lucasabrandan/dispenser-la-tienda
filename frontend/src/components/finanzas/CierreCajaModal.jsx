import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { generarPDFCierreCaja } from '../../utils/pdf/cierreCaja';

function M({ valor, className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••</span>;
    return <span className={className}>${typeof valor === 'number' ? valor.toLocaleString() : valor}</span>;
}

const hoyISO = () => new Date().toISOString().split('T')[0];
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
        const desde = d.toISOString().split('T')[0];
        return { desde, hasta: hoy };
    }
    return null;
}

export default function CierreCajaModal({ onClose, onArchivar }) {
    const [periodo, setPeriodo]     = useState('mes');
    const [desde, setDesde]         = useState(inicioMesISO());
    const [hasta, setHasta]         = useState(hoyISO());
    const [servicios, setServicios] = useState([]);
    const [cargando, setCargando]   = useState(false);
    const [cerrando, setCerrando]   = useState(false);
    const [cerrado, setCerrado]     = useState(false);

    useEffect(() => {
        const rango = resolverRango(periodo);
        if (rango) { setDesde(rango.desde); setHasta(rango.hasta); }
    }, [periodo]);

    useEffect(() => {
        if (desde && hasta) cargar();
    }, [desde, hasta]); // eslint-disable-line

    const cargar = async () => {
        setCargando(true);
        try {
            const res = await api.get('/servicios', {
                params: { estado: 'REALIZADO', desde, hasta, page: 0, size: 500, sort: 'fechaServicio,desc' }
            });
            setServicios(res.data.content || res.data || []);
        } catch { toast.error('Error al cargar datos'); }
        finally { setCargando(false); }
    };

    const PCT_IMPUESTOS = 30;

    const calcTotal     = (s) => s.items?.reduce((a, i) => a + Number(i.costo || 0), 0) || 0;
    const calcMO        = (s) => s.items?.reduce((a, i) => a + Number(i.costoExtra || 0), 0) || 0;
    const calcRepuestos = (s) => s.items?.reduce((a, i) =>
        a + (i.repuestosUsados || []).reduce((b, r) => b + Number(r.subtotal ?? (r.precio * r.cantidad) ?? 0), 0), 0
    ) || 0;

    // Liquidación por técnico: total − impuestos 30% − repuestos = ganancia neta ÷ 2
    const liquidacion = (total, repuestos) => {
        const impuestos = Math.round(total * PCT_IMPUESTOS / 100);
        const ganancia  = total - impuestos - repuestos;
        const porPartes = Math.round(ganancia / 2);
        return { impuestos, ganancia, porPartes };
    };

    // Agrupar por técnico
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

    const totalGeneral     = servicios.reduce((a, s) => a + calcTotal(s), 0);
    const moGeneral        = servicios.reduce((a, s) => a + calcMO(s), 0);
    const repuestosGeneral = servicios.reduce((a, s) => a + calcRepuestos(s), 0);

    const archivarPeriodo = async () => {
        if (!window.confirm(`¿Archivar ${servicios.length} servicio${servicios.length !== 1 ? 's' : ''} del período? Se moverán a Archivados y no aparecerán en la vista principal.`)) return;
        setCerrando(true);
        const t = toast.loading('Archivando período...');
        try {
            await Promise.all(servicios.map(s =>
                api.patch(`/servicios/${s.id}/estado`, { estado: 'ARCHIVADO' })
            ));
            toast.success(`✅ ${servicios.length} servicios archivados`, { id: t });
            setCerrado(true);
            if (onArchivar) onArchivar();
        } catch { toast.error('Error al archivar', { id: t }); }
        finally { setCerrando(false); }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[90vh] flex flex-col bg-[#EDEAE6] dark:bg-[#242424] shadow-2xl"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07] flex-shrink-0">
                    <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-[#C0BCB6] dark:bg-[#2E2E2E] md:hidden" />
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-[18px] font-black uppercase tracking-tighter text-[#1C1917] dark:text-[#F0EEE9]">
                                Cierre de Caja
                            </h3>
                            <p className="text-[11px] text-[#A8A29E] mt-0.5">Resumen de trabajos realizados por período</p>
                        </div>
                        <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F0EEE9] text-lg">✕</button>
                    </div>
                </div>

                {/* Período */}
                <div className="px-5 py-4 border-b border-black/[0.07] dark:border-white/[0.07] flex-shrink-0 space-y-3">
                    <div className="flex gap-2">
                        {PERIODOS_RAPIDOS.map(p => (
                            <button key={p.id} onClick={() => setPeriodo(p.id)}
                                className={`flex-1 h-9 rounded-xl font-bold text-[11px] uppercase transition-all active:scale-95 ${periodo === p.id ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {periodo === 'custom' && (
                        <div className="flex gap-2">
                            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-xl text-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none" />
                            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-xl text-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none" />
                        </div>
                    )}
                    {!cargando && (
                        <p className="text-[10px] text-[#A8A29E]">
                            {desde} → {hasta} · <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">{servicios.length} servicios realizados</span>
                        </p>
                    )}
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {cargando ? (
                        <div className="space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse bg-[#D8D4CE] dark:bg-[#2E2E2E]" />)}
                        </div>
                    ) : servicios.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-2xl mb-2">✅</p>
                            <p className="font-bold text-[#A8A29E]">Sin servicios realizados en el período</p>
                        </div>
                    ) : (
                        <>
                            {/* Total general */}
                            <div className="rounded-2xl p-4 bg-[#D13A28] dark:bg-[#E8422F]">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">Total período</p>
                                <M valor={totalGeneral} className="text-[28px] font-black text-white leading-none block" />
                                <div className="flex gap-4 mt-1.5">
                                    <span className="text-[10px] text-white/70">{servicios.length} servicios</span>
                                    {moGeneral > 0 && <span className="text-[10px] font-bold text-white/90">MO: <M valor={moGeneral} /></span>}
                                </div>
                            </div>

                            {/* Por técnico */}
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] px-1">Por técnico</p>
                            {porTecnico.map(tec => (
                                <div key={tec.nombre} className="rounded-2xl p-4 bg-[#D8D4CE] dark:bg-[#1C1C1C] border border-black/[0.07] dark:border-white/[0.07]">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]">{tec.nombre}</p>
                                            <p className="text-[10px] text-[#A8A29E]">{tec.servicios.length} servicio{tec.servicios.length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <M valor={tec.total} className="text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                                    </div>
                                    {tec.mo > 0 && (
                                        <div className="flex justify-between text-[11px] pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                                            <span className="text-[#A8A29E]">Mano de obra</span>
                                            <span className="font-bold text-[#D48800] dark:text-[#F0A500]"><M valor={tec.mo} /></span>
                                        </div>
                                    )}
                                    {/* Listado de servicios del técnico */}
                                    <div className="mt-2 space-y-1">
                                        {tec.servicios.map(s => (
                                            <div key={s.id} className="flex justify-between text-[11px]">
                                                <span className="text-[#57534E] dark:text-[#9E9A94] truncate mr-2">{s.clienteNombre}</span>
                                                <M valor={calcTotal(s)} className="font-bold text-[#1C1917] dark:text-[#F0EEE9] shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Liquidación */}
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] px-1 pt-2">Liquidación ({PCT_IMPUESTOS}% imp.)</p>
                            {porTecnico.map(tec => {
                                const { impuestos, ganancia, porPartes } = liquidacion(tec.total, tec.repuestos);
                                return (
                                    <div key={`liq-${tec.nombre}`} className="rounded-2xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
                                        {/* Cabecera técnico */}
                                        <div className="px-4 py-2.5 bg-[#C8C4BE] dark:bg-[#2E2E2E] flex justify-between items-center">
                                            <span className="font-black text-[13px] text-[#1C1917] dark:text-[#F0EEE9]">{tec.nombre}</span>
                                            <span className="text-[11px] text-[#A8A29E]">cobrado: <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">${tec.total.toLocaleString('es-AR')}</span></span>
                                        </div>
                                        {/* Desglose */}
                                        <div className="px-4 py-3 bg-[#EDEAE6] dark:bg-[#1C1C1C] space-y-1.5">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-[#A8A29E]">− Impuestos {PCT_IMPUESTOS}%</span>
                                                <M valor={impuestos} className="text-[#D13A28] dark:text-[#E8422F] font-bold" />
                                            </div>
                                            {tec.repuestos > 0 && (
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-[#A8A29E]">− Repuestos</span>
                                                    <M valor={tec.repuestos} className="text-[#D13A28] dark:text-[#E8422F] font-bold" />
                                                </div>
                                            )}
                                            <div className="flex justify-between text-[12px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                                                <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">= Ganancia neta</span>
                                                <M valor={ganancia} className="font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                                            </div>
                                        </div>
                                        {/* Split 50/50 */}
                                        <div className="grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.06] border-t border-black/[0.07] dark:border-white/[0.07]">
                                            <div className="px-4 py-3 bg-[#D8D4CE] dark:bg-[#242424]">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">{tec.nombre.split(' ')[0]}</p>
                                                <M valor={porPartes} className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                                            </div>
                                            <div className="px-4 py-3 bg-[#D8D4CE] dark:bg-[#242424]">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">Empresa</p>
                                                <M valor={porPartes} className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Resumen total liquidación si hay más de un técnico */}
                            {porTecnico.length > 1 && (() => {
                                const { impuestos, ganancia, porPartes } = liquidacion(totalGeneral, repuestosGeneral);
                                return (
                                    <div className="rounded-2xl p-4 bg-[#0D2B5B] dark:bg-[#0D2B5B]">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-2">Total general liquidado</p>
                                        <div className="space-y-1 mb-3">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-white/60">− Impuestos {PCT_IMPUESTOS}%</span>
                                                <span className="font-bold text-white/80">${impuestos.toLocaleString('es-AR')}</span>
                                            </div>
                                            {repuestosGeneral > 0 && (
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-white/60">− Repuestos</span>
                                                    <span className="font-bold text-white/80">${repuestosGeneral.toLocaleString('es-AR')}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-[13px] pt-1 border-t border-white/10">
                                                <span className="font-bold text-white">= Ganancia neta</span>
                                                <span className="font-black text-white">${ganancia.toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-xl p-3 bg-white/10">
                                                <p className="text-[9px] font-bold text-white/60 uppercase mb-1">Técnicos (total)</p>
                                                <span className="text-[15px] font-black text-white">${porPartes.toLocaleString('es-AR')}</span>
                                            </div>
                                            <div className="rounded-xl p-3 bg-white/10">
                                                <p className="text-[9px] font-bold text-white/60 uppercase mb-1">Empresa</p>
                                                <span className="text-[15px] font-black text-white">${porPartes.toLocaleString('es-AR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!cerrado ? (
                    <div className="px-5 pb-6 pt-3 border-t border-black/[0.07] dark:border-white/[0.07] flex-shrink-0 space-y-2">
                        <div className="flex gap-3">
                            <button onClick={onClose}
                                className="flex-1 h-11 rounded-2xl font-bold text-[12px] uppercase bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95 transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={archivarPeriodo}
                                disabled={cerrando || servicios.length === 0}
                                className="flex-1 h-11 rounded-2xl font-bold text-[12px] uppercase text-white active:scale-95 transition-all disabled:opacity-40 bg-[#D13A28] dark:bg-[#E8422F]">
                                {cerrando ? 'Archivando...' : `🗄️ Archivar período (${servicios.length})`}
                            </button>
                        </div>
                        <button
                            onClick={() => generarPDFCierreCaja({ servicios, porTecnico, totalGeneral, moGeneral, repuestosGeneral, desde, hasta })}
                            disabled={servicios.length === 0}
                            className="w-full h-9 rounded-2xl font-bold text-[11px] uppercase active:scale-95 transition-all disabled:opacity-40 bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]">
                            📄 Descargar PDF del período
                        </button>
                    </div>
                ) : (
                    <div className="px-5 pb-6 pt-3 border-t border-black/[0.07] dark:border-white/[0.07] flex-shrink-0 space-y-2">
                        <button onClick={onClose}
                            className="w-full h-11 rounded-2xl font-bold text-[12px] uppercase text-white bg-[#1C1917] dark:bg-[#F0EEE9] dark:text-[#1C1917] active:scale-95 transition-all">
                            ✅ Período cerrado — Cerrar
                        </button>
                        <button
                            onClick={() => generarPDFCierreCaja({ servicios, porTecnico, totalGeneral, moGeneral, repuestosGeneral, desde, hasta })}
                            className="w-full h-9 rounded-2xl font-bold text-[11px] uppercase active:scale-95 transition-all bg-[#D8D4CE] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]">
                            📄 Descargar PDF del período
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
