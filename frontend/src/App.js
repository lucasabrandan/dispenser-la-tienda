import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

// 📦 Importamos el esqueleto visual unificado
import Layout from './components/layout/Layout';

// 📦 Importamos tus componentes principales
import ServicioForm from './components/ServicioForm';
import ServicioList from './components/ServicioList';
import ClienteManager from './components/ClienteManager';
import RepuestoManager from './components/RepuestoManager'; 

export default function App() {
    // Controlamos la sección. 'caja' es la pantalla de inicio.
    const [seccionActual, setSeccionActual] = useState('caja'); 

    // Función que decide qué componente mostrar
    // 💡 IMPORTANTE: Los nombres de los 'case' deben coincidir con los IDs del Sidebar
    const renderSeccion = () => {
        switch (seccionActual) {
            case 'caja':
                // Solo el formulario para cargar ventas rápido
                return (
                    <div className="card-animate">
                        <ServicioForm onSaved={() => setSeccionActual('historial')} />
                    </div>
                );
            case 'historial':
                // Pantalla dedicada a revisar el historial y generar PDFs
                return (
                    <div className="card-animate">
                        <ServicioList />
                    </div>
                );
            case 'clientes':
                // Gestión de Clientes, Sedes y Dispensers
                return (
                    <div className="card-animate">
                        <ClienteManager />
                    </div>
                );
            case 'repuestos':
                // Control de Stock y precios de repuestos
                return (
                    <div className="card-animate">
                        <RepuestoManager />
                    </div>
                );
            default:
                return (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <h3>Sección en construcción...</h3>
                    </div>
                );
        }
    };

    return (
        <>
            {/* Configuración de notificaciones: Estilo limpio */}
            <Toaster 
                position="top-right" 
                toastOptions={{ 
                    duration: 3000, 
                    style: { 
                        background: '#333', 
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '14px' 
                    } 
                }} 
            />

            {/* El Layout envuelve toda la navegación */}
            <Layout vistaActual={seccionActual} setVistaActual={setSeccionActual}>
                
                {/* Contenedor con ancho máximo para que en PC no se estire infinito */}
                <div style={{ 
                    maxWidth: '1000px', 
                    margin: '0 auto', 
                    padding: '10px',
                    width: '100%' 
                }}>
                    {renderSeccion()}
                </div>

            </Layout>
        </>
    );
}