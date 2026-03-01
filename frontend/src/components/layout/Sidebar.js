import React from 'react';
// Importamos el logo desde la carpeta assets
import logo from '../../assets/logo-dispenser.svg';

export default function Sidebar({ setVistaActual, vistaActual }) {
    const s = {
        // Estructura principal: usa el blanco definido en las variables
        sidebar: {
            backgroundColor: 'var(--bg-card)', 
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            padding: '25px 20px',
            boxSizing: 'border-box',
            width: '260px', // Ancho fijo para que no "baile" el contenido en PC
        },
        logoArea: {
            textAlign: 'center',
            marginBottom: '40px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border-color)'
        },
        // Botones de navegación: cambian de color automáticamente según el estado
        navItem: (activa) => ({
            padding: '14px 20px',
            marginBottom: '10px',
            borderRadius: 'var(--border-radius-btn)', // Usa el radio de 12px del App.css
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '15px',
            // Si está activo: texto negro. Si no: gris secundario.
            color: activa ? '#000000' : 'var(--text-secondary)',
            // Si está activo: fondo amarillo. Si no: transparente.
            backgroundColor: activa ? 'var(--brand-yellow)' : 'transparent',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            whiteSpace: 'nowrap'
        })
    };

    // Lista de navegación (Mantenemos tu lógica de IDs)
    const menu = [
        { id: 'caja', nombre: '💰 Cargar Venta' },
        { id: 'historial', nombre: '📋 Historial' }, 
        { id: 'clientes', nombre: '👥 Clientes' },
        { id: 'repuestos', nombre: '🔧 Stock' },
    ];

    return (
        // La clase "sidebar-container" es la que usamos en App.css para ocultarlo en móviles
        <aside style={s.sidebar} className="sidebar-container">
            
            {/* Área del Logo */}
            <div style={s.logoArea}>
                <img src={logo} alt="Logo" style={{ width: '100%', maxWidth: '130px' }} />
            </div>
            
            {/* Navegación del Menú */}
            <nav style={{ flex: 1 }}>
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

            {/* Footer del Menú: Limpio y profesional */}
            <div style={{ 
                marginTop: 'auto', 
                fontSize: '11px', 
                color: 'var(--text-secondary)', 
                textAlign: 'center',
                fontWeight: 'bold',
                opacity: 0.7 
            }}>
                SISTEMA DE GESTIÓN TÉCNICA
            </div>
        </aside>
    );
}