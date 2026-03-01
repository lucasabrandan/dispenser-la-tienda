import React from 'react';

export default function Button({ children, onClick, variant = 'primary', style, ...props }) {
    // Función que define el color según el "variant"
    const getVariantStyles = () => {
        switch(variant) {
            case 'primary': 
                return { backgroundColor: '#000000', color: '#ffffff', border: 'none' };
            case 'success': 
                return { backgroundColor: 'var(--brand-yellow)', color: '#000000', border: 'none' };
            case 'danger': 
                return { backgroundColor: 'var(--brand-red)', color: '#ffffff', border: 'none' };
            case 'secondary': 
                return { backgroundColor: '#ffffff', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
            default: 
                return { backgroundColor: '#000000', color: '#ffffff', border: 'none' };
        }
    };

    const baseStyle = {
        padding: '14px 20px',
        borderRadius: 'var(--border-radius-btn)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '700',
        textTransform: 'uppercase', // Le da un toque más profesional
        letterSpacing: '0.5px',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...getVariantStyles(),
        ...style // Permite sobreescribir estilos si es necesario
    };

    return (
        <button 
            style={baseStyle} 
            onClick={onClick} 
            // Efecto visual al tocar el botón
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            {...props}
        >
            {children}
        </button>
    );
}