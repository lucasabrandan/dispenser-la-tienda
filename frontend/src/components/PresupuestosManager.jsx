import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { generarRemitoPDFPremium } from '../utils/generadorPdfRemito';

/**
 * PresupuestosManager
 * Vista transversal — muestra TODOS los presupuestos pendientes
 * (tanto servicios técnicos como ventas) con sus acciones.
 *
 * NO tiene lógica de negocio propia — delega a los endpoints
 * de servicios con estado PRESUPUESTO.
 */
export default function PresupuestosManager() {
    const [presupuestos, setPresupuestos] = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [busqueda, setBusqueda]         = useState('');
    const [filtroTab, setFiltroTab]       = useState('TODOS');
    const [modalDetalle, setModalDetalle] = useState(null);

    useEffect(() => { cargarPresupuestos(); }, []);

    const cargarPresupuestos = async () => {
        setCargando(true);
        try {
            const res  = await api.get('/servicios?page=0&size=1000');
            const data = res.data.content || res.data || [];
            const pendientes = Array.isArray(data)
                ? data
                    .filter(s => s.estado === 'PRESUPUESTO')
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                : [];
            setPresupuestos(pendientes);
        } catch {
            toast.error('Error al cargar presupuestos');
        } finally {
            setCargando(false);
        }
    };

    const confirmar = async (id) => {
        const loading = toast.loading('Confirmando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'REALIZADO' });
            toast.success('✅ Presupuesto aprobado', { id: loading });
            cargarPresupuestos();
        } catch {
            toast.error('Error al confirmar', { id: loading });
        }
    };

    const rechazar = async (id) => {
        if (!window.confirm('¿Rechazar este presupuesto?')) return;
        const loading = toast.loading('Rechazando...');
        try {
            await api.patch(`/servicios/${id}/estado`, { estado: 'RECHAZADO' });
            toast.success('Presupuesto rechazado', { id: loading });
            cargarPresupuestos();
        } catch {
            toast.error('Error al rechazar', { id: loading });
        }
    };

    const eliminar = async (id) => {
        if (!window.confirm('⚠️ ¿Eliminar permanentemente este presupuesto?')) return;
        try {
            await api.delete(`/servicios/${id}`);
            toast.success('🗑️ Presupuesto eliminado');
            cargarPresupuestos();
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const calcularTotal = (s) =>
        s.items?.reduce((acc, i) => acc + Number(i.costo || 0), 0) || 0;

    const generarPDF = (s) => {
        generarRemitoPDFPremium({
            esPresupuesto: true,
            cliente:  { nombre: s.clienteNombre },
            sede:     { nombreSede: s.sedeNombre },
            tecnico:  'Marcos',
            ticketItems: s.items?.map(it => ({ ...it, totalCalculado: it.costo })) || [],
            totalFinal:  calcularTotal(s),
            fechaServicio: s.fecha
        });
    };

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const servicios = presupuestos.filter(p => p.servicioTipo === 'TECNICA');
        const ventas    = presupuestos.filter(p => p.servicioTipo === 'VENTA');
        const total     = presupuestos.reduce((a, p) => a + calcularTotal(p), 0);
        return {
            total,
            count:    presupuestos.length,
            servicios: servicios.length,
            ventas:    ventas.length,
        };
    }, [presupuestos]);

    // ── Filtrado ───────────────────────────────────────────────────────────────
    const filtrados = useMemo(() => {
        const txt = busqueda.toLowerCase();
        return presupuestos.filter(s => {
            const pasaTab =
                filtroTab === 'TODOS'     ? true :
                filtroTab === 'SERVICIOS' ? s.servicioTipo === 'TECNICA' :
                filtroTab === 'VENTAS'    ? s.servicioTipo === 'VENTA'   : true;

            const pasaBusqueda =
                !txt ||
                s.clienteNombre?.toLowerCase().includes(txt) ||
                s.sedeNombre?.toLowerCase().includes(txt) ||
                s.items?.some(it => it.equipoSerial?.toLowerCase().includes(txt));

            return pasaTab && pasaBusqueda;
        });
    }, [presupuestos, filtroTab, busqueda]);

    const tipoIcon  = (s) => s.servicioTipo === 'TECNICA' ? '🔧' : '🛒';
    const tipoLabel = (s) => s.servicioTipo === 'TECNICA' ? 'Servicio' : 'Venta';
    const tipoBadge = (s) => s.servicioTipo === 'TECNICA'
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-28 font-sans transition-colors">

            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                    Presupuestos
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                    Pendientes de confirmación
                </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-amber-500 shadow-sm col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Total pendiente</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">${stats.total.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{stats.count} presupuestos</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-rose-400 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Servicios</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.servicios}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">técnicos</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-emerald-400 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Ventas</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.ventas}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">insumos</p>
                </div>
            </div>

            {/* BUSCADOR */}
            <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                <input
                    placeholder="Buscar cliente, sede o S/N..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-5">
                {['TODOS', 'SERVICIOS', 'VENTAS'].map(tab => (
                    <button key={tab} onClick={() => setFiltroTab(tab)}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                            filtroTab === tab
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300/50'
                        }`}>
                        {tab === 'TODOS' ? 'Todos' : tab === 'SERVICIOS' ? 'Servicios' : 'Ventas'}
                    </button>
                ))}
            </div>

            {/* LISTA */}
            {cargando ? (
                <div className="text-center py-16 text-slate-400 font-bold">⏳ Cargando...</div>
            ) : filtrados.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400 font-bold">✅ Sin presupuestos pendientes</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtrados.map(s => (
                        <div key={s.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <span className="text-xs text-slate-400 font-bold">#{s.id}</span>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase ${tipoBadge(s)}`}>
                                            {tipoIcon(s)} {tipoLabel(s)}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{s.clienteNombre}</h4>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">📍 {s.sedeNombre} · {s.fecha}</p>
                                </div>
                                <p className="text-xl font-black text-slate-900 dark:text-white">
                                    ${calcularTotal(s).toLocaleString()}
                                </p>
                            </div>

                            {/* ITEMS RESUMIDOS */}
                            {s.items?.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-3 space-y-1">
                                    {s.items.map((it, i) => (
                                        <p key={i} className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            • {it.equipoSerial !== 'MOSTRADOR' ? `${it.equipoSerial} — ` : ''}{it.trabajoRealizado}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* ACCIONES */}
                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700 flex-wrap">
                                <button onClick={() => setModalDetalle(s)}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
                                    title="Ver detalles">👁️</button>
                                <button onClick={() => generarPDF(s)}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
                                    title="PDF">📄</button>
                                <button onClick={() => confirmar(s.id)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md active:scale-95 transition-all">
                                    ✅ Cobrar
                                </button>
                                <button onClick={() => rechazar(s.id)}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-extrabold text-xs active:scale-95 transition-all">
                                    ✗ Rechazar
                                </button>
                                <button onClick={() => eliminar(s.id)}
                                    className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl ml-auto hover:bg-rose-100 transition-all"
                                    title="Eliminar">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DETALLE */}
            {modalDetalle && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end z-[2000]">
                    <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
                        <h3 className="text-lg font-black mb-1 text-slate-900 dark:text-white">{modalDetalle.clienteNombre}</h3>
                        <p className="text-xs text-slate-400 font-bold mb-5 uppercase">📍 {modalDetalle.sedeNombre} · {modalDetalle.fecha}</p>

                        <div className="overflow-y-auto flex-1 mb-5 space-y-3">
                            {modalDetalle.items?.map((it, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-600">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-extrabold text-rose-500">{it.equipoSerial}</span>
                                        <span className="font-black text-slate-900 dark:text-white">${Number(it.costo || 0).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <p className="text-xs text-slate-400 border-t border-slate-200 dark:border-slate-600 pt-2">
                                            <strong className="text-slate-600 dark:text-slate-300">Repuestos: </strong>
                                            {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setModalDetalle(null)}
                            className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-extrabold transition-colors">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}