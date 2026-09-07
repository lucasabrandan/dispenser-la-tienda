import React from 'react';
import MiEspacioBoard from './MiEspacioBoard';

// Pantalla completa de Mi Espacio -- desde el 7-sep-2026 el tablero en si
// (pestañas + columnas + notas) vive en MiEspacioBoard.jsx, compartido con
// el Panel del admin y con Mi Agenda del técnico. Esta pantalla le pone el
// encabezado propio y el layout de página completa.
export default function MiEspacio() {
    return (
        <div className="min-h-screen bg-page pb-28 transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">Mi Espacio</h2>
                        <span className="text-caption font-bold text-muted md:ml-2">Notas propias, solo para vos</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4">
                <MiEspacioBoard />
            </div>
        </div>
    );
}
