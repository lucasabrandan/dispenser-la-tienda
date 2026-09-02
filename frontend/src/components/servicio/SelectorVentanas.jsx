import React from 'react';

// Grilla para que el admin marque en qué días/franjas puede el cliente
// (hablado antes por teléfono) — todo arranca "tachado" (sin marcar) y el
// admin toca las combinaciones que sí sirven. El técnico asignado va a ver
// solo esas opciones al confirmar el horario definitivo (ConfirmarHorarioSheet).
//
// value: array de { dia, franja } — ej. [{ dia: 'MIERCOLES', franja: '10:00-12:00' }]
// onChange: (nuevoValue) => void

export const DIAS_SEMANA = [
    { id: 'LUNES',     corto: 'Lun' },
    { id: 'MARTES',    corto: 'Mar' },
    { id: 'MIERCOLES', corto: 'Mié' },
    { id: 'JUEVES',    corto: 'Jue' },
    { id: 'VIERNES',   corto: 'Vie' },
    { id: 'SABADO',    corto: 'Sáb' },
];

export const FRANJAS = [
    { id: '08:00-12:00', corto: 'Mañana',      rango: '8 a 12' },
    { id: '12:00-14:00', corto: 'Mediodía',    rango: '12 a 14' },
    { id: '14:00-18:00', corto: 'Tarde',       rango: '14 a 18' },
    { id: '18:00-20:00', corto: 'Tarde-noche', rango: '18 a 20' },
];

export default function SelectorVentanas({ value, onChange }) {
    const ventanas = value || [];

    const estaMarcada = (dia, franja) =>
        ventanas.some(v => v.dia === dia && v.franja === franja);

    const toggle = (dia, franja) => {
        if (estaMarcada(dia, franja)) {
            onChange(ventanas.filter(v => !(v.dia === dia && v.franja === franja)));
        } else {
            onChange([...ventanas, { dia, franja }]);
        }
    };

    return (
        <div>
            <p className="text-caption text-muted mb-2">
                Tocá las combinaciones que le sirven al cliente — el resto queda descartado. El técnico va a poder elegir el día y horario exacto solo dentro de lo que marques acá.
            </p>
            <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full border-separate" style={{ borderSpacing: '4px' }}>
                    <thead>
                        <tr>
                            <th className="w-16" />
                            {DIAS_SEMANA.map(d => (
                                <th key={d.id} className="text-label font-black text-muted uppercase pb-1">
                                    {d.corto}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {FRANJAS.map(f => (
                            <tr key={f.id}>
                                <td className="text-label font-bold text-muted pr-1 whitespace-nowrap">
                                    {f.corto}
                                </td>
                                {DIAS_SEMANA.map(d => {
                                    const marcada = estaMarcada(d.id, f.id);
                                    return (
                                        <td key={d.id}>
                                            <button
                                                type="button"
                                                onClick={() => toggle(d.id, f.id)}
                                                title={`${d.corto} · ${f.rango}hs`}
                                                className={`w-full h-9 rounded-lg text-label font-black transition-all active:scale-95 ${
                                                    marcada
                                                        ? 'bg-brand-red text-white'
                                                        : 'bg-chip text-muted/40 line-through'
                                                }`}
                                            >
                                                {marcada ? '✓' : '—'}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {ventanas.length === 0 && (
                <p className="text-label font-bold text-brand-red mt-2">
                    ⚠ Marcá al menos una combinación de día y horario
                </p>
            )}
        </div>
    );
}
