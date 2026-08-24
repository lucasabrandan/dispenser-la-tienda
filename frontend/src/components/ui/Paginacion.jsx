import React from 'react';

/**
 * Paginacion — barra de navegación de páginas.
 * Muestra máximo 5 páginas visibles con elipsis.
 * Usa el sistema de color de marca: rojo activo, neutro inactivo.
 */
export default function Paginacion({ pagina, totalPaginas, irA, next, prev }) {
    if (totalPaginas <= 1) return null;

    // Páginas visibles: siempre primera, última, y las cercanas a la actual
    const paginas = [];
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= pagina - 1 && i <= pagina + 1)) {
            paginas.push(i);
        } else if (paginas[paginas.length - 1] !== '...') {
            paginas.push('...');
        }
    }

    // Clases base comunes a todos los botones de paginación
    const baseClass = 'w-9 h-9 rounded-[10px] text-[12px] font-bold flex items-center justify-center transition-all';

    return (
        <div className="flex items-center justify-center gap-1.5 py-3">
            {/* Anterior */}
            <button
                onClick={prev}
                disabled={pagina === 1}
                className={`${baseClass} bg-chip text-secondary disabled:opacity-40 disabled:cursor-not-allowed`}
            >
                ‹
            </button>

            {/* Páginas */}
            {paginas.map((p, i) =>
                p === '...'
                    ? (
                        <span
                            key={`e${i}`}
                            className="w-9 text-center text-[12px] font-bold text-muted"
                        >
                            ···
                        </span>
                    )
                    : (
                        <button
                            key={p}
                            onClick={() => irA(p)}
                            className={`${baseClass} ${
                                p === pagina
                                    ? 'bg-brand-red text-white'
                                    : 'bg-chip text-secondary'
                            }`}
                        >
                            {p}
                        </button>
                    )
            )}

            {/* Siguiente */}
            <button
                onClick={next}
                disabled={pagina === totalPaginas}
                className={`${baseClass} bg-chip text-secondary disabled:opacity-40 disabled:cursor-not-allowed`}
            >
                ›
            </button>
        </div>
    );
}