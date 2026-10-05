import React from 'react';
import { Pestanas } from './Pantalla';

/**
 * SwipeColumns — se mantiene la API, pero ahora se ve igual que las pestañas de
 * Trabajos (4-oct-2026: unificar el look de todas las pantallas).
 *   columns: [{ id, label, fullLabel, count, color }]
 */
export default function SwipeColumns({ columns, activeId, onChangeColumn }) {
    return (
        <Pestanas items={columns.map(c => ({ id: c.id, label: c.fullLabel || c.label, count: c.count, color: c.color }))}
            activo={activeId} onChange={onChangeColumn} />
    );
}
