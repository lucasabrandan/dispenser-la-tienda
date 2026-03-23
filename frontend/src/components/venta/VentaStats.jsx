import React from 'react';

/**
 * VentaStats
 * Tarjetas de métricas del módulo Ventas.
 * Componente presentacional puro.
 */
export default function VentaStats({ stats }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

            {/* Total del mes */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-emerald-500 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Facturado el mes</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                    ${stats.totalMes.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    {stats.cantidadMes} ventas cobradas
                </p>
            </div>

            {/* Hoy */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-blue-500 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Hoy</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                    ${stats.totalHoy.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    {stats.cantidadHoy} ventas hoy
                </p>
            </div>

            {/* Pendientes — cantidad */}
            <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 shadow-sm ${
                stats.pendientesCount > 0
                    ? 'border-slate-200 dark:border-slate-700 border-l-amber-500'
                    : 'border-slate-200 dark:border-slate-700 border-l-slate-300'
            }`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Pendientes</p>
                <p className={`text-2xl font-black mt-1 tracking-tight ${
                    stats.pendientesCount > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
                }`}>
                    {stats.pendientesCount}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    presupuestos sin cobrar
                </p>
            </div>

            {/* Pendientes — valor */}
            <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 shadow-sm ${
                stats.pendientesVal > 0
                    ? 'border-slate-200 dark:border-slate-700 border-l-amber-400'
                    : 'border-slate-200 dark:border-slate-700 border-l-slate-300'
            }`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Por cobrar</p>
                <p className={`text-2xl font-black mt-1 tracking-tight ${
                    stats.pendientesVal > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
                }`}>
                    ${stats.pendientesVal.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    valor total pendiente
                </p>
            </div>
        </div>
    );
}