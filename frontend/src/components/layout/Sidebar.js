import React from 'react';
import logo from '../../assets/logo-dispenser.svg';

export default function Sidebar({ setVistaActual, vistaActual }) {
    const s = {
        // Quitamos width, minHeight y position de acá. Van al CSS.
        sidebar: {
            backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            padding: '25px 20px',
            boxSizing: 'border-box',
        },
        logoArea: {
            textAlign: 'center',
            marginBottom: '40px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border-color)'
        },
        navItem: (activa) => ({
            padding: '14px 20px',
            marginBottom: '10px',
            borderRadius: 'var(--border-radius-btn)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            color: activa ? 'var(--bg-main)' : 'var(--text-secondary)',
            backgroundColor: activa ? 'var(--brand-yellow)' : 'transparent',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            whiteSpace: 'nowrap' // 💡 Evita que el texto se parta en mobile
        })
    };

    const menu = [
        { id: 'caja', nombre: '💰 Ventas' },
        { id: 'clientes', nombre: '👥 Clientes' },
        { id: 'repuestos', nombre: '🔧 Stock' },
    ];

    return (
        <aside style={s.sidebar} className="sidebar-container">
            <div style={s.logoArea} className="sidebar-logo">
                <img src={logo} alt="Logo" style={{ width: '100%', maxWidth: '140px' }} />
            </div>
            
            <nav className="sidebar-nav">
                {menu.map(item => (
                    <div 
                        key={item.id} 
                        style={s.navItem(vistaActual === item.id)}
                        onClick={() => setVistaActual(item.id)}
                    >
                        {item.nombre}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                v2.0 - Escalada Tech 🧉
            </div>
        </aside>
    );
}