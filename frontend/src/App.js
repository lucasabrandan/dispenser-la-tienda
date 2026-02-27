import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

// 📦 Importamos nuestro nuevo esqueleto visual (El Sidebar y el Fondo Oscuro)
import Layout from './components/layout/Layout';

// 📦 Importamos tus componentes principales
import ServicioForm from './components/ServicioForm';
import ServicioList from './components/ServicioList';
import ClienteManager from './components/ClienteManager';
import RepuestoManager from './components/RepuestoManager'; 

export default function App() {
    // Controlamos en qué pantalla estamos (Arranca en 'caja')
    const [seccionActual, setSeccionActual] = useState('caja'); 

    // Función que decide qué componente mostrar según el botón que tocó el usuario
    const renderSeccion = () => {
        switch (seccionActual) {
            case 'caja':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <ServicioForm />
                        <ServicioList />
                    </div>
                );
            case 'clientes':
                return <ClienteManager />;
            case 'repuestos':
                return <RepuestoManager />;
            default:
                return null;
        }
    };

    return (
        <>
            <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '1.1em', fontWeight: 'bold' } }} />

            {/* 💡 ACÁ ESTÁ LA MAGIA: Todo tu sistema ahora vive adentro de "Layout" */}
            <Layout vistaActual={seccionActual} setVistaActual={setSeccionActual}>
                
                {/* 🔴 ZONA DE VISUALIZACIÓN DINÁMICA */}
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {renderSeccion()}
                </div>

            </Layout>
        </>
    );
}