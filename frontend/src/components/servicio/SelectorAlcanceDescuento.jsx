import React from 'react';
import { ALCANCES } from '../../utils/descuento';

// Selector "Aplicar a: Todo / Mano de obra / Repuestos" (9-oct-2026).
// Tres botones del mismo ancho: en un celu de 360px entran en una fila.
export default function SelectorAlcanceDescuento({ valor, onChange, disabled = false }) {
    return (
        <div className="mt-2.5">
            <p className="text-label font-black text-muted uppercase tracking-widest mb-1.5">Aplicar a</p>
            <div role="radiogroup" aria-label="Aplicar descuento a"
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-chip">
                {ALCANCES.map(a => {
                    const activo = valor === a.valor;
                    return (
                        <button key={a.valor} type="button" role="radio" aria-checked={activo}
                            disabled={disabled}
                            onClick={() => onChange(a.valor)}
                            className={`h-10 px-1 rounded-lg text-label font-black leading-tight transition-all active:scale-95 ${
                                activo
                                    ? 'bg-brand-red text-white shadow-sm'
                                    : 'text-secondary'
                            } ${disabled ? 'opacity-50' : ''}`}>
                            {a.etiqueta}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
