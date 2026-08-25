import React, { useState } from 'react';
import DateInput from './DateInput';
import { MESES_ES } from '../../utils/dateUtils';

function formatMes(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MESES_ES[parseInt(m)]} ${y}`;
}

// Barra segmentada unida
function SegmentBar({ items, value, onChange }) {
    return (
        <div className="flex rounded-lg overflow-hidden shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
            {items.map((item, i) => (
                <button key={item.value} onClick={() => onChange(item.value)}
                    className={`flex-1 h-8 text-label font-bold uppercase transition-all active:scale-[0.98] ${
                        value === item.value
                            ? 'bg-brand-red text-white z-[1]'
                            : 'bg-white dark:bg-[#1C1C1C] text-muted'
                    } ${i > 0 ? 'border-l border-black/[0.05] dark:border-white/[0.05]' : ''}`}>
                    {item.label}
                </button>
            ))}
        </div>
    );
}

export default function FiltrosPanel({ estados = [], conBusqueda = false, conRango = true, placeholderBusqueda = 'Buscar...', hook }) {
    const {
        busqueda, setBusqueda,
        estado, setEstado,
        periodoRapido, aplicarRapido,
        mesSelector, aplicarMesSelector,
        desde, hasta, aplicarRango,
        mesesDisponibles,
        totalItems, pagina, totalPaginas,
    } = hook;

    const [mostrarRango, setMostrarRango] = useState(false);
    const [desdeLocal, setDesdeLocal] = useState('');
    const [hastaLocal, setHastaLocal] = useState('');

    const periodos = [
        { value: 'MES', label: 'Este mes' },
        { value: 'MES_ANT', label: 'Mes ant.' },
        { value: 'ANO', label: 'Este año' },
        { value: 'TODO', label: 'Todo' },
    ];

    return (
        <div className="space-y-2">

            {/* Búsqueda */}
            {conBusqueda && (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">🔍</span>
                    <input type="text" placeholder={placeholderBusqueda}
                        value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 rounded-lg text-body outline-none bg-white dark:bg-[#2E2E2E] text-ink placeholder-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05] focus:border-[#D13A28] dark:focus:border-[#E8422F]" />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">✕</button>
                    )}
                </div>
            )}

            {/* Período — barra segmentada */}
            <SegmentBar items={periodos} value={periodoRapido} onChange={(v) => { aplicarRapido(v); setMostrarRango(false); }} />

            {/* Selector mes + rango */}
            <div className="flex gap-1.5 items-center">
                {mesesDisponibles?.length > 0 && (
                    <select value={mesSelector}
                        onChange={e => aplicarMesSelector(e.target.value)}
                        className={`h-8 px-2 rounded-lg text-label font-bold outline-none flex-1 bg-white dark:bg-[#2E2E2E] text-secondary shadow-sm ${
                            mesSelector ? 'border-[1.5px] border-brand-red' : 'border border-black/[0.05] dark:border-white/[0.05]'
                        }`}>
                        <option value="">Elegir mes...</option>
                        {mesesDisponibles.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
                    </select>
                )}
                {conRango && (
                    <button onClick={() => setMostrarRango(!mostrarRango)}
                        className={`h-8 px-3 rounded-lg text-label font-bold uppercase transition-all active:scale-95 ${
                            mostrarRango ? 'bg-brand-red text-white' : 'bg-white dark:bg-[#2E2E2E] text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]'
                        }`}>
                        Rango
                    </button>
                )}
            </div>

            {/* Rango personalizado */}
            {mostrarRango && (
                <div className="flex gap-1.5 items-center">
                    <DateInput value={desdeLocal} onChange={setDesdeLocal}
                        className="flex-1 h-8 px-2 rounded-lg text-caption font-bold outline-none bg-white dark:bg-[#2E2E2E] text-ink shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                    <span className="text-label text-muted">a</span>
                    <DateInput value={hastaLocal} onChange={setHastaLocal}
                        className="flex-1 h-8 px-2 rounded-lg text-caption font-bold outline-none bg-white dark:bg-[#2E2E2E] text-ink shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                    <button onClick={() => { aplicarRango(desdeLocal, hastaLocal); setMostrarRango(false); }}
                        className="h-8 px-3 rounded-lg text-label font-bold text-white active:scale-95 bg-brand-red">OK</button>
                </div>
            )}

            {/* Estado — barra segmentada */}
            {estados.length > 0 && (
                <SegmentBar
                    items={[{ value: 'TODOS', label: 'Todos' }, ...estados]}
                    value={estado}
                    onChange={setEstado}
                />
            )}
        </div>
    );
}
