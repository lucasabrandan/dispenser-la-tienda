import React, { useRef, useEffect, useCallback, useState } from 'react';

/**
 * SwipeColumns — navegación por estados swipeable (mobile) / tabs (desktop).
 * Reutilizable para Servicio Técnico, Presupuestos, Despacho, etc.
 *
 * Props:
 *   columns:        [{ id, label, fullLabel, count, color, icon }]
 *   activeId:       string — id de la columna activa
 *   onChangeColumn: (id) => void
 */
export default function SwipeColumns({ columns, activeId, onChangeColumn }) {
    const scrollRef = useRef(null);
    const scrollTimer = useRef(null);
    const programmatic = useRef(false);
    const [sidePad, setSidePad] = useState(0);

    // Calcular padding lateral para centrar si los chips caben en pantalla
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const totalWidth = Array.from(container.children).reduce((sum, el) => sum + el.offsetWidth, 0);
        const gaps = (columns.length - 1) * 8; // gap-2 = 8px
        const contentWidth = totalWidth + gaps;
        const available = container.offsetWidth;
        if (contentWidth < available) {
            setSidePad(Math.floor((available - contentWidth) / 2));
        } else {
            setSidePad(16); // px-4 standard
        }
    }, [columns]);

    // Scroll programático al cambiar activeId
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const idx = columns.findIndex(c => c.id === activeId);
        if (idx < 0) return;
        const child = container.children[idx];
        if (!child) return;
        programmatic.current = true;
        const targetLeft = child.offsetLeft - (container.offsetWidth / 2) + (child.offsetWidth / 2);
        container.scrollTo({ left: targetLeft, behavior: 'smooth' });
        setTimeout(() => { programmatic.current = false; }, 400);
    }, [activeId, columns]);

    // Detectar snap al terminar scroll
    const handleScroll = useCallback(() => {
        if (programmatic.current) return;
        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
            const container = scrollRef.current;
            if (!container || !container.children.length) return;
            const center = container.scrollLeft + container.offsetWidth / 2;
            let closestIdx = 0;
            let closestDist = Infinity;
            Array.from(container.children).forEach((card, idx) => {
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                const dist = Math.abs(cardCenter - center);
                if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
            });
            const col = columns[closestIdx];
            if (col && col.id !== activeId) onChangeColumn(col.id);
        }, 80);
    }, [columns, activeId, onChangeColumn]);

    return (
        <>
            {/* ═══ MOBILE: chips horizontales scrolleables ═══ */}
            <div className="md:hidden">
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
                    style={{ paddingLeft: sidePad, paddingRight: sidePad }}
                >
                    {columns.map(col => {
                        const activo = col.id === activeId;
                        return (
                            <button
                                key={col.id}
                                onClick={() => onChangeColumn(col.id)}
                                className={`snap-center shrink-0 rounded-xl px-4 py-2 text-left transition-all active:scale-[0.97] border ${
                                    activo
                                        ? 'shadow-md border-transparent'
                                        : 'bg-white dark:bg-[#242424] border-black/[0.05] dark:border-white/[0.05] shadow-sm'
                                }`}
                                style={activo ? { backgroundColor: col.color || '#D13A28' } : {}}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`text-[12px] font-black whitespace-nowrap ${activo ? 'text-white' : 'text-[#1C1917] dark:text-[#F0EEE9]'}`}>
                                        {col.fullLabel || col.label}
                                    </span>
                                    {col.count != null && (
                                        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md leading-none ${activo ? 'bg-white/20 text-white' : 'bg-[#EFEDEA] dark:bg-[#1C1C1C] text-[#A8A29E]'}`}>
                                            {col.count}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-1.5 mt-2">
                    {columns.map(col => (
                        <div
                            key={col.id}
                            className={`rounded-full transition-all duration-200 ${
                                col.id === activeId
                                    ? 'w-4 h-1.5 bg-[#D13A28] dark:bg-[#E8422F]'
                                    : 'w-1.5 h-1.5 bg-[#E8E5E0] dark:bg-[#2E2E2E]'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* ═══ DESKTOP: tabs pipeline ═══ */}
            <div className="hidden md:flex items-center rounded-lg overflow-hidden shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                {columns.map((col, i) => {
                    const activo = col.id === activeId;
                    const idx = columns.findIndex(c => c.id === activeId);
                    const completado = i < idx;
                    return (
                        <button
                            key={col.id}
                            onClick={() => onChangeColumn(col.id)}
                            className={`flex-1 h-10 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase transition-all active:scale-[0.98] ${
                                activo
                                    ? 'text-white z-[1]'
                                    : completado
                                        ? 'bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#9E9A94]'
                                        : 'bg-white dark:bg-[#1C1C1C] text-[#A8A29E]'
                            } ${i > 0 ? 'border-l border-black/[0.05] dark:border-white/[0.05]' : ''}`}
                            style={activo ? { backgroundColor: col.color || '#D13A28' } : {}}
                        >
                            <span>{col.label}</span>
                            {col.count != null && (
                                <span className={`text-[10px] ${activo ? 'text-white/70' : ''}`}>({col.count})</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
}
