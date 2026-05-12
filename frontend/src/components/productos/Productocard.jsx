import React from 'react';
import { formatearPrecio } from '../../utils/formatearPrecio';
import { construirUrlFoto } from '../../utils/construirUrlFoto';
import { useMontos } from '../../context/MontosContext';

// Campos sensibles que se ocultan con el ojo: costo, márgenes, ganancia
// Precio lista es el precio público — se muestra siempre
const OCULTO = '••••';

export default function ProductoCard({
    producto, estaExpandido, estaSeleccionado, modoSeleccion,
    onToggleExpandido, onToggleSeleccion, onEditar, onEliminar,
}) {
    const { montosVisibles } = useMontos();
    const M = (val) => montosVisibles ? `$${formatearPrecio(val)}` : OCULTO;
    const P = (val) => montosVisibles ? `${val.toFixed(1)}%`        : OCULTO;

    const costo          = parseFloat(producto.costo) || 0;
    const porcGanancia   = parseFloat(producto.porcentajeGanancia) || 0;
    const porcMarkup     = parseFloat(producto.porcentajeMarkup) || 0;
    const gananciaUnidad = (costo * porcGanancia) / 100;
    const precioBase     = costo + gananciaUnidad;
    // Usar el precio guardado en DB; recalcular solo si no existe
    const precioLista    = parseFloat(producto.precioLista) || precioBase * (1 + porcMarkup / 100);

    const detalles = [
        { label: 'Costo',        value: M(costo),          color: 'text-[#1C1917] dark:text-[#F0EEE9]' },
        { label: '% Ganancia',   value: P(porcGanancia),   color: 'text-[#1C1917] dark:text-[#F0EEE9]' },
        { label: 'Ganancia/u',   value: M(gananciaUnidad), color: 'text-[#D48800] dark:text-[#F0A500]' },
        { label: 'Precio Base',  value: M(precioBase),     color: 'text-[#D48800] dark:text-[#F0A500]' },
        { label: '% Markup',     value: P(porcMarkup),     color: 'text-[#1C1917] dark:text-[#F0EEE9]' },
        { label: 'Precio Lista', value: M(precioLista),    color: 'text-[#D48800] dark:text-[#F0A500]' },
    ];

    return (
        <div className={`
            bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl
            border border-black/[0.07] dark:border-white/[0.07]
            overflow-hidden transition-all
            ${estaSeleccionado ? 'ring-2 ring-[#D13A28] dark:ring-[#E8422F]' : ''}
        `}>
            <div className="p-3 md:p-4">
                <div className="flex gap-3 items-center">

                    {/* Checkbox de selección */}
                    {modoSeleccion && (
                        <button
                            onClick={() => onToggleSeleccion(producto.id)}
                            className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                estaSeleccionado
                                    ? 'bg-[#D13A28] dark:bg-[#E8422F] border-[#D13A28] dark:border-[#E8422F] text-white'
                                    : 'border-[#C0BCB6] dark:border-[#2E2E2E] bg-[#EDEAE6] dark:bg-[#242424]'
                            }`}
                        >
                            {estaSeleccionado && <span className="text-xs font-black">✓</span>}
                        </button>
                    )}

                    {/* Foto */}
                    <div
                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#C0BCB6] dark:bg-[#2E2E2E]"
                        onClick={() => modoSeleccion && onToggleSeleccion(producto.id)}
                    >
                        {producto.fotoUrl ? (
                            <img
                                src={construirUrlFoto(producto.fotoUrl)}
                                alt={producto.nombre}
                                className="w-full h-full object-cover"
                                onError={e => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML =
                                        '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem">📦</div>';
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => modoSeleccion && onToggleSeleccion(producto.id)}>
                        <p className="text-[10px] font-black text-[#A8A29E] uppercase">SKU: {producto.sku || '—'}</p>
                        <p className="text-sm font-bold text-[#1C1917] dark:text-[#F0EEE9] truncate">{producto.nombre}</p>
                        <p className="text-sm font-black text-[#D48800] dark:text-[#F0A500]">{M(precioLista)}</p>
                        <p className="text-[10px] text-[#A8A29E]">Costo: {M(costo)}</p>
                    </div>

                    {/* Botones */}
                    {!modoSeleccion && (
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                                onClick={() => onToggleExpandido(producto.id)}
                                className="bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#D13A28] hover:text-white dark:hover:bg-[#E8422F] transition-all">
                                {estaExpandido ? '▲' : '▼ Info'}
                            </button>
                            <button
                                onClick={() => onEditar(producto)}
                                className="bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:opacity-80 transition-all">
                                ✏️ Editar
                            </button>
                            <button
                                onClick={() => onEliminar(producto.id)}
                                className="bg-[#D13A28]/10 dark:bg-[#E8422F]/10 text-[#D13A28] dark:text-[#E8422F] px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-[#D13A28] hover:text-white dark:hover:bg-[#E8422F] transition-all">
                                🗑️
                            </button>
                        </div>
                    )}
                </div>

                {/* Acordeón con detalle de márgenes */}
                {estaExpandido && !modoSeleccion && (
                    <div className="mt-3 pt-3 border-t border-black/[0.07] dark:border-white/[0.07] space-y-2">
                        {/* Descripción si existe */}
                        {producto.descripcion?.trim() && (
                            <div className="bg-[#D8D4CE] dark:bg-[#1C1C1C] px-3 py-2.5 rounded-xl">
                                <p className="text-[9px] font-black text-[#A8A29E] uppercase mb-1">Descripción</p>
                                <p className="text-[12px] text-[#57534E] dark:text-[#9E9A94] leading-snug">{producto.descripcion}</p>
                            </div>
                        )}
                        <div className="bg-[#D8D4CE] dark:bg-[#1C1C1C] p-3 rounded-xl">
                            <h4 className="font-black text-[10px] text-[#1C1917] dark:text-[#F0EEE9] mb-2 uppercase">Detalle de Márgenes</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                                {detalles.map(({ label, value, color }) => (
                                    <div key={label}>
                                        <p className="text-[10px] text-[#A8A29E] uppercase font-bold">{label}</p>
                                        <p className={`text-sm font-black ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
