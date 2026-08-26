import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { exportarBalanceCSV } from '../../utils/exportarCSV';
import { formatearPrecio } from '../../utils/formatearPrecio';
import Paginacion from '../ui/Paginacion';
import StatCard from './StatCard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const POR_PAGINA = 15;

export default function TabBalance({ filtroMes, setFiltroMes }) {
    const { ocultar } = useMontos();
    const [stats,    setStats]    = useState({ facturacion: 0, costoRepuestos: 0, gastosVarios: 0, gananciaReal: 0, transacciones: [] });
    const [cargando, setCargando] = useState(false);
    const [pagTx, setPagTx] = useState(1);

    const cargar = () => {
        setCargando(true);
        api.get(`/servicios/stats/mensual?mes=${filtroMes}`)
            .then(r => setStats({ facturacion: 0, costoRepuestos: 0, gastosVarios: 0, gananciaReal: 0, transacciones: [], ...r.data }))
            .catch(() => toast.error('Error al cargar balance'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); setPagTx(1); }, [filtroMes]); // eslint-disable-line

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(v)}`;
    const imp = stats.facturacion * 0.30;
    const totalPagTx = Math.max(1, Math.ceil(stats.transacciones.length / POR_PAGINA));
    const txPagina = stats.transacciones.slice((pagTx - 1) * POR_PAGINA, pagTx * POR_PAGINA);
    const gananciaNeta = stats.facturacion - imp - stats.costoRepuestos - stats.gastosVarios;

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-center">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="h-8 px-2 rounded-lg text-label font-bold outline-none bg-card text-ink shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                <button onClick={() => exportarBalanceCSV(stats, filtroMes)}
                    className="h-8 px-3 rounded-lg text-label font-bold uppercase bg-card text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                    CSV
                </button>
                {cargando && <span className="text-caption text-muted animate-pulse">Cargando...</span>}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Facturación"    value={stats.facturacion}    sub="Total bruto"        variante="gold"    ocultar={ocultar} />
                <StatCard label="Impuestos 30%"  value={imp}                  sub="Estimado fiscal"    variante="red"     ocultar={ocultar} />
                <StatCard label="Costos"         value={stats.costoRepuestos + stats.gastosVarios} sub="Repuestos + gastos" variante="muted" ocultar={ocultar} />
                <StatCard label="Ganancia neta"  value={gananciaNeta}         sub="Lo que queda"       variante="redBold" ocultar={ocultar} />
            </div>

            <div className="rounded-xl bg-card p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                <p className="text-label font-bold text-muted uppercase tracking-wider mb-3">Desglose del mes</p>
                {[
                    { label: 'Facturación bruta',            valor: stats.facturacion,    color: 'text-brand-amber' },
                    { label: '− Impuestos (30%)',            valor: imp,                  color: 'text-brand-red' },
                    { label: '− Repuestos / costos directos', valor: stats.costoRepuestos, color: 'text-brand-red' },
                    { label: '− Gastos operacionales',       valor: stats.gastosVarios,   color: 'text-brand-red' },
                ].map(({ label, valor, color }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                        <p className="text-caption font-bold text-muted">{label}</p>
                        <p className={`text-body font-black ${color}`}>{fmt(valor)}</p>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1">
                    <p className="text-body-lg font-black text-ink">= Ganancia neta</p>
                    <p className="text-title font-black text-brand-amber">{fmt(gananciaNeta)}</p>
                </div>
            </div>

            {stats.facturacion > 0 && (
                <div className="rounded-xl bg-card p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <p className="text-label font-bold text-muted uppercase tracking-wider mb-2">Distribución</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Ganancia', value: Math.max(gananciaNeta, 0) },
                                    { name: 'Impuestos', value: imp },
                                    { name: 'Repuestos', value: stats.costoRepuestos },
                                    { name: 'Gastos', value: stats.gastosVarios },
                                ].filter(d => d.value > 0)}
                                cx="50%" cy="50%"
                                innerRadius={55} outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {['#16A34A', '#D13A28', '#A8A29E', '#D48800'].map((c, i) => (
                                    <Cell key={i} fill={c} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v) => `$${formatearPrecio(v)}`} />
                            <Legend
                                formatter={(v) => <span className="text-label font-bold text-muted">{v}</span>}
                                iconSize={8}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {stats.transacciones.length > 0 && (
                <div className="bg-card rounded-2xl overflow-hidden border-[0.5px] border-black/[0.07]">
                    <div className="px-5 py-3 bg-panel">
                        <p className="text-label font-black text-muted uppercase tracking-wider">Operaciones del mes</p>
                    </div>
                    {txPagina.map((t, idx) => {
                        const costo  = parseFloat(t.costo || 0);
                        const venta  = parseFloat(t.venta || 0);
                        const margen = venta > 0 ? Math.round((venta - costo) / venta * 100) : 0;
                        return (
                            <div key={`tx-${t.id}-${idx}`} className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-body font-black text-ink truncate">{t.concepto}</p>
                                    <p className="text-caption font-bold text-muted uppercase">{t.fecha} · {t.tipo}</p>
                                </div>
                                <span className="text-label font-black px-2 py-0.5 rounded-full bg-[#D48800]/10 text-[#D48800] dark:bg-[#F0A500]/10 dark:text-[#F0A500] shrink-0">{margen}%</span>
                                <p className="text-body font-black text-ink shrink-0">{fmt(venta - costo)}</p>
                            </div>
                        );
                    })}
                    {totalPagTx > 1 && (
                        <div className="px-4 py-2">
                            <Paginacion pagina={pagTx} totalPaginas={totalPagTx} irA={setPagTx} next={() => setPagTx(p => Math.min(p + 1, totalPagTx))} prev={() => setPagTx(p => Math.max(p - 1, 1))} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
