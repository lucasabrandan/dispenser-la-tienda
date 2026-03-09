import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export default function DashboardFinanzas() {
    const [stats, setStats] = useState({
        facturacion: 0,
        costoRepuestos: 0,
        gastosVarios: 0,
        gananciaReal: 0,
        transacciones: []
    });

    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));

    useEffect(() => {
        cargarMetricas();
    }, [filtroMes]);

    const cargarMetricas = async () => {
        try {
            // Aquí llamaríamos a un endpoint de analíticas que vamos a crear
            const res = await api.get(`/stats/mensual?mes=${filtroMes}`);
            setStats(res.data);
        } catch (err) {
            // Mock de datos para que veas cómo queda el diseño ahora mismo
            setStats({
                facturacion: 450000,
                costoRepuestos: 120000,
                gastosVarios: 35000,
                gananciaReal: 295000,
                transacciones: [
                    { id: 1, fecha: '2026-03-01', concepto: 'Service Sanatorio Guemes', costo: 4500, venta: 12000, tipo: 'TRABAJO' },
                    { id: 2, fecha: '2026-03-02', concepto: 'Venta Dispenser IVESS', costo: 85000, venta: 160000, tipo: 'VENTA' },
                ]
            });
        }
    };

    return (
        <div className="p-2 md:p-6 space-y-8 animate-fade-in">
            {/* 🗓️ FILTRO DE FECHA */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Balance Real</h2>
                <input 
                    type="month" 
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl font-black text-blue-600 outline-none border-none"
                />
            </div>

            {/* 💰 TARJETAS KPI (Los 4 Pilares) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Facturación" value={stats.facturacion} color="blue" icon="💸" subtitle="Total Bruto" />
                <StatCard title="Costos Directos" value={stats.costoRepuestos} color="rose" icon="🛠️" subtitle="Inversión Repuestos" />
                <StatCard title="Ganancia Real" value={stats.gananciaReal} color="emerald" icon="💎" subtitle="Lo que queda en mano" highlight />
                <StatCard title="Gastos/Inversión" value={stats.gastosVarios} color="amber" icon="📉" subtitle="Ropa, Publicidad, Nafta" />
            </div>

            {/* 📊 TABLA DE DETALLE DE RENTABILIDAD */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Desglose de Operaciones</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-400">
                            <tr>
                                <th className="px-8 py-4 text-left">Concepto</th>
                                <th className="px-8 py-4 text-center">Costo</th>
                                <th className="px-8 py-4 text-center">Venta</th>
                                <th className="px-8 py-4 text-center">Margen %</th>
                                <th className="px-8 py-4 text-right">Limpia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {stats.transacciones.map(t => {
                                const limpia = t.venta - t.costo;
                                const margen = ((limpia / t.venta) * 100).toFixed(0);
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-900 dark:text-white text-sm uppercase">{t.concepto}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{t.fecha} • {t.tipo}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center font-bold text-rose-500">${t.costo.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-center font-bold text-blue-500">${t.venta.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black">
                                                {margen}%
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white">${limpia.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color, icon, subtitle, highlight }) {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30',
        rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30',
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
    };

    return (
        <div className={`p-8 rounded-[2.5rem] border ${colors[color]} shadow-sm ${highlight ? 'ring-4 ring-emerald-500/10' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">{icon}</span>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
            </div>
            <h4 className="text-3xl font-black mb-1">${value.toLocaleString()}</h4>
            <p className="text-[9px] font-bold uppercase tracking-tight opacity-60">{subtitle}</p>
        </div>
    );
}