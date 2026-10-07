import { useEffect } from 'react';

// "Cerrar deslizando" (5-oct-2026): en el celular, cualquier ventana que sube
// desde abajo (rounded-t-3xl) se cierra arrastrándola hacia abajo desde su
// parte de arriba (la manija o el título). Se monta una sola vez en el Layout.
// Para cerrar "toca" el fondo oscuro, que en todas las ventanas ya cierra.
const ZONA = 64;     // px desde el borde de arriba de la hoja que sirven para agarrar
const UMBRAL = 90;   // px hacia abajo para cerrar

function fondoDe(hoja) {
    const overlay = hoja.closest('.fixed.inset-0');
    if (overlay && overlay !== hoja) return overlay;
    const cont = hoja.closest('.fixed');
    const prev = cont && cont.previousElementSibling;
    if (prev && prev.matches('.fixed.inset-0')) return prev;
    return null;
}

export function useArrastrarHojas() {
    useEffect(() => {
        let hoja = null, y0 = 0, dy = 0;
        const start = (e) => {
            if (window.innerWidth >= 768) return;
            const t = e.target;
            if (!t.closest || t.closest('input, textarea, select, canvas')) return;
            const h = t.closest('.rounded-t-3xl');
            if (!h || !h.closest('.fixed')) return;
            const y = e.touches[0].clientY;
            if (y - h.getBoundingClientRect().top > ZONA && !t.closest('[data-hoja-handle]')) return;
            hoja = h; y0 = y; dy = 0;
            hoja.style.transition = 'none';
        };
        const move = (e) => {
            if (!hoja) return;
            dy = Math.max(0, e.touches[0].clientY - y0);
            hoja.style.transform = dy ? `translateY(${dy}px)` : '';
        };
        const end = () => {
            if (!hoja) return;
            const h = hoja; hoja = null;
            h.style.transition = 'transform 180ms ease-out';
            const fondo = dy >= UMBRAL ? fondoDe(h) : null;
            if (fondo) {
                h.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    fondo.click();
                    // Testeo integral C5 (7-oct-2026): hay hojas cuyo fondo NO cierra a propósito
                    // (Cerrar por N/S, Cierre mensual, Repuesto) para no perder lo cargado. Antes
                    // la hoja quedaba fuera de pantalla con el fondo negro tapando todo y la app
                    // parecía trabada. Si después del "toque" la hoja sigue ahí, vuelve a su lugar.
                    setTimeout(() => { if (h.isConnected) h.style.transform = ''; }, 220);
                }, 120);
            }
            else h.style.transform = '';
        };
        document.addEventListener('touchstart', start, { passive: true });
        document.addEventListener('touchmove', move, { passive: true });
        document.addEventListener('touchend', end);
        document.addEventListener('touchcancel', end);
        return () => {
            document.removeEventListener('touchstart', start);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('touchend', end);
            document.removeEventListener('touchcancel', end);
        };
    }, []);
}
