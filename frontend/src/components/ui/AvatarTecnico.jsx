import React from 'react';
import { colorTecnico, inicialesDe } from '../../utils/estados';

// Técnico = círculo con iniciales en su color (3-oct-2026). Es la única forma en que
// aparece el color de un técnico: así nunca se confunde con el color de una etapa.
// Sin técnico → círculo punteado.
export default function AvatarTecnico({ nombre, size = 20, className = '' }) {
    const px = `${size}px`;
    if (!nombre) {
        return <span className={`inline-block rounded-full border-[1.5px] border-dashed border-[#A8A29E] shrink-0 ${className}`} style={{ width: px, height: px }} aria-label="Sin técnico" />;
    }
    return (
        <span className={`inline-flex items-center justify-center rounded-full text-white font-black shrink-0 leading-none ${className}`}
            style={{ width: px, height: px, background: colorTecnico(nombre), fontSize: Math.max(8, Math.round(size * 0.42)) }}
            title={nombre} aria-hidden="true">
            {inicialesDe(nombre)}
        </span>
    );
}
