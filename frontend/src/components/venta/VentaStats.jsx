import React from 'react';
import { useMontos } from '../../context/MontosContext';

function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>······</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}
        </span>
    );
}

const card = 'rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05] p-3.5';

export default function VentaStats({ stats }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className={`${card} border-l-[3px] border-l-[#D13A28] dark:border-l-[#E8422F]`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Facturado mes</p>
                <M valor={stats.totalMes} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                <p className="text-[10px] text-[#A8A29E] mt-0.5">{stats.cantidadMes} cobradas</p>
            </div>

            <div className={card}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Hoy</p>
                <M valor={stats.totalHoy} className="text-xl font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                <p className="text-[10px] text-[#A8A29E] mt-0.5">{stats.cantidadHoy} ventas</p>
            </div>

            <div className={`${card} ${stats.pendientesCount > 0 ? 'border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]' : ''}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Pendientes</p>
                <p className={`text-xl font-black ${stats.pendientesCount > 0 ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                    {stats.pendientesCount}
                </p>
                <p className="text-[10px] text-[#A8A29E] mt-0.5">sin cobrar</p>
            </div>

            <div className={`${card} ${stats.pendientesVal > 0 ? 'border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]' : ''}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Por cobrar</p>
                <M valor={stats.pendientesVal} className={`text-xl font-black block ${stats.pendientesVal > 0 ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`} />
                <p className="text-[10px] text-[#A8A29E] mt-0.5">valor pendiente</p>
            </div>

            {stats.gananciaTotal > 0 && (
                <div className={`${card} border-l-[3px] border-l-[#D48800] dark:border-l-[#F0A500]`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">Ganancia mes</p>
                    <M valor={stats.gananciaTotal} className="text-xl font-black text-[#D48800] dark:text-[#F0A500] block" />
                    <p className="text-[10px] text-[#A8A29E] mt-0.5">
                        {stats.totalMes > 0 ? `${Math.round((stats.gananciaTotal / stats.totalMes) * 100)}% margen` : 'margen neto'}
                    </p>
                </div>
            )}
        </div>
    );
}
