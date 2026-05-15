import React from 'react';
import { useMontos } from '../../context/MontosContext';

/**
 * VentaList — lista de ventas con acciones por fila.
 * Componente presentacional puro, usa sistema de colores del proyecto.
 */

function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>••••••</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? valor.toLocaleString() : valor}
        </span>
    );
}

// Badge de estado usando variables CSS del sistema
const badgeClass = (v) => {
    if (v.estado === 'PRESUPUESTO') return 'bg-[var(--warning-bg)] text-[var(--warning-tx)]';
    if (v.estado === 'REALIZADO')   return 'bg-[var(--success-bg)] text-[var(--success-tx)]';
    return 'bg-[#E8E5E0] text-[#57534E] dark:bg-[#2E2E2E] dark:text-[#9E9A94]';
};

const badgeLabel = (v) => {
    if (v.estado === 'PRESUPUESTO') return 'Pendiente';
    if (v.estado === 'REALIZADO')   return 'Cobrada';
    return v.estado;
};

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
    return (
        <div>
            {/* LISTA */}
            {cargando ? (
                <div className="text-center py-16 text-[#A8A29E] font-bold">
                    Cargando ventas...
                </div>
            ) : ventas.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] text-[#A8A29E] font-bold">
                    No hay ventas en esta categoría.
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {ventas.map(v => (
                        <div key={v.id}
                            className="bg-[#FFFFFF] dark:bg-[#242424] rounded-2xl border border-black/[0.07] dark:border-white/[0.07] overflow-hidden transition-colors">

                            {/* CUERPO */}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex gap-2 items-center mb-1">
                                            <span className="text-[11px] text-[#A8A29E] font-bold">#{v.id}</span>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${badgeClass(v)}`}>
                                                {badgeLabel(v)}
                                            </span>
                                        </div>
                                        <h4 className="text-[15px] font-extrabold text-[#1C1917] dark:text-[#F0EEE9] tracking-tight leading-tight">
                                            {v.clienteNombre}
                                        </h4>
                                        <p className="text-[11px] text-[#A8A29E] font-medium mt-0.5">
                                            {v.sedeNombre} · {v.fecha}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <M valor={calcularTotal(v)} className="text-[18px] font-black text-[#1C1917] dark:text-[#F0EEE9] leading-none block" />
                                        {v.descuentoPorcentaje > 0 && (
                                            <p className="text-[10px] text-[#D13A28] dark:text-[#E8422F] font-bold">
                                                -{v.descuentoPorcentaje}% desc.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* DETALLE PRODUCTOS */}
                                {v.items?.length > 0 && (() => {
                                    const prods = v.items.flatMap(it => it.repuestosUsados || []).map(r => r.nombre);
                                    if (prods.length === 0) return null;
                                    const preview = prods.slice(0, 3).join(', ') + (prods.length > 3 ? ` +${prods.length - 3} más` : '');
                                    return (
                                        <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                                            <p className="text-[10px] text-[#A8A29E] truncate">{preview}</p>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* BARRA ACCIONES */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#EFEDEA] dark:bg-[#1C1C1C] border-t border-black/[0.06] dark:border-white/[0.06]">
                                {/* Editar — solo pendientes */}
                                {v.estado === 'PRESUPUESTO' && (
                                    <button
                                        onClick={() => onEditar(v)}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                                        title="Editar">
                                        ✏️
                                    </button>
                                )}

                                {/* PDF */}
                                <button
                                    onClick={() => onPDF(v)}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#E8E5E0] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                                    title="Generar PDF">
                                    📄
                                </button>

                                <div className="flex-1" />

                                {/* Confirmar / Cobrar — solo pendientes */}
                                {v.estado === 'PRESUPUESTO' && (
                                    <button
                                        onClick={() => onConfirmar(v.id)}
                                        className="h-9 px-4 rounded-xl font-bold text-xs text-white active:scale-95 transition-all bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-80"
                                        title="Confirmar cobro">
                                        ✓ Cobrar
                                    </button>
                                )}

                                {/* Eliminar */}
                                <button
                                    onClick={() => onEliminar(v.id)}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[var(--danger-bg)] text-[var(--danger-tx)] active:scale-90 transition-all"
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
