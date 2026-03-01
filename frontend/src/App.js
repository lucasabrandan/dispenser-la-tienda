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
    
    // 🚀 NUEVO: Estado para guardar el presupuesto que queremos editar
    const [servicioAEditar, setServicioAEditar] = useState(null);

    // 🚀 NUEVO: Función que se dispara cuando tocás el lápiz en el Historial
    const manejarEdicion = (servicio) => {
        setServicioAEditar(servicio);  // Guardamos los datos
        setSeccionActual('caja');      // Te mandamos a la vista del formulario
    };

    // 🚀 NUEVO: Función inteligente para cambiar de sección desde el menú
    // Si tocás "Caja" manualmente en el menú, limpiamos la edición para que arranques uno en blanco.
    const cambiarSeccionDesdeMenu = (nuevaSeccion) => {
        if (nuevaSeccion === 'caja' && seccionActual !== 'caja') {
            setServicioAEditar(null); 
        }
        setSeccionActual(nuevaSeccion);
    };

    // Función que decide qué componente mostrar
    const renderSeccion = () => {
        switch (seccionActual) {
            case 'caja':
                return (
                    <div className="card-animate">
                        <ServicioForm 
                            // 🚀 Le pasamos el servicio si estamos editando, o null si es nuevo
                            servicioParaEditar={servicioAEditar} 
                            onSaved={() => {
                                setServicioAEditar(null); // Limpiamos al guardar
                                setSeccionActual('historial');
                            }} 
                        />
                    </div>
                );
            case 'historial':
                return (
                    <div className="card-animate">
                        {/* 🚀 Le pasamos la función manejarEdicion al botón del lápiz */}
                        <ServicioList onEditar={manejarEdicion} />
                    </div>
                );
            case 'clientes':
                return (
                    <div className="card-animate">
                        <ClienteManager />
                    </div>
                );
            case 'repuestos':
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

            {/* 🚀 En vez de setSeccionActual directo, usamos nuestra función inteligente */}
            <Layout vistaActual={seccionActual} setVistaActual={cambiarSeccionDesdeMenu}>
                
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