import React from 'react';
import { useServicioManager } from '../../hooks/useServicioManager';
import ServicioForm from '../servicio/ServicioForm';

/**
 * ServicioManager
 * Módulo completo de Servicio Técnico.
 *
 * ┌─ Stats del mes ────────────────────────────────┐
 * ├─ Botón nuevo servicio ─────────────────────────┤
 * ├─ Lista: Todos / Realizados / Pendientes ────────┤
 * │   · Detalle de items y repuestos               │
 * │   · Editar presupuesto                         │
 * │   · Confirmar / Rechazar / PDF / Eliminar      │
 * └────────────────────────────────────────────────┘
 */
export default function ServicioManager() {
    const {
        servicios, cargando, stats,
        busqueda, setBusqueda,
        filtroTab, setFiltroTab,
        modalCrear, setModalCrear,
        servicioEditar,
        modalDetalle, setModalDetalle,
        cargarServicios,
        confirmarServicio, rechazarServicio,
        eliminarServicio, generarPDF,
        calcularTotal, abrirEditar, cerrarModal,
    } = useServicioManager();

    const TABS = [
        { id: 'TODOS',      label: 'Todos'      },
        { id: 'REALIZADOS', label: 'Realizados' },
        { id: 'PENDIENTES', label: 'Pendientes' },
    ];

    const badgeClass = (s) => {
        if (s.estado === 'PRESUPUESTO') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
        if (s.estado === 'REALIZADO')   return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (s.estado === 'RECHAZADO')   return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
        return 'bg-slate-100 text-slate-600';
    };

    const badgeLabel = (s) => {
        if (s.estado === 'PRESUPUESTO') return 'Pendiente';
        if (s.estado === 'REALIZADO')   return 'Realizado';
        if (s.estado === 'RECHAZADO')   return 'Rechazado';
        return s.estado;
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-28 font-sans transition-colors">

            {/* HEADER */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
                        Servicio Técnico
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                        Gestión de servicios
                    </p>
                </div>
                <button
                    onClick={() => setModalCrear(true)}
                    className="bg-rose-500 hover:bg-rose-600 text-white h-14 px-8 rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                    + Nuevo Servicio
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-rose-500 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Facturado el mes</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">${stats.totalMes.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{stats.cantidadMes} servicios</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-blue-500 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Hoy</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">${stats.totalHoy.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{stats.cantidadHoy} servicios hoy</p>
                </div>
                <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 shadow-sm ${
                    stats.pendientesCount > 0
                        ? 'border-slate-200 dark:border-slate-700 border-l-amber-500'
                        : 'border-slate-200 dark:border-slate-700 border-l-slate-300'
                }`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Pendientes</p>
                    <p className={`text-2xl font-black mt-1 ${stats.pendientesCount > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                        {stats.pendientesCount}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">presupuestos</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-l-4 border-slate-200 dark:border-slate-700 border-l-emerald-500 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">MO del mes</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">${stats.gananciaTotal.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">mano de obra</p>
                </div>
            </div>

            {/* ALERTA PENDIENTES */}
            {stats.pendientesCount > 0 && (
                <div
                    className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-all"
                    onClick={() => setFiltroTab('PENDIENTES')}
                >
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                            {stats.pendientesCount} presupuesto{stats.pendientesCount > 1 ? 's' : ''} sin confirmar
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                            ${stats.pendientesVal.toLocaleString()} por cobrar · Click para ver
                        </p>
                    </div>
                </div>
            )}

            {/* BUSCADOR */}
            <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                <input
                    placeholder="Buscar por cliente, sede o S/N..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full py-3.5 pl-11 pr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl mb-5">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setFiltroTab(tab.id)}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                            filtroTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-300/50'
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* LISTA */}
            {cargando ? (
                <div className="text-center py-16 text-slate-400 font-bold">⏳ Cargando servicios...</div>
            ) : servicios.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 font-bold">
                    🔧 No hay servicios en esta categoría.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {servicios.map(s => (
                        <div key={s.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">

                            {/* HEADER CARD */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <span className="text-xs text-slate-400 font-bold">#{s.id}</span>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase ${badgeClass(s)}`}>
                                            {badgeLabel(s)}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                                        {s.clienteNombre}
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        📍 {s.sedeNombre} · {s.fecha}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-900 dark:text-white">
                                        ${calcularTotal(s).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* ITEMS */}
                            {s.items?.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-3 space-y-1.5">
                                    {s.items.map((it, i) => (
                                        <div key={i} className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <span className="text-[10px] font-black text-rose-500 mr-2">
                                                    {it.equipoSerial}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    {it.trabajoRealizado}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-slate-700 dark:text-white ml-3 shrink-0">
                                                ${Number(it.costo || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ACCIONES */}
                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700 flex-wrap">
                                {s.estado === 'PRESUPUESTO' && (
                                    <button onClick={() => abrirEditar(s)}
                                        className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                                        title="Editar">✏️</button>
                                )}
                                <button onClick={() => setModalDetalle(s)}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
                                    title="Ver detalles">👁️</button>
                                <button onClick={() => generarPDF(s)}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
                                    title="PDF">📄</button>
                                {s.estado === 'PRESUPUESTO' && (
                                    <>
                                        <button onClick={() => confirmarServicio(s.id)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all">
                                            ✅ Cobrar
                                        </button>
                                        <button onClick={() => rechazarServicio(s.id)}
                                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-md active:scale-95 transition-all">
                                            ✗ Rechazar
                                        </button>
                                    </>
                                )}
                                <button onClick={() => eliminarServicio(s.id)}
                                    className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl ml-auto hover:bg-rose-100 transition-all"
                                    title="Eliminar">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}
            {modalCrear && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-slate-50 dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-10 md:rounded-t-3xl">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    {servicioEditar ? '✏️ Editar Presupuesto' : '🔧 Nuevo Servicio'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {servicioEditar ? `Presupuesto #${servicioEditar.id}` : 'Cargá el trabajo a realizar'}
                                </p>
                            </div>
                            <button onClick={cerrarModal}
                                className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                                ✕
                            </button>
                        </div>
                        <ServicioForm
                            onSaved={() => { cerrarModal(); cargarServicios(); }}
                            servicioParaEditar={servicioEditar}
                        />
                    </div>
                </div>
            )}

            {/* MODAL DETALLE */}
            {modalDetalle && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end z-[2000]">
                    <div className="bg-white dark:bg-slate-800 w-full rounded-t-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mb-5" />
                        <h3 className="text-lg font-black mb-1 text-slate-900 dark:text-white">
                            {modalDetalle.clienteNombre}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mb-5 uppercase">
                            📍 {modalDetalle.sedeNombre} · {modalDetalle.fecha}
                        </p>
                        <div className="overflow-y-auto flex-1 mb-5 space-y-3 pr-1">
                            {modalDetalle.items?.map((it, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-600">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-extrabold text-rose-500">{it.equipoSerial}</span>
                                        <span className="font-black text-slate-900 dark:text-white">
                                            ${Number(it.costo || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{it.trabajoRealizado}</p>
                                    {it.repuestosUsados?.length > 0 && (
                                        <div className="text-xs text-slate-400 border-t border-slate-200 dark:border-slate-600 pt-2">
                                            <strong className="text-slate-600 dark:text-slate-300">Repuestos: </strong>
                                            {it.repuestosUsados.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}
                                        </div>
                                    )}
                                    {it.costoExtra > 0 && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            MO: ${Number(it.costoExtra).toLocaleString()}
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