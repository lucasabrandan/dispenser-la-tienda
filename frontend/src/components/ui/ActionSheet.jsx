import React from 'react';

// Sheet deslizable desde abajo para menús de "más acciones" (⋯ / ⋮).
// Antes este mismo shell (fondo + panel + agarradera) estaba copiado y
// pegado, idéntico, en 5 lugares distintos: Cliente (cliente y equipo),
// Presupuestos, Servicio Técnico y Historial (auditoría UX/UI, punto B1).
// Cada pantalla sigue definiendo sus propios botones — este componente
// solo unifica el contenedor, no la lista de acciones.
export default function ActionSheet({ open, onClose, children }) {
    if (!open) return null;
    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-[100]" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[101] rounded-t-2xl p-2 pb-6 bg-white dark:bg-[#242424] shadow-2xl border-t border-black/[0.08] dark:border-white/[0.08]">
                <div className="w-10 h-1 rounded-full mx-auto mb-2 bg-chip" />
                {children}
            </div>
        </>
    );
}
