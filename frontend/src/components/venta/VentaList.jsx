import React from 'react';
import { useMontos } from '../../context/MontosContext';

function M({ valor, prefix = '$', className = '' }) {
    const { montosVisibles } = useMontos();
    if (!montosVisibles) return <span className={className}>······</span>;
    return (
        <span className={className}>
            {prefix}{typeof valor === 'number' ? Math.round(valor).toLocaleString('es-AR') : valor}
        </span>
    );
}

const badgeClass = (v) => {
    if (v.estado === 'PRESUPUESTO') return 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]';
    if (v.estado === 'REALIZADO')   return 'bg-[#DCFCE7] text-[#16A34A] dark:bg-[#0F2A1A] dark:text-[#4ADE80]';
    return 'bg-[#E8E5E0] text-[#57534E] dark:bg-[#2E2E2E] dark:text-[#9E9A94]';
};

const badgeLabel = (v) => {
    if (v.estado === 'PRESUPUESTO') return 'Pendiente';
    if (v.estado === 'REALIZADO')   return 'Cobrada';
    return v.estado;
};

// Botón de acción compacto con label
const Accion = ({ onClick, icon, label, className = '', href, ...rest }) => {
    const cls = `inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${className}`;
    if (href) return <a href={href} className={cls} {...rest}>{icon} <span className="hidden sm:inline">{label}</span></a>;
    return <button onClick={onClick} className={cls}>{icon} <span className="hidden sm:inline">{label}</span></button>;
};

export default function VentaList({
    ventas, cargando,
    calcularTotal,
    onEditar, onConfirmar, onEliminar, onPDF, onDuplicar,
}) {
    if (cargando) return <div className="text-center py-16 text-[#A8A29E] font-bold">Cargando ventas...</div>;

    if (ventas.length === 0) return (
        <div className="text-center py-12 rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
            <p className="text-2xl mb-1">📭</p>
            <p className="text-[12px] font-bold text-[#A8A29E]">No hay ventas en esta categoría</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-2">
            {ventas.map(v => {
                const esPendiente = v.estado === 'PRESUPUESTO';
                const diasPendiente = esPendiente && v.fecha
                    ? Math.floor((Date.now() - new Date(v.fecha + 'T00:00:00').getTime()) / 86400000)
                    : 0;

                return (
                    <div key={v.id}
                        className={`rounded-xl shadow-sm border border-black/[0.05] dark:border-white/[0.05] overflow-hidden border-l-[3px] ${
                            esPendiente
                                ? 'border-l-[#D48800] dark:border-l-[#F0A500] bg-[#FFFBF0] dark:bg-[#242118]'
                                : v.estado === 'REALIZADO'
                                    ? 'border-l-[#16A34A] bg-white dark:bg-[#242424]'
                                    : 'border-l-[#A8A29E] bg-white dark:bg-[#242424]'
                        }`}>

                        {/* Contenido */}
                        <div className="p-3.5">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] text-[#A8A29E] font-bold">#{v.id}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${badgeClass(v)}`}>
                                            {badgeLabel(v)}
                                        </span>
                                        {esPendiente && diasPendiente > 0 && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                                diasPendiente > 7
                                                    ? 'bg-[#FEE2E2] text-[#D13A28] dark:bg-[#3B1111] dark:text-[#F87171]'
                                                    : 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#2E2207] dark:text-[#FBBF24]'
                                            }`}>
                                                {diasPendiente}d
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[14px] font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{v.clienteNombre}</p>
                                    <p className="text-[10px] text-[#A8A29E] mt-0.5">{v.sedeNombre} · {v.fecha}</p>
                                </div>
                                <div className="text-right shrink-0 ml-3">
                                    <M valor={calcularTotal(v)} className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9] block" />
                                    {v.descuentoPorcentaje > 0 && (
                                        <p className="text-[9px] text-[#D13A28] dark:text-[#E8422F] font-bold">-{v.descuentoPorcentaje}% desc.</p>
                                    )}
                                </div>
                            </div>

                            {/* Productos preview */}
                            {v.items?.length > 0 && (() => {
                                const prods = v.items.flatMap(it => it.repuestosUsados || []).map(r => r.nombre);
                                if (prods.length === 0) return null;
                                const preview = prods.slice(0, 3).join(', ') + (prods.length > 3 ? ` +${prods.length - 3} más` : '');
                                return <p className="text-[10px] text-[#A8A29E] mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04] truncate">{preview}</p>;
                            })()}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-black/[0.04] dark:border-white/[0.04] bg-[#F5F3F1]/50 dark:bg-[#1C1C1C]/50">
                            {esPendiente && (
                                <Accion onClick={() => onEditar(v)} icon="✏️" label="Editar"
                                    className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                            )}
                            <Accion onClick={() => onPDF(v)} icon="📄" label="PDF"
                                className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                            <Accion onClick={() => onPDF(v, { sinPrecios: true })} icon="📋" label="Sin $"
                                className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                            {onDuplicar && (
                                <Accion onClick={() => onDuplicar(v)} icon="⧉" label="Duplicar"
                                    className="bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]" />
                            )}
                            {v.clienteTelefono && (
                                <Accion
                                    href={`https://wa.me/${v.clienteTelefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        esPendiente
                                            ? `Hola ${v.clienteNombre}, te enviamos el presupuesto de venta #${v.id} por $${Math.round(calcularTotal(v)).toLocaleString('es-AR')}. Quedamos a tu disposición.`
                                            : `Hola ${v.clienteNombre}, gracias por tu compra #${v.id}.`
                                    )}`}
                                    target="_blank" rel="noopener noreferrer"
                                    icon="💬" label="WhatsApp"
                                    className="bg-[#25D366]/10 text-[#25D366]" />
                            )}

                            <div className="flex-1" />

                            {esPendiente && (
                                <button onClick={() => onConfirmar(v.id)}
                                    className="h-7 px-3 rounded-lg font-bold text-[10px] text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">
                                    Cobrar
                                </button>
                            )}
                            <Accion onClick={() => onEliminar(v.id)} icon="🗑️" label=""
                                className="text-[#D13A28]/60 dark:text-[#E8422F]/60 hover:bg-[#FEE2E2] dark:hover:bg-[#3B1111]" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
