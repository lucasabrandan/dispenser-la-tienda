import React from 'react';

export default function Input({ label, ...props }) {
    return (
        <div style={{ marginBottom: '15px' }}>
            {label && <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--brand-yellow)', marginBottom: '5px' }}>{label}</label>}
            <input 
                {...props} 
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--border-radius-btn)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    ...props.style
                }} 
            />
        </div>
    );
}