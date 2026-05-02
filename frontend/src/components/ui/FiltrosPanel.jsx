import React, { useState } from 'react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatMes(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MESES[parseInt(m) - 1]} ${y}`;
}

export default function FiltrosPanel({ estados = [], conBusqueda = true, conRango = true, placeholderBusqueda = 'Buscar...', hook }) {
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
    const [desdeLocal,   setDesdeLocal]   = useState('');
    const [hastaLocal,   setHastaLocal]   = useState('');

    // ── Pill de período rápido ──────────────────────────────────────────────
    const btnRapido = (tipo, label) => {
        const activo = periodoRapido === tipo && !mesSelector;
        return (
            <button
                key={tipo}
                onClick={() => { aplicarRapido(tipo); setMostrarRango(false); }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95 ${
                    activo
                        ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                        : 'bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="rounded-2xl p-4 mb-3 space-y-3 bg-[#EDEAE6] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07]">
            {/* FILA 1 — Períodos rápidos + selector mes + rango */}
            <div className="flex flex-wrap gap-2 items-center">
                {btnRapido('MES',     'Este mes')}
                {btnRapido('MES_ANT', 'Mes ant.')}
                {btnRapido('ANO',     'Este año')}
                {btnRapido('TODO',    'Todo')}

                {mesesDisponibles.length > 0 && (
                    <select
                        value={mesSelector}
                        onChange={e => aplicarMesSelector(e.target.value)}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold outline-none transition-all bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] ${
                            mesSelector
                                ? 'border-[1.5px] border-[#D13A28] dark:border-[#E8422F]'
                                : 'border border-transparent'
                        }`}
                    >
                        <option value="">Elegir mes...</option>
                        {mesesDisponibles.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
                    </select>
                )}

                {conRango && (
                    <button
                        onClick={() => setMostrarRango(!mostrarRango)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95 ${
                            mostrarRango
                                ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white'
                                : 'bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                        }`}
                    >
                        Rango
                    </button>
                )}

                <span className="ml-auto text-[10px] font-bold text-[#A8A29E] uppercase shrink-0">
                    {totalItems} resultado{totalItems !== 1 ? 's' : ''} · pág {pagina}/{totalPaginas}
                </span>
            </div>

            {/* RANGO PERSONALIZADO */}
            {mostrarRango && (
                <div className="flex gap-2 items-center flex-wrap pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[10px] font-bold text-[#A8A29E] uppercase">Desde</span>
                    <input
                        type="date"
                        value={desdeLocal}
                        onChange={e => setDesdeLocal(e.target.value)}
                        className="px-2 py-1.5 rounded-xl text-[11px] font-bold outline-none border border-black/[0.08] dark:border-white/[0.08] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]"
                    />
                    <span className="text-[10px] font-bold text-[#A8A29E] uppercase">Hasta</span>
                    <input
                        type="date"
                        value={hastaLocal}
                        onChange={e => setHastaLocal(e.target.value)}
                        className="px-2 py-1.5 rounded-xl text-[11px] font-bold outline-none border border-black/[0.08] dark:border-white/[0.08] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9]"
                    />
                    <button
                        onClick={() => { aplicarRango(desdeLocal, hastaLocal); setMostrarRango(false); }}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all active:scale-95 bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-80"
                    >
                        Aplicar
                    </button>
                    <button
                        onClick={() => { setMostrarRango(false); setDesdeLocal(''); setHastaLocal(''); aplicarRapido('MES'); }}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] hover:opacity-80"
                    >
                        Limpiar
                    </button>
                </div>
            )}

            {/* FILA 2 — Estado + búsqueda */}
            {(estados.length > 0 || conBusqueda) && (
                <div className="flex gap-2 flex-wrap items-center pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    {estados.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                            {[{ value: 'TODOS', label: 'Todos' }, ...estados].map(e => {
                                const activo = estado === e.value;
                                return (
                                    <button
                                        key={e.value}
                                        onClick={() => setEstado(e.value)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95 ${
                                            activo
                                                ? 'bg-[#1C1917] dark:bg-[#F0EEE9] text-[#F0EEE9] dark:text-[#1C1917]'
                                                : 'bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                                        }`}
                                    >
                                        {e.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {conBusqueda && (
                        <div className="relative flex-1 min-w-[160px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs">🔍</span>
                            <input
                                type="text"
                                placeholder={placeholderBusqueda}
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] font-medium outline-none transition-all border border-black/[0.07] dark:border-white/[0.07] focus:border-[#D13A28] dark:focus:border-[#E8422F] bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder-[#A8A29E]"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}