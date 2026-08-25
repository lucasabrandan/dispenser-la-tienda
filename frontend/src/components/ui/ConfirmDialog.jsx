import React from 'react';

/**
 * ConfirmDialog — confirmación antes de una acción destructiva o importante.
 * Reemplaza los window.confirm() nativos del navegador (rompían el
 * lenguaje visual propio de la app con el popup del sistema operativo)
 * por el mismo modal que ya se usaba para "Eliminar" en Servicio Técnico.
 */
export default function ConfirmDialog({
    titulo,
    mensaje,
    textoConfirmar = 'Sí, confirmar',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onCancelar,
}) {
    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[1999] backdrop-blur-sm" onClick={onCancelar} />
            <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
                <div className="bg-card rounded-3xl w-full max-w-sm border border-[#D13A28]/30 shadow-2xl p-6"
                    onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-5">
                        <p className="text-[36px] mb-2">⚠️</p>
                        <h3 className="text-title font-black text-ink uppercase">
                            {titulo}
                        </h3>
                    </div>
                    {mensaje && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-[#D13A28]/20 mb-4 space-y-1.5">
                            <p className="text-[11px] text-secondary leading-snug">
                                {mensaje}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={onCancelar}
                            className="flex-1 py-3 rounded-2xl font-black text-[12px] uppercase bg-chip text-secondary active:scale-95">
                            {textoCancelar}
                        </button>
                        <button onClick={onConfirmar}
                            className="flex-[2] py-3 rounded-2xl font-black text-[12px] uppercase text-white bg-brand-red active:scale-95">
                            {textoConfirmar}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
