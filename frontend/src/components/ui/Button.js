import React from 'react';

export default function Button({ children, onClick, variant = 'primary', style, ...props }) {
    const getVariantStyles = () => {
        switch(variant) {
            case 'primary': return { backgroundColor: 'var(--brand-red)', color: 'white', border: 'none' };
            case 'success': return { backgroundColor: 'var(--brand-yellow)', color: 'var(--bg-main)', border: 'none', fontWeight: 'bold' };
            case 'secondary': return { backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
            default: return { backgroundColor: 'var(--brand-red)', color: 'white', border: 'none' };
        }
    };

    const baseStyle = {
        padding: '12px 20px',
        borderRadius: 'var(--border-radius-btn)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        ...getVariantStyles(),
        ...style
    };

    return (
        <button style={baseStyle} onClick={onClick} {...props}>
            {children}
        </button>
    );
}