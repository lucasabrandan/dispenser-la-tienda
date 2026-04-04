import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

import Layout from './components/layout/Layout';
import { MontosProvider } from './context/MontosContext';

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

export default function App() {
    const [seccionActual, setSeccionActual] = useState('caja');
    // Cliente precargado para abrir VentaManager/ServicioManager desde ClienteManager
    const [clientePreload, setClientePreload] = useState(null);

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
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: { fontSize: '1.1em', fontWeight: 'bold' }
                }}
            />
            <Layout vistaActual={seccionActual} setVistaActual={setSeccionActual}>
                <div className="max-w-5xl mx-auto">
                    {renderSeccion()}
                </div>
            </Layout>
        </MontosProvider>
    );
}