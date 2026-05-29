import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { exportarGastosCSV, exportarBalanceCSV } from '../../utils/exportarCSV';
import { getTodayISO } from '../../utils/dateUtils';
import { generarPDFRendimientoTecnicos } from '../../utils/pdf/rendimientoTecnicos';
import { formatearPrecio, formatearPrecioCompacto } from '../../utils/formatearPrecio';
import CierreCajaModal from './CierreCajaModal';
import Paginacion from '../ui/Paginacion';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DateInput from '../ui/DateInput';

const POR_PAGINA = 15;

const COLORES = ['#D48800', '#D13A28', '#A8A29E', '#16A34A', '#8B5CF6', '#3B82F6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6'];

const inputCls = `
    px-4 py-3 rounded-xl outline-none transition-all
    bg-[#E8E5E0] dark:bg-[#2E2E2E]
    border border-black/[0.07] dark:border-white/[0.07]
    text-[#1C1917] dark:text-[#F0EEE9] text-sm font-bold
    focus:ring-2 focus:ring-[#D13A28]/20
    focus:border-[#D13A28] dark:focus:border-[#E8422F]
    placeholder:text-[#A8A29E]
`;

// ── Tab Balance ────────────────────────────────────────────────────────────────
function TabBalance({ filtroMes, setFiltroMes }) {
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
    // Ganancia neta real = facturación − impuestos 30% − repuestos − gastos
    const gananciaNeta = stats.facturacion - imp - stats.costoRepuestos - stats.gastosVarios;

    return (
        <div className="space-y-4">
            {/* Controles mes */}
            <div className="flex gap-2 items-center">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                <button onClick={() => exportarBalanceCSV(stats, filtroMes)}
                    className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] active:scale-95">
                    CSV
                </button>
                {cargando && <span className="text-[10px] text-[#A8A29E] animate-pulse">Cargando...</span>}
            </div>

            {/* Cards resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Facturación"    value={stats.facturacion}    sub="Total bruto"        variante="gold"    ocultar={ocultar} />
                <StatCard label="Impuestos 30%"  value={imp}                  sub="Estimado fiscal"    variante="red"     ocultar={ocultar} />
                <StatCard label="Costos"         value={stats.costoRepuestos + stats.gastosVarios} sub="Repuestos + gastos" variante="muted" ocultar={ocultar} />
                <StatCard label="Ganancia neta"  value={gananciaNeta}         sub="Lo que queda"       variante="redBold" ocultar={ocultar} />
            </div>

            {/* Desglose waterfall */}
            <div className="rounded-xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-3">Desglose del mes</p>
                {[
                    { label: 'Facturación bruta',            valor: stats.facturacion,    color: 'text-[#D48800] dark:text-[#F0A500]' },
                    { label: '− Impuestos (30%)',            valor: imp,                  color: 'text-[#D13A28] dark:text-[#E8422F]' },
                    { label: '− Repuestos / costos directos', valor: stats.costoRepuestos, color: 'text-[#D13A28] dark:text-[#E8422F]' },
                    { label: '− Gastos operacionales',       valor: stats.gastosVarios,   color: 'text-[#D13A28] dark:text-[#E8422F]' },
                ].map(({ label, valor, color }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                        <p className="text-[11px] font-bold text-[#A8A29E]">{label}</p>
                        <p className={`text-[12px] font-black ${color}`}>{fmt(valor)}</p>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1">
                    <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9]">= Ganancia neta</p>
                    <p className="text-[18px] font-black text-[#D48800] dark:text-[#F0A500]">{fmt(gananciaNeta)}</p>
                </div>
            </div>

            {/* Operaciones del mes */}
            {/* Donut — distribución */}
            {stats.facturacion > 0 && (
                <div className="rounded-xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Distribución</p>
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
                                formatter={(v) => <span className="text-[10px] font-bold text-[#A8A29E]">{v}</span>}
                                iconSize={8}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {stats.transacciones.length > 0 && (
                <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="px-5 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">Operaciones del mes</p>
                    </div>
                    {txPagina.map((t, idx) => {
                        const costo  = parseFloat(t.costo || 0);
                        const venta  = parseFloat(t.venta || 0);
                        const margen = venta > 0 ? Math.round((venta - costo) / venta * 100) : 0;
                        return (
                            <div key={`tx-${t.id}-${idx}`} className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{t.concepto}</p>
                                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase">{t.fecha} · {t.tipo}</p>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D48800]/10 text-[#D48800] dark:bg-[#F0A500]/10 dark:text-[#F0A500] shrink-0">{margen}%</span>
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] shrink-0">{fmt(venta - costo)}</p>
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

// ── Tab Técnicos ───────────────────────────────────────────────────────────────
function TabTecnicos({ filtroMes, setFiltroMes }) {
    const { ocultar } = useMontos();
    const [datos,      setDatos]      = useState([]);
    const [cargando,   setCargando]   = useState(false);
    const [filtroTec,  setFiltroTec]  = useState('');

    const cargar = () => {
        setCargando(true);
        api.get(`/servicios/rendimiento/mes-actual?mes=${filtroMes}`)
            .then(r => setDatos(r.data || []))
            .catch(() => setDatos([]))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [filtroMes]); // eslint-disable-line

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(v)}`;

    const tecnicoOpciones = datos.map(d => ({ id: d.tecnicoId, nombre: d.tecnicoNombre }));
    const datosFiltrados = filtroTec
        ? datos.filter(d => String(d.tecnicoId) === filtroTec)
        : datos;

    const totFact  = datosFiltrados.reduce((s, d) => s + Number(d.totalFacturado || 0), 0);
    const totParte = datosFiltrados.reduce((s, d) => s + Number(d.parteTecnico   || 0), 0);
    const totTrab  = datosFiltrados.reduce((s, d) => s + (d.cantidadTrabajos || 0), 0);

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;

    return (
        <div className="space-y-5">
            {/* Filtros */}
            <div className="flex gap-2 flex-wrap items-center">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                <select value={filtroTec} onChange={e => setFiltroTec(e.target.value)}
                    className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <option value="">Todos los técnicos</option>
                    {tecnicoOpciones.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Trabajos',         valor: totTrab,        gold: false },
                    { label: 'Facturado',         valor: fmt(totFact),   gold: false },
                    { label: 'A pagar técnicos',  valor: fmt(totParte),  gold: true  },
                ].map(({ label, valor, gold }) => (
                    <div key={label} className="rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] p-3 text-center" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-[16px] font-black ${gold ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>{valor}</p>
                    </div>
                ))}
            </div>

            {/* Gráfico comparativo */}
            {datosFiltrados.length > 1 && (
                <div className="rounded-xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Comparación</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={datosFiltrados.map(d => ({
                            nombre: d.tecnicoNombre.split(' ')[0],
                            Facturado: Math.round(d.totalFacturado),
                            'Su parte': Math.round(d.parteTecnico),
                        }))}>
                            <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#A8A29E' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#A8A29E' }} width={50}
                                tickFormatter={v => `$${formatearPrecioCompacto(v)}`} />
                            <Tooltip formatter={(v) => `$${formatearPrecio(v)}`} />
                            <Bar dataKey="Facturado" fill="#D48800" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Su parte" fill="#16A34A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tabla por técnico */}
            {datosFiltrados.length === 0 ? (
                <p className="text-center text-[#A8A29E] py-12">Sin trabajos para este período</p>
            ) : (
                <div className="rounded-2xl overflow-x-auto bg-[#FFFFFF] dark:bg-[#242424]" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="min-w-[480px]">
                        <div className="grid grid-cols-[minmax(120px,1fr)_60px_90px_90px_90px] px-4 py-2 bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                            {['Técnico','Trab.','Facturado','Repuestos','Su parte'].map(h => (
                                <p key={h} className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider text-center first:text-left">{h}</p>
                            ))}
                        </div>
                        {datosFiltrados.map((d, i) => (
                            <div key={d.tecnicoId} className={`grid grid-cols-[minmax(120px,1fr)_60px_90px_90px_90px] px-4 py-3 items-center ${i < datosFiltrados.length - 1 ? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate pr-2">{d.tecnicoNombre}</p>
                                <p className="text-[12px] font-bold text-[#A8A29E] text-center">{d.cantidadTrabajos}</p>
                                <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] text-right">{fmt(d.totalFacturado)}</p>
                                <p className="text-[12px] font-bold text-[#D13A28] dark:text-[#E8422F] text-right">{fmt(d.totalRepuestos)}</p>
                                <p className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500] text-right">{fmt(d.parteTecnico)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Exportar PDF */}
            {datosFiltrados.length > 0 && (
                <div className="flex justify-end">
                    <button onClick={() => generarPDFRendimientoTecnicos({ datos: datosFiltrados, periodo: filtroMes })}
                        className="h-8 px-4 rounded-lg font-bold text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                        Exportar PDF
                    </button>
                </div>
            )}
            <p className="text-[10px] text-[#A8A29E] text-center">
                Ganancia neta = Facturado − 30% impuestos − repuestos · Su parte = 50%
            </p>
        </div>
    );
}

// ── Tab Gastos ─────────────────────────────────────────────────────────────────
function TabGastos({ filtroMes, setFiltroMes }) {
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

    const confirmarEliminarGasto = async () => {
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
            {/* Selector mes */}
            <div className="flex gap-2 items-center">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
                    className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
            </div>

            {/* Torta por categoría */}
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
                        <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Distribución por categoría</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={dataChart} cx="50%" cy="50%" outerRadius={75} paddingAngle={2} dataKey="value">
                                    {dataChart.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => `$${formatearPrecio(v)}`} />
                                <Legend formatter={(v) => <span className="text-[10px] font-bold text-[#A8A29E]">{v}</span>} iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                );
            })()}

            {/* Formulario */}
            <div className="rounded-xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">{form.id ? 'Editar gasto' : 'Agregar gasto'}</p>
                    {form.id && (
                        <button onClick={() => setForm(formVacio)} className="text-[10px] font-bold text-[#D13A28] dark:text-[#E8422F]">Cancelar</button>
                    )}
                </div>
                <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text"   placeholder="Descripción"  value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className={inputCls} />
                    <input type="number" placeholder="Monto" step="0.01" value={form.monto}  onChange={e => setForm({ ...form, monto: e.target.value })}       className={inputCls} />
                    <DateInput value={form.fecha} onChange={v => setForm({ ...form, fecha: v })} className={inputCls} />
                    <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                        className={inputCls}>
                        <option value="">Categoría...</option>
                        {['Combustible', 'Herramientas', 'Vehículo', 'Insumos', 'Publicidad', 'Alquiler', 'Impuestos', 'Servicios', 'Comida', 'Otro'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button type="submit" disabled={cargando}
                        className="h-9 rounded-lg bg-[#D13A28] dark:bg-[#E8422F] text-white font-bold text-[11px] uppercase active:scale-95 md:col-span-4 disabled:opacity-50">
                        {form.id ? 'Actualizar' : 'Guardar'}
                    </button>
                </form>
            </div>

            {/* Lista */}
            {gastos.length === 0 ? (
                <p className="text-center text-[#A8A29E] py-8 font-bold text-sm uppercase">No hay gastos este mes</p>
            ) : (
                <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="flex items-center justify-between px-5 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">Gastos del mes</p>
                        <button onClick={() => exportarGastosCSV(gastos, filtroMes)}
                            className="text-[10px] font-black text-[#A8A29E] uppercase hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">
                            Exportar CSV
                        </button>
                    </div>
                    {gastosPagina.map((g, i) => (
                        <div key={`g-${g.id}-${i}`} className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{g.descripcion}</p>
                                <p className="text-[10px] font-bold text-[#A8A29E] uppercase">{g.fecha} · {g.categoria}</p>
                            </div>
                            <p className="text-[12px] font-black text-[#D13A28] dark:text-[#E8422F] shrink-0">${fmt(g.monto)}</p>
                            <button onClick={() => editarGasto(g)}
                                className="text-[10px] font-bold text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors shrink-0">
                                ✏️
                            </button>
                            <button onClick={() => handleEliminar(g.id)}
                                className="text-[10px] font-bold text-[#A8A29E] hover:text-[#D13A28] dark:hover:text-[#E8422F] transition-colors shrink-0">
                                🗑️
                            </button>
                        </div>
                    ))}
                    {totalPagGastos > 1 && (
                        <div className="px-4 py-2">
                            <Paginacion pagina={pagGastos} totalPaginas={totalPagGastos} irA={setPagGastos} next={() => setPagGastos(p => Math.min(p + 1, totalPagGastos))} prev={() => setPagGastos(p => Math.max(p - 1, 1))} />
                        </div>
                    )}
                    <div className="flex justify-between items-center px-5 py-3 bg-[#EFEDEA]/50 dark:bg-[#1C1C1C]/50">
                        <p className="text-[11px] font-black text-[#A8A29E] uppercase">Total</p>
                        <p className="text-[15px] font-black text-[#D48800] dark:text-[#F0A500]">
                            ${fmt(gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0))}
                        </p>
                    </div>
                </div>
            )}

            {/* Modal confirmación eliminar gasto */}
            {confirmEliminarGasto && (
                <>
                    <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" />
                    <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                        <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-4">
                                <p className="text-[32px] mb-2">🗑️</p>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">Eliminar gasto</h3>
                                <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] mt-2">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminarGasto(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
                                    Cancelar
                                </button>
                                <button onClick={confirmarEliminarGasto}
                                    className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
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

// ── Tab Inventario ─────────────────────────────────────────────────────────────
function TabInventario() {
    const { ocultar } = useMontos();
    const [repuestos, setRepuestos] = useState([]);
    const [cargando,  setCargando]  = useState(false);
    const [pagInv, setPagInv] = useState(1);

    const cargar = () => {
        setCargando(true);
        api.get('/repuestos?page=0&size=500')
            .then(r => setRepuestos(r.data?.content || r.data || []))
            .catch(() => toast.error('Error al cargar inventario'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, []); // eslint-disable-line

    const enStock     = repuestos.filter(r => Number(r.stock) > 0);
    const enStockOrdenado = [...enStock].sort((a, b) => (Number(b.costo || 0) * Number(b.stock)) - (Number(a.costo || 0) * Number(a.stock)));
    const totalCosto  = enStock.reduce((s, r) => s + Number(r.costo  || 0) * Number(r.stock), 0);
    const totalVenta  = enStock.reduce((s, r) => s + Number(r.precio || 0) * Number(r.stock), 0);
    const ganPotencial = totalVenta - totalCosto;
    const totalPagInv = Math.max(1, Math.ceil(enStockOrdenado.length / POR_PAGINA));
    const invPagina = enStockOrdenado.slice((pagInv - 1) * POR_PAGINA, pagInv * POR_PAGINA);

    const fmt = v => ocultar ? '••••' : `$${formatearPrecio(v)}`;

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;

    return (
        <div className="space-y-5">
            {/* Resumen financiero del stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="Mercadería al costo"  value={totalCosto}    sub="Capital inmovilizado" variante="muted"   ocultar={ocultar} />
                <StatCard label="A precio de venta"    value={totalVenta}    sub="Si vendés todo"       variante="gold"    ocultar={ocultar} />
                <StatCard label="Ganancia potencial"   value={ganPotencial}  sub="Diferencia neta"      variante="redBold" ocultar={ocultar} />
            </div>

            {enStock.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424]" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <p className="text-[#A8A29E] font-bold text-sm">Sin stock registrado</p>
                    <p className="text-[11px] text-[#A8A29E] mt-1">Usá el botón 📦 en la sección Repuestos para cargar stock</p>
                </div>
            ) : (
                <div className="bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    {/* Cabecera */}
                    <div className="flex items-center justify-between px-5 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">
                            Detalle por producto ({enStock.length})
                        </p>
                        <button onClick={cargar}
                            className="text-[10px] font-black text-[#A8A29E] uppercase hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">
                            Actualizar
                        </button>
                    </div>

                    {/* Filas paginadas */}
                    {invPagina.map((r, i) => {
                            const costo = Number(r.costo || 0);
                            const precio = Number(r.precio || 0);
                            const valorCosto = costo * Number(r.stock);
                            const valorVenta = precio * Number(r.stock);
                            const ganancia   = valorVenta - valorCosto;
                            const margen = precio > 0 ? Math.round((precio - costo) / precio * 100) : 0;
                            const stockBajo = r.stockMinimo && Number(r.stock) <= Number(r.stockMinimo);
                            return (
                                <div key={r.id}
                                    className={`px-4 py-3 flex items-center gap-3 ${i < invPagina.length - 1 ? 'border-b border-black/[0.04] dark:border-white/[0.04]' : ''} ${stockBajo ? 'bg-[#FEE2E2]/50 dark:bg-[#3B1111]/30' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{r.nombre}</p>
                                            {stockBajo && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171] shrink-0">BAJO</span>}
                                        </div>
                                        <p className="text-[10px] text-[#A8A29E]">
                                            {r.stock} unid.
                                            {costo ? ` · costo ${ocultar ? '••••' : `$${formatearPrecio(costo)}`}` : ''}
                                            {precio ? ` · venta ${ocultar ? '••••' : `$${formatearPrecio(precio)}`}` : ''}
                                        </p>
                                    </div>
                                    {margen > 0 && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D48800]/10 text-[#D48800] dark:bg-[#F0A500]/10 dark:text-[#F0A500] shrink-0">{margen}%</span>
                                    )}
                                    <div className="text-right shrink-0">
                                        <p className="text-[12px] font-black text-[#D48800] dark:text-[#F0A500]">{fmt(ganancia)}</p>
                                        <p className="text-[9px] text-[#A8A29E]">{fmt(valorCosto)} inv.</p>
                                    </div>
                                </div>
                            );
                        })}
                    {totalPagInv > 1 && (
                        <div className="px-4 py-2">
                            <Paginacion pagina={pagInv} totalPaginas={totalPagInv} irA={setPagInv} next={() => setPagInv(p => Math.min(p + 1, totalPagInv))} prev={() => setPagInv(p => Math.max(p - 1, 1))} />
                        </div>
                    )}

                    {/* Totales */}
                    <div className="flex justify-between items-center px-5 py-3 bg-[#EFEDEA]/50 dark:bg-[#1C1C1C]/50">
                        <p className="text-[11px] font-black text-[#A8A29E] uppercase">Totales</p>
                        <div className="text-right">
                            <p className="text-[15px] font-black text-[#D48800] dark:text-[#F0A500]">
                                {fmt(ganPotencial)} <span className="text-[10px] text-[#A8A29E] font-bold">ganancia</span>
                            </p>
                            <p className="text-[11px] text-[#A8A29E]">{fmt(totalCosto)} invertido · {fmt(totalVenta)} en ventas</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, variante, ocultar }) {
    const num = Math.round(Number(value || 0));
    const estilos = {
        gold:    { wrap: 'bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-[#D48800]/20 dark:border-[#F0A500]/20', val: 'text-[#D48800] dark:text-[#F0A500]' },
        red:     { wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/20 dark:border-[#E8422F]/20', val: 'text-[#D13A28] dark:text-[#E8422F]' },
        redBold: { wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/30 ring-2 ring-[#D13A28]/20 dark:ring-[#E8422F]/20', val: 'text-[#D13A28] dark:text-[#E8422F]' },
        muted:   { wrap: 'bg-[#FFFFFF] dark:bg-[#242424] border-black/[0.07] dark:border-white/[0.07]', val: 'text-[#1C1917] dark:text-[#F0EEE9]' },
    };
    const { wrap, val } = estilos[variante] || estilos.muted;
    // Compacto en mobile, completo en desktop
    const display = ocultar ? '••••' : `$${formatearPrecioCompacto(num)}`;
    const displayFull = ocultar ? '••••' : `$${formatearPrecio(num)}`;
    return (
        <div className={`p-4 sm:p-5 rounded-[1.5rem] border ${wrap}`}>
            <p className="text-[9px] font-black uppercase text-[#A8A29E] tracking-widest mb-2 sm:mb-3">{label}</p>
            <p className={`text-lg sm:text-2xl font-black ${val} hidden sm:block`}>{displayFull}</p>
            <p className={`text-lg font-black ${val} sm:hidden`}>{display}</p>
            <p className="text-[9px] font-bold text-[#A8A29E] uppercase mt-1">{sub}</p>
        </div>
    );
}

// ── Principal ──────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'balance',    label: 'Balance'    },
    { id: 'tecnicos',   label: 'Técnicos'   },
    { id: 'gastos',     label: 'Gastos'     },
    { id: 'inventario', label: 'Inventario' },
];

export default function DashboardFinanzas() {
    const [tab,       setTab]       = useState('balance');
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));
    const [modalCierre, setModalCierre] = useState(false);
    const tabIds = TABS.map(t => t.id);
    const swipeHandlers = useSwipeGesture(tabIds, tab, setTab);

    return (
        <div className="min-h-screen pb-28 bg-[#F5F3F1] dark:bg-[#141414]" {...swipeHandlers}>
            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-[#F5F3F1] dark:bg-[#141414] border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <div className="hidden md:flex items-center justify-between">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-[#1C1917] dark:text-[#F0EEE9]">Finanzas</h2>
                        <button onClick={() => setModalCierre(true)}
                            className="h-8 px-3 rounded-lg font-bold text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95">
                            Cierre de caja
                        </button>
                    </div>
                    {/* Tabs + botón cierre mobile */}
                    <div className="flex gap-2 items-center md:hidden mb-1">
                        <div className="flex-1" />
                        <button onClick={() => setModalCierre(true)}
                            className="h-7 px-2.5 rounded-lg font-bold text-[10px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 shrink-0">
                            Cierre
                        </button>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-1 bg-[#EFEDEA] dark:bg-[#1C1C1C] p-1 rounded-lg">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-1 py-1.5 rounded-md font-bold text-[11px] uppercase transition-all active:scale-95
                                    ${tab === t.id
                                        ? 'bg-white dark:bg-[#242424] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm'
                                        : 'text-[#A8A29E]'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3">

            {tab === 'balance'    && <TabBalance    filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
            {tab === 'tecnicos'   && <TabTecnicos   filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
            {tab === 'gastos'     && <TabGastos     filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
            {tab === 'inventario' && <TabInventario />}
            </div>

            {modalCierre && (
                <CierreCajaModal
                    onClose={() => setModalCierre(false)}
                    onArchivar={() => setModalCierre(false)}
                />
            )}
        </div>
    );
}
