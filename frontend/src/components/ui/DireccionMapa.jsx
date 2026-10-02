import React from 'react';
import { LuMapPin, LuNavigation } from 'react-icons/lu';

// Dirección + botón "Mapa" visible (Lucas, 29-sep-2026). Antes la dirección
// entera era el link: al tocar la tarjeta para cualquier otra cosa se abría
// Google Maps sin querer, y a la vez el link no se reconocía como botón.
// Ahora el texto es solo texto y el mapa se abre únicamente desde el botón.
export default function DireccionMapa({ direccion, className = '' }) {
    if (!direccion) return null;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="flex-1 min-w-0 flex items-center gap-1 text-caption text-secondary">
                <LuMapPin size={12} className="shrink-0" />
                <span className="truncate">{direccion}</span>
            </span>
            <a href={url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                aria-label={`Abrir ${direccion} en el mapa`}
                className="shrink-0 h-9 px-3 rounded-lg bg-chip text-ink text-label font-bold inline-flex items-center gap-1.5 active:scale-95 transition-all">
                <LuNavigation size={13} /> Mapa
            </a>
        </div>
    );
}
