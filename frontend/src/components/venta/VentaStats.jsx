import React from 'react';
import { useMontos } from '../../context/MontosContext';

/**
 * VentaStats — tarjetas de métricas del módulo Ventas.
 * Usa el sistema de colores del proyecto, sin slate-* ni emerald-*.
 */
function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? valor.toLocaleString() : valor}
        </span>
    );
}

export default function VentaStats({ stats }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

            {/* Facturado el mes */}
            <div className="bg-[#EDEAE6] dark:bg-[#242424] p-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.07] border-l-[3px] border-l-[#D13A28]">
                <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest">Facturado el mes</p>
                <M valor={stats.totalMes} className="text-[22px] font-black text-[#1C1917] dark:text-[#F0EEE9] mt-1 block leading-none" />
                <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">
                    {stats.cantidadMes} ventas cobradas
                </p>
            </div>

            {/* Hoy */}
            <div className="bg-[#EDEAE6] dark:bg-[#242424] p-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.07]">
                <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest">Hoy</p>
                <M valor={stats.totalHoy} className="text-[22px] font-black text-[#1C1917] dark:text-[#F0EEE9] mt-1 block leading-none" />
                <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">
                    {stats.cantidadHoy} ventas hoy
                </p>
            </div>

            {/* Pendientes — cantidad */}
            <div className={`p-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.07] ${
                stats.pendientesCount > 0
                    ? 'bg-[var(--warning-bg)] border-l-[3px] border-l-[#D48800]'
                    : 'bg-[#EDEAE6] dark:bg-[#242424]'
            }`}>
                <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest">Pendientes</p>
                <p className={`text-[22px] font-black mt-1 leading-none ${
                    stats.pendientesCount > 0
                        ? 'text-[var(--warning-tx)]'
                        : 'text-[#1C1917] dark:text-[#F0EEE9]'
                }`}>
                    {stats.pendientesCount}
                </p>
                <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">
                    presupuestos sin cobrar
                </p>
            </div>

            {/* Pendientes — valor */}
            <div className={`p-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.07] ${
                stats.pendientesVal > 0
                    ? 'bg-[var(--warning-bg)] border-l-[3px] border-l-[#D48800]'
                    : 'bg-[#EDEAE6] dark:bg-[#242424]'
            }`}>
                <p className="text-[9px] font-black text-[#A8A29E] uppercase tracking-widest">Por cobrar</p>
                <M valor={stats.pendientesVal} className={`text-[22px] font-black mt-1 block leading-none ${
                    stats.pendientesVal > 0
                        ? 'text-[var(--warning-tx)]'
                        : 'text-[#1C1917] dark:text-[#F0EEE9]'
                }`} />
                <p className="text-[9px] text-[#A8A29E] font-bold mt-1 uppercase">
                    valor total pendiente
                </p>
            </div>
        </div>
    );
}
