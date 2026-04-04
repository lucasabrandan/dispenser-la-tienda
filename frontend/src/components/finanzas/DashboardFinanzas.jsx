import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

// Estilo base para inputs del formulario
const inputCls = `
    px-4 py-3 rounded-xl outline-none transition-all
    bg-[#C0BCB6] dark:bg-[#2E2E2E]
    border border-black/[0.07] dark:border-white/[0.07]
    text-[#1C1917] dark:text-[#F0EEE9] text-sm font-bold
    focus:ring-2 focus:ring-[#D13A28]/20
    focus:border-[#D13A28] dark:focus:border-[#E8422F]
    placeholder:text-[#A8A29E]
`;

export default function DashboardFinanzas() {
    const [stats, setStats] = useState({
        facturacion: 0, costoRepuestos: 0,
        gastosVarios: 0, gananciaReal: 0, transacciones: []
    });
    const [gastos, setGastos]       = useState([]);
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));
    const [cargando, setCargando]   = useState(false);
    const [formGasto, setFormGasto] = useState({
        descripcion: '', monto: '',
        fecha: new Date().toISOString().split('T')[0], categoria: ''
    });

    useEffect(() => { cargarDatos(); }, [filtroMes]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const resStats = await api.get(`/servicios/stats/mensual?mes=${filtroMes}`);
            setStats({
                facturacion:    resStats.data.facturacion    || 0,
                costoRepuestos: resStats.data.costoRepuestos || 0,
                gastosVarios:   resStats.data.gastosVarios   || 0,
                gananciaReal:   resStats.data.gananciaReal   || 0,
                transacciones:  resStats.data.transacciones  || []
            });
            const resGastos = await api.get(`/gastos/mes?mes=${filtroMes}`);
            setGastos(resGastos.data || []);
        } catch {
            toast.error('Error al cargar datos financieros');
            setStats({ facturacion: 0, costoRepuestos: 0, gastosVarios: 0, gananciaReal: 0, transacciones: [] });
            setGastos([]);
        } finally {
            setCargando(false);
        }
    };

    const handleAgregarGasto = async (e) => {
        e.preventDefault();
        if (!formGasto.descripcion.trim() || !formGasto.monto || !formGasto.categoria.trim())
            return toast.error('Completa todos los campos');
        try {
            await api.post('/gastos', {
                descripcion: formGasto.descripcion,
                monto:       parseFloat(formGasto.monto),
                fecha:       formGasto.fecha,
                categoria:   formGasto.categoria
            });
            toast.success('Gasto agregado');
            setFormGasto({ descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], categoria: '' });
            cargarDatos();
        } catch {
            toast.error('Error al agregar gasto');
        }
    };

    const handleEliminarGasto = async (id) => {
        if (!window.confirm('¿Eliminar este gasto?')) return;
        try {
            await api.delete(`/gastos/${id}`);
            toast.success('Gasto eliminado');
            cargarDatos();
        } catch {
            toast.error('Error al eliminar gasto');
        }
    };

    const fmt = (n) => (typeof n === 'number' ? n : parseFloat(n || 0)).toLocaleString('es-AR');

    return (
        <div className="w-full max-w-7xl mx-auto px-4 pb-20 bg-[#C8C4BE] dark:bg-[#141414] min-h-screen transition-colors space-y-5 pt-5">

            {/* Header con selector de mes */}
            <div className="flex justify-between items-center bg-[#EDEAE6] dark:bg-[#242424] p-5 rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07]">
                <div>
                    <h2 className="text-3xl font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase tracking-tighter leading-none">Balance Real</h2>
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase mt-1">Resumen financiero del mes</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="month" value={filtroMes}
                        onChange={e => setFiltroMes(e.target.value)}
                        className={`${inputCls} text-[13px]`}
                    />
                    <button onClick={cargarDatos} disabled={cargando}
                        className="px-4 py-3 rounded-xl bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-[11px] uppercase hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                        {cargando ? 'Cargando...' : 'Actualizar'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Facturación"     value={stats.facturacion}     sub="Total bruto"              variante="gold"    />
                <StatCard label="Costos Directos" value={stats.costoRepuestos}  sub="Inversión repuestos"      variante="red"     />
                <StatCard label="Ganancia Real"   value={stats.gananciaReal}    sub="Lo que queda en mano"     variante="redBold" />
                <StatCard label="Gastos/Inv."     value={stats.gastosVarios}    sub="Gastos operacionales"     variante="muted"   />
            </div>

            {/* Formulario agregar gasto */}
            <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07] p-6">
                <h3 className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase mb-4">Agregar Gasto</h3>
                <form onSubmit={handleAgregarGasto} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text" placeholder="Descripción (ej: Alquiler)" value={formGasto.descripcion}
                        onChange={e => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                        className={inputCls} />
                    <input type="number" placeholder="Monto" step="0.01" value={formGasto.monto}
                        onChange={e => setFormGasto({ ...formGasto, monto: e.target.value })}
                        className={inputCls} />
                    <input type="date" value={formGasto.fecha}
                        onChange={e => setFormGasto({ ...formGasto, fecha: e.target.value })}
                        className={inputCls} />
                    <input type="text" placeholder="Categoría (ej: Alquiler)" value={formGasto.categoria}
                        onChange={e => setFormGasto({ ...formGasto, categoria: e.target.value })}
                        className={inputCls} />
                    <button type="submit"
                        className="px-6 py-3 rounded-xl bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-[11px] uppercase hover:opacity-90 transition-all active:scale-95 md:col-span-4">
                        Guardar Gasto
                    </button>
                </form>
            </div>

            {/* Tabla de gastos */}
            {gastos.length > 0 ? (
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07] overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                        <h3 className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">Gastos del Mes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[10px] uppercase font-black text-[#A8A29E]">
                                <tr>
                                    <th className="px-6 py-3 text-left">Descripción</th>
                                    <th className="px-6 py-3 text-center">Categoría</th>
                                    <th className="px-6 py-3 text-center">Fecha</th>
                                    <th className="px-6 py-3 text-right">Monto</th>
                                    <th className="px-6 py-3 text-center">—</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                                {gastos.map((gasto, idx) => (
                                    <tr key={`gasto-${gasto.id}-${idx}`} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-[#1C1917] dark:text-[#F0EEE9] text-sm">{gasto.descripcion}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] px-3 py-1 rounded-full text-[9px] font-black uppercase">
                                                {gasto.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-[#A8A29E] text-sm">{gasto.fecha}</td>
                                        <td className="px-6 py-4 text-right font-black text-[#D13A28] dark:text-[#E8422F]">
                                            ${fmt(gasto.monto)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleEliminarGasto(gasto.id)}
                                                className="px-3 py-1 rounded-lg bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] hover:bg-[#D13A28] hover:text-white dark:hover:bg-[#E8422F] font-black text-[10px] uppercase transition-all active:scale-95">
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-[#D48800]/5 dark:bg-[#F0A500]/5">
                                    <td colSpan="3" className="px-6 py-4 font-black text-[#1C1917] dark:text-[#F0EEE9] text-right text-[11px] uppercase">Total gastos:</td>
                                    <td className="px-6 py-4 text-right font-black text-[#D48800] dark:text-[#F0A500] text-lg">
                                        ${fmt(gastos.reduce((sum, g) => sum + parseFloat(g.monto || 0), 0))}
                                    </td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07] p-8 text-center">
                    <p className="text-[#A8A29E] font-bold text-sm uppercase">No hay gastos registrados para este mes</p>
                </div>
            )}

            {/* Tabla de operaciones */}
            {stats.transacciones.length > 0 ? (
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07] overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/[0.07] dark:border-white/[0.07]">
                        <h3 className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">Desglose de Operaciones</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#D8D4CE] dark:bg-[#1C1C1C] text-[10px] uppercase font-black text-[#A8A29E]">
                                <tr>
                                    <th className="px-6 py-3 text-left">Concepto</th>
                                    <th className="px-6 py-3 text-center">Costo</th>
                                    <th className="px-6 py-3 text-center">Venta</th>
                                    <th className="px-6 py-3 text-center">Margen</th>
                                    <th className="px-6 py-3 text-right">Neto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                                {stats.transacciones.map((t, idx) => {
                                    const costo  = parseFloat(t.costo  || 0);
                                    const venta  = parseFloat(t.venta  || 0);
                                    const limpia = venta - costo;
                                    const margen = venta > 0 ? ((limpia / venta) * 100).toFixed(0) : 0;
                                    return (
                                        <tr key={`tx-${t.id}-${idx}`} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-black text-[#1C1917] dark:text-[#F0EEE9] text-[12px] uppercase">{t.concepto}</p>
                                                <p className="text-[9px] font-bold text-[#A8A29E] uppercase">{t.fecha} · {t.tipo}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-[#D13A28] dark:text-[#E8422F] text-sm">${fmt(costo)}</td>
                                            <td className="px-6 py-4 text-center font-bold text-[#D48800] dark:text-[#F0A500] text-sm">${fmt(venta)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-[#D48800]/10 dark:bg-[#F0A500]/10 text-[#D48800] dark:text-[#F0A500] px-2.5 py-1 rounded-full text-[9px] font-black">
                                                    {margen}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-[#1C1917] dark:text-[#F0EEE9] text-sm">${fmt(limpia)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-[2rem] border border-black/[0.07] dark:border-white/[0.07] p-8 text-center">
                    <p className="text-[#A8A29E] font-bold text-sm uppercase">No hay transacciones de servicios para este mes</p>
                </div>
            )}
        </div>
    );
}

// Tarjeta de estadística con variantes del sistema de color
function StatCard({ label, value, sub, variante }) {
    const num = parseFloat(value || 0);

    const estilos = {
        gold: {
            wrap: 'bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-[#D48800]/20 dark:border-[#F0A500]/20',
            val:  'text-[#D48800] dark:text-[#F0A500]',
        },
        red: {
            wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/20 dark:border-[#E8422F]/20',
            val:  'text-[#D13A28] dark:text-[#E8422F]',
        },
        redBold: {
            wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/30 dark:border-[#E8422F]/30 ring-2 ring-[#D13A28]/20 dark:ring-[#E8422F]/20',
            val:  'text-[#D13A28] dark:text-[#E8422F]',
        },
        muted: {
            wrap: 'bg-[#EDEAE6] dark:bg-[#242424] border-black/[0.07] dark:border-white/[0.07]',
            val:  'text-[#1C1917] dark:text-[#F0EEE9]',
        },
    };

    const { wrap, val } = estilos[variante];

    return (
        <div className={`p-5 rounded-[1.5rem] border ${wrap}`}>
            <p className="text-[9px] font-black uppercase text-[#A8A29E] tracking-widest mb-3">{label}</p>
            <p className={`text-2xl font-black ${val}`}>${num.toLocaleString('es-AR')}</p>
            <p className="text-[9px] font-bold text-[#A8A29E] uppercase mt-1">{sub}</p>
        </div>
    );
}
