import React from 'react';

export default function Input({ label, error, style, ...props }) {
    return (
        <div style={{ marginBottom: '18px', width: '100%' }}>
            {label && (
                <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    fontWeight: '900', 
                    color: '#111111', // Negro sólido para el título
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                }}>
                    {label}
                </label>
            )}
            
            <input 
                {...props} 
                style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: error ? '2px solid #F23D4F' : '1px solid #DDDDDD',
                    backgroundColor: '#FFFFFF',
                    color: '#111111', // Texto de escritura negro sólido
                    fontSize: '16px', // Tamaño ideal para mobile (evita el zoom del iPhone)
                    boxSizing: 'border-box',
                    outline: 'none',
                    ...style
                }} 
            />
        </div>
    );
}