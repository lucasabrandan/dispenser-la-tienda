import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { exportarBalanceCSV } from '../../utils/exportarCSV';
import { formatearPrecio, formatearPrecioCompacto } from '../../utils/formatearPrecio';
import { MESES_ES } from '../../utils/dateUtils';
import { useTheme } from '../../hooks/useTheme';
import Paginacion from '../ui/Paginacion';
import StatCard from './StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const POR_PAGINA = 15;

export default function TabBalance({ filtroMes }) {
    const { ocultar } = useMontos();
    const { isDark } = useTheme();
    // Recharts dibuja SVG puro — las clases dark: de Tailwind no le llegan,
    // hay que resolver el color a mano segun el tema activo (mismo patron que TabSueldo).
    const colorVerde = isDark ? '#4ADE80' : '#16A34A';
    const colorAmbar = isDark ? '#F0A500' : '#D48800';
    const colorRojo = isDark ? '#E8422F' : '#D13A28';
    const [stats,    setStats]    = useState({ facturacion: 0, costoRepuestos: 0, gastosVarios: 0, gananciaReal: 0, transacciones: [] });
    const [cargando, setCargando] = useState(false);
    const [pagTx, setPagTx] = useState(1);
    const [evolucion, setEvolucion] = useState([]);

    const cargar = () => {
        setCargando(true);
        api.get(`/servicios/stats/mensual?mes=${filtroMes}`)
            .then(r => setStats({ facturacion: 0, costoRepuestos: 0, gastosVarios: 0, gananciaReal: 0, transacciones: [], ...r.data }))
            .catch(() => toast.error('Error al cargar balance'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); setPagTx(1); }, [filtroMes]); // eslint-disable-line

    useEffect(() => {
        const [y, m] = filtroMes.split('-').map(Number);
        const meses = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(y, m - 1 - (5 - i), 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        });
        Promise.all(meses.map(mesStr =>
            api.get(`/servicios/stats/mensual?mes=${mesStr}`)
                .then(r => ({ mesStr, ...r.data }))
                .catch(() => ({ mesStr, facturacion: 0, costoRepuestos: 0, gastosVarios: 0 }))
        )).then(resultados => {
            setEvolucion(resultados.map(r => {
                const fact = Number(r.facturacion || 0);
                const impMes = fact * 0.30;
                const gananciaMes = fact - impMes - Number(r.costoRepuestos || 0) - Number(r.gastosVarios || 0);
                const mm = parseInt(r.mesStr.substring(5), 10);
                return {
                    mesLabel: MESES_ES[mm] || r.mesStr,
                    'Facturación': Math.round(fact),
                    'Ganancia neta': Math.round(gananciaMes),
                };
            }));
        });
    }, [filtroMes]); // eslint-disable-line

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(v)}`;
    const imp = stats.facturacion * 0.30;
    const totalPagTx = Math.max(1, Math.ceil(stats.transacciones.length / POR_PAGINA));
    const txPagina = stats.transacciones.slice((pagTx - 1) * POR_PAGINA, pagTx * POR_PAGINA);
    const gananciaNeta = stats.facturacion - imp - stats.costoRepuestos - stats.gastosVarios;
    const margenNeto = stats.facturacion > 0 ? Math.round(gananciaNeta / stats.facturacion * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="flex gap-2 items-center">
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
                <StatCard label="Ganancia neta"  value={gananciaNeta}         sub={`Margen neto: ${margenNeto}%`} variante="redBold" ocultar={ocultar} />
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

            {evolucion.length > 1 && (
                <div className="rounded-xl bg-card p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <p className="text-label font-bold text-muted uppercase tracking-wider mb-2">Evolución mensual</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={evolucion}>
                            <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: '#A8A29E' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#A8A29E' }} width={55}
                                tickFormatter={v => `$${formatearPrecioCompacto(v)}`} />
                            <Tooltip formatter={(v, name) => [`$${formatearPrecio(v)}`, name]} contentStyle={{ fontSize: 11 }} />
                            <Legend formatter={(v) => <span className="text-label font-bold text-muted">{v}</span>} iconSize={8} />
                            <Bar dataKey="Facturación" fill={colorAmbar} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Ganancia neta" radius={[4, 4, 0, 0]}>
                                {evolucion.map((entry, i) => (
                                    <Cell key={i} fill={entry['Ganancia neta'] >= 0 ? colorVerde : colorRojo} />
                                ))}
                            </Bar>
                        </BarChart>
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
