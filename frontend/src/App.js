import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

import Layout from './components/layout/Layout';
import { MontosProvider } from './context/MontosContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';

// Caja
import DashboardCaja from './components/DashboardCaja';
// Operaciones
import ServicioManager     from './components/servicio/ServicioManager';
import ServicioList        from './components/servicio/ServicioList';
import VentaManager        from './components/venta/VentaManager';
import PresupuestosManager from './components/PresupuestosManager';

// Admin
import ClienteManager     from './components/cliente/ClienteManager';
import GestorProductos    from './components/productos/GestorProductos';
import RadarMantenimiento from './components/RadarMantenimiento';
import DashboardFinanzas  from './components/finanzas/DashboardFinanzas';

function AppInterna() {
    const { autenticado, esAdmin } = useAuth();
    const [seccionActual, setSeccionActual] = useState(esAdmin ? 'caja' : 'servicio-tecnico');
    // Cliente precargado para abrir VentaManager/ServicioManager desde ClienteManager
    const [clientePreload, setClientePreload] = useState(null);

    if (!autenticado) return <LoginPage />;

    const irASeccionConCliente = (seccion, cliente) => {
        setClientePreload(cliente);
        setSeccionActual(seccion);
    };

    const renderSeccion = () => {
        switch (seccionActual) {
            case 'caja':
                return <DashboardCaja setVistaActual={setSeccionActual} />;
            case 'venta':
                return <VentaManager clienteInicial={clientePreload} onClienteConsumido={() => setClientePreload(null)} />;
            case 'servicio-tecnico':
                return <ServicioManager clienteInicial={clientePreload} onClienteConsumido={() => setClientePreload(null)} />;
            case 'historial':
                return <ServicioList />;
            case 'presupuestos':
                return <PresupuestosManager />;
            case 'clientes':
                return <ClienteManager
                    onNuevoServicio={(c) => irASeccionConCliente('servicio-tecnico', c)}
                    onNuevaVenta={(c) => irASeccionConCliente('venta', c)}
                />;
            case 'productos':
                return <GestorProductos />;
            case 'radar':
                return <RadarMantenimiento />;
            case 'finanzas':
                return <DashboardFinanzas />;
            default:
                return (
                    <div className="flex items-center justify-center h-64 text-[#A8A29E] font-black text-sm uppercase tracking-widest">
                        Sección en construcción
                    </div>
                );
        }
    };

    return (
        <MontosProvider>
            <Layout vistaActual={seccionActual} setVistaActual={setSeccionActual}>
                <div className="max-w-5xl mx-auto">
                    {renderSeccion()}
                </div>
            </Layout>
        </MontosProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: { fontSize: '1.1em', fontWeight: 'bold' }
                }}
            />
            <AppInterna />
        </AuthProvider>
    );
}