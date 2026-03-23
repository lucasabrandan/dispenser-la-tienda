import React from 'react';
import { useCajaData } from '../hooks/useCajaData';

/**
 * DashboardCaja
 * Pantalla de inicio — muestra el resumen del día,
 * accesos rápidos y últimos movimientos.
 *
 * No crea ni modifica nada — es una vista de lectura.
 * Las acciones redirigen a sus secciones correspondientes.
 */
export default function DashboardCaja({ setVistaActual }) {
    const { stats, cargando, recargar } = useCajaData();

    const hoy = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    const calcularTotal = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const badgeEstado = (s) => {
        if (s.estado === 'PRESUPUESTO') return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
        if (s.estado === 'REALIZADO')   return { label: 'Cobrado',   cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
        return { label: s.estado, cls: 'bg-slate-100 text-slate-600' };
    };

    const tipoIcon = (s) => s.servicioTipo === 'TECNICA' ? '🔧' : '🛒';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-28 font-sans transition-colors">

            {/* FECHA + REFRESH */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                        Caja
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 capitalize mt-1">{hoy}</p>
                </div>
                <button
                    onClick={recargar}
                    disabled={cargando}
                    className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all active:scale-90 disabled:opacity-40"
                >
                    🔄
                </button>
            </div>

            {/* MÉTRICAS HOY */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-blue-500 shadow-sm col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Facturado hoy</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white mt-1 tracking-tighter">
                        ${stats.totalHoy.toLocaleString()}
                    </p>
                    <div className="flex gap-4 mt-2">
                        <span className="text-[10px] font-bold text-slate-400">
                            🔧 {stats.serviciosHoy} servicios
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                            🛒 {stats.ventasHoy} ventas
                        </span>
                        {stats.moHoy > 0 && (
                            <span className="text-[10px] font-bold text-emerald-500">
                                💰 MO: ${stats.moHoy.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-emerald-500 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Este mes</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        ${stats.totalMes.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                        {stats.serviciosMes + stats.ventasMes} operaciones
                    </p>
                </div>

                <div
                    onClick={() => setVistaActual('presupuestos')}
                    className={`p-5 rounded-2xl border border-l-4 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-95 ${
                        stats.pendientesCount > 0
                            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 border-l-amber-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-l-slate-300'
                    }`}
                >
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Pendientes</p>
                    <p className={`text-2xl font-black mt-1 ${stats.pendientesCount > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                        {stats.pendientesCount}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                        {stats.pendientesCount > 0 ? `$${stats.pendientesVal.toLocaleString()} por cobrar` : 'Todo cobrado ✅'}
                    </p>
                </div>
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setVistaActual('servicio-tecnico')}
                    className="bg-rose-500 hover:bg-rose-600 text-white p-5 rounded-2xl text-left shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                    <p className="text-2xl mb-2">🔧</p>
                    <p className="font-black text-sm uppercase">Nuevo Servicio</p>
                    <p className="text-[10px] text-rose-200 mt-0.5 font-bold">Técnico + presupuesto</p>
                </button>

                <button
                    onClick={() => setVistaActual('venta')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-5 rounded-2xl text-left shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                    <p className="text-2xl mb-2">🛒</p>
                    <p className="font-black text-sm uppercase">Nueva Venta</p>
                    <p className="text-[10px] text-emerald-200 mt-0.5 font-bold">Insumos + mostrador</p>
                </button>

                <button
                    onClick={() => setVistaActual('historial')}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl text-left hover:shadow-md active:scale-95 transition-all"
                >
                    <p className="text-2xl mb-2">📋</p>
                    <p className="font-black text-sm uppercase text-slate-900 dark:text-white">Historial</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">Todos los registros</p>
                </button>

                <button
                    onClick={() => setVistaActual('presupuestos')}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl text-left hover:shadow-md active:scale-95 transition-all"
                >
                    <p className="text-2xl mb-2">💰</p>
                    <p className="font-black text-sm uppercase text-slate-900 dark:text-white">Presupuestos</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                        {stats.pendientesCount > 0
                            ? `${stats.pendientesCount} pendiente${stats.pendientesCount > 1 ? 's' : ''}`
                            : 'Sin pendientes'}
                    </p>
                </button>
            </div>

            {/* ÚLTIMOS MOVIMIENTOS */}
            <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 px-1">
                    Últimos movimientos
                </h3>

                {cargando ? (
                    <div className="text-center py-10 text-slate-400 font-bold">⏳ Cargando...</div>
                ) : stats.ultimos.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-400 font-bold">Sin movimientos aún</p>
                        <p className="text-xs text-slate-300 mt-1">Los servicios y ventas aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {stats.ultimos.map(s => {
                            const badge = badgeEstado(s);
                            const total = calcularTotal(s);
                            return (
                                <div key={s.id}
                                    className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">

                                    {/* Icono tipo */}
                                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                                        {tipoIcon(s)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                            {s.clienteNombre}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">
                                            {s.sedeNombre} · {s.fecha}
                                        </p>
                                    </div>

                                    {/* Estado + Monto */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-black text-sm text-slate-900 dark:text-white">
                                            ${total.toLocaleString()}
                                        </p>
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${badge.cls}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Ver todo */}
                        <button
                            onClick={() => setVistaActual('historial')}
                            className="text-center py-3 text-blue-500 font-black text-xs uppercase tracking-widest hover:text-blue-600 transition-colors"
                        >
                            Ver historial completo →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}