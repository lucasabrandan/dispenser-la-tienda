import React from 'react';
import { useCajaData } from '../hooks/useCajaData';
import { useMontos } from '../context/MontosContext';

// ── Helper: muestra monto o puntitos según estado global ────────────────────
function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? valor.toLocaleString() : valor}
        </span>
    );
}

export default function DashboardCaja({ setVistaActual }) {
    const { stats, cargando, recargar } = useCajaData();

    const hoy = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    const calcularTotal = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    // Badges de estado — sistema de colores del proyecto
    const badgeEstado = (s) => {
        if (s.estado === 'PRESUPUESTO') return {
            label: 'Pendiente',
            cls: 'bg-[var(--warning-bg)] text-[var(--warning-tx)] dark:bg-[var(--warning-bg)] dark:text-[var(--warning-tx)]'
        };
        if (s.estado === 'REALIZADO') return {
            label: 'Cobrado',
            cls: 'bg-[var(--success-bg)] text-[var(--success-tx)] dark:bg-[var(--success-bg)] dark:text-[var(--success-tx)]'
        };
        return {
            label: s.estado,
            cls: 'bg-[#C0BCB6] text-[#57534E] dark:bg-[#2E2E2E] dark:text-[#9E9A94]'
        };
    };

    const tipoIcon = (s) => s.servicioTipo === 'TECNICA' ? '🔧' : '🛒';

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#C8C4BE] dark:bg-[#141414] transition-colors">

            {/* ── HEADER ───────────────────────────────────────────────── */}
            <div className="px-4 md:px-0 pt-5 md:pt-0 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-[32px] md:text-[28px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                            Caja
                        </h2>
                        <p className="text-[11px] font-medium capitalize mt-1 text-[#A8A29E]">
                            {hoy}
                        </p>
                    </div>
                    <button
                        onClick={recargar}
                        disabled={cargando}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 bg-[#C0BCB6] dark:bg-[#2E2E2E] border border-black/[0.07] dark:border-white/[0.07]"
                    >
                        <span className={`text-base ${cargando ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-0 space-y-3">

                {/* ── FACTURADO HOY ─────────────────────────────────────── */}
                <div
                    className="rounded-2xl p-4 md:p-5 bg-[#EDEAE6] dark:bg-[#242424]"
                    style={{ border: '0.5px solid rgba(0,0,0,0.07)', borderLeft: '3px solid #D13A28' }}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">
                        Facturado hoy
                    </p>
                    <M
                        valor={stats.totalHoy}
                        className="text-[40px] font-black tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9] block"
                    />
                    <div className="flex gap-4 mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                        <span className="text-[10px] font-medium text-[#A8A29E]">
                            🔧 {stats.serviciosHoy} servicios
                        </span>
                        <span className="text-[10px] font-medium text-[#A8A29E]">
                            🛒 {stats.ventasHoy} ventas
                        </span>
                        {stats.moHoy > 0 && (
                            <span className="text-[10px] font-bold text-[#D48800] dark:text-[#F0A500]">
                                💰 MO: <M valor={stats.moHoy} />
                            </span>
                        )}
                    </div>
                </div>

                {/* ── MÉTRICAS SECUNDARIAS ───────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">
                            Este mes
                        </p>
                        <M
                            valor={stats.totalMes}
                            className="text-[22px] font-black leading-none text-[#1C1917] dark:text-[#F0EEE9] block"
                        />
                        <p className="text-[9px] font-medium mt-1 uppercase text-[#A8A29E]">
                            {stats.serviciosMes + stats.ventasMes} operaciones
                        </p>
                    </div>

                    <button
                        onClick={() => setVistaActual('presupuestos')}
                        className={`rounded-2xl p-4 text-left transition-all active:scale-95 border border-black/[0.07] dark:border-white/[0.07] ${
                            stats.pendientesCount > 0
                                ? 'bg-[var(--warning-bg)]'
                                : 'bg-[#EDEAE6] dark:bg-[#242424]'
                        }`}
                    >
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#A8A29E]">
                            Pendientes
                        </p>
                        <p className={`text-[22px] font-black leading-none ${
                            stats.pendientesCount > 0
                                ? 'text-[var(--warning-tx)]'
                                : 'text-[#1C1917] dark:text-[#F0EEE9]'
                        }`}>
                            {stats.pendientesCount}
                        </p>
                        <p className="text-[9px] font-medium mt-1 uppercase text-[#A8A29E]">
                            {stats.pendientesCount > 0
                                ? <M valor={stats.pendientesVal} />
                                : 'Todo cobrado ✅'}
                            {stats.pendientesCount > 0 && ' por cobrar'}
                        </p>
                    </button>
                </div>

                {/* ── ACCESOS RÁPIDOS ────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setVistaActual('servicio-tecnico')}
                        className="rounded-2xl p-4 text-left transition-all active:scale-95 hover:opacity-90 bg-[#D13A28] dark:bg-[#E8422F]"
                    >
                        <p className="text-xl mb-2">🔧</p>
                        <p className="font-black text-[13px] text-white uppercase leading-tight">
                            Nuevo Servicio
                        </p>
                        <p className="text-[10px] font-medium mt-0.5 text-white/60">
                            Técnico + presupuesto
                        </p>
                    </button>

                    <button
                        onClick={() => setVistaActual('venta')}
                        className="rounded-2xl p-4 text-left transition-all active:scale-95 hover:opacity-90 bg-[#D48800] dark:bg-[#F0A500]"
                    >
                        <p className="text-xl mb-2">🛒</p>
                        <p className="font-black text-[13px] text-white uppercase leading-tight">
                            Nueva Venta
                        </p>
                        <p className="text-[10px] font-medium mt-0.5 text-white/60">
                            Insumos + mostrador
                        </p>
                    </button>

                    <button
                        onClick={() => setVistaActual('historial')}
                        className="rounded-2xl p-4 text-left transition-all active:scale-95 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                    >
                        <p className="text-xl mb-2">📋</p>
                        <p className="font-black text-[13px] uppercase leading-tight text-[#1C1917] dark:text-[#F0EEE9]">
                            Historial
                        </p>
                        <p className="text-[10px] font-medium mt-0.5 text-[#A8A29E]">
                            Todos los registros
                        </p>
                    </button>

                    <button
                        onClick={() => setVistaActual('presupuestos')}
                        className="rounded-2xl p-4 text-left transition-all active:scale-95 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]"
                    >
                        <p className="text-xl mb-2">💰</p>
                        <p className="font-black text-[13px] uppercase leading-tight text-[#1C1917] dark:text-[#F0EEE9]">
                            Presupuestos
                        </p>
                        <p className="text-[10px] font-medium mt-0.5 text-[#A8A29E]">
                            {stats.pendientesCount > 0
                                ? `${stats.pendientesCount} pendiente${stats.pendientesCount > 1 ? 's' : ''}`
                                : 'Sin pendientes'}
                        </p>
                    </button>
                </div>

                {/* ── ÚLTIMOS MOVIMIENTOS ───────────────────────────────── */}
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] mb-3 px-1 text-[#A8A29E]">
                        Últimos movimientos
                    </p>

                    {cargando ? (
                        <div className="text-center py-10 text-sm font-bold text-[#A8A29E]">
                            Cargando...
                        </div>
                    ) : stats.ultimos.length === 0 ? (
                        <div className="text-center py-10 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                            <p className="font-bold text-sm text-[#A8A29E]">Sin movimientos aún</p>
                            <p className="text-xs mt-1 text-[#A8A29E]">Los servicios y ventas aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {stats.ultimos.map(s => {
                                const badge = badgeEstado(s);
                                const total = calcularTotal(s);
                                return (
                                    <div key={s.id}
                                         className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 bg-[#C0BCB6] dark:bg-[#2E2E2E]">
                                            {tipoIcon(s)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate text-[#1C1917] dark:text-[#F0EEE9]">
                                                {s.clienteNombre}
                                            </p>
                                            <p className="text-[10px] truncate text-[#A8A29E]">
                                                {s.sedeNombre} · {s.fecha}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <M
                                                valor={total}
                                                className="font-black text-sm text-[#1C1917] dark:text-[#F0EEE9] block"
                                            />
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            <button
                                onClick={() => setVistaActual('historial')}
                                className="text-center py-3 font-bold text-xs uppercase tracking-widest text-[#D13A28] dark:text-[#E8422F] hover:opacity-75 transition-opacity"
                            >
                                Ver historial completo →
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}