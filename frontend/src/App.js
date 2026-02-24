import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

// 📦 Importamos tus componentes principales
import ServicioForm from './components/ServicioForm';
import ServicioList from './components/ServicioList';
import ClienteManager from './components/ClienteManager';
import RepuestoManager from './components/RepuestoManager'; // 💡 NUEVO: Importamos el inventario

export default function App() {
    // 💡 El estado que controla en qué pantalla estamos (Arranca en 'caja')
    const [seccionActual, setSeccionActual] = useState('caja'); 

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', background: '#eef2f5', minHeight: '100vh', padding: '20px' }}>
            {/* 🔔 Este componente es obligatorio para que funcionen los carteles verdes/rojos de aviso */}
            <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '1.1em', fontWeight: 'bold' } }} />

            {/* 🔴 BARRA DE NAVEGACIÓN SUPERIOR */}
            <header style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                background: 'white', padding: '15px 30px', borderRadius: '15px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ margin: 0, color: '#2e7d32', fontSize: '1.8em' }}>💧 Dispenser La Tienda</h1>
                </div>

                <nav style={{ display: 'flex', gap: '15px' }}>
                    {/* BOTÓN: CAJA Y VENTAS */}
                    <button 
                        onClick={() => setSeccionActual('caja')}
                        style={{ 
                            background: seccionActual === 'caja' ? '#2e7d32' : '#f0f4f8', 
                            color: seccionActual === 'caja' ? 'white' : '#555', 
                            border: 'none', padding: '12px 25px', borderRadius: '10px', 
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '1em',
                            transition: 'all 0.3s ease'
                        }}>
                        💰 Ventas y Presupuestos
                    </button>

                    {/* BOTÓN: CLIENTES */}
                    <button 
                        onClick={() => setSeccionActual('clientes')}
                        style={{ 
                            background: seccionActual === 'clientes' ? '#007bff' : '#f0f4f8', 
                            color: seccionActual === 'clientes' ? 'white' : '#555', 
                            border: 'none', padding: '12px 25px', borderRadius: '10px', 
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '1em',
                            transition: 'all 0.3s ease'
                        }}>
                        👥 Directorio de Clientes
                    </button>

                    {/* 💡 NUEVO BOTÓN: INVENTARIO */}
                    <button 
                        onClick={() => setSeccionActual('repuestos')}
                        style={{ 
                            background: seccionActual === 'repuestos' ? '#e65100' : '#f0f4f8', 
                            color: seccionActual === 'repuestos' ? 'white' : '#555', 
                            border: 'none', padding: '12px 25px', borderRadius: '10px', 
                            cursor: 'pointer', fontWeight: 'bold', fontSize: '1em',
                            transition: 'all 0.3s ease'
                        }}>
                        🔧 Inventario
                    </button>
                </nav>
            </header>

            {/* 🔴 ZONA DE VISUALIZACIÓN (Acá cambia la pantalla según el botón que tocaste) */}
            <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* 🛒 PANTALLA DE CAJA: Muestra el Formulario de Cobro y la Tabla de Historial */}
                {seccionActual === 'caja' && (
                    <div style={{ display: 'grid', gap: '30px' }}>
                        <ServicioForm />
                        <ServicioList />
                    </div>
                )}

                {/* 👥 PANTALLA DE CLIENTES: Muestra ÚNICAMENTE el gestor de la libreta de contactos */}
                {seccionActual === 'clientes' && (
                    <ClienteManager />
                )}

                {/* 💡 NUEVA PANTALLA: INVENTARIO DE REPUESTOS */}
                {seccionActual === 'repuestos' && (
                    <RepuestoManager />
                )}

            </main>
        </div>
    );
}