import React from 'react';
import { LuX } from 'react-icons/lu';

// Ventana estándar (5-oct-2026). Celu: hoja desde abajo. Compu: centrada.
// Título y X fijos arriba, contenido con scroll en el medio y pie fijo abajo.
// El scroll reserva el mismo espacio a los dos lados, así el contenido queda
// centrado (antes la barra de scroll comía margen solo a la derecha).
export default function ModalShell({ titulo, subtitulo, onCerrar, pie, ancho = 'md:max-w-lg', children }) {
    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 dark:bg-black/75 flex items-end md:items-center justify-center md:p-6 md:pl-[calc(var(--modal-sb,0px)+1.5rem)] md:pr-6" onClick={onCerrar}>
            <div className={`w-full ${ancho} max-h-[calc(var(--vh,1vh)*92)] md:max-h-[calc(var(--vh,1vh)*88)] bg-card rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden shadow-2xl`}
                onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
                <div data-hoja-handle className="shrink-0 flex items-center gap-3 px-5 pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-body-lg font-black text-ink leading-tight truncate">{titulo}</h2>
                        {subtitulo && <p className="text-caption text-muted truncate">{subtitulo}</p>}
                    </div>
                    <button type="button" onClick={onCerrar} aria-label="Cerrar"
                        className="w-9 h-9 shrink-0 rounded-xl bg-chip text-muted flex items-center justify-center active:scale-95"><LuX size={17} /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable_both-edges]">
                    {children}
                </div>
                {pie && (
                    <div className="shrink-0 px-5 pt-3 pb-5 md:pb-4 border-t border-black/[0.06] dark:border-white/[0.06]">{pie}</div>
                )}
            </div>
        </div>
    );
}
