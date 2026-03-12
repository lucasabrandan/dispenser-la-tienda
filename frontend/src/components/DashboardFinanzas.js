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
 
    const [gastos, setGastos] = useState([]);
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));
    const [cargando, setCargando] = useState(false);
 
    // Estado del formulario de gasto
    const [formGasto, setFormGasto] = useState({
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        categoria: ''
    });
 
    useEffect(() => {
        cargarDatos();
    }, [filtroMes]);
 
    const cargarDatos = async () => {
        setCargando(true);
        try {
            // Cargar estadísticas
            const resStats = await api.get(`/servicios/stats/mensual?mes=${filtroMes}`);
            setStats({
                facturacion: resStats.data.facturacion || 0,
                costoRepuestos: resStats.data.costoRepuestos || 0,
                gastosVarios: resStats.data.gastosVarios || 0,
                gananciaReal: resStats.data.gananciaReal || 0,
                transacciones: resStats.data.transacciones || []
            });
 
            // Cargar gastos del mes
            const resGastos = await api.get(`/gastos/mes?mes=${filtroMes}`);
            setGastos(resGastos.data || []);
 
            setCargando(false);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            toast.error('Error al cargar datos financieros');
            setStats({
                facturacion: 0,
                costoRepuestos: 0,
                gastosVarios: 0,
                gananciaReal: 0,
                transacciones: []
            });
            setGastos([]);
            setCargando(false);
        }
    };
 
    const handleAgregarGasto = async (e) => {
        e.preventDefault();
 
        if (!formGasto.descripcion.trim() || !formGasto.monto || !formGasto.categoria.trim()) {
            toast.error('Completa todos los campos');
            return;
        }
 
        try {
            await api.post('/gastos', {
                descripcion: formGasto.descripcion,
                monto: parseFloat(formGasto.monto),
                fecha: formGasto.fecha,
                categoria: formGasto.categoria
            });
 
            toast.success('Gasto agregado ✓');
            setFormGasto({
                descripcion: '',
                monto: '',
                fecha: new Date().toISOString().split('T')[0],
                categoria: ''
            });
 
            // Recargar datos
            cargarDatos();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Error al agregar gasto');
        }
    };
 
    const handleEliminarGasto = async (id) => {
        if (!window.confirm('¿Eliminar este gasto?')) return;
 
        try {
            await api.delete(`/gastos/${id}`);
            toast.success('Gasto eliminado ✓');
            cargarDatos();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Error al eliminar gasto');
        }
    };
 
    return (
        <div className="p-2 md:p-6 space-y-8 animate-fade-in">
            {/* 🗓️ FILTRO DE FECHA */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Balance Real</h2>
                <div className="flex items-center gap-4">
                    <input 
                        type="month" 
                        value={filtroMes}
                        onChange={(e) => setFiltroMes(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl font-black text-blue-600 outline-none border-none"
                    />
                    <button
                        onClick={cargarDatos}
                        disabled={cargando}
                        className={`px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm transition-all ${cargando ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {cargando ? '⏳ Cargando...' : '🔄 Actualizar'}
                    </button>
                </div>
            </div>
 
            {/* 💰 TARJETAS KPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Facturación" value={stats.facturacion} color="blue" icon="💸" subtitle="Total Bruto" />
                <StatCard title="Costos Directos" value={stats.costoRepuestos} color="rose" icon="🛠️" subtitle="Inversión Repuestos" />
                <StatCard title="Ganancia Real" value={stats.gananciaReal} color="emerald" icon="💎" subtitle="Lo que queda en mano" highlight />
                <StatCard title="Gastos/Inversión" value={stats.gastosVarios} color="amber" icon="📉" subtitle="Gastos operacionales" />
            </div>
 
            {/* ➕ FORMULARIO PARA AGREGAR GASTO */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 p-8">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-6">➕ Agregar Gasto</h3>
                
                <form onSubmit={handleAgregarGasto} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Descripción (ej: Alquiler)"
                        value={formGasto.descripcion}
                        onChange={(e) => setFormGasto({...formGasto, descripcion: e.target.value})}
                        className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <input
                        type="number"
                        placeholder="Monto"
                        step="0.01"
                        value={formGasto.monto}
                        onChange={(e) => setFormGasto({...formGasto, monto: e.target.value})}
                        className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <input
                        type="date"
                        value={formGasto.fecha}
                        onChange={(e) => setFormGasto({...formGasto, fecha: e.target.value})}
                        className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <input
                        type="text"
                        placeholder="Categoría (ej: Alquiler)"
                        value={formGasto.categoria}
                        onChange={(e) => setFormGasto({...formGasto, categoria: e.target.value})}
                        className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
 
                    <button
                        type="submit"
                        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all md:col-span-4 active:scale-95"
                    >
                        ✓ Guardar Gasto
                    </button>
                </form>
            </div>
 
            {/* 📊 TABLA DE GASTOS DEL MES */}
            {gastos.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">📋 Gastos del Mes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-400">
                                <tr>
                                    <th className="px-8 py-4 text-left">Descripción</th>
                                    <th className="px-8 py-4 text-center">Categoría</th>
                                    <th className="px-8 py-4 text-center">Fecha</th>
                                    <th className="px-8 py-4 text-right">Monto</th>
                                    <th className="px-8 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {gastos.map(gasto => (
                                    <tr key={gasto.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-900 dark:text-white text-sm">{gasto.descripcion}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-[10px] font-black">
                                                {gasto.categoria}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                                            {gasto.fecha}
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-red-600 dark:text-red-400">
                                            ${parseFloat(gasto.monto).toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => handleEliminarGasto(gasto.id)}
                                                className="px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 font-black text-xs transition-all active:scale-95"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-amber-50 dark:bg-amber-900/10">
                                    <td colSpan="3" className="px-8 py-4 font-black text-slate-900 dark:text-white text-right">
                                        TOTAL GASTOS:
                                    </td>
                                    <td className="px-8 py-4 text-right font-black text-amber-600 dark:text-amber-400 text-lg">
                                        ${gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0).toLocaleString()}
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-slate-500 dark:text-slate-400 font-bold">No hay gastos registrados para este mes</p>
                </div>
            )}
 
            {/* 📊 TABLA DE TRANSACCIONES DE SERVICIOS */}
            {stats.transacciones.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Desglose de Operaciones (Servicios)</h3>
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
                                    const costo = typeof t.costo === 'number' ? t.costo : parseFloat(t.costo || 0);
                                    const venta = typeof t.venta === 'number' ? t.venta : parseFloat(t.venta || 0);
                                    const limpia = venta - costo;
                                    const margen = venta > 0 ? ((limpia / venta) * 100).toFixed(0) : 0;
                                    
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="font-black text-slate-900 dark:text-white text-sm uppercase">{t.concepto}</p>
                                                <p className="text-[9px] font-bold text-slate-400">{t.fecha} • {t.tipo}</p>
                                            </td>
                                            <td className="px-8 py-6 text-center font-bold text-rose-500">${costo.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-center font-bold text-blue-500">${venta.toLocaleString()}</td>
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
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-slate-500 dark:text-slate-400 font-bold">No hay transacciones de servicios para este mes</p>
                </div>
            )}
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
 
    const numValue = typeof value === 'number' ? value : parseFloat(value || 0);
 
    return (
        <div className={`p-8 rounded-[2.5rem] border ${colors[color]} shadow-sm ${highlight ? 'ring-4 ring-emerald-500/10' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">{icon}</span>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
            </div>
            <h4 className="text-3xl font-black mb-1">${numValue.toLocaleString()}</h4>
            <p className="text-[9px] font-bold uppercase tracking-tight opacity-60">{subtitle}</p>
        </div>
    );
}