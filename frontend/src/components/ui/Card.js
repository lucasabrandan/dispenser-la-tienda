import React from 'react';

export default function Card({ children, style }) {
    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--border-radius-card)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid var(--border-color)',
            ...style
        }}>
            {children}
        </div>
    );
}