import React, { useState, useRef, useCallback } from 'react';
import { Label, M } from './ServicioUI';

export default function TicketItemsList({ ticketItems, editarItem, eliminarItem, onReorder }) {
    const [dragIdx, setDragIdx] = useState(null);
    const [overIdx, setOverIdx] = useState(null);
    const longPressTimer = useRef(null);
    const touchStartY = useRef(null);
    const containerRef = useRef(null);

    // Long-press para activar drag (touch)
    const handleTouchStart = useCallback((idx, e) => {
        touchStartY.current = e.touches[0].clientY;
        longPressTimer.current = setTimeout(() => {
            setDragIdx(idx);
            // Vibración háptica si está disponible
            if (navigator.vibrate) navigator.vibrate(30);
        }, 400);
    }, []);

    const handleTouchMove = useCallback((e) => {
        // Si aún no activó drag, cancelar si se movió mucho
        if (dragIdx === null) {
            if (longPressTimer.current && touchStartY.current !== null) {
                const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
                if (dy > 10) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }
            return;
        }
        e.preventDefault();
        // Determinar sobre qué item está el dedo
        const touch = e.touches[0];
        const container = containerRef.current;
        if (!container) return;
        const children = Array.from(container.children);
        for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect();
            if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                setOverIdx(i);
                return;
            }
        }
    }, [dragIdx]);

    const handleTouchEnd = useCallback(() => {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx && onReorder) {
            onReorder(prev => {
                const copia = [...prev];
                const [moved] = copia.splice(dragIdx, 1);
                copia.splice(overIdx, 0, moved);
                return copia;
            });
        }
        setDragIdx(null);
        setOverIdx(null);
    }, [dragIdx, overIdx, onReorder]);

    if (ticketItems.length === 0) return null;

    return (
        <div>
            <Label>
                {ticketItems.length} equipo{ticketItems.length > 1 ? 's' : ''} en el ticket
                {onReorder && ticketItems.length > 1 && (
                    <span className="text-[9px] font-medium text-muted ml-2">
                        mantener presionado para reordenar
                    </span>
                )}
            </Label>
            <div
                ref={containerRef}
                className="flex flex-col gap-2"
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {ticketItems.map((it, idx) => {
                    const isDragging = dragIdx === idx;
                    const isOver = dragIdx !== null && overIdx === idx && dragIdx !== idx;
                    return (
                        <div
                            key={idx}
                            onTouchStart={(e) => onReorder && ticketItems.length > 1 ? handleTouchStart(idx, e) : null}
                            onTouchCancel={() => { clearTimeout(longPressTimer.current); setDragIdx(null); setOverIdx(null); }}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all
                                bg-chip
                                ${isDragging
                                    ? 'opacity-50 scale-95 border-brand-red'
                                    : isOver
                                        ? 'border-brand-amber shadow-md'
                                        : 'border-black/10 dark:border-white/10'
                                }
                                ${dragIdx !== null ? 'select-none' : ''}
                            `}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {/* Handle visual de drag */}
                                {onReorder && ticketItems.length > 1 && (
                                    <span className={`text-[10px] flex-shrink-0 transition-colors ${dragIdx !== null ? 'text-[#D48800]' : 'text-muted'}`}>
                                        ⠿
                                    </span>
                                )}
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 bg-brand-red">
                                    {idx + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold truncate text-ink">
                                        {it.equipoSerial || 'Sin S/N'}
                                    </p>
                                    <p className="text-[10px] truncate text-muted">
                                        {it.resumenTexto}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <M valor={it.totalCalculado} className="text-[13px] font-black text-ink" />
                                <button onClick={() => editarItem(idx)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] bg-[#D48800]/20 text-brand-amber active:scale-90 transition-all"
                                    title="Editar equipo">✏️</button>
                                <button onClick={() => eliminarItem(idx)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] bg-[#D13A28]/10 text-brand-red active:scale-90 transition-all"
                                    title="Eliminar equipo">✕</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
