import React, { useState } from 'react';
import { LuChevronDown, LuChevronUp, LuShieldCheck } from 'react-icons/lu';
import api from '../../services/api';
import { fechaAR, getTodayISO } from '../../utils/dateUtils';

// Equipos de la visita con su historial (5-oct-2026): el técnico ve qué se le
// hizo a cada equipo y qué repuestos se usaron, sin buscar el N/S. Se carga
// recién cuando lo abre (no frena la lista de visitas).
export default function EquiposDeVisita({ ordenId }) {
    const [abierto, setAbierto] = useState(false);
    const [equipos, setEquipos] = useState(null);
    const [error, setError] = useState(false);

    const alternar = () => {
        const nuevo = !abierto;
        setAbierto(nuevo);
        if (nuevo && equipos === null) {
            api.get(`/equipos/historial/orden/${ordenId}`)
                .then(r => setEquipos(Array.isArray(r.data) ? r.data : []))
                .catch(() => { setError(true); setEquipos([]); });
        }
    };

    // Repuestos que ya se usaron en estos equipos (los más repetidos primero)
    const frecuentes = (() => {
        const c = {};
        (equipos || []).forEach(e => (e.visitas || []).forEach(v => (v.repuestos || []).forEach(r => {
            c[r.nombre] = (c[r.nombre] || 0) + Number(r.cantidad || 1);
        })));
        return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
    })();
    const hoy = getTodayISO();

    return (
        <div className="mt-3">
            <button type="button" onClick={alternar}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-label font-bold bg-panel text-secondary active:scale-95 transition-all">
                <span>Equipos e historial{equipos ? ` (${equipos.length})` : ''}</span>
                {abierto ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
            </button>
            {abierto && (
                <div className="mt-2 space-y-2">
                    {equipos === null && <div className="h-12 rounded-xl bg-panel animate-pulse" />}
                    {equipos && equipos.length === 0 && (
                        <p className="text-caption text-muted px-1">{error ? 'No se pudo cargar.' : 'Esta visita no tiene equipos cargados.'}</p>
                    )}
                    {frecuentes.length > 0 && (
                        <p className="text-caption text-secondary px-1">
                            <b>Suelen llevar:</b> {frecuentes.join(', ')}
                        </p>
                    )}
                    {(equipos || []).map(e => {
                        const garantia = e.garantiaHasta && String(e.garantiaHasta) >= hoy;
                        return (
                            <div key={e.serie} className="p-3 rounded-xl bg-panel">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-body font-black text-ink">{e.serie}
                                        <span className="font-bold text-muted"> · {[e.marca, e.modelo].filter(Boolean).join(' ') || 'Sin modelo'}</span>
                                    </p>
                                    {garantia && (
                                        <span className="shrink-0 inline-flex items-center gap-1 text-label font-black px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] dark:bg-[#0F2E1A] dark:text-[#4ADE80]">
                                            <LuShieldCheck size={12} /> Garantía
                                        </span>
                                    )}
                                </div>
                                {e.ubicacion && <p className="text-caption text-muted">{e.ubicacion}</p>}
                                {(e.visitas || []).length === 0 ? (
                                    <p className="text-caption text-muted mt-1">Primera vez: sin trabajos anteriores.</p>
                                ) : (
                                    <div className="mt-1.5 space-y-1">
                                        {e.visitas.map((v, i) => (
                                            <p key={i} className="text-caption text-secondary leading-snug">
                                                <b className="text-ink">{fechaAR(v.fecha)}</b> · {v.trabajo || 'Sin detalle'}
                                                {v.repuestos?.length > 0 && <span className="text-muted"> · {v.repuestos.map(r => `${r.cantidad}x ${r.nombre}`).join(', ')}</span>}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
