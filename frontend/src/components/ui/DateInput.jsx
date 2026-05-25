import React, { useRef } from 'react';

/**
 * DateInput — input de fecha que muestra DD/MM/YYYY independiente del locale del SO.
 * Internamente guarda y devuelve formato ISO (YYYY-MM-DD).
 * Al tocar, abre el date picker nativo del browser.
 */
export default function DateInput({ value, onChange, className = '', placeholder = 'DD/MM/AAAA', ...props }) {
    const hiddenRef = useRef(null);

    // Formatear YYYY-MM-DD → DD/MM/YYYY para mostrar
    const formatear = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        if (!y || !m || !d) return iso;
        return `${d}/${m}/${y}`;
    };

    const handleClick = () => {
        // Abrir el date picker nativo
        hiddenRef.current?.showPicker?.();
        hiddenRef.current?.focus();
    };

    return (
        <div className="relative">
            {/* Input visible: muestra DD/MM/YYYY */}
            <input
                type="text"
                readOnly
                value={formatear(value)}
                onClick={handleClick}
                placeholder={placeholder}
                className={`cursor-pointer ${className}`}
                {...props}
            />
            {/* Input nativo oculto: maneja el picker */}
            <input
                ref={hiddenRef}
                type="date"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                tabIndex={-1}
            />
        </div>
    );
}
