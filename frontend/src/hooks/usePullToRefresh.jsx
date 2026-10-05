import React, { useRef, useState, useCallback } from 'react';
import { LuRefreshCw } from 'react-icons/lu';

// "Bajar para actualizar" (5-oct-2026): con la pantalla arriba de todo, tirar
// hacia abajo recarga los datos (como WhatsApp/Instagram). Solo celular (touch).
const UMBRAL = 70;

export function usePullToRefresh(onRefresh) {
    const inicio = useRef(null);
    const [tirada, setTirada] = useState(0);
    const [cargando, setCargando] = useState(false);

    const onTouchStart = useCallback((e) => {
        const main = e.currentTarget.closest('main');
        const arriba = (main ? main.scrollTop : window.scrollY) <= 0;
        const enVentana = e.target.closest && e.target.closest('[role="dialog"], .fixed, input, textarea');
        inicio.current = arriba && !enVentana && !cargando ? e.touches[0].clientY : null;
    }, [cargando]);

    const onTouchMove = useCallback((e) => {
        if (inicio.current == null) return;
        const dy = e.touches[0].clientY - inicio.current;
        setTirada(dy > 0 ? Math.min(dy * 0.5, 100) : 0);
    }, []);

    const onTouchEnd = useCallback(async () => {
        if (inicio.current == null) return;
        inicio.current = null;
        if (tirada >= UMBRAL) {
            setCargando(true); setTirada(UMBRAL);
            try { await onRefresh?.(); } finally { setCargando(false); setTirada(0); }
        } else setTirada(0);
    }, [tirada, onRefresh]);

    const visible = tirada > 8 || cargando;
    const indicador = visible ? (
        <div className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-[top] duration-75" style={{ top: 56 + Math.min(tirada, UMBRAL) - 24 }}>
            <div className="w-10 h-10 rounded-full bg-card shadow-lg border border-black/10 dark:border-white/10 flex items-center justify-center">
                <LuRefreshCw size={18} className={`${cargando ? 'animate-spin' : ''} ${tirada >= UMBRAL || cargando ? 'text-brand-red' : 'text-muted'}`}
                    style={cargando ? undefined : { transform: `rotate(${tirada * 3}deg)` }} />
            </div>
        </div>
    ) : null;

    return { handlers: { onTouchStart, onTouchMove, onTouchEnd }, indicador };
}

// Junta varios grupos de handlers táctiles en uno (ej.: deslizar + bajar para actualizar)
export function unirGestos(...grupos) {
    const out = {};
    grupos.filter(Boolean).forEach(g => Object.entries(g).forEach(([k, fn]) => {
        const prev = out[k];
        out[k] = prev ? (e) => { prev(e); fn(e); } : fn;
    }));
    return out;
}
