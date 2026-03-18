import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

// 📦 Importamos el esqueleto visual unificado
import Layout from './components/layout/Layout';

// 📦 Importamos tus componentes principales
import DashboardInicio from './components/DashboardInicio';         // ← DASHBOARD
import DashboardFinanzas from './components/DashboardFinanzas';     // ← FINANZAS
import VentaForm from './components/VentaForm';                    // ← NUEVO
import ServicioTecnicoForm from './components/ServicioTecnicoForm'; // ← NUEVO
import ServicioList from './components/ServicioList';
import PresupuestosManager from './components/PresupuestosManager'; // ← PRESUPUESTOS
import ClienteManager from './components/ClienteManager';
import GestorProductos from './components/GestorProductos';
import RadarMantenimiento from './components/RadarMantenimiento';

export default function App() {
    // Controlamos la sección actual
    const [seccionActual, setSeccionActual] = useState('caja');

    // 🚀 Estado para guardar el registro que queremos editar
    const [servicioAEditar, setServicioAEditar] = useState(null);

    // 🚀 Función que se dispara cuando tocás editar en Historial
    const manejarEdicion = (servicio) => {
        setServicioAEditar(servicio);
        // Navegamos a la sección correcta según el tipo
        if (servicio.servicioTipo === 'VENTA') {
            setSeccionActual('venta');
        } else if (servicio.servicioTipo === 'TECNICA') {
            setSeccionActual('servicio-tecnico');
        }
    };

    // 🚀 Función inteligente para cambiar de sección desde el menú
    const cambiarSeccionDesdeMenu = (nuevaSeccion) => {
        if ((nuevaSeccion === 'venta' || nuevaSeccion === 'servicio-tecnico') && seccionActual !== nuevaSeccion) {
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
                        <DashboardInicio onNavigateTo={cambiarSeccionDesdeMenu} />
                    </div>
                );
            case 'venta':
                return (
                    <div className="card-animate">
                        <VentaForm onSaved={() => {
                            setServicioAEditar(null);
                            setSeccionActual('historial');
                        }} />
                    </div>
                );
            case 'servicio-tecnico':
                return (
                    <div className="card-animate">
                        <ServicioTecnicoForm 
                            servicioParaEditar={servicioAEditar}
                            onSaved={() => {
                                setServicioAEditar(null);
                                setSeccionActual('historial');
                            }} 
                        />
                    </div>
                );
            case 'finanzas':
                return (
                    <div className="card-animate">
                        <DashboardFinanzas />
                    </div>
                );
            case 'radar':
                return (
                    <div className="card-animate">
                        <RadarMantenimiento />
                    </div>
                );
            case 'historial':
                return (
                    <div className="card-animate">
                        <ServicioList onEditar={manejarEdicion} />
                    </div>
                );
            case 'presupuestos':
                return (
                    <div className="card-animate">
                        <PresupuestosManager onEditar={manejarEdicion} />
                    </div>
                );
            case 'clientes':
                return (
                    <div className="card-animate">
                        <ClienteManager />
                    </div>
                );
            case 'productos':
                return (
                    <div className="card-animate">
                        <GestorProductos />
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