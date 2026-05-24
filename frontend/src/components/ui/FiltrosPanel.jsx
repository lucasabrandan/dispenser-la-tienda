import React, { useState } from 'react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function formatMes(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MESES[parseInt(m) - 1]} ${y}`;
}

const btn = (activo) => `h-8 px-3 rounded-lg text-[11px] font-bold uppercase transition-all active:scale-95 ${
    activo ? 'bg-[#D13A28] dark:bg-[#E8422F] text-white' : 'bg-white dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'
}`;

const btnDark = (activo) => `h-8 px-3 rounded-lg text-[11px] font-bold uppercase transition-all active:scale-95 ${
    activo ? 'bg-[#1C1917] dark:bg-[#F0EEE9] text-white dark:text-[#1C1917]' : 'bg-white dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] shadow-sm border border-black/[0.05] dark:border-white/[0.05]'
}`;

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
    const [desdeLocal, setDesdeLocal] = useState('');
    const [hastaLocal, setHastaLocal] = useState('');

    return (
        <div className="space-y-3">

            {/* Búsqueda — siempre arriba, ancho completo */}
            {conBusqueda && (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-sm pointer-events-none">🔍</span>
                    <input type="text" placeholder={placeholderBusqueda}
                        value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg text-[13px] outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05] focus:border-[#D13A28] dark:focus:border-[#E8422F]" />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs font-bold">✕</button>
                    )}
                </div>
            )}

            {/* Período */}
            <div className="flex flex-wrap gap-1.5 items-center">
                {['MES', 'MES_ANT', 'ANO', 'TODO'].map(tipo => (
                    <button key={tipo}
                        onClick={() => { aplicarRapido(tipo); setMostrarRango(false); }}
                        className={btn(periodoRapido === tipo && !mesSelector)}>
                        {{ MES: 'Este mes', MES_ANT: 'Mes ant.', ANO: 'Este año', TODO: 'Todo' }[tipo]}
                    </button>
                ))}

                {mesesDisponibles?.length > 0 && (
                    <select value={mesSelector}
                        onChange={e => aplicarMesSelector(e.target.value)}
                        className={`h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94] shadow-sm ${
                            mesSelector ? 'border-[1.5px] border-[#D13A28] dark:border-[#E8422F]' : 'border border-black/[0.05] dark:border-white/[0.05]'
                        }`}>
                        <option value="">Elegir mes...</option>
                        {mesesDisponibles.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
                    </select>
                )}

                {conRango && (
                    <button onClick={() => setMostrarRango(!mostrarRango)}
                        className={btn(mostrarRango)}>
                        Rango
                    </button>
                )}

                <span className="ml-auto text-[10px] font-bold text-[#A8A29E] shrink-0">
                    {totalItems} resultados · pág {pagina}/{totalPaginas}
                </span>
            </div>

            {/* Rango personalizado */}
            {mostrarRango && (
                <div className="flex gap-2 items-center flex-wrap">
                    <input type="date" value={desdeLocal} onChange={e => setDesdeLocal(e.target.value)}
                        className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                    <span className="text-[10px] text-[#A8A29E]">a</span>
                    <input type="date" value={hastaLocal} onChange={e => setHastaLocal(e.target.value)}
                        className="h-8 px-2 rounded-lg text-[11px] font-bold outline-none bg-white dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] shadow-sm border border-black/[0.05] dark:border-white/[0.05]" />
                    <button onClick={() => { aplicarRango(desdeLocal, hastaLocal); setMostrarRango(false); }}
                        className="h-8 px-3 rounded-lg text-[11px] font-bold text-white active:scale-95 bg-[#D13A28] dark:bg-[#E8422F]">Aplicar</button>
                    <button onClick={() => { setMostrarRango(false); setDesdeLocal(''); setHastaLocal(''); aplicarRapido('MES'); }}
                        className="h-8 px-3 rounded-lg text-[11px] font-bold active:scale-95 bg-white dark:bg-[#2E2E2E] text-[#A8A29E] shadow-sm border border-black/[0.05] dark:border-white/[0.05]">Limpiar</button>
                </div>
            )}

            {/* Estado */}
            {estados.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                    {[{ value: 'TODOS', label: 'Todos' }, ...estados].map(e => (
                        <button key={e.value} onClick={() => setEstado(e.value)}
                            className={btnDark(estado === e.value)}>
                            {e.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
