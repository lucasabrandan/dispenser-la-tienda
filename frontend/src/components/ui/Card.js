import React from 'react';

export default function Card({ children, style, className }) {
    return (
        <div 
            className={className}
            style={{
                backgroundColor: '#FFFFFF', // Blanco puro garantizado
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', // Sombra suave tipo ML
                border: '1px solid #E5E7EB', // Borde gris claro
                marginBottom: '15px',
                width: '100%',
                boxSizing: 'border-box',
                ...style // Permite ajustes extra si son necesarios
            }}
        >
            {children}
        </div>
    );
}