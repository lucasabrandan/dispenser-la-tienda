import React from 'react';
import { construirUrlFoto } from '../../utils/construirUrlFoto';

export default function RepuestoCard({
    repuesto,
    modoSeleccion,
    estaSeleccionado,
    onEditar,
    onEliminar,
    onToggleSeleccion,
}) {
    const r = repuesto;
    const stockBajo = Number(r.stock) <= 3;
    const precioNegro = Number(r.precio) || Number(r.precioLista) || 0;
    const fotoSrc = r.fotoUrl ? construirUrlFoto(r.fotoUrl) : null;

    const handleClick = () => {
        if (modoSeleccion) onToggleSeleccion(r.id);
        else onEditar(r);
    };

    return (
        <div
            onClick={handleClick}
            className={`rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.97] bg-card border ${
                estaSeleccionado
                    ? 'border-brand-red ring-2 ring-[#D13A28]/20'
                    : 'border-black/[0.07] dark:border-white/[0.07]'
            }`}
        >
            {/* Foto */}
            <div className="aspect-square bg-[#F5F3F1] dark:bg-[#1C1C1C] flex items-center justify-center overflow-hidden relative">
                {fotoSrc
                    ? <img src={fotoSrc} className="w-full h-full object-cover" alt={r.nombre} />
                    : <span className="text-4xl opacity-30">📦</span>
                }
                {/* Checkbox selección */}
                {modoSeleccion && (
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                        estaSeleccionado
                            ? 'bg-[#D13A28] border-[#D13A28]'
                            : 'border-white/80 bg-black/30 backdrop-blur-sm'
                    }`}>
                        {estaSeleccionado && <span className="text-white text-[10px] font-black">✓</span>}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-2.5">
                <p className="text-[10px] font-black text-brand-red tracking-wide mb-0.5">{r.sku}</p>
                <p className="text-[12px] font-bold text-ink leading-tight line-clamp-2 min-h-[32px]">
                    {r.nombre}
                </p>
                <p className="text-title font-black text-ink mt-1">
                    ${Math.round(precioNegro).toLocaleString('es-AR')}
                </p>
            </div>
        </div>
    );
}
