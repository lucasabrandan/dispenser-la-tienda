import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { exportarGastosCSV } from '../../utils/exportarCSV';
import { getTodayISO } from '../../utils/dateUtils';
import { formatearPrecio } from '../../utils/formatearPrecio';
import Paginacion from '../ui/Paginacion';
import DateInput from '../ui/DateInput';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const POR_PAGINA = 15;
const COLORES = ['#D48800', '#D13A28', '#A8A29E', '#16A34A', '#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6'];

const inputCls = `
    px-4 py-3 rounded-xl outline-none transition-all
    bg-chip
    border border-black/[0.07] dark:border-white/[0.07]
    text-ink text-body font-bold
    focus:ring-2 focus:ring-[#D13A28]/20
    focus:border-[#D13A28] dark:focus:border-[#E8422F]
    placeholder:text-muted
`;

export default function TabGastos({ filtroMes, setFiltroMes }) {
    const [gastos,   setGastos]   = useState([]);
    const [cargando, setCargando] = useState(false);
    const [pagGastos, setPagGastos] = useState(1);
    const formVacio = { id: null, descripcion: '', monto: '', fecha: getTodayISO(), categoria: '' };
    const [form, setForm] = useState(formVacio);
    const [confirmEliminarGasto, setConfirmEliminarGasto] = useState(null);

    const cargar = () => {
        setCargando(true);
        api.get(`/gastos/mes?mes=${filtroMes}`)
            .then(r => setGastos(r.data || []))
            .catch(() => toast.error('Error al cargar gastos'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); setPagGastos(1); }, [filtroMes]); // eslint-disable-line

    const fmt = n => formatearPrecio(n);
    const totalPagGastos = Math.max(1, Math.ceil(gastos.length / POR_PAGINA));
    const gastosPagina = gastos.slice((pagGastos - 1) * POR_PAGINA, pagGastos * POR_PAGINA);

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.descripcion.trim() || !form.monto || !form.categoria.trim())
            return toast.error('Completa todos los campos');
        try {
            const data = { descripcion: form.descripcion, monto: parseFloat(form.monto), fecha: form.fecha, categoria: form.categoria };
            if (form.id) {
                await api.put(`/gastos/${form.id}`, data);
                toast.success('Gasto actualizado');
            } else {
                await api.post('/gastos', data);
                toast.success('Gasto agregado');
            }
            setForm(formVacio);
            cargar();
        } catch { toast.error('Error al guardar gasto'); }
    };

    const editarGasto = (g) => {
        setForm({ id: g.id, descripcion: g.descripcion, monto: g.monto, fecha: g.fecha, categoria: g.categoria || '' });
    };

    const handleEliminar = (id) => setConfirmEliminarGasto(id);

    const confirmarEliminar = async () => {
        const id = confirmEliminarGasto;
        setConfirmEliminarGasto(null);
        try {
            await api.delete(`/gastos/${id}`);
            toast.success('Gasto eliminado');
            cargar();
        } catch { toast.error('Error al eliminar gasto'); }
    };

    return (
        <div className="space-y-5">
            <div className="flex gap-2 items-center">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="h-8 px-2 rounded-lg text-caption font-bold outline-none bg-card text-ink shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
            </div>

            {gastos.length > 0 && (() => {
                const porCat = {};
                gastos.forEach(g => {
                    const cat = g.categoria || 'Sin categoría';
                    porCat[cat] = (porCat[cat] || 0) + parseFloat(g.monto || 0);
                });
                const dataChart = Object.entries(porCat).map(([name, value]) => ({ name, value: Math.round(value) }))
                    .sort((a, b) => b.value - a.value);
                return (
                    <div className="rounded-xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-label font-bold text-muted uppercase tracking-wider mb-2">Distribución por categoría</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={dataChart} cx="50%" cy="50%" outerRadius={75} paddingAngle={2} dataKey="value">
                                    {dataChart.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => `$${formatearPrecio(v)}`} />
                                <Legend formatter={(v) => <span className="text-label font-bold text-muted">{v}</span>} iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                );
            })()}

            <div className="rounded-xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-label font-bold text-muted uppercase tracking-wider">{form.id ? 'Editar gasto' : 'Agregar gasto'}</p>
                    {form.id && (
                        <button onClick={() => setForm(formVacio)} className="text-label font-bold text-brand-red">Cancelar</button>
                    )}
                </div>
                <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text"   placeholder="Descripción"  value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className={inputCls} />
                    <input type="text" inputMode="decimal" placeholder="Monto" value={form.monto}  onChange={e => setForm({ ...form, monto: e.target.value })}       className={inputCls} />
                    <DateInput value={form.fecha} onChange={v => setForm({ ...form, fecha: v })} className={inputCls} />
                    <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                        className={inputCls}>
                        <option value="">Categoría...</option>
                        {['Combustible', 'Herramientas', 'Vehículo', 'Insumos', 'Publicidad', 'Alquiler', 'Impuestos', 'Servicios', 'Comida', 'Otro'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={cargando}
                        className="h-9 rounded-lg bg-brand-red text-white font-bold text-label uppercase active:scale-95 md:col-span-4 disabled:opacity-50">
                        {form.id ? 'Actualizar' : 'Guardar'}
                    </button>
                </form>
            </div>

            {gastos.length === 0 ? (
                <p className="text-center text-muted py-8 font-bold text-caption uppercase">No hay gastos este mes</p>
            ) : (
                <div className="bg-card rounded-2xl overflow-hidden border-[0.5px] border-black/[0.07]">
                    <div className="flex items-center justify-between px-5 py-3 bg-panel">
                        <p className="text-label font-black text-muted uppercase tracking-wider">Gastos del mes</p>
                        <button onClick={() => exportarGastosCSV(gastos, filtroMes)}
                            className="text-label font-black text-muted uppercase hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">
                            Exportar CSV
                        </button>
                    </div>
                    {gastosPagina.map((g, i) => (
                        <div key={`g-${g.id}-${i}`} className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-body font-black text-ink truncate">{g.descripcion}</p>
                                <p className="text-caption font-bold text-muted uppercase">{g.fecha} · {g.categoria}</p>
                            </div>
                            <p className="text-body font-black text-brand-red shrink-0">${fmt(g.monto)}</p>
                            <button onClick={() => editarGasto(g)}
                                className="text-label font-bold text-muted hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors shrink-0">
                                <LuPencil size={14} />
                            </button>
                            <button onClick={() => handleEliminar(g.id)}
                                className="text-label font-bold text-muted hover:text-[#D13A28] dark:hover:text-[#E8422F] transition-colors shrink-0">
                                <LuTrash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {totalPagGastos > 1 && (
                        <div className="px-4 py-2">
                            <Paginacion pagina={pagGastos} totalPaginas={totalPagGastos} irA={setPagGastos} next={() => setPagGastos(p => Math.min(p + 1, totalPagGastos))} prev={() => setPagGastos(p => Math.max(p - 1, 1))} />
                        </div>
                    )}
                    <div className="flex justify-between items-center px-5 py-3 bg-[#EFEDEA]/50 dark:bg-[#1C1C1C]/50">
                        <p className="text-label font-black text-muted uppercase">Total</p>
                        <p className="text-body-lg font-black text-brand-amber">
                            ${fmt(gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0))}
                        </p>
                    </div>
                </div>
            )}

            {confirmEliminarGasto && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-card rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-4">
                                <p className="mb-2 flex justify-center"><LuTrash2 size={28} /></p>
                                <h3 className="text-body-lg font-black text-ink uppercase">Eliminar gasto</h3>
                                <p className="text-caption text-secondary mt-2">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminarGasto(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-label uppercase bg-chip text-secondary active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={confirmarEliminar}
                                    className="flex-[2] py-3 rounded-2xl font-black text-label uppercase text-white bg-brand-red active:scale-95">
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
