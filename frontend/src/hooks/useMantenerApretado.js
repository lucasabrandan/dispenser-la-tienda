import { useRef, useCallback } from 'react';

// Mantener apretado (≈0,5 s) para elegir varios (5-oct-2026). Devuelve handlers
// para la fila; si el dedo se mueve, se cancela (era un scroll). El toque que
// sigue al mantener apretado no cuenta como clic.
export function useMantenerApretado(onLargo, ms = 500) {
    const timer = useRef(null);
    const pos = useRef(null);
    const fue = useRef(false);
    const cancelar = () => { clearTimeout(timer.current); timer.current = null; };
    const onTouchStart = useCallback((e, dato) => {
        fue.current = false;
        pos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        cancelar();
        timer.current = setTimeout(() => { fue.current = true; navigator.vibrate?.(30); onLargo(dato); }, ms);
    }, [onLargo, ms]);
    const onTouchMove = useCallback((e) => {
        if (!pos.current) return;
        const dx = e.touches[0].clientX - pos.current.x, dy = e.touches[0].clientY - pos.current.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelar();
    }, []);
    const onTouchEnd = useCallback(() => cancelar(), []);
    const onClickCapture = useCallback((e) => { if (fue.current) { e.stopPropagation(); e.preventDefault(); fue.current = false; } }, []);
    return { onTouchStart, onTouchMove, onTouchEnd, onClickCapture };
}
