import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generarPDFHistorialCliente } from '../../utils/pdf/historialCliente';

function formatFecha(f) {
    if (!f) return '-';
    return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function badgeEstado(estado) {
    if (estado === 'REALIZADO')   return 'bg-[#16A34A]/15 text-[#16A34A]';
    if (estado === 'PRESUPUESTO') return 'bg-[#D48800]/15 text-[#D48800]';
    if (estado === 'RECHAZADO')   return 'bg-[#D13A28]/15 text-[#D13A28]';
    return 'bg-[#E8E5E0] text-[#57534E]';
}
function labelEstado(estado) {
    if (estado === 'REALIZADO')   return 'Realizado';
    if (estado === 'PRESUPUESTO') return 'Presupuesto';
    if (estado === 'RECHAZADO')   return 'Rechazado';
    return estado;
}

// Total de un servicio sumando items (con descuento)
function calcTotal(s) {
    const sub = (s.items || []).reduce((acc, it) => {
        return acc + Number(it.costo || 0) + Number(it.costoExtra || 0);
    }, 0);
    const pct = Number(s.descuentoPorcentaje || 0);
    return pct > 0 ? sub * (1 - pct / 100) : sub;
}

export default function HistorialClienteModal({ cliente, onClose }) {
    const { esAdmin } = useAuth();
    const [servicios, setServicios] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!cliente?.id) return;
        setCargando(true);
        api.get('/servicios', { params: { clienteId: cliente.id, size: 200, sort: 'fechaServicio,desc' } })
            .then(r => setServicios(r.data.content || []))
            .catch(() => setServicios([]))
            .finally(() => setCargando(false));
    }, [cliente?.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={onClose}>
            <div
                className="w-full sm:max-w-2xl bg-[#FFFFFF] dark:bg-[#1C1C1C] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.07] shrink-0">
                    <div>
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-widest">Historial técnico</p>
                        <h2 className="text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase leading-none mt-0.5">
                            {cliente?.nombre}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {esAdmin && servicios.length > 0 && (
                            <button onClick={() => generarPDFHistorialCliente({ cliente, servicios })}
                                className="h-9 px-3 flex items-center justify-center rounded-2xl bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-[10px] uppercase hover:opacity-90 active:scale-95 transition-all">
                                PDF
                            </button>
                        )}
                        <button onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E] font-black text-sm hover:opacity-70 transition-opacity">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Contenido scrolleable */}
                <div className="overflow-y-auto flex-1 px-4 py-4 space-y-2">
                    {cargando && (
                        <p className="text-center text-[11px] font-bold text-[#A8A29E] uppercase py-10">Cargando...</p>
                    )}
                    {!cargando && servicios.length === 0 && (
                        <p className="text-center text-[11px] font-bold text-[#A8A29E] uppercase py-10">Sin servicios registrados</p>
                    )}
                    {!cargando && servicios.map(s => {
                        const equipos = (s.items || []).map(it => it.equipoSerial).filter(Boolean).join(', ');
                        const trabajos = (s.items || []).map(it => it.trabajoRealizado).filter(Boolean).join(' · ');
                        const tecnicos = [...new Set((s.items || []).map(it => it.tecnico).filter(Boolean))].join(', ');
                        const total = calcTotal(s);

                        return (
                            <div key={s.id}
                                className="bg-[#EFEDEA] dark:bg-[#242424] rounded-2xl px-4 py-3 flex gap-3 items-start">
                                <div className="flex-1 min-w-0 space-y-1">
                                    {/* Fila: fecha + estado */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black text-[#A8A29E]">{formatFecha(s.fecha)}</span>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase ${badgeEstado(s.estado)}`}>
                                            {labelEstado(s.estado)}
                                        </span>
                                        {s.servicioTipo === 'TECNICA' && (
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-lg uppercase bg-[#D13A28]/10 text-[#D13A28] dark:text-[#E8422F]">
                                                Técnica
                                            </span>
                                        )}
                                    </div>
                                    {/* Equipos */}
                                    {equipos && (
                                        <p className="text-[10px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">
                                            🔧 {equipos}
                                        </p>
                                    )}
                                    {/* Trabajo realizado */}
                                    {trabajos && (
                                        <p className="text-[10px] text-[#57534E] dark:text-[#9E9A94] line-clamp-2">{trabajos}</p>
                                    )}
                                    {/* Técnico asignado */}
                                    {tecnicos && (
                                        <p className="text-[9px] font-bold text-[#A8A29E] uppercase">👷 {tecnicos}</p>
                                    )}
                                </div>

                                {/* Monto — solo admin */}
                                {esAdmin && total > 0 && (
                                    <div className="shrink-0 text-right">
                                        <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                                            ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                {!cargando && servicios.length > 0 && (
                    <div className="px-5 py-3 border-t border-black/[0.07] dark:border-white/[0.07] shrink-0">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase text-center">
                            {servicios.length} registro{servicios.length !== 1 ? 's' : ''}
                            {esAdmin && ` · Total: $${servicios.reduce((acc, s) => acc + calcTotal(s), 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
