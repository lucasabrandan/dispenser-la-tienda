import React from 'react';

// Botón cuadrado de ícono — usado en las barras de acciones de tarjetas
// (Servicio Técnico, Presupuestos, Historial). Antes estaba copiado y
// pegado, idéntico, en 3 archivos distintos (auditoría UX/UI, punto B1).
export default function IconBtn({ onClick, title, children, cls = '' }) {
    return (
        <button onClick={onClick} title={title}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 shrink-0 ${cls}`}>
            {children}
        </button>
    );
}
