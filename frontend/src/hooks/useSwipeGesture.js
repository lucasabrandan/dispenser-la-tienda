import { useRef, useCallback } from 'react';

/**
 * useSwipeGesture — detecta swipe horizontal en un área y navega entre columnas.
 * Devuelve handlers para adjuntar al contenedor del contenido.
 *
 * @param {string[]} columnIds — IDs de las columnas en orden
 * @param {string} activeId — ID de la columna activa
 * @param {function} onChange — callback al cambiar de columna
 * @param {object} opts — { threshold: px mínimos para considerar swipe }
 */
export function useSwipeGesture(columnIds, activeId, onChange, { threshold = 50 } = {}) {
    const startX = useRef(0);
    const startY = useRef(0);
    const swiping = useRef(false);

    const onTouchStart = useCallback((e) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        swiping.current = true;
    }, []);

    const onTouchEnd = useCallback((e) => {
        if (!swiping.current) return;
        swiping.current = false;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - startX.current;
        const deltaY = endY - startY.current;

        // Solo si el movimiento es más horizontal que vertical
        if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

        const idx = columnIds.indexOf(activeId);
        if (idx < 0) return;

        if (deltaX < 0 && idx < columnIds.length - 1) {
            // Swipe izquierda → siguiente
            onChange(columnIds[idx + 1]);
        } else if (deltaX > 0 && idx > 0) {
            // Swipe derecha → anterior
            onChange(columnIds[idx - 1]);
        }
    }, [columnIds, activeId, onChange, threshold]);

    return { onTouchStart, onTouchEnd };
}
