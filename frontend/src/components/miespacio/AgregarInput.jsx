import React, { useState } from 'react';
import { LuPlus } from 'react-icons/lu';

// Input generico de "agregar algo con un texto corto", extraido de
// MiEspacioBoard.jsx (8-sep-2026) para compartirlo con MiEspacioChecklist.jsx
// sin duplicar la logica. Guarda automaticamente al perder el foco (el
// teclado del celu no siempre dispara "Enter" con el boton "Ir"/"Listo") y
// suma un boton "+" para no depender del todo de la tecla.
export default function AgregarInput({ placeholder = '+ agregar', onAgregar }) {
    const [valor, setValor] = useState('');

    const submit = () => {
        const texto = valor.trim();
        if (!texto) return;
        onAgregar(texto);
        setValor('');
    };

    return (
        <div className="flex items-center gap-1.5 mt-auto">
            <input
                placeholder={placeholder}
                value={valor}
                onChange={e => setValor(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); submit(); }
                    if (e.key === 'Escape') { setValor(''); e.target.blur(); }
                }}
                onBlur={submit}
                className="flex-1 min-w-0 text-body font-medium text-ink bg-card border border-dashed border-black/15 dark:border-white/15 rounded-xl px-3 py-2 outline-none focus:border-brand-red focus:border-solid placeholder:text-muted" />
            <button
                onMouseDown={e => e.preventDefault()}
                onClick={submit}
                disabled={!valor.trim()}
                title="Agregar"
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-brand-red text-white active:scale-90 disabled:opacity-30 transition-opacity">
                <LuPlus size={16} />
            </button>
        </div>
    );
}
