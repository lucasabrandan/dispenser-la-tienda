import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, vistaActual, setVistaActual }) {
    return (
        // Usamos className para que el CSS de las Media Queries pueda actuar
        <div className="app-container">
            
            {/* El menú lateral */}
            <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />
            
            {/* El área principal */}
            <main className="main-content">
                {children}
            </main>

        </div>
    );
}