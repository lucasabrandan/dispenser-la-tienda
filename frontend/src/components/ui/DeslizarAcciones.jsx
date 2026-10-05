import React, { useRef, useState } from 'react';

// Tarjeta que se desliza para hacer algo rápido con una mano (5-oct-2026).
// derecha / izquierda: { label, color, Icon, accion } — la acción corre al
// pasar el umbral y soltar. Mientras se desliza, abajo se ve qué va a pasar.
const UMBRAL = 90;

export default function DeslizarAcciones({ derecha, izquierda, deshabilitado, children }) {
    const ini = useRef(null);
    const [dx, setDx] = useState(0);
    const [arrastrando, setArrastrando] = useState(false);

    if (deshabilitado || (!derecha && !izquierda)) return children;

    const start = (e) => {
        if (e.target.closest('input, textarea, select, [role="dialog"], .fixed')) { ini.current = null; return; }
        ini.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, eje: null };
    };
    const move = (e) => {
        const s = ini.current; if (!s) return;
        const mx = e.touches[0].clientX - s.x, my = e.touches[0].clientY - s.y;
        if (!s.eje) { if (Math.abs(mx) < 8 && Math.abs(my) < 8) return; s.eje = Math.abs(mx) > Math.abs(my) * 1.3 ? 'x' : 'y'; }
        if (s.eje !== 'x') return;
        let v = mx;
        if (v > 0 && !derecha) v = 0;
        if (v < 0 && !izquierda) v = 0;
        setArrastrando(true);
        setDx(Math.max(-140, Math.min(140, v)));
    };
    const end = () => {
        const v = dx; ini.current = null; setArrastrando(false); setDx(0);
        if (v >= UMBRAL && derecha) derecha.accion();
        else if (v <= -UMBRAL && izquierda) izquierda.accion();
    };

    const lado = dx > 0 ? derecha : dx < 0 ? izquierda : null;
    const listo = Math.abs(dx) >= UMBRAL;
    return (
        <div className="relative rounded-2xl" data-noswipe>
            {lado && (
                <div className={`absolute inset-0 rounded-2xl flex items-center px-5 ${dx > 0 ? 'justify-start' : 'justify-end'}`}
                    style={{ background: lado.color, opacity: listo ? 1 : 0.55 }}>
                    <span className="flex items-center gap-2 text-white font-black text-body">
                        {lado.Icon && <lado.Icon size={18} />} {lado.label}
                    </span>
                </div>
            )}
            <div onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}
                // sin transform en reposo: si no, las ventanas "fixed" de adentro de la tarjeta quedarían encerradas en ella
                style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: arrastrando ? 'none' : 'transform 180ms ease-out', touchAction: 'pan-y' }}
                className="relative">
                {children}
            </div>
        </div>
    );
}
