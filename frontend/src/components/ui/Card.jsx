import React from 'react';

/**
 * Card — contenedor base del sistema de diseño.
 * Usa variables CSS del sistema para respetar las 4 capas de color:
 *   bg-base → bg-surface → bg-card → bg-raised
 *
 * Por defecto usa --bg-card (capa 3).
 * Para usar otra capa: <Card layer="surface"> o <Card layer="raised">
 */
// Mapa de capas a clases Tailwind del sistema de diseño
const LAYER_CLASSES = {
    base:    'bg-page',
    surface: 'bg-panel',
    card:    'bg-card',
    raised:  'bg-chip',
};

export default function Card({ children, className = '', layer = 'card', ...props }) {
    const layerClass = LAYER_CLASSES[layer] || LAYER_CLASSES.card;

    return (
        <div
            className={`w-full rounded-2xl p-5 mb-4 transition-colors duration-300 border border-black/[0.07] dark:border-white/[0.07] ${layerClass} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}