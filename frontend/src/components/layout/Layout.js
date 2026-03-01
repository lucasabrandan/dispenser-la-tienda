import React from 'react';
import logo from '../../assets/logo-dispenser.svg';

export default function Layout({ children, vistaActual, setVistaActual }) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#EDEDED' }}>
            
            {/* HEADER AMARILLO: Identidad fuerte, siempre visible */}
            <header style={{ 
                background: '#FFF159', 
                padding: '12px 20px', 
                display: 'flex', 
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <img src={logo} alt="Logo" style={{ height: '30px' }} />
                <span style={{ marginLeft: '10px', fontWeight: '900', fontSize: '14px', color: '#333' }}>LOGÍSTICA DISPENSER</span>
            </header>

            {/* CONTENIDO: Aquí se renderizan tus formularios y listas */}
            <main style={{ flex: 1, padding: '15px', paddingBottom: '90px' }}>
                {children}
            </main>

            {/* BOTTOM NAVIGATION: Ergonómico, estilo Mercado Libre */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                width: '100%',
                height: '70px',
                background: '#FFF',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                borderTop: '1px solid #DDD',
                zIndex: 1000,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <div onClick={() => setVistaActual('caja')} style={{ textAlign: 'center', color: vistaActual === 'caja' ? '#3483FA' : '#666', cursor: 'pointer' }}>
                    <div style={{ fontSize: '20px' }}>🏠</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Inicio</div>
                </div>
                <div onClick={() => setVistaActual('historial')} style={{ textAlign: 'center', color: vistaActual === 'historial' ? '#3483FA' : '#666', cursor: 'pointer' }}>
                    <div style={{ fontSize: '20px' }}>📋</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Historial</div>
                </div>
                <div onClick={() => setVistaActual('clientes')} style={{ textAlign: 'center', color: vistaActual === 'clientes' ? '#3483FA' : '#666', cursor: 'pointer' }}>
                    <div style={{ fontSize: '20px' }}>👥</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Clientes</div>
                </div>
                <div onClick={() => setVistaActual('repuestos')} style={{ textAlign: 'center', color: vistaActual === 'repuestos' ? '#3483FA' : '#666', cursor: 'pointer' }}>
                    <div style={{ fontSize: '20px' }}>🔧</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Stock</div>
                </div>
            </nav>
        </div>
    );
}