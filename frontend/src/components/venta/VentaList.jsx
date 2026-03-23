import React from 'react';

/**
 * VentaList
 * Lista de ventas con tabs, búsqueda y acciones por fila.
 * Componente presentacional puro.
 */

const TABS = [
    { id: 'TODOS',      label: 'Todas'      },
    { id: 'COBRADAS',   label: 'Cobradas'   },
    { id: 'PENDIENTES', label: 'Pendientes' },
];

export default function VentaList({
    ventas, cargando,
    busqueda, setBusqueda,
    filtroTab, setFiltroTab,
    calcularTotal,
    onEditar,
    onConfirmar,
    onEliminar,
    onPDF,
}) {
    const badgeClass = (v) => {
        if (v.estado === 'PRESUPUESTO') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
        if (v.estado === 'REALIZADO')   return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    };

    const badgeLabel = (v) => {
        if (v.estado === 'PRESUPUESTO') return 'Pendiente';
        if (v.estado === 'REALIZADO')   return 'Cobrada';
        return v.estado;
    };

    return (
        <div>
            {/* BUSCADOR */}
            <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                <input
                    placeholder="Buscar por cliente, sede o producto..."
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
                <div className="text-center py-16 text-slate-400 font-bold">
                    ⏳ Cargando ventas...
                </div>
            ) : ventas.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400 font-bold">
                    🛒 No hay ventas en esta categoría.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {ventas.map(v => (
                        <div key={v.id}
                            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">

                            {/* HEADER */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <span className="text-xs text-slate-400 font-bold">#{v.id}</span>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase ${badgeClass(v)}`}>
                                            {badgeLabel(v)}
                                        </span>
                                    </div>
                                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                                        {v.clienteNombre}
                                    </h4>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        📍 {v.sedeNombre} · {v.fecha}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                        ${calcularTotal(v).toLocaleString()}
                                    </p>
                                    {v.descuentoPorcentaje > 0 && (
                                        <p className="text-[10px] text-rose-500 font-bold">
                                            -{v.descuentoPorcentaje}% desc.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* DETALLE PRODUCTOS */}
                            {v.items?.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-3 space-y-1">
                                    {v.items.map((it, i) => (
                                        <div key={i} className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                            • {it.trabajoRealizado || it.equipoSerial}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ACCIONES */}
                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                {/* Editar — solo pendientes */}
                                {v.estado === 'PRESUPUESTO' && (
                                    <button onClick={() => onEditar(v)}
                                        className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl transition-all hover:bg-blue-100"
                                        title="Editar">
                                        ✏️
                                    </button>
                                )}

                                {/* PDF */}
                                <button onClick={() => onPDF(v)}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl transition-all hover:bg-slate-100"
                                    title="Generar PDF">
                                    📄
                                </button>

                                {/* Confirmar / Cobrar — solo pendientes */}
                                {v.estado === 'PRESUPUESTO' && (
                                    <button onClick={() => onConfirmar(v.id)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                                        title="Confirmar cobro">
                                        ✅ Cobrar
                                    </button>
                                )}

                                {/* Eliminar */}
                                <button onClick={() => onEliminar(v.id)}
                                    className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl ml-auto transition-all hover:bg-rose-100"
                                    title="Eliminar">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}   