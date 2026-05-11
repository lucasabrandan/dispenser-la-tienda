import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useMontos } from '../../context/MontosContext';
import { exportarGastosCSV } from '../../utils/exportarCSV';
import { generarPDFRendimientoTecnicos } from '../../utils/pdf/rendimientoTecnicos';

const inputCls = `
    px-4 py-3 rounded-xl outline-none transition-all
    bg-[#C0BCB6] dark:bg-[#2E2E2E]
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

    const cargar = () => {
        setCargando(true);
        api.get(`/servicios/stats/mensual?mes=${filtroMes}`)
            .then(r => setStats({ facturacion: 0, costoRepuestos: 0, gastosVarios: 0, gananciaReal: 0, transacciones: [], ...r.data }))
            .catch(() => toast.error('Error al cargar balance'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [filtroMes]); // eslint-disable-line

    const fmt = v => ocultar ? '••••' : `$${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;
    const imp = stats.facturacion * 0.30;

    return (
        <div className="space-y-5">
            {/* Controles mes */}
            <div className="flex gap-3 items-center justify-end flex-wrap">
                <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={`${inputCls} text-[13px]`} />
                <button onClick={cargar} disabled={cargando}
                    className="px-4 py-3 rounded-xl bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-[11px] uppercase active:scale-95 transition-all disabled:opacity-50">
                    {cargando ? 'Cargando...' : 'Actualizar'}
                </button>
            </div>

            {/* Cards resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Facturación"    value={stats.facturacion}    sub="Total bruto"      variante="gold"    ocultar={ocultar} />
                <StatCard label="Impuestos 30%"  value={imp}                  sub="Estimado fiscal"  variante="red"     ocultar={ocultar} />
                <StatCard label="Repuestos"       value={stats.costoRepuestos} sub="Inversión directa" variante="muted"  ocultar={ocultar} />
                <StatCard label="Ganancia real"  value={stats.gananciaReal}   sub="Lo que queda"     variante="redBold" ocultar={ocultar} />
            </div>

            {/* Desglose waterfall */}
            <div className="rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] p-5" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-4">Desglose del mes</p>
                {[
                    { label: 'Facturación bruta',           valor: stats.facturacion,    color: 'text-[#D48800] dark:text-[#F0A500]' },
                    { label: '− Impuestos (30%)',            valor: imp,                  color: 'text-[#D13A28] dark:text-[#E8422F]' },
                    { label: '− Repuestos / costos directos', valor: stats.costoRepuestos, color: 'text-[#D13A28] dark:text-[#E8422F]' },
                    { label: '− Gastos operacionales',       valor: stats.gastosVarios,   color: 'text-[#D13A28] dark:text-[#E8422F]' },
                ].map(({ label, valor, color }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-[12px] font-bold text-[#A8A29E]">{label}</p>
                        <p className={`text-[13px] font-black ${color}`}>{fmt(valor)}</p>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-1">
                    <p className="text-[14px] font-black text-[#1C1917] dark:text-[#F0EEE9]">= Ganancia real</p>
                    <p className="text-[22px] font-black text-[#D48800] dark:text-[#F0A500]">{fmt(stats.gananciaReal)}</p>
                </div>
            </div>

            {/* Operaciones del mes */}
            {stats.transacciones.length > 0 && (
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="px-5 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">Operaciones del mes</p>
                    </div>
                    {stats.transacciones.map((t, idx) => {
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
    const mes = filtroMes;
    const setMes = setFiltroMes;
    const [filtroTec,  setFiltroTec]  = useState('');

    const cargar = (mesVal = mes) => {
        setCargando(true);
        api.get(`/servicios/rendimiento/mes-actual?mes=${mesVal}`)
            .then(r => setDatos(r.data || []))
            .catch(() => setDatos([]))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [mes]); // eslint-disable-line

    const fmt = v => ocultar ? '••••' : `$${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;

    // Técnicos únicos para el selector
    const tecnicoOpciones = datos.map(d => ({ id: d.tecnicoId, nombre: d.tecnicoNombre }));

    // Filtro client-side por técnico
    const datosFiltrados = filtroTec
        ? datos.filter(d => String(d.tecnicoId) === filtroTec)
        : datos;

    const periodo  = mes;
    const totFact  = datosFiltrados.reduce((s, d) => s + Number(d.totalFacturado || 0), 0);
    const totParte = datosFiltrados.reduce((s, d) => s + Number(d.parteTecnico   || 0), 0);
    const totTrab  = datosFiltrados.reduce((s, d) => s + (d.cantidadTrabajos || 0), 0);

    const handleMes = e => {
        setMes(e.target.value);
        cargar(e.target.value);
    };

    if (cargando) return <p className="text-center text-[#A8A29E] py-12">Cargando...</p>;

    return (
        <div className="space-y-5">
            {/* Filtros */}
            <div className="flex gap-3 flex-wrap items-center">
                <input type="month" value={mes} onChange={handleMes}
                    className={`${inputCls} text-[13px]`} />
                <select value={filtroTec} onChange={e => setFiltroTec(e.target.value)}
                    className={`${inputCls} text-[13px]`}>
                    <option value="">Todos los técnicos</option>
                    {tecnicoOpciones.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </select>
                <button onClick={() => cargar()}
                    className="h-[46px] px-4 rounded-xl bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-[11px] uppercase active:scale-95 transition-all">
                    Recargar
                </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Trabajos',         valor: totTrab,        gold: false },
                    { label: 'Facturado',         valor: fmt(totFact),   gold: false },
                    { label: 'A pagar técnicos',  valor: fmt(totParte),  gold: true  },
                ].map(({ label, valor, gold }) => (
                    <div key={label} className="rounded-2xl bg-[#EDEAE6] dark:bg-[#242424] p-3 text-center" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-[16px] font-black ${gold ? 'text-[#D48800] dark:text-[#F0A500]' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>{valor}</p>
                    </div>
                ))}
            </div>

            {/* Tabla por técnico */}
            {datosFiltrados.length === 0 ? (
                <p className="text-center text-[#A8A29E] py-12">Sin trabajos para este período</p>
            ) : (
                <div className="rounded-2xl overflow-hidden bg-[#EDEAE6] dark:bg-[#242424]" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="grid grid-cols-[1fr_60px_90px_90px_90px] px-4 py-2 bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                        {['Técnico','Trabajos','Facturado','Repuestos','Su parte'].map(h => (
                            <p key={h} className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider text-center first:text-left">{h}</p>
                        ))}
                    </div>
                    {datosFiltrados.map((d, i) => (
                        <div key={d.tecnicoId} className={`grid grid-cols-[1fr_60px_90px_90px_90px] px-4 py-3 items-center ${i < datosFiltrados.length - 1 ? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
                            <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{d.tecnicoNombre}</p>
                            <p className="text-[12px] font-bold text-[#A8A29E] text-center">{d.cantidadTrabajos}</p>
                            <p className="text-[12px] font-bold text-[#1C1917] dark:text-[#F0EEE9] text-right">{fmt(d.totalFacturado)}</p>
                            <p className="text-[12px] font-bold text-[#D13A28] dark:text-[#E8422F] text-right">{fmt(d.totalRepuestos)}</p>
                            <p className="text-[13px] font-black text-[#D48800] dark:text-[#F0A500] text-right">{fmt(d.parteTecnico)}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Exportar PDF */}
            {datosFiltrados.length > 0 && (
                <div className="flex justify-end">
                    <button onClick={() => generarPDFRendimientoTecnicos({ datos: datosFiltrados, periodo })}
                        className="h-9 px-4 rounded-2xl font-black text-[11px] uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] active:scale-95 transition-all">
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
function TabGastos({ filtroMes }) {
    const [gastos,   setGastos]   = useState([]);
    const [cargando, setCargando] = useState(false);
    const [form, setForm] = useState({ descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], categoria: '' });
    const [confirmEliminarGasto, setConfirmEliminarGasto] = useState(null);

    const cargar = () => {
        setCargando(true);
        api.get(`/gastos/mes?mes=${filtroMes}`)
            .then(r => setGastos(r.data || []))
            .catch(() => toast.error('Error al cargar gastos'))
            .finally(() => setCargando(false));
    };

    useEffect(() => { cargar(); }, [filtroMes]); // eslint-disable-line

    const fmt = n => parseFloat(n || 0).toLocaleString('es-AR');

    const handleAgregar = async (e) => {
        e.preventDefault();
        if (!form.descripcion.trim() || !form.monto || !form.categoria.trim())
            return toast.error('Completa todos los campos');
        try {
            await api.post('/gastos', { ...form, monto: parseFloat(form.monto) });
            toast.success('Gasto agregado');
            setForm({ descripcion: '', monto: '', fecha: new Date().toISOString().split('T')[0], categoria: '' });
            cargar();
        } catch { toast.error('Error al agregar gasto'); }
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
            {/* Formulario */}
            <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl p-5" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                <p className="text-[11px] font-black text-[#A8A29E] uppercase tracking-wider mb-4">Agregar gasto</p>
                <form onSubmit={handleAgregar} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input type="text"   placeholder="Descripción"  value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className={inputCls} />
                    <input type="number" placeholder="Monto" step="0.01" value={form.monto}  onChange={e => setForm({ ...form, monto: e.target.value })}       className={inputCls} />
                    <input type="date"                               value={form.fecha}       onChange={e => setForm({ ...form, fecha: e.target.value })}        className={inputCls} />
                    <input type="text"   placeholder="Categoría"    value={form.categoria}   onChange={e => setForm({ ...form, categoria: e.target.value })}    className={inputCls} />
                    <button type="submit" disabled={cargando}
                        className="px-6 py-3 rounded-xl bg-[#D13A28] dark:bg-[#E8422F] text-white font-black text-[11px] uppercase active:scale-95 transition-all md:col-span-4 disabled:opacity-50">
                        Guardar gasto
                    </button>
                </form>
            </div>

            {/* Lista */}
            {gastos.length === 0 ? (
                <p className="text-center text-[#A8A29E] py-8 font-bold text-sm uppercase">No hay gastos este mes</p>
            ) : (
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="flex items-center justify-between px-5 py-3 bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-wider">Gastos del mes</p>
                        <button onClick={() => exportarGastosCSV(gastos, filtroMes)}
                            className="text-[10px] font-black text-[#A8A29E] uppercase hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors">
                            Exportar CSV
                        </button>
                    </div>
                    {gastos.map((g, i) => (
                        <div key={`g-${g.id}-${i}`} className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-[#1C1917] dark:text-[#F0EEE9] truncate">{g.descripcion}</p>
                                <p className="text-[10px] font-bold text-[#A8A29E] uppercase">{g.fecha} · {g.categoria}</p>
                            </div>
                            <p className="text-[13px] font-black text-[#D13A28] dark:text-[#E8422F] shrink-0">${fmt(g.monto)}</p>
                            <button onClick={() => handleEliminar(g.id)}
                                className="text-[10px] font-black text-[#A8A29E] hover:text-[#D13A28] dark:hover:text-[#E8422F] transition-colors shrink-0 uppercase">
                                Eliminar
                            </button>
                        </div>
                    ))}
                    <div className="flex justify-between items-center px-5 py-3 bg-[#D8D4CE]/50 dark:bg-[#1C1C1C]/50">
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
                        <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6">
                            <div className="text-center mb-4">
                                <p className="text-[32px] mb-2">🗑️</p>
                                <h3 className="text-[15px] font-black text-[#1C1917] dark:text-[#F0EEE9] uppercase">Eliminar gasto</h3>
                                <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] mt-2">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmEliminarGasto(null)}
                                    className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] active:scale-95">
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

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, variante, ocultar }) {
    const num = parseFloat(value || 0);
    const estilos = {
        gold:    { wrap: 'bg-[#D48800]/10 dark:bg-[#F0A500]/10 border-[#D48800]/20 dark:border-[#F0A500]/20', val: 'text-[#D48800] dark:text-[#F0A500]' },
        red:     { wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/20 dark:border-[#E8422F]/20', val: 'text-[#D13A28] dark:text-[#E8422F]' },
        redBold: { wrap: 'bg-[#D13A28]/10 dark:bg-[#E8422F]/10 border-[#D13A28]/30 ring-2 ring-[#D13A28]/20 dark:ring-[#E8422F]/20', val: 'text-[#D13A28] dark:text-[#E8422F]' },
        muted:   { wrap: 'bg-[#EDEAE6] dark:bg-[#242424] border-black/[0.07] dark:border-white/[0.07]', val: 'text-[#1C1917] dark:text-[#F0EEE9]' },
    };
    const { wrap, val } = estilos[variante] || estilos.muted;
    return (
        <div className={`p-5 rounded-[1.5rem] border ${wrap}`}>
            <p className="text-[9px] font-black uppercase text-[#A8A29E] tracking-widest mb-3">{label}</p>
            <p className={`text-2xl font-black ${val}`}>{ocultar ? '••••' : `$${num.toLocaleString('es-AR')}`}</p>
            <p className="text-[9px] font-bold text-[#A8A29E] uppercase mt-1">{sub}</p>
        </div>
    );
}

// ── Principal ──────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'balance',  label: 'Balance'  },
    { id: 'tecnicos', label: 'Técnicos' },
    { id: 'gastos',   label: 'Gastos'   },
];

export default function DashboardFinanzas() {
    const [tab,       setTab]       = useState('balance');
    const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7));

    return (
        <div className="p-4 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-[20px] font-black text-[#1C1917] dark:text-[#F0EEE9]">Finanzas</h1>
                <p className="text-[11px] text-[#A8A29E]">{filtroMes}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-[#D8D4CE] dark:bg-[#1C1C1C] p-1 rounded-2xl">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 rounded-xl font-black text-[12px] uppercase tracking-wide transition-all active:scale-95
                            ${tab === t.id
                                ? 'bg-[#EDEAE6] dark:bg-[#242424] text-[#1C1917] dark:text-[#F0EEE9]'
                                : 'text-[#A8A29E]'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'balance'  && <TabBalance  filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
            {tab === 'tecnicos' && <TabTecnicos filtroMes={filtroMes} setFiltroMes={setFiltroMes} />}
            {tab === 'gastos'   && <TabGastos   filtroMes={filtroMes} />}
        </div>
    );
}
