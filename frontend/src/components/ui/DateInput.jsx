import React from 'react';

/**
 * DateInput — wrapper sobre input type="date" nativo.
 * Funciona en todos los browsers/mobile. El formato visual depende del lang del HTML.
 * Se setea lang="es-AR" en index.html para que muestre DD/MM/AAAA.
 */
export default function DateInput({ value, onChange, className = '', ...props }) {
    return (
        <input
            type="date"
            lang="es-AR"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className={className}
            {...props}
        />
    );
}
